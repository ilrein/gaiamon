// Procedural UI portraits: render a baked SDF creature once to a transparent
// offscreen target on the MAIN renderer (no extra GL context), read it back
// into a 2D canvas, and cache the PNG data URL per species (+shiny variant).
// Used by creatureImg() so the party HUD / Codex / starter select show the
// same procedural creature the battles render — no static art.

import * as THREE from "three";
import { buildProtoCreature } from "./proto-mesh";
import { hasProto } from "./proto-bake";

/** Render size; UI shows portraits at ~64-120px, so the downscale is free AA. */
const SIZE = 320;
/** House shiny hue — matches the battle/workshop seed. */
export const SHINY_SEED = 2.6;

const cache = new Map<string, string>();

export function hasProtoPortrait(speciesId: string): boolean {
  return hasProto(speciesId);
}

/** Data-URL portrait for a proto species, or null (no SDF / render failed).
 *  First call per species pays the bake (~100-250ms, shared with battles). */
export function protoPortraitUrl(
  renderer: THREE.WebGLRenderer,
  speciesId: string,
  shiny = false,
): string | null {
  const key = shiny ? `${speciesId}*shiny` : speciesId;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!hasProto(speciesId)) return null;

  try {
    const creature = buildProtoCreature(renderer, speciesId, 0);
    if (!creature) return null;
    if (shiny) creature.setSeed(SHINY_SEED);
    creature.update(1.7); // pleasant idle phase, eyes open

    const scene = new THREE.Scene(); // no background -> alpha 0
    scene.add(creature.group);
    const h = creature.height;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    camera.position.set(1.5, 1.12, 2.3).multiplyScalar(h / 1.3);
    camera.lookAt(0, h * 0.47, 0);

    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { depthBuffer: true });
    const prevTarget = renderer.getRenderTarget();
    const prevColor = new THREE.Color();
    renderer.getClearColor(prevColor);
    const prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    const px = new Uint8Array(SIZE * SIZE * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    rt.dispose();
    creature.dispose();

    // GL rows are bottom-up; flip into the canvas.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      imgData.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
    }
    ctx.putImageData(imgData, 0, 0);
    const url = canvas.toDataURL("image/png");
    cache.set(key, url);
    return url;
  } catch {
    return null; // context loss / float support — fall back to static art
  }
}
