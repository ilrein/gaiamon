// Scene, sprite and tween helpers for the battle screen. Pure presentation:
// no engine imports, no game state. The BattleScreen owns the event playback
// loop and drives these helpers.

import * as THREE from "three";
import { creatureTexture } from "../sprites";

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
// Creature view: a group holding the base sprite plus an additive "flash"
// sprite (same texture) used for the white hit-flash. Anchored at the feet.
export interface CombatantView {
  group: THREE.Group;
  base: THREE.Sprite;
  flash: THREE.Sprite;
  scale: number;
  phase: number;
  basePos: THREE.Vector3;
  offset: THREE.Vector3;
  fainting: boolean;
  rimLight?: THREE.PointLight;
}

export function makeCombatantView(
  speciesId: string,
  scale: number,
  phase: number,
  opts: { titan?: boolean } = {},
): CombatantView {
  const tex = creatureTexture(speciesId);
  const base = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  base.center.set(0.5, 0);
  base.scale.set(scale, scale, 1);
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

  const group = new THREE.Group();
  group.add(base, flash);

  const view: CombatantView = {
    group,
    base,
    flash,
    scale,
    phase,
    basePos: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    fainting: false,
  };

  if (opts.titan) {
    const rim = new THREE.PointLight(0xff5a4a, 6, 12, 2);
    rim.position.set(0, scale * 0.6, -0.6);
    group.add(rim);
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
  scene.add(disc);

  const playerPos = new THREE.Vector3(-1.35, 0, 1.5);
  const foePos = new THREE.Vector3(1.55, 0.55, -1.7);

  // Soft round platforms under each creature.
  const platMat = new THREE.MeshBasicMaterial({
    color: lighten(backdrop.ground1, 0.22),
    transparent: true,
    opacity: 0.85,
  });
  for (const p of [playerPos, foePos]) {
    const plat = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), platMat.clone());
    plat.rotation.x = -Math.PI / 2;
    plat.scale.set(1, 0.6, 1);
    plat.position.set(p.x, p.y + 0.01, p.z);
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
  const camBase = new THREE.Vector3(-2.3, 2.55, 4.7);
  const lookAt = new THREE.Vector3(0.25, 0.95, -0.35);
  camera.position.copy(camBase);
  camera.lookAt(lookAt);

  return { scene, camera, camBase, lookAt, playerPos, foePos };
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
