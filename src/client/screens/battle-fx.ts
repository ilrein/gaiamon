// Scene, sprite and tween helpers for the battle screen. Pure presentation:
// no engine imports, no game state. The BattleScreen owns the event playback
// loop and drives these helpers.

import * as THREE from "three";
import { creatureTexture } from "../sprites";
import { buildVoxelMesh } from "../world/voxel";
import { VOXELS } from "../../data/voxels";
import type { VoxelModel } from "../../shared/voxel";

// ---------------------------------------------------------------------------
// Easing + a tiny time-driven tween runner. Everything animated in the battle
// is stepped from the screen's update(dt), so it all pauses/stops together.
export type Ease = (t: number) => number;
export const linear: Ease = (t) => t;
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Ease = (t) => t * t * t;
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Job {
  t: number;
  dur: number;
  ease: Ease;
  step?: (k: number) => void;
  resolve: () => void;
}

/** Time-driven tween pool. Durations are in seconds. */
export class Tweens {
  private jobs: Job[] = [];

  update(dt: number): void {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      j.t += dt;
      const k = j.dur <= 0 ? 1 : Math.min(1, j.t / j.dur);
      j.step?.(j.ease(k));
      if (k >= 1) {
        this.jobs.splice(i, 1);
        j.resolve();
      }
    }
  }

  /** Run `step(easedK)` from 0..1 over `dur` seconds. Resolves when done. */
  tween(dur: number, step?: (k: number) => void, ease: Ease = linear): Promise<void> {
    return new Promise((resolve) => {
      this.jobs.push({ t: 0, dur, ease, step, resolve });
    });
  }

  wait(dur: number): Promise<void> {
    return this.tween(dur);
  }

  /** Resolve everything immediately (used on teardown so nothing hangs). */
  clear(): void {
    const pending = this.jobs;
    this.jobs = [];
    for (const j of pending) j.resolve();
  }
}

// ---------------------------------------------------------------------------
// Creature view: either a billboarded 2D sprite (with an additive flash twin)
// or a true voxel mesh — behind one animation API so the battle playback code
// doesn't care which it's driving. Anchored at the feet.
export interface CombatantView {
  kind: "sprite" | "voxel";
  group: THREE.Group;
  scale: number;
  phase: number;
  basePos: THREE.Vector3;
  offset: THREE.Vector3;
  fainting: boolean;
  rimLight?: THREE.PointLight;
  /** Absolute world scale (x = width-ish, y = height) for squash/stretch. */
  setScale(x: number, y: number): void;
  /** 0..1 fade of the whole creature. */
  setOpacity(o: number): void;
  /** 0..1 white hit-flash intensity. */
  setFlash(o: number): void;
  /** Tip-over rotation (radians) for faints; pivots at the feet. */
  setTip(rad: number): void;
}

function makeSpriteView(
  speciesId: string,
  scale: number,
  phase: number,
  opts: { titan?: boolean },
): CombatantView {
  const tex = creatureTexture(speciesId);
  const base = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  base.center.set(0.5, 0);
  base.scale.set(scale, scale, 1);
  // Explicit draw order: ground disc (0) -> platforms (1) -> creatures (4/5).
  // Everything here is in the transparent queue, and distance-sorting was
  // painting the ground disc over far-side creatures.
  base.renderOrder = 4;
  if (opts.titan) base.material.color.setHex(0xffd8d0); // dramatic warm-red cast

  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  flash.center.set(0.5, 0);
  flash.scale.set(scale, scale, 1);
  flash.renderOrder = 5;

  const group = new THREE.Group();
  group.add(base, flash);

  return {
    kind: "sprite",
    group,
    scale,
    phase,
    basePos: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    fainting: false,
    setScale(x, y) {
      base.scale.set(x, y, 1);
      flash.scale.set(x, y, 1);
    },
    setOpacity(o) {
      base.material.opacity = o;
    },
    setFlash(o) {
      flash.material.opacity = o;
    },
    setTip(rad) {
      base.material.rotation = rad;
      flash.material.rotation = rad;
    },
  };
}

