// Foe action selection. Simple but not embarrassing: prefers high expected
// damage with type awareness, opens with status moves when the target is
// healthy, respects stamina.

import type { BattleState, GameData, BattleAction } from "./battle";
import { calcDamage, FLAIL } from "./battle";
import type { Rng } from "./rng";
import { rollChance } from "./rng";

export function chooseFoeAction(data: GameData, state: BattleState, rng: Rng): BattleAction {
  const foe = state.foe.active;
  const player = state.player.active;
  const affordable = foe.mon.moves
    .map((id) => data.moves[id])
    .filter((m) => m && m.stamina <= foe.stamina);

  if (affordable.length === 0) return { kind: "move", moveId: FLAIL.id };

  const statusMoves = affordable.filter((m) => m.category === "status");
  const damageMoves = affordable.filter((m) => m.power > 0);

  // Healthy target + we have a status move -> sometimes set up.
  if (statusMoves.length > 0 && state.turn <= 2 && player.mon.status === null && rollChance(rng, 0.45)) {
    return { kind: "move", moveId: statusMoves[Math.floor(rng() * statusMoves.length)].id };
  }

  if (damageMoves.length === 0) {
    return { kind: "move", moveId: statusMoves[Math.floor(rng() * statusMoves.length)].id };
  }

  // Expected damage estimate (accuracy-weighted, deterministic probe rng).
  let best = damageMoves[0];
  let bestScore = -1;
  for (const move of damageMoves) {
    const probe = calcDamage(data, foe, player, move, () => 0.5);
    const score = probe.amount * (move.accuracy / 100);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  // 20% of the time pick a random damaging move instead — less robotic.
  if (damageMoves.length > 1 && rollChance(rng, 0.2)) {
    const others = damageMoves.filter((m) => m.id !== best.id);
    return { kind: "move", moveId: others[Math.floor(rng() * others.length)].id };
  }
  return { kind: "move", moveId: best.id };
}
