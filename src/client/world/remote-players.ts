// RemotePlayers: the render layer for multiplayer presence. Owns a THREE.Group
// the overworld adds to its scene; each remote warden is a WalkerSprite with a
// canvas name tag, smoothly lerped toward its network target (~8-10 updates/s)
// and animated while moving. Emotes are transient canvas-sprite bubbles.
//
// Debug hooks (shipped intentionally — the presence e2e test reads them):
//   window.__presenceCount  number of remote players currently in the layer
//   window.__presenceNames  their display names
//   window.__lastEmote      last received emote {id, k}
//   window.__emoteLive      kinds+ages of the live emote bubbles [{k, t}]
//   (main.ts also ships window.__lastToast — last arrival/leave toast text)

import * as THREE from "three";
import { WalkerSprite } from "./walker";
import type { Dir, RemotePlayerInfo } from "../net/presence";

/** Exponential lerp rate toward the network target position. */
const LERP_RATE = 8;
const EMOTE_SECONDS = 2;
const TAG_Y = 2.05;
const EMOTE_Y = 2.35;
// Spawn-in magic: sparkle burst at the feet + a 0.6→1 ease-out pop. Both are
// pure cosmetics, so reduced-motion users skip them entirely.
const SPARKLE_SECONDS = 0.8;
const SPARKLE_COUNT = 6;
/** Flood guard on live sparkle sprites (a burst of joins must stay cheap). */
const MAX_SPARKLES = 48;
const POP_SECONDS = 0.45;
const SPAWN_SCALE = 0.6;
const REDUCED_MOTION =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Entry {
  root: THREE.Group;
  walker: WalkerSprite;
  tag: THREE.Sprite;
  tagTex: THREE.Texture;
  name: string;
  target: { x: number; z: number };
  hasPos: boolean;
  moving: boolean;
  /** Toast this player's first-visible moment (false for roster arrivals). */
  announce: boolean;
  /** Spawn pop clock; -1 when idle/finished. */
  spawnT: number;
}

interface Emote {
  sprite: THREE.Sprite;
  tex: THREE.Texture;
  t: number;
  kind: string;
}

interface Sparkle {
  sprite: THREE.Sprite;
  t: number;
  rise: number;
}

function nameTagTexture(name: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = '700 26px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = Math.min(236, ctx.measureText(name).width + 28);
  // Rounded pill behind the text.
  ctx.fillStyle = "rgba(26, 22, 18, 0.62)";
  ctx.beginPath();
  ctx.roundRect(128 - w / 2, 12, w, 40, 20);
  ctx.fill();
  ctx.fillStyle = "#fff8ec";
  ctx.fillText(name, 128, 33, 220);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// One texture per emote kind for the whole session — emotes arrive from the
// network and must not allocate a canvas + GPU upload per bubble.
const emoteTexCache = new Map<string, THREE.Texture>();
/** Upper bound on simultaneously live bubbles (flood guard). */
const MAX_EMOTES = 12;

/** Speech-bubble backing shared by every emote kind; returns the ctx so the
 *  caller can draw the content on top. */
function bubbleCanvas(): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = "#fff8ec";
  ctx.strokeStyle = "#3a2f2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(6, 4, 52, 44, 14);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(26, 46);
  ctx.lineTo(32, 58);
  ctx.lineTo(38, 46);
  ctx.closePath();
  ctx.fill();
  return ctx;
}

