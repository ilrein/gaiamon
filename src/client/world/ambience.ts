// Per-biome atmospheric particles + the area title splash card.
//
// One Ambience per loaded area: a small THREE.Group of Points layers (≤180
// particles total) whose recipe is picked by substring-matching the area's
// biome id. Layers share cached canvas sprite textures and update in-place
// (typed-array writes only — no per-frame allocation).
//
// Also exports showAreaTitle(): a DOM splash shown by the overworld when the
// player enters a *new* area (battle-return reloads don't retrigger it).

import * as THREE from "three";
import type { AreaDef } from "../../shared/area";
import "./ambience.css";

// ---------------------------------------------------------------------------
// Sprite textures (module-level cache, shared across areas).

type TexKind = "dot" | "glow" | "petal" | "flake" | "mist" | "sparkle";

const texCache = new Map<TexKind, THREE.Texture>();

function makeTexture(kind: TexKind): THREE.Texture {
  const cached = texCache.get(kind);
  if (cached) return cached;

  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const c = s / 2;

  switch (kind) {
    case "dot": {
      // Crisp-ish round mote with a soft edge.
      const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.7, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      break;
    }
    case "glow": {
      // Bright core + wide halo (fireflies, embers, spores).
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.18, "rgba(255,255,255,0.85)");
      g.addColorStop(0.5, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      break;
    }
    case "petal": {
      // A tilted soft ellipse.
      ctx.translate(c, c);
      ctx.rotate(0.6);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.6);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.85, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.scale(1, 0.55);
      ctx.beginPath();
      ctx.arc(0, 0, c * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "flake": {
      // Snowflake: soft dot + 6 short arms.
      const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * 4, c + Math.sin(a) * 4);
        ctx.lineTo(c + Math.cos(a) * (c * 0.55), c + Math.sin(a) * (c * 0.55));
        ctx.stroke();
      }
      break;
    }
    case "mist": {
      // Very soft, wide blob — layered large for ground fog wisps.
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, "rgba(255,255,255,0.5)");
      g.addColorStop(0.5, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      break;
    }
    case "sparkle": {
      // 4-point star glint.
      const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.25);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineCap = "round";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(c, 4);
      ctx.lineTo(c, s - 4);
      ctx.moveTo(4, c);
      ctx.lineTo(s - 4, c);
      ctx.stroke();
      break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(kind, tex);
  return tex;
}

// ---------------------------------------------------------------------------
// Layer specs + biome recipes.

type Mode = "drift" | "fall" | "rise" | "mist" | "pulse";

interface LayerSpec {
  count: number;
  colors: string[];
  size: number; // world-ish units (PointsMaterial sizeAttenuation)
  tex: TexKind;
  additive?: boolean;
  opacity: number;
  yMin: number;
  yMax: number;
  /** Vertical speed for fall/rise, horizontal speed for mist (units/s). */
  speed: number;
  /** Sideways sway amplitude (units/s for fall/rise, wander speed for drift). */
  drift: number;
  mode: Mode;
  /** Brightness pulse rate for "pulse" mode (Hz-ish). */
  pulseHz?: number;
  /** Sharper pulse curve (light glints vs firefly breathing). */
  sparkle?: boolean;
}

