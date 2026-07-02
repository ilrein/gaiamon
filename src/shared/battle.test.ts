// Unit tests for the Gaiamon battle engine (src/shared/battle.ts).
//
// Everything is driven by small synthetic fixtures built inline below — we do
// NOT depend on src/data (which doesn't exist yet). The engine is pure and
// deterministic, so most assertions either (a) drive stepBattle with a seeded
// Rng and inspect the emitted event stream, or (b) call the exported pure
// helpers (calcDamage / syncChance / effectiveness) with hand-crafted rngs.

import { describe, test, expect } from "bun:test";
import { makeRng, type Rng } from "./rng";
import { maxHpAt, xpForLevel, movesAtLevel } from "./stats";
import {
  startBattle,
  stepBattle,
  calcDamage,
  syncChance,
  effectiveness,
  makeCombatant,
  forceSwitch,
  FLAIL,
  type GameData,
  type BattleConfig,
  type BattleState,
  type BattleEvent,
  type BattleAction,
  type Combatant,
} from "./battle";
import type {
  SpeciesDef,
  MoveDef,
  StatusDef,
  MonsterInstance,
  StatBlock,
  TypeId,
} from "./model";

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function stats(hp: number, attack: number, defense: number, spirit: number, speed: number): StatBlock {
  return { hp, attack, defense, spirit, speed };
}

function mkSpecies(o: Partial<SpeciesDef> & { id: string; types: TypeId[]; baseStats: StatBlock }): SpeciesDef {
  return {
    name: o.id,
    role: "wild",
    stage: 1,
    evolvesTo: null,
    evolveLevel: null,
    syncRate: 0,
    xpYield: 60,
    dexEntry: "",
    visualPrompt: "",
    learnset: [],
    ...o,
  };
}

function mkMove(o: Partial<MoveDef> & { id: string }): MoveDef {
  return {
    name: o.id,
    type: "neutral",
    category: "physical",
    power: 0,
    accuracy: 100,
    stamina: 0,
    effects: [],
    description: "",
    ...o,
  };
}

// Two statuses as required:
//  - sear: dotFraction + syncBonus (permanent; no expiry, no skip)
//  - stun: skipTurnChance + statMultipliers (+ endChancePerTurn for expiry tests)
const STATUSES: Record<string, StatusDef> = {
  sear: { id: "sear", name: "Seared", dotFraction: 0.125, syncBonus: 2.0, flavor: "is wreathed in cinders" },
  stun: {
    id: "stun",
    name: "Stunned",
    skipTurnChance: 0.3,
    statMultipliers: { attack: 0.5 },
    endChancePerTurn: 0.3,
    syncBonus: 1.5,
    flavor: "is dazed",
  },
};

const SPECIES: Record<string, SpeciesDef> = {
  pyro: mkSpecies({
    id: "pyro",
    types: ["ember"],
    role: "starter-ember",
    evolvesTo: "pyrolord",
    evolveLevel: 5,
    baseStats: stats(60, 60, 50, 50, 70),
    syncRate: 0.2,
    xpYield: 100,
    learnset: [
      { level: 1, moveId: "strike" },
      { level: 1, moveId: "flame" },
      { level: 3, moveId: "quickJab" },
      { level: 5, moveId: "inferno" },
      { level: 6, moveId: "drainKiss" },
    ],
  }),
  pyrolord: mkSpecies({ id: "pyrolord", types: ["ember"], stage: 2, baseStats: stats(90, 90, 70, 70, 90), syncRate: 0.2, xpYield: 180 }),
  // leaf / wave / wisp share identical baseStats so effectiveness tests isolate
  // the type multiplier (only their TYPE and syncRate differ).
  leaf: mkSpecies({ id: "leaf", types: ["verdant"], baseStats: stats(60, 50, 50, 50, 50), syncRate: 0.05, xpYield: 60 }),
  wave: mkSpecies({ id: "wave", types: ["tide"], baseStats: stats(60, 50, 50, 50, 50), syncRate: 0.5, xpYield: 60 }),
  wisp: mkSpecies({ id: "wisp", types: ["umbral"], baseStats: stats(60, 50, 50, 50, 50), syncRate: 0, xpYield: 60 }),
  titan: mkSpecies({ id: "titan", types: ["verdant"], role: "titan", baseStats: stats(120, 60, 60, 50, 40), syncRate: 0, xpYield: 200 }),
  // "dummy" foes: trivial to KO, used purely to drive victory-reward / xp math.
  // xpYield is baked per species so foe LEVEL can stay 1 (keeps them fragile).
  dummyLow: mkSpecies({ id: "dummyLow", types: ["neutral"], baseStats: stats(1, 1, 1, 1, 1), xpYield: 60 }),
  dummyMed: mkSpecies({ id: "dummyMed", types: ["neutral"], baseStats: stats(1, 1, 1, 1, 1), xpYield: 400 }),
  dummyHi: mkSpecies({ id: "dummyHi", types: ["neutral"], baseStats: stats(1, 1, 1, 1, 1), xpYield: 500 }),
  dummyHuge: mkSpecies({ id: "dummyHuge", types: ["neutral"], baseStats: stats(1, 1, 1, 1, 1), xpYield: 3000 }),
};

