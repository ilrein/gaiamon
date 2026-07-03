// Tiny shared formatting helpers for HP-bar widgets, kept in one place so the
// battle screen, codex, and party HUD render identical bar math and warn/crit
// thresholds.

/** Clamp a raw percentage into the 0–100 display range. */
export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** HP-bar fill class for a 0–100 percentage: crit ≤20%, warn ≤50%, else full. */
export function hpFillClass(pct: number): string {
  return pct <= 20 ? "fill crit" : pct <= 50 ? "fill warn" : "fill";
}
