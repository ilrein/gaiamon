// Creature imagery with graceful fallback chain:
//   1. procedural portrait — species with an SDF definition render their
//      actual 3D creature into the <img> (setPortraitRenderer must have been
//      called with the game's renderer first)
//   2. generated art in public/sprites/creatures/<speciesId>.webp
//   3. a cute procedural blob placeholder so the game never breaks
//
// The 2D art remains for species not yet converted to SDF, and in-game as
// the Ledger's "Archivist illustrations".

import * as THREE from "three";
import { protoPortraitUrl } from "./world/proto-portrait";

let portraitRenderer: THREE.WebGLRenderer | null = null;

/** Give the portrait pipeline the game's renderer (call once at boot). */
export function setPortraitRenderer(renderer: THREE.WebGLRenderer): void {
  portraitRenderer = renderer;
}

export function spritePath(speciesId: string): string {
  // Trimmed + WebP-encoded by scripts/optimize-sprites.mjs.
  return `/sprites/creatures/${speciesId}.webp`;
}

/** Deterministic pastel from a string. */
function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function placeholderCanvas(speciesId: string, px = 24): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  const hue = hashHue(speciesId);
  const body = `hsl(${hue}, 55%, 72%)`;
  const dark = `hsl(${hue}, 45%, 55%)`;
  // round blob body
  ctx.fillStyle = body;
  ctx.fillRect(6, 8, 12, 12);
  ctx.fillRect(5, 10, 14, 8);
  ctx.fillRect(7, 7, 10, 1);
  // ears
  ctx.fillStyle = dark;
  ctx.fillRect(7, 4, 3, 4);
  ctx.fillRect(14, 4, 3, 4);
  // eyes
  ctx.fillStyle = "#3a2f2a";
  ctx.fillRect(9, 12, 2, 3);
  ctx.fillRect(14, 12, 2, 3);
  ctx.fillStyle = "#fff";
  ctx.fillRect(9, 12, 1, 1);
  ctx.fillRect(14, 12, 1, 1);
  // blush + mouth
  ctx.fillStyle = "#f4a9a0";
  ctx.fillRect(7, 15, 2, 1);
  ctx.fillRect(16, 15, 2, 1);
  ctx.fillStyle = "#3a2f2a";
  ctx.fillRect(12, 16, 1, 1);
  return canvas;
}

export function placeholderDataUrl(speciesId: string): string {
  return placeholderCanvas(speciesId, 24).toDataURL();
}

const textureCache = new Map<string, THREE.Texture>();

/** Load a creature texture; resolves immediately with a placeholder that is
 *  swapped in-place when/if the real PNG loads. */
export function creatureTexture(speciesId: string): THREE.Texture {
  const cached = textureCache.get(speciesId);
  if (cached) return cached;

  const tex = new THREE.CanvasTexture(placeholderCanvas(speciesId));
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(speciesId, tex);

  const img = new Image();
  img.onload = () => {
    tex.image = img;
    tex.magFilter = THREE.LinearFilter; // generated art is high-res
    tex.needsUpdate = true;
  };
  img.src = spritePath(speciesId);
  return tex;
}

/** DOM <img>: procedural portrait when the species has an SDF definition,
 *  else generated art, else the placeholder blob. */
export function creatureImg(
  speciesId: string,
  className = "",
  opts: { shiny?: boolean } = {},
): HTMLImageElement {
  const img = document.createElement("img");
  if (className) img.className = className;
  if (portraitRenderer) {
    const portrait = protoPortraitUrl(portraitRenderer, speciesId, opts.shiny === true);
    if (portrait) {
      img.src = portrait;
      return img;
    }
  }
  img.src = spritePath(speciesId);
  img.onerror = () => {
    img.onerror = null;
    img.src = placeholderDataUrl(speciesId);
  };
  return img;
}
