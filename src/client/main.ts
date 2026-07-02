// Gaiamon bootstrap + game flow controller. Owns the transitions between
// title, overworld, battles, trials, and the Codex — screens do the rendering,
// this file decides what happens next.

import "./style.css";
import { Game } from "./game";
import { DATA, AREAS } from "../data";
import { TRAINERS, TRIAL, TITAN_ID, TITAN_GATES } from "../data/trainers";
import { STRINGS } from "../data/strings";
import type { MonsterInstance, PlayerState, TrainerDef } from "../shared/model";
import type { AreaExit, AreaTrigger, NpcPlacement } from "../shared/area";
import { makeInstance, maxHpAt } from "../shared/stats";
import { TitleScreen } from "./screens/title";
import { OverworldScreen, fadeTransition } from "./screens/overworld";
import { BattleScreen } from "./screens/battle";
import { openCodex } from "./ui/codex";
import { runDialogue } from "./ui/dialogue";
import type { BattleConfig } from "../shared/battle";

const appHost = document.getElementById("app")!;
const hudRoot = document.getElementById("hud")!;
const uiRoot = document.getElementById("ui")!;

document.title = `${STRINGS.gameTitle} — ${STRINGS.tagline}`;

let game: Game;
let overworld: OverworldScreen;
/** Guards against re-entrant encounters while a battle/dialogue is active. */
let busy = false;

/** Dialogue that also swallows the Space/Enter press that closed it, so the
 *  action doesn't immediately re-trigger the NPC/sign that opened it. */
async function say(lines: { speaker?: string; text: string }[]): Promise<void> {
  await runDialogue(uiRoot, lines);
  game.input.consumeAction();
}

function palette(areaId: string) {
  const area = AREAS[areaId] ?? Object.values(AREAS)[0];
  return { ground1: area.palette.ground1, ground2: area.palette.ground2, fog: area.palette.fog };
}

function healParty(player: PlayerState): void {
  for (const mon of player.party) {
    const species = DATA.species[mon.speciesId];
    mon.currentHp = maxHpAt(species.baseStats.hp, mon.level);
    mon.status = null;
  }
}

function makeTrainerParty(trainer: TrainerDef): MonsterInstance[] {
  return trainer.party.map((slot, i) => makeInstance(DATA.species[slot.speciesId], slot.level, `foe-${trainer.id}-${i}`));
}

function registerSpecies(player: PlayerState, speciesId: string): void {
  if (!player.registered.includes(speciesId)) player.registered.push(speciesId);
}

function addSyncedMon(player: PlayerState, speciesId: string, level: number): "party" | "codex" {
  registerSpecies(player, speciesId);
  const mon = makeInstance(DATA.species[speciesId], level, `m${player.nextUid++}`);
  if (player.party.length < 6) {
    player.party.push(mon);
    return "party";
  }
  return "codex"; // v1: over-capacity syncs are registered in the dex only
}

async function afterDefeat(): Promise<void> {
  healParty(game.player);
  const home = Object.values(AREAS)[0];
  await fadeTransition(uiRoot, () => {
    overworld.loadArea(game, home.id, home.spawn.x, home.spawn.z);
  });
  await say([
    { text: "You were carried back to safety. Your Gaiamon are rested and ready." },
  ]);
  game.save();
}

function startBattleFlow(
  config: BattleConfig,
  foeParty: MonsterInstance[],
  opponentTitle: string | undefined,
  wildLevel: number | null,
  onDone?: (outcome: string) => Promise<void> | void,
): void {
  busy = true;
  hudRoot.classList.add("hud-in-battle");
  const battle = new BattleScreen({
    config,
    playerParty: game.player.party,
    foeParty,
    backdrop: palette(game.player.areaId),
    opponentTitle,
    onFinish: async ({ outcome, syncedSpeciesId }) => {
      // Re-assert the guard: a previous chained battle's late release must not
      // leave this window unguarded (review finding: trial busy race).
      busy = true;
      hudRoot.classList.remove("hud-in-battle");
      game.setScreen(overworld);
      overworld.loadArea(game, game.player.areaId, game.player.pos.x, game.player.pos.z);

      // Evolutions may have changed species mid-battle: keep the Ledger honest.
      for (const mon of game.player.party) registerSpecies(game.player, mon.speciesId);

      if (outcome === "synced" && syncedSpeciesId) {
        const where = addSyncedMon(game.player, syncedSpeciesId, wildLevel ?? 3);
        const species = DATA.species[syncedSpeciesId];
        await say([
          {
            text:
              where === "party"
                ? `${species.name} joined your party!`
                : `${species.name} was registered to your Codex — your party is full.`,
          },
        ]);
      }
      // A recoil victory can wipe the whole party: treat like a defeat.
      if (outcome === "defeat" || game.player.party.every((m) => m.currentHp <= 0)) {
        await afterDefeat();
      }
      game.save();
      await onDone?.(outcome);
      game.input.consumeAction();
      busy = false;
    },
  });
  game.setScreen(battle);
}

function wildBattle(speciesId: string, level: number): void {
  if (busy) return;
  const foe = makeInstance(DATA.species[speciesId], level, `wild-${speciesId}`);
  startBattleFlow({ kind: "wild", canFlee: true, canSync: true }, [foe], undefined, level);
}

function trainerBattle(trainer: TrainerDef, onDone?: (outcome: string) => Promise<void> | void): void {
  const config: BattleConfig = {
    kind: trainer.kind === "boss" ? "boss" : "trainer",
    opponentName: trainer.name,
    canFlee: false,
    canSync: false,
    bossPhases: trainer.bossPhases,
  };
  startBattleFlow(config, makeTrainerParty(trainer), `${trainer.name} — ${trainer.title}`, null, onDone);
}