const pollen: LayerSpec = {
  count: 80, colors: ["#fff6c8", "#f8ecad", "#ffffff"], size: 0.2, tex: "dot",
  additive: true, opacity: 0.8, yMin: 0.3, yMax: 2.4, speed: 0, drift: 0.22, mode: "drift",
};
const petals: LayerSpec = {
  count: 24, colors: ["#f7c8dc", "#f5b6d0", "#ffe0ec"], size: 0.36, tex: "petal",
  opacity: 0.95, yMin: 0.2, yMax: 3.2, speed: 0.35, drift: 0.5, mode: "fall",
};
const spores: LayerSpec = {
  count: 80, colors: ["#7ef0e0", "#5adbd0", "#a8f5ff"], size: 0.36, tex: "glow",
  additive: true, opacity: 0.7, yMin: 0.3, yMax: 3.0, speed: 0, drift: 0.12, mode: "drift",
};
const mistWisps: LayerSpec = {
  count: 30, colors: ["#dfe9f2", "#e8f0f6"], size: 4.5, tex: "mist",
  additive: true, opacity: 0.16, yMin: 0.15, yMax: 0.7, speed: 0.3, drift: 0.2, mode: "mist",
};
const fireflies: LayerSpec = {
  count: 60, colors: ["#ffe08a", "#ffd268", "#fff0b0"], size: 0.42, tex: "glow",
  additive: true, opacity: 0.95, yMin: 0.4, yMax: 2.2, speed: 0, drift: 0.3,
  mode: "pulse", pulseHz: 0.55,
};
// Icy blue-grey rather than pure white: summit scenes are bright and bloomed,
// so white-on-white flakes vanish without a cool tint.
const snow: LayerSpec = {
  count: 150, colors: ["#8fb2da", "#9dbfe6", "#c2d8f2"], size: 0.45, tex: "flake",
  opacity: 0.95, yMin: 0.0, yMax: 5, speed: 0.8, drift: 0.5, mode: "fall",
};
const embers: LayerSpec = {
  count: 60, colors: ["#ffb054", "#ff7a3c", "#ffd27a"], size: 0.24, tex: "glow",
  additive: true, opacity: 0.95, yMin: 0.1, yMax: 4.5, speed: 0.7, drift: 0.4, mode: "rise",
};
const ashFlakes: LayerSpec = {
  count: 60, colors: ["#9a938c", "#b8b2aa", "#7d7770"], size: 0.3, tex: "dot",
  opacity: 0.65, yMin: 0.0, yMax: 6, speed: 0.45, drift: 0.6, mode: "fall",
};
const glints: LayerSpec = {
  count: 70, colors: ["#fff7d0", "#d0f4ff", "#f0dcff"], size: 0.44, tex: "sparkle",
  additive: true, opacity: 0.9, yMin: 0.3, yMax: 3.5, speed: 0, drift: 0.08,
  mode: "pulse", pulseHz: 0.8, sparkle: true,
};
const motes: LayerSpec = {
  count: 70, colors: ["#fdf3d8", "#e8e2d0"], size: 0.2, tex: "dot",
  additive: true, opacity: 0.6, yMin: 0.3, yMax: 2.6, speed: 0, drift: 0.16, mode: "drift",
};

/** Ordered substring match — first hit wins (e.g. "volcanic-dusk-summit" must
 *  read as embers, not dusk fireflies or summit snow). */
const RECIPES: Array<[string[], LayerSpec[]]> = [
  [["volcanic", "obsidian"], [embers]],
  [["ash", "badlands", "caldera", "crater"], [embers, ashFlakes]],
  [["snow", "summit", "frost"], [snow]],
  [["cavern", "cave"], [spores]],
  [["mushroom", "dusk"], [fireflies]],
  [["glass", "canyon", "lumen"], [glints]],
  [["lakeshore", "harbor", "coast"], [mistWisps]],
  [["meadow", "hamlet"], [pollen, petals]],
];

function recipeFor(biome: string): LayerSpec[] {
  for (const [keys, specs] of RECIPES) {
    if (keys.some((k) => biome.includes(k))) return specs;
  }
  return [motes];
}

// ---------------------------------------------------------------------------
// A single Points layer.

class Layer {
  readonly points: THREE.Points;
  private readonly spec: LayerSpec;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly baseCol: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  /** Per particle: [vx, vz, baseY-or-rate, phase]. */
  private readonly data: Float32Array;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.PointsMaterial;
  private readonly w: number;
  private readonly d: number;
  private t: number;

  constructor(spec: LayerSpec, cols: number, rows: number) {
    this.spec = spec;
    this.w = cols;
    this.d = rows;
    this.t = Math.random() * 100;

    const n = spec.count;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.baseCol = new Float32Array(n * 3);
    this.data = new Float32Array(n * 4);

    const palette = spec.colors.map((h) => new THREE.Color(h));
    for (let i = 0; i < n; i++) {
      this.pos[i * 3] = Math.random() * cols - 0.5;
      this.pos[i * 3 + 1] = spec.yMin + Math.random() * (spec.yMax - spec.yMin);
      this.pos[i * 3 + 2] = Math.random() * rows - 0.5;
      const c = palette[(Math.random() * palette.length) | 0];
      this.baseCol[i * 3] = c.r;
      this.baseCol[i * 3 + 1] = c.g;
      this.baseCol[i * 3 + 2] = c.b;
      // velocities / per-particle randoms
      this.data[i * 4] = (Math.random() - 0.5) * 2 * spec.drift; // vx
      this.data[i * 4 + 1] = (Math.random() - 0.5) * 2 * spec.drift; // vz
      this.data[i * 4 + 2] = this.pos[i * 3 + 1]; // baseY (drift/mist bob)
      this.data[i * 4 + 3] = Math.random() * Math.PI * 2; // phase
    }
    this.col.set(this.baseCol);

    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 3);
    if (spec.mode === "pulse") this.colAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", this.posAttr);
    this.geo.setAttribute("color", this.colAttr);

