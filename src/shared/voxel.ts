// Voxel creature model format. Models are hand-/agent-authored data: a small
// palette plus axis-aligned parts on a voxel grid, mirrored across x where
// asked. Discrete, diffable, reviewable — creature PRs are data PRs.
//
// Grid conventions: y-up, y=0 is the ground plane, x=0 is the symmetry plane
// (a part at x [1..4] with mirror:"x" also fills [-4..-1]). Units are voxels;
// the renderer normalizes to a requested world height.

export interface VoxelPart {
  /** Human-readable ("body", "left-ear" ...) — for review, not rendering. */
  name: string;
  /** box = filled cuboid; round = ellipsoid carved from the cuboid bounds;
   *  dome = upper-half ellipsoid (flat bottom). */
  shape: "box" | "round" | "dome";
  /** Inclusive voxel bounds. */
  from: [number, number, number];
  to: [number, number, number];
  /** Palette index. */
  color: number;
  /** Mirror across the x=0 plane (fills the negated-x twin). */
  mirror?: boolean;
}

export interface VoxelModel {
  /** Hex colors ("#8fce6a"), ≤ 10. Index 0 conventionally the main body. */
  palette: string[];
  parts: VoxelPart[];
  /** Single detail voxels (eyes, nostrils, patterns): [x, y, z, colorIndex].
   *  NOT mirrored — place both eyes explicitly. */
  voxels?: [number, number, number, number][];
  /** Carved-out boxes (mouth openings, gaps): inclusive bounds, applied last. */
  carve?: { from: [number, number, number]; to: [number, number, number] }[];
}

/** Rasterize a model into a voxel occupancy map: "x,y,z" -> palette index. */
export function rasterize(model: VoxelModel): Map<string, number> {
  const grid = new Map<string, number>();

  const fill = (part: VoxelPart, sx: number) => {
    const [x0, y0, z0] = part.from;
    const [x1, y1, z1] = part.to;
    const lo = [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)];
    const hi = [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)];
    const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    const r = [(hi[0] - lo[0]) / 2 + 0.5, (hi[1] - lo[1]) / 2 + 0.5, (hi[2] - lo[2]) / 2 + 0.5];
    for (let x = lo[0]; x <= hi[0]; x++) {
      for (let y = lo[1]; y <= hi[1]; y++) {
        for (let z = lo[2]; z <= hi[2]; z++) {
          if (part.shape !== "box") {
            const dx = (x - c[0]) / r[0];
            const dy = (y - c[1]) / r[1];
            const dz = (z - c[2]) / r[2];
            if (part.shape === "round" && dx * dx + dy * dy + dz * dz > 1) continue;
            if (part.shape === "dome") {
              const dyd = Math.max(0, (y - lo[1]) / Math.max(1, hi[1] - lo[1]));
              if (dx * dx + dyd * dyd + dz * dz > 1) continue;
            }
          }
          grid.set(`${x * sx},${y},${z}`, part.color);
        }
      }
    }
  };

  for (const part of model.parts) {
    fill(part, 1);
    if (part.mirror) fill(part, -1);
  }
  for (const [x, y, z, c] of model.voxels ?? []) {
    grid.set(`${x},${y},${z}`, c);
  }
  for (const box of model.carve ?? []) {
    for (let x = Math.min(box.from[0], box.to[0]); x <= Math.max(box.from[0], box.to[0]); x++) {
      for (let y = Math.min(box.from[1], box.to[1]); y <= Math.max(box.from[1], box.to[1]); y++) {
        for (let z = Math.min(box.from[2], box.to[2]); z <= Math.max(box.from[2], box.to[2]); z++) {
          grid.delete(`${x},${y},${z}`);
        }
      }
    }
  }
  return grid;
}

/** Height in voxels (max y + 1), for world-size normalization. */
export function voxelHeight(grid: Map<string, number>): number {
  let maxY = 0;
  for (const key of grid.keys()) {
    const y = Number(key.split(",")[1]);
    if (y > maxY) maxY = y;
  }
  return maxY + 1;
}
