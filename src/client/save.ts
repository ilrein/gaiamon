import type { MonsterInstance, PlayerState } from "../shared/model";
import { AREAS, DATA, START_AREA } from "../data";
import { maxHpAt } from "../shared/stats";

const KEY = "gaiamon-save-v1";

export function saveGame(state: PlayerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full/blocked (private mode) — play on without persistence.
  }
}

function validMon(m: unknown): m is MonsterInstance {
  if (typeof m !== "object" || m === null) return false;
  const mon = m as Partial<MonsterInstance>;
  const species = typeof mon.speciesId === "string" ? DATA.species[mon.speciesId] : undefined;
  return (
    species !== undefined &&
    typeof mon.uid === "string" &&
    typeof mon.level === "number" &&
    mon.level >= 1 &&
    typeof mon.xp === "number" &&
    typeof mon.currentHp === "number" &&
    Array.isArray(mon.moves)
  );
}

/** Load and *repair* a save: salvage what's valid, fall back to sane defaults
 *  for anything drifted (old saves, edited storage, removed content). */
export function loadGame(): PlayerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    if (!Array.isArray(parsed.party)) return null;

    const party = parsed.party.filter(validMon).map((m) => {
      const species = DATA.species[m.speciesId];
      const max = maxHpAt(species.baseStats.hp, m.level);
      return {
        ...m,
        currentHp: Math.max(0, Math.min(max, Math.floor(m.currentHp))),
        moves: m.moves.filter((id) => DATA.moves[id]).slice(0, 4),
        status: typeof m.status === "string" && DATA.statuses[m.status] ? m.status : null,
        nickname: typeof m.nickname === "string" ? m.nickname : null,
      };
    });
    if (party.length === 0) return null; // nothing playable to restore

    const areaId = typeof parsed.areaId === "string" && AREAS[parsed.areaId] ? parsed.areaId : START_AREA;
    const spawn = AREAS[areaId].spawn;
    const pos =
      parsed.pos && typeof parsed.pos.x === "number" && typeof parsed.pos.z === "number"
        ? parsed.pos
        : { ...spawn };

    return {
      name: typeof parsed.name === "string" ? parsed.name : "Warden",
      party,
      registered: Array.isArray(parsed.registered)
        ? parsed.registered.filter((id): id is string => typeof id === "string" && !!DATA.species[id])
        : party.map((m) => m.speciesId),
      flags: Array.isArray(parsed.flags) ? parsed.flags.filter((f): f is string => typeof f === "string") : [],
      areaId,
      pos,
      nextUid: typeof parsed.nextUid === "number" && parsed.nextUid > 0 ? parsed.nextUid : party.length + 1,
    };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
