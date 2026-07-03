// Client-side type palette: the display colour per elemental type and the small
// type-chip markup that reuses it. Single source of truth for type theming.

import type { TypeId } from "../shared/model";

export const TYPE_COLORS: Record<TypeId, string> = {
  neutral: "#a8a090",
  verdant: "#7cc46a",
  ember: "#f2906a",
  tide: "#6ab8e8",
  zephyr: "#a8d8c8",
  terra: "#c9a06a",
  volt: "#f4d442",
  frost: "#a8d4e8",
  umbral: "#8a7aa8",
  lumen: "#ffe9a8",
  fable: "#e8a8d0",
};

export function typeChip(type: TypeId): string {
  return `<span class="type-chip" style="background:${TYPE_COLORS[type]}">${type}</span>`;
}
