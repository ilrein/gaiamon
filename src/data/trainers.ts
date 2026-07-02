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

  // --- Act 3: the Emberfall Caldera -----------------------------------------
  // Route Wardens light the three Cindertithe braziers on defeat (win = PLAYER
  // wins, same inverted convention as every trainer above). NPC rename ruling:
  // Wick -> Tallow (collided with the move Wickflick).
  "warden-peat": {
    id: "warden-peat",
    name: "Peat",
    title: "Ash-Gardener",
    kind: "trainer",
    // ash-1@lv20 -> tumblecoal (Clinkerbun), ash-2@lv21 -> trundember (Kilnamble).
    party: [
      { speciesId: "tumblecoal", level: 20 },
      { speciesId: "trundember", level: 21 },
    ],
    dialogue: {
      intro: [
        "You're standing in my garden. It's fine. It's a battle garden now.",
        "I rake this ash into spirals every dawn. The wild ones roll in them by noon. Critics, all.",
      ],
      win: [
        "Well-pruned! That's the highest thing I say.",
        "First brazier's lit for you — a battle worth its warmth. Tell Gilda the light's on its way.",
      ],
      lose: [
        "Overwatered, underfed. Your team, not my ferns. Soak at Kilnhollow and regrow.",
        "The garden forgives everything. Even that.",
      ],
    },
    defeatFlag: "warden-peat-defeated",
  },

  "warden-gilda": {
    id: "warden-gilda",
    name: "Gilda",
    title: "Prism-Painter",
    kind: "trainer",
    // glass-1@lv24 -> escarglow (Shellumen), glass-2@lv25 -> cathedrail.
    party: [
      { speciesId: "escarglow", level: 24 },
      { speciesId: "cathedrail", level: 25 },
    ],
    dialogue: {
      intro: [
        "Hold still — no, battle still. The light is PERFECT and I only paint what fights back.",
        "Golden hour lasts all day here. My excuses lasted shorter. En garde.",
      ],
      win: [
        "Every brushstroke of that was better than mine. Second brazier's lit — signed, dated, yours.",
        "I'm titling the piece 'The Quiet Current, Refracted.' Keeper Solenne will want a print.",
      ],
      lose: [
        "Flat light, stiff wrists. Come back when your palette holds more than one move-type.",
        "The canyon will still be gorgeous when you return. It's insufferable that way.",
      ],
    },
    defeatFlag: "warden-gilda-defeated",
  },

  "warden-tallow": {
    id: "warden-tallow",
    name: "Tallow",
    title: "Crown Firewatcher",
    kind: "trainer",
    // vent-1@lv27 -> burrowatt, glass-3@lv27 -> canyodel, vent-2@lv29 -> steamarmot.
    party: [
      { speciesId: "burrowatt", level: 27 },
      { speciesId: "canyodel", level: 27 },
      { speciesId: "steamarmot", level: 29 },
    ],
    dialogue: {
      intro: [
        "Evening. Firewatch log, entry 4,012: one Warden, approaching. Weather: imminent.",
        "I watch for wildfires. You read as a controlled burn. Let's confirm.",
      ],
      win: [
        "Log amended: controlled burn, confirmed. Third brazier's lit. That's all three — I kept count.",
        "Past the gate, the mountain is a heartbeat with a floor. Forecast: warm, with awe.",
      ],
      lose: [
        "Log entry: sparks, no fire. Rest at Norrick's hut. The dusk will keep.",
        "No mark against you. The Crown makes everyone practice.",
      ],
    },
    defeatFlag: "warden-tallow-defeated",
  },

  "keeper-vesta": {
    id: "keeper-vesta",
    name: "Keeper Vesta",
    title: "Keeper of the Kilnheart Sanctum",
    kind: "trainer",
    // Ember specialist. ash-2@lv24 -> trundember, glass-2@lv26 -> cathedrail,
    // keeper-ace-3@lv28 -> embervoy (Ashenvoy), her ace "Bellows".
    party: [
      { speciesId: "trundember", level: 24 },
      { speciesId: "cathedrail", level: 26 },
      { speciesId: "embervoy", level: 28 },
    ],
    dialogue: {
      intro: [
        "A challenger! Hold that thought — the billet's at temper... there. Now. Let's see what you're made of. Literally. I take notes in hammer.",
        "My ace answers to Bellows. Every Keen Hit is a hammer-strike, every swap a quench-hiss — and your sigil's finished on the blow that ends this.",
      ],
      win: [
        "Rung true on the last strike. Here — the Kilnheart Sigil, still warm. Careful. Not of the heat. Of how proud I look.",
        "Two Titans woke to your footsteps already, and the one under this town has hummed since you walked in. Go light the braziers — and tell the Banked Hearth her bread oven misses her.",
      ],
      lose: [
        "Hm. Good grain, uneven quench. Bellows, love — bank the fire. We'll try this heat again.",
        "The sigil's only half-forged. Come back before it cools.",
      ],
    },
    defeatFlag: "keeper-vesta-defeated",
  },

  "titan-caldessa": {
    id: "titan-caldessa",
    name: "Caldessa",
    title: "The Banked Hearth",
    kind: "boss",
    party: [{ speciesId: "caldessa", level: 30 }],
    dialogue: {
      intro: [
        "The dormant crater draws one long breath — and rises the way a grandmother leaves a comfortable chair. The forges never sat over a lava tube. They sat over her.",
        "The heartbeat every smith in Kilnhollow hammers to slows, steadies, and turns to look at you. Caldessa, the Banked Hearth, is awake.",
        "RESONANCE TOO VAST — SYNC IMPOSSIBLE. The Codex offers only to STUDY: 'The Heart Beneath the Hearth.'",
      ],
      win: [
        "Caldessa settles back into the crater with a fond, gravelly grumble, warmth banking low in every shell-seam.",
        "Far down the mountain, Hearthglow's eternal hearth flares once in answer. She lit that one too — and she is not sorry she woke, only glad you knocked.",
      ],
      lose: [
        "The great shell lowers, unhurried, and the bowl goes bath-warm and quiet again.",
        "Caldessa dozes off mid-yawn. The Slag Gate will still be open when you have banked a little more fire of your own.",
      ],
    },
    // titanDesign: BANKED -> STOKED at 50% HP (she finally stands: defense down
    // hard, attack + speed up), then a last-embers flare near the end. Quench
    // Windows / double-turns / cinder-fall exceed the engine surface, same as
    // Cairnoss and Aurvela — translated here to stage boosts.
    bossPhases: [
      {
        hpThreshold: 0.5,
        statBoosts: { attack: 2, speed: 2, defense: -2 },
        announcement:
          "STOKED. For the first time in an age Caldessa stands — the crater rim IS her shell rim, and warm light floods every crack in the bowl.",
      },
      {
        hpThreshold: 0.2,
        statBoosts: { attack: 1 },
        announcement:
          "The last embers flare white-hot. Caldessa pours the whole banked warmth of the mountain into one final, gentle roar.",
      },
    ],
    defeatFlag: "titan-caldessa-defeated",
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
  // Act 3: THE CINDERTITHE. The Slag Gate opens only for warmth freely given —
  // three route braziers (Peat, Gilda, Tallow) lit on defeat, plus Keeper
  // Vesta's Kilnheart Sigil to strike the slot. Vell voices the denial.
  "titan-caldessa": {
    trainerId: "titan-caldessa",
    requiredFlags: [
      "warden-peat-defeated",
      "warden-gilda-defeated",
      "warden-tallow-defeated",
      "keeper-vesta-defeated",
    ],
    deniedText: [
      "Vell rests a palm on the Slag Gate. 'It isn't locked — it's asleep. Slag-sealed, dreaming of being a hearth again.'",
      "'Three cold braziers on the road, and each Warden lights theirs only for a battle worth its warmth. The door opens for warmth freely given, never taken.'",
      "'Bring me Peat's spiral, Gilda's ledge and Tallow's perch alight — and Keeper Vesta's Kilnheart Sigil to strike the slot. Then it remembers it was always a hearth.'",
    ],
  },
};
