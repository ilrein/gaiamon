// Battle entry transition: a quick, cute encounter swirl — expanding radial
// rings collapsing into a white flash. main.ts awaits this before swapping to
// the battle screen; the overlay is then removed by uiRoot.replaceChildren()
// in Game.setScreen (or by its own fallback timer if the swap never happens).

import "./transitions.css";

/** Total time before the promise resolves (screen swap happens under the
 *  white flash). Keep this < 500ms — it's added battle-entry latency. */
const SWIRL_MS = 450;

export function playBattleIntro(root: HTMLElement): Promise<void> {
  const overlay = document.createElement("div");
  overlay.className = "battle-swirl";
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement("div");
    ring.className = "battle-swirl-ring";
    ring.style.animationDelay = `${i * 70}ms`;
    overlay.append(ring);
  }
  const burst = document.createElement("div");
  burst.className = "battle-swirl-burst";
  const flash = document.createElement("div");
  flash.className = "battle-swirl-flash";
  overlay.append(burst, flash);
  root.append(overlay);

  // Safety net: if the caller never swaps screens (which normally clears
  // uiRoot), don't leave a white overlay stuck over the game.
  setTimeout(() => overlay.remove(), SWIRL_MS + 600);

  return new Promise((resolve) => setTimeout(resolve, SWIRL_MS));
}
