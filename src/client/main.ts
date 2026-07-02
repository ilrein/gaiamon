import * as THREE from "three";
import { buildWorld } from "./world";
import { Player } from "./player";

const app = document.getElementById("app")!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
buildWorld(scene);
const player = new Player(scene);

// Long lens + tilted-down angle is the 2.5D "diorama" framing.
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
const CAMERA_OFFSET = new THREE.Vector3(0, 11, 10);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt);

  // Smooth follow-cam.
  const desired = player.position.clone().add(CAMERA_OFFSET);
  camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
  lookTarget.lerp(player.position, 1 - Math.exp(-6 * dt));
  camera.lookAt(lookTarget.x, lookTarget.y + 1, lookTarget.z);

  renderer.render(scene, camera);
});

// Server heartbeat — proves the worker API is reachable from the client.
const statusDot = document.getElementById("status")!;
const statusText = document.getElementById("status-text")!;
fetch("/api/health")
  .then((r) => r.json())
  .then(() => {
    statusDot.style.background = "#7ef29a";
    statusText.textContent = "online";
  })
  .catch(() => {
    statusDot.style.background = "#f2a17e";
    statusText.textContent = "offline";
  });
