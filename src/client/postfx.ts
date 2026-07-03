// HD-2D post-processing stack — the signature Octopath-style look:
// subtle bloom + tilt-shift depth blur + gentle vignette + warm color grade.
//
// Each screen owns its own PostFX instance (created in mount, disposed in
// unmount) and calls postfx.render(dt) instead of renderer.render(scene, cam).
//
// Pass chain (high quality):
//   RenderPass -> UnrealBloomPass -> H/V tilt-shift -> OutputPass
//   -> Vignette -> warm grade
// Bloom runs in linear space (before OutputPass tone-map/sRGB); vignette and
// grade are display-referred, so they run after.
//
// "low" quality (coarse pointers / very high DPR / weak GL): tilt-shift is
// skipped and bloom runs at half resolution; vignette + grade stay (cheap).

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { HorizontalTiltShiftShader } from "three/addons/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/addons/shaders/VerticalTiltShiftShader.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";

// ---- tuning --------------------------------------------------------------
const BLOOM_THRESHOLD = 0.75;
const BLOOM_STRENGTH = 0.35;
const BLOOM_RADIUS = 0.5;
// Tilt-shift: focus band at screen center; TILT_AMOUNT scales the per-pixel
// blur step (the shader's h/v uniform is amount / pixel-size).
const TILT_FOCUS = 0.5;
const TILT_AMOUNT = 1.35;
const VIGNETTE_OFFSET = 1.1;
const VIGNETTE_DARKNESS = 1.05;

/**
 * Tiny warm grade: lift shadows slightly toward dusky purple #2a2440,
 * +4% saturation, +2% warmth. Keeps the image crisp — no blur here.
 */
const WarmGradeShader = {
  name: "WarmGradeShader",
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D( tDiffuse, vUv );
      vec3 c = tex.rgb;
      // Shadow lift toward #2a2440 (fades out by mid-tones).
      vec3 lift = vec3( 0.165, 0.141, 0.251 );
      float luma = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      float shadow = 1.0 - smoothstep( 0.0, 0.35, luma );
      c = mix( c, max( c, lift ), shadow * 0.30 );
      // +4% saturation.
      float l2 = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
      c = mix( vec3( l2 ), c, 1.04 );
      // +2% warmth.
      c *= vec3( 1.02, 1.0, 0.98 );
      gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), tex.a );
    }`,
};

/** Device heuristics that don't need a GL context (evaluated at module load). */
function baseQuality(): "high" | "low" {
  const coarse =
    typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const highDpr = (globalThis.devicePixelRatio ?? 1) > 2.5;
  return coarse || highDpr ? "low" : "high";
}

let refinedWithGl = false;

export class PostFX {
  /**
   * Decided once at boot: "low" on coarse pointers (phones/tablets), very high
   * devicePixelRatio, or a weak WebGL context (refined on first construction).
   */
  static quality: "high" | "low" = baseQuality();

  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private readonly tiltH: ShaderPass | null = null;
  private readonly tiltV: ShaderPass | null = null;
  private readonly vignettePass: ShaderPass;
  private readonly gradePass: ShaderPass;
  private readonly outputPass: OutputPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // Refine the boot heuristic once we can see actual GL capabilities.
    if (!refinedWithGl) {
      refinedWithGl = true;
      const caps = renderer.capabilities;
      if (!caps.isWebGL2 || caps.maxTextureSize < 4096) PostFX.quality = "low";
    }

    this.renderer = renderer;
    const pr = renderer.getPixelRatio();
    const size = renderer.getSize(new THREE.Vector2());
    const low = PostFX.quality === "low";

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(size.x, size.y);

    this.composer.addPass(new RenderPass(scene, camera));

    // Bloom (linear space). On low quality, run its internal chain at half res.
    const bloomRes = new THREE.Vector2(
      Math.max(1, Math.round((size.x * pr) / (low ? 2 : 1))),
      Math.max(1, Math.round((size.y * pr) / (low ? 2 : 1))),
    );
    this.bloomPass = new UnrealBloomPass(bloomRes, BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
    this.composer.addPass(this.bloomPass);
    // addPass resizes every pass to the full buffer size — restore half res.
    if (low) this.bloomPass.setSize(bloomRes.x, bloomRes.y);

    // Tilt-shift depth-of-field fake (high quality only): crisp band across
    // screen center, gently blurring toward top (horizon) and bottom.
    if (!low) {
      this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
      this.tiltV = new ShaderPass(VerticalTiltShiftShader);
      this.tiltH.uniforms.r.value = TILT_FOCUS;
      this.tiltV.uniforms.r.value = TILT_FOCUS;
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }

    // Tone-map + linear->sRGB. Vignette and grade run after (display-referred).
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.offset.value = VIGNETTE_OFFSET;
    this.vignettePass.uniforms.darkness.value = VIGNETTE_DARKNESS;
    this.composer.addPass(this.vignettePass);

    this.gradePass = new ShaderPass(WarmGradeShader);
    this.composer.addPass(this.gradePass);

    this.applyTiltTexel(size.x * pr, size.y * pr);
  }

  /** Replaces renderer.render(scene, camera). */
  render(dt: number): void {
    this.composer.render(dt);
  }

  resize(width: number, height: number): void {
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(width, height);
    const low = PostFX.quality === "low";
    this.bloomPass.setSize(
      Math.max(1, Math.round((width * pr) / (low ? 2 : 1))),
      Math.max(1, Math.round((height * pr) / (low ? 2 : 1))),
    );
    this.applyTiltTexel(width * pr, height * pr);
  }

  dispose(): void {
    this.composer.dispose(); // frees composer render targets + copy pass
    this.bloomPass.dispose();
    this.outputPass.dispose();
    this.tiltH?.dispose();
    this.tiltV?.dispose();
    this.vignettePass.dispose();
    this.gradePass.dispose();
  }

  private applyTiltTexel(pxWidth: number, pxHeight: number): void {
    if (this.tiltH) this.tiltH.uniforms.h.value = TILT_AMOUNT / Math.max(1, pxWidth);
    if (this.tiltV) this.tiltV.uniforms.v.value = TILT_AMOUNT / Math.max(1, pxHeight);
  }
}
