// GENERATED from design/design.json by scripts/build-data.mjs — edit the design, not this file.
import type { StatusDef } from "../shared/model";

export const STATUSES: Record<string, StatusDef> = {
  "smolder": {
    "id": "smolder",
    "name": "Smolder",
    "syncBonus": 1.5,
    "dotFraction": 0.06,
    "statMultipliers": {
      "attack": 0.75
    },
    "flavor": "smolders"
  },
  "drowse": {
    "id": "drowse",
    "name": "Drowse",
    "syncBonus": 2,
    "skipTurnChance": 1,
    "endChancePerTurn": 0.5,
    "flavor": "is curled up in a dream-haze"
  },
  "rimebound": {
    "id": "rimebound",
    "name": "Rimebound",
    "syncBonus": 1.8,
    "statMultipliers": {
      "speed": 0.5
    },
    "endChancePerTurn": 0.3,
    "flavor": "is crusted with rime"
  },
  "tangleroot": {
    "id": "tangleroot",
    "name": "Tangleroot",
    "syncBonus": 1.5,
    "dotFraction": 0.08,
    "flavor": "is wrapped in living roots"
  },
  "storydaze": {
    "id": "storydaze",
    "name": "Storydaze",
    "syncBonus": 1.3,
    "skipTurnChance": 0.33,
    "endChancePerTurn": 0.33,
    "flavor": "is lost in another story"
  }
};