const MOVES: Record<string, MoveDef> = {
  strike: mkMove({ id: "strike", type: "neutral", power: 40, stamina: 1 }),
  flame: mkMove({ id: "flame", type: "ember", power: 50, stamina: 2 }),
  inferno: mkMove({ id: "inferno", type: "ember", power: 80, stamina: 4 }),
  searTouch: mkMove({ id: "searTouch", type: "ember", category: "status", power: 0, stamina: 1, effects: [{ kind: "applyStatus", status: "sear", chance: 1, target: "foe" }] }),
  stunGaze: mkMove({ id: "stunGaze", category: "status", power: 0, effects: [{ kind: "applyStatus", status: "stun", chance: 1, target: "foe" }] }),
  empower: mkMove({ id: "empower", category: "status", power: 0, effects: [{ kind: "statStage", stat: "attack", stages: 3, target: "self", chance: 1 }] }),
  sap: mkMove({ id: "sap", category: "status", power: 0, effects: [{ kind: "statStage", stat: "attack", stages: -3, target: "foe", chance: 1 }] }),
  drainKiss: mkMove({ id: "drainKiss", power: 40, stamina: 1, effects: [{ kind: "drain", percent: 50 }] }),
  recklessCharge: mkMove({ id: "recklessCharge", power: 60, stamina: 1, effects: [{ kind: "recoil", percent: 33 }] }),
  mend: mkMove({ id: "mend", category: "status", power: 0, effects: [{ kind: "heal", percent: 50 }] }),
  quickJab: mkMove({ id: "quickJab", power: 30, stamina: 1, effects: [{ kind: "priority" }] }),
  flurry: mkMove({ id: "flurry", power: 10, stamina: 1, effects: [{ kind: "multiHit", min: 2, max: 5 }] }),
  boo: mkMove({ id: "boo", power: 20, stamina: 1, effects: [{ kind: "flinch", chance: 1 }] }),
  wait: mkMove({ id: "wait", category: "status", power: 0, stamina: 0 }),
};

const DATA: GameData = {
  species: SPECIES,
  moves: MOVES,
  statuses: STATUSES,
  // ember: 2x verdant, 0.5x tide, 0x umbral. Everything else falls through to 1.
  typeChart: { ember: { verdant: 2, tide: 0.5, umbral: 0 } },
};

// ---------------------------------------------------------------------------
// Instance / combatant / rng helpers
// ---------------------------------------------------------------------------

let uidCounter = 0;
function mkInst(speciesId: string, level: number, over: Partial<MonsterInstance> = {}): MonsterInstance {
  const s = DATA.species[speciesId];
  return {
    uid: `u${uidCounter++}`,
    speciesId,
    nickname: null,
    level,
    xp: xpForLevel(level),
    currentHp: maxHpAt(s.baseStats.hp, level),
    moves: movesAtLevel(s, level),
    status: null,
    ...over,
  };
}

function combatant(speciesId: string, level: number, over: Partial<MonsterInstance> = {}): Combatant {
  return makeCombatant(mkInst(speciesId, level, over));
}

/** Rng that returns each value in turn, sticking on the last one. */
function seqRng(vals: number[]): Rng {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
}

/** Brute-force search for a seed satisfying a predicate. */
function findSeed(pred: (seed: number) => boolean, limit = 2_000_000): number {
  for (let s = 1; s < limit; s++) if (pred(s)) return s;
  throw new Error("no seed satisfied predicate");
}

const move = (moveId: string): BattleAction => ({ kind: "move", moveId });

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
  test("same seed + same actions produce identical event streams", () => {
    const run = () => {
      uidCounter = 0; // stable uids so the two runs are byte-identical
      const s = startBattle({ kind: "wild", canFlee: true, canSync: true }, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
      const events: BattleEvent[] = [];
      for (let t = 0; t < 3; t++) {
        events.push(...stepBattle(DATA, s, move("flame"), move("strike"), makeRng(4242 + t)));
      }
      return { events, hp: s.foe.active.mon.currentHp };
    };
    const a = run();
    const b = run();
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    expect(a.hp).toBe(b.hp);
    // Sanity: the stream actually did something.
    expect(a.events.some((e) => e.kind === "damage")).toBe(true);
  });

  test("different seeds diverge", () => {
    const run = (seed: number) => {
      const s = startBattle({ kind: "wild", canFlee: true, canSync: true }, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
      return stepBattle(DATA, s, move("flame"), move("strike"), makeRng(seed));
    };
    // Overwhelmingly likely two arbitrary seeds differ somewhere in the stream.
    expect(JSON.stringify(run(1))).not.toBe(JSON.stringify(run(2)));
  });
});

// ---------------------------------------------------------------------------
// effectiveness()
// ---------------------------------------------------------------------------

describe("effectiveness", () => {
  test("2x / 0.5x / 0x / 1x (missing) entries", () => {
    expect(effectiveness(DATA, "ember", ["verdant"])).toBe(2);
    expect(effectiveness(DATA, "ember", ["tide"])).toBe(0.5);
    expect(effectiveness(DATA, "ember", ["umbral"])).toBe(0);
    expect(effectiveness(DATA, "ember", ["neutral"])).toBe(1);
    expect(effectiveness(DATA, "neutral", ["verdant"])).toBe(1);
  });

  test("dual types multiply", () => {
    expect(effectiveness(DATA, "ember", ["verdant", "tide"])).toBe(1); // 2 * 0.5
    expect(effectiveness(DATA, "ember", ["verdant", "umbral"])).toBe(0); // 2 * 0
  });
});

