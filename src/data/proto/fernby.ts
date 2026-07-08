// Fernby — moss chinchilla with a coiled fern fiddlehead tail.
// Reference procedural creature; palette matches src/data/voxels/fernby.ts.
import type { ProtoSpecies } from "./types";

export const fernby: ProtoSpecies = {
  name: "Fernby",
  glsl: /* glsl */ `
// palette (matches the voxel palette)
const vec3 MOSS = vec3(0.498, 0.682, 0.322);       // #7fae52
const vec3 MOSS_LIGHT = vec3(0.608, 0.800, 0.416); // #9bcc6a
const vec3 CREAM = vec3(0.957, 0.925, 0.824);      // #f4ecd2
const vec3 DARK = vec3(0.184, 0.153, 0.137);       // #2f2723
const vec3 MOSS_DARK = vec3(0.365, 0.514, 0.251);  // #5d8340
const vec3 BLUSH = vec3(0.957, 0.663, 0.627);      // #f4a9a0

// material ids: 0 moss body, 2 dark feet, 3 tail stem, 4 coil moss, 5 tip/frond light
vec2 speciesMap(vec3 p) {
  float t = uTime;
  float breathe = sin(t * 2.2);

  // --- moss egg: body + head dome, seamlessly blended ---
  float d = sdEllipsoid(p - vec3(0.0, 0.44, 0.0), vec3(0.40, 0.44 + 0.008 * breathe, 0.37));
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.90 + 0.010 * breathe, 0.015), vec3(0.335, 0.33, 0.32)), 0.16);
  // belly + muzzle bulges
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.42, 0.27), vec3(0.25, 0.28, 0.17)), 0.10);
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.80, 0.30), vec3(0.13, 0.11, 0.08)), 0.05);

  // --- leaf ears, tilted outward, wobbling ---
  vec3 e = vec3(abs(p.x), p.y, p.z) - vec3(0.20, 1.18, -0.02);
  float twitch = 0.10 * sin(t * 0.9) * sin(t * 2.7 + 1.3);
  e.xy = rot(-0.5 + twitch) * e.xy;
  d = smin(d, sdEllipsoid(e, vec3(0.10, 0.17, 0.055)), 0.05);

  // --- paws resting on the belly ---
  vec3 pw = vec3(abs(p.x) - 0.15, p.y - 0.31, p.z - 0.30);
  d = smin(d, length(pw) - 0.07, 0.045);

  float m = 0.0;

  // --- dark feet ---
  vec3 ft = vec3(abs(p.x) - 0.155, p.y - 0.055, p.z - 0.16);
  float dFeet = sdEllipsoid(ft, vec3(0.105, 0.06, 0.15));
  if (dFeet < d) m = 2.0;
  d = smin(d, dFeet, 0.04);

  // --- fiddlehead tail: logarithmic spiral of spheres curling inward,
  //     held clearly behind the body on a visible stem ---
  float coilSway = sin(t * 1.5) * 0.06;
  vec3 C = vec3(coilSway * 0.6, 0.90, -0.62);
  float dTail = 1e9;
  float tailMat = 4.0;
  vec3 c0 = vec3(0.0);
  for (int i = 0; i < 17; i++) {
    float fi = float(i);
    // start at the bottom-front (where the stem meets it), wind up over the
    // top and ~1.4 turns inward, the tip curling into the centre
    float th = -1.35 + fi * 0.52;
    float R = 0.235 * pow(0.905, fi);
    float sway = coilSway * (0.15 + fi / 17.0);
    vec3 c = C + vec3(sway, sin(th) * R, cos(th) * R);
    if (i == 0) c0 = c;
    float ds = length(p - c) - (0.052 * pow(0.97, fi) + 0.012);
    if (ds < dTail) tailMat = fi >= 14.0 ? 5.0 : 4.0;
    dTail = smin(dTail, ds, 0.035);
  }
  // stem connecting body to the coil
  float dStem = sdCapsule(p, vec3(0.0, 0.34, -0.22), c0, 0.05);
  if (dStem < dTail) tailMat = 3.0;
  dTail = smin(dTail, dStem, 0.05);
  // little fronds budding off the back of the stem, like a fern spine
  for (int j = 0; j < 3; j++) {
    float fj = float(j);
    float sway = coilSway * (0.35 + fj * 0.15);
    vec3 fc = vec3(sway, 0.585 - fj * 0.115, -0.545 + fj * 0.075);
    vec3 fq = p - fc;
    fq.yz = rot(0.7 - fj * 0.25) * fq.yz;
    float df = sdEllipsoid(fq, vec3(0.026, 0.075, 0.040));
    if (df < dTail) tailMat = 5.0;
    dTail = smin(dTail, df, 0.045);
  }
  if (dTail < d) m = tailMat;
  d = smin(d, dTail, 0.04);

  // mossy fuzz on the silhouette (skip when far — cheap)
  if (d < 0.08) d += (fbm(p * 20.0 + vec3(0.0, uTime * 0.05, 0.0)) - 0.5) * 0.007;

  return vec2(d, m);
}

vec3 speciesAlbedo(vec3 p, float m, out float gloss, out float emissive) {
  gloss = 0.0;
  emissive = 0.0;
  if (m == 2.0) return MOSS_DARK;
  if (m == 3.0) return MOSS_DARK;
  if (m == 4.0) return MOSS;
  if (m == 5.0) return MOSS_LIGHT;

  vec3 col = MOSS;
  // mottled moss: gentle two-tone patches
  float mot = fbm(p * 6.0);
  col = mix(col, MOSS_LIGHT, smoothstep(0.55, 0.80, mot) * 0.35);
  col = mix(col, MOSS_DARK, smoothstep(0.45, 0.22, mot) * 0.18);

  // cream belly (front lower ellipse) + muzzle patch
  if (p.z > 0.10) {
    float belly = length((p.xy - vec2(0.0, 0.40)) / vec2(0.24, 0.27));
    col = mix(CREAM, col, smoothstep(0.85, 1.05, belly));
  }
  if (p.z > 0.22) {
    float muzzle = length((p.xy - vec2(0.0, 0.79)) / vec2(0.115, 0.10));
    col = mix(CREAM, col, smoothstep(0.8, 1.05, muzzle));
  }
  // inner-ear light patch
  vec3 e = vec3(abs(p.x), p.y, p.z) - vec3(0.20, 1.18, 0.02);
  e.xy = rot(-0.5) * e.xy;
  col = mix(MOSS_LIGHT, col, smoothstep(0.5, 0.9, length(e / vec3(0.055, 0.10, 0.06))));

  if (p.z > 0.22) {
    // blink: eyes squash shut briefly every ~4.7s (or held shut by faint)
    float bt = fract(uTime / 4.7);
    float blink = smoothstep(0.90, 0.94, bt) * smoothstep(0.995, 0.955, bt);
    blink = max(blink, actionLid());
    float lid = mix(1.0, 0.06, blink);
    // big glossy eyes
    vec2 ec = vec2(abs(p.x) - 0.135, (p.y - 0.865) / lid);
    float eye = length(ec / vec2(0.062, 0.085));
    if (eye < 1.0) {
      col = DARK;
      gloss = smoothstep(1.0, 0.85, eye);
      // painted catchlight, top-outer
      float shine = length((ec - vec2(0.022, 0.035)) / vec2(0.020, 0.026));
      col = mix(vec3(1.0), col, smoothstep(0.7, 1.0, shine));
      // lower iris glint
      float glint = length((ec - vec2(-0.012, -0.045)) / vec2(0.016, 0.014));
      col = mix(vec3(0.65, 0.78, 0.55), col, smoothstep(0.6, 1.0, glint));
    }
    // nose
    float nose = length((p.xy - vec2(0.0, 0.805)) / vec2(0.021, 0.016));
    col = mix(DARK, col, smoothstep(0.7, 1.0, nose));
    // shy smile: upturned arc under the nose
    float sx = p.x / 0.075;
    if (abs(p.x) < 0.075 && p.z > 0.25) {
      float curve = 0.745 + 0.030 * sx * sx;
      float smile = abs(p.y - curve);
      col = mix(DARK, col, smoothstep(0.004, 0.011, smile));
    }
    // blush
    float ch = length((vec2(abs(p.x), p.y) - vec2(0.225, 0.775)) / vec2(0.055, 0.038));
    col = mix(col, BLUSH, 0.65 * smoothstep(1.0, 0.5, ch));
  }
  return col;
}
`,
};
