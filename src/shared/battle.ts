// The Gaiamon battle engine. Pure and deterministic: (state, actions, rng) -> (state, events).
// No DOM, no three.js, no timers. The client plays back the emitted events as
// animations; a future server (zone/battle Durable Object) runs the same code
// authoritatively.

import type {
  MonsterInstance,
  MoveDef,
  MoveEffect,
  SpeciesDef,
  StatusDef,
  StageableStat,
  TypeId,
} from "./model";
import {
  computeStats,
  freshStages,
  stageMultiplier,
  xpGain,
  xpForLevel,
  movesAtLevel,
  maxHpAt,
  type StageMap,
} from "./stats";
import { rollChance, rollInt, type Rng } from "./rng";

// ---------------------------------------------------------------------------
export interface GameData {
  species: Record<string, SpeciesDef>;
  moves: Record<string, MoveDef>;
  statuses: Record<string, StatusDef>;
  /** typeChart[attacker][defender] = 0 | 0.5 | 2; missing = 1. */
  typeChart: Partial<Record<TypeId, Partial<Record<TypeId, number>>>>;
}

export const MAX_STAMINA = 10;
export const STAMINA_REGEN = 2;

/** Fallback when a mon can't afford any known move. */
export const FLAIL: MoveDef = {
  id: "__flail",
  name: "Flail About",
  type: "neutral",
  category: "physical",
  power: 35,
  accuracy: 100,
  stamina: 0,
  effects: [],
  description: "A desperate wiggle. Never runs out.",
};

export interface BossPhase {
  /** Triggers when boss HP fraction drops below this. */
  hpThreshold: number;
  statBoosts: Partial<Record<StageableStat, number>>;
  announcement: string;
}

export interface BattleConfig {
  kind: "wild" | "trainer" | "boss";
  /** Trainer/boss display name, e.g. "Keeper Maren". */
  opponentName?: string;
  bossPhases?: BossPhase[];
  canFlee: boolean;
  canSync: boolean;
}

export interface Combatant {
  mon: MonsterInstance;
  stages: StageMap;
  stamina: number;
  flinched: boolean;
}

export interface BattleSide {
  party: MonsterInstance[];
  activeIndex: number;
  active: Combatant;
}

export interface BattleState {
  config: BattleConfig;
  player: BattleSide;
  foe: BattleSide;
  turn: number;
  phaseIndex: number;
  outcome: "ongoing" | "victory" | "defeat" | "fled" | "synced";
  /** Foe uids whose faint has already granted XP (guards double rewards). */
  rewardedFoeUids: string[];
}

export type BattleAction =
  | { kind: "move"; moveId: string }
  | { kind: "sync" }
  | { kind: "switch"; partyIndex: number }
  | { kind: "flee" };

export type BattleEvent =
  | { kind: "text"; text: string }
  | { kind: "moveUsed"; side: Side; moveId: string; moveName: string }
  | { kind: "damage"; side: Side; amount: number; hpAfter: number; maxHp: number; effectiveness: number; crit: boolean }
  | { kind: "miss"; side: Side }
  | { kind: "statStage"; side: Side; stat: StageableStat; stages: number }
  | { kind: "statusApplied"; side: Side; statusId: string }
  | { kind: "statusEnded"; side: Side; statusId: string }
  | { kind: "statusHurt"; side: Side; statusId: string; amount: number; hpAfter: number; maxHp: number }
  | { kind: "heal"; side: Side; amount: number; hpAfter: number; maxHp: number }
  | { kind: "faint"; side: Side }
  | { kind: "switchIn"; side: Side; partyIndex: number; speciesId: string; level: number }
  | { kind: "syncAttempt"; chance: number }
  | { kind: "syncResult"; success: boolean; speciesId: string }
  | { kind: "fleeAttempt"; success: boolean }
  | { kind: "xp"; amount: number; monUid: string }
  | { kind: "levelUp"; monUid: string; level: number }
  | { kind: "moveLearned"; monUid: string; moveId: string; moveName: string }
  | { kind: "readyToEvolve"; monUid: string; toSpeciesId: string }
  | { kind: "bossPhase"; announcement: string }
  | { kind: "end"; outcome: BattleState["outcome"] };

export type Side = "player" | "foe";

// ---------------------------------------------------------------------------
export function makeCombatant(mon: MonsterInstance): Combatant {
  return { mon, stages: freshStages(), stamina: MAX_STAMINA, flinched: false };
}

