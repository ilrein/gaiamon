// Central game data assembly. The individual files are authored from the
// design bible; this module just wires them into the engine's GameData shape.
import type { GameData } from "../shared/battle";
import { SPECIES } from "./species";
import { MOVES } from "./moves";
import { STATUSES } from "./statuses";
import { TYPE_CHART } from "./typechart";

export { AREAS, START_AREA } from "./areas";

export const DATA: GameData = {
  species: SPECIES,
  moves: MOVES,
  statuses: STATUSES,
  typeChart: TYPE_CHART,
};

/** Stage-1 starters in display order: verdant, ember, tide. */
export function getStarters(data: GameData) {
  const order = ["starter-verdant", "starter-ember", "starter-tide"];
  return Object.values(data.species)
    .filter((s) => s.stage === 1 && order.includes(s.role))
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
}
