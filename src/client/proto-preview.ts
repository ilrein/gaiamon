// Procedural Workshop: /proto-preview.html[&angle=hero|front|side|back][&spin=0][&t=2.2][&px=1]
//
// PROTOTYPE — a fully procedural creature (fernby) as a raymarched signed
// distance field. No voxels, no model file, no rig, no keyframes:
//   - geometry: smooth-min blended ellipsoids/capsules + a sphere-chain
//     fiddlehead spiral, with fbm surface noise for a mossy silhouette
//   - shading: toon-banded key light, sky/bounce ambient, SDF soft shadows,
//     ambient occlusion, rim light, painted face masks (eyes/nose/smile/blush)
//   - animation: breathing, tail sway, ear wobble, blinking — all driven by
//     a single time uniform inside the shader
// scripts/proto-shot.mjs screenshots this page headlessly.

import * as THREE from "three";

const params = new URLSearchParams(location.search);
const spin = params.get("spin") !== "0";
const angle = params.get("angle") ?? "hero";
const frozenT = params.get("t") ? parseFloat(params.get("t")!) : null;
// Raymarching cost scales with pixels: default to 1x (not devicePixelRatio —
// 2x Retina would quadruple the work and the canvas framebuffer memory).
// The soft plush look upscales fine. Bump with ?px=2 for crisp captures.
const px = params.get("px") ? parseFloat(params.get("px")!) : 1;
const fpsCap = params.get("fps") ? parseFloat(params.get("fps")!) : 30;
// Freeze a verb mid-pose for headless captures: ?action=hit&at=0.1
const ACTIONS = ["hop", "attack", "hit", "faint", "celebrate"] as const;
const urlAction = params.get("action");
const urlAt = params.get("at") ? parseFloat(params.get("at")!) : null;

document.getElementById("label")!.textContent = "Fernby — procedural SDF prototype";

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(px);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("stage")!.appendChild(renderer.domElement);

const FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform vec3 uCamPos;
uniform vec3 uCamTarget;
// action verb layer: 0 none, 1 hop, 2 attack, 3 hit, 4 faint, 5 celebrate
uniform float uAction;
uniform float uActionT; // seconds since the verb started

// ---------- noise ----------
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

// ---------- sdf toolkit ----------
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

// ---------- action verbs ----------
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

// Deform the sample point (inverse of deforming the creature) and return a
// distance-scale factor that keeps the march conservative under squash.
float actionTransform(inout vec3 p) {
  if (uAction < 0.5) return 1.0;
  float squash = 1.0, yoff = 0.0, zoff = 0.0, lean = 0.0, spin = 0.0;
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
  p.y -= yoff;
  p.z -= zoff;
  if (spin != 0.0) p.xz = rot(spin) * p.xz;
  if (lean != 0.0) p.yz = rot(lean) * (p.yz - vec2(0.35, 0.0)) + vec2(0.35, 0.0);
  // squash about the ground plane, conserving volume
  p.y /= squash;
  p.xz *= sqrt(squash);
  return min(squash, inversesqrt(squash));
}

// material ids: 0 moss body, 2 dark feet, 3 tail stem, 4 coil moss, 5 tip/frond light
vec2 mapCreature(vec3 p) {
  // Bounding sphere: most rays (sky, open ground) never get near the
  // creature — give them a cheap unscaled distance and skip the full part
  // evaluation. Sized to contain every action deformation (faint's 1.62x
  // xz bulge puts the tail at ~1.5 from centre).
  float dBound = length(p - vec3(0.0, 0.55, 0.0)) - 1.55;
  if (dBound > 0.2) return vec2(dBound, 0.0);

  float dScale = actionTransform(p);
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

  return vec2(d * dScale, m);
}

vec3 calcNormal(vec3 p) {
  const vec2 h = vec2(0.0025, -0.0025);
  return normalize(
    h.xyy * mapCreature(p + h.xyy).x + h.yyx * mapCreature(p + h.yyx).x +
    h.yxy * mapCreature(p + h.yxy).x + h.xxx * mapCreature(p + h.xxx).x);
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 32; i++) {
    float h = mapCreature(ro + rd * t).x;
    res = min(res, 14.0 * h / t);
    t += clamp(h, 0.01, 0.12);
    if (res < 0.005 || t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0, sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.11 * float(i) / 4.0;
    occ += (h - mapCreature(p + n * h).x) * sca;
    sca *= 0.9;
  }
  return clamp(1.0 - 2.2 * occ, 0.0, 1.0);
}

