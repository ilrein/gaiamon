// Voxel Workshop: /voxel-preview.html?species=fernby[&spin=0][&angle=front]
// Renders a voxel creature large on a diorama pedestal for authoring
// iteration. scripts/voxel-shot.mjs screenshots this page headlessly.

import * as THREE from "three";
import { VOXELS } from "../data/voxels";
import { SPECIES } from "../data/species";
import { buildVoxelMesh } from "./world/voxel";

const params = new URLSearchParams(location.search);
const speciesId = params.get("species") ?? "fernby";
const spin = params.get("spin") !== "0";
const angle = params.get("angle") ?? "hero"; // hero | front | side | back

const model = VOXELS[speciesId];
const label = document.getElementById("label")!;
label.textContent = model
  ? `${SPECIES[speciesId]?.name ?? speciesId} — voxel`
  : `${speciesId}: NO VOXEL MODEL`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("stage")!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#9fd4ec");

const sun = new THREE.DirectionalLight(0xfff2d9, 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7aa95c, 1.1));

// Pedestal
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.75, 0.35, 40),
  new THREE.MeshLambertMaterial({ color: "#8fce6a" }),
);
pedestal.position.y = -0.175;
pedestal.receiveShadow = true;
scene.add(pedestal);

if (model) {
  const { mesh } = buildVoxelMesh(model, 2.0);
  scene.add(mesh);

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 50);
  const angles: Record<string, [number, number, number]> = {
    hero: [2.6, 2.2, 3.4],
    front: [0, 1.3, 4.4],
    side: [4.4, 1.3, 0],
    back: [0, 1.5, -4.4],
  };
  const [cx, cy, cz] = angles[angle] ?? angles.hero;
  camera.position.set(cx, cy, cz);
  camera.lookAt(0, 0.95, 0);

  let t = 0;
  renderer.setAnimationLoop(() => {
    if (spin) {
      t += 0.004;
      mesh.rotation.y = t;
    }
    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
