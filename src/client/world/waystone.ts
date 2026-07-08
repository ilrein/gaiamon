// Hearthglow's waystone: the village-heart centerpiece. A mossy, tilted
// standing stone (hex-prism, flat shaded) on a stone plinth, wrapped by a
// procedurally-drawn band of glowing runes that pulses a soft aurora teal,
// with a slow ring of spark motes orbiting it.
//
// Pure decoration: built once at loadArea (hearthglow only), ticked by the
// overworld update, disposed with the area. Zero per-frame allocation — the
// pulse writes scalars and the sparks rewrite one small typed array. Under
// prefers-reduced-motion the runes hold a steady mid-glow and the sparks
// stand still (static ring), matching the house rule for pure-cosmetic motion.

import * as THREE from "three";

/** Plaza-east spot: a '.' tile ~3 tiles from spawn, adjacent to the path but
 *  not on it (tile row 10/11, col 18 in the hearthglow grid). */
export const WAYSTONE_POS = { x: 18, z: 10.5 };
/** Solid footprint — the overworld's canStand treats this circle as blocked
 *  (tile collision alone would let players clip through the monument). */
export const WAYSTONE_RADIUS = 0.9;

const RUNE_TEAL = "#7fe6c3";
const SPARK_COUNT = 8;

// Stone silhouette (local units; group origin sits on the ground).
const PLINTH_H = 0.3;
const STONE_H = 2.1;
const STONE_R_TOP = 0.28;
const STONE_R_BOT = 0.46;

/** Hex-prism radius of the standing stone at local height y. */
function stoneRadiusAt(y: number): number {
  const t = (y - PLINTH_H) / STONE_H;
  return STONE_R_BOT + (STONE_R_TOP - STONE_R_BOT) * t;
}

// ---------------------------------------------------------------------------
// Generated textures (per-instance; only one waystone ever exists at a time).

