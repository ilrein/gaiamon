// Game shell: owns the renderer, the active screen, the player state, and the
// shared UI layers. Screens (title / overworld / battle) mount into it.

import * as THREE from "three";
import type { GameData } from "../shared/battle";
import type { PlayerState } from "../shared/model";
import { Input } from "./input";
import { saveGame } from "./save";

export interface Screen {
  mount(game: Game): void;
  unmount(game: Game): void;
  update(game: Game, dt: number): void;
  resize?(game: Game, width: number, height: number): void;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly input: Input;
  /** DOM layer for persistent HUD + touch controls. */
  readonly hudRoot: HTMLElement;
  /** DOM layer for screen-specific UI (battle menus, codex, dialogue). */
  readonly uiRoot: HTMLElement;
  readonly data: GameData;
  player: PlayerState;

  private screen: Screen | null = null;
  private clock = new THREE.Clock();

  constructor(canvasHost: HTMLElement, hudRoot: HTMLElement, uiRoot: HTMLElement, data: GameData, player: PlayerState) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasHost.appendChild(this.renderer.domElement);

    this.hudRoot = hudRoot;
    this.uiRoot = uiRoot;
    this.data = data;
    this.player = player;
    this.input = new Input(hudRoot);

    window.addEventListener("resize", () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.screen?.resize?.(this, window.innerWidth, window.innerHeight);
    });

    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.screen?.update(this, dt);
    });
  }

  setScreen(next: Screen): void {
    this.screen?.unmount(this);
    this.uiRoot.replaceChildren();
    this.screen = next;
    next.mount(this);
    next.resize?.(this, window.innerWidth, window.innerHeight);
  }

  save(): void {
    saveGame(this.player);
  }
}
