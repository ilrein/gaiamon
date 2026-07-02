// 4-direction walking character sprites, using the CC0 Openmon walk-cycle
// sheets by Screen Smith (see assets/screensmith/openmon-npc-set-1/LICENSE.md).
// Each character sheet is 3 walk frames x 4 direction rows (down, left,
// right, up), sliced by scripts/slice-npcs.mjs into
// public/sprites/npcs/walker-<n>.png.

import * as THREE from "three";

export const WALKER_COUNT = 15;
/** Walker index reserved for the player. */
export const PLAYER_WALKER = 0;

const FRAME_COLS = 3;
const FRAME_ROWS = 4;
/** Direction row order in the sheets, top to bottom. */
const ROW_OF_DIR: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
/** 3-frame walk played as a 4-beat cycle. */
const WALK_SEQUENCE = [0, 1, 2, 1];
const WALK_FPS = 7;
const IDLE_FRAME = 1;

export type Direction = "down" | "left" | "right" | "up";

const loader = new THREE.TextureLoader();
const sheetCache = new Map<number, THREE.Texture>();

function sheet(index: number): THREE.Texture {
  const cached = sheetCache.get(index);
  if (cached) return cached;
  const tex = loader.load(`/sprites/npcs/walker-${index % WALKER_COUNT}.png`);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  sheetCache.set(index, tex);
  return tex;
}

/** An upright billboard plane with UV-window walk animation. */
export class WalkerSprite {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly texture: THREE.Texture;
  private direction: Direction = "down";
  private walkT = 0;
  private frame = IDLE_FRAME;

  constructor(index: number, height = 1.75) {
    // Frame aspect: 18x26.
    const width = height * (18 / 26);
    // Clone so each walker animates its own UV window over the shared image.
    this.texture = sheet(index).clone();
    this.texture.repeat.set(1 / FRAME_COLS, 1 / FRAME_ROWS);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const geo = new THREE.PlaneGeometry(width, height);
    geo.translate(0, height / 2, 0); // anchor at the feet
    this.mesh = new THREE.Mesh(geo, this.material);
    this.applyUv();
  }

  /** Set facing from a movement vector (screen-space x / z). */
  setDirectionFrom(dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    this.direction =
      Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? "left" : "right") : dz < 0 ? "up" : "down";
  }

  face(direction: Direction): void {
    this.direction = direction;
  }

  /** Face toward a world point (e.g. NPC looking at the player). */
  lookToward(fromX: number, fromZ: number, atX: number, atZ: number): void {
    this.setDirectionFrom(atX - fromX, atZ - fromZ);
  }

  update(dt: number, moving: boolean): void {
    if (moving) {
      this.walkT += dt;
      this.frame = WALK_SEQUENCE[Math.floor(this.walkT * WALK_FPS) % WALK_SEQUENCE.length];
    } else {
      this.walkT = 0;
      this.frame = IDLE_FRAME;
    }
    this.applyUv();
  }

  /** Yaw-only billboard toward the camera; keeps the sprite upright.
   *  Pass world coords when the mesh sits inside a positioned parent group. */
  faceCamera(camera: THREE.Camera, worldX?: number, worldZ?: number): void {
    const x = worldX ?? this.mesh.position.x;
    const z = worldZ ?? this.mesh.position.z;
    this.mesh.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
  }

  private applyUv(): void {
    const row = ROW_OF_DIR[this.direction];
    this.texture.offset.set(
      this.frame / FRAME_COLS,
      (FRAME_ROWS - 1 - row) / FRAME_ROWS,
    );
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}

/** Deterministic walker index for an NPC (skipping the player's walker). */
export function walkerIndexFor(hue: number): number {
  return 1 + (Math.abs(Math.round(hue)) % (WALKER_COUNT - 1));
}
