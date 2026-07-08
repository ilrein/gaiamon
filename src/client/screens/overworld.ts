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
import { Ambience, showAreaTitle } from "../world/ambience";
import { buildProp } from "../world/props";
import { Waystone, WAYSTONE_POS, WAYSTONE_RADIUS } from "../world/waystone";
import { FollowerMon } from "../world/follower";
import { NpcActor } from "../world/npc";
import { WalkerSprite, PLAYER_WALKER, type Direction } from "../world/walker";
import { PartyHud } from "../ui/party-hud";
import { Minimap, markVisited } from "../ui/map";
import { PostFX } from "../postfx";

export interface OverworldCallbacks {
  onEncounter: (speciesId: string, level: number) => void;
  onNpc: (npc: NpcPlacement) => void;
  onExit: (exit: AreaExit) => void;
  onTrigger: (trigger: AreaTrigger) => void;
  onCodex: () => void;
  /** Multiplayer presence layer: its group joins the scene, update runs per frame. */
  remoteLayer?: { group: THREE.Group; update(dt: number): void };
  /** Fired after every loadArea (presence rejoins the area's zone here). */
  onAreaChange?: (areaId: string) => void;
  /** Per-frame player state for presence broadcasting (throttled downstream). */
  onTick?: (x: number, z: number, dir: Direction, moving: boolean) => void;
}

