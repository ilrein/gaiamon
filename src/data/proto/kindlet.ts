// Kindlet — soot-grey ferret kit with a flickering kindling-flame topknot.
// Shows off what procedural rendering does that voxels can't: the flame is
// live-deforming geometry (sample-space wobble growing with height, pinched
// to a point) and the embers are emissive, pulsing surfaces.
// Palette matches src/data/voxels/kindlet.ts.
import type { ProtoSpecies } from "./types";

export const kindlet: ProtoSpecies = {
  name: "Kindlet",
  glsl: /* glsl */ `
// palette (matches the voxel palette)
const vec3 SOOT = vec3(0.341, 0.298, 0.275);       // #574c46
const vec3 SOOT_LIGHT = vec3(0.420, 0.365, 0.329); // #6b5d54
const vec3 CREAM = vec3(0.957, 0.925, 0.824);      // #f4ecd2
const vec3 DARK = vec3(0.165, 0.129, 0.114);       // #2a211d
const vec3 AMBER = vec3(0.878, 0.635, 0.290);      // #e0a24a
const vec3 EMBER = vec3(1.0, 0.478, 0.180);        // #ff7a2e
const vec3 FLAME_CORE = vec3(1.0, 0.616, 0.235);   // #ff9d3c
const vec3 FLAME_TIP = vec3(1.0, 0.824, 0.290);    // #ffd24a
const vec3 SOOT_DARK = vec3(0.271, 0.231, 0.212);  // #453b36

// material ids: 0 soot body, 1 soot-light head, 2 dark feet, 3 ember tail tip, 4 flame
vec2 speciesMap(vec3 p) {
  float t = uTime;
  float breathe = sin(t * 2.4);

  // --- sitting ferret-kit pose: haunches + forward-leaning chest ---
  float d = sdEllipsoid(p - vec3(0.0, 0.30, 0.0), vec3(0.30, 0.30 + 0.008 * breathe, 0.28));
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.50, 0.12), vec3(0.22, 0.24, 0.19)), 0.10);
  float m = 0.0;

  // --- big chibi head with a slow curious tilt ---
  vec3 h = p - vec3(0.0, 0.86 + 0.012 * breathe, 0.04);
  h.xy = rot(0.06 * sin(t * 0.7)) * h.xy;
  float dHead = sdEllipsoid(h, vec3(0.33, 0.30, 0.29));
  // cream muzzle bump
  dHead = smin(dHead, sdEllipsoid(h - vec3(0.0, -0.10, 0.27), vec3(0.15, 0.10, 0.10)), 0.04);
  // rounded ferret ears, occasional twitch
  vec3 e = vec3(abs(h.x), h.y, h.z) - vec3(0.23, 0.27, -0.05);
  e.xy = rot(-0.35 + 0.1 * sin(t * 1.1) * sin(t * 3.1)) * e.xy;
  dHead = smin(dHead, sdEllipsoid(e, vec3(0.085, 0.105, 0.05)), 0.035);
  if (dHead < d) m = 1.0;
  d = smin(d, dHead, 0.06);

  // --- stubby paws over the belly + dark feet ---
  vec3 pw = vec3(abs(p.x) - 0.13, p.y - 0.34, p.z - 0.27);
  d = smin(d, length(pw) - 0.06, 0.04);
  vec3 ft = vec3(abs(p.x) - 0.13, p.y - 0.05, p.z - 0.12);
  float dFeet = sdEllipsoid(ft, vec3(0.09, 0.05, 0.12));
  if (dFeet < d) m = 2.0;
  d = smin(d, dFeet, 0.035);

  // --- little tail curling up behind, ember tip bobbing ---
  float sway = sin(t * 1.8) * 0.05;
  vec3 t1 = vec3(sway * 0.5, 0.34, -0.42);
  vec3 t2 = vec3(sway, 0.46 + 0.02 * sin(t * 2.6), -0.50);
  float dTail = sdCapsule(p, vec3(0.0, 0.22, -0.26), t1, 0.08);
  dTail = smin(dTail, sdCapsule(p, t1, t2, 0.06), 0.05);
  d = smin(d, dTail, 0.05);
  float dTip = length(p - t2) - 0.068;
  if (dTip < d) m = 3.0;
  d = smin(d, dTip, 0.03);

  // --- kindling-flame topknot: a teardrop whose sample space wobbles
  //     sideways (growing with height) and pinches to a point. The wobble is
  //     the flicker — real geometry, re-marched every frame. ---
  vec3 f = p - vec3(0.0, 1.18, 0.0);
  float rise = smoothstep(-0.10, 0.40, f.y);
  f.x += sin(t * 9.0 + f.y * 14.0) * 0.05 * rise;
  f.z += cos(t * 7.3 + f.y * 11.0) * 0.035 * rise;
  f.z -= 0.13 * rise * rise; // the lick flicks forward
  float pinch = 1.0 + 2.3 * smoothstep(0.02, 0.42, f.y);
  f.xz *= pinch;
  // divide by pinch to keep the marcher conservative under the stretch
  float dFlame = sdEllipsoid(f, vec3(0.115, 0.30 + 0.03 * sin(t * 5.2), 0.115)) / pinch;
  // small side tongue licking up the other way, out of phase
  vec3 g = p - vec3(-0.075, 1.10, -0.02);
  g.x -= sin(t * 6.1 + 2.0) * 0.03 * smoothstep(-0.05, 0.15, g.y);
  float pinch2 = 1.0 + 2.0 * smoothstep(0.0, 0.16, g.y);
  g.xz *= pinch2;
  dFlame = smin(dFlame, sdEllipsoid(g, vec3(0.055, 0.13, 0.055)) / pinch2, 0.05);
  if (dFlame < d) m = 4.0;
  d = smin(d, dFlame, 0.045);

  return vec2(d, m);
}

vec3 speciesAlbedo(vec3 p, float m, out float gloss, out float emissive) {
  gloss = 0.0;
  emissive = 0.0;
  if (m == 2.0) return SOOT_DARK;
  if (m == 3.0) {
    emissive = 0.6 + 0.25 * sin(uTime * 3.1);
    return EMBER;
  }
  if (m == 4.0) {
    // ember base -> orange core -> yellow tip, shimmer rolling upward
    float fy = p.y + 0.12 * fbm(p * 6.0 + vec3(0.0, -uTime * 1.5, 0.0));
    emissive = 1.0;
    vec3 c = mix(EMBER, FLAME_CORE, smoothstep(0.95, 1.18, fy));
    return mix(c, FLAME_TIP, smoothstep(1.18, 1.45, fy));
  }

  vec3 col = m == 1.0 ? SOOT_LIGHT : SOOT;
  // soft fur mottle
  col = mix(col, col * 1.12, smoothstep(0.55, 0.80, fbm(p * 7.0)) * 0.5);

  // cream belly down the leaning chest
  if (p.z > 0.08) {
    float belly = length((p.xy - vec2(0.0, 0.40)) / vec2(0.17, 0.24));
    col = mix(CREAM, col, smoothstep(0.80, 1.05, belly));
  }
  // cream muzzle
  if (p.z > 0.20) {
    float muz = length((p.xy - vec2(0.0, 0.76)) / vec2(0.145, 0.105));
    col = mix(CREAM, col, smoothstep(0.75, 1.05, muz));
  }
  // ember inner-ear glow
  vec3 e = vec3(abs(p.x), p.y - 0.86, p.z - 0.04) - vec3(0.23, 0.27, 0.02);
  e.xy = rot(-0.35) * e.xy;
  float ear = length(e / vec3(0.05, 0.07, 0.05));
  col = mix(EMBER, col, smoothstep(0.45, 1.0, ear));
  emissive = max(emissive, 0.35 * smoothstep(1.0, 0.4, ear));

  if (p.z > 0.20) {
    // blink (held shut while fainting)
    float bt = fract(uTime / 5.3);
    float blink = smoothstep(0.91, 0.945, bt) * smoothstep(0.99, 0.955, bt);
    blink = max(blink, actionLid());
    float lid = mix(1.0, 0.07, blink);
    // amber eyes with dark pupils and a catchlight
    vec2 ec = vec2(abs(p.x) - 0.145, (p.y - 0.90) / lid);
    float eye = length(ec / vec2(0.062, 0.075));
    if (eye < 1.0) {
      col = AMBER;
      gloss = smoothstep(1.0, 0.85, eye);
      float pupil = length((ec - vec2(-0.005, -0.010)) / vec2(0.028, 0.042));
      col = mix(DARK, col, smoothstep(0.7, 1.0, pupil));
      float shine = length((ec - vec2(0.020, 0.030)) / vec2(0.016, 0.020));
      col = mix(vec3(1.0), col, smoothstep(0.6, 1.0, shine));
    }
    // glowing ember nose at the muzzle tip
    float nose = length((p.xy - vec2(0.0, 0.80)) / vec2(0.022, 0.017));
    col = mix(EMBER, col, smoothstep(0.5, 1.0, nose));
    emissive = max(emissive, 0.4 * smoothstep(1.0, 0.5, nose));
    // happy open grin
    float sx = p.x / 0.05;
    if (abs(p.x) < 0.05 && p.z > 0.28) {
      float curve = 0.715 + 0.020 * sx * sx;
      col = mix(DARK, col, smoothstep(0.004, 0.010, abs(p.y - curve)));
    }
    // ember freckle dashes on the cheeks
    vec2 fr = vec2(abs(p.x), p.y);
    float f1 = length((fr - vec2(0.20, 0.80)) / vec2(0.018, 0.012));
    float f2 = length((fr - vec2(0.245, 0.845)) / vec2(0.014, 0.010));
    float fk = min(f1, f2);
    col = mix(EMBER, col, smoothstep(0.5, 1.0, fk));
    emissive = max(emissive, 0.3 * smoothstep(1.0, 0.5, fk));
  }
  return col;
}
`,
};
