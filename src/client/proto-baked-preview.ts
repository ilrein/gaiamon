// Baked-mesh preview: /proto-preview.html?mode=baked&species=fernby
//   [&angle=hero|front|side|back][&spin=0][&t=2.2][&action=hit&at=0.1]
//   [&shiny=1|&seed=2.6][&px=1]
// Renders the SAME species through the marching-cubes bake + vertex-verb
// pipeline that battles use (proto-bake.ts / proto-mesh.ts), on a meadow
// pedestal matching the raymarched reference for apples-to-apples shots.

import * as THREE from "three";
import { PROTO } from "../data/proto";
import { buildProtoCreature } from "./world/proto-mesh";

const params = new URLSearchParams(location.search);
const speciesId = params.get("species") ?? "fernby";
const spin = params.get("spin") !== "0";
const angle = params.get("angle") ?? "hero";
const frozenT = params.get("t") ? parseFloat(params.get("t")!) : null;
const px = params.get("px") ? parseFloat(params.get("px")!) : 1;
const ACTIONS = ["hop", "attack", "hit", "faint", "celebrate"] as const;
const urlAction = params.get("action");
const urlAt = params.get("at") ? parseFloat(params.get("at")!) : null;
const seed = params.get("seed")
  ? parseFloat(params.get("seed")!)
  : params.get("shiny") === "1"
    ? 2.6
    : 0;

const species = PROTO[speciesId] ?? PROTO.fernby;
document.getElementById("label")!.textContent = `${species.name} — baked mesh`;

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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(px);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("stage")!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#8ec4e4");
scene.fog = new THREE.Fog("#a5d2e8", 8, 22);

// meadow ground (creature material lights itself; these lights are scenery)
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7aa95c, 1.1));
const sun = new THREE.DirectionalLight(0xfff2d9, 1.6);
sun.position.set(4, 8, 5);
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(24, 48).rotateX(-Math.PI / 2),
  new THREE.MeshLambertMaterial({ color: "#8fce6a" }),
);
scene.add(ground);
// soft blob contact shadow
const shadowTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(30,50,25,0.45)");
  grad.addColorStop(1, "rgba(30,50,25,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const blob = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
);
blob.position.y = 0.01;
scene.add(blob);

// natural authored scale, so shots line up 1:1 with the raymarched page
const creature = buildProtoCreature(renderer, speciesId, 0);
if (creature) {
  creature.setSeed(seed);
  scene.add(creature.group);
  if (urlAction) {
    creature.playVerb(urlAction as (typeof ACTIONS)[number]);
  }
}

// match the raymarched shell's ray spread (rd focal 1.9 → ~55.5° vertical)
const camera = new THREE.PerspectiveCamera(
  (2 * Math.atan(1 / 1.9) * 180) / Math.PI,
  innerWidth / innerHeight,
  0.1,
  60,
);
const ANGLES: Record<string, [number, number, number]> = {
  hero: [1.9, 1.35, 2.5],
  front: [0, 0.95, 3.1],
  side: [3.1, 0.9, 0],
  back: [0, 1.05, -3.1],
};
const basePos = new THREE.Vector3(...(ANGLES[angle] ?? ANGLES.hero));
const target = new THREE.Vector3(0, 0.62, 0);
const camOff = basePos.clone().sub(target);
const camR = camOff.length();
const yaw0 = Math.atan2(camOff.x, camOff.z);
const pitch0 = Math.asin(camOff.y / camR);
let dragYaw = 0;
let dragPitch = 0;
let manual = false;
let manualSpin = 0;
let curSpin = 0;

// verb buttons
let liveT = 0;
const bar = document.getElementById("actions");
if (bar && creature) {
  for (const name of ACTIONS) {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.addEventListener("click", () => {
      creature.playVerb(name);
      renderer.setAnimationLoop(frame);
    });
    bar.appendChild(btn);
  }
}

const clock = new THREE.Clock();
function frame() {
  if (document.hidden) return;
  const t = frozenT ?? clock.getElapsedTime();
  liveT = t;
  // frozen verb pose for headless captures: playVerb ran at start=0, so an
  // absolute clock of urlAt gives uActionT = urlAt exactly
  if (creature) {
    creature.update(urlAt !== null ? urlAt : t);
    // ?walk=1 previews the gait (phase ~ walking speed 1.4 units/s)
    if (params.get("walk") === "1") {
      creature.setGait(1, ((urlAt !== null ? urlAt : t) * 1.4 * Math.PI * 2) / 0.55);
    }
  }
  curSpin = manual ? manualSpin : spin && frozenT === null ? t * 0.25 : 0;
  const yaw = yaw0 + curSpin + dragYaw;
  const pitch = Math.min(1.3, Math.max(0.05, pitch0 + dragPitch));
  camera.position.set(
    target.x + camR * Math.sin(yaw) * Math.cos(pitch),
    target.y + camR * Math.sin(pitch),
    target.z + camR * Math.cos(yaw) * Math.cos(pitch),
  );
  camera.lookAt(target);
  renderer.render(scene, camera);
  if (frozenT !== null) renderer.setAnimationLoop(null);
}
renderer.setAnimationLoop(frame);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setAnimationLoop(frame);
});

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
    manualSpin = curSpin;
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
  renderer.setAnimationLoop(frame);
});
for (const evName of ["pointerup", "pointercancel"] as const) {
  canvas.addEventListener(evName, () => {
    dragging = false;
    canvas.style.cursor = "grab";
  });
}
