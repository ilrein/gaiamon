// NPC billboards: a procedural pixel-art chibi person drawn on a small canvas
// and billboarded as a THREE.Sprite anchored at the feet. Clothes are colored
// from npc.hue. Each NPC carries an exclamation bubble sprite that fades in when
// the player is close enough to talk.

import * as THREE from "three";
import type { NpcPlacement } from "../../shared/area";

function personTexture(hue: number): THREE.Texture {
  const px = 24;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;

  const put = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const shirt = `hsl(${hue}, 55%, 58%)`;
  const shirtDark = `hsl(${hue}, 50%, 46%)`;
  const pants = `hsl(${(hue + 200) % 360}, 30%, 40%)`;
  const skin = "#f2c79a";
  const hair = `hsl(${(hue + 30) % 360}, 40%, 30%)`;

  // feet
  put(8, 21, 3, 2, "#4a3b2e");
  put(13, 21, 3, 2, "#4a3b2e");
  // legs
  put(8, 17, 3, 4, pants);
  put(13, 17, 3, 4, pants);
  // body / shirt
  put(7, 11, 10, 7, shirt);
  put(6, 12, 12, 5, shirt);
  put(7, 11, 10, 1, shirtDark);
  // arms
  put(5, 12, 2, 4, shirtDark);
  put(17, 12, 2, 4, shirtDark);
  // head
  put(8, 4, 8, 7, skin);
  put(7, 5, 10, 5, skin);
  // hair
  put(7, 3, 10, 3, hair);
  put(7, 4, 2, 3, hair);
  put(15, 4, 2, 3, hair);
  // eyes
  put(9, 7, 2, 2, "#3a2f2a");
  put(13, 7, 2, 2, "#3a2f2a");
  put(9, 7, 1, 1, "#ffffff");
  put(13, 7, 1, 1, "#ffffff");
  // blush + mouth
  put(8, 9, 1, 1, "#f4a9a0");
  put(15, 9, 1, 1, "#f4a9a0");
  put(11, 9, 2, 1, "#c96a5a");

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function bubbleTexture(): THREE.Texture {
  const px = 24;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, px, px);

  // Rounded speech bubble with a little tail.
  ctx.fillStyle = "#fff8ec";
  ctx.strokeStyle = "#3a2f2a";
  ctx.lineWidth = 1.5;
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(4 + r, 3);
  ctx.arcTo(20, 3, 20, 17, r);
  ctx.arcTo(20, 17, 4, 17, r);
  ctx.arcTo(4, 17, 4, 3, r);
  ctx.arcTo(4, 3, 20, 3, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(10, 16);
  ctx.lineTo(12, 21);
  ctx.lineTo(14, 16);
  ctx.closePath();
  ctx.fillStyle = "#fff8ec";
  ctx.fill();
  // exclamation
  ctx.fillStyle = "#f2906a";
  ctx.fillRect(11, 6, 2, 5);
  ctx.fillRect(11, 12, 2, 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class NpcActor {
  readonly group: THREE.Group;
  readonly npc: NpcPlacement;
  private readonly sprite: THREE.Sprite;
  private readonly bubble: THREE.Sprite;
  private readonly personTex: THREE.Texture;
  private readonly bubbleTex: THREE.Texture;
  private readonly baseScale = 1.5;
  private bubbleShown = 0; // 0..1 eased visibility

  constructor(npc: NpcPlacement) {
    this.npc = npc;
    this.group = new THREE.Group();
    this.group.position.set(npc.x, 0, npc.z);

    this.personTex = personTexture(npc.hue);
    const mat = new THREE.SpriteMaterial({ map: this.personTex, alphaTest: 0.05 });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.center.set(0.5, 0.06); // anchor at the feet
    this.sprite.scale.setScalar(this.baseScale);
    this.group.add(this.sprite);

    this.bubbleTex = bubbleTexture();
    const bmat = new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, opacity: 0, depthTest: false });
    this.bubble = new THREE.Sprite(bmat);
    this.bubble.center.set(0.5, 0);
    this.bubble.scale.setScalar(0.7);
    this.bubble.position.y = 2.0;
    this.bubble.renderOrder = 10;
    this.group.add(this.bubble);
  }

  /** `t` elapsed seconds, `showBubble` when player is in talk range. */
  update(t: number, showBubble: boolean): void {
    // gentle idle bob
    const bob = Math.sin(t * 2.2 + this.npc.x) * 0.05 + 0.05;
    this.sprite.position.y = bob;

    const target = showBubble ? 1 : 0;
    this.bubbleShown += (target - this.bubbleShown) * 0.15;
    const mat = this.bubble.material as THREE.SpriteMaterial;
    mat.opacity = this.bubbleShown;
    this.bubble.visible = this.bubbleShown > 0.02;
    this.bubble.position.y = 2.0 + this.bubbleShown * 0.15 + Math.sin(t * 4) * 0.04 * this.bubbleShown;
  }

  dispose(): void {
    this.personTex.dispose();
    this.bubbleTex.dispose();
    (this.sprite.material as THREE.SpriteMaterial).dispose();
    (this.bubble.material as THREE.SpriteMaterial).dispose();
  }
}