// ---------- painted face + palette (matches the voxel palette) ----------
const vec3 MOSS = vec3(0.498, 0.682, 0.322);      // #7fae52
const vec3 MOSS_LIGHT = vec3(0.608, 0.800, 0.416); // #9bcc6a
const vec3 CREAM = vec3(0.957, 0.925, 0.824);      // #f4ecd2
const vec3 DARK = vec3(0.184, 0.153, 0.137);       // #2f2723
const vec3 MOSS_DARK = vec3(0.365, 0.514, 0.251);  // #5d8340
const vec3 BLUSH = vec3(0.957, 0.663, 0.627);      // #f4a9a0

vec3 albedo(vec3 p, float m, out float eyeGloss) {
  eyeGloss = 0.0;
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
      eyeGloss = smoothstep(1.0, 0.85, eye);
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

// ---------- scene ----------
const vec3 SUN_DIR = normalize(vec3(0.55, 0.9, 0.45));
const vec3 SUN_COL = vec3(1.0, 0.93, 0.80) * 1.25;

vec3 skyColor(vec3 rd) {
  vec3 sky = mix(vec3(0.62, 0.80, 0.92), vec3(0.42, 0.66, 0.88), smoothstep(-0.1, 0.5, rd.y));
  sky += vec3(1.0, 0.9, 0.7) * 0.35 * pow(max(dot(rd, SUN_DIR), 0.0), 8.0);
  // soft drifting cloud bands
  float cl = fbm(vec3(rd.x * 3.0 + uTime * 0.01, rd.y * 6.0, rd.z * 3.0));
  sky = mix(sky, vec3(0.95, 0.97, 1.0), smoothstep(0.62, 0.85, cl) * smoothstep(0.05, 0.3, rd.y) * 0.5);
  return sky;
}

vec3 shadeCreature(vec3 pos, vec3 rd) {
  vec2 hit = mapCreature(pos);
  vec3 n = calcNormal(pos);
  // paint in the creature's undeformed local space so face masks and moss
  // stick to the surface through action deformations
  vec3 q = pos;
  actionTransform(q);
  float eyeGloss;
  vec3 alb = albedo(q, hit.y, eyeGloss);

  // fuzzy normal for the mossy body (not the eyes)
  vec3 fuzz = vec3(
    fbm(q * 28.0), fbm(q * 28.0 + 17.1), fbm(q * 28.0 + 31.7)) - 0.5;
  n = normalize(n + fuzz * 0.22 * (1.0 - eyeGloss));

  float dif = dot(n, SUN_DIR);
  // toon ramp: two soft bands
  float band = 0.62 * smoothstep(-0.10, 0.18, dif) + 0.38 * smoothstep(0.30, 0.55, dif);
  float sh = softShadow(pos + n * 0.012, SUN_DIR);
  float ao = calcAO(pos, n);

  vec3 col = alb * band * SUN_COL * sh;
  // sky ambient + green ground bounce
  col += alb * mix(vec3(0.30, 0.36, 0.30), vec3(0.55, 0.68, 0.80), n.y * 0.5 + 0.5) * 0.55 * ao;
  col += alb * max(-n.y, 0.0) * vec3(0.40, 0.55, 0.32) * 0.45 * ao;
  // cool rim
  float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.5);
  col += rim * vec3(0.65, 0.85, 1.0) * 0.30 * ao;
  // wet glossy eyes
  vec3 h = normalize(SUN_DIR - rd);
  col += eyeGloss * pow(max(dot(n, h), 0.0), 90.0) * vec3(1.0) * 1.5;
  // faint warm subsurface on thin lit edges (ears, fronds)
  float sss = pow(clamp(dot(rd, SUN_DIR), 0.0, 1.0), 3.0) * rim;
  col += sss * vec3(0.5, 0.8, 0.25) * 0.35;
  // impact flash
  col = mix(col, vec3(1.0, 0.96, 0.90) * 1.4, actionFlash());
  return col;
}