// ---------------------------------------------------------------------------
// calcDamage
// ---------------------------------------------------------------------------

describe("calcDamage", () => {
  // No crit, fixed variance -> deterministic amount for a given (atk, def, move).
  const noCrit = () => seqRng([0.9, 0.5]);

  test("effectiveness multiplier flows into amount and field", () => {
    const atk = combatant("pyro", 20);
    const dmg2x = calcDamage(DATA, atk, combatant("leaf", 20), MOVES.flame, noCrit());
    const dmgHalf = calcDamage(DATA, atk, combatant("wave", 20), MOVES.flame, noCrit());
    const dmg0x = calcDamage(DATA, atk, combatant("wisp", 20), MOVES.flame, noCrit());

    expect(dmg2x.effectiveness).toBe(2);
    expect(dmgHalf.effectiveness).toBe(0.5);
    expect(dmg0x.effectiveness).toBe(0);

    // leaf/wave/wisp share baseStats, so only the multiplier differs.
    expect(dmg2x.amount).toBeGreaterThan(dmgHalf.amount);
    expect(dmgHalf.amount).toBeGreaterThan(dmg0x.amount);
    // 0x still floors to the minimum 1 (never 0).
    expect(dmg0x.amount).toBe(1);
  });

  test("affinity gives same-type moves ~1.5x", () => {
    // pyro is ember; both moves are power 50 physical vs a neutral defender
    // (eff = 1 for both), so the only difference is affinity.
    const atk = combatant("pyro", 20);
    const def = combatant("dummyLow", 20);
    const emberMove = mkMove({ id: "e", type: "ember", power: 50, category: "physical" });
    const neutralMove = mkMove({ id: "n", type: "neutral", power: 50, category: "physical" });
    const withAff = calcDamage(DATA, atk, def, emberMove, noCrit());
    const noAff = calcDamage(DATA, atk, def, neutralMove, noCrit());
    expect(withAff.effectiveness).toBe(1);
    expect(noAff.effectiveness).toBe(1);
    expect(withAff.amount).toBeGreaterThan(noAff.amount);
    expect(withAff.amount / noAff.amount).toBeCloseTo(1.5, 1);
  });

  test("crit multiplies ~1.5x with variance held equal", () => {
    const atk = combatant("pyro", 20);
    const def = combatant("leaf", 20);
    // rng[0] = crit roll (<0.0625 => crit), rng[1] = variance.
    const crit = calcDamage(DATA, atk, def, MOVES.flame, seqRng([0.0, 0.5]));
    const plain = calcDamage(DATA, atk, def, MOVES.flame, seqRng([0.9, 0.5]));
    expect(crit.crit).toBe(true);
    expect(plain.crit).toBe(false);
    expect(crit.amount).toBeGreaterThan(plain.amount);
    expect(crit.amount / plain.amount).toBeCloseTo(1.5, 1);
  });

  test("a real seed eventually crits", () => {
    const atk = combatant("pyro", 20);
    const def = combatant("leaf", 20);
    const seed = findSeed((s) => calcDamage(DATA, atk, def, MOVES.flame, makeRng(s)).crit);
    expect(calcDamage(DATA, atk, def, MOVES.flame, makeRng(seed)).crit).toBe(true);
  });

  test("higher level attacker deals more damage", () => {
    const def = combatant("leaf", 20);
    const low = calcDamage(DATA, combatant("pyro", 10), def, MOVES.flame, noCrit());
    const high = calcDamage(DATA, combatant("pyro", 20), def, MOVES.flame, noCrit());
    expect(high.amount).toBeGreaterThan(low.amount);
  });

  test("physical vs spirit categories read different stats", () => {
    // pyro has attack 60 but spirit 50; a physical hit should out-damage a
    // spirit hit of identical power vs the same defender.
    const atk = combatant("pyro", 20);
    const def = combatant("leaf", 20);
    const phys = calcDamage(DATA, atk, def, mkMove({ id: "p", type: "neutral", power: 50, category: "physical" }), noCrit());
    const spir = calcDamage(DATA, atk, def, mkMove({ id: "s", type: "neutral", power: 50, category: "spirit" }), noCrit());
    expect(phys.amount).toBeGreaterThan(spir.amount);
  });
});

// ---------------------------------------------------------------------------
// Stat stages
// ---------------------------------------------------------------------------

