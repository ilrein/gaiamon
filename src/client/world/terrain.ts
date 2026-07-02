// Terrain builder: turns an AreaDef tile grid into a lit diorama floor.
//
//   - one ground plane per area, painted per-tile onto a canvas texture
//   - '#' blocked tiles -> a single InstancedMesh of biome-tinted boxes
//   - 'g' grass tiles   -> one merged geometry of crossed alpha blades that sway
//   - 'w' water tiles   -> one merged plane that ripples
//
// Tiles map 1:1 to world units and tiles[z][x] -> world (x, 0, z), matching
// shared/area.ts isWalkable(). Sway/ripple are driven by a shared uTime uniform
// so update(t) is a single scalar write — no per-frame allocation.

import * as THREE from "three";
import type { AreaDef } from "../../shared/area";

export interface Terrain {
  group: THREE.Group;
  /** Advance grass sway + water ripple. `t` is elapsed seconds. */
  update(t: number): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Small hex color helpers (avoid pulling THREE.Color into hot canvas loops).
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toCss(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toCss(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
function darken(hex: string, f: number): string {
  const [r, g, b] = parseHex(hex);
  return toCss(r * (1 - f), g * (1 - f), b * (1 - f));
}

// ---------------------------------------------------------------------------
function paintGround(area: AreaDef): THREE.CanvasTexture {
  const rows = area.tiles.length;
  const cols = area.tiles[0]?.length ?? 0;
  const px = 24;
  const canvas = document.createElement("canvas");
  canvas.width = cols * px;
  canvas.height = rows * px;
  const ctx = canvas.getContext("2d")!;

  const { ground1, ground2, accent } = area.palette;
  const path = mix(accent, "#c8a878", 0.55);
  const pathEdge = darken(path, 0.1);
  const grass = darken(ground2, 0.12);
  const water = "#5bb4e6";
  const flower = ["#f7d0e0", "#ffe9a8", "#e8b6f0", "#fff4d6"];

  for (let z = 0; z < rows; z++) {
    const row = area.tiles[z];
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      const checker = (x + z) % 2 === 0 ? ground1 : ground2;
      let base: string;
      switch (ch) {
        case "p":
          base = (x + z) % 2 === 0 ? path : pathEdge;
          break;
        case "g":
          base = grass;
          break;
        case "w":
          base = water;
          break;
        default:
          base = checker; // '.', 'f', '#' all sit on ground
      }
      ctx.fillStyle = base;
      ctx.fillRect(x * px, z * px, px, px);

      if (ch === "f") {
        // Scatter a few deterministic flower dots.
        const seed = (x * 73 + z * 131) >>> 0;
        const dots = 2 + (seed % 3);
        for (let i = 0; i < dots; i++) {
          const s = (seed >> (i * 3)) & 0xff;
          const fx = x * px + 4 + (s % (px - 8));
          const fy = z * px + 4 + (((s * 7) >> 1) % (px - 8));
          ctx.fillStyle = flower[(s + i) % flower.length];
          ctx.beginPath();
          ctx.arc(fx, fy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
function grassBladeTexture(area: AreaDef): THREE.CanvasTexture {
  const s = 32;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);

  const base = darken(area.palette.ground2, 0.05);
  const tip = mix(area.palette.ground2, "#eaf7c8", 0.5);
  // A little clump of tapered blades, base at bottom of the canvas.
  const blades = [
    { x: 10, sway: -3 },
    { x: 16, sway: 0 },
    { x: 22, sway: 3 },
  ];
  for (const b of blades) {
    const grad = ctx.createLinearGradient(0, s, 0, 4);
    grad.addColorStop(0, base);
    grad.addColorStop(1, tip);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(b.x - 3, s);
    ctx.quadraticCurveTo(b.x + b.sway, s / 2, b.x + b.sway * 1.6, 5);
    ctx.quadraticCurveTo(b.x + b.sway, s / 2, b.x + 3, s);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Inject a position-driven sway into a Lambert material's vertex shader. */
function makeSway(mat: THREE.Material, uTime: { value: number }, xAmp: number, zAmp: number): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader =
      "uniform float uTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float swayPh = position.x * 0.6 + position.z * 0.8;
         float swayH = max(position.y, 0.0);
         transformed.x += sin(uTime * 1.8 + swayPh) * swayH * ${xAmp.toFixed(3)};
         transformed.z += cos(uTime * 1.5 + swayPh) * swayH * ${zAmp.toFixed(3)};`,
      );
  };
}

// ---------------------------------------------------------------------------
export function buildTerrain(area: AreaDef): Terrain {
  const rows = area.tiles.length;
  const cols = area.tiles[0]?.length ?? 0;
  const group = new THREE.Group();
  const uTime = { value: 0 };
  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(x: T): T => (disposables.push(x), x);

  // -- Ground plane ---------------------------------------------------------
  const groundTex = track(paintGround(area));
  const groundGeo = track(new THREE.PlaneGeometry(cols, rows));
  const groundMat = track(new THREE.MeshLambertMaterial({ map: groundTex }));
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((cols - 1) / 2, 0, (rows - 1) / 2);
  ground.receiveShadow = true;
  group.add(ground);

  // -- Collect tile kinds ---------------------------------------------------
  const blockers: Array<[number, number]> = [];
  const grassTiles: Array<[number, number]> = [];
  const waterTiles: Array<[number, number]> = [];
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const ch = area.tiles[z][x];
      if (ch === "#") blockers.push([x, z]);
      else if (ch === "g") grassTiles.push([x, z]);
      else if (ch === "w") waterTiles.push([x, z]);
    }
  }

  // -- Blockers as one InstancedMesh ---------------------------------------
  if (blockers.length) {
    const geo = track(new THREE.BoxGeometry(0.98, 1.5, 0.98));
    const mat = track(new THREE.MeshLambertMaterial({ flatShading: true }));
    const inst = new THREE.InstancedMesh(geo, mat, blockers.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const m = new THREE.Matrix4();
    const biome = new THREE.Color(darken(area.palette.ground2, 0.28));
    const c = new THREE.Color();
    blockers.forEach(([x, z], i) => {
      const seed = (x * 53 + z * 97) >>> 0;
      const h = 1.3 + (seed % 5) * 0.12;
      m.makeTranslation(x, h / 2, z);
      inst.setMatrixAt(i, m);
      c.copy(biome).offsetHSL(0, 0, ((seed % 7) - 3) * 0.012);
      inst.setColorAt(i, c);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
    // geometry/material are disposed via track(); the InstancedMesh itself has
    // no extra GPU resources beyond those.
    disposables.push({ dispose: () => inst.dispose() });
  }

  // -- Grass tufts as one merged, swaying geometry -------------------------
  if (grassTiles.length) {
    const bladeH = 0.7;
    const w = 0.55;
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    // One quad = two triangles (0,1,2, 0,2,3). corners: bl, br, tr, tl.
    const pushQuad = (corners: [number, number, number][], nrm: [number, number, number]) => {
      const order = [0, 1, 2, 0, 2, 3];
      const uvOrder: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
        [1, 1],
        [0, 1],
      ];
      order.forEach((ci, k) => {
        positions.push(...corners[ci]);
        normals.push(...nrm);
        uvs.push(...uvOrder[k]);
      });
    };

    for (const [tx, tz] of grassTiles) {
      const seed = (tx * 71 + tz * 143) >>> 0;
      const tufts = 2 + (seed % 2);
      for (let t = 0; t < tufts; t++) {
        const s = (seed >> (t * 4)) & 0xff;
        const cx = tx + ((s / 255) - 0.5) * 0.6;
        const cz = tz + (((s * 5) & 0xff) / 255 - 0.5) * 0.6;
        // Quad facing +Z (spans X).
        pushQuad(
          [
            [cx - w / 2, 0, cz],
            [cx + w / 2, 0, cz],
            [cx + w / 2, bladeH, cz],
            [cx - w / 2, bladeH, cz],
          ],
          [0, 1, 0],
        );
        // Quad facing +X (spans Z), crossed.
        pushQuad(
          [
            [cx, 0, cz - w / 2],
            [cx, 0, cz + w / 2],
            [cx, bladeH, cz + w / 2],
            [cx, bladeH, cz - w / 2],
          ],
          [0, 1, 0],
        );
      }
    }

    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    const tex = track(grassBladeTexture(area));
    const mat = track(
      new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }),
    );
    makeSway(mat, uTime, 0.18, 0.08);
    const grassMesh = new THREE.Mesh(geo, mat);
    group.add(grassMesh);
  }

  // -- Water as one merged rippling plane ----------------------------------
  if (waterTiles.length) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const y = 0.05;
    for (const [tx, tz] of waterTiles) {
      const x0 = tx - 0.5;
      const x1 = tx + 0.5;
      const z0 = tz - 0.5;
      const z1 = tz + 0.5;
      // Top-facing quad (normal +Y), CCW seen from above.
      const verts: [number, number, number][] = [
        [x0, y, z1],
        [x1, y, z1],
        [x1, y, z0],
        [x0, y, z0],
      ];
      const uvv: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];
      const order = [0, 1, 2, 0, 2, 3];
      for (const ci of order) {
        positions.push(...verts[ci]);
        uvs.push(...uvv[ci]);
        normals.push(0, 1, 0);
      }
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    const mat = track(
      new THREE.MeshLambertMaterial({ color: 0x5bb4e6, transparent: true, opacity: 0.82 }),
    );
    // Gentle vertical ripple driven by uTime.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader =
        "uniform float uTime;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           transformed.y += sin(position.x * 2.2 + uTime * 2.0) * 0.04
                          + cos(position.z * 2.4 + uTime * 1.6) * 0.04;`,
        );
    };
    const water = new THREE.Mesh(geo, mat);
    water.receiveShadow = true;
    group.add(water);
  }

  return {
    group,
    update(t: number) {
      uTime.value = t;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
