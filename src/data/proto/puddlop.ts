// Puddlop — the Curious Droplet, tide starter. A wobbling liquid blob with a
// glossy wet surface, droopy water-drop ear-fins, stubby arms and tentacle
// feet, a big open happy mouth, and its signature: a golden puddle-ring halo
// hovering above its head, bobbing and tilting like water it balances.
// Palette matches src/data/voxels/puddlop.ts.
import type { ProtoSpecies } from "./types";

export const puddlop: ProtoSpecies = {
  name: "Puddlop",
  glsl: /* glsl */ `
// palette (matches the voxel palette)
const vec3 BODY = vec3(0.557, 0.651, 0.831);       // #8ea6d4
const vec3 BODY_LIGHT = vec3(0.659, 0.737, 0.878); // #a8bce0
const vec3 BELLY = vec3(0.776, 0.839, 0.937);      // #c6d6ef
const vec3 DARK = vec3(0.180, 0.157, 0.137);       // #2e2823
const vec3 RIM = vec3(0.925, 0.875, 0.769);        // #ecdfc4
const vec3 MOUTH = vec3(0.788, 0.514, 0.416);      // #c9836a
const vec3 HALO = vec3(0.796, 0.690, 0.494);       // #cbb07e
const vec3 HALO_LIGHT = vec3(0.949, 0.902, 0.769); // #f2e6c4

// material ids: 0 body, 1 light (fins/feet), 7 halo ring
vec2 speciesMap(vec3 p) {
  float t = uTime;
  float breathe = 0.010 * sin(t * 2.0);

  // --- liquid wobble: a slow, soft sample-space shear growing up the body
  //     (kindlet's flame trick, but gentle — it reads as water, not fire) ---
  vec3 q = p;
  float rise = smoothstep(0.05, 0.95, p.y);
  q.x += sin(t * 1.7 + p.y * 3.2) * 0.017 * rise;
  q.z += cos(t * 1.3 + p.y * 2.6) * 0.013 * rise;

  // --- droplet body: plump base + head dome + tiny drip peak on top ---
  float d = sdEllipsoid(q - vec3(0.0, 0.50, 0.0), vec3(0.44, 0.50 + breathe, 0.42));
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.92 + breathe, 0.0), vec3(0.315, 0.27, 0.30)), 0.18);
  d = smin(d, length(q - vec3(0.0, 1.16, 0.0)) - 0.055, 0.11);
  // belly bulge
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.44, 0.24), vec3(0.28, 0.30, 0.20)), 0.12);
  float m = 0.0;

  // --- droopy water-drop ear-fins, swaying softly ---
  vec3 e = vec3(abs(q.x), q.y, q.z) - vec3(0.44, 0.74, -0.02);
  e.xy = rot(0.85 + 0.08 * sin(t * 1.1 + 1.0)) * e.xy;
  float dFin = sdEllipsoid(e, vec3(0.085, 0.16, 0.095));
  if (dFin < d) m = 1.0;
  d = smin(d, dFin, 0.075);

  // --- stubby arms reaching a little forward and up (curious!) ---
  float armLift = 0.03 * sin(t * 1.5 + 0.7);
  vec3 a = vec3(abs(q.x) - 0.34, q.y - 0.52 - armLift, q.z - 0.20);
  a.xy = rot(0.55) * a.xy;
  d = smin(d, sdEllipsoid(a, vec3(0.075, 0.13, 0.085)), 0.05);

  // --- four stubby tentacle feet ---
  vec3 ff = vec3(abs(q.x) - 0.20, q.y - 0.055, q.z - 0.26);
  float dFeet = sdEllipsoid(ff, vec3(0.105, 0.07, 0.12));
  vec3 fb = vec3(abs(q.x) - 0.21, q.y - 0.055, q.z + 0.24);
  dFeet = min(dFeet, sdEllipsoid(fb, vec3(0.105, 0.07, 0.12)));
  if (dFeet < d) m = 1.0;
  d = smin(d, dFeet, 0.045);

  // keep the marcher conservative under the wobble shear
  d *= 0.93;

  // --- the puddle-ring halo: a golden torus hovering above the head,
  //     bobbing and tilting like a plate of water being balanced ---
  vec3 h = p - vec3(0.0, 1.46 + 0.035 * sin(t * 1.2), 0.0);
  h.xy = rot(0.07 * sin(t * 0.7)) * h.xy;
  h.zy = rot(0.06 * cos(t * 0.9)) * h.zy;
  float dHalo = length(vec2(length(h.xz) - 0.30, h.y)) - 0.046;
  if (dHalo < d) m = 7.0;
  d = min(d, dHalo);

  return vec2(d, m);
}

vec3 speciesAlbedo(vec3 p, float m, out float gloss, out float emissive) {
  gloss = 0.0;
  emissive = 0.0;

  if (m == 7.0) {
    // golden ring, its upper surface lit like shimmering puddle water.
    // Pinned to the REST-pose halo height (1.46): the baked mesh paints in
    // undeformed local space, so following the animated bob here would
    // drift the band off the frozen geometry (review finding). In the
    // raymarched view the ±0.035 bob vs this soft band is invisible.
    float topness = smoothstep(0.015, 0.045, p.y - 1.46);
    float rip = fbm(vec3(p.x * 9.0, uTime * 0.8, p.z * 9.0));
    vec3 c = mix(HALO * 0.82, HALO_LIGHT, topness * (0.5 + 0.5 * smoothstep(0.45, 0.75, rip)));
    gloss = 0.75;
    emissive = 0.08 + 0.14 * topness * smoothstep(0.5, 0.8, rip);
    return c;
  }

  vec3 col = (m == 1.0) ? BODY_LIGHT : BODY;
  // high gloss: smooth wet surface (kills the plush fuzz normal) + tight
  // specular droplets of light
  gloss = 0.55;
  // water depth: the blob reads deeper, bluer toward its base and sides
  float depth = smoothstep(0.95, 0.10, p.y) * 0.50 + smoothstep(0.28, 0.44, abs(p.x)) * 0.30;
  col = mix(col, col * vec3(0.60, 0.71, 1.0), min(depth, 0.62));

  // lighter belly patch on the front
  if (p.z > 0.14) {
    float belly = length((p.xy - vec2(0.0, 0.36)) / vec2(0.19, 0.23));
    col = mix(mix(col, BELLY, 0.8), col, smoothstep(0.70, 1.02, belly));
  }

  if (p.z > 0.20) {
    // blink: quick squash every ~4.3s (held shut while fainting)
    float bt = fract(uTime / 4.3);
    float blink = smoothstep(0.90, 0.94, bt) * smoothstep(0.99, 0.955, bt);
    blink = max(blink, actionLid());
    float lid = mix(1.0, 0.07, blink);

    // huge sparkly eyes with cream rims
    vec2 rc = vec2(abs(p.x) - 0.17, (p.y - 0.80) / lid);
    float rim = length(rc / vec2(0.092, 0.126));
    col = mix(RIM, col, smoothstep(0.82, 1.05, rim));
    float eye = length(rc / vec2(0.072, 0.105));
    if (eye < 1.0) {
      col = DARK;
      gloss = 1.0;
      // big pearly catchlight, top-outer
      float shine = length((rc - vec2(0.024, 0.040)) / vec2(0.026, 0.032));
      col = mix(vec3(1.0), col, smoothstep(0.65, 1.0, shine));
      // watery lower glint
      float glint = length((rc - vec2(-0.018, -0.045)) / vec2(0.015, 0.014));
      col = mix(vec3(0.85, 0.92, 1.0), col, smoothstep(0.55, 1.0, glint));
      // tiny second sparkle
      float spark = length((rc - vec2(-0.030, 0.026)) / vec2(0.009, 0.011));
      col = mix(vec3(1.0), col, smoothstep(0.5, 1.0, spark));
    }

    // big open happy mouth (a D flipped up: corners curl into a smile),
    // dark inside with a coral tongue
    float mx = p.x / 0.10;
    float mo = length((p.xy - vec2(0.0, 0.615)) / vec2(0.105, 0.085));
    float top = 0.645 + 0.035 * mx * mx;
    float mouth = (1.0 - smoothstep(0.90, 1.0, mo)) * smoothstep(top + 0.008, top - 0.008, p.y);
    vec3 mouthCol = DARK;
    float tongue = length((p.xy - vec2(0.0, 0.575)) / vec2(0.062, 0.038));
    mouthCol = mix(MOUTH, mouthCol, smoothstep(0.75, 1.0, tongue));
    col = mix(col, mouthCol, mouth);

    // soft lighter cheek spots
    float ch = length((vec2(abs(p.x), p.y) - vec2(0.30, 0.68)) / vec2(0.06, 0.042));
    col = mix(col, BELLY, 0.5 * smoothstep(1.0, 0.5, ch));
  }
  return col;
}
`,
};
