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

  // --- Act 2: the Mistmere Coast --------------------------------------------
  // Route Wardens each carry a Chimeshard. NOTE on orientation: `win` is spoken
  // when the PLAYER wins (trainer defeated, hands over the shard); `lose` is the
  // player's loss (the "come back later" line). This inverts the design JSON's
  // trainer-perspective win/lose, exactly like keeper-solenne above.
  "warden-quill": {
    id: "warden-quill",
    name: "Quill",
    title: "Boardwalk Angler",
    kind: "trainer",
    // coast-1@lv10 -> hushpup, coast-2@lv11 -> mistcalf.
    party: [
      { speciesId: "hushpup", level: 10 },
      { speciesId: "mistcalf", level: 11 },
    ],
    dialogue: {
      intro: [
        "Shh — you'll scare the ripples. ...Too late. They know you're here.",
        "I fish with a battle rod: no hooks, just a polite challenge. You're today's catch.",
      ],
      win: [
        "Fine catch. I mean fine battle. My Codex is logging you as 'the one that got away.'",
        "Here — my Chimeshard. It rings low, like the lake at dusk. The summit gate wants it more than I do.",
      ],
      lose: [
        "The lake says you telegraph your switches. Don't take it hard — the lake gossips.",
        "Rest up at Saltwhistle and come try my line again.",
      ],
    },
    defeatFlag: "warden-quill-defeated",
  },

  "warden-teasel": {
    id: "warden-teasel",
    name: "Teasel",
    title: "Mushroom-Cap Knight",
    kind: "trainer",
    // umbral-1@lv14 -> dimmet, umbral-2@lv15 -> gloamane.
    party: [
      { speciesId: "dimmet", level: 14 },
      { speciesId: "gloamane", level: 15 },
    ],
    dialogue: {
      intro: [
        "HALT. None shall pass the maze unbattled! ...Sorry for shouting. The helmet muffles me.",
        "I am the knight of this wood! The fireflies knighted me. Mostly by landing on my head.",
      ],
      win: [
        "A worthy quest-giver moment! Take my Chimeshard — it rings middle, like dusk deciding to stay.",
        "You woke the sleeping stone in the Vale, didn't you? Knights hear things. Fireflies talk.",
      ],
      lose: [
        "The maze remains undefeated! Also me! Mostly the maze, though.",
        "Train in the deep grass and return, brave stranger. The wood will re-lose you happily.",
      ],
    },
    defeatFlag: "warden-teasel-defeated",
  },

  "warden-halla": {
    id: "warden-halla",
    name: "Halla",
    title: "Summit Postwoman",
    kind: "trainer",
    // frost-1@lv17 -> snugget, umbral-2@lv17 -> gloamane, frost-2@lv19 -> duvetusk.
    party: [
      { speciesId: "snugget", level: 17 },
      { speciesId: "gloamane", level: 17 },
      { speciesId: "duvetusk", level: 19 },
    ],
    dialogue: {
      intro: [
        "Letter for you! Kidding. Nobody writes to Wardens — you're all outside already.",
        "I battle on every delivery run. Keeps the blood warm and the route honest. En garde!",
      ],
      win: [
        "Signed, sealed, defeated. Here — my Chimeshard. It rings high, like the first bell of the aurora.",
        "Three shards and Voss's sigil, and that gate will sing itself open. Give the sleeper my regards. Gently.",
      ],
      lose: [
        "Undelivered! Come back when your team stops shivering between moves.",
        "Warm up at Yule's hut. The cocoa is a strategy, not a treat.",
      ],
    },
    defeatFlag: "warden-halla-defeated",
  },

  "keeper-voss": {
    id: "keeper-voss",
    name: "Keeper Voss",
    title: "Keeper of the Stormglass Sanctum",
    kind: "trainer",
    // Volt specialist by fiction; her stormlight ace is the only Volt species.
    // coast-2@lv15 -> mistcalf, umbral-1@lv16 -> dimmet, keeper-ace-2@lv18 -> rumblit.
    party: [
      { speciesId: "mistcalf", level: 15 },
      { speciesId: "dimmet", level: 16 },
      { speciesId: "rumblit", level: 18 },
    ],
    dialogue: {
      intro: [
        "Lot one: a challenger, slightly windblown, excellent posture. Do I hear an opening move?",
        "The Sanctum beacon runs on my ace's stormlight — so every challenger is a bid on the town's electricity.",
      ],
      win: [
        "SOLD! To the Warden with the singing slab. The Stormglass Sigil — no refunds, all sparks final.",
        "Solenne's map calls you 'the quiet current.' Loud auction, quiet current — Rimeveil will like you.",
        "Take my bell's blessing up the mountain, and mind the snow that doesn't drift.",
      ],
      lose: [
        "Going once, going twice — withdrawn! The lot is pulled for today.",
        "Come back with a stronger opening bid, and I'll ring the bell for you yet.",
      ],
    },
    defeatFlag: "keeper-voss-defeated",
  },

  "titan-aurvela": {
    id: "titan-aurvela",
    name: "Aurvela",
    title: "The Dreaming Aurora",
    kind: "boss",
    party: [{ speciesId: "aurvela", level: 24 }],
    dialogue: {
      intro: [
        "The windless snow of the Hushbowl swells, then unfolds — it was never snow. It was wings.",
        "The aurora you admired all the way up the coast pours down into the bowl. It was her dream, leaking.",
        "RESONANCE TOO VAST — SYNC IMPOSSIBLE. The Codex offers only to STUDY: 'The Dream Above the Snow.'",
      ],
      win: [
        "Aurvela folds her wings back over the bowl and the aurora dims to a soft, sleeping shimmer.",
        "The mountain's lullaby resumes, unhurried. She will dream on — lighter now, and unafraid.",
      ],
      lose: [
        "The wings settle. The snow lies flat and windless again, as if nothing ever stirred.",
        "Aurvela returns to sleep, a little pointedly. The Chimegate will wait for you to try once more.",
      ],
    },
    // Design phases translated to engine stage-boosts:
    //  - VEILED -> AURORA-WOKEN at 50% HP: defense x0.8 (down), spirit x1.5 &
    //    speed x1.3 (up) as she unfurls and the aurora floods the arena.
    //  - a final dawn-flare near the end as the dream brightens to waking.
    bossPhases: [
      {
        hpThreshold: 0.5,
        statBoosts: { spirit: 2, speed: 1, defense: -1 },
        announcement:
          "AURORA-WOKEN. Aurvela's wings unfold and the whole bowl lifts on a tide of dreaming light.",
      },
      {
        hpThreshold: 0.2,
        statBoosts: { spirit: 1, speed: 1 },
        announcement: "The dream brightens toward waking — every aurora-mote in the bowl blazes at once.",
      },
    ],
    defeatFlag: "titan-aurvela-defeated",
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

/**
 * A gated Titan arena. The `titan` trigger for `trainerId` stays sealed until
 * every flag in `requiredFlags` is set; while sealed it shows `deniedText`.
 * main.ts owns the wiring — this table just declares the gate per Titan.
 */
export interface TitanGate {
  trainerId: string;
  requiredFlags: string[];
  deniedText: string[];
}

export const TITAN_GATES: Record<string, TitanGate> = {
  "titan-cairnoss": {
    trainerId: "titan-cairnoss",
    requiredFlags: ["trial-complete"],
    deniedText: [
      "The arena gate is sealed. The great waystone's rune-rings are dark — the Trial of Echoes awaits.",
    ],
  },
  "titan-aurvela": {
    trainerId: "titan-aurvela",
    requiredFlags: [
      "warden-quill-defeated",
      "warden-teasel-defeated",
      "warden-halla-defeated",
      "keeper-voss-defeated",
    ],
    deniedText: [
      "The Chimegate's three crystal sockets sit dark and empty, and its resonance slot is cold.",
      "Quill's low note, Teasel's dusk note, Halla's high note — and Keeper Voss's Stormglass Sigil.",
      "Beat each of them in spirit and the chord completes; until then, the snow beyond will not stir.",
    ],
  },
};
