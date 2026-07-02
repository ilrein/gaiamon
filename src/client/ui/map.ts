// Minimap + world map. Two data-driven views of the world:
//
//   Minimap   — a small always-on canvas HUD widget. Paints the current area's
//               tile grid once per setArea(), then per frame just moves a player
//               dot + a soft view cone. pointer-events:none, so it never steals a
//               tap from the world beneath it.
//   World map — a full-screen paper-map takeover. Nodes are AREAS, routes are
//               exits; the layout is a BFS-layered graph walked from the start
//               area. Current area pulses; unvisited areas show as "???".
//
// Nothing here hardcodes area ids for content — the grid, palette, exits, npcs
// and triggers all come from the AreaDef data.

import type { Game } from "../game";
import type { AreaDef } from "../../shared/area";
import type { PlayerState } from "../../shared/model";
import { AREAS, START_AREA } from "../../data";
import { el } from "../dom";
import "./map.css";

// ---------------------------------------------------------------------------
// color helpers (tiny hex math so the minimap can tint from the area palette)

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbStr([r, g, b]: [number, number, number]): string {
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}
function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbStr([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
}

const CELL = 6; // base-canvas pixels per tile (resolution of the pre-painted map)

/** Per-tile fill for the minimap, derived from the biome palette. */
function tileColors(area: AreaDef): Record<string, string> {
  const { ground1, ground2, accent } = area.palette;
  return {
    ".": ground1,
    "f": ground2,
    "p": mix(accent, ground1, 0.35), // path: accent, softened toward the ground
    "g": mix(mix(ground2, "#3f8f4f", 0.5), "#000000", 0.15), // tall grass: darker green
    "w": "#5b93d6", // water
    "#": mix(ground2, "#17151d", 0.62), // blocked
  };
}

// ---------------------------------------------------------------------------
// Minimap

export class Minimap {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement; // pre-painted tile grid (offscreen)
  private readonly ro: ResizeObserver;

  private area: AreaDef | null = null;
  private cols = 0;
  private rows = 0;

  // fit transform from base-canvas space -> visible-canvas backing pixels
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  private px = 0;
  private pz = 0;
  private heading = Math.PI / 2; // facing "down" (+z) to start

  constructor() {
    this.canvas = document.createElement("canvas");
    this.base = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.root = el("div", { className: "gm-minimap" }, [this.canvas]);

    this.ro = new ResizeObserver(() => {
      this.resizeCanvas();
      this.draw();
    });
    this.ro.observe(this.root);
  }

  /** Paint the tile grid once. Cheap per-frame work happens in update(). */
  setArea(area: AreaDef): void {
    this.area = area;
    this.rows = area.tiles.length;
    this.cols = area.tiles[0]?.length ?? 0;

    this.base.width = Math.max(1, this.cols * CELL);
    this.base.height = Math.max(1, this.rows * CELL);
    const bctx = this.base.getContext("2d")!;
    bctx.clearRect(0, 0, this.base.width, this.base.height);

    const colors = tileColors(area);
    for (let z = 0; z < this.rows; z++) {
      const row = area.tiles[z];
      for (let x = 0; x < this.cols; x++) {
        bctx.fillStyle = colors[row[x]] ?? colors["."];
        bctx.fillRect(x * CELL, z * CELL, CELL, CELL);
      }
    }

    // Exit arrow nubs, painted into the static base layer.
    bctx.fillStyle = "rgba(255, 214, 107, 0.95)";
    for (const exit of area.exits) {
      this.drawExitNub(bctx, exit.x, exit.z);
    }

    this.resizeCanvas();
    this.draw();
  }

  update(px: number, pz: number): void {
    const dx = px - this.px;
    const dz = pz - this.pz;
    if (Math.hypot(dx, dz) > 0.01) this.heading = Math.atan2(dz, dx);
    this.px = px;
    this.pz = pz;
    this.draw();
  }

  dispose(): void {
    this.ro.disconnect();
    this.root.remove();
  }

  // -- internals ----------------------------------------------------------
  private resizeCanvas(): void {
    const w = this.root.clientWidth - 8; // account for the 4px padding
    const h = this.root.clientHeight - 8;
    if (w <= 0 || h <= 0) return;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const bw = this.base.width;
    const bh = this.base.height;
    this.scale = Math.min(this.canvas.width / bw, this.canvas.height / bh);
    this.ox = (this.canvas.width - bw * this.scale) / 2;
    this.oy = (this.canvas.height - bh * this.scale) / 2;
  }

  private drawExitNub(ctx: CanvasRenderingContext2D, ex: number, ez: number): void {
    const cx = (ex + 0.5) * CELL;
    const cy = (ez + 0.5) * CELL;
    const s = CELL * 1.4;
    // point the arrow toward whichever edge the exit hugs
    let dirX = 0;
    let dirY = 0;
    if (ex <= 0) dirX = -1;
    else if (ex >= this.cols - 1) dirX = 1;
    else if (ez <= 0) dirY = -1;
    else dirY = 1;
    ctx.beginPath();
    if (dirX !== 0) {
      ctx.moveTo(cx + dirX * s, cy);
      ctx.lineTo(cx, cy - s * 0.7);
      ctx.lineTo(cx, cy + s * 0.7);
    } else {
      ctx.moveTo(cx, cy + dirY * s);
      ctx.lineTo(cx - s * 0.7, cy);
      ctx.lineTo(cx + s * 0.7, cy);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** base-space (x,y in base pixels) -> visible backing pixels */
  private vx(bx: number): number {
    return this.ox + bx * this.scale;
  }
  private vy(by: number): number {
    return this.oy + by * this.scale;
  }

  private draw(): void {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw === 0 || ch === 0 || !this.area) return;

    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, this.ox, this.oy, this.base.width * this.scale, this.base.height * this.scale);

    const bx = (this.px + 0.5) * CELL;
    const by = (this.pz + 0.5) * CELL;
    const cx = this.vx(bx);
    const cy = this.vy(by);

    // soft view cone in the facing direction
    const reach = 5 * CELL * this.scale;
    const half = 0.5; // radians, ~29deg to each side
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, reach, this.heading - half, this.heading + half);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 214, 107, 0.28)";
    ctx.fill();

    // player dot
    const r = Math.max(2.5, CELL * this.scale * 0.6);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.strokeStyle = "#3a2f2a";
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// visited tracking (no flag system exists for this — we roll our own on flags)

function visitedFlag(areaId: string): string {
  return `visited-${areaId}`;
}

export function markVisited(player: PlayerState, areaId: string): void {
  const flag = visitedFlag(areaId);
  if (!player.flags.includes(flag)) player.flags.push(flag);
}

// ---------------------------------------------------------------------------
// World map

interface Node {
  id: string;
  area: AreaDef;
  x: number; // grid column (depth)
  y: number; // grid row (branch), centered per depth
}

// Hand-nudges layered onto the BFS layout for a prettier route sheet.
const OFFSETS: Record<string, { dx?: number; dy?: number }> = {
  "rimeveil-summit": { dy: -0.35 },
  "murmurwood": { dy: -0.5 },
  "obsidian-crown": { dy: 0.3 },
  "kilnhollow": { dy: 0.15 },
  "ashfern-downs": { dy: 0.1 },
};

const COL_GAP = 200;
const ROW_GAP = 108;
const PAD = 90;

/** Undirected adjacency built from every area's exit list. */
function buildAdjacency(): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    let s = adj.get(id);
    if (!s) adj.set(id, (s = new Set()));
    return s;
  };
  for (const area of Object.values(AREAS)) {
    ensure(area.id);
    for (const exit of area.exits) {
      if (!AREAS[exit.toArea]) continue;
      ensure(area.id).add(exit.toArea);
      ensure(exit.toArea).add(area.id);
    }
  }
  return adj;
}

