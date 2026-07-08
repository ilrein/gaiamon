// Runtime procedural creature: baked SDF geometry + a ShaderMaterial that
// paints with the species' own albedo GLSL (in undeformed local space) and
// runs the verb system as a forward vertex deformation. One draw call,
// works under scene lighting conventions (toon ramp with a sun uniform),
// battle-ready hooks: setFlash / setOpacity / setTip / playVerb.

import * as THREE from "three";
import { PROTO } from "../../data/proto";
import { bakeSpecies } from "./proto-bake";
import {
  PROTO_UNIFORMS_GLSL,
  PROTO_TOOLKIT_GLSL,
  PROTO_ACTIONS_GLSL,
} from "./proto-shaders";

export type ProtoVerb = "hop" | "attack" | "hit" | "faint" | "celebrate";
const VERB_INDEX: Record<ProtoVerb, number> = {
  hop: 1,
  attack: 2,
  hit: 3,
  faint: 4,
  celebrate: 5,
};

export interface ProtoCreature {
  /** Add to the scene; feet sit at the group origin. */
  group: THREE.Group;
  mesh: THREE.Mesh;
  /** World-unit height at rest. */
  height: number;
  /** Drive with an absolute clock (freezes when the clock freezes). */
  update(t: number): void;
  playVerb(verb: ProtoVerb): void;
  clearVerb(): void;
  /** Shiny hue-rotation in radians; 0 = normal. */
  setSeed(rad: number): void;
  setFlash(o: number): void;
  setOpacity(o: number): void;
  /** Match darker scenes: 1 = battle noon, ~0.7 = overworld dusk. */
  setExposure(e: number): void;
  /** Faint tip-over about the feet (battle convention). */
  setTip(rad: number): void;
  setScale(x: number, y: number): void;
  dispose(): void;
}

const VERT = /* glsl */ `
${PROTO_UNIFORMS_GLSL}
${PROTO_TOOLKIT_GLSL}
${PROTO_ACTIONS_GLSL}
uniform float uPhase;
in float aMat;
out vec3 vLocal;
out vec3 vWorldPos;
out vec3 vNormalW;
flat out float vMat;

void main() {
  vLocal = position;
  vMat = aMat;
  vec3 p = position;
  // idle layer: gentle breathe + sway, weighted by height so feet stay put
  float hw = smoothstep(0.05, 1.1, p.y);
  p.x += sin(uTime * 1.4 + uPhase) * 0.018 * hw;
  p.y *= 1.0 + 0.012 * sin(uTime * 2.2 + uPhase) * hw;
  // verb layer
  p = actionForward(p);
  vec3 n = actionForwardNormal(normal);
  vNormalW = normalize(mat3(modelMatrix) * n);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

function makeFrag(speciesGlsl: string): string {
  return /* glsl */ `
precision highp float;
${PROTO_UNIFORMS_GLSL}
${PROTO_TOOLKIT_GLSL}
${PROTO_ACTIONS_GLSL}
${speciesGlsl}
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uFlash;
uniform float uOpacity;
uniform float uExposure; // scene-match dimmer (overworld dusk vs battle noon)
in vec3 vLocal;
in vec3 vWorldPos;
in vec3 vNormalW;
flat in float vMat;
out vec4 outColor;