/** Deterministic tiny PRNG so the runes are stable frame-to-frame and run-to-run. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** A strip of angular glyphs on black — additive-blended, so black adds nothing. */
function runeTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 96;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const glyphs = 10;
  const cell = w / glyphs;
  // Two passes: a soft teal halo pass, then a bright near-white core, so the
  // runes read as carved light rather than faint scratches in daylight. Each
  // glyph is a vertical spine + 1-2 diagonal branches (futhark-ish), which
  // stays legible from the diorama camera.
  for (const pass of [0, 1] as const) {
    const r2 = lcg(0x9e3779b9); // same stream both passes → identical shapes
    ctx.strokeStyle = pass === 0 ? RUNE_TEAL : "rgba(240,255,250,0.98)";
    ctx.shadowColor = RUNE_TEAL;
    ctx.shadowBlur = pass === 0 ? 10 : 4;
    ctx.lineWidth = pass === 0 ? 9 : 5;
    for (let g = 0; g < glyphs; g++) {
      const cx = cell * g + cell / 2;
      // Staggered baselines give the band a hand-carved rhythm.
      const cy = h / 2 + (g % 2 ? -1 : 1) * h * 0.06;
      const gw = cell * 0.42;
      const gh = h * 0.3;
      // Spine.
      ctx.beginPath();
      ctx.moveTo(cx, cy - gh);
      ctx.lineTo(cx, cy + gh);
      ctx.stroke();
      // 1-2 bold diagonal branches off the spine.
      const branches = 1 + ((r2() * 2) | 0);
      for (let b = 0; b < branches; b++) {
        const by = cy + (r2() - 0.6) * gh * 1.2;
        const dir = r2() > 0.5 ? 1 : -1;
        const down = r2() > 0.5 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(cx + dir * gw, by + down * gh * 0.7);
        // Half the branches close back to the spine (angular loop).
        if (r2() > 0.5) ctx.lineTo(cx, by + down * gh * 1.3);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Soft round glow for the orbiting sparks (bright core + halo). */
function sparkTexture(): THREE.CanvasTexture {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const c = s / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(255,255,255,0.85)");
  g.addColorStop(0.55, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------

export class Waystone {
  readonly group = new THREE.Group();

  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly runeMat: THREE.MeshBasicMaterial;
  private readonly runeBase = new THREE.Color(RUNE_TEAL);
  private readonly gemMat: THREE.MeshLambertMaterial;
  private readonly light: THREE.PointLight;
  private readonly sparkPos: Float32Array;
  private readonly sparkAttr: THREE.BufferAttribute;
  private readonly reduced: boolean;
  private t = 0;

  constructor() {
    this.reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    const track = <T extends { dispose(): void }>(x: T): T => (this.disposables.push(x), x);
    const solid = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number): THREE.Mesh => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };

    // -- Plinth + moss --------------------------------------------------------
    const stoneMat = track(new THREE.MeshLambertMaterial({ color: 0x8b929e, flatShading: true }));
    const plinthMat = track(new THREE.MeshLambertMaterial({ color: 0x767d88, flatShading: true }));
    const mossMat = track(new THREE.MeshLambertMaterial({ color: 0x5da95e, flatShading: true }));
    const mossMat2 = track(new THREE.MeshLambertMaterial({ color: 0x7cc46a, flatShading: true }));

    const plinthGeo = track(new THREE.CylinderGeometry(0.82, 0.98, PLINTH_H, 7));
    this.group.add(solid(plinthGeo, plinthMat, PLINTH_H / 2));

    // Moss blobs hugging the plinth rim (one shared geometry, scaled).
    const mossGeo = track(new THREE.IcosahedronGeometry(1, 0));
    const rand = lcg(0x51f0aa);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rand() * 0.9;
      const r = 0.68 + rand() * 0.22;
      const s = 0.13 + rand() * 0.09;
      const blob = new THREE.Mesh(mossGeo, i % 2 ? mossMat : mossMat2);
      blob.position.set(Math.cos(a) * r, PLINTH_H + s * 0.15, Math.sin(a) * r);
      blob.scale.set(s, s * 0.55, s);
      blob.rotation.y = rand() * Math.PI;
      blob.castShadow = true;
      blob.receiveShadow = true;
      this.group.add(blob);
    }

    // -- The standing stone (slightly tilted for character) -------------------
    const pillar = new THREE.Group();
    pillar.rotation.set(0.02, 0.35, 0.045);
    this.group.add(pillar);

    const stoneGeo = track(new THREE.CylinderGeometry(STONE_R_TOP, STONE_R_BOT, STONE_H, 6));
    pillar.add(solid(stoneGeo, stoneMat, PLINTH_H + STONE_H / 2));

    // Mossy skirt creeping up the stone's base.
    const skirtH = 0.42;
    const skirtGeo = track(
      new THREE.CylinderGeometry(
        stoneRadiusAt(PLINTH_H + skirtH) + 0.025,
        STONE_R_BOT + 0.05,
        skirtH,
        6,
      ),
    );
    pillar.add(solid(skirtGeo, mossMat, PLINTH_H + skirtH / 2));

    // -- Glowing rune band (additive, pulses; bloom picks it up) --------------
    const bandY0 = PLINTH_H + STONE_H * 0.52;
    const bandY1 = PLINTH_H + STONE_H * 0.82;
    const bandGeo = track(
      new THREE.CylinderGeometry(
        stoneRadiusAt(bandY1) + 0.02,
        stoneRadiusAt(bandY0) + 0.02,
        bandY1 - bandY0,
        6,
        1,
        true,
      ),
    );
    this.runeMat = track(
      new THREE.MeshBasicMaterial({
        map: track(runeTexture()),
        color: this.runeBase.clone(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    const band = new THREE.Mesh(bandGeo, this.runeMat);
    band.position.y = (bandY0 + bandY1) / 2;
    pillar.add(band);

    // Teal gem crowning the stone.
    this.gemMat = track(
      new THREE.MeshLambertMaterial({
        color: 0xbaf2df,
        emissive: new THREE.Color(RUNE_TEAL).getHex(),
        emissiveIntensity: 0.9,
        flatShading: true,
      }),
    );
    const gemGeo = track(new THREE.IcosahedronGeometry(0.13, 0));
    const gem = new THREE.Mesh(gemGeo, this.gemMat);
    gem.position.y = PLINTH_H + STONE_H + 0.1;
    pillar.add(gem);

    // Soft teal fill light — modest so bloom stays tasteful next to lanterns.
    this.light = new THREE.PointLight(new THREE.Color(RUNE_TEAL).getHex(), 2.2, 6, 1.8);
    this.light.position.set(0, PLINTH_H + STONE_H * 0.75, 0);
    this.group.add(this.light);

    // -- Orbiting spark motes (one Points, one shared texture) ----------------
    this.sparkPos = new Float32Array(SPARK_COUNT * 3);
    const sparkGeo = track(new THREE.BufferGeometry());
    this.sparkAttr = new THREE.BufferAttribute(this.sparkPos, 3);
    this.sparkAttr.setUsage(THREE.DynamicDrawUsage);
    sparkGeo.setAttribute("position", this.sparkAttr);
    const sparkMat = track(
      new THREE.PointsMaterial({
        size: 0.46,
        map: track(sparkTexture()),
        color: 0xc8ffe9,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.frustumCulled = false; // positions move; one tiny draw call
    sparks.renderOrder = 5; // after water/grass transparents (ambience rule)
    this.group.add(sparks);

    this.group.position.set(WAYSTONE_POS.x, 0, WAYSTONE_POS.z);

    // Settle into a lit pose immediately (reduced-motion keeps this frame).
    this.apply(0);
  }

  update(dt: number): void {
    if (this.reduced) return; // static mid-glow + still spark ring
    this.t += dt;
    this.apply(this.t);
  }

  private apply(t: number): void {
    // Slow aurora pulse, never fully dark. Peaks past 1 so bloom catches the
    // band at the top of the breath without searing the whole plaza.
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.05));
    this.runeMat.color.copy(this.runeBase).multiplyScalar(0.85 + 0.6 * pulse);
    this.gemMat.emissiveIntensity = 0.45 + 0.95 * pulse;
    this.light.intensity = 1.8 + 1.8 * pulse;

    const pos = this.sparkPos;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const phase = (i / SPARK_COUNT) * Math.PI * 2;
      const a = phase + t * 0.4;
      const r = 0.92 + 0.1 * Math.sin(t * 0.6 + phase * 3);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 1.45 + 0.32 * Math.sin(t * 0.8 + phase * 2);
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    this.sparkAttr.needsUpdate = true;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