function toTexture(ctx: CanvasRenderingContext2D): THREE.Texture {
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function heartTexture(): THREE.Texture {
  const ctx = bubbleCanvas();
  ctx.fillStyle = "#e8556d";
  ctx.beginPath();
  ctx.moveTo(32, 40);
  ctx.bezierCurveTo(14, 28, 18, 12, 32, 20);
  ctx.bezierCurveTo(46, 12, 50, 28, 32, 40);
  ctx.closePath();
  ctx.fill();
  return toTexture(ctx);
}

function glyphTexture(glyph: string): THREE.Texture {
  const ctx = bubbleCanvas();
  ctx.font = '26px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#3a2f2a";
  ctx.fillText(glyph, 32, 27);
  return toTexture(ctx);
}

/** Emote kinds with their own bubble art; anything unknown renders the heart
 *  (kinds are free-form short strings over the wire). */
const EMOTE_GLYPHS: Record<string, string> = { wave: "👋" };

function emoteTexture(kind: string): THREE.Texture {
  // hasOwnProperty guard: a hostile peer can send kind="constructor" etc.,
  // and a bare `in` check would walk the prototype chain.
  const key =
    kind === "heart" || Object.prototype.hasOwnProperty.call(EMOTE_GLYPHS, kind)
      ? kind
      : "heart";
  let tex = emoteTexCache.get(key);
  if (!tex) {
    tex = key === "heart" ? heartTexture() : glyphTexture(EMOTE_GLYPHS[key]);
    emoteTexCache.set(key, tex);
  }
  return tex;
}

// Tiny warm star for the spawn-in sparkle burst — one shared texture for the
// session (sprite materials are disposed per particle; the texture is not).
let starTex: THREE.Texture | null = null;
function starTexture(): THREE.Texture {
  if (starTex) return starTex;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 32, 32);
  // Soft glow behind a 4-point star.
  const glow = ctx.createRadialGradient(16, 16, 1, 16, 16, 14);
  glow.addColorStop(0, "rgba(255, 244, 200, 0.9)");
  glow.addColorStop(1, "rgba(255, 244, 200, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#fff3c4";
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.quadraticCurveTo(18, 14, 30, 16);
  ctx.quadraticCurveTo(18, 18, 16, 30);
  ctx.quadraticCurveTo(14, 18, 2, 16);
  ctx.quadraticCurveTo(14, 14, 16, 2);
  ctx.closePath();
  ctx.fill();
  starTex = new THREE.CanvasTexture(canvas);
  starTex.colorSpace = THREE.SRGBColorSpace;
  return starTex;
}

function makeBubble(tex: THREE.Texture, y: number, scale: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0);
  sprite.position.y = y;
  sprite.renderOrder = 10;
  sprite.scale.setScalar(scale);
  return sprite;
}

export class RemotePlayers {
  readonly group = new THREE.Group();
  onCountChange: (n: number) => void = () => {};
  /** First-visible for a post-roster join — main.ts shows the arrival toast. */
  onArrive: (name: string) => void = () => {};
  /** Player left while visible — main.ts shows the departure toast. */
  onDepart: (name: string) => void = () => {};

  private readonly entries = new Map<string, Entry>();
  private readonly emotes: Emote[] = [];
  private readonly sparkles: Sparkle[] = [];
  /** Monotonic renderOrder bump so the newest bubble always draws on top. */
  private emoteSeq = 0;

  get count(): number {
    return this.entries.size;
  }

  /** Add or refresh a remote player. `silent` marks roster arrivals: they get
   *  no toast (only players who join after us are announced). */
  upsert(p: RemotePlayerInfo, silent = false): void {
    let entry = this.entries.get(p.id);
    if (!entry) {
      const root = new THREE.Group();
      const walker = new WalkerSprite(p.sprite, 1.7);
      const tagTex = nameTagTexture(p.name);
      const tag = makeBubble(tagTex, TAG_Y, 1);
      tag.scale.set(1.7, 0.42, 1);
      root.add(walker.mesh, tag);
      this.group.add(root);
      entry = {
        root,
        walker,
        tag,
        tagTex,
        name: p.name,
        target: { x: 0, z: 0 },
        hasPos: false,
        moving: false,
        announce: !silent,
        spawnT: -1,
      };
      this.entries.set(p.id, entry);
    }
    if (typeof p.x === "number" && typeof p.z === "number") {
      entry.target.x = p.x;
      entry.target.z = p.z;
      entry.root.position.set(p.x, 0, p.z);
      if (!entry.hasPos) this.markVisible(entry);
    }
    // Hidden until the first real position arrives (never flash in at 0,0).
    entry.root.visible = entry.hasPos;
    if (p.dir) entry.walker.face(p.dir);
    this.syncDebug();
  }