async function handleNpc(npc: NpcPlacement): Promise<void> {
  if (busy) return;
  busy = true;
  await say(npc.dialogue.map((text) => ({ speaker: npc.name, text })));

  const trainer = npc.battle ? TRAINERS[npc.battle.id] : null;
  if (trainer && !game.player.flags.includes(trainer.defeatFlag)) {
    // busy stays true through the intro and hand-off; the battle flow's
    // onFinish is what finally releases it.
    await say(trainer.dialogue.intro.map((text) => ({ speaker: trainer.name, text })));
    trainerBattle(trainer, async (outcome) => {
      if (outcome === "victory") {
        game.player.flags.push(trainer.defeatFlag);
        await say(trainer.dialogue.win.map((text) => ({ speaker: trainer.name, text })));
      } else if (outcome !== "defeat") {
        await say(trainer.dialogue.lose.map((text) => ({ speaker: trainer.name, text })));
      }
      game.save();
    });
    return;
  }
  busy = false;
}

async function runTrial(): Promise<void> {
  if (busy) return;
  busy = true;
  if (game.player.flags.includes(TRIAL.completeFlag)) {
    await say([{ text: "The waystone is calm. Your trial here is already complete." }]);
    busy = false;
    return;
  }
  await say(TRIAL.intro.map((text) => ({ speaker: TRIAL.name, text })));

  // busy remains true for the entire gauntlet; each round's battle onFinish
  // re-asserts it and only the terminal round (or a defeat) releases it.
  let round = 0;
  const nextRound = async (outcome: string): Promise<void> => {
    if (outcome !== "victory") return; // defeat/flee ends the gauntlet
    round += 1;
    if (round >= TRIAL.opponents.length) {
      game.player.flags.push(TRIAL.completeFlag);
      await say(TRIAL.completeText.map((text) => ({ speaker: TRIAL.name, text })));
      game.save();
      return;
    }
    if (TRIAL.healBetween) healParty(game.player);
    const trainer = TRAINERS[TRIAL.opponents[round]];
    await say(trainer.dialogue.intro.map((text) => ({ speaker: trainer.name, text })));
    trainerBattle(trainer, nextRound);
  };

  const first = TRAINERS[TRIAL.opponents[0]];
  await say(first.dialogue.intro.map((text) => ({ speaker: first.name, text })));
  trainerBattle(first, nextRound);
}

async function handleTrigger(trigger: AreaTrigger): Promise<void> {
  if (busy) return;
  switch (trigger.kind) {
    case "sign":
      busy = true;
      await say([{ text: trigger.text ?? "…the writing has worn away." }]);
      busy = false;
      break;
    case "heal": {
      busy = true;
      healParty(game.player);
      game.save();
      await say([{ text: trigger.text ?? "A warm hum washes over your party. Fully rested!" }]);
      busy = false;
      break;
    }
    case "trial":
      await runTrial();
      break;
    case "titan": {
      // Data-driven titan gates: the trigger's id selects the gate + boss.
      const gate = TITAN_GATES[trigger.id];
      const titan = TRAINERS[gate?.trainerId ?? TITAN_ID];
      if (!titan) return;
      busy = true;
      if (game.player.flags.includes(titan.defeatFlag)) {
        await say([{ text: "The arena is quiet now. The Titan rests, at peace." }]);
        busy = false;
        return;
      }
      const missing = gate ? gate.requiredFlags.filter((f) => !game.player.flags.includes(f)) : [];
      if (missing.length > 0) {
        await say(gate.deniedText.map((text) => ({ text })));
        busy = false;
        return;
      }
      await say(titan.dialogue.intro.map((text) => ({ speaker: titan.name, text })));
      trainerBattle(titan, async (outcome) => {
        if (outcome === "victory") {
          game.player.flags.push(titan.defeatFlag);
          await say(titan.dialogue.win.map((text) => ({ speaker: titan.name, text })));
          game.save();
        }
      });
      break;
    }
  }
}

async function handleExit(exit: AreaExit): Promise<void> {
  if (busy) {
    // The overworld froze itself expecting a transition — let it go, the
    // player can walk onto the exit again once the dialogue/codex closes.
    overworld.releaseBusy();
    return;
  }
  busy = true;
  await fadeTransition(uiRoot, () => {
    overworld.loadArea(game, exit.toArea, exit.toX, exit.toZ);
  });
  game.save();
  busy = false;
}

function startPlaying(player: PlayerState): void {
  game.player = player;
  overworld = new OverworldScreen({
    onEncounter: (speciesId, level) => wildBattle(speciesId, level),
    onNpc: (npc) => void handleNpc(npc),
    onExit: (exit) => void handleExit(exit),
    onTrigger: (trigger) => void handleTrigger(trigger),
    onCodex: () => {
      if (busy) return;
      busy = true;
      void openCodex(game, {}).then(() => {
        game.save();
        busy = false;
      });
    },
  });
  game.setScreen(overworld);
  overworld.loadArea(game, player.areaId, player.pos.x, player.pos.z);
  game.save();
}

// ---- boot ----------------------------------------------------------------
const emptyPlayer: PlayerState = {
  name: "Warden",
  party: [],
  registered: [],
  flags: [],
  areaId: Object.values(AREAS)[0].id,
  pos: Object.values(AREAS)[0].spawn,
  nextUid: 1,
};

game = new Game(appHost, hudRoot, uiRoot, DATA, emptyPlayer);
game.setScreen(new TitleScreen({ onStart: (player) => startPlaying(player) }));