void main() {
  float gloss, emissive;
  vec3 alb = speciesAlbedo(vLocal, floor(vMat + 0.5), gloss, emissive);
  if (uSeed != 0.0) alb = hueShift(alb, uSeed); // shiny variant

  vec3 n = normalize(vNormalW);
  // plush micro-detail: same fuzzy-normal trick as the raymarched shell —
  // without it the smooth baked normals read as plastic
  vec3 fuzz = vec3(
    fbm(vLocal * 28.0), fbm(vLocal * 28.0 + 17.1), fbm(vLocal * 28.0 + 31.7)) - 0.5;
  n = normalize(n + fuzz * 0.22 * (1.0 - gloss) * (1.0 - emissive));

  float dif = dot(n, uSunDir);
  // same toon ramp / rim / bounce family as the raymarched shell; ambient
  // runs lower here because there is no baked AO to attenuate it
  float band = 0.62 * smoothstep(-0.10, 0.18, dif) + 0.38 * smoothstep(0.30, 0.55, dif);
  // fake crevice occlusion: down-facing + concave-ish regions get less sky
  float ao = mix(0.72, 1.0, smoothstep(-0.6, 0.5, n.y));
  vec3 col = alb * band * uSunCol;
  col += alb * mix(vec3(0.30, 0.36, 0.30), vec3(0.55, 0.68, 0.80), n.y * 0.5 + 0.5) * 0.42 * ao;
  col += alb * max(-n.y, 0.0) * vec3(0.40, 0.55, 0.32) * 0.40;
  vec3 vd = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, vd), 0.0), 3.5);
  col += rim * vec3(0.65, 0.85, 1.0) * 0.22 * ao;
  vec3 hv = normalize(uSunDir + vd);
  col += gloss * pow(max(dot(n, hv), 0.0), 90.0) * 1.5;
  // self-lit surfaces (kept gentle so saturated colours don't clamp white)
  col = mix(col, alb * 1.05, emissive);
  col += alb * emissive * 0.18;
  // hit flash: verb-driven or battle-driven
  col = mix(col, vec3(1.0, 0.96, 0.90) * 1.4, clamp(max(actionFlash(), uFlash), 0.0, 1.0));

  col = pow(clamp(col * uExposure, 0.0, 1.0), vec3(1.0 / 2.2));
  // gentle saturation lift, matching the raymarched shell's grade
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.08);
  outColor = vec4(col, uOpacity);
}
`;
}

export function buildProtoCreature(
  renderer: THREE.WebGLRenderer,
  speciesId: string,
  /** World height to scale to; pass 0 to keep the authored local scale. */
  targetHeight: number,
): ProtoCreature | null {
  const species = PROTO[speciesId];
  if (!species) return null;
  const baked = bakeSpecies(renderer, speciesId);
  if (!baked || baked.positions.length === 0) return null;
  if (targetHeight <= 0) targetHeight = baked.height;

  // Fresh geometry per creature: battle unmount disposes everything it can
  // reach in the scene, so GPU buffers must not be shared across views.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(baked.positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(baked.normals, 3));
  geometry.setAttribute("aMat", new THREE.BufferAttribute(baked.mats, 1));

  const uniforms = {
    uTime: { value: 0 },
    uAction: { value: 0 },
    uActionT: { value: 0 },
    uSeed: { value: 0 },
    uPhase: { value: Math.random() * Math.PI * 2 },
    uFlash: { value: 0 },
    uOpacity: { value: 1 },
    uExposure: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0.55, 0.9, 0.45).normalize() },
    uSunCol: { value: new THREE.Vector3(1.25, 1.1625, 1.0) },
  };
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: makeFrag(species.glsl),
    uniforms,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const s = targetHeight / Math.max(0.01, baked.height);
  mesh.scale.setScalar(s);
  mesh.position.y = -baked.minY * s;

  // inner carries tip-over so verbs and battle tweens compose cleanly
  const inner = new THREE.Group();
  inner.add(mesh);
  const group = new THREE.Group();
  group.add(inner);

  let lastT = 0;
  let verbStart = -1e9;

  return {
    group,
    mesh,
    height: targetHeight,
    update(t: number) {
      lastT = t;
      uniforms.uTime.value = t;
      uniforms.uActionT.value = t - verbStart;
    },
    playVerb(verb: ProtoVerb) {
      uniforms.uAction.value = VERB_INDEX[verb];
      verbStart = lastT;
      uniforms.uActionT.value = 0;
    },
    clearVerb() {
      uniforms.uAction.value = 0;
    },
    setSeed(rad: number) {
      uniforms.uSeed.value = rad;
    },
    setFlash(o: number) {
      uniforms.uFlash.value = o;
    },
    setOpacity(o: number) {
      uniforms.uOpacity.value = o;
    },
    setExposure(e: number) {
      uniforms.uExposure.value = e;
    },
    setTip(rad: number) {
      inner.rotation.z = rad;
    },
    setScale(x: number, y: number) {
      const base = targetHeight / Math.max(0.01, baked.height);
      mesh.scale.set(base * (x / targetHeight), base * (y / targetHeight), base * (x / targetHeight));
      mesh.position.y = -baked.minY * base * (y / targetHeight);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