function makeVoxelView(
  model: VoxelModel,
  scale: number,
  phase: number,
  opts: { titan?: boolean },
): CombatantView {
  const { mesh } = buildVoxelMesh(model, scale);
  const material = mesh.material as THREE.MeshLambertMaterial;
  material.transparent = true;
  if (opts.titan) material.color.setHex(0xffd8d0);

  const group = new THREE.Group();
  group.add(mesh);

  return {
    kind: "voxel",
    group,
    scale,
    phase,
    basePos: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    fainting: false,
    setScale(x, y) {
      mesh.scale.set(x / scale, y / scale, x / scale);
    },
    setOpacity(o) {
      material.opacity = o;
    },
    setFlash(o) {
      material.emissive.setScalar(o);
    },
    setTip(rad) {
      mesh.rotation.z = rad;
    },
  };
}

export function makeCombatantView(
  speciesId: string,
  scale: number,
  phase: number,
  opts: { titan?: boolean } = {},
): CombatantView {
  const model = VOXELS[speciesId];
  const view = model
    ? makeVoxelView(model, scale, phase, opts)
    : makeSpriteView(speciesId, scale, phase, opts);

  if (opts.titan) {
    const rim = new THREE.PointLight(0xff5a4a, 6, 12, 2);
    rim.position.set(0, scale * 0.6, -0.6);
    view.group.add(rim);
    view.rimLight = rim;
  }
  return view;
}

// ---------------------------------------------------------------------------
// Diorama scene: an elliptical ground disc floating in fog, two soft platforms,
// scattered props, warm key light + hemisphere fill. Classic over-the-shoulder
// monster-battle framing (fov 34).
export interface BattleScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  camBase: THREE.Vector3;
  lookAt: THREE.Vector3;
  playerPos: THREE.Vector3;
  foePos: THREE.Vector3;
  /** [playerPlatform, foePlatform] — repositioned with the creatures. */
  platforms: THREE.Mesh[];
}

function radialDiscTexture(inner: string, outer: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.72, outer);
  g.addColorStop(1, "rgba(0,0,0,0)"); // feather the rim so the disc melts into fog
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lighten(hex: string, amt: number): THREE.Color {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amt);
}

export function buildBattleScene(
  backdrop: { ground1: string; ground2: string; fog: string },
  titan: boolean,
): BattleScene {
  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(backdrop.fog);
  if (titan) fogColor.multiplyScalar(0.5); // darker, more oppressive for titans
  scene.background = fogColor.clone();
  scene.fog = new THREE.Fog(fogColor.getHex(), titan ? 9 : 13, titan ? 24 : 30);

  const key = new THREE.DirectionalLight(0xfff2d9, titan ? 1.5 : 2.1);
  key.position.set(-5, 9, 6);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x6a7a58, titan ? 0.7 : 1.1));

  // Ground disc (elliptical: circle scaled on z).
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 56),
    new THREE.MeshBasicMaterial({
      map: radialDiscTexture(backdrop.ground1, backdrop.ground2),
      transparent: true,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.scale.set(1, 0.66, 1);
  disc.position.y = -0.02;
  disc.renderOrder = 0;
  scene.add(disc);

  // Side-by-side arena: both creatures at similar depth, player left vs foe
  // right, small in frame (user direction). A whisper of depth offset keeps
  // it from reading perfectly flat.
  const playerPos = new THREE.Vector3(-1.55, 0, 0.35);
  const foePos = new THREE.Vector3(1.55, 0, -0.35);

  // Soft round platforms under each creature — subtle, grounded, not blobs.
  // Exported so the screen can slide them with the creatures on orientation
  // changes.
  const platMat = new THREE.MeshBasicMaterial({
    color: lighten(backdrop.ground1, 0.14),
    transparent: true,
    opacity: 0.7,
  });
  const platforms: THREE.Mesh[] = [];
  for (const p of [playerPos, foePos]) {
    const plat = new THREE.Mesh(new THREE.CircleGeometry(0.78, 40), platMat.clone());
    plat.rotation.x = -Math.PI / 2;
    plat.scale.set(1, 0.6, 1);
    // Centered on the anchor: the sprite hides the back half, the front half
    // reads as ground hugging the creature's feet.
    plat.position.set(p.x, p.y + 0.01, p.z);
    plat.renderOrder = 1;
    platforms.push(plat);
    scene.add(plat);
  }

  // Scattered props: pebbles + grass tufts. Deterministic-ish placement.
  const pebbleColor = new THREE.Color(backdrop.ground2).multiplyScalar(0.85);
  const tuftColor = lighten(backdrop.ground1, 0.1);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + i * 0.7;
    const r = 1.8 + ((i * 37) % 24) / 12;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.66;
    if (i % 2 === 0) {
      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + ((i * 13) % 5) / 60, 6, 5),
        new THREE.MeshLambertMaterial({ color: pebbleColor }),
      );
      pebble.position.set(x, 0.04, z);
      pebble.scale.y = 0.6;
      scene.add(pebble);
    } else {
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.26, 5),
        new THREE.MeshLambertMaterial({ color: tuftColor, flatShading: true }),
      );
      tuft.position.set(x, 0.12, z);
      scene.add(tuft);
    }
  }

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 2.6, 5.6);
  const lookAt = new THREE.Vector3(0, 0.8, 0);
  camera.position.copy(camBase);
  camera.lookAt(lookAt);

  return { scene, camera, camBase, lookAt, playerPos, foePos, platforms };
}

