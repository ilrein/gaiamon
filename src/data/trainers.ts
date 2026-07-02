// Named battles: the Sanctum Keeper, the three Trial-of-Echoes constructs, and
// the Titan boss. Authored from design/design.json (codex.keeperDesign,
// codex.trialDesign, codex.titanDesign) with the world-content rulings applied:
// the Keeper is Solenne (a Tide listener), the Titan is Cairnoss.
import type { TrainerDef } from "../shared/model";

export const TRAINERS: Record<string, TrainerDef> = {
  "keeper-solenne": {
    id: "keeper-solenne",
    name: "Keeper Solenne",
    title: "Keeper of the Stillwater Sanctum",
    kind: "trainer",
    // Ruling 3: Tide specialist; wild-4@lv12 -> nibbin, wild-8@lv13 -> thistleram,
    // keeper-ace-1@lv15 -> lagoonet.
    party: [
      { speciesId: "nibbin", level: 12 },
      { speciesId: "thistleram", level: 13 },
      { speciesId: "lagoonet", level: 15 },
    ],
    dialogue: {
      // win = what she says when the PLAYER wins (same convention as every
      // other trainer — the review caught these two arrays inverted).
      intro: [
        "Oh! A visitor — shh, one second, the reeds are mid-sentence... okay. Hello!",
        "You brought a singing slab. May I battle it? I mean you. May I battle you?",
      ],
      win: [
        "...The water went quiet for you. It never goes quiet.",
        "Here — the Stillwater Sigil. I'm drawing you on my map as 'the quiet current.'",
        "Your Codex hums in Tide-key now. Tell the Titan I said it snores.",
      ],
      lose: [
        "Field note: the challenger favors the left bank. Interesting. Brook, dear, let's answer in kind!",
        "The water's still loud. Come back when your Codex learns the deep notes.",
      ],
    },
    defeatFlag: "keeper-defeated",
  },

  "titan-cairnoss": {
    id: "titan-cairnoss",
    name: "Cairnoss",
    title: "The Waking Waystone",
    kind: "boss",
    party: [{ speciesId: "cairnoss", level: 18 }],
    dialogue: {
      intro: [
        "The waystone you leaned on for hours draws a slow, grinding breath.",
        "Moss avalanches from its shoulders. It was never a monument. It was only asleep.",
        "RESONANCE TOO VAST — SYNC IMPOSSIBLE. The Codex offers only to STUDY.",
      ],
      win: [
        "Cairnoss settles back with a sound like a mountain sighing.",
        "Every carved rune dims to a warm ember. It will remember you kindly.",
      ],
      lose: [
        "The runes gutter out. Cairnoss folds back into stone, unbothered.",
        "It will keep sleeping. The Rise can wait for you to try again.",
      ],
    },
    // titanDesign phase2 "WOKEN" at 50% HP (defense down, attack + speed up),
    // plus a desperation flare near the end. Engine shape: stage boosts.
    bossPhases: [
      {
        hpThreshold: 0.5,
        statBoosts: { attack: 2, speed: 1, defense: -1 },
        announcement: "Cairnoss kneels, its chest-core blazing gold — WOKEN. The stone fights back in earnest.",
      },
      {
        hpThreshold: 0.2,
        statBoosts: { attack: 1, defense: -1 },
        announcement: "Every rune ignites at once. Dawnshear light pours from the cracks!",
      },
    ],
    defeatFlag: "titan-defeated",
  },

  // The Trial of Echoes: three waystone-animated constructs, fought back to back.
  "trial-1": {
    id: "trial-1",
    name: "Meadow Echo",
    title: "Construct of the Waystone",
    kind: "trainer",
    party: [{ speciesId: "dandelamb", level: 10 }],
    dialogue: {
      intro: ["The waystone remembers the meadow. Stone knits itself into fleece and seed-fluff."],
      win: ["The first ring on the monolith flares to life."],
      lose: ["The echo crumbles back into gravel. Steady yourself and try again."],
    },
    defeatFlag: "trial-1-cleared",
  },
  "trial-2": {
    id: "trial-2",
    name: "Gloam Echo",
    title: "Construct of the Waystone",
    kind: "trainer",
    party: [{ speciesId: "zizzle", level: 11 }],
    dialogue: {
      intro: ["The waystone remembers the caverns. A crackle of stored static gathers into shape."],
      win: ["The second ring locks in with a rising chime."],
      lose: ["The echo scatters into sparks. The waystone waits, patient as ever."],
    },
    defeatFlag: "trial-2-cleared",
  },
  "trial-3": {
    id: "trial-3",
    name: "The Waykeeper's Echo",
    title: "Construct of the Waystone",
    kind: "trainer",
    party: [{ speciesId: "thistleram", level: 12 }],
    dialogue: {
      intro: ["The waystone remembers its guardian. The wind itself steps out of the way."],
      win: ["The final ring blazes. The whole monolith burns at full glow — and the arena gate grinds open."],
      lose: ["The last echo dissolves on the wind. So close. The rings reset for your next attempt."],
    },
    defeatFlag: "trial-3-cleared",
  },
};

/** The Waystone Trial: a gauntlet of trainer battles taken back-to-back. */
export interface TrialDef {
  id: string;
  name: string;
  intro: string[];
  /** Trainer ids fought in order. Party is healed between rounds per design. */
  opponents: string[];
  healBetween: boolean;
  completeFlag: string;
  completeText: string[];
}

export const TRIAL: TrialDef = {
  id: "trial-of-echoes",
  name: "The Trial of Echoes",
  intro: [
    "The great Waystone hums, its glyphs brightening rung by rung.",
    "It animates stone constructs of the creatures who live along your road —",
    "and it remembers every battle ever fought at its foot.",
    "Three echoes, one after another. No fleeing, no syncing. Only trust and steady hands.",
  ],
  opponents: ["trial-1", "trial-2", "trial-3"],
  // trialDesign: the waystone restores 50% of party HP between battles.
  healBetween: true,
  completeFlag: "trial-complete",
  completeText: [
    "The final rune-ring locks home and the Waystone burns at full glow.",
    "'Waystone Mark I' stamps into your Codex. The arena gate grinds open.",
    "Beyond the arch, something ancient and enormous begins, very slowly, to breathe.",
  ],
};

export const TITAN_ID = "titan-cairnoss";
