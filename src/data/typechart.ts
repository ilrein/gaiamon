// GENERATED from design/design.json by scripts/build-data.mjs — edit the design, not this file.
import type { TypeId } from "../shared/model";

export const TYPE_CHART: Partial<Record<TypeId, Partial<Record<TypeId, number>>>> = {
  "verdant": {
    "tide": 2,
    "terra": 2,
    "ember": 0.5,
    "zephyr": 0.5
  },
  "ember": {
    "verdant": 2,
    "frost": 2,
    "tide": 0.5,
    "terra": 0.5
  },
  "tide": {
    "ember": 2,
    "terra": 2,
    "verdant": 0.5,
    "frost": 0.5
  },
  "zephyr": {
    "verdant": 2,
    "fable": 2,
    "terra": 0.5,
    "volt": 0.5
  },
  "terra": {
    "volt": 2,
    "ember": 2,
    "frost": 2,
    "zephyr": 0.5
  },
  "volt": {
    "tide": 2,
    "zephyr": 2,
    "verdant": 0.5,
    "terra": 0
  },
  "frost": {
    "verdant": 2,
    "zephyr": 2,
    "terra": 2,
    "ember": 0.5,
    "tide": 0.5
  },
  "lumen": {
    "umbral": 2,
    "fable": 0.5
  },
  "umbral": {
    "lumen": 2,
    "fable": 2
  },
  "fable": {
    "umbral": 2,
    "lumen": 0.5
  }
};