export function startBattle(
  config: BattleConfig,
  playerParty: MonsterInstance[],
  foeParty: MonsterInstance[],
): BattleState {
  // Guard against a fully-fainted party (shouldn't happen, but never crash).
  const playerIndex = Math.max(0, playerParty.findIndex((m) => m.currentHp > 0));
  return {
    config,
    player: { party: playerParty, activeIndex: playerIndex, active: makeCombatant(playerParty[playerIndex]) },
    foe: { party: foeParty, activeIndex: 0, active: makeCombatant(foeParty[0]) },
    turn: 1,
    phaseIndex: 0,
    outcome: "ongoing",
    rewardedFoeUids: [],
  };
}

function effectiveStat(data: GameData, c: Combatant, stat: StageableStat): number {
  const species = data.species[c.mon.speciesId];
  let value = computeStats(species, c.mon.level)[stat] * stageMultiplier(c.stages[stat]);
  const status = c.mon.status ? data.statuses[c.mon.status] : null;
  const mult = status?.statMultipliers?.[stat];
  if (mult !== undefined) value *= mult;
  return Math.max(1, Math.floor(value));
}

export function effectiveness(data: GameData, moveType: TypeId, defenderTypes: TypeId[]): number {
  let x = 1;
  for (const dt of defenderTypes) {
    x *= data.typeChart[moveType]?.[dt] ?? 1;
  }
  return x;
}

export function calcDamage(
  data: GameData,
  attacker: Combatant,
  defender: Combatant,
  move: MoveDef,
  rng: Rng,
): { amount: number; effectiveness: number; crit: boolean } {
  const atkSpecies = data.species[attacker.mon.speciesId];
  const defSpecies = data.species[defender.mon.speciesId];
  const atkStat = move.category === "physical" ? effectiveStat(data, attacker, "attack") : effectiveStat(data, attacker, "spirit");
  const defStat = move.category === "physical" ? effectiveStat(data, defender, "defense") : effectiveStat(data, defender, "spirit");
  const level = attacker.mon.level;
  const base = Math.floor((Math.floor((2 * level) / 5 + 2) * move.power * atkStat) / defStat / 50) + 2;
  const affinity = atkSpecies.types.includes(move.type) ? 1.5 : 1;
  const eff = effectiveness(data, move.type, defSpecies.types);
  const crit = rollChance(rng, 0.0625);
  const variance = 0.85 + rng() * 0.15;
  const amount = Math.max(1, Math.floor(base * affinity * eff * (crit ? 1.5 : 1) * variance));
  return { amount, effectiveness: eff, crit };
}

/** Codex sync chance. Weaken + status = better odds. */
export function syncChance(data: GameData, foe: Combatant): number {
  const species = data.species[foe.mon.speciesId];
  if (species.syncRate <= 0) return 0;
  const maxHp = maxHpAt(species.baseStats.hp, foe.mon.level);
  const hpFrac = foe.mon.currentHp / maxHp;
  const statusBonus = foe.mon.status ? (data.statuses[foe.mon.status]?.syncBonus ?? 1) : 1;
  return Math.min(0.95, Math.max(0.02, species.syncRate * (1 - 0.72 * hpFrac) * statusBonus));
}

// ---------------------------------------------------------------------------
function side(state: BattleState, which: Side): BattleSide {
  return which === "player" ? state.player : state.foe;
}

function opponentOf(which: Side): Side {
  return which === "player" ? "foe" : "player";
}

function applyDamage(c: Combatant, amount: number, data: GameData): number {
  c.mon.currentHp = Math.max(0, c.mon.currentHp - amount);
  return c.mon.currentHp;
}

function monMaxHp(data: GameData, c: Combatant): number {
  return maxHpAt(data.species[c.mon.speciesId].baseStats.hp, c.mon.level);
}