describe("stat stages", () => {
  const noCrit = () => seqRng([0.9, 0.5]);

  test("positive stages raise, negative lower, ordered", () => {
    const def = combatant("leaf", 20);
    const at = (stage: number) => {
      const atk = combatant("pyro", 20);
      atk.stages.attack = stage;
      return calcDamage(DATA, atk, def, MOVES.flame, noCrit()).amount;
    };
    expect(at(4)).toBeGreaterThan(at(2));
    expect(at(2)).toBeGreaterThan(at(0));
    expect(at(0)).toBeGreaterThan(at(-2));
    expect(at(-2)).toBeGreaterThan(at(-4));
  });

  test("self stat boost clamps at +4", () => {
    const s = startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    const t1 = stepBattle(DATA, s, move("empower"), move("wait"), makeRng(1));
    expect(s.player.active.stages.attack).toBe(3);
    expect(t1.some((e) => e.kind === "statStage" && e.side === "player")).toBe(true);

    const t2 = stepBattle(DATA, s, move("empower"), move("wait"), makeRng(2));
    expect(s.player.active.stages.attack).toBe(4); // 3 + 3 clamped
    const boost = t2.find((e): e is Extract<BattleEvent, { kind: "statStage" }> => e.kind === "statStage" && e.side === "player");
    expect(boost).toBeDefined();
    // The event reports the APPLIED delta after clamping (3 -> 4 is +1).
    if (boost) expect(boost.stages).toBe(1);

    const t3 = stepBattle(DATA, s, move("empower"), move("wait"), makeRng(3));
    expect(s.player.active.stages.attack).toBe(4); // no change
    expect(t3.some((e) => e.kind === "statStage" && e.side === "player")).toBe(false);
  });

  test("foe stat drop clamps at -4", () => {
    const s = startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    stepBattle(DATA, s, move("sap"), move("wait"), makeRng(1));
    expect(s.foe.active.stages.attack).toBe(-3);
    stepBattle(DATA, s, move("sap"), move("wait"), makeRng(2));
    expect(s.foe.active.stages.attack).toBe(-4); // -3 + -3 clamped
    const t3 = stepBattle(DATA, s, move("sap"), move("wait"), makeRng(3));
    expect(s.foe.active.stages.attack).toBe(-4);
    expect(t3.some((e) => e.kind === "statStage" && e.side === "foe")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status effects
// ---------------------------------------------------------------------------

describe("status", () => {
  test("dot damage lands at end of turn", () => {
    const s = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("pyro", 20)],
      [mkInst("leaf", 10, { status: "sear", currentHp: maxHpAt(SPECIES.leaf.baseStats.hp, 10) })],
    );
    const ev = stepBattle(DATA, s, move("wait"), move("wait"), makeRng(1));
    const hurt = ev.find((e) => e.kind === "statusHurt" && e.side === "foe");
    expect(hurt).toBeDefined();
    if (hurt && hurt.kind === "statusHurt") {
      expect(hurt.statusId).toBe("sear");
      // floor(maxHp * 0.125); maxHp(leaf,10) = 32 -> 4.
      expect(hurt.amount).toBe(4);
    }
  });

  test("skipTurnChance can block the action", () => {
    const build = (): BattleState =>
      startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 20, { status: "stun" })], [mkInst("leaf", 20)]);
    const blockedSeed = findSeed((seed) => {
      const ev = stepBattle(DATA, build(), move("flame"), move("wait"), makeRng(seed));
      return ev.some((e) => e.kind === "text" && e.text.includes("can't move"));
    });
    const ev = stepBattle(DATA, build(), move("flame"), move("wait"), makeRng(blockedSeed));
    // Blocked: player never issues its move, foe takes no damage.
    expect(ev.some((e) => e.kind === "moveUsed" && e.side === "player")).toBe(false);
    expect(ev.some((e) => e.kind === "damage" && e.side === "foe")).toBe(false);

    // Control: a seed where it is NOT blocked -> the move goes through.
    const okSeed = findSeed((seed) => {
      const e = stepBattle(DATA, build(), move("flame"), move("wait"), makeRng(seed));
      return e.some((x) => x.kind === "moveUsed" && x.side === "player");
    });
    const ok = stepBattle(DATA, build(), move("flame"), move("wait"), makeRng(okSeed));
    expect(ok.some((e) => e.kind === "damage" && e.side === "foe")).toBe(true);
  });

  test("statMultipliers reduce the stat (attack -> less damage)", () => {
    const def = combatant("leaf", 20);
    const dmgNormal = calcDamage(DATA, combatant("pyro", 20), def, MOVES.flame, seqRng([0.9, 0.5]));
    const dmgStunned = calcDamage(DATA, combatant("pyro", 20, { status: "stun" }), def, MOVES.flame, seqRng([0.9, 0.5]));
    expect(dmgStunned.amount).toBeLessThan(dmgNormal.amount);
  });

  test("endChancePerTurn eventually expires the status", () => {
    const build = (): BattleState =>
      startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 20)], [mkInst("leaf", 20, { status: "stun" })]);
    const expireSeed = findSeed((seed) => {
      const st = build();
      const ev = stepBattle(DATA, st, move("wait"), move("wait"), makeRng(seed));
      return st.foe.active.mon.status === null && ev.some((e) => e.kind === "statusEnded" && e.side === "foe");
    });
    const st = build();
    stepBattle(DATA, st, move("wait"), move("wait"), makeRng(expireSeed));
    expect(st.foe.active.mon.status).toBeNull();

    // Control: a seed where it does NOT expire.
    const keepSeed = findSeed((seed) => {
      const s2 = build();
      stepBattle(DATA, s2, move("wait"), move("wait"), makeRng(seed));
      return s2.foe.active.mon.status === "stun";
    });
    const s2 = build();
    stepBattle(DATA, s2, move("wait"), move("wait"), makeRng(keepSeed));
    expect(s2.foe.active.mon.status).toBe("stun");
  });

  test("does not overwrite an existing status", () => {
    const s = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("pyro", 20)],
      [mkInst("leaf", 20, { status: "sear" })],
    );
    const ev = stepBattle(DATA, s, move("stunGaze"), move("wait"), makeRng(1));
    expect(ev.some((e) => e.kind === "statusApplied")).toBe(false);
    expect(s.foe.active.mon.status).toBe("sear");
  });

  test("applyStatus can afflict a clean target", () => {
    const s = startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, s, move("stunGaze"), move("wait"), makeRng(1));
    const applied = ev.find((e) => e.kind === "statusApplied" && e.side === "foe");
    expect(applied).toBeDefined();
    expect(s.foe.active.mon.status).toBe("stun");
  });
});

