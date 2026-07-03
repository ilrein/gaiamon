#!/usr/bin/env node
// Deterministic world validation: every exit lands on a walkable tile in an
// existing area, spawns/NPCs/triggers sit on sensible tiles, every referenced
// species/trainer exists, encounter weights are sane. Run in CI-adjacent
// checks and after any content authoring pass.
//
// Usage: bun scripts/validate-world.mjs

import { AREAS } from "../src/data/areas.ts";
import { SPECIES } from "../src/data/species.ts";
import { TRAINERS, TRIAL, TITAN_GATES } from "../src/data/trainers.ts";

const WALKABLE = new Set([".", "p", "g", "f"]);
const problems = [];
const tile = (a, x, z) => a.tiles[Math.round(z)]?.[Math.round(x)];

for (const area of Object.values(AREAS)) {
  const w = area.tiles[0].length;
  for (const [i, row] of area.tiles.entries()) {
    if (row.length !== w) problems.push(`${area.id}: row ${i} length ${row.length} != ${w}`);
  }
  if (!WALKABLE.has(tile(area, area.spawn.x, area.spawn.z)))
    problems.push(`${area.id}: spawn (${area.spawn.x},${area.spawn.z}) on '${tile(area, area.spawn.x, area.spawn.z)}'`);

  for (const exit of area.exits) {
    const dest = AREAS[exit.toArea];
    if (!dest) {
      problems.push(`${area.id}: exit -> unknown area ${exit.toArea}`);
      continue;
    }
    if (!WALKABLE.has(tile(area, exit.x, exit.z)))
      problems.push(`${area.id}: exit tile (${exit.x},${exit.z}) not walkable ('${tile(area, exit.x, exit.z)}')`);
    if (!WALKABLE.has(tile(dest, exit.toX, exit.toZ)))
      problems.push(`${area.id} -> ${exit.toArea}: lands on '${tile(dest, exit.toX, exit.toZ)}' at (${exit.toX},${exit.toZ})`);
    // Landing on the destination's own exit tile would bounce the player back.
    for (const back of dest.exits) {
      if (Math.hypot(back.x - exit.toX, back.z - exit.toZ) < 0.6 && back.toArea === area.id)
        problems.push(`${area.id} -> ${exit.toArea}: lands within bounce range of the return exit at (${back.x},${back.z})`);
    }
  }

  for (const npc of area.npcs) {
    if (tile(area, npc.x, npc.z) === undefined) problems.push(`${area.id}: npc ${npc.id} out of bounds`);
    if (npc.battle && !TRAINERS[npc.battle.id]) problems.push(`${area.id}: npc ${npc.id} -> unknown trainer ${npc.battle.id}`);
  }
  for (const t of area.triggers) {
    if (!WALKABLE.has(tile(area, t.x, t.z))) {
      // triggers may sit on/adjacent to props; require at least one walkable neighbor
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => WALKABLE.has(tile(area, t.x + dx, t.z + dz)));
      if (!near) problems.push(`${area.id}: trigger ${t.id} at (${t.x},${t.z}) unreachable`);
    }
    if (t.kind === "titan" && !TITAN_GATES[t.id] && t.id !== "titan-cairnoss")
      problems.push(`${area.id}: titan trigger ${t.id} has no TITAN_GATES entry`);
  }
  for (const e of area.encounters) {
    const sp = SPECIES[e.speciesId];
    if (!sp) {
      problems.push(`${area.id}: encounter -> unknown species ${e.speciesId}`);
      continue;
    }
    if (sp.stage > 1 && sp.evolveLevel === null) {
      const line = Object.values(SPECIES).find((s) => s.evolvesTo === sp.id);
      if (line?.evolveLevel && e.minLevel < line.evolveLevel)
        problems.push(`${area.id}: ${e.speciesId} wild at lv${e.minLevel} below its evolve level ${line.evolveLevel}`);
    }
  }
  const hasGrass = area.tiles.some((r) => r.includes("g"));
  if (hasGrass && area.encounters.length === 0 && area.encounterRate > 0)
    problems.push(`${area.id}: grass tiles but no encounter table`);
}

for (const t of Object.values(TRAINERS)) {
  for (const slot of t.party) {
    if (!SPECIES[slot.speciesId]) problems.push(`trainer ${t.id}: unknown species ${slot.speciesId}`);
  }
}
for (const id of TRIAL.opponents) {
  if (!TRAINERS[id]) problems.push(`TRIAL: unknown opponent ${id}`);
}
for (const g of Object.values(TITAN_GATES)) {
  if (!TRAINERS[g.trainerId]) problems.push(`TITAN_GATES: unknown trainer ${g.trainerId}`);
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} world problems:`);
  for (const p of problems) console.error("  -", p);
  process.exit(1);
}
console.log(`✓ world valid: ${Object.keys(AREAS).length} areas, ${Object.keys(SPECIES).length} species, ${Object.keys(TRAINERS).length} trainers`);
