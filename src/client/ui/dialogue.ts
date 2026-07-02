// Dialogue box: sequential lines, tap/space to advance, typewriter effect.

import { el } from "../dom";

export async function runDialogue(
  uiRoot: HTMLElement,
  lines: { speaker?: string; text: string }[],
): Promise<void> {
  const box = el("div", { className: "dialogue panel" });
  uiRoot.append(box);

  for (const line of lines) {
    box.replaceChildren();
    if (line.speaker) box.append(el("div", { className: "speaker", text: line.speaker }));
    const body = el("div");
    box.append(body, el("div", { className: "hint", text: "tap ▸" }));

    // Typewriter that can be skipped by tapping.
    let skip = false;
    const skipHandler = () => (skip = true);
    box.addEventListener("click", skipHandler);
    for (let i = 0; i <= line.text.length; i++) {
      body.textContent = line.text.slice(0, i);
      if (skip) {
        body.textContent = line.text;
        break;
      }
      await new Promise((r) => setTimeout(r, 14));
    }
    box.removeEventListener("click", skipHandler);

    await new Promise<void>((resolve) => {
      const advance = (e?: KeyboardEvent) => {
        if (e && e.code !== "Space" && e.code !== "Enter") return;
        box.removeEventListener("click", click);
        window.removeEventListener("keydown", key);
        resolve();
      };
      const click = () => advance();
      const key = (e: KeyboardEvent) => advance(e);
      box.addEventListener("click", click);
      window.addEventListener("keydown", key);
    });
  }
  box.remove();
}