// ---------------------------------------------------------------------------
// syncChance
// ---------------------------------------------------------------------------

describe("syncChance", () => {
  test("clamps to upper bound 0.95", () => {
    const foe = combatant("wave", 10, { currentHp: 1, status: "sear" }); // high syncRate * low hp * syncBonus
    expect(syncChance(DATA, foe)).toBe(0.95);
  });

  test("clamps to lower bound 0.02", () => {
    const foe = combatant("leaf", 10); // syncRate 0.05, full hp
    expect(syncChance(DATA, foe)).toBe(0.02);
  });

  test("lower HP yields higher chance", () => {
    const max = maxHpAt(SPECIES.wave.baseStats.hp, 10);
    const at = (hp: number) => syncChance(DATA, combatant("wave", 10, { currentHp: hp }));
    const full = at(max);
    const half = at(Math.floor(max / 2));
    const low = at(1);
    expect(half).toBeGreaterThan(full);
    expect(low).toBeGreaterThan(half);
  });

  test("status syncBonus multiplies the chance", () => {
    const max = maxHpAt(SPECIES.wave.baseStats.hp, 10);
    const half = Math.floor(max / 2);
    const plain = syncChance(DATA, combatant("wave", 10, { currentHp: half }));
    const boosted = syncChance(DATA, combatant("wave", 10, { currentHp: half, status: "sear" }));
    expect(boosted).toBeGreaterThan(plain);
    expect(boosted / plain).toBeCloseTo(2, 1); // sear syncBonus = 2
  });

  test("syncRate 0 gives 0", () => {
    expect(syncChance(DATA, combatant("wisp", 10, { currentHp: 1 }))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// stepBattle: instant actions & outcomes
// ---------------------------------------------------------------------------

describe("stepBattle sync", () => {
  const cfg: BattleConfig = { kind: "wild", canFlee: false, canSync: true };
  const build = () => startBattle(cfg, [mkInst("pyro", 20)], [mkInst("wave", 10, { currentHp: 1 })]);

  test("successful sync ends the battle as 'synced'", () => {
    const seed = findSeed((s) => {
      const st = build();
      stepBattle(DATA, st, { kind: "sync" }, move("strike"), makeRng(s));
      return st.outcome === "synced";
    });
    const st = build();
    const ev = stepBattle(DATA, st, { kind: "sync" }, move("strike"), makeRng(seed));
    expect(st.outcome).toBe("synced");
    expect(ev.some((e) => e.kind === "syncResult" && e.success)).toBe(true);
    expect(ev.some((e) => e.kind === "end" && e.outcome === "synced")).toBe(true);
  });

  test("failed sync keeps the battle ongoing", () => {
    const seed = findSeed((s) => {
      const st = build();
      const ev = stepBattle(DATA, st, { kind: "sync" }, move("strike"), makeRng(s));
      return st.outcome === "ongoing" && ev.some((e) => e.kind === "syncResult" && !e.success);
    });
    const st = build();
    const ev = stepBattle(DATA, st, { kind: "sync" }, move("strike"), makeRng(seed));
    expect(st.outcome).toBe("ongoing");
    expect(ev.some((e) => e.kind === "syncResult" && !e.success)).toBe(true);
  });

  test("sync is a no-op when config.canSync is false", () => {
    const st = startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 20)], [mkInst("wave", 10, { currentHp: 1 })]);
    const ev = stepBattle(DATA, st, { kind: "sync" }, move("wait"), makeRng(1));
    expect(ev.some((e) => e.kind === "syncAttempt")).toBe(false);
    expect(st.outcome).toBe("ongoing");
  });
});

describe("stepBattle flee", () => {
  const cfg: BattleConfig = { kind: "wild", canFlee: true, canSync: false };
  const build = () => startBattle(cfg, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);

  test("successful flee ends the battle as 'fled'", () => {
    const seed = findSeed((s) => {
      const st = build();
      stepBattle(DATA, st, { kind: "flee" }, move("strike"), makeRng(s));
      return st.outcome === "fled";
    });
    const st = build();
    const ev = stepBattle(DATA, st, { kind: "flee" }, move("strike"), makeRng(seed));
    expect(st.outcome).toBe("fled");
    expect(ev.some((e) => e.kind === "fleeAttempt" && e.success)).toBe(true);
    expect(ev.some((e) => e.kind === "end" && e.outcome === "fled")).toBe(true);
  });

  test("failed flee keeps the battle ongoing and the foe still acts", () => {
    const seed = findSeed((s) => {
      const st = build();
      const ev = stepBattle(DATA, st, { kind: "flee" }, move("strike"), makeRng(s));
      return st.outcome === "ongoing" && ev.some((e) => e.kind === "fleeAttempt" && !e.success);
    });
    const st = build();
    const ev = stepBattle(DATA, st, { kind: "flee" }, move("strike"), makeRng(seed));
    expect(st.outcome).toBe("ongoing");
    expect(ev.some((e) => e.kind === "moveUsed" && e.side === "foe")).toBe(true);
  });

  test("flee is a no-op when config.canFlee is false", () => {
    const st = startBattle({ kind: "trainer", canFlee: false, canSync: false }, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, { kind: "flee" }, move("wait"), makeRng(1));
    // fleeAttempt still emitted, but success is impossible.
    expect(ev.some((e) => e.kind === "fleeAttempt" && e.success)).toBe(false);
    expect(st.outcome).toBe("ongoing");
  });
});

describe("stepBattle switch", () => {
  test("switch to a healthy party member changes the active mon", () => {
    const st = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("pyro", 20), mkInst("leaf", 20)],
      [mkInst("wave", 20)],
    );
    const ev = stepBattle(DATA, st, { kind: "switch", partyIndex: 1 }, move("wait"), makeRng(1));
    expect(st.player.activeIndex).toBe(1);
    expect(st.player.active.mon.speciesId).toBe("leaf");
    const sw = ev.find((e) => e.kind === "switchIn" && e.side === "player");
    expect(sw).toBeDefined();
    if (sw && sw.kind === "switchIn") expect(sw.partyIndex).toBe(1);
  });

  test("switch to a fainted member is ignored", () => {
    const st = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("pyro", 20), mkInst("leaf", 20, { currentHp: 0 })],
      [mkInst("wave", 20)],
    );
    const ev = stepBattle(DATA, st, { kind: "switch", partyIndex: 1 }, move("wait"), makeRng(1));
    expect(st.player.activeIndex).toBe(0);
    expect(ev.some((e) => e.kind === "switchIn" && e.side === "player")).toBe(false);
  });
});