const PLAYER_SPEED = 4.2; // tiles / second
const PLAYER_RADIUS = 0.32;
// ~30° pitch (user direction): flatter, more Octopath-like framing at the
// same ~19-unit distance.
const CAM_OFFSET = new THREE.Vector3(0, 9.5, 16.5);
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

  private player!: WalkerSprite;
  private postfx!: PostFX;
  private area: AreaDef | null = null;
  private terrain: Terrain | null = null;
  private ambience: Ambience | null = null;
  private waystone: Waystone | null = null;
  private follower: FollowerMon | null = null;
  /** speciesId+shiny of the current follower — rebuild only on change. */
  private followerKey = "";
  private npcs: NpcActor[] = [];
  /** Last areaId shown as a title splash — battle-return reloads of the same
   *  area must not retrigger the card. */
  private splashedAreaId: string | null = null;

  // player kinematics
  private px = 0;
  private pz = 0;
  private moving = false;
  private facing: Direction = "down";
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
  private partyHud?: PartyHud;
  private minimap?: Minimap;

  // reusable temporaries (no per-frame allocation)
  private readonly tmpDesired = new THREE.Vector3();

  constructor(callbacks: OverworldCallbacks) {
    this.cb = callbacks;
  }

  // -- lifecycle ------------------------------------------------------------
  mount(game: Game): void {
    this.scene.add(this.areaGroup);
    // Remote wardens (presence). Re-added on every mount: unmount's
    // scene.clear() drops the group but the layer itself survives battles.
    if (this.cb.remoteLayer) this.scene.add(this.cb.remoteLayer.group);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun, this.sunTarget);
    this.sun.target = this.sunTarget;
    this.scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x7aa95c, 1.1));

    // Persistent player sprite (survives area transitions): a real 4-direction
    // walk-cycle character (CC0 Openmon set — see assets/screensmith).
    this.player = new WalkerSprite(PLAYER_WALKER, 1.75);
    this.scene.add(this.player.mesh);

    // HD-2D post stack (bloom + tilt-shift + vignette + grade).
    this.postfx = new PostFX(game.renderer, this.scene, this.camera);

    this.buildHud(game);
  }

  unmount(game: Game): void {
    this.hudBar?.remove();
    this.hint?.remove();
    this.partyHud?.dispose();
    this.minimap?.dispose();
    this.disposeArea();
    this.player.dispose();
    this.postfx.dispose();
    this.scene.clear();
    void game;
  }

  resize(_game: Game, width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.postfx.resize(width, height);
  }

  // -- area loading ---------------------------------------------------------
  /** Main dropped an exit/interaction (it was busy): unfreeze movement. */
  releaseBusy(): void {
    this.busy = false;
  }

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
    // NOTE: cooldown intentionally survives area reloads — returning from a
    // battle goes through loadArea, and the post-battle encounter grace
    // period must actually apply (review finding).

    // Sky + fog from the biome palette.
    const fog = new THREE.Color(area.palette.fog);
    this.scene.background = fog;
    this.scene.fog = new THREE.Fog(fog.getHex(), 18, 44);

    // Terrain, props, NPCs.
    this.terrain = buildTerrain(area);
    this.areaGroup.add(this.terrain.group);

    // Biome particle ambience (torn down with the area in disposeArea()).
    this.ambience = new Ambience(area);
    this.areaGroup.add(this.ambience.points);

    // Hearthglow's plaza waystone (pure decoration; disposed with the area).
    if (area.id === "hearthglow") {
      this.waystone = new Waystone();
      this.areaGroup.add(this.waystone.group);
    }

    // The party lead trots along behind the player (SDF species only).
    // The instance persists across areas/battles — rebuilding each load would
    // recompile its shader and hitch the transition (review finding); it is
    // only rebuilt when the lead actually changes.
    this.refreshFollower(game);
    if (this.follower) {
      this.areaGroup.add(this.follower.group);
      this.follower.place(x, z);
    }

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
    this.player.face("down");
    this.facing = "down";
    this.moving = false;
    this.lastTileX = Math.round(x);
    this.lastTileZ = Math.round(z);
    this.player.mesh.position.set(x, 0, z);
    this.camera.position.copy(this.player.mesh.position).add(CAM_OFFSET);
    this.camera.lookAt(x, 1, z);

    game.player.areaId = areaId;
    game.player.pos = { x, z };

    // Title splash only when actually entering a different area (not on
    // battle-return reloads of the same area).
    if (this.splashedAreaId !== area.id) {
      this.splashedAreaId = area.id;
      showAreaTitle(game.hudRoot, area.name);
    }

    if (this.areaTag) this.areaTag.textContent = area.name;
    this.partyHud?.refresh();
    this.minimap?.setArea(area);
    markVisited(game.player, areaId);
    this.hideHint();
    this.cb.onAreaChange?.(areaId);
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

    const walking = this.moving && !this.busy && !this.pending;
    this.player.update(dt, walking);
    this.player.mesh.position.set(this.px, 0, this.pz);
    // Sprites stay world-fixed (no camera billboarding) — direction changes
    // come from the walk-cycle frames alone.
    this.terrain?.update(this.animT);
    this.ambience?.update(dt);
    this.waystone?.update(dt);
    this.follower?.update(dt, this.px, this.pz);
    this.minimap?.update(this.px, this.pz);

    // Presence: animate remote wardens and report our own state (throttled
    // inside the presence client — this is just a cheap per-frame poke).
    this.cb.remoteLayer?.update(dt);
    this.cb.onTick?.(this.px, this.pz, this.facing, walking);

    // NPC bubbles; NPCs face the player when in talk range.
    const talk = this.nearestNpc(1.6);
    for (const n of this.npcs) n.update(this.animT, n === talk, this.camera, this.px, this.pz);

    // Rigid follow cam: position and look-target move in lockstep with the
    // player, so there's zero wobble while walking (user feedback — the
    // dual-lerp follow read as camera shake).
    this.tmpDesired.copy(this.player.mesh.position).add(CAM_OFFSET);
    this.camera.position.copy(this.tmpDesired);
    this.camera.lookAt(this.player.mesh.position.x, 1, this.player.mesh.position.z);

    this.postfx.render(dt);
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
      this.player.setDirectionFrom(dir.x, dir.y);
      // Mirror WalkerSprite's facing rule (its direction field is private).
      this.facing = Math.abs(dir.x) > Math.abs(dir.y) ? (dir.x < 0 ? "left" : "right") : dir.y < 0 ? "up" : "down";
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
    // The waystone is solid: it sits on walkable plaza tiles, so tile
    // collision alone would let players walk through the monument.
    if (
      this.waystone &&
      Math.hypot(x - WAYSTONE_POS.x, z - WAYSTONE_POS.z) < WAYSTONE_RADIUS
    ) {
      return false;
    }
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

  // -- HUD ------------------------------------------------------------------
  private buildHud(game: Game): void {
    this.areaTag = el("div", { className: "area-tag", text: "" });
    const codex = el("button", { className: "codex-fab", html: "&#128214;", onClick: () => this.cb.onCodex() });
    this.hudBar = el("div", { className: "hud-top" }, [this.areaTag, codex]);
    game.hudRoot.append(this.hudBar);

    this.partyHud = new PartyHud(game.player);
    game.hudRoot.append(this.partyHud.root);

    this.minimap = new Minimap();
    game.hudRoot.append(this.minimap.root);

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

  /** (Re)build the follower when the party lead changed — called from
   *  loadArea and after codex "Make Lead". Attaches to the current area. */
  refreshFollower(game: Game): void {
    const lead = game.player.party[0];
    const key = lead ? `${lead.speciesId}${lead.shiny ? "*s" : ""}` : "";
    if (key === this.followerKey) return;
    if (this.follower) {
      this.follower.group.parent?.remove(this.follower.group);
      this.follower.dispose();
      this.follower = null;
    }
    this.followerKey = key;
    if (!lead) return;
    const follower = new FollowerMon(game.renderer, lead);
    if (!follower.active) return;
    this.follower = follower;
    if (this.area) {
      this.areaGroup.add(follower.group);
      follower.place(this.px, this.pz);
    }
  }

  // -- teardown -------------------------------------------------------------
  private disposeArea(): void {
    // Detach (don't dispose) the follower: the traverse below frees every
    // reachable geometry/material, and the follower must survive area
    // changes with its compiled shader intact.
    if (this.follower) this.areaGroup.remove(this.follower.group);
    this.terrain?.dispose();
    this.terrain = null;
    this.ambience?.dispose();
    this.ambience = null;
    this.waystone?.dispose();
    this.waystone = null;
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
