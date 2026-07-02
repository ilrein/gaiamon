// Core data model for Gaiamon. Pure types — no engine logic, no DOM, no three.js.
// Everything here is shared between client, future server (Durable Objects), and tests.

export const TYPE_IDS = [
  "neutral",
  "verdant",
  "ember",
  "tide",
  "zephyr",
  "terra",
  "volt",
  "frost",
  "umbral",
  "lumen",
  "fable",
] as const;
export type TypeId = (typeof TYPE_IDS)[number];

export const STAT_NAMES = ["hp", "attack", "defense", "spirit", "speed"] as const;
export type StatName = (typeof STAT_NAMES)[number];
export type StatBlock = Record<StatName, number>;

/** Stats that can be staged up/down in battle (-4..+4). HP cannot. */
export type StageableStat = Exclude<StatName, "hp">;

// ---------------------------------------------------------------------------
// Statuses are data-driven: the engine implements these behavior knobs, and
// the design data supplies named statuses with concrete numbers.
export interface StatusDef {
  id: string;
  name: string;
  /** Fraction of max HP lost at end of each turn (e.g. 0.0625). */
  dotFraction?: number;
  /** Chance the afflicted mon loses its action this turn (0..1). */
  skipTurnChance?: number;
  /** Flat multipliers applied to stats while afflicted (e.g. { attack: 0.5 }). */
  statMultipliers?: Partial<Record<StageableStat, number>>;
  /** Chance the status wears off at end of each turn (0..1; 0 = permanent in battle). */
  endChancePerTurn?: number;
  /** Multiplier applied to Codex sync chance while afflicted (>= 1). */
  syncBonus: number;
  /** Short battle-log flavor, e.g. "is wreathed in cinders". */
  flavor: string;
}

// ---------------------------------------------------------------------------
// Moves use a closed effect vocabulary. The engine implements exactly these.
export type MoveEffect =
  | { kind: "applyStatus"; status: string; chance: number; target: "self" | "foe" }
  | { kind: "statStage"; stat: StageableStat; stages: number; target: "self" | "foe"; chance?: number }
  | { kind: "heal"; percent: number }
  | { kind: "drain"; percent: number }
  | { kind: "recoil"; percent: number }
  | { kind: "priority" }
  | { kind: "flinch"; chance: number }
  | { kind: "multiHit"; min: number; max: number };

export type MoveCategory = "physical" | "spirit" | "status";

export interface MoveDef {
  id: string;
  name: string;
  type: TypeId;
  category: MoveCategory;
  /** 0 for pure status moves. */
  power: number;
  /** 0..100. */
  accuracy: number;
  /** Stamina cost 0..4. */
  stamina: number;
  effects: MoveEffect[];
  description: string;
}

// ---------------------------------------------------------------------------
export type SpeciesRole = "starter-verdant" | "starter-ember" | "starter-tide" | "wild" | "titan";

export interface SpeciesDef {
  id: string;
  name: string;
  types: TypeId[];
  role: SpeciesRole;
  stage: 1 | 2 | 3;
  evolvesTo: string | null;
  evolveLevel: number | null;
  baseStats: StatBlock;
  /** Codex sync base rate 0..1 (0 = unsyncable). */
  syncRate: number;
  xpYield: number;
  dexEntry: string;
  /** The "thing that never happened" design idea behind this creature. */
  inspiration: string;
  /** Prompt used to generate this creature's sprite. Kept for the open art pipeline. */
  visualPrompt: string;
  learnset: { level: number; moveId: string }[];
}

// ---------------------------------------------------------------------------
// A concrete creature owned by a player or encountered in the wild.
export interface MonsterInstance {
  /** Unique per save. */
  uid: string;
  speciesId: string;
  nickname: string | null;
  level: number;
  xp: number;
  currentHp: number;
  /** Up to 4 known move ids. */
  moves: string[];
  status: string | null;
}

export interface TrainerDef {
  id: string;
  name: string;
  /** e.g. "Keeper of the Verdant Sanctum". */
  title: string;
  kind: "trainer" | "boss";
  party: { speciesId: string; level: number }[];
  dialogue: { intro: string[]; win: string[]; lose: string[] };
  /** Progression flag set when defeated. */
  defeatFlag: string;
  bossPhases?: { hpThreshold: number; statBoosts: Partial<Record<StageableStat, number>>; announcement: string }[];
}

export interface PlayerState {
  name: string;
  party: MonsterInstance[];
  /** Species ids ever synced (dex). */
  registered: string[];
  /** Progression flags: "starter-chosen", "trial-complete", "keeper-defeated", "titan-defeated", ... */
  flags: string[];
  areaId: string;
  pos: { x: number; z: number };
  nextUid: number;
}
