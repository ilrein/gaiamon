// Bake a procedural SDF species to a mesh, entirely species-agnostic:
//   1. evaluate the species' GLSL speciesMap on the GPU into a slice atlas
//      (distance in R, material id in G) — zero porting of species code
//   2. run marching cubes over the grid (three's addon: blob convention,
//      so we feed -distance with isolation 0)
//   3. emit a BufferGeometry in creature-local space (feet at y=0) with
//      per-vertex material ids for the runtime paint shader
// The result is cached as raw arrays per species (battle unmount disposes
// GPU geometry, so each consumer builds its own BufferGeometry from the
// cached arrays — see buildProtoCreature in proto-mesh.ts).

import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { PROTO } from "../../data/proto";
import {
  PROTO_UNIFORMS_GLSL,
  PROTO_TOOLKIT_GLSL,
  PROTO_ACTIONS_GLSL,
} from "./proto-shaders";

/** Grid resolution per axis. 96 keeps bake ~100-250ms and silhouettes smooth. */
const RES = 96;
/** Bake volume: local-space cube that must contain every species' rest pose. */
const CENTER = new THREE.Vector3(0, 0.72, 0);
const HALF = 0.95;

export interface BakedSpecies {
  positions: Float32Array; // local space, non-indexed triangles
  normals: Float32Array;
  mats: Float32Array; // one material id per vertex
  minY: number;
  height: number; // rest-pose height in local units
}

const cache = new Map<string, BakedSpecies>();

/** True if the species has a procedural SDF definition. */
export function hasProto(speciesId: string): boolean {
  return speciesId in PROTO;
}

/** Bake any not-yet-cached proto species now. Call this while a transition
 *  covers the screen (battle intro swirl): the bake is a synchronous GPU
 *  readback + marching cubes (~100-250ms per species, once per session). */
export function prewarmProto(renderer: THREE.WebGLRenderer, speciesIds: string[]): void {
  for (const id of new Set(speciesIds)) {
    if (hasProto(id)) bakeSpecies(renderer, id);
  }
}

export function bakeSpecies(
  renderer: THREE.WebGLRenderer,
  speciesId: string,
): BakedSpecies | null {
  const cached = cache.get(speciesId);
  if (cached) return cached;
  const species = PROTO[speciesId];
  if (!species) return null;

  // --- 1. GPU: render the distance/material grid as a slice atlas ---
  const cols = Math.ceil(Math.sqrt(RES));
  const rows = Math.ceil(RES / cols);
  const W = cols * RES;
  const H = rows * RES;

  const frag =
    /* glsl */ `
precision highp float;
` +
    PROTO_UNIFORMS_GLSL +
    PROTO_TOOLKIT_GLSL +
    PROTO_ACTIONS_GLSL +
    species.glsl +
    /* glsl */ `
void main() {
  vec2 pc = floor(gl_FragCoord.xy);
  float tile = floor(pc.y / ${RES}.0) * ${cols}.0 + floor(pc.x / ${RES}.0);
  vec2 xy = mod(pc, ${RES}.0);
  // match MarchingCubes' grid mapping: index i -> (i - half) / half
  const float HALFRES = ${RES / 2}.0;
  vec3 g = vec3(
    (xy.x - HALFRES) / HALFRES,
    (xy.y - HALFRES) / HALFRES,
    (tile - HALFRES) / HALFRES);
  vec3 p = vec3(${CENTER.x}, ${CENTER.y}, ${CENTER.z}) + g * ${HALF};
  vec2 r = tile < ${RES}.0 ? speciesMap(p) : vec2(1.0, 0.0);
  gl_FragColor = vec4(r.x, r.y, 0.0, 1.0);
}
`;

  const rt = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
  });
  const scene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 }, // rest pose: all idle sines are 0-phase
      uAction: { value: 0 },
      uActionT: { value: 0 },
      uSeed: { value: 0 },
    },
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, quadCam);
  const buf = new Float32Array(W * H * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  renderer.setRenderTarget(prevTarget);
  rt.dispose();
  material.dispose();

  const atlasIndex = (x: number, y: number, z: number) => {
    const px = (z % cols) * RES + x;
    const py = Math.floor(z / cols) * RES + y;
    return (py * W + px) * 4;
  };

  // --- 2. marching cubes over -distance ---
  const mc = new MarchingCubes(RES, new THREE.MeshBasicMaterial(), false, false, 300000);
  mc.isolation = 0;
  const field = mc.field as Float32Array;
  for (let z = 0; z < RES; z++) {
    for (let y = 0; y < RES; y++) {
      for (let x = 0; x < RES; x++) {
        field[x + y * RES + z * RES * RES] = -buf[atlasIndex(x, y, z)];
      }
    }
  }
  mc.update();
  const count = mc.count as number; // vertex count

  // --- 3. extract to local space + per-vertex material ids ---
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const mats = new Float32Array(count);
  const posArr = mc.positionArray as Float32Array;
  const nrmArr = mc.normalArray as Float32Array;
  const HALFRES = RES / 2;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const gx = posArr[i * 3];
    const gy = posArr[i * 3 + 1];
    const gz = posArr[i * 3 + 2];
    const lx = CENTER.x + gx * HALF;
    const ly = CENTER.y + gy * HALF;
    const lz = CENTER.z + gz * HALF;
    positions[i * 3] = lx;
    positions[i * 3 + 1] = ly;
    positions[i * 3 + 2] = lz;
    if (ly < minY) minY = ly;
    if (ly > maxY) maxY = ly;
    const nx = nrmArr[i * 3];
    const ny = nrmArr[i * 3 + 1];
    const nz = nrmArr[i * 3 + 2];
    const nl = Math.hypot(nx, ny, nz) || 1;
    normals[i * 3] = nx / nl;
    normals[i * 3 + 1] = ny / nl;
    normals[i * 3 + 2] = nz / nl;
    // material: nearest grid cell (speciesMap defines mat everywhere)
    const cx = Math.max(0, Math.min(RES - 1, Math.round(gx * HALFRES + HALFRES)));
    const cy = Math.max(0, Math.min(RES - 1, Math.round(gy * HALFRES + HALFRES)));
    const cz = Math.max(0, Math.min(RES - 1, Math.round(gz * HALFRES + HALFRES)));
    mats[i] = buf[atlasIndex(cx, cy, cz) + 1];
  }
  // MarchingCubes allocates big scratch buffers — release them.
  mc.geometry.dispose();
  (mc.material as THREE.Material).dispose();

  const baked: BakedSpecies = {
    positions,
    normals,
    mats,
    minY,
    height: maxY - minY,
  };
  cache.set(speciesId, baked);
  return baked;
}