vec3 shadeGround(vec3 pos, vec3 rd) {
  float r = length(pos.xz);
  // grassy pedestal disc fading into meadow
  vec3 grass = mix(vec3(0.56, 0.81, 0.42), vec3(0.44, 0.70, 0.36), fbm(pos * vec3(9.0, 1.0, 9.0)));
  grass = mix(grass, vec3(0.52, 0.76, 0.48), smoothstep(1.1, 2.6, r));
  // scattered tiny clovers
  grass = mix(grass, vec3(0.72, 0.88, 0.50), smoothstep(0.78, 0.92, noise(pos * 24.0)) * 0.35);

  float sh = softShadow(pos + vec3(0.0, 0.01, 0.0), SUN_DIR);
  // contact occlusion under the creature
  float contact = clamp(mapCreature(pos + vec3(0.0, 0.12, 0.0)).x / 0.12, 0.0, 1.0);
  float dif = max(dot(vec3(0.0, 1.0, 0.0), SUN_DIR), 0.0);
  vec3 col = grass * (dif * SUN_COL * sh * (0.35 + 0.65 * contact) + vec3(0.45, 0.55, 0.62));
  // fade to sky with distance
  return mix(col, skyColor(rd), smoothstep(2.0, 7.0, r));
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;

  vec3 ro = uCamPos;
  vec3 ww = normalize(uCamTarget - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.9 * ww);

  vec3 col;
  // march the creature
  float t = 0.0, hitT = -1.0;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    float d = mapCreature(p).x;
    if (d < 0.0012 * t) { hitT = t; break; }
    t += d * 0.85;
    if (t > 12.0) break;
  }
  // analytic ground plane
  float groundT = rd.y < -0.0001 ? -ro.y / rd.y : 1e9;

  if (hitT > 0.0 && hitT < groundT) {
    col = shadeCreature(ro + rd * hitT, rd);
  } else if (groundT < 1e8) {
    col = shadeGround(ro + rd * groundT, rd);
  } else {
    col = skyColor(rd);
  }

  // grade: gamma, gentle saturation lift, vignette
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.08);
  float vig = 1.0 - 0.25 * pow(length(uv * vec2(0.75, 0.9)), 2.5);
  col *= vig;
  gl_FragColor = vec4(col, 1.0);
}
`;

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2() },
  uCamPos: { value: new THREE.Vector3() },
  uCamTarget: { value: new THREE.Vector3(0, 0.62, 0) },
  uAction: { value: urlAction ? ACTIONS.indexOf(urlAction as (typeof ACTIONS)[number]) + 1 : 0 },
  uActionT: { value: urlAt ?? 0 },
};

const scene = new THREE.Scene();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
scene.add(
  new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ fragmentShader: FRAG, uniforms }),
  ),
);

const ANGLES: Record<string, [number, number, number]> = {
  hero: [1.9, 1.35, 2.5],
  front: [0, 0.95, 3.1],
  side: [3.1, 0.9, 0],
  back: [0, 1.05, -3.1],
};
const basePos = new THREE.Vector3(...(ANGLES[angle] ?? ANGLES.hero));

// Verb buttons: each press restarts the verb; faint holds until another press.
let liveT = 0;
const bar = document.getElementById("actions");
if (bar) {
  for (const [i, name] of ACTIONS.entries()) {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.addEventListener("click", () => {
      uniforms.uAction.value = i + 1;
      uniforms.uActionT.value = 0;
      actionStart = liveT;
      renderer.setAnimationLoop(frame); // wake a frozen page
    });
    bar.appendChild(btn);
  }
}
let actionStart = -1e9;

const clock = new THREE.Clock();
let lastFrame = -1e9;
function frame(now: number) {
  // skip work while the tab is hidden, and pace to the fps cap
  if (document.hidden) return;
  if (now - lastFrame < 1000 / fpsCap - 1) return;
  lastFrame = now;
  const t = frozenT ?? clock.getElapsedTime();
  liveT = t;
  uniforms.uTime.value = t;
  if (urlAt === null) uniforms.uActionT.value = t - actionStart;
  uniforms.uRes.value.set(
    renderer.domElement.width,
    renderer.domElement.height,
  );
  const spinA = spin && frozenT === null ? t * 0.25 : 0;
  uniforms.uCamPos.value.set(
    basePos.x * Math.cos(spinA) + basePos.z * Math.sin(spinA),
    basePos.y,
    -basePos.x * Math.sin(spinA) + basePos.z * Math.cos(spinA),
  );
  renderer.render(scene, quadCam);
  // frozen time = static image: one frame is enough, stop the loop
  if (frozenT !== null) renderer.setAnimationLoop(null);
}
renderer.setAnimationLoop(frame);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  // restart the loop so a frozen frame re-renders at the new size
  lastFrame = -1e9;
  renderer.setAnimationLoop(frame);
});
