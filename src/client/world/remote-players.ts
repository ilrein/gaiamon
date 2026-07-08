// RemotePlayers: the render layer for multiplayer presence. Owns a THREE.Group
// the overworld adds to its scene; each remote warden is a WalkerSprite with a
// canvas name tag, smoothly lerped toward its network target (~8-10 updates/s)
// and animated while moving. Emotes are transient canvas-sprite bubbles.
//
// Debug hooks (shipped intentionally — the presence e2e test reads them):
//   window.__presenceCount  number of remote players currently in the layer
//   window.__presenceNames  their display names
//   window.__lastEmote      last received emote {id, k}

import * as THREE from "three";
import { WalkerSprite } from "./walker";
import type { Dir, RemotePlayerInfo } from "../net/presence";

/** Exponential lerp rate toward the network target position. */
const LERP_RATE = 8;
const EMOTE_SECONDS = 2;
const TAG_Y = 2.05;
const EMOTE_Y = 2.35;

interface Entry {
  root: THREE.Group;
  walker: WalkerSprite;
  tag: THREE.Sprite;
  tagTex: THREE.Texture;
  name: string;
  target: { x: number; z: number };
  hasPos: boolean;
  moving: boolean;
}

interface Emote {
  sprite: THREE.Sprite;
  tex: THREE.Texture;
  t: number;
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

function heartTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 64);
  // Speech-bubble backing.
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
  // Heart.
  ctx.fillStyle = "#e8556d";
  ctx.beginPath();
  ctx.moveTo(32, 40);
  ctx.bezierCurveTo(14, 28, 18, 12, 32, 20);
  ctx.bezierCurveTo(46, 12, 50, 28, 32, 40);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

  private readonly entries = new Map<string, Entry>();
  private readonly emotes: Emote[] = [];

  get count(): number {
    return this.entries.size;
  }

  /** Add or refresh a remote player (from a roster or join message). */
  upsert(p: RemotePlayerInfo): void {
    let entry = this.entries.get(p.id);
    if (!entry) {
      const root = new THREE.Group();
      const walker = new WalkerSprite(p.sprite, 1.7);
      const tagTex = nameTagTexture(p.name);
      const tag = makeBubble(tagTex, TAG_Y, 1);
      tag.scale.set(1.7, 0.42, 1);
      root.add(walker.mesh, tag);
      this.group.add(root);
      entry = { root, walker, tag, tagTex, name: p.name, target: { x: 0, z: 0 }, hasPos: false, moving: false };
      this.entries.set(p.id, entry);
    }
    if (typeof p.x === "number" && typeof p.z === "number") {
      entry.target.x = p.x;
      entry.target.z = p.z;
      entry.root.position.set(p.x, 0, p.z);
      entry.hasPos = true;
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
      entry.hasPos = true;
      entry.root.visible = true;
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
    this.disposeEntry(entry);
    this.syncDebug();
  }

  /** Clear everything (area change / reconnect — a fresh roster follows). */
  reset(): void {
    for (const entry of this.entries.values()) this.disposeEntry(entry);
    this.entries.clear();
    for (const emote of this.emotes.splice(0)) this.disposeEmote(emote);
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
      }
    }
  }

  dispose(): void {
    this.reset();
  }

  // -- internals --------------------------------------------------------------
  private spawnEmote(parent: THREE.Object3D, y: number, kind: string): void {
    if (this.emotes.length >= MAX_EMOTES) {
      const oldest = this.emotes.shift();
      if (oldest) this.disposeEmote(oldest);
    }
    // v1 has a single emote (heart); `kind` picks the cached texture when
    // more land. Textures are shared — never disposed per bubble.
    let tex = emoteTexCache.get("heart");
    if (!tex) {
      tex = heartTexture();
      emoteTexCache.set("heart", tex);
    }
    void kind;
    const sprite = makeBubble(tex, y, 0.8);
    parent.add(sprite);
    this.emotes.push({ sprite, tex, t: 0 });
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
