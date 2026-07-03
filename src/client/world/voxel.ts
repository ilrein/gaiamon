// Voxel mesh builder: rasterizes a VoxelModel and emits a single BufferGeometry
// with exterior faces only, per-face shading baked into vertex colors (top
// bright, sides medium, bottom dark) — the classic cute voxel look, cheap to
// render (one draw call per creature).

import * as THREE from "three";
import { rasterize, voxelHeight, type VoxelModel } from "../../shared/voxel";

const FACES: {
  dir: [number, number, number];
  corners: [number, number, number][];
  shade: number;
}[] = [
  { dir: [0, 1, 0], shade: 1.0, corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { dir: [0, -1, 0], shade: 0.55, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], shade: 0.82, corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { dir: [-1, 0, 0], shade: 0.82, corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { dir: [0, 0, 1], shade: 0.92, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dir: [0, 0, -1], shade: 0.7, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

export interface VoxelMeshResult {
  mesh: THREE.Mesh;
  /** Model height in world units after scaling. */
  height: number;
  dispose: () => void;
}

/** Build a mesh scaled so the model stands `targetHeight` world units tall,
 *  feet at y=0, centered on x/z. */
export function buildVoxelMesh(model: VoxelModel, targetHeight: number): VoxelMeshResult {
  const grid = rasterize(model);
  const palette = model.palette.map((hex) => new THREE.Color(hex));

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (const [key, colorIndex] of grid) {
    const [x, y, z] = key.split(",").map(Number);
    const color = palette[colorIndex] ?? palette[0] ?? new THREE.Color("#cccccc");
    for (const face of FACES) {
      const nKey = `${x + face.dir[0]},${y + face.dir[1]},${z + face.dir[2]}`;
      if (grid.has(nKey)) continue; // interior face — cull
      const base = positions.length / 3;
      for (const corner of face.corners) {
        positions.push(x + corner[0], y + corner[1], z + corner[2]);
        normals.push(...face.dir);
        colors.push(color.r * face.shade, color.g * face.shade, color.b * face.shade);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  // Center on x/z, feet at y=0, scale to target height.
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  geometry.translate(-cx, -bb.min.y, -cz);
  const scale = targetHeight / Math.max(1, voxelHeight(grid));
  geometry.scale(scale, scale, scale);

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;

  return {
    mesh,
    height: targetHeight,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