function executeMoveEffects(
  data: GameData,
  state: BattleState,
  actorSide: Side,
  move: MoveDef,
  damageDealt: number,
  rng: Rng,
  events: BattleEvent[],
): void {
  const actor = side(state, actorSide).active;
  const target = side(state, opponentOf(actorSide)).active;
  for (const effect of move.effects) {
    switch (effect.kind) {
      case "applyStatus": {
        const victim = effect.target === "self" ? actor : target;
        const victimSide = effect.target === "self" ? actorSide : opponentOf(actorSide);
        if (victim.mon.currentHp > 0 && victim.mon.status === null && rollChance(rng, effect.chance)) {
          if (data.statuses[effect.status]) {
            victim.mon.status = effect.status;
            events.push({ kind: "statusApplied", side: victimSide, statusId: effect.status });
          }
        }
        break;
      }
      case "statStage": {
        const victim = effect.target === "self" ? actor : target;
        const victimSide = effect.target === "self" ? actorSide : opponentOf(actorSide);
        if (victim.mon.currentHp > 0 && rollChance(rng, effect.chance ?? 1)) {
          const before = victim.stages[effect.stat];
          victim.stages[effect.stat] = Math.max(-4, Math.min(4, before + effect.stages));
          const applied = victim.stages[effect.stat] - before;
          if (applied !== 0) {
            events.push({ kind: "statStage", side: victimSide, stat: effect.stat, stages: applied });
          }
        }
        break;
      }
      case "heal": {
        const max = monMaxHp(data, actor);
        const amount = Math.floor((max * effect.percent) / 100);
        actor.mon.currentHp = Math.min(max, actor.mon.currentHp + amount);
        events.push({ kind: "heal", side: actorSide, amount, hpAfter: actor.mon.currentHp, maxHp: max });
        break;
      }
      case "drain": {
        if (damageDealt > 0) {
          const max = monMaxHp(data, actor);
          const amount = Math.max(1, Math.floor((damageDealt * effect.percent) / 100));
          actor.mon.currentHp = Math.min(max, actor.mon.currentHp + amount);
          events.push({ kind: "heal", side: actorSide, amount, hpAfter: actor.mon.currentHp, maxHp: max });
        }
        break;
      }
      case "recoil": {
        if (damageDealt > 0) {
          const amount = Math.max(1, Math.floor((damageDealt * effect.percent) / 100));
          const hpAfter = applyDamage(actor, amount, data);
          events.push({ kind: "damage", side: actorSide, amount, hpAfter, maxHp: monMaxHp(data, actor), effectiveness: 1, crit: false });
        }
        break;
      }
      case "flinch": {
        if (rollChance(rng, effect.chance)) target.flinched = true;
        break;
      }
      case "priority":
      case "multiHit":
        break; // handled elsewhere
    }
  }
}

function executeMove(
  data: GameData,
  state: BattleState,
  actorSide: Side,
  moveId: string,
  rng: Rng,
  events: BattleEvent[],
): void {
  const actor = side(state, actorSide).active;
  const target = side(state, opponentOf(actorSide)).active;
  if (actor.mon.currentHp <= 0) return;

  if (actor.flinched) {
    actor.flinched = false;
    events.push({ kind: "text", text: `${displayName(data, actor)} flinched and couldn't act!` });
    return;
  }

  const status = actor.mon.status ? data.statuses[actor.mon.status] : null;
  if (status?.skipTurnChance && rollChance(rng, status.skipTurnChance)) {
    events.push({ kind: "text", text: `${displayName(data, actor)} ${status.flavor} and can't move!` });
    return;
  }

  let move = data.moves[moveId] ?? FLAIL;
  if (move.stamina > actor.stamina) move = FLAIL;
  actor.stamina = Math.max(0, actor.stamina - move.stamina);

  events.push({ kind: "moveUsed", side: actorSide, moveId: move.id, moveName: move.name });

  if (!rollChance(rng, move.accuracy / 100)) {
    events.push({ kind: "miss", side: actorSide });
    return;
  }

  const targetWasFainted = target.mon.currentHp <= 0;
  let totalDamage = 0;
  if (move.power > 0 && !targetWasFainted) {
    const multi = move.effects.find((e): e is Extract<MoveEffect, { kind: "multiHit" }> => e.kind === "multiHit");
    const hits = multi ? rollInt(rng, multi.min, multi.max) : 1;
    for (let h = 0; h < hits && target.mon.currentHp > 0; h++) {
      const dmg = calcDamage(data, actor, target, move, rng);
      const hpAfter = applyDamage(target, dmg.amount, data);
      totalDamage += dmg.amount;
      events.push({
        kind: "damage",
        side: opponentOf(actorSide),
        amount: dmg.amount,
        hpAfter,
        maxHp: monMaxHp(data, target),
        effectiveness: dmg.effectiveness,
        crit: dmg.crit,
      });
    }
    if (hits > 1) events.push({ kind: "text", text: `Hit ${hits} times!` });
  }

  executeMoveEffects(data, state, actorSide, move, totalDamage, rng, events);

  // Only announce a NEW faint — never re-faint an already-downed target.
  if (target.mon.currentHp <= 0 && !targetWasFainted) {
    events.push({ kind: "faint", side: opponentOf(actorSide) });
  }
  if (actor.mon.currentHp <= 0) {
    events.push({ kind: "faint", side: actorSide });
  }
}

function displayName(data: GameData, c: Combatant): string {
  return c.mon.nickname ?? data.species[c.mon.speciesId].name;
}

