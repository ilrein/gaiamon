// Procedural Workshop (codex): /proto-preview.html?species=fernby
//   [&angle=hero|front|side|back][&spin=0][&t=2.2][&action=hit&at=0.1]
//   [&px=1][&fps=30]
//
// Fully procedural creatures as raymarched signed distance fields — no
// voxels, no model files, no rig, no keyframes. This file is the SHELL:
// camera, lighting, ground, raymarcher, and the two-layer animation system
// (idle + action verbs). Each species contributes a GLSL chunk defining
// speciesMap/speciesAlbedo — see src/data/proto/ and
// design/PROCEDURAL-CREATURES.md. scripts/proto-shot.mjs screenshots this
// page headlessly.

import * as THREE from "three";
import { PROTO } from "../data/proto";
import {
  PROTO_UNIFORMS_GLSL,
  PROTO_TOOLKIT_GLSL,
  PROTO_ACTIONS_GLSL,
} from "./world/proto-shaders";

const params = new URLSearchParams(location.search);
const speciesId = params.get("species") ?? "fernby";
const species = PROTO[speciesId] ?? PROTO.fernby;
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
// Shiny variant: ?seed=<radians> or ?shiny=1 for the house shiny hue
const seed = params.get("seed")
  ? parseFloat(params.get("seed")!)
  : params.get("shiny") === "1"
    ? 2.6
    : 0;

document.getElementById("label")!.textContent = `${species.name} — procedural SDF`;

// Codex picker: one pill per registered species.
const picker = document.getElementById("species");
if (picker) {
  for (const [id, s] of Object.entries(PROTO)) {
    const btn = document.createElement("button");
    btn.textContent = s.name;
    if (id === speciesId) btn.classList.add("active");
    btn.addEventListener("click", () => {
      const url = new URL(location.href);
      url.searchParams.set("species", id);
      location.href = url.toString();
    });
    picker.appendChild(btn);
  }
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(px);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("stage")!.appendChild(renderer.domElement);

const FRAG_PRE =
  /* glsl */ `
precision highp float;

uniform vec2 uRes;
uniform vec3 uCamPos;
uniform vec3 uCamTarget;
` +
  PROTO_UNIFORMS_GLSL +
  PROTO_TOOLKIT_GLSL +
  PROTO_ACTIONS_GLSL;

const FRAG_POST = /* glsl */ `
vec2 mapCreature(vec3 p) {
  // Bounding sphere: most rays (sky, open ground) never get near the
  // creature — give them a cheap unscaled distance and skip the full part
  // evaluation. Sized to contain every action deformation (faint's 1.62x
  // xz bulge puts the widest parts ~1.5 from centre).
  float dBound = length(p - vec3(0.0, 0.55, 0.0)) - 1.55;
  if (dBound > 0.2) return vec2(dBound, 0.0);

  float dScale = actionTransform(p);
  vec2 r = speciesMap(p);
  return vec2(r.x * dScale, r.y);
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
  // paint in the creature's undeformed local space so face masks and fur
  // stick to the surface through action deformations
  vec3 q = pos;
  actionTransform(q);
  float gloss, emissive;
  vec3 alb = speciesAlbedo(q, hit.y, gloss, emissive);
  if (uSeed != 0.0) alb = hueShift(alb, uSeed); // shiny variant

  // fuzzy normal for plush surfaces (not eyes, not self-lit parts)
  vec3 fuzz = vec3(
    fbm(q * 28.0), fbm(q * 28.0 + 17.1), fbm(q * 28.0 + 31.7)) - 0.5;
  n = normalize(n + fuzz * 0.22 * (1.0 - gloss) * (1.0 - emissive));

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
  // wet glossy highlights (eyes)
  vec3 hv = normalize(SUN_DIR - rd);
  col += gloss * pow(max(dot(n, hv), 0.0), 90.0) * vec3(1.0) * 1.5;
  // faint warm subsurface on thin lit edges
  float sss = pow(clamp(dot(rd, SUN_DIR), 0.0, 1.0), 3.0) * rim;
  col += sss * vec3(0.5, 0.8, 0.25) * 0.35;
  // self-lit surfaces override the lighting; keep the multiplier gentle so
  // saturated flame colours don't clamp toward white
  col = mix(col, alb * 1.05, emissive);
  col += alb * emissive * 0.18;
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
  uSeed: { value: seed },
};

const scene = new THREE.Scene();
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
scene.add(
  new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      fragmentShader: FRAG_PRE + species.glsl + FRAG_POST,
      uniforms,
    }),
  ),
);

const ANGLES: Record<string, [number, number, number]> = {
  hero: [1.9, 1.35, 2.5],
  front: [0, 0.95, 3.1],
  side: [3.1, 0.9, 0],
  back: [0, 1.05, -3.1],
};
const basePos = new THREE.Vector3(...(ANGLES[angle] ?? ANGLES.hero));

// Drag to orbit: spherical coords around the look target. The auto-spin
// runs until the first drag, then the user owns the camera.
const target = uniforms.uCamTarget.value;
const camOff = basePos.clone().sub(target);
const camR = camOff.length();
const yaw0 = Math.atan2(camOff.x, camOff.z);
const pitch0 = Math.asin(camOff.y / camR);
let dragYaw = 0;
let dragPitch = 0;
let manual = false;
let manualSpin = 0;
let curSpin = 0;

// Verb buttons: each press restarts the verb; faint holds until another press.
let liveT = 0;
let actionStart = -1e9;
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
  curSpin = manual ? manualSpin : spin && frozenT === null ? t * 0.25 : 0;
  const yaw = yaw0 + curSpin + dragYaw;
  const pitch = Math.min(1.3, Math.max(0.05, pitch0 + dragPitch));
  uniforms.uCamPos.value.set(
    target.x + camR * Math.sin(yaw) * Math.cos(pitch),
    target.y + camR * Math.sin(pitch),
    target.z + camR * Math.cos(yaw) * Math.cos(pitch),
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

// Orbit input (mouse + touch via pointer events). Drag right → the creature
// turns with your hand; drag up → look down from higher.
const canvas = renderer.domElement;
canvas.style.touchAction = "none";
canvas.style.cursor = "grab";
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener("pointerdown", (ev) => {
  dragging = true;
  if (!manual) {
    manual = true;
    manualSpin = curSpin; // take over from the auto-spin without a jump
  }
  lastX = ev.clientX;
  lastY = ev.clientY;
  canvas.setPointerCapture(ev.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (ev) => {
  if (!dragging) return;
  dragYaw -= (ev.clientX - lastX) * 0.006;
  dragPitch += (ev.clientY - lastY) * 0.004;
  dragPitch = Math.min(1.3 - pitch0, Math.max(0.05 - pitch0, dragPitch));
  lastX = ev.clientX;
  lastY = ev.clientY;
  lastFrame = -1e9; // render this move even on a frozen/paced page
  renderer.setAnimationLoop(frame);
});
for (const evName of ["pointerup", "pointercancel"] as const) {
  canvas.addEventListener(evName, () => {
    dragging = false;
    canvas.style.cursor = "grab";
  });
}
