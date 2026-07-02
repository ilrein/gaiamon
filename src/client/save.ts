import type { PlayerState } from "../shared/model";

const KEY = "gaiamon-save-v1";

export function saveGame(state: PlayerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full/blocked (private mode) — play on without persistence.
  }
}

export function loadGame(): PlayerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerState;
    if (!Array.isArray(parsed.party) || typeof parsed.areaId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
