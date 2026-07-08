// Pottle — bashful terracotta clay hermit wearing an upside-down flowerpot.
// Signature: the ceramic pot hat (smooth wheel-thrown frustum with a flared
// brim and painted lip bands) with a soil plug and a two-leaf sprout that
// sways on its own while the pot stays put. Palette matches
// src/data/voxels/pottle.ts.
import type { ProtoSpecies } from "./types";

export const pottle: ProtoSpecies = {
  name: "Pottle",
  glsl: /* glsl */ `
// palette (matches the voxel palette)
const vec3 CLAY = vec3(0.831, 0.463, 0.247);     // #d4763f
const vec3 POT = vec3(0.698, 0.373, 0.192);      // #b25f31
const vec3 POT_LIP = vec3(0.878, 0.573, 0.361);  // #e0925c
const vec3 LEAF = vec3(0.373, 0.659, 0.243);     // #5fa83e
const vec3 STEM = vec3(0.247, 0.490, 0.165);     // #3f7d2a
const vec3 DARK = vec3(0.169, 0.129, 0.110);     // #2b211c
const vec3 SOIL = vec3(0.290, 0.208, 0.149);     // #4a3526

// solid truncated cone on the y axis: half-height h, r1 bottom, r2 top
float sdPotCone(vec3 p, float h, float r1, float r2) {
  vec2 q = vec2(length(p.xz), p.y);
  vec2 k1 = vec2(r2, h);
  vec2 k2 = vec2(r2 - r1, 2.0 * h);
  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
  vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}

// material ids: 0 clay body, 1 pot, 3 leaf, 4 stem, 5 soil
vec2 speciesMap(vec3 p) {
  float t = uTime;
  float breathe = sin(t * 2.0);

  // --- plump clay body peeking out from under the pot ---
  float d = sdEllipsoid(p - vec3(0.0, 0.30, 0.0), vec3(0.30, 0.30 + 0.006 * breathe, 0.29));
  // full cheeks / soft front
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.27, 0.15), vec3(0.24, 0.21, 0.17)), 0.08);
  // stubby feet, tucked under the body
  vec3 ft = vec3(abs(p.x) - 0.13, p.y - 0.05, p.z - 0.14);
  d = smin(d, sdEllipsoid(ft, vec3(0.09, 0.055, 0.11)), 0.04);
  // stubby paws resting on the round belly
  vec3 ar = vec3(abs(p.x) - 0.155, p.y - 0.245, p.z - 0.235);
  d = smin(d, sdEllipsoid(ar, vec3(0.062, 0.055, 0.055)), 0.04);
  // handmade clay: very low, slow irregularity — smooth fired ceramic, not fur
  if (d < 0.06) d += (fbm(p * 9.0) - 0.5) * 0.004 * smoothstep(0.60, 0.45, p.y);
  float m = 0.0;

  // --- upside-down flowerpot hat, riding the breath ever so slightly ---
  vec3 pp = p - vec3(0.0, 0.004 * breathe, 0.0);
  // flared brim ring (the pot mouth faces down over the head)
  float dPot = sdPotCone(pp - vec3(0.0, 0.585, 0.0), 0.045, 0.39, 0.35) - 0.02;
  // wall tapering up to the pot base
  dPot = smin(dPot, sdPotCone(pp - vec3(0.0, 0.82, 0.0), 0.20, 0.330, 0.245) - 0.02, 0.02);
  // faint wheel-throwing ridges in the silhouette
  if (dPot < 0.05) dPot += sin(pp.y * 80.0) * 0.0008;
  if (dPot < d) m = 1.0;
  d = smin(d, dPot, 0.03);

  // --- soil plug mounded in the drainage hole ---
  float dSoil = sdEllipsoid(pp - vec3(0.0, 1.03, 0.0), vec3(0.155, 0.055, 0.155));
  if (dSoil < d) m = 5.0;
  d = smin(d, dSoil, 0.02);

  // --- the stubborn sprout: sways independently of the pot ---
  float swayX = sin(t * 1.6 + 0.7) * 0.045 + sin(t * 3.1) * 0.012;
  float swayZ = cos(t * 1.2) * 0.028;
  vec3 s = pp;
  float rise = smoothstep(1.02, 1.30, s.y);
  s.x -= swayX * rise;
  s.z -= swayZ * rise;
  float dStem = sdCapsule(s, vec3(0.0, 1.01, 0.0), vec3(0.0, 1.21, 0.0), 0.026);
  // two chubby leaves splayed up-and-out, with an occasional twitch
  vec3 lq = vec3(abs(s.x) - 0.115, s.y - 1.25, s.z);
  lq.xy = rot(0.55 + 0.06 * sin(t * 1.1) * sin(t * 3.4)) * lq.xy;
  float dLeaf = sdEllipsoid(lq, vec3(0.13, 0.046, 0.07));
  // tiny centre bud where the leaves meet
  dLeaf = smin(dLeaf, length(s - vec3(0.0, 1.235, 0.0)) - 0.032, 0.03);
  float dSprout = smin(dStem, dLeaf, 0.025);
  float mSprout = dLeaf < dStem ? 3.0 : 4.0;
  dSprout *= 0.92; // conservative under the sway shear
  if (dSprout < d) m = mSprout;
  d = smin(d, dSprout, 0.02);

  return vec2(d, m);
}

vec3 speciesAlbedo(vec3 p, float m, out float gloss, out float emissive) {
  gloss = 0.0;
  emissive = 0.0;

  if (m == 5.0) { // soil: dark crumbly mix
    float cr = fbm(p * 18.0);
    return mix(SOIL * 0.8, SOIL * 1.25, smoothstep(0.35, 0.75, cr));
  }
  if (m == 4.0) {
    gloss = 0.15;
    return STEM;
  }
  if (m == 3.0) { // leaf: waxy, a little sun-lightened toward the tips
    gloss = 0.22;
    vec3 col = mix(LEAF, LEAF * 1.22, smoothstep(0.45, 0.8, fbm(p * 12.0)));
    return mix(col, STEM, smoothstep(0.05, 0.0, abs(p.x)) * 0.5);
  }
  if (m == 1.0) { // weathered terracotta pot — matte, painted lip bands
    vec3 col = POT * 0.94;
    float wea = fbm(p * 5.0);
    col = mix(col, POT * 0.85, smoothstep(0.42, 0.20, wea) * 0.18);
    col = mix(col, POT_LIP, smoothstep(0.65, 0.85, wea) * 0.10);
    // brim lip highlight along the pot mouth (underside edge)
    col = mix(col, POT_LIP, smoothstep(0.60, 0.56, p.y) * 0.85);
    // thin band where the wall tapers, echoing the voxel two-ring look
    col = mix(col, POT_LIP, smoothstep(0.035, 0.012, abs(p.y - 0.86)) * 0.55);
    // lighter base lip around the drainage opening
    col = mix(col, POT_LIP, smoothstep(0.955, 1.000, p.y) * 0.8);
    // hairline crack wandering down one side of the wall
    float ang = atan(p.x, p.z);
    float crack = abs(ang - 0.85 - 0.4 * (noise(vec3(p.y * 9.0, 3.7, 1.3)) - 0.5));
    float ck = smoothstep(0.05, 0.015, crack) * smoothstep(0.62, 0.70, p.y) * smoothstep(0.98, 0.88, p.y);
    col = mix(col, POT * 0.55, ck * 0.7);
    gloss = 0.10;
    return col;
  }

  // --- clay body: smooth fired ceramic with a subtle glaze dip band ---
  vec3 col = CLAY;
  float mot = fbm(p * 4.5);
  col = mix(col, CLAY * 1.08, smoothstep(0.55, 0.80, mot) * 0.18);
  col = mix(col, CLAY * 0.92, smoothstep(0.45, 0.25, mot) * 0.15);
  gloss = 0.18; // fired-smooth: quiets the plush normal fuzz
  // glaze band low on the body — a soft glossy ring that catches the light
  float glz = smoothstep(0.09, 0.15, p.y) * smoothstep(0.30, 0.21, p.y);
  gloss += 0.28 * glz;
  col = mix(col, col * 1.10 + 0.02, glz * 0.45);

  if (p.z > 0.15) {
    // blink: bashful eyes squeeze shut every ~4.3s (held shut by faint)
    float bt = fract(uTime / 4.3);
    float blink = smoothstep(0.90, 0.94, bt) * smoothstep(0.99, 0.955, bt);
    blink = max(blink, actionLid());
    float lid = mix(1.0, 0.07, blink);
    // big round black eyes
    vec2 ec = vec2(abs(p.x) - 0.125, (p.y - 0.375) / lid);
    float eye = length(ec / vec2(0.056, 0.066));
    if (eye < 1.0) {
      col = DARK;
      gloss = smoothstep(1.0, 0.85, eye);
      // catchlight, top-outer (matches the voxel eye shine)
      float shine = length((ec - vec2(0.019, 0.028)) / vec2(0.019, 0.023));
      col = mix(vec3(1.0), col, smoothstep(0.6, 1.0, shine));
      // faint warm lower glint
      float glint = length((ec - vec2(-0.010, -0.036)) / vec2(0.015, 0.012));
      col = mix(vec3(0.85, 0.55, 0.35), col, smoothstep(0.55, 1.0, glint));
    }
    // tiny shy smile, corners up
    float sx = p.x / 0.062;
    if (abs(p.x) < 0.062 && p.z > 0.20) {
      float curve = 0.283 + 0.026 * sx * sx;
      col = mix(DARK, col, smoothstep(0.004, 0.010, abs(p.y - curve)));
    }
    // bashful blush under the eyes
    float ch = length((vec2(abs(p.x), p.y) - vec2(0.21, 0.315)) / vec2(0.055, 0.038));
    col = mix(col, vec3(0.93, 0.47, 0.36), 0.55 * smoothstep(1.0, 0.5, ch));
  }
  return col;
}
`,
};