// ---------------------------------------------------------------------------
// The sync glyph: an emissive torus ring with rotating rune ticks. The screen
// pulses and rotates it during a Codex sync attempt.
export interface SyncRing {
  group: THREE.Group;
  ring: THREE.Mesh;
  ticks: THREE.Group;
  glow: THREE.Mesh;
}

export function makeSyncRing(): SyncRing {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.07, 14, 56),
    new THREE.MeshBasicMaterial({ color: 0x66f0ff, transparent: true, opacity: 0.95 }),
  );
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 48),
    new THREE.MeshBasicMaterial({
      color: 0x9ff6ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  group.add(glow);

  const ticks = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.02, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xaef7ff, transparent: true, opacity: 0.95 }),
    );
    const a = (i / 12) * Math.PI * 2;
    tick.position.set(Math.cos(a) * 1.28, 0.01, Math.sin(a) * 1.28);
    tick.rotation.y = -a;
    ticks.add(tick);
  }
  group.add(ticks);

  return { group, ring, ticks, glow };
}

// ---------------------------------------------------------------------------
/** Project a world point to CSS pixel coordinates for DOM effects overlays. */
export function worldToScreen(
  v: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
): { x: number; y: number } {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
}

// ---------------------------------------------------------------------------
// Procedural move-impact FX: a pooled cloud of billboarded quads driven by
// canvas textures drawn once per shape. Bursts on hit, advances from the
// screen's update(dt), reaps itself, and lives entirely on top of the existing
// sprite animations. No external assets, no per-frame allocation, capped pool.

type ShapeName =
  | "slash-arc"
  | "spark"
  | "droplet"
  | "leaf"
  | "snowflake-shard"
  | "zap-bolt"
  | "light-ray"
  | "shadow-wisp"
  | "pebble"
  | "wind-streak"
  | "star-pop"
  | "music-note";

type FxMode = "burst" | "rise" | "implode" | "radial" | "streak";

/** Per-kind physics + look. The `kind` string passed to spawnImpact keys this. */
interface KindDef {
  tex: ShapeName;
  size: number;
  sizeVar: number;
  speed: number;
  speedVar: number;
  gravity: number;
  drag: number;
  life: number;
  lifeVar: number;
  spin: number;
  grow: number;
  stretch: number;
  fade: number;
  mode: FxMode;
}

