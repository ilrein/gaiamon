import * as THREE from "three";
import { WORLD_BOUNDS } from "./world";

// Placeholder player: a cute pixel blob drawn on a canvas, billboarded as a
// sprite. Real creature/trainer art comes from the art pipeline (see
// scripts/gen-art.mjs) — a single still image + tweens is the whole MVP
// animation strategy: idle bob when standing, hop + squash while moving.

function blobTexture(): THREE.Texture {
  const px = 24;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;

  const put = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // body
  put(6, 8, 12, 12, "#fdf3dc");
  put(5, 10, 14, 8, "#fdf3dc");
  put(7, 7, 10, 1, "#fdf3dc");
  // ears
  put(6, 4, 3, 4, "#a9d977");
  put(15, 4, 3, 4, "#a9d977");
  put(7, 5, 1, 3, "#e5f5c8");
  put(16, 5, 1, 3, "#e5f5c8");
  // eyes
  put(9, 12, 2, 3, "#3a2f2a");
  put(14, 12, 2, 3, "#3a2f2a");
  put(9, 12, 1, 1, "#ffffff");
  put(14, 12, 1, 1, "#ffffff");
  // blush
  put(7, 15, 2, 1, "#f4a9a0");
  put(16, 15, 2, 1, "#f4a9a0");
  // mouth
  put(12, 16, 1, 1, "#3a2f2a");
  // feet
  put(8, 20, 3, 2, "#f0dfbe");
  put(14, 20, 3, 2, "#f0dfbe");

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Player {
  readonly sprite: THREE.Sprite;
  private readonly pressed = new Set<string>();
  private readonly baseScale = 1.5;
  private facing = 1;
  private time = 0;

  constructor(scene: THREE.Scene) {
    const material = new THREE.SpriteMaterial({ map: blobTexture(), alphaTest: 0.05 });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(0.5, 0.06); // anchor near the feet
    this.sprite.scale.setScalar(this.baseScale);
    scene.add(this.sprite);

    window.addEventListener("keydown", (e) => {
      if (e.code in KEY_DIRS) {
        this.pressed.add(e.code);
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.pressed.delete(e.code));
    window.addEventListener("blur", () => this.pressed.clear());
  }

  get position(): THREE.Vector3 {
    return this.sprite.position;
  }

  update(dt: number): void {
    this.time += dt;

    const dir = new THREE.Vector2();
    for (const code of this.pressed) {
      const [x, z] = KEY_DIRS[code];
      dir.x += x;
      dir.y += z;
    }
    const moving = dir.lengthSq() > 0;

    if (moving) {
      dir.normalize();
      const speed = 5;
      this.sprite.position.x = THREE.MathUtils.clamp(
        this.sprite.position.x + dir.x * speed * dt,
        -WORLD_BOUNDS,
        WORLD_BOUNDS,
      );
      this.sprite.position.z = THREE.MathUtils.clamp(
        this.sprite.position.z + dir.y * speed * dt,
        -WORLD_BOUNDS,
        WORLD_BOUNDS,
      );
      if (dir.x !== 0) this.facing = Math.sign(dir.x);
    }

    // Tween-based "animation": hop while moving, gentle bob while idle,
    // with matching squash-and-stretch. Cheap, and it reads as cute.
    const hop = moving ? Math.abs(Math.sin(this.time * 9)) * 0.22 : Math.sin(this.time * 2.5) * 0.04 + 0.04;
    const squash = moving ? 1 - Math.sin(this.time * 18) * 0.06 : 1 + Math.sin(this.time * 2.5) * 0.02;

    this.sprite.position.y = hop;
    this.sprite.scale.set(this.facing * this.baseScale * (2 - squash), this.baseScale * squash, 1);
  }
}
