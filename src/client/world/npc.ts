// NPC actors: real 4-direction walk-cycle characters from the CC0 Openmon set
// by Screen Smith (assets/screensmith/openmon-npc-set-1). Each NPC carries an
// exclamation bubble sprite that fades in when the player is close enough to
// talk, and turns to face the player.

import * as THREE from "three";
import type { NpcPlacement } from "../../shared/area";
import { WalkerSprite, walkerIndexFor } from "./walker";

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
  private readonly walker: WalkerSprite;
  private readonly bubble: THREE.Sprite;
  private readonly bubbleTex: THREE.Texture;
  private bubbleShown = 0; // 0..1 eased visibility

  constructor(npc: NpcPlacement) {
    this.npc = npc;
    this.group = new THREE.Group();
    this.group.position.set(npc.x, 0, npc.z);

    // The hue picks a stable walk-cycle character per NPC.
    this.walker = new WalkerSprite(walkerIndexFor(npc.hue), 1.7);
    this.group.add(this.walker.mesh);

    this.bubbleTex = bubbleTexture();
    const bmat = new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, opacity: 0, depthTest: false });
    this.bubble = new THREE.Sprite(bmat);
    this.bubble.center.set(0.5, 0);
    this.bubble.scale.setScalar(0.7);
    this.bubble.position.y = 2.0;
    this.bubble.renderOrder = 10;
    this.group.add(this.bubble);
  }

  /** `t` elapsed seconds, `showBubble` when the player is in talk range. */
  update(t: number, showBubble: boolean, camera: THREE.Camera, playerX: number, playerZ: number): void {
    if (showBubble) {
      this.walker.lookToward(this.npc.x, this.npc.z, playerX, playerZ);
    } else {
      this.walker.face("down");
    }
    this.walker.update(0, false);
    this.walker.faceCamera(camera, this.npc.x, this.npc.z);

    const target = showBubble ? 1 : 0;
    this.bubbleShown += (target - this.bubbleShown) * 0.15;
    const mat = this.bubble.material as THREE.SpriteMaterial;
    mat.opacity = this.bubbleShown;
    this.bubble.visible = this.bubbleShown > 0.02;
    this.bubble.position.y = 2.0 + this.bubbleShown * 0.15 + Math.sin(t * 4) * 0.04 * this.bubbleShown;
  }

  dispose(): void {
    this.walker.dispose();
    this.bubbleTex.dispose();
    (this.bubble.material as THREE.SpriteMaterial).dispose();
  }
}