describe("stepBattle victory & defeat", () => {
  test("victory when the foe party is wiped", () => {
    const st = startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("pyro", 30)], [mkInst("leaf", 1)]);
    const ev = stepBattle(DATA, st, move("flame"), move("wait"), makeRng(1));
    expect(st.outcome).toBe("victory");
    expect(ev.some((e) => e.kind === "faint" && e.side === "foe")).toBe(true);
    expect(ev.some((e) => e.kind === "end" && e.outcome === "victory")).toBe(true);
    expect(ev.some((e) => e.kind === "xp")).toBe(true);
  });

  test("defeat when the player party is wiped", () => {
    const st = startBattle({ kind: "wild", canFlee: false, canSync: false }, [mkInst("leaf", 1)], [mkInst("pyro", 30)]);
    const ev = stepBattle(DATA, st, move("wait"), move("flame"), makeRng(1));
    expect(st.outcome).toBe("defeat");
    expect(ev.some((e) => e.kind === "end" && e.outcome === "defeat")).toBe(true);
  });

  test("victory via end-of-turn dot damage", () => {
    const st = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("pyro", 20)],
      [mkInst("leaf", 10, { status: "sear", currentHp: 3 })],
    );
    const ev = stepBattle(DATA, st, move("wait"), move("wait"), makeRng(1));
    expect(st.outcome).toBe("victory");
    expect(ev.some((e) => e.kind === "statusHurt" && e.side === "foe")).toBe(true);
    expect(ev.some((e) => e.kind === "xp")).toBe(true);
  });

  test("defeat via end-of-turn dot damage", () => {
    const st = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("leaf", 10, { status: "sear", currentHp: 3 })],
      [mkInst("pyro", 20)],
    );
    const ev = stepBattle(DATA, st, move("wait"), move("wait"), makeRng(1));
    expect(st.outcome).toBe("defeat");
    expect(ev.some((e) => e.kind === "end" && e.outcome === "defeat")).toBe(true);
  });

  test("force-switch after the active player mon faints", () => {
    const st = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("leaf", 1), mkInst("pyro", 10)],
      [mkInst("pyro", 30)],
    );
    const ev = stepBattle(DATA, st, move("wait"), move("flame"), makeRng(1));
    // Active fainted but a healthy mon remains -> battle waits, no auto switch.
    expect(st.outcome).toBe("ongoing");
    expect(st.player.active.mon.currentHp).toBe(0);
    expect(ev.some((e) => e.kind === "switchIn" && e.side === "player")).toBe(false);

    const sw = forceSwitch(st, 1);
    expect(st.player.activeIndex).toBe(1);
    expect(st.player.active.mon.speciesId).toBe("pyro");
    expect(sw.some((e) => e.kind === "switchIn" && e.side === "player")).toBe(true);
  });

  test("forceSwitch to a fainted index does nothing", () => {
    const st = startBattle(
      { kind: "wild", canFlee: false, canSync: false },
      [mkInst("pyro", 20), mkInst("leaf", 20, { currentHp: 0 })],
      [mkInst("wave", 20)],
    );
    expect(forceSwitch(st, 1)).toEqual([]);
    expect(st.player.activeIndex).toBe(0);
  });

  test("foe faint mid-battle switches in the next foe (party > 1)", () => {
    const st = startBattle(
      { kind: "trainer", canFlee: false, canSync: false },
      [mkInst("pyro", 30)],
      [mkInst("leaf", 1), mkInst("wave", 20)],
    );
    const ev = stepBattle(DATA, st, move("flame"), move("wait"), makeRng(1));
    expect(st.outcome).toBe("ongoing");
    const sw = ev.find((e) => e.kind === "switchIn" && e.side === "foe");
    expect(sw).toBeDefined();
    expect(st.foe.active.mon.speciesId).toBe("wave");
  });
});

// ---------------------------------------------------------------------------
// XP / leveling / evolution
// ---------------------------------------------------------------------------

