// FollowerMon: the player's lead gaiamon trots along behind them in the
// overworld as a real baked procedural creature — breathing, facing its
// travel direction, and doing a happy hop when you stand around. Only
// species with SDF definitions follow (the rest wait in the Codex); shiny
// leads keep their recolour. Pure cosmetic layer: no collision, like every
// other decorative prop.

import * as THREE from "three";
import { buildProtoCreature, type ProtoCreature } from "./proto-mesh";
import { hasProto } from "./proto-bake";
import type { MonsterInstance } from "../../shared/model";
import { SHINY_SEED } from "./proto-portrait";

/** Trail distance behind the player (world units). */
const FOLLOW_DIST = 1.15;
/** Exponential catch-up rate. */
const LERP_RATE = 6.5;
/** Overworld creature height — pet-sized next to the 1.75-unit walker. */
const HEIGHT = 0.95;
/** Roughly how long it stands still before a happy hop. */
const HOP_EVERY_S = 8;
/** Snap instead of glide when this far apart (warps, area edges). */
const TELEPORT_DIST = 8;

export class FollowerMon {
  readonly group = new THREE.Group();

  private creature: ProtoCreature | null = null;
  private t = Math.random() * 10; // desync idle phase from battles
  private idleFor = 0;
  private yaw = 0;
  private placed = false;

  constructor(renderer: THREE.WebGLRenderer, mon: MonsterInstance) {
    if (!hasProto(mon.speciesId)) return;
    const creature = buildProtoCreature(renderer, mon.speciesId, HEIGHT);
    if (!creature) return;
    if (mon.shiny) creature.setSeed(SHINY_SEED);
    creature.setExposure(0.52); // top-down view sees lit tops; dim hard
    creature.mesh.castShadow = true; // rest-pose shadow; idle deform is subtle
    this.creature = creature;
    this.group.add(creature.group);
  }

  /** False when the lead species has no SDF yet — skip adding the layer. */
  get active(): boolean {
    return this.creature !== null;
  }

  /** Snap into place behind the player (area load / battle return). */
  place(px: number, pz: number): void {
    this.group.position.set(px, 0, pz + FOLLOW_DIST); // below = toward camera
    this.placed = true;
  }

  update(dt: number, px: number, pz: number): void {
    const creature = this.creature;
    if (!creature) return;
    this.t += dt;
    creature.update(this.t);
    if (!this.placed) this.place(px, pz);

    const pos = this.group.position;
    const dx = px - pos.x;
    const dz = pz - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > TELEPORT_DIST) {
      this.place(px, pz);
      return;
    }
    if (dist > FOLLOW_DIST + 0.02) {
      // glide toward the trailing point, facing the direction of travel
      const k = 1 - Math.exp(-LERP_RATE * dt);
      const overshoot = dist - FOLLOW_DIST;
      pos.x += (dx / dist) * overshoot * k;
      pos.z += (dz / dist) * overshoot * k;
      this.yaw = Math.atan2(dx, dz);
      creature.group.rotation.y = this.yaw;
      this.idleFor = 0;
    } else {
      this.idleFor += dt;
      // settle: ease back to facing the camera once the walk stops
      if (this.idleFor > 1.2 && Math.abs(this.yaw) > 0.02) {
        this.yaw *= Math.max(0, 1 - dt * 3);
        creature.group.rotation.y = this.yaw;
      }
      if (this.idleFor > HOP_EVERY_S) {
        this.idleFor = -Math.random() * 4; // vary the rhythm
        creature.playVerb("hop");
      }
    }
  }

  dispose(): void {
    this.creature?.dispose();
    this.creature = null;
  }
}
