// Overworld screen: the explorable 2.5D diorama. Owns its own scene + camera and
// renders each frame (the Game shell just drives update()). Handles player
// movement with tile collision + wall sliding, a smooth follow-cam, tall-grass
// encounters, NPC talk range, area exits, and interaction triggers.
//
// Nothing here hardcodes species or area ids — everything is read from the
// AreaDef data passed to loadArea().

import * as THREE from "three";
import type { Game, Screen } from "../game";
import type { AreaDef, AreaExit, AreaTrigger, EncounterEntry, NpcPlacement } from "../../shared/area";
import { isWalkable, tileAt } from "../../shared/area";
import { AREAS } from "../../data";
import { el } from "../dom";
import { buildTerrain, type Terrain } from "../world/terrain";
import { buildProp } from "../world/props";
import { NpcActor } from "../world/npc";

export interface OverworldCallbacks {
  onEncounter: (speciesId: string, level: number) => void;
  onNpc: (npc: NpcPlacement) => void;
  onExit: (exit: AreaExit) => void;
  onTrigger: (trigger: AreaTrigger) => void;
  onCodex: () => void;
}

const PLAYER_SPEED = 4.2; // tiles / second
const PLAYER_RADIUS = 0.32;
const CAM_OFFSET = new THREE.Vector3(0, 11, 10);
const ENCOUNTER_COOLDOWN = 1.5; // seconds of grace after a battle beat
const RUSTLE_DELAY = 0.28; // brief pause between the grass rustle and the battle

function rollInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickEncounter(entries: EncounterEntry[]): EncounterEntry {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

/** Fade the screen to black, run `fn` at the darkest point, then fade back. */
export async function fadeTransition(
  uiRoot: HTMLElement,
  fn: () => void | Promise<void>,
): Promise<void> {
  const fade = el("div", { className: "screen-fade" });
  uiRoot.append(fade);
  // force a reflow so the transition runs from opacity 0
  void fade.offsetWidth;
  fade.classList.add("on");
  await new Promise((r) => setTimeout(r, 300));
  await fn();
  fade.classList.remove("on");
  await new Promise((r) => setTimeout(r, 300));
  fade.remove();
}

export class OverworldScreen implements Screen {
  private readonly cb: OverworldCallbacks;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private readonly sun = new THREE.DirectionalLight(0xfff2d9, 2.2);
  private readonly sunTarget = new THREE.Object3D();
  private readonly areaGroup = new THREE.Group();

  private player!: THREE.Sprite;
  private area: AreaDef | null = null;
  private terrain: Terrain | null = null;
  private npcs: NpcActor[] = [];

  // player kinematics
  private px = 0;
  private pz = 0;
  private facing = 1;
  private moving = false;
  private animT = 0;

  // encounter / interaction state
  private lastTileX = -999;
  private lastTileZ = -999;
  private cooldown = 0;
  private busy = false; // frozen during exit / pending encounter
  private pending: { t: number; speciesId: string; level: number } | null = null;

  // HUD (lives in game.hudRoot)
  private hudBar?: HTMLElement;
  private areaTag?: HTMLElement;
  private hint?: HTMLElement;

  // reusable temporaries (no per-frame allocation)
  private readonly tmpDesired = new THREE.Vector3();

  constructor(callbacks: OverworldCallbacks) {
    this.cb = callbacks;
  }

  // -- lifecycle ------------------------------------------------------------
  mount(game: Game): void {
    this.scene.add(this.areaGroup);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun, this.sunTarget);
    this.sun.target = this.sunTarget;
    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x7aa95c, 1.1));

    // Persistent player sprite (survives area transitions).
    const mat = new THREE.SpriteMaterial({ map: wardenTexture(), alphaTest: 0.05 });
    this.player = new THREE.Sprite(mat);
    this.player.center.set(0.5, 0.06);
    this.player.scale.setScalar(1.6);
    this.scene.add(this.player);

    this.buildHud(game);
  }

  unmount(game: Game): void {
    this.hudBar?.remove();
    this.hint?.remove();
    this.disposeArea();
    (this.player.material as THREE.SpriteMaterial).map?.dispose();
    (this.player.material as THREE.SpriteMaterial).dispose();
    this.scene.clear();
    void game;
  }

  resize(_game: Game, width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // -- area loading ---------------------------------------------------------
  loadArea(game: Game, areaId: string, x: number, z: number): void {
    const area = AREAS[areaId];
    if (!area) {
      console.warn(`[overworld] unknown area "${areaId}"`);
      return;
    }

    this.disposeArea();
    this.area = area;
    this.busy = false;
    this.pending = null;
    this.cooldown = 0;

    // Sky + fog from the biome palette.
    const fog = new THREE.Color(area.palette.fog);
    this.scene.background = fog;
    this.scene.fog = new THREE.Fog(fog.getHex(), 18, 44);

    // Terrain, props, NPCs.
    this.terrain = buildTerrain(area);
    this.areaGroup.add(this.terrain.group);

    for (const p of area.props) {
      const obj = buildProp(p.kind, p.tint);
      obj.position.set(p.x, 0, p.z);
      obj.scale.multiplyScalar(p.scale ?? 1);
      this.areaGroup.add(obj);
    }

    this.npcs = area.npcs.map((n) => {
      const actor = new NpcActor(n);
      this.areaGroup.add(actor.group);
      return actor;
    });

    // Shadow frustum sized to the area, centered on it.
    const rows = area.tiles.length;
    const cols = area.tiles[0]?.length ?? 0;
    const cx = (cols - 1) / 2;
    const cz = (rows - 1) / 2;
    const half = Math.max(cols, rows) / 2 + 4;
    this.sunTarget.position.set(cx, 0, cz);
    this.sun.position.set(cx + 8, 20, cz + 6);
    const sc = this.sun.shadow.camera;
    sc.left = -half;
    sc.right = half;
    sc.top = half;
    sc.bottom = -half;
    sc.near = 1;
    sc.far = 60;
    sc.updateProjectionMatrix();

    // Place the player and snap the camera (no lerp across a transition).
    this.px = x;
    this.pz = z;
    this.facing = 1;
    this.moving = false;
    this.lastTileX = Math.round(x);
    this.lastTileZ = Math.round(z);
    this.player.position.set(x, 0, z);
    this.camera.position.copy(this.player.position).add(CAM_OFFSET);
    this.camera.lookAt(x, 1, z);

    game.player.areaId = areaId;
    game.player.pos = { x, z };

    if (this.areaTag) this.areaTag.textContent = area.name;
    this.hideHint();
  }

  // -- per-frame ------------------------------------------------------------
  update(game: Game, dt: number): void {
    this.animT += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    const area = this.area;

    if (area) {
      if (this.pending) {
        // Grass rustle beat: hold still, then hand off to the encounter.
        this.pending.t -= dt;
        if (this.pending.t <= 0) {
          const p = this.pending;
          this.pending = null;
          this.cb.onEncounter(p.speciesId, p.level);
        }
      } else if (!this.busy) {
        this.step(game, area, dt);
      }
      game.player.pos.x = this.px;
      game.player.pos.z = this.pz;
    }

    this.animatePlayer();
    this.terrain?.update(this.animT);

    // NPC bobs + bubbles (nearest talkable within range shows its bubble).
    const talk = this.nearestNpc(1.6);
    for (const n of this.npcs) n.update(this.animT, n === talk);

    // Smooth exp-damped follow cam.
    const k = 1 - Math.exp(-6 * dt);
    this.tmpDesired.copy(this.player.position).add(CAM_OFFSET);
    this.camera.position.lerp(this.tmpDesired, k);
    this.tmpDesired.copy(this.player.position);
    this.camera.lookAt(this.tmpDesired.x, this.tmpDesired.y + 1, this.tmpDesired.z);

    game.renderer.render(this.scene, this.camera);
  }

  // -- movement + interaction ----------------------------------------------
  private step(game: Game, area: AreaDef, dt: number): void {
    // Movement with per-axis collision so the player slides along walls.
    const dir = game.input.direction;
    this.moving = dir.x !== 0 || dir.y !== 0;
    if (this.moving) {
      const nx = this.px + dir.x * PLAYER_SPEED * dt;
      if (this.canStand(area, nx, this.pz)) this.px = nx;
      const nz = this.pz + dir.y * PLAYER_SPEED * dt;
      if (this.canStand(area, this.px, nz)) this.pz = nz;
      if (dir.x !== 0) this.facing = Math.sign(dir.x);
    }

    // Exits fire automatically when stepped onto (main handles fade + reload).
    for (const exit of area.exits) {
      if (Math.hypot(this.px - exit.x, this.pz - exit.z) < 0.6) {
        this.busy = true;
        this.hideHint();
        this.cb.onExit(exit);
        return;
      }
    }

    // Nearest trigger in range gets a hint prompt; action fires it.
    const trigger = this.nearestTrigger(area, 0.9);
    if (trigger) {
      this.showHint(hintText(trigger));
    } else {
      this.hideHint();
    }

    // Grass encounters on entering a new 'g' tile.
    this.checkGrass(area);

    // Action press: talk to nearest NPC, else fire nearest trigger.
    if (game.input.consumeAction()) {
      const npc = this.nearestNpc(1.6);
      if (npc) {
        this.cb.onNpc(npc.npc);
      } else if (trigger) {
        this.cb.onTrigger(trigger);
      }
    }
  }

  private checkGrass(area: AreaDef): void {
    const tx = Math.round(this.px);
    const tz = Math.round(this.pz);
    if (tx === this.lastTileX && tz === this.lastTileZ) return;
    this.lastTileX = tx;
    this.lastTileZ = tz;

    if (this.cooldown > 0 || area.encounters.length === 0) return;
    if (tileAt(area, tx, tz) !== "g") return;
    if (Math.random() >= 1 / area.encounterRate) return;

    const entry = pickEncounter(area.encounters);
    const level = rollInt(entry.minLevel, entry.maxLevel);
    this.cooldown = ENCOUNTER_COOLDOWN;
    this.pending = { t: RUSTLE_DELAY, speciesId: entry.speciesId, level };
  }

  private canStand(area: AreaDef, x: number, z: number): boolean {
    const r = PLAYER_RADIUS;
    return (
      isWalkable(area, x - r, z) &&
      isWalkable(area, x + r, z) &&
      isWalkable(area, x, z - r) &&
      isWalkable(area, x, z + r)
    );
  }

  private nearestNpc(range: number): NpcActor | null {
    let best: NpcActor | null = null;
    let bestD = range;
    for (const n of this.npcs) {
      const d = Math.hypot(this.px - n.npc.x, this.pz - n.npc.z);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  private nearestTrigger(area: AreaDef, range: number): AreaTrigger | null {
    let best: AreaTrigger | null = null;
    let bestD = range;
    for (const t of area.triggers) {
      const d = Math.hypot(this.px - t.x, this.pz - t.z);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  // -- player animation -----------------------------------------------------
  private animatePlayer(): void {
    const t = this.animT;
    const hop = this.moving
      ? Math.abs(Math.sin(t * 9)) * 0.22
      : Math.sin(t * 2.5) * 0.04 + 0.04;
    const squash = this.moving
      ? 1 - Math.sin(t * 18) * 0.06
      : 1 + Math.sin(t * 2.5) * 0.02;
    const base = 1.6;
    this.player.position.set(this.px, hop, this.pz);
    this.player.scale.set(this.facing * base * (2 - squash), base * squash, 1);
  }

  // -- HUD ------------------------------------------------------------------
  private buildHud(game: Game): void {
    this.areaTag = el("div", { className: "area-tag", text: "" });
    const codex = el("button", { className: "codex-fab", html: "&#128214;", onClick: () => this.cb.onCodex() });
    this.hudBar = el("div", { className: "hud-top" }, [this.areaTag, codex]);
    game.hudRoot.append(this.hudBar);

    this.hint = el("div", { className: "area-tag" });
    this.hint.style.position = "fixed";
    this.hint.style.left = "50%";
    this.hint.style.bottom = "calc(96px + var(--safe-bottom))";
    this.hint.style.transform = "translateX(-50%)";
    this.hint.style.display = "none";
    game.hudRoot.append(this.hint);
  }

  private showHint(text: string): void {
    if (!this.hint) return;
    if (this.hint.textContent !== text) this.hint.textContent = text;
    this.hint.style.display = "block";
  }

  private hideHint(): void {
    if (this.hint) this.hint.style.display = "none";
  }

  // -- teardown -------------------------------------------------------------
  private disposeArea(): void {
    this.terrain?.dispose();
    this.terrain = null;
    for (const n of this.npcs) n.dispose();
    this.npcs = [];
    this.areaGroup.traverse((obj) => {
      const anyObj = obj as THREE.Mesh;
      if (anyObj.geometry) anyObj.geometry.dispose();
      const mat = (anyObj as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m) => disposeMaterial(m));
      else if (mat) disposeMaterial(mat);
    });
    this.areaGroup.clear();
  }
}

function disposeMaterial(mat: THREE.Material): void {
  const m = mat as THREE.MeshLambertMaterial;
  m.map?.dispose();
  mat.dispose();
}

function hintText(trigger: AreaTrigger): string {
  if (trigger.text) return trigger.text;
  switch (trigger.kind) {
    case "sign":
      return "Read  (A)";
    case "heal":
      return "Rest  (A)";
    case "trial":
      return "Begin trial  (A)";
    case "titan":
      return "Challenge  (A)";
  }
}

// ---------------------------------------------------------------------------
// The player avatar: a cute chibi warden with a satchel and the Codex on her
// hip, drawn on a 24px canvas and billboarded.
function wardenTexture(): THREE.Texture {
  const px = 24;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;

  const put = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const cloak = "#6bbf7a";
  const cloakDark = "#4f9e60";
  const skin = "#f2c79a";
  const hair = "#7a5230";

  // feet / boots
  put(8, 21, 3, 2, "#5a4632");
  put(13, 21, 3, 2, "#5a4632");
  // legs
  put(8, 17, 3, 4, "#3f5a4a");
  put(13, 17, 3, 4, "#3f5a4a");
  // cloak / body
  put(6, 11, 12, 7, cloak);
  put(7, 10, 10, 2, cloak);
  put(6, 11, 12, 1, cloakDark);
  // arms
  put(5, 12, 2, 4, cloakDark);
  put(17, 12, 2, 4, cloakDark);
  // satchel strap
  put(9, 11, 1, 7, "#b98a5a");
  // Codex on the hip: dark book with a warm clasp
  put(16, 15, 4, 4, "#3d4a63");
  put(16, 16, 4, 1, "#5a6b8c");
  put(19, 16, 1, 2, "#ffd66b");
  // head
  put(8, 4, 8, 7, skin);
  put(7, 5, 10, 5, skin);
  // hair
  put(7, 3, 10, 3, hair);
  put(6, 4, 2, 4, hair);
  put(16, 4, 2, 4, hair);
  // eyes
  put(9, 7, 2, 2, "#3a2f2a");
  put(13, 7, 2, 2, "#3a2f2a");
  put(9, 7, 1, 1, "#ffffff");
  put(13, 7, 1, 1, "#ffffff");
  // blush + mouth
  put(8, 9, 1, 1, "#f4a9a0");
  put(15, 9, 1, 1, "#f4a9a0");
  put(11, 9, 2, 1, "#c96a5a");

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