describe("xp & leveling", () => {
  const cfg: BattleConfig = { kind: "wild", canFlee: false, canSync: false };

  test("xp event fires on foe faint with the correct amount", () => {
    const winner = mkInst("pyro", 5, { xp: xpForLevel(5) });
    const st = startBattle(cfg, [winner], [mkInst("dummyLow", 1)]);
    const ev = stepBattle(DATA, st, move("inferno"), move("wait"), makeRng(1));
    const xp = ev.find((e) => e.kind === "xp");
    expect(xp).toBeDefined();
    if (xp && xp.kind === "xp") {
      expect(xp.monUid).toBe(winner.uid);
      // wild: floor(xpYield * level / 5) = floor(60 * 1 / 5) = 12.
      expect(xp.amount).toBe(12);
    }
  });

  test("crossing one threshold emits a single levelUp", () => {
    const winner = mkInst("pyro", 5, { xp: xpForLevel(5) });
    const st = startBattle(cfg, [winner], [mkInst("dummyHi", 1)]); // gained 100 -> xp 225 -> level 6
    const ev = stepBattle(DATA, st, move("inferno"), move("wait"), makeRng(1));
    const ups = ev.filter((e) => e.kind === "levelUp");
    expect(ups.length).toBe(1);
    expect(winner.level).toBe(6);
  });

  test("crossing several thresholds emits ascending levelUps", () => {
    const winner = mkInst("pyro", 5, { xp: xpForLevel(5) });
    const st = startBattle(cfg, [winner], [mkInst("dummyHuge", 1)]); // gained 600 -> xp 725 -> level 8
    const ev = stepBattle(DATA, st, move("inferno"), move("wait"), makeRng(1));
    const levels = ev.filter((e): e is Extract<BattleEvent, { kind: "levelUp" }> => e.kind === "levelUp").map((e) => e.level);
    expect(levels).toEqual([6, 7, 8]);
    expect(winner.level).toBe(8);
  });

  test("moveLearned respects the last-4 window", () => {
    // Winner already knows 4 moves; leveling to 6 teaches drainKiss (learnset
    // level 6), which must push out the oldest known move.
    const winner = mkInst("pyro", 5, { xp: xpForLevel(5), moves: ["strike", "flame", "quickJab", "inferno"] });
    const st = startBattle(cfg, [winner], [mkInst("dummyHi", 1)]);
    const ev = stepBattle(DATA, st, move("inferno"), move("wait"), makeRng(1));
    const learned = ev.find((e) => e.kind === "moveLearned");
    expect(learned).toBeDefined();
    if (learned && learned.kind === "moveLearned") expect(learned.moveId).toBe("drainKiss");
    expect(winner.moves).toHaveLength(4);
    expect(winner.moves).toContain("drainKiss");
    expect(winner.moves).not.toContain("strike"); // dropped by the last-4 window
  });

  test("readyToEvolve fires when crossing evolveLevel", () => {
    const winner = mkInst("pyro", 4, { xp: xpForLevel(4), moves: ["strike", "flame", "quickJab"] });
    const st = startBattle(cfg, [winner], [mkInst("dummyMed", 1)]); // gained 80 -> xp 144 -> level 5
    const ev = stepBattle(DATA, st, move("inferno"), move("wait"), makeRng(1));
    const evo = ev.filter((e): e is Extract<BattleEvent, { kind: "readyToEvolve" }> => e.kind === "readyToEvolve");
    expect(evo.length).toBe(1);
    expect(evo[0].toSpeciesId).toBe("pyrolord");
    expect(winner.level).toBe(5);
  });

  test("trainer battles grant 1.5x xp", () => {
    const wildWinner = mkInst("pyro", 5, { xp: xpForLevel(5) });
    const wild = startBattle({ kind: "wild", canFlee: false, canSync: false }, [wildWinner], [mkInst("dummyLow", 1)]);
    const wildEv = stepBattle(DATA, wild, move("inferno"), move("wait"), makeRng(1));
    const trainerWinner = mkInst("pyro", 5, { xp: xpForLevel(5) });
    const trainer = startBattle({ kind: "trainer", canFlee: false, canSync: false }, [trainerWinner], [mkInst("dummyLow", 1)]);
    const trainerEv = stepBattle(DATA, trainer, move("inferno"), move("wait"), makeRng(1));
    const wildXp = (wildEv.find((e) => e.kind === "xp") as Extract<BattleEvent, { kind: "xp" }>).amount;
    const trainerXp = (trainerEv.find((e) => e.kind === "xp") as Extract<BattleEvent, { kind: "xp" }>).amount;
    expect(trainerXp).toBe(Math.floor(wildXp * 1.5));
  });
});

// ---------------------------------------------------------------------------
// Move mechanics
// ---------------------------------------------------------------------------

