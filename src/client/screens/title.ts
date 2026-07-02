// Title screen: a dreamy three.js sky with drifting motes, over a DOM overlay
// with the logo and Continue / New Journey. New Journey plays the opening, then
// the starter selection, then builds the initial PlayerState and hands it off.

import * as THREE from "three";
import type { Game, Screen } from "../game";
import { el, sleep } from "../dom";
import { creatureImg } from "../sprites";
import { typeChip } from "../colors";
import { loadGame } from "../save";
import { runDialogue } from "../ui/dialogue";
import { STRINGS } from "../../data/strings";
import { AREAS, START_AREA, getStarters } from "../../data";
import { makeInstance } from "../../shared/stats";
import type { PlayerState, SpeciesDef } from "../../shared/model";

const MOTE_COUNT = 90;
const FIELD = { x: 12, y: 8, z: 6 };

export class TitleScreen implements Screen {
  private readonly onStart: (player: PlayerState) => void;

  // three.js backdrop
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  private motes!: THREE.Points;
  private phases = new Float32Array(MOTE_COUNT);
  private speeds = new Float32Array(MOTE_COUNT);
  private time = 0;
  private disposables: { dispose(): void }[] = [];

  // DOM
  private overlay: HTMLElement | null = null;
  private game!: Game;

  constructor(opts: { onStart: (player: PlayerState) => void }) {
    this.onStart = opts.onStart;
  }

  mount(game: Game): void {
    this.game = game;
    this.buildBackdrop();
    this.showMenu();
  }

