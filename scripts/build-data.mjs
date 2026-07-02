#!/usr/bin/env node
// Deterministic transform: design/design.json -> src/data/{typechart,statuses,moves,species}.ts
// The design bible is the source of truth; this script is how it becomes code.
// Statuses use the engine's data-driven knobs — richer designed mechanics are
// simplified for v1 (documented in design/DESIGN.md).

import { readFile, writeFile } from "node:fs/promises";

const design = JSON.parse(await readFile("design/design.json", "utf8"));
const { combat, roster } = design;

const header = "// GENERATED from design/design.json by scripts/build-data.mjs — edit the design, not this file.\n";

const TYPE_IDS = new Set([
  "neutral", "verdant", "ember", "tide", "zephyr", "terra", "volt", "frost", "umbral", "lumen", "fable",
]);
function normType(t) {
  const id = String(t).toLowerCase();
  if (!TYPE_IDS.has(id)) throw new Error(`Unknown type: ${t}`);
  return id;
}

// ---- verifier-driven patches (see design workflow verify stage) ------------
// Titan was 100 stat points under its spec band.
const TITAN_STATS = { hp: 200, attack: 140, defense: 170, spirit: 130, speed: 60 };
// Four 96+ power moves were undercosted vs the stamina rule (power >= 96 costs 5).
const STAMINA_FIXES = { "pyre-dive": 5, "maelspout": 5, "stormcrown": 5, "bloomburst": 5 };
// Moves learned above the line's evolve level were unreachable with auto-evolution.
const LEARNSET_FIXES = { fernby: { 17: 13 }, kindlet: { 17: 13 }, puddlop: { 17: 13 }, dandelamb: { 17: 15 } };

// ---- type chart -----------------------------------------------------------
const chart = {};
for (const { attacker, defender, x } of combat.chart) {
  (chart[normType(attacker)] ??= {})[normType(defender)] = x;
}
await writeFile(
  "src/data/typechart.ts",
  header +
    `import type { TypeId } from "../shared/model";\n\n` +
    `export const TYPE_CHART: Partial<Record<TypeId, Partial<Record<TypeId, number>>>> = ${JSON.stringify(chart, null, 2)};\n`,
);

// ---- statuses (v1 knob mapping) --------------------------------------------
// Hand-tuned mapping from designed mechanics to StatusDef knobs.
const STATUS_KNOBS = {
  smolder: { dotFraction: 0.06, statMultipliers: { attack: 0.75 }, flavor: "smolders" },
  drowse: { skipTurnChance: 1, endChancePerTurn: 0.5, flavor: "is curled up in a dream-haze" },
  rimebound: { statMultipliers: { speed: 0.5 }, endChancePerTurn: 0.3, flavor: "is crusted with rime" },
  tangleroot: { dotFraction: 0.08, flavor: "is wrapped in living roots" },
  storydaze: { skipTurnChance: 0.33, endChancePerTurn: 0.33, flavor: "is lost in another story" },
};
const statuses = {};
for (const s of combat.statuses) {
  const knobs = STATUS_KNOBS[s.id];
  if (!knobs) throw new Error(`No v1 knob mapping for status ${s.id} — add one to build-data.mjs`);
  statuses[s.id] = { id: s.id, name: s.name, syncBonus: s.syncBonus, ...knobs };
}
await writeFile(
  "src/data/statuses.ts",
  header +
    `import type { StatusDef } from "../shared/model";\n\n` +
    `export const STATUSES: Record<string, StatusDef> = ${JSON.stringify(statuses, null, 2)};\n`,
);

// ---- moves ------------------------------------------------------------------
const statusIds = new Set(Object.keys(statuses));
// Allowed fields per effect kind — extras from the design get stripped.
const EFFECT_FIELDS = {
  applyStatus: ["status", "chance", "target"],
  statStage: ["stat", "stages", "target", "chance"],
  heal: ["percent"],
  drain: ["percent"],
  recoil: ["percent"],
  priority: [],
  flinch: ["chance"],
  multiHit: ["min", "max"],
};
const moves = {};
for (const m of roster.moves) {
  m.type = normType(m.type);
  if (STAMINA_FIXES[m.id]) m.stamina = STAMINA_FIXES[m.id];
  m.effects = m.effects.map((e) => {
    const allowed = EFFECT_FIELDS[e.kind];
    if (!allowed) throw new Error(`Move ${m.id} has unknown effect kind ${e.kind}`);
    const clean = { kind: e.kind };
    for (const f of allowed) if (e[f] !== undefined) clean[f] = e[f];
    if (clean.kind === "applyStatus") {
      if (!statusIds.has(clean.status)) throw new Error(`Move ${m.id} applies unknown status ${clean.status}`);
      if (clean.target === undefined) clean.target = "foe";
      if (clean.chance > 1) clean.chance = clean.chance / 100;
    }
    if (clean.kind === "flinch" && clean.chance > 1) clean.chance = clean.chance / 100;
    if (clean.kind === "statStage") {
      if (clean.chance !== undefined && clean.chance > 1) clean.chance = clean.chance / 100;
      clean.stat = String(clean.stat).toLowerCase();
    }
    return clean;
  });
  moves[m.id] = m;
}
await writeFile(
  "src/data/moves.ts",
  header +
    `import type { MoveDef } from "../shared/model";\n\n` +
    `export const MOVES: Record<string, MoveDef> = ${JSON.stringify(moves, null, 2)};\n`,
);

// ---- species (with rename pass) ---------------------------------------------
const renameMap = new Map((design.renames?.renames ?? []).map((r) => [r.from, r.to]));
const moveIds = new Set(Object.keys(moves));
const species = {};
for (const s of roster.species) {
  const name = renameMap.get(s.name) ?? s.name;
  s.types = s.types.map(normType);
  if (s.role === "titan") s.baseStats = TITAN_STATS;
  const levelFixes = LEARNSET_FIXES[s.id] ?? {};
  for (const l of s.learnset) {
    if (!moveIds.has(l.moveId)) throw new Error(`Species ${s.id} learns unknown move ${l.moveId}`);
    if (levelFixes[l.level]) l.level = levelFixes[l.level];
  }
  s.learnset.sort((a, b) => a.level - b.level);
  species[s.id] = { ...s, name };
}
await writeFile(
  "src/data/species.ts",
  header +
    `import type { SpeciesDef } from "../shared/model";\n\n` +
    `export const SPECIES: Record<string, SpeciesDef> = ${JSON.stringify(species, null, 2)};\n`,
);

console.log(
  `Wrote ${Object.keys(chart).length} chart rows, ${Object.keys(statuses).length} statuses, ` +
    `${Object.keys(moves).length} moves, ${Object.keys(species).length} species` +
    (renameMap.size ? ` (${renameMap.size} renames applied)` : ""),
);
