// Tiny DOM helper — the game's UI (battle menus, Codex, dialogue) is DOM/CSS
// layered over the three.js canvas. Way faster to make cute and responsive
// than in-canvas UI, and it's accessible + mobile-native for free.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { className?: string; text?: string; html?: string; onClick?: (e: Event) => void } = {},
  children: (HTMLElement | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.className) node.className = attrs.className;
  if (attrs.text !== undefined) node.textContent = attrs.text;
  if (attrs.html !== undefined) node.innerHTML = attrs.html;
  if (attrs.onClick) {
    node.addEventListener("click", attrs.onClick);
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Await a click/tap anywhere on the node. */
export function nextTap(node: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      node.removeEventListener("click", handler);
      resolve();
    };
    node.addEventListener("click", handler);
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