function endOfTurn(data: GameData, state: BattleState, rng: Rng, events: BattleEvent[]): void {
  for (const which of ["player", "foe"] as Side[]) {
    const c = side(state, which).active;
    if (c.mon.currentHp <= 0) continue;
    c.stamina = Math.min(MAX_STAMINA, c.stamina + STAMINA_REGEN);
    if (c.mon.status) {
      const status = data.statuses[c.mon.status];
      if (status?.dotFraction) {
        const amount = Math.max(1, Math.floor(monMaxHp(data, c) * status.dotFraction));
        const hpAfter = applyDamage(c, amount, data);
        events.push({ kind: "statusHurt", side: which, statusId: status.id, amount, hpAfter, maxHp: monMaxHp(data, c) });
        if (hpAfter <= 0) events.push({ kind: "faint", side: which });
      }
      if (status?.endChancePerTurn && rollChance(rng, status.endChancePerTurn)) {
        events.push({ kind: "statusEnded", side: which, statusId: c.mon.status });
        c.mon.status = null;
      }
    }
    c.flinched = false;
  }
}

function checkBossPhase(state: BattleState, data: GameData, events: BattleEvent[]): void {
  const phases = state.config.bossPhases;
  if (!phases || state.phaseIndex >= phases.length) return;
  const boss = state.foe.active;
  const frac = boss.mon.currentHp / monMaxHp(data, boss);
  const next = phases[state.phaseIndex];
  if (boss.mon.currentHp > 0 && frac <= next.hpThreshold) {
    state.phaseIndex++;
    events.push({ kind: "bossPhase", announcement: next.announcement });
    for (const [stat, stages] of Object.entries(next.statBoosts)) {
      const before = boss.stages[stat as StageableStat];
      boss.stages[stat as StageableStat] = Math.max(-4, Math.min(4, before + (stages as number)));
      const applied = boss.stages[stat as StageableStat] - before;
      if (applied !== 0) {
        events.push({ kind: "statStage", side: "foe", stat: stat as StageableStat, stages: applied });
      }
    }
  }
}

function grantVictoryRewards(
  data: GameData,
  state: BattleState,
  faintedFoe: MonsterInstance,
  events: BattleEvent[],
): void {
  const winner = state.player.active.mon;
  if (winner.currentHp <= 0) return;
  let evolveEmitted = false;
  const foeSpecies = data.species[faintedFoe.speciesId];
  const gained = xpGain(foeSpecies.xpYield, faintedFoe.level, state.config.kind !== "wild");
  winner.xp += gained;
  events.push({ kind: "xp", amount: gained, monUid: winner.uid });

  const species = data.species[winner.speciesId];
  while (winner.level < 40 && winner.xp >= xpForLevel(winner.level + 1)) {
    const prevMoves = movesAtLevel(species, winner.level);
    winner.level += 1;
    // Full-heal proportional bump: raise current HP by the max-HP increase.
    winner.currentHp += maxHpAt(species.baseStats.hp, winner.level) - maxHpAt(species.baseStats.hp, winner.level - 1);
    events.push({ kind: "levelUp", monUid: winner.uid, level: winner.level });
    const nowMoves = movesAtLevel(species, winner.level);
    for (const m of nowMoves) {
      if (!prevMoves.includes(m) && !winner.moves.includes(m)) {
        winner.moves = [...winner.moves, m].slice(-4);
        events.push({ kind: "moveLearned", monUid: winner.uid, moveId: m, moveName: data.moves[m]?.name ?? m });
      }
    }
    if (!evolveEmitted && species.evolvesTo && species.evolveLevel && winner.level >= species.evolveLevel) {
      evolveEmitted = true;
      events.push({ kind: "readyToEvolve", monUid: winner.uid, toSpeciesId: species.evolvesTo });
    }
  }
}

/** Foe active mon is down: grant XP once, then send in the bench or end the
 *  battle. Handles KOs from moves, recoil, and end-of-turn status damage. */
function settleFoeFaint(data: GameData, state: BattleState, events: BattleEvent[]): void {
  const fainted = state.foe.active.mon;
  if (fainted.currentHp > 0 || state.outcome !== "ongoing") return;

  if (!state.rewardedFoeUids.includes(fainted.uid)) {
    state.rewardedFoeUids.push(fainted.uid);
    grantVictoryRewards(data, state, fainted, events);
  }

  const nextFoe = state.foe.party.findIndex((m) => m.currentHp > 0);
  if (nextFoe === -1) {
    state.outcome = "victory";
    events.push({ kind: "end", outcome: "victory" });
  } else {
    state.foe.activeIndex = nextFoe;
    state.foe.active = makeCombatant(state.foe.party[nextFoe]);
    events.push({ kind: "switchIn", side: "foe", partyIndex: nextFoe, speciesId: state.foe.party[nextFoe].speciesId, level: state.foe.party[nextFoe].level });
  }
}

