// Shared GLSL for procedural SDF creatures — single source of truth used by
// BOTH renderers:
//   - the raymarched workshop shell (src/client/proto-preview.ts)
//   - the baked-mesh runtime material (src/client/world/proto-mesh.ts)
// Species chunks (src/data/proto/*.ts) compile against these.
// See design/PROCEDURAL-CREATURES.md.

/** Uniforms every proto shader stage declares. */
export const PROTO_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
// action verb layer: 0 none, 1 hop, 2 attack, 3 hit, 4 faint, 5 celebrate
uniform float uAction;
uniform float uActionT; // seconds since the verb started
// shiny variant: 0 = normal, otherwise a hue-rotation angle in radians
uniform float uSeed;
`;

/** Noise + SDF toolkit available to species chunks. */
export const PROTO_TOOLKIT_GLSL = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  return 0.65 * noise(p) + 0.35 * noise(p * 2.13);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
// rotate hue around the RGB diagonal — the shiny recolour
vec3 hueShift(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a), sa = sin(a);
  return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
`;

/** Verb curves + the two transforms derived from them.
 *  actionTransform: deforms a SAMPLE POINT (inverse) — for raymarching.
 *  actionForward:   deforms a VERTEX (forward)      — for baked meshes.  */
export const PROTO_ACTIONS_GLSL = /* glsl */ `
float easeOutCubic(float x) { return 1.0 - pow(1.0 - x, 3.0); }
float easeInOut(float x) { return x * x * (3.0 - 2.0 * x); }

// white impact flash for the hit verb, read by shading
float actionFlash() {
  if (uAction == 3.0) return 0.8 * exp(-max(uActionT, 0.0) * 7.0);
  return 0.0;
}
// eyes forced shut while fainting
float actionLid() {
  if (uAction == 4.0) return smoothstep(0.15, 0.5, uActionT / 1.2);
  return 0.0;
}

// One set of curves shared by both transforms. All verbs end at identity
// (a = 1 -> no deformation) except faint, which holds its slump.
void actionCurves(out float squash, out float yoff, out float zoff, out float lean, out float spin) {
  squash = 1.0; yoff = 0.0; zoff = 0.0; lean = 0.0; spin = 0.0;
  if (uAction < 0.5) return;
  if (uAction == 1.0) { // hop: crouch, spring, land with a jelly recover
    float a = clamp(uActionT / 0.9, 0.0, 1.0);
    if (a < 0.22) squash = mix(1.0, 0.78, easeInOut(a / 0.22));
    else if (a < 0.62) {
      float j = (a - 0.22) / 0.4;
      yoff = 0.35 * 4.0 * j * (1.0 - j);
      squash = j < 0.5 ? mix(0.78, 1.15, j * 2.0) : mix(1.15, 1.0, (j - 0.5) * 2.0);
    } else if (a < 0.78) squash = mix(1.0, 0.74, easeInOut((a - 0.62) / 0.16));
    else {
      float r = (a - 0.78) / 0.22;
      squash = mix(0.74, 1.0, easeOutCubic(r)) + 0.05 * sin(r * 14.0) * (1.0 - r);
    }
  } else if (uAction == 2.0) { // attack: anticipate back, lunge forward, settle
    float a = clamp(uActionT / 0.8, 0.0, 1.0);
    if (a < 0.3) {
      float j = easeInOut(a / 0.3);
      squash = mix(1.0, 0.80, j); zoff = -0.10 * j; lean = -0.22 * j;
    } else if (a < 0.5) {
      float j = easeOutCubic((a - 0.3) / 0.2);
      squash = mix(0.80, 1.14, j); zoff = mix(-0.10, 0.5, j); lean = mix(-0.22, 0.30, j);
    } else {
      float r = easeInOut((a - 0.5) / 0.5);
      squash = mix(1.14, 1.0, r); zoff = mix(0.5, 0.0, r); lean = mix(0.30, 0.0, r);
    }
  } else if (uAction == 3.0) { // hit: knockback + damped jelly wobble
    float a = clamp(uActionT / 0.7, 0.0, 1.0);
    float k = sin(min(a * 4.0, 3.14159)) * exp(-a * 2.0);
    zoff = -0.30 * k;
    lean = -0.20 * k;
    squash = 1.0 + 0.22 * cos(a * 24.0) * exp(-a * 5.0);
  } else if (uAction == 4.0) { // faint: slump and deflate, then hold
    float e = easeInOut(clamp(uActionT / 1.2, 0.0, 1.0));
    squash = mix(1.0, 0.38, e);
    lean = 0.35 * e;
  } else { // celebrate: two bounces with a full spin
    float a = clamp(uActionT / 1.1, 0.0, 1.0);
    yoff = 0.2 * abs(sin(a * 6.2832));
    spin = 6.2832 * easeInOut(a);
    squash = 1.0 + 0.10 * sin(a * 12.566);
  }
}

// Deform a SAMPLE POINT (inverse of deforming the creature) and return a
// distance-scale factor that keeps the march conservative under squash.
float actionTransform(inout vec3 p) {
  if (uAction < 0.5) return 1.0;
  float squash, yoff, zoff, lean, spin;
  actionCurves(squash, yoff, zoff, lean, spin);
  p.y -= yoff;
  p.z -= zoff;
  if (spin != 0.0) p.xz = rot(spin) * p.xz;
  if (lean != 0.0) p.yz = rot(lean) * (p.yz - vec2(0.35, 0.0)) + vec2(0.35, 0.0);
  // squash about the ground plane, conserving volume
  p.y /= squash;
  p.xz *= sqrt(squash);
  return min(squash, inversesqrt(squash));
}

// Deform a VERTEX (the exact inverse of actionTransform, ops reversed).
vec3 actionForward(vec3 p) {
  if (uAction < 0.5) return p;
  float squash, yoff, zoff, lean, spin;
  actionCurves(squash, yoff, zoff, lean, spin);
  p.y *= squash;
  p.xz *= inversesqrt(squash);
  if (lean != 0.0) p.yz = rot(-lean) * (p.yz - vec2(0.35, 0.0)) + vec2(0.35, 0.0);
  if (spin != 0.0) p.xz = rot(-spin) * p.xz;
  p.y += yoff;
  p.z += zoff;
  return p;
}

// Rotate a normal through the verb's rotations (squash shear ignored — the
// deformations are small and toon shading hides it).
vec3 actionForwardNormal(vec3 n) {
  if (uAction < 0.5) return n;
  float squash, yoff, zoff, lean, spin;
  actionCurves(squash, yoff, zoff, lean, spin);
  if (lean != 0.0) n.yz = rot(-lean) * n.yz;
  if (spin != 0.0) n.xz = rot(-spin) * n.xz;
  return n;
}
`;