/** BFS from START_AREA: x = depth, y = branch index centered per depth. */
function layoutNodes(adj: Map<string, Set<string>>): Node[] {
  const depth = new Map<string, number>();
  const order: string[] = [];
  const start = AREAS[START_AREA] ? START_AREA : Object.keys(AREAS)[0];
  depth.set(start, 0);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    const d = depth.get(id)!;
    for (const next of adj.get(id) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  // any islands the walk missed get parked in a trailing column
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const id of Object.keys(AREAS)) {
    if (!depth.has(id)) {
      depth.set(id, maxDepth + 1);
      order.push(id);
    }
  }

  // group by depth to center each column
  const byDepth = new Map<number, string[]>();
  for (const id of order) {
    const d = depth.get(id)!;
    (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(id);
  }

  const nodes: Node[] = [];
  for (const [d, ids] of byDepth) {
    ids.forEach((id, i) => {
      const off = OFFSETS[id] ?? {};
      nodes.push({
        id,
        area: AREAS[id],
        x: d + (off.dx ?? 0),
        y: i - (ids.length - 1) / 2 + (off.dy ?? 0),
      });
    });
  }
  return nodes;
}

/** ⚔ for keeper/battle areas, ◈ for trial/titan areas. */
function areaIcons(area: AreaDef): string {
  let icons = "";
  if (area.triggers.some((t) => t.kind === "trial" || t.kind === "titan")) icons += "◈";
  if (area.npcs.some((n) => n.battle)) icons += "⚔";
  return icons;
}

export function openWorldMap(game: Game): Promise<void> {
  return new Promise((resolve) => {
    // Current area is, by definition, visited — keep the sheet honest even if
    // the integration hook hasn't marked it yet.
    markVisited(game.player, game.player.areaId);

    const adj = buildAdjacency();
    const nodes = layoutNodes(adj);
    const byId = new Map(nodes.map((n) => [n.id, n]));

    // pixel bounds so the world div can be sized + panned
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const toPx = (n: Node) => ({ x: (n.x - minX) * COL_GAP + PAD, y: (n.y - minY) * ROW_GAP + PAD });
    const worldW = (maxX - minX) * COL_GAP + PAD * 2;
    const worldH = (maxY - minY) * ROW_GAP + PAD * 2;

    // -- DOM ----------------------------------------------------------------
    const backdrop = el("div", {
      className: "gm-worldmap-backdrop",
      onClick: () => close(),
    });
    const closeBtn = el("button", { className: "gm-worldmap-close", text: "✕", onClick: () => close() });
    const head = el("div", { className: "gm-worldmap-head" }, [
      el("div", { className: "gm-worldmap-title", text: "World Map" }),
      closeBtn,
    ]);

    const world = el("div", { className: "gm-worldmap-world" });
    world.style.width = `${worldW}px`;
    world.style.height = `${worldH}px`;

    // dotted routes (dedupe bidirectional edges)
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("class", "gm-worldmap-edges");
    svg.setAttribute("width", `${worldW}`);
    svg.setAttribute("height", `${worldH}`);
    const seen = new Set<string>();
    for (const n of nodes) {
      for (const m of adj.get(n.id) ?? []) {
        const key = [n.id, m].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        const b = byId.get(m);
        if (!b) continue;
        const pa = toPx(n);
        const pb = toPx(b);
        const line = document.createElementNS(svgNs, "line");
        line.setAttribute("x1", `${pa.x}`);
        line.setAttribute("y1", `${pa.y}`);
        line.setAttribute("x2", `${pb.x}`);
        line.setAttribute("y2", `${pb.y}`);
        line.setAttribute("stroke", "rgba(107, 79, 42, 0.55)");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-dasharray", "2 9");
        svg.appendChild(line);
      }
    }
    world.appendChild(svg);

    // area chips
    for (const n of nodes) {
      const p = toPx(n);
      const visited = game.player.flags.includes(visitedFlag(n.id));
      const isCurrent = n.id === game.player.areaId;
      const chip = el("div", { className: "gm-node" });
      if (isCurrent) chip.classList.add("current");
      else if (!visited) chip.classList.add("unvisited");
      chip.style.left = `${p.x}px`;
      chip.style.top = `${p.y}px`;

      const swatch = el("div", { className: "gm-swatch" });
      swatch.style.background = n.area.palette.accent;
      chip.append(swatch, el("span", { className: "gm-name", text: visited ? n.area.name : "???" }));

      if (visited) {
        const icons = areaIcons(n.area);
        if (icons) chip.append(el("span", { className: "gm-icons", text: icons }));
      }
      if (isCurrent) chip.append(el("div", { className: "gm-walker", text: "🚶" }));
      world.appendChild(chip);
    }

    const viewport = el("div", { className: "gm-worldmap-viewport" }, [world]);
    const panel = el("div", { className: "gm-worldmap-panel" }, [head, viewport]);
    panel.append(el("div", { className: "gm-worldmap-hint", text: "drag to pan" }));
    const rootWrap = el("div", { className: "gm-worldmap" }, [backdrop, panel]);
    game.uiRoot.append(rootWrap);

    // -- pan (pointer drag + wheel), centered on the current area -----------
    let panX = 0;
    let panY = 0;
    const apply = () => {
      world.style.transform = `translate(${panX}px, ${panY}px)`;
    };
    const centerOn = () => {
      const cur = byId.get(game.player.areaId);
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      if (cur) {
        const p = toPx(cur);
        panX = vw / 2 - p.x;
        panY = vh / 2 - p.y;
      } else {
        panX = (vw - worldW) / 2;
        panY = (vh - worldH) / 2;
      }
      apply();
    };
    requestAnimationFrame(centerOn);

    let dragging = false;
    let startX = 0;
    let startY = 0;
    viewport.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.classList.add("grabbing");
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      apply();
    });
    const endDrag = (e: PointerEvent) => {
      dragging = false;
      viewport.classList.remove("grabbing");
      if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        panX -= e.deltaX;
        panY -= e.deltaY;
        apply();
      },
      { passive: false },
    );

    function close(): void {
      rootWrap.remove();
      resolve();
    }
  });
}