// ---------------------------------------------------------------------------
/** Advance the battle by one full turn given both actions. Mutates state, returns events. */
export function stepBattle(
  data: GameData,
  state: BattleState,
  playerAction: BattleAction,
  foeAction: BattleAction,
  rng: Rng,
): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (state.outcome !== "ongoing") return events;

  // -- Instant player actions resolve before moves.
  if (playerAction.kind === "flee") {
    const success = state.config.canFlee && rollChance(rng, 0.75);
    events.push({ kind: "fleeAttempt", success });
    if (success) {
      state.outcome = "fled";
      events.push({ kind: "end", outcome: "fled" });
      return events;
    }
  } else if (playerAction.kind === "sync") {
    if (state.config.canSync) {
      const chance = syncChance(data, state.foe.active);
      events.push({ kind: "syncAttempt", chance });
      if (rollChance(rng, chance)) {
        state.outcome = "synced";
        events.push({ kind: "syncResult", success: true, speciesId: state.foe.active.mon.speciesId });
        events.push({ kind: "end", outcome: "synced" });
        return events;
      }
      events.push({ kind: "syncResult", success: false, speciesId: state.foe.active.mon.speciesId });
    }
  } else if (playerAction.kind === "switch") {
    const target = state.player.party[playerAction.partyIndex];
    if (target && target.currentHp > 0 && playerAction.partyIndex !== state.player.activeIndex) {
      state.player.activeIndex = playerAction.partyIndex;
      state.player.active = makeCombatant(target);
      events.push({ kind: "switchIn", side: "player", partyIndex: playerAction.partyIndex, speciesId: target.speciesId, level: target.level });
    }
  }

  // -- Move resolution in speed order.
  const order: Side[] = [];
  const playerMove = playerAction.kind === "move" ? (data.moves[playerAction.moveId] ?? FLAIL) : null;
  const foeMove = foeAction.kind === "move" ? (data.moves[foeAction.moveId] ?? FLAIL) : null;
  const pPriority = playerMove?.effects.some((e) => e.kind === "priority") ? 1 : 0;
  const fPriority = foeMove?.effects.some((e) => e.kind === "priority") ? 1 : 0;
  const pSpeed = effectiveStat(data, state.player.active, "speed");
  const fSpeed = effectiveStat(data, state.foe.active, "speed");
  const playerFirst = pPriority !== fPriority ? pPriority > fPriority : pSpeed !== fSpeed ? pSpeed > fSpeed : rollChance(rng, 0.5);
  if (playerMove) order.push("player");
  if (foeMove) order.push("foe");
  if (order.length === 2 && !playerFirst) order.reverse();

  // The foe that chose this turn's action; a mid-turn replacement must NOT
  // inherit and execute its dead predecessor's move.
  const chosenFoe = state.foe.active.mon;

  for (const actor of order) {
    if (state.outcome !== "ongoing") break;
    const action = actor === "player" ? playerAction : foeAction;
    if (action.kind !== "move") continue;
    if (actor === "foe" && state.foe.active.mon !== chosenFoe) continue;
    executeMove(data, state, actor, action.moveId, rng, events);

    // Faints from the move itself or its recoil, either side.
    settleFoeFaint(data, state, events);
    if (state.outcome === "ongoing" && state.player.party.every((m) => m.currentHp <= 0)) {
      state.outcome = "defeat";
      events.push({ kind: "end", outcome: "defeat" });
    }
    // (Player fainted with healthy bench: battle waits for forceSwitch.)
    checkBossPhase(state, data, events);
  }

  if (state.outcome === "ongoing") {
    endOfTurn(data, state, rng, events);
    // End-of-turn status damage can KO either side too.
    settleFoeFaint(data, state, events);
    if (state.outcome === "ongoing" && state.player.party.every((m) => m.currentHp <= 0)) {
      state.outcome = "defeat";
      events.push({ kind: "end", outcome: "defeat" });
    }
    state.turn += 1;
  }
  return events;
}

/** Player fainted but has healthy party members: force-switch. */
export function forceSwitch(state: BattleState, partyIndex: number): BattleEvent[] {
  const target = state.player.party[partyIndex];
  if (!target || target.currentHp <= 0) return [];
  state.player.activeIndex = partyIndex;
  state.player.active = makeCombatant(target);
  return [{ kind: "switchIn", side: "player", partyIndex, speciesId: target.speciesId, level: target.level }];
}