const KINDS: Record<string, KindDef> = {
  slash: { tex: "slash-arc", size: 1.4, sizeVar: 0.4, speed: 1.5, speedVar: 1, gravity: 0.5, drag: 6, life: 0.26, lifeVar: 0.06, spin: 3, grow: 1.3, stretch: 1, fade: 1.5, mode: "burst" },
  spark: { tex: "spark", size: 0.35, sizeVar: 0.2, speed: 3, speedVar: 2, gravity: 4, drag: 3, life: 0.4, lifeVar: 0.2, spin: 6, grow: 0.6, stretch: 1, fade: 1.5, mode: "burst" },
  ember: { tex: "spark", size: 0.32, sizeVar: 0.2, speed: 1.5, speedVar: 1, gravity: -1.5, drag: 2, life: 0.7, lifeVar: 0.3, spin: 4, grow: 0.7, stretch: 1, fade: 1.5, mode: "rise" },
  mote: { tex: "spark", size: 0.28, sizeVar: 0.12, speed: 1, speedVar: 0.6, gravity: -1, drag: 2, life: 0.9, lifeVar: 0.3, spin: 2, grow: 0.8, stretch: 1, fade: 2, mode: "rise" },
  droplet: { tex: "droplet", size: 0.45, sizeVar: 0.2, speed: 3, speedVar: 2, gravity: 7, drag: 1.5, life: 0.5, lifeVar: 0.2, spin: 2, grow: 0.8, stretch: 1, fade: 1.5, mode: "burst" },
  leaf: { tex: "leaf", size: 0.55, sizeVar: 0.2, speed: 2, speedVar: 1.5, gravity: 1.2, drag: 2, life: 0.8, lifeVar: 0.3, spin: 8, grow: 1, stretch: 1, fade: 2, mode: "burst" },
  shard: { tex: "snowflake-shard", size: 0.5, sizeVar: 0.3, speed: 4, speedVar: 2, gravity: 3, drag: 3, life: 0.4, lifeVar: 0.15, spin: 5, grow: 0.7, stretch: 1, fade: 1.5, mode: "burst" },
  zap: { tex: "zap-bolt", size: 1.3, sizeVar: 0.5, speed: 1, speedVar: 1, gravity: 0, drag: 8, life: 0.18, lifeVar: 0.06, spin: 1, grow: 1.1, stretch: 1, fade: 2, mode: "burst" },
  ray: { tex: "light-ray", size: 0.9, sizeVar: 0.4, speed: 1.5, speedVar: 1, gravity: 0, drag: 4, life: 0.32, lifeVar: 0.1, spin: 0, grow: 1.4, stretch: 3.5, fade: 1.5, mode: "radial" },
  wisp: { tex: "shadow-wisp", size: 0.7, sizeVar: 0.3, speed: 3.5, speedVar: 1.5, gravity: 0, drag: 1.5, life: 0.5, lifeVar: 0.2, spin: 3, grow: 0.5, stretch: 1, fade: 1.5, mode: "implode" },
  pebble: { tex: "pebble", size: 0.35, sizeVar: 0.2, speed: 3, speedVar: 2, gravity: 8, drag: 1, life: 0.55, lifeVar: 0.2, spin: 6, grow: 1, stretch: 1, fade: 1.5, mode: "burst" },
  streak: { tex: "wind-streak", size: 0.6, sizeVar: 0.3, speed: 4, speedVar: 2, gravity: 0.3, drag: 3, life: 0.35, lifeVar: 0.1, spin: 0, grow: 1, stretch: 4, fade: 1.5, mode: "streak" },
  star: { tex: "star-pop", size: 0.5, sizeVar: 0.3, speed: 2, speedVar: 1.5, gravity: 1, drag: 4, life: 0.5, lifeVar: 0.2, spin: 4, grow: 1.1, stretch: 1, fade: 1.5, mode: "burst" },
  note: { tex: "music-note", size: 0.5, sizeVar: 0.2, speed: 1.2, speedVar: 0.8, gravity: -1.2, drag: 2, life: 0.9, lifeVar: 0.3, spin: 3, grow: 0.9, stretch: 1, fade: 2, mode: "rise" },
};

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  active: boolean;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  size: number;
  grow: number;
  fade: number;
  stretchX: number;
  stretchY: number;
  roll: number;
  spinVel: number;
}

const FX_POOL = 128; // hard cap on live particles (spawns beyond this are dropped)
const _scratch = new THREE.Vector3();