    this.mat = new THREE.PointsMaterial({
      size: spec.size,
      map: makeTexture(spec.tex),
      transparent: true,
      opacity: spec.opacity,
      vertexColors: true,
      depthWrite: false,
      blending: spec.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      // Additive sprites + fog mix toward the fog color, which *brightens*
      // under additive blending — keep them fog-free.
      fog: !spec.additive,
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false; // positions move; one draw call anyway
    this.points.renderOrder = 5; // after water/grass transparents
  }

  update(dt: number): void {
    const s = this.spec;
    this.t += dt;
    const t = this.t;
    const n = s.count;
    const pos = this.pos;
    const data = this.data;

    for (let i = 0; i < n; i++) {
      const pi = i * 3;
      const di = i * 4;
      const phase = data[di + 3];

      switch (s.mode) {
        case "drift":
        case "pulse": {
          pos[pi] += data[di] * dt;
          pos[pi + 2] += data[di + 1] * dt;
          pos[pi + 1] = data[di + 2] + Math.sin(t * 0.5 + phase) * 0.3;
          break;
        }
        case "fall": {
          pos[pi + 1] -= s.speed * (0.7 + 0.5 * Math.sin(phase)) * dt + s.speed * 0.3 * dt;
          pos[pi] += Math.sin(t * 0.9 + phase) * s.drift * dt;
          if (pos[pi + 1] < s.yMin) {
            pos[pi + 1] = s.yMax; // respawn at top
            pos[pi] = Math.random() * this.w - 0.5;
            pos[pi + 2] = Math.random() * this.d - 0.5;
          }
          break;
        }
        case "rise": {
          pos[pi + 1] += s.speed * (0.6 + 0.5 * Math.abs(Math.sin(phase))) * dt;
          pos[pi] += Math.sin(t * 1.3 + phase) * s.drift * dt;
          if (pos[pi + 1] > s.yMax) {
            pos[pi + 1] = s.yMin;
            pos[pi] = Math.random() * this.w - 0.5;
            pos[pi + 2] = Math.random() * this.d - 0.5;
          }
          break;
        }
        case "mist": {
          pos[pi] += s.speed * (0.5 + 0.5 * Math.abs(Math.sin(phase))) * dt;
          pos[pi + 1] = data[di + 2] + Math.sin(t * 0.35 + phase) * 0.08;
          break;
        }
      }

      // Horizontal wrap keeps every mode inside the diorama.
      if (pos[pi] > this.w - 0.5) pos[pi] -= this.w;
      else if (pos[pi] < -0.5) pos[pi] += this.w;
      if (pos[pi + 2] > this.d - 0.5) pos[pi + 2] -= this.d;
      else if (pos[pi + 2] < -0.5) pos[pi + 2] += this.d;

      if (s.mode === "pulse") {
        const wave = 0.5 + 0.5 * Math.sin(t * (s.pulseHz ?? 0.5) * Math.PI * 2 + phase * 3);
        // Fireflies breathe; glints spike sharply.
        const b = s.sparkle ? 0.12 + 0.88 * wave * wave : 0.2 + 0.8 * wave;
        this.col[pi] = this.baseCol[pi] * b;
        this.col[pi + 1] = this.baseCol[pi + 1] * b;
        this.col[pi + 2] = this.baseCol[pi + 2] * b;
      }
    }

    this.posAttr.needsUpdate = true;
    if (s.mode === "pulse") this.colAttr.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose(); // cached textures are shared — not disposed here
  }
}

// ---------------------------------------------------------------------------

export class Ambience {
  readonly points: THREE.Group;
  private readonly layers: Layer[];

  constructor(area: AreaDef) {
    const rows = area.tiles.length;
    const cols = area.tiles[0]?.length ?? 0;
    this.points = new THREE.Group();
    this.layers = recipeFor(area.biome).map((spec) => new Layer(spec, cols, rows));
    for (const l of this.layers) this.points.add(l.points);
  }

  update(dt: number): void {
    for (const l of this.layers) l.update(dt);
  }

  dispose(): void {
    for (const l of this.layers) l.dispose();
  }
}

// ---------------------------------------------------------------------------
// Area title splash card (DOM). Non-blocking; removes itself.

let activeSplash: HTMLElement | null = null;

export function showAreaTitle(root: HTMLElement, name: string): void {
  activeSplash?.remove();
  const card = document.createElement("div");
  card.className = "area-splash";
  const title = document.createElement("div");
  title.className = "area-splash-name";
  title.textContent = name;
  const rule = document.createElement("div");
  rule.className = "area-splash-rule";
  card.append(title, rule);
  root.append(card);
  activeSplash = card;
  const remove = () => {
    if (activeSplash === card) activeSplash = null;
    card.remove();
  };
  card.addEventListener("animationend", remove);
  // Fallback (animations disabled / event lost). Anchored to the first frame
  // *after* insertion: area load + shader warm-up can stall the main thread
  // for seconds, during which the CSS animation hasn't started — a wall-clock
  // timer from now would remove the card before it ever painted.
  requestAnimationFrame(() => setTimeout(remove, 3500));
}
