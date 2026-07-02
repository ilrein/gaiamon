import type { MonsterInstance, SpeciesDef, StatBlock, StageableStat } from "./model";

// Derived stats. Classic-inspired curve, tuned for levels 1-40 in v1.
export function statAt(base: number, level: number): number {
  return Math.floor((base * 2 * level) / 100) + 5;
}

export function maxHpAt(baseHp: number, level: number): number {
  return Math.floor((baseHp * 2 * level) / 100) + level + 10;
}

export function computeStats(species: SpeciesDef, level: number): StatBlock {
  return {
    hp: maxHpAt(species.baseStats.hp, level),
    attack: statAt(species.baseStats.attack, level),
    defense: statAt(species.baseStats.defense, level),
    spirit: statAt(species.baseStats.spirit, level),
    speed: statAt(species.baseStats.speed, level),
  };
}

// Cubic XP curve: total xp required to BE level n.
export function xpForLevel(level: number): number {
  return level * level * level;
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.cbrt(xp)));
}

export function xpGain(foeXpYield: number, foeLevel: number, isTrainerBattle: boolean): number {
  const base = Math.floor((foeXpYield * foeLevel) / 5);
  return isTrainerBattle ? Math.floor(base * 1.5) : base;
}

/** Stage multiplier for -4..+4, the classic (2+s)/2 ladder. */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

export type StageMap = Record<StageableStat, number>;

export function freshStages(): StageMap {
  return { attack: 0, defense: 0, spirit: 0, speed: 0 };
}

/** Moves known at a given level (last 4 from learnset order). */
export function movesAtLevel(species: SpeciesDef, level: number): string[] {
  const known = species.learnset.filter((l) => l.level <= level).map((l) => l.moveId);
  return known.slice(-4);
}

export function makeInstance(
  species: SpeciesDef,
  level: number,
  uid: string,
): MonsterInstance {
  return {
    uid,
    speciesId: species.id,
    nickname: null,
    level,
    xp: xpForLevel(level),
    currentHp: maxHpAt(species.baseStats.hp, level),
    moves: movesAtLevel(species, level),
    status: null,
  };
}
