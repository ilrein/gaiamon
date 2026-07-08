// Procedural SDF creature registry — the proto workshop's codex.
// Add a species: create a file exporting a ProtoSpecies, register it here.
// Authoring guide: design/PROCEDURAL-CREATURES.md
import type { ProtoSpecies } from "./types";
import { fernby } from "./fernby";
import { kindlet } from "./kindlet";
import { puddlop } from "./puddlop";
import { pottle } from "./pottle";

export type { ProtoSpecies } from "./types";

export const PROTO: Record<string, ProtoSpecies> = {
  fernby,
  kindlet,
  puddlop,
  pottle,
};