/** Draw a shape once, white-on-transparent, for additive tinting via material color. */
function drawShape(name: ShapeName): THREE.Texture {
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  c.lineCap = "round";
  c.lineJoin = "round";
  c.shadowColor = "#fff";

  switch (name) {
    case "spark": {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,255,255,0.85)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
      break;
    }
    case "shadow-wisp": {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.5, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
      break;
    }
    case "pebble": {
      const g = c.createRadialGradient(26, 26, 2, 32, 32, 24);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0.55)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(32, 32, 20, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case "slash-arc": {
      c.shadowBlur = 8;
      c.lineWidth = 8;
      c.beginPath();
      c.arc(32, 44, 28, Math.PI * 1.12, Math.PI * 1.88);
      c.stroke();
      break;
    }
    case "droplet": {
      c.beginPath();
      c.moveTo(32, 6);
      c.bezierCurveTo(50, 30, 48, 56, 32, 56);
      c.bezierCurveTo(16, 56, 14, 30, 32, 6);
      c.fill();
      break;
    }
    case "leaf": {
      c.beginPath();
      c.moveTo(32, 5);
      c.quadraticCurveTo(57, 32, 32, 59);
      c.quadraticCurveTo(7, 32, 32, 5);
      c.fill();
      break;
    }
    case "snowflake-shard": {
      c.beginPath();
      c.moveTo(32, 3);
      c.lineTo(41, 32);
      c.lineTo(32, 61);
      c.lineTo(23, 32);
      c.closePath();
      c.fill();
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        c.beginPath();
        c.moveTo(32 - Math.cos(a) * 26, 32 - Math.sin(a) * 26);
        c.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26);
        c.stroke();
      }
      break;
    }
    case "zap-bolt": {
      c.shadowBlur = 8;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(28, 3);
      c.lineTo(37, 24);
      c.lineTo(29, 28);
      c.lineTo(41, 41);
      c.lineTo(31, 45);
      c.lineTo(38, 61);
      c.stroke();
      break;
    }
    case "light-ray": {
      const g = c.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(25, 0, 14, S);
      break;
    }
    case "wind-streak": {
      const g = c.createLinearGradient(0, 0, S, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 27, S, 10);
      break;
    }
    case "star-pop": {
      c.shadowBlur = 8;
      const pts: [number, number][] = [
        [32, 2], [38, 26], [62, 32], [38, 38],
        [32, 62], [26, 38], [2, 32], [26, 26],
      ];
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) c.lineTo(x, y);
      c.closePath();
      c.fill();
      break;
    }
    case "music-note": {
      c.beginPath();
      c.ellipse(24, 46, 9, 7, -0.35, 0, Math.PI * 2);
      c.fill();
      c.fillRect(31, 14, 4, 32);
      c.beginPath();
      c.moveTo(35, 14);
      c.quadraticCurveTo(50, 18, 46, 34);
      c.quadraticCurveTo(46, 22, 35, 22);
      c.fill();
      break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ImpactFX {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly tex = new Map<ShapeName, THREE.Texture>();
  private readonly pool: Particle[] = [];
  private cursor = 0;

  constructor() {
    const shapes: ShapeName[] = [
      "slash-arc", "spark", "droplet", "leaf", "snowflake-shard", "zap-bolt",
      "light-ray", "shadow-wisp", "pebble", "wind-streak", "star-pop", "music-note",
    ];
    for (const s of shapes) this.tex.set(s, drawShape(s));

    const seed = this.tex.get("spark")!;
    for (let i = 0; i < FX_POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: seed, // pre-seed so USE_MAP is defined; swapping maps later is free
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 20;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.pool.push({
        mesh, mat, vel: new THREE.Vector3(), active: false, life: 0, maxLife: 0,
        gravity: 0, drag: 0, size: 0, grow: 1, fade: 1, stretchX: 1, stretchY: 1, roll: 0, spinVel: 0,
      });
    }
  }

  private free(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.cursor + i) % this.pool.length;
      if (!this.pool[idx].active) {
        this.cursor = (idx + 1) % this.pool.length;
        return this.pool[idx];
      }
    }
    return null;
  }

  /** Burst `count` particles of `kind` (see KINDS) at world point `at`, tinted `color`. */
  spawnImpact(at: THREE.Vector3, kind: string, color: string, count = 10): void {
    const def = KINDS[kind] ?? KINDS.spark;
    const tex = this.tex.get(def.tex)!;
    for (let n = 0; n < count; n++) {
      const p = this.free();
      if (!p) break; // pool exhausted: drop the overflow rather than allocate
      p.active = true;
      p.mesh.visible = true;
      p.life = 0;
      p.maxLife = def.life + Math.random() * def.lifeVar;
      p.gravity = def.gravity;
      p.drag = def.drag;
      p.grow = def.grow;
      p.fade = def.fade;
      p.size = def.size + Math.random() * def.sizeVar;
      const speed = def.speed + Math.random() * def.speedVar;
      p.mat.map = tex;
      p.mat.color.set(color);
      p.mat.opacity = 1;

      if (def.mode === "streak") {
        p.stretchX = def.stretch;
        p.stretchY = 0.5;
      } else if (def.mode === "radial") {
        p.stretchX = 0.5;
        p.stretchY = def.stretch;
      } else {
        p.stretchX = 1;
        p.stretchY = 1;
      }
      p.spinVel = def.mode === "radial" || def.mode === "streak" ? 0 : (Math.random() * 2 - 1) * def.spin;

      const a = Math.random() * Math.PI * 2;
      switch (def.mode) {
        case "rise":
          _scratch.set((Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.4, (Math.random() - 0.5) * 0.8).normalize();
          p.mesh.position.set(at.x + (Math.random() - 0.5) * 0.5, at.y + (Math.random() - 0.4) * 0.3, at.z + (Math.random() - 0.5) * 0.5);
          p.vel.copy(_scratch).multiplyScalar(speed);
          p.roll = Math.random() * Math.PI * 2;
          break;
        case "implode": {
          const r = 1.2 + Math.random() * 0.6;
          _scratch.set(Math.cos(a), (Math.random() - 0.5) * 0.6, Math.sin(a));
          p.mesh.position.set(at.x + _scratch.x * r, at.y + _scratch.y * r + 0.2, at.z + _scratch.z * r * 0.6);
          p.vel.copy(_scratch).multiplyScalar(-speed); // inward, toward the target
          p.roll = Math.random() * Math.PI * 2;
          break;
        }
        case "radial":
          p.mesh.position.copy(at);
          p.vel.set(Math.cos(a), Math.sin(a), 0).multiplyScalar(speed);
          p.roll = a - Math.PI / 2;
          break;
        case "streak": {
          const dir = Math.random() < 0.5 ? -1 : 1;
          p.mesh.position.set(at.x + (Math.random() - 0.5) * 0.3, at.y + (Math.random() - 0.5) * 0.6, at.z + (Math.random() - 0.5) * 0.3);
          p.vel.set(dir * (0.8 + Math.random() * 0.4), (Math.random() - 0.5) * 0.5, 0).normalize().multiplyScalar(speed);
          p.roll = Math.atan2(p.vel.y, p.vel.x);
          break;
        }
        default: // burst
          _scratch.set((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.2, (Math.random() - 0.5) * 2).normalize();
          p.mesh.position.set(at.x + (Math.random() - 0.5) * 0.3, at.y + (Math.random() - 0.5) * 0.3, at.z + (Math.random() - 0.5) * 0.3);
          p.vel.copy(_scratch).multiplyScalar(speed);
          p.roll = Math.random() * Math.PI * 2;
          break;
      }
      const s0 = p.size * p.grow ** 0; // initial scale (t=0)
      p.mesh.scale.set(s0 * p.stretchX, s0 * p.stretchY, 1);
    }
  }

  /** Advance + reap. `dt` is scaled time (0 during hit-stop, freezing particles). */
  update(dt: number, camera: THREE.Camera): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      if (dt > 0) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.mesh.visible = false;
          p.mat.opacity = 0;
          continue;
        }
        p.vel.y -= p.gravity * dt;
        p.vel.multiplyScalar(Math.exp(-p.drag * dt));
        p.mesh.position.addScaledVector(p.vel, dt);
        p.roll += p.spinVel * dt;
      }
      const t = p.maxLife > 0 ? p.life / p.maxLife : 1;
      const s = p.size * (1 + (p.grow - 1) * t);
      p.mesh.scale.set(s * p.stretchX, s * p.stretchY, 1);
      p.mat.opacity = Math.pow(1 - t, p.fade);
      p.mesh.quaternion.copy(camera.quaternion);
      p.mesh.rotateZ(p.roll);
    }
  }

  /** Free the shared geometry, per-particle materials, and cached textures. */
  dispose(): void {
    this.geo.dispose();
    for (const p of this.pool) p.mat.dispose();
    for (const t of this.tex.values()) t.dispose();
    this.tex.clear();
  }
}
