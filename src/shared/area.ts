// Area (zone) definition format. Data-driven maps: a character grid plus prop
// and NPC placements. One tile = one world unit. The client renders these as
// 2.5D dioramas; a future zone Durable Object uses the same grid for
// server-side movement validation.

export type TileChar =
  | "." // walkable ground
  | "p" // walkable path (visual variant)
  | "g" // tall grass — walkable, triggers wild encounters
  | "#" // blocked (rendered as area's blocker prop)
  | "w" // water — blocked, animated
  | "f"; // flowers — walkable, decorative

export interface PropPlacement {
  /** Primitive prop kind the renderer knows how to build. */
  kind:
    | "tree"
    | "pine"
    | "rock"
    | "house"
    | "lantern"
    | "waystone"
    | "fence"
    | "crystal"
    | "stump"
    | "bush"
    | "arch";
  x: number;
  z: number;
  scale?: number;
  tint?: string;
}

export interface NpcPlacement {
  id: string;
  name: string;
  role: string;
  x: number;
  z: number;
  /** Hue 0-360 for the placeholder sprite variant. */
  hue: number;
  dialogue: string[];
  /** Battle this NPC triggers after dialogue, if any. */
  battle?: { kind: "trainer" | "boss"; id: string };
}

export interface AreaExit {
  x: number;
  z: number;
  toArea: string;
  toX: number;
  toZ: number;
  label: string;
}

export interface EncounterEntry {
  speciesId: string;
  weight: number;
  minLevel: number;
  maxLevel: number;
}

export interface AreaTrigger {
  kind: "heal" | "trial" | "titan" | "sign";
  x: number;
  z: number;
  id: string;
  text?: string;
}

export interface AreaDef {
  id: string;
  name: string;
  biome: string;
  palette: { ground1: string; ground2: string; accent: string; fog: string };
  /** Row-major tile grid; all rows equal length. tiles[z][x]. */
  tiles: string[];
  spawn: { x: number; z: number };
  props: PropPlacement[];
  npcs: NpcPlacement[];
  exits: AreaExit[];
  encounters: EncounterEntry[];
  triggers: AreaTrigger[];
  /** Steps in grass per encounter roll ~ 1/encounterRate. */
  encounterRate: number;
}

export function tileAt(area: AreaDef, x: number, z: number): TileChar | null {
  const row = area.tiles[Math.round(z)];
  if (!row) return null;
  const ch = row[Math.round(x)];
  return (ch as TileChar) ?? null;
}

export function isWalkable(area: AreaDef, x: number, z: number): boolean {
  const t = tileAt(area, x, z);
  return t === "." || t === "p" || t === "g" || t === "f";
}