  unmount(_game: Game): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.overlay?.remove();
    this.overlay = null;
  }

  update(game: Game, dt: number): void {
    this.time += dt;
    const pos = this.motes.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < MOTE_COUNT; i++) {
      let y = arr[i * 3 + 1] + this.speeds[i] * dt;
      if (y > FIELD.y) y = -FIELD.y;
      arr[i * 3 + 1] = y;
      arr[i * 3] += Math.sin(this.time * 0.4 + this.phases[i]) * dt * 0.25;
    }
    pos.needsUpdate = true;
    this.motes.rotation.y = Math.sin(this.time * 0.05) * 0.1;
    game.renderer.render(this.scene, this.camera);
  }

  resize(_game: Game, width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  // ---- three.js backdrop ---------------------------------------------------
  private buildBackdrop(): void {
    this.camera.position.set(0, 0, 9);

    // Soft vertical gradient sky, drawn screen-space as the scene background.
    const sky = document.createElement("canvas");
    sky.width = 4;
    sky.height = 512;
    const sctx = sky.getContext("2d")!;
    const grad = sctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#9fd8f0");
    grad.addColorStop(0.45, "#bfe6dd");
    grad.addColorStop(0.8, "#ffe6c4");
    grad.addColorStop(1, "#ffd0a8");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 4, 512);
    const skyTex = new THREE.CanvasTexture(sky);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = skyTex;
    this.disposables.push(skyTex);

    // Floating motes.
    const positions = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < MOTE_COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * FIELD.x;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * FIELD.y;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * FIELD.z;
      this.phases[i] = Math.random() * Math.PI * 2;
      this.speeds[i] = 0.15 + Math.random() * 0.35;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: softDot(),
      size: 0.45,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xfff4d8,
    });
    this.motes = new THREE.Points(geom, mat);
    this.scene.add(this.motes);
    this.disposables.push(geom, mat);
    if (mat.map) this.disposables.push(mat.map);
  }

  // ---- DOM flow ------------------------------------------------------------
  private setOverlay(node: HTMLElement): void {
    this.overlay?.remove();
    this.overlay = node;
    this.game.uiRoot.append(node);
  }

  private showMenu(): void {
    const saved = loadGame();
    const buttons: HTMLElement[] = [];
    if (saved) {
      buttons.push(
        el("button", {
          className: "chunky-btn primary",
          text: "Continue",
          onClick: () => this.onStart(saved),
        }),
      );
    }
    buttons.push(
      el("button", {
        className: saved ? "chunky-btn" : "chunky-btn primary",
        text: "New Journey",
        onClick: () => void this.startNewJourney(),
      }),
    );

    this.setOverlay(
      el("div", { className: "title-screen" }, [
        el("div", { className: "title-logo", text: STRINGS.gameTitle }),
        el("div", { html: STRINGS.tagline, className: "title-tagline" }),
        el("div", { className: "title-menu" }, buttons),
      ]),
    );
    // Nudge the menu below the logo without touching frozen CSS.
    const menu = this.overlay!.querySelector<HTMLElement>(".title-menu")!;
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.style.gap = "12px";
    menu.style.width = "min(280px, 80vw)";
    (this.overlay!.querySelector<HTMLElement>(".title-tagline")!).style.opacity = "0.85";
  }

  private async startNewJourney(): Promise<void> {
    this.overlay?.remove();
    this.overlay = null;
    await runDialogue(this.game.uiRoot, STRINGS.opening);
    this.showStarterSelect();
  }

  private showStarterSelect(): void {
    const starters = getStarters(this.game.data);
    const cards = starters.map((species) => this.starterCard(species));
    this.setOverlay(
      el("div", { className: "title-screen" }, [
        el("div", { className: "title-logo", text: STRINGS.starterPrompt }),
        el("div", { className: "starter-row" }, cards),
      ]),
    );
    // Shrink the prompt so it doesn't read as the giant logo.
    (this.overlay!.querySelector<HTMLElement>(".title-logo")!).style.fontSize = "clamp(22px, 5vw, 34px)";
  }

  private starterCard(species: SpeciesDef): HTMLElement {
    const chips = el("div", { html: species.types.map(typeChip).join(" ") });
    chips.style.margin = "6px 0";
    const card = el("div", { className: "starter-card panel" }, [
      creatureImg(species.id),
      el("div", { className: "starter-name", text: species.name }),
      chips,
      el("div", {
        className: "starter-blurb",
        text: STRINGS.starterBlurbs[species.role] ?? "",
      }),
    ]);
    card.style.cursor = "pointer";
    card.addEventListener("click", () => void this.confirmStarter(species, card));
    return card;
  }

  private async confirmStarter(species: SpeciesDef, card: HTMLElement): Promise<void> {
    // Juicy little pop on select.
    card.style.transform = "translateY(-6px) scale(1.08)";
    await sleep(120);
    card.style.transform = "";

    const decision = await new Promise<"yes" | "back">((resolve) => {
      const panel = el("div", { className: "panel confirm-panel" }, [
        el("div", { html: `Choose <b>${species.name}</b>?`, className: "confirm-q" }),
        el("div", { className: "confirm-actions" }, [
          el("button", { className: "chunky-btn", text: "Back", onClick: () => resolve("back") }),
          el("button", { className: "chunky-btn primary", text: "Yes!", onClick: () => resolve("yes") }),
        ]),
      ]);
      Object.assign(panel.style, {
        position: "fixed",
        left: "50%",
        bottom: "calc(24px + var(--safe-bottom))",
        transform: "translateX(-50%)",
        width: "min(360px, calc(100vw - 32px))",
        textAlign: "center",
        zIndex: "40",
      } as CSSStyleDeclaration);
      const q = panel.querySelector<HTMLElement>(".confirm-q")!;
      q.style.fontSize = "18px";
      q.style.marginBottom = "12px";
      const actions = panel.querySelector<HTMLElement>(".confirm-actions")!;
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.justifyContent = "center";
      this.game.uiRoot.append(panel);
      const cleanup = () => panel.remove();
      panel.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest("button")) cleanup();
      });
    });

    if (decision === "yes") this.finalize(species);
  }

  private finalize(species: SpeciesDef): void {
    const spawn = AREAS[START_AREA].spawn;
    const state: PlayerState = {
      name: "Warden",
      party: [makeInstance(species, 5, "m1")],
      registered: [species.id],
      flags: ["starter-chosen"],
      areaId: START_AREA,
      pos: { x: spawn.x, z: spawn.z },
      nextUid: 2,
    };
    this.onStart(state);
  }
}

/** Small radial-gradient sprite for the motes. Fresh per instance so unmount's
 *  dispose() never orphans a shared texture. */
function softDot(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
