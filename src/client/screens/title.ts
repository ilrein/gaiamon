// Title screen: fully procedural CSS backdrop (dawn-meadow gradients,
// drifting pollen pattern, parallax cloud bands, rolling hills — no images,
// see title.css), legibility gradient, floating motes, all under a DOM
// overlay with the logo and Continue / New Journey. New Journey plays the
// opening, then the starter selection, then builds the initial PlayerState
// and hands it off.

import type { Game, Screen } from "../game";
import { el, sleep } from "../dom";
import { creatureImg } from "../sprites";
import { typeChip } from "../colors";
import { loadGame } from "../save";
import { track } from "../net/beacon";
import { runDialogue } from "../ui/dialogue";
import { STRINGS } from "../../data/strings";
import { AREAS, START_AREA, getStarters } from "../../data";
import { makeInstance } from "../../shared/stats";
import type { PlayerState, SpeciesDef } from "../../shared/model";
import "./title.css";

const MOTE_COUNT = 22;

export class TitleScreen implements Screen {
  private readonly onStart: (player: PlayerState) => void;

  // DOM
  private backdrop: HTMLElement | null = null;
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
    this.backdrop?.remove();
    this.backdrop = null;
    this.overlay?.remove();
    this.overlay = null;
  }

  update(_game: Game, _dt: number): void {
    // The backdrop is pure CSS (compositor-driven animations); there is
    // nothing to render per frame. The full-bleed backdrop covers the WebGL
    // canvas entirely, so leaving it un-rendered is safe and free.
  }

  // ---- CSS backdrop ----------------------------------------------------------
  private buildBackdrop(): void {
    const motes = el("div", { className: "title-cine__motes" });
    for (let i = 0; i < MOTE_COUNT; i++) {
      const mote = el("span", { className: "title-cine__mote" });
      mote.style.setProperty("--x", `${(Math.random() * 100).toFixed(1)}%`);
      mote.style.setProperty("--s", `${(4 + Math.random() * 8).toFixed(1)}px`);
      mote.style.setProperty("--d", `${(16 + Math.random() * 14).toFixed(1)}s`);
      // Negative delay so the field is mid-flight from the very first frame.
      mote.style.setProperty("--delay", `${(-Math.random() * 30).toFixed(1)}s`);
      mote.style.setProperty("--drift", `${((Math.random() * 2 - 1) * 12).toFixed(1)}vw`);
      mote.style.setProperty("--o", (0.3 + Math.random() * 0.45).toFixed(2));
      motes.append(mote);
    }
    this.backdrop = el("div", { className: "title-cine" }, [
      el("div", { className: "title-cine__art" }),
      el("div", { className: "title-cine__grad" }),
      motes,
      el("div", { className: "title-cine__dim" }),
    ]);
    this.game.uiRoot.append(this.backdrop);
  }

  // ---- DOM flow ------------------------------------------------------------
  private setOverlay(node: HTMLElement): void {
    this.overlay?.remove();
    this.overlay = node;
    this.game.uiRoot.append(node);
  }

  private showMenu(): void {
    this.backdrop?.classList.remove("is-dim");
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
    // Staggered 80ms rise-in per button (keyframes live in title.css).
    buttons.forEach((b, i) => {
      b.style.animationDelay = `${(0.45 + i * 0.08).toFixed(2)}s`;
    });

    const head = el("div", { className: "title-head" }, [
      el("div", { className: "title-logo", text: STRINGS.gameTitle }),
      el("div", { html: STRINGS.tagline, className: "title-tagline" }),
    ]);
    this.setOverlay(
      el("div", { className: "title-screen cine" }, [
        head,
        el("div", { className: "title-menu" }, buttons),
      ]),
    );
    void this.showLiveCount(head);
  }

  /** Live social proof under the tagline: "N wardens exploring right now".
      Purely optional garnish — any failure (offline, dev server without the
      worker, bad JSON) is swallowed and the line simply never appears. Also
      hidden when n is 0: an empty meadow shouldn't advertise its emptiness. */
  private async showLiveCount(head: HTMLElement): Promise<void> {
    try {
      const res = await fetch("/api/now");
      if (!res.ok) return;
      const body = (await res.json()) as { n?: unknown };
      const n =
        typeof body.n === "number" && Number.isFinite(body.n) ? Math.max(0, Math.floor(body.n)) : 0;
      if (n < 1) return;
      // The menu may have moved on (starter select) while we were fetching.
      if (!head.isConnected) return;
      head.append(
        el("div", {
          className: "title-now",
          text: `🌿 ${n} warden${n === 1 ? "" : "s"} exploring right now`,
        }),
      );
    } catch {
      /* social proof must never break the title screen */
    }
  }

  private async startNewJourney(): Promise<void> {
    track("new-journey");
    this.overlay?.remove();
    this.overlay = null;
    // Blur + darken the key art so the opening dialogue reads clearly.
    this.backdrop?.classList.add("is-dim");
    await runDialogue(this.game.uiRoot, STRINGS.opening);
    this.showStarterSelect();
  }

  private showStarterSelect(): void {
    this.backdrop?.classList.add("is-dim");
    const starters = getStarters(this.game.data);
    const cards = starters.map((species, i) => {
      const card = this.starterCard(species);
      card.style.animationDelay = `${(0.08 + i * 0.12).toFixed(2)}s`;
      // Desynchronize the idle sprite bob so the trio doesn't move in lockstep.
      const img = card.querySelector<HTMLElement>("img");
      if (img) img.style.animationDelay = `${(i * 0.45).toFixed(2)}s`;
      return card;
    });
    this.setOverlay(
      el("div", { className: "title-screen cine starter" }, [
        el("div", { className: "title-logo starter-heading", text: STRINGS.starterPrompt }),
        el("div", { className: "starter-row" }, cards),
      ]),
    );
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
    const starter = makeInstance(species, 5, "m1");
    // same 1/64 shiny odds as the wild — a lucky first friend
    if (Math.random() < 1 / 64) starter.shiny = true;
    const state: PlayerState = {
      name: "Warden",
      party: [starter],
      registered: [species.id],
      flags: ["starter-chosen"],
      areaId: START_AREA,
      pos: { x: spawn.x, z: spawn.z },
      nextUid: 2,
    };
    this.onStart(state);
  }
}