describe("move mechanics", () => {
  const cfg: BattleConfig = { kind: "wild", canFlee: false, canSync: false };

  test("multiHit lands between min and max times, matching the count text", () => {
    const st = startBattle(cfg, [mkInst("pyro", 10)], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, move("flurry"), move("wait"), makeRng(7));
    const hits = ev.filter((e) => e.kind === "damage" && e.side === "foe").length;
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(hits).toBeLessThanOrEqual(5);
    const text = ev.find((e): e is Extract<BattleEvent, { kind: "text" }> => e.kind === "text" && e.text.startsWith("Hit "));
    expect(text).toBeDefined();
    if (text) expect(text.text).toBe(`Hit ${hits} times!`);
  });

  test("drain heals the attacker", () => {
    const st = startBattle(cfg, [mkInst("pyro", 20, { currentHp: 5 })], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, move("drainKiss"), move("wait"), makeRng(1));
    const heal = ev.find((e) => e.kind === "heal" && e.side === "player");
    expect(heal).toBeDefined();
    if (heal && heal.kind === "heal") expect(heal.hpAfter).toBeGreaterThan(5);
  });

  test("recoil damages the attacker", () => {
    const st = startBattle(cfg, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, move("recklessCharge"), move("wait"), makeRng(1));
    // The player deals damage to the foe AND takes recoil on its own side.
    expect(ev.some((e) => e.kind === "damage" && e.side === "foe")).toBe(true);
    expect(ev.some((e) => e.kind === "damage" && e.side === "player")).toBe(true);
  });

  test("heal caps at max HP", () => {
    const max = maxHpAt(SPECIES.pyro.baseStats.hp, 20);
    const st = startBattle(cfg, [mkInst("pyro", 20, { currentHp: max - 1 })], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, move("mend"), move("wait"), makeRng(1));
    const heal = ev.find((e) => e.kind === "heal" && e.side === "player");
    expect(heal).toBeDefined();
    if (heal && heal.kind === "heal") {
      expect(heal.hpAfter).toBe(max);
      expect(heal.maxHp).toBe(max);
    }
  });

  test("priority move acts first despite lower speed", () => {
    // leaf (speed base 50) is slower than pyro (70), but quickJab has priority.
    const st = startBattle(cfg, [mkInst("leaf", 20)], [mkInst("pyro", 20)]);
    const ev = stepBattle(DATA, st, move("quickJab"), move("strike"), makeRng(1));
    const firstMove = ev.find((e) => e.kind === "moveUsed");
    expect(firstMove).toBeDefined();
    if (firstMove && firstMove.kind === "moveUsed") expect(firstMove.side).toBe("player");
  });

  test("without priority the faster mon acts first", () => {
    const st = startBattle(cfg, [mkInst("leaf", 20)], [mkInst("pyro", 20)]);
    const ev = stepBattle(DATA, st, move("strike"), move("strike"), makeRng(1));
    const firstMove = ev.find((e) => e.kind === "moveUsed");
    if (firstMove && firstMove.kind === "moveUsed") expect(firstMove.side).toBe("foe");
  });

  test("a flinched mon loses its turn (flincher acts first)", () => {
    // pyro (fast) uses boo (flinch 100%); leaf should then flinch this turn.
    const st = startBattle(cfg, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, move("boo"), move("strike"), makeRng(1));
    expect(ev.some((e) => e.kind === "text" && e.text.includes("flinched"))).toBe(true);
    expect(ev.some((e) => e.kind === "moveUsed" && e.side === "foe")).toBe(false);
  });

  test("insufficient stamina forces Flail About", () => {
    const st = startBattle(cfg, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    st.player.active.stamina = 2; // inferno costs 4
    const ev = stepBattle(DATA, st, move("inferno"), move("wait"), makeRng(1));
    const used = ev.find((e) => e.kind === "moveUsed" && e.side === "player");
    expect(used).toBeDefined();
    if (used && used.kind === "moveUsed") {
      expect(used.moveId).toBe(FLAIL.id);
      expect(used.moveName).toBe("Flail About");
    }
  });

  test("unknown move id falls back to Flail About", () => {
    const st = startBattle(cfg, [mkInst("pyro", 20)], [mkInst("leaf", 20)]);
    const ev = stepBattle(DATA, st, move("does-not-exist"), move("wait"), makeRng(1));
    const used = ev.find((e) => e.kind === "moveUsed" && e.side === "player");
    if (used && used.kind === "moveUsed") expect(used.moveId).toBe(FLAIL.id);
  });
});

// ---------------------------------------------------------------------------
// Boss phases
// ---------------------------------------------------------------------------

describe("boss phases", () => {
  test("crossing hpThreshold emits bossPhase + statStage exactly once", () => {
    const cfg: BattleConfig = {
      kind: "boss",
      canFlee: false,
      canSync: false,
      bossPhases: [{ hpThreshold: 0.5, statBoosts: { attack: 1 }, announcement: "The titan roars!" }],
    };
    const st = startBattle(cfg, [mkInst("pyro", 20)], [mkInst("titan", 20)]);
    const all: BattleEvent[] = [];
    let phaseTriggeredWhileAlive = false;
    for (let t = 0; t < 8 && st.outcome === "ongoing"; t++) {
      const ev = stepBattle(DATA, st, move("flame"), move("wait"), makeRng(100 + t));
      if (ev.some((e) => e.kind === "bossPhase")) {
        phaseTriggeredWhileAlive = st.foe.active.mon.currentHp > 0;
      }
      all.push(...ev);
    }
    const phases = all.filter((e) => e.kind === "bossPhase");
    expect(phases.length).toBe(1);
    if (phases[0].kind === "bossPhase") expect(phases[0].announcement).toBe("The titan roars!");
    expect(phaseTriggeredWhileAlive).toBe(true);
    // The accompanying stat boost is emitted once, on the foe.
    const boosts = all.filter((e) => e.kind === "statStage" && e.side === "foe");
    expect(boosts.length).toBe(1);
    if (boosts[0].kind === "statStage") {
      expect(boosts[0].stat).toBe("attack");
      expect(boosts[0].stages).toBe(1);
    }
  });
});