  setPos(id: string, x: number, z: number, dir: Dir, moving: boolean): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.target.x = x;
    entry.target.z = z;
    if (!entry.hasPos) {
      entry.root.position.set(x, 0, z); // first fix: snap, don't glide across the map
      this.markVisible(entry);
    }
    entry.walker.face(dir);
    entry.moving = moving;
  }

  showEmote(id: string, kind: string): void {
    const entry = this.entries.get(id);
    if (entry) this.spawnEmote(entry.root, EMOTE_Y, kind);
    const w = window as unknown as Record<string, unknown>;
    w.__lastEmote = { id, k: kind, at: Date.now() };
  }

  /** Local player's own emote bubble, at world coords (the layer shares the
   *  overworld's world space). */
  showEmoteAt(x: number, z: number, kind: string): void {
    const holder = new THREE.Group();
    holder.position.set(x, 0, z);
    this.group.add(holder);
    this.spawnEmote(holder, EMOTE_Y, kind);
  }

  remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.entries.delete(id);
    // Only players who were actually seen get a "wandered off" toast.
    if (entry.hasPos) this.onDepart(entry.name);
    this.disposeEntry(entry);
    this.syncDebug();
  }

  /** Clear everything (area change / reconnect — a fresh roster follows).
   *  Silent: bulk teardown never toasts. */
  reset(): void {
    for (const entry of this.entries.values()) this.disposeEntry(entry);
    this.entries.clear();
    for (const emote of this.emotes.splice(0)) this.disposeEmote(emote);
    for (const sparkle of this.sparkles.splice(0)) this.disposeSparkle(sparkle);
    // Drop any leftover local-emote holders.
    for (const child of [...this.group.children]) this.group.remove(child);
    this.syncDebug();
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-LERP_RATE * dt);
    for (const entry of this.entries.values()) {
      if (!entry.hasPos) continue;
      const pos = entry.root.position;
      const dx = entry.target.x - pos.x;
      const dz = entry.target.z - pos.z;
      pos.x += dx * k;
      pos.z += dz * k;
      // Keep walking while still gliding toward the target, even if the last
      // network frame said "stopped" — reads much less slidey.
      entry.walker.update(dt, entry.moving || Math.hypot(dx, dz) > 0.08);
      // Spawn-in pop: 0.6→1 with a soft ease-out-back overshoot.
      if (entry.spawnT >= 0) {
        entry.spawnT += dt;
        const f = Math.min(1, entry.spawnT / POP_SECONDS);
        const e = 1 + 2.70158 * Math.pow(f - 1, 3) + 1.70158 * Math.pow(f - 1, 2);
        entry.walker.mesh.scale.setScalar(SPAWN_SCALE + (1 - SPAWN_SCALE) * e);
        if (f >= 1) {
          entry.walker.mesh.scale.setScalar(1);
          entry.spawnT = -1;
        }
      }
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sparkle = this.sparkles[i];
      sparkle.t += dt;
      const f = sparkle.t / SPARKLE_SECONDS;
      sparkle.sprite.position.y += sparkle.rise * dt;
      (sparkle.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - f * f);
      if (sparkle.t >= SPARKLE_SECONDS) {
        this.sparkles.splice(i, 1);
        this.disposeSparkle(sparkle);
      }
    }
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const emote = this.emotes[i];
      emote.t += dt;
      const f = emote.t / EMOTE_SECONDS;
      emote.sprite.position.y = EMOTE_Y + f * 0.35;
      (emote.sprite.material as THREE.SpriteMaterial).opacity = f < 0.75 ? 1 : Math.max(0, (1 - f) * 4);
      if (emote.t >= EMOTE_SECONDS) {
        this.emotes.splice(i, 1);
        this.disposeEmote(emote);
        (window as unknown as Record<string, unknown>).__emoteLive = this.emotes.map((e) => ({
          k: e.kind,
          t: e.t,
        }));
      }
    }
  }

  dispose(): void {
    this.reset();
  }

  // -- internals --------------------------------------------------------------
  /** First real position landed: reveal with the spawn-in magic (sparkles +
   *  scale pop, both skipped under reduced motion) and announce if eligible. */
  private markVisible(entry: Entry): void {
    entry.hasPos = true;
    entry.root.visible = true;
    if (!REDUCED_MOTION) {
      entry.spawnT = 0;
      entry.walker.mesh.scale.setScalar(SPAWN_SCALE);
      this.spawnSparkles(entry.root);
    }
    if (entry.announce) {
      entry.announce = false;
      this.onArrive(entry.name);
    }
  }

  private spawnSparkles(parent: THREE.Object3D): void {
    const tex = starTexture();
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      if (this.sparkles.length >= MAX_SPARKLES) return;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      const angle = (i / SPARKLE_COUNT) * Math.PI * 2 + Math.random() * 0.9;
      const radius = 0.18 + Math.random() * 0.3;
      sprite.position.set(
        Math.cos(angle) * radius,
        0.05 + Math.random() * 0.25,
        Math.sin(angle) * radius,
      );
      sprite.scale.setScalar(0.12 + Math.random() * 0.1);
      sprite.renderOrder = 10;
      parent.add(sprite);
      this.sparkles.push({ sprite, t: 0, rise: 0.9 + Math.random() * 0.7 });
    }
  }

  private disposeSparkle(sparkle: Sparkle): void {
    sparkle.sprite.parent?.remove(sparkle.sprite);
    (sparkle.sprite.material as THREE.SpriteMaterial).dispose();
    // the star texture is shared for the session — do not dispose
  }

  private spawnEmote(parent: THREE.Object3D, y: number, kind: string): void {
    if (this.emotes.length >= MAX_EMOTES) {
      const oldest = this.emotes.shift();
      if (oldest) this.disposeEmote(oldest);
    }
    // Per-kind cached textures (unknown kinds fall back to the heart) —
    // shared for the session, never disposed per bubble.
    const tex = emoteTexture(kind);
    const sprite = makeBubble(tex, y, 0.8);
    sprite.renderOrder = 11 + this.emoteSeq++;
    parent.add(sprite);
    this.emotes.push({ sprite, tex, t: 0, kind });
    // Debug hook (presence e2e): kinds+ages of the live bubbles.
    (window as unknown as Record<string, unknown>).__emoteLive = this.emotes.map((e) => ({
      k: e.kind,
      t: e.t,
    }));
  }

  private disposeEmote(emote: Emote): void {
    const holder = emote.sprite.parent;
    holder?.remove(emote.sprite);
    // Local emotes live in a throwaway holder group directly under the layer.
    if (holder && holder.parent === this.group && holder.children.length === 0) {
      this.group.remove(holder);
    }
    (emote.sprite.material as THREE.SpriteMaterial).dispose();
    // emote.tex is shared via emoteTexCache — do not dispose
  }

  private disposeEntry(entry: Entry): void {
    this.group.remove(entry.root);
    entry.walker.dispose();
    (entry.tag.material as THREE.SpriteMaterial).dispose();
    entry.tagTex.dispose();
  }

  private syncDebug(): void {
    const w = window as unknown as Record<string, unknown>;
    w.__presenceCount = this.entries.size;
    w.__presenceNames = [...this.entries.values()].map((e) => e.name);
    this.onCountChange(this.entries.size);
  }
}
