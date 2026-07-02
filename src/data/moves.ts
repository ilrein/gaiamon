// GENERATED from design/design.json by scripts/build-data.mjs — edit the design, not this file.
import type { MoveDef } from "../shared/model";

export const MOVES: Record<string, MoveDef> = {
  "boop": {
    "id": "boop",
    "name": "Boop",
    "type": "neutral",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "flinch",
        "chance": 0.1
      }
    ],
    "description": "A cheerful headfirst snout-boop; occasionally so disarming the target forgets to act."
  },
  "zipnudge": {
    "id": "zipnudge",
    "name": "Zipnudge",
    "type": "neutral",
    "category": "physical",
    "power": 35,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "priority"
      }
    ],
    "description": "A blink-fast dash-and-nudge that always lands before slower moves. Priority +1."
  },
  "drumroll-flurry": {
    "id": "drumroll-flurry",
    "name": "Drumroll Flurry",
    "type": "neutral",
    "category": "physical",
    "power": 18,
    "accuracy": 90,
    "stamina": 2,
    "effects": [
      {
        "kind": "multiHit",
        "min": 2,
        "max": 5
      }
    ],
    "description": "Paws patter out an excited drumroll on the foe, striking 2-5 times."
  },
  "heartened-hum": {
    "id": "heartened-hum",
    "name": "Heartened Hum",
    "type": "neutral",
    "category": "spirit",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [],
    "description": "A warm resonant hum, amplified by the Codex into a gentle concussive chord."
  },
  "steady-stance": {
    "id": "steady-stance",
    "name": "Steady Stance",
    "type": "neutral",
    "category": "status",
    "power": 0,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "defense",
        "stages": 1,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "Plants all feet (or roots, or suction cups) firmly. Raises the user's Defense by 1 stage."
  },
  "sproutswat": {
    "id": "sproutswat",
    "name": "Sproutswat",
    "type": "verdant",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [],
    "description": "A springy swat with a fresh green shoot; stings more than it looks like it should."
  },
  "petal-pirouette": {
    "id": "petal-pirouette",
    "name": "Petal Pirouette",
    "type": "verdant",
    "category": "spirit",
    "power": 65,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "A spinning dance that whips up a slicing petal spiral; 20% chance the swirl tangles the foe's footing (Speed -1)."
  },
  "cradleroots": {
    "id": "cradleroots",
    "name": "Cradleroots",
    "type": "verdant",
    "category": "status",
    "power": 0,
    "accuracy": 85,
    "stamina": 2,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "tangleroot",
        "chance": 1,
        "target": "foe"
      }
    ],
    "description": "Coaxes living roots up from the soil to gently, relentlessly cradle the foe. Inflicts Tangleroot."
  },
  "sapsip": {
    "id": "sapsip",
    "name": "Sapsip",
    "type": "verdant",
    "category": "spirit",
    "power": 60,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "drain",
        "percent": 50
      }
    ],
    "description": "Draws sweet vitality from the foe through a shimmering green thread, healing the user for 50% of damage dealt."
  },
  "bloomburst": {
    "id": "bloomburst",
    "name": "Bloomburst",
    "type": "verdant",
    "category": "spirit",
    "power": 100,
    "accuracy": 90,
    "stamina": 5,
    "effects": [
      {
        "kind": "statStage",
        "stat": "spirit",
        "stages": -1,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "A whole season of flowering released in one radiant detonation; the effort lowers the user's Spirit by 1 stage."
  },
  "cindersneeze": {
    "id": "cindersneeze",
    "name": "Cindersneeze",
    "type": "ember",
    "category": "spirit",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "smolder",
        "chance": 0.15,
        "target": "foe"
      }
    ],
    "description": "An adorable, uncontrollable sneeze of hot cinders. 15% chance to leave the foe Smoldering."
  },
  "wickflick": {
    "id": "wickflick",
    "name": "Wickflick",
    "type": "ember",
    "category": "physical",
    "power": 55,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "smolder",
        "chance": 0.1,
        "target": "foe"
      }
    ],
    "description": "A whip-crack flick of a flaming tail-tip, like snuffing a candle in reverse. 10% chance to Smolder."
  },
  "stokeheart": {
    "id": "stokeheart",
    "name": "Stokeheart",
    "type": "ember",
    "category": "status",
    "power": 0,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "attack",
        "stages": 1,
        "target": "self",
        "chance": 1
      },
      {
        "kind": "statStage",
        "stat": "spirit",
        "stages": 1,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "The user fans its inner hearth until its chest glows; raises Attack and Spirit by 1 stage each."
  },
  "pyre-dive": {
    "id": "pyre-dive",
    "name": "Pyre Dive",
    "type": "ember",
    "category": "physical",
    "power": 110,
    "accuracy": 85,
    "stamina": 5,
    "effects": [
      {
        "kind": "recoil",
        "percent": 33
      }
    ],
    "description": "A meteoric full-body plunge wreathed in flame. The user takes recoil equal to 33% of damage dealt."
  },
  "dewdart": {
    "id": "dewdart",
    "name": "Dewdart",
    "type": "tide",
    "category": "spirit",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [],
    "description": "Flicks a fat, glittering dewdrop with surprising force. It goes 'plip'."
  },
  "riptail": {
    "id": "riptail",
    "name": "Riptail",
    "type": "tide",
    "category": "physical",
    "power": 55,
    "accuracy": 100,
    "stamina": 3,
    "effects": [],
    "description": "A wheeling tail-slap that drags a curl of current along with it."
  },
  "tideswell": {
    "id": "tideswell",
    "name": "Tideswell",
    "type": "tide",
    "category": "spirit",
    "power": 70,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "flinch",
        "chance": 0.1
      }
    ],
    "description": "Summons a rolling swell that breaks over the foe; 10% chance the undertow staggers them into flinching."
  },
  "mistveil": {
    "id": "mistveil",
    "name": "Mistveil",
    "type": "tide",
    "category": "status",
    "power": 0,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "defense",
        "stages": 1,
        "target": "self",
        "chance": 1
      },
      {
        "kind": "statStage",
        "stat": "spirit",
        "stages": 1,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "Wraps the user in a soft pearlescent fog; raises Defense and Spirit by 1 stage each."
  },
  "maelspout": {
    "id": "maelspout",
    "name": "Maelspout",
    "type": "tide",
    "category": "spirit",
    "power": 105,
    "accuracy": 85,
    "stamina": 5,
    "effects": [],
    "description": "Conjures a miniature waterspout that picks the foe up, spins them politely, and puts them down very hard."
  },
  "flitfeather": {
    "id": "flitfeather",
    "name": "Flitfeather",
    "type": "zephyr",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [],
    "description": "A darting strike with a wind-stiffened feather, plume, or seed-tuft."
  },
  "zephyr-reel": {
    "id": "zephyr-reel",
    "name": "Zephyr Reel",
    "type": "zephyr",
    "category": "spirit",
    "power": 70,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": 1,
        "target": "self",
        "chance": 0.3
      }
    ],
    "description": "A spiraling ribbon of wind that lashes the foe; 30% chance the user rides the backdraft (Speed +1)."
  },
  "featherstep": {
    "id": "featherstep",
    "name": "Featherstep",
    "type": "zephyr",
    "category": "status",
    "power": 0,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": 2,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "The user goes weightless on a cushion of breeze; sharply raises Speed by 2 stages."
  },
  "pebbletoss": {
    "id": "pebbletoss",
    "name": "Pebbletoss",
    "type": "terra",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [],
    "description": "Lobs a carefully chosen pebble. The choosing takes longer than the throwing."
  },
  "loamslam": {
    "id": "loamslam",
    "name": "Loamslam",
    "type": "terra",
    "category": "physical",
    "power": 85,
    "accuracy": 90,
    "stamina": 4,
    "effects": [],
    "description": "Heaves a great wave of rich dark earth over the foe. Excellent for the soil, terrible for the target."
  },
  "burrowbrace": {
    "id": "burrowbrace",
    "name": "Burrowbrace",
    "type": "terra",
    "category": "status",
    "power": 0,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "defense",
        "stages": 2,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "Digs in to the shoulders and packs earth tight around itself; sharply raises Defense by 2 stages."
  },
  "zapnibble": {
    "id": "zapnibble",
    "name": "Zapnibble",
    "type": "volt",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": -1,
        "target": "foe",
        "chance": 0.1
      }
    ],
    "description": "A tiny bite that pops with static; 10% chance the tingles slow the foe (Speed -1)."
  },
  "static-serenade": {
    "id": "static-serenade",
    "name": "Static Serenade",
    "type": "volt",
    "category": "spirit",
    "power": 65,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "A crackling lullaby whose chorus arcs into the foe; 20% chance the static clings (Speed -1)."
  },
  "stormcrown": {
    "id": "stormcrown",
    "name": "Stormcrown",
    "type": "volt",
    "category": "spirit",
    "power": 100,
    "accuracy": 85,
    "stamina": 5,
    "effects": [],
    "description": "Gathers a halo of stormlight overhead, then brings the whole crown down at once."
  },
  "flurrykiss": {
    "id": "flurrykiss",
    "name": "Flurrykiss",
    "type": "frost",
    "category": "spirit",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "rimebound",
        "chance": 0.1,
        "target": "foe"
      }
    ],
    "description": "Blows a swirl of snowflakes shaped like a kiss; 10% chance the frost takes hold (Rimebound)."
  },
  "rimecall": {
    "id": "rimecall",
    "name": "Rimecall",
    "type": "frost",
    "category": "status",
    "power": 0,
    "accuracy": 80,
    "stamina": 2,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "rimebound",
        "chance": 1,
        "target": "foe"
      }
    ],
    "description": "Sings a thin, glassy note that invites hoarfrost to crust the foe's limbs. Inflicts Rimebound."
  },
  "shardfall": {
    "id": "shardfall",
    "name": "Shardfall",
    "type": "frost",
    "category": "physical",
    "power": 75,
    "accuracy": 90,
    "stamina": 4,
    "effects": [],
    "description": "Calls down a chandelier of ice shards that shatters over the foe in slow, glittering order."
  },
  "duskgnaw": {
    "id": "duskgnaw",
    "name": "Duskgnaw",
    "type": "umbral",
    "category": "physical",
    "power": 55,
    "accuracy": 100,
    "stamina": 3,
    "effects": [],
    "description": "The user's own shadow lunges ahead of it and takes a bite. The user always looks a little embarrassed."
  },
  "lullshade": {
    "id": "lullshade",
    "name": "Lullshade",
    "type": "umbral",
    "category": "status",
    "power": 0,
    "accuracy": 75,
    "stamina": 2,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "drowse",
        "chance": 1,
        "target": "foe"
      }
    ],
    "description": "Casts a soft pool of dusk over the foe like a blanket being tucked in. Inflicts Drowse."
  },
  "umbra-sigh": {
    "id": "umbra-sigh",
    "name": "Umbra Sigh",
    "type": "umbral",
    "category": "spirit",
    "power": 70,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "spirit",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "Exhales a long, heavy ribbon of shadow; 20% chance the gloom dampens the foe's Spirit (-1)."
  },
  "glowdart": {
    "id": "glowdart",
    "name": "Glowdart",
    "type": "lumen",
    "category": "spirit",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [],
    "description": "Flings a single mote of condensed lamplight that pops in a shower of warm sparks."
  },
  "dawnsip": {
    "id": "dawnsip",
    "name": "Dawnsip",
    "type": "lumen",
    "category": "status",
    "power": 0,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "heal",
        "percent": 50
      }
    ],
    "description": "The user drinks a mouthful of morning light, restoring 50% of its max HP."
  },
  "lantern-verdict": {
    "id": "lantern-verdict",
    "name": "Lantern Verdict",
    "type": "lumen",
    "category": "spirit",
    "power": 80,
    "accuracy": 90,
    "stamina": 4,
    "effects": [
      {
        "kind": "statStage",
        "stat": "attack",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "Raises a blinding lantern-glare of judgment; 20% chance the foe shrinks from the light (Attack -1)."
  },
  "tale-twirl": {
    "id": "tale-twirl",
    "name": "Tale Twirl",
    "type": "fable",
    "category": "spirit",
    "power": 60,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "storydaze",
        "chance": 0.2,
        "target": "foe"
      }
    ],
    "description": "Spins the foe into a half-told story; 20% chance they lose the plot entirely (Storydaze)."
  },
  "plot-twist": {
    "id": "plot-twist",
    "name": "Plot Twist",
    "type": "fable",
    "category": "status",
    "power": 0,
    "accuracy": 90,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "attack",
        "stages": -1,
        "target": "foe",
        "chance": 1
      },
      {
        "kind": "statStage",
        "stat": "spirit",
        "stages": -1,
        "target": "foe",
        "chance": 1
      }
    ],
    "description": "Rewrites the scene so the foe was never the protagonist; lowers their Attack and Spirit by 1 stage each."
  },
  "grand-finale": {
    "id": "grand-finale",
    "name": "Grand Finale",
    "type": "fable",
    "category": "spirit",
    "power": 95,
    "accuracy": 85,
    "stamina": 4,
    "effects": [
      {
        "kind": "statStage",
        "stat": "spirit",
        "stages": -1,
        "target": "self",
        "chance": 1
      }
    ],
    "description": "Ends the current chapter with fireworks, confetti, and a crashing final chord; the storyteller's Spirit drops 1 stage from the effort."
  },
  "powderpounce": {
    "id": "powderpounce",
    "name": "Powderpounce",
    "type": "frost",
    "category": "physical",
    "power": 55,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "flinch",
        "chance": 0.1
      }
    ],
    "description": "Leaps at the foe inside a burst of fresh powder snow; 10% chance the soft WHUMPH startles them into flinching."
  },
  "foghorn-lull": {
    "id": "foghorn-lull",
    "name": "Foghorn Lull",
    "type": "tide",
    "category": "spirit",
    "power": 75,
    "accuracy": 90,
    "stamina": 4,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "drowse",
        "chance": 0.15,
        "target": "foe"
      }
    ],
    "description": "A deep, mournful foghorn note rolls off the water and through the foe's bones; 15% chance they drift off into Drowse."
  },
  "gustloop": {
    "id": "gustloop",
    "name": "Gustloop",
    "type": "zephyr",
    "category": "spirit",
    "power": 55,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "Ties the air around the foe into one neat loop and pulls it snug; 20% chance their footing tangles (Speed -1)."
  },
  "rumblecroak": {
    "id": "rumblecroak",
    "name": "Rumblecroak",
    "type": "volt",
    "category": "spirit",
    "power": 55,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "flinch",
        "chance": 0.1
      }
    ],
    "description": "Releases a swallowed thunderclap, weeks stale but still loud; 10% chance the delayed BOOM makes the foe flinch."
  },
  "gleamsweep": {
    "id": "gleamsweep",
    "name": "Gleamsweep",
    "type": "lumen",
    "category": "spirit",
    "power": 60,
    "accuracy": 100,
    "stamina": 3,
    "effects": [],
    "description": "Sweeps a broad lantern-beam across the field like a keeper checking every corner before bed. It always finds the foe."
  },
  "shadenip": {
    "id": "shadenip",
    "name": "Shadenip",
    "type": "umbral",
    "category": "physical",
    "power": 40,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "statStage",
        "stat": "attack",
        "stages": -1,
        "target": "foe",
        "chance": 0.1
      }
    ],
    "description": "A quick nip delivered from inside the foe's own shadow; 10% chance the sheer nerve of it dents their Attack (-1)."
  },
  "gloamrush": {
    "id": "gloamrush",
    "name": "Gloamrush",
    "type": "umbral",
    "category": "physical",
    "power": 80,
    "accuracy": 95,
    "stamina": 4,
    "effects": [],
    "description": "Charges wrapped in a rolling fold of early evening, arriving the way night does: gently, and then all at once."
  },
  "lullanote": {
    "id": "lullanote",
    "name": "Lullanote",
    "type": "fable",
    "category": "spirit",
    "power": 45,
    "accuracy": 100,
    "stamina": 3,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "drowse",
        "chance": 0.25,
        "target": "foe"
      }
    ],
    "description": "Hums a single bar of a lullaby older than the valley; 15% chance the foe's eyelids lose the argument (Drowse)."
  },
  "whiteout-hymn": {
    "id": "whiteout-hymn",
    "name": "Whiteout Hymn",
    "type": "frost",
    "category": "spirit",
    "power": 85,
    "accuracy": 90,
    "stamina": 4,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "rimebound",
        "chance": 0.1,
        "target": "foe"
      }
    ],
    "description": "Sings the low, patient song of a three-day blizzard in about four seconds; 10% chance hoarfrost takes hold (Rimebound)."
  },
  "cindercoax": {
    "id": "cindercoax",
    "name": "Cindercoax",
    "type": "ember",
    "category": "status",
    "power": 0,
    "accuracy": 85,
    "stamina": 2,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "smolder",
        "chance": 1,
        "target": "foe"
      }
    ],
    "description": "Whispers outrageous flattery to the foe's inner spark until it flares up, embarrassed. Inflicts Smolder."
  },
  "cinderoll": {
    "id": "cinderoll",
    "name": "Cinderoll",
    "type": "ember",
    "category": "physical",
    "power": 80,
    "accuracy": 95,
    "stamina": 4,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "smolder",
        "chance": 0.1,
        "target": "foe"
      }
    ],
    "description": "Curls into a glowing wheel and bowls straight through the foe; 10% chance a stray cinder catches (Smolder)."
  },
  "kindleplume": {
    "id": "kindleplume",
    "name": "Kindleplume",
    "type": "ember",
    "category": "spirit",
    "power": 75,
    "accuracy": 95,
    "stamina": 4,
    "effects": [
      {
        "kind": "applyStatus",
        "status": "smolder",
        "chance": 0.1,
        "target": "foe"
      }
    ],
    "description": "Exhales one tall, elegant plume of kiln-warm flame that folds over the foe like a bow; 10% chance to Smolder."
  },
  "dustbloom": {
    "id": "dustbloom",
    "name": "Dustbloom",
    "type": "terra",
    "category": "spirit",
    "power": 65,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "defense",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "Detonates a soft, glittering flower of canyon dust over the foe; 20% chance the grit works into every seam (Defense -1)."
  },
  "voltvault": {
    "id": "voltvault",
    "name": "Voltvault",
    "type": "volt",
    "category": "physical",
    "power": 70,
    "accuracy": 95,
    "stamina": 3,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": -1,
        "target": "foe",
        "chance": 0.2
      }
    ],
    "description": "Springs off an invisible vent of pressure and lands crackling on the foe; 20% chance the static clings (Speed -1)."
  },
  "roselight-rondo": {
    "id": "roselight-rondo",
    "name": "Roselight Rondo",
    "type": "lumen",
    "category": "spirit",
    "power": 90,
    "accuracy": 90,
    "stamina": 4,
    "effects": [],
    "description": "Pours sunlight through stained glass and plays it across the foe in slow, colored rounds, like a cathedral deciding something."
  },
  "updraft-aria": {
    "id": "updraft-aria",
    "name": "Updraft Aria",
    "type": "zephyr",
    "category": "spirit",
    "power": 85,
    "accuracy": 90,
    "stamina": 4,
    "effects": [
      {
        "kind": "statStage",
        "stat": "speed",
        "stages": 1,
        "target": "self",
        "chance": 0.2
      }
    ],
    "description": "Sings a rising scale that becomes a rising wind and drops it on the foe from above; 20% chance the user rides the last note higher (Speed +1)."
  },
  "canyon-chorus": {
    "id": "canyon-chorus",
    "name": "Canyon Chorus",
    "type": "neutral",
    "category": "spirit",
    "power": 20,
    "accuracy": 100,
    "stamina": 2,
    "effects": [
      {
        "kind": "multiHit",
        "min": 2,
        "max": 2
      }
    ],
    "description": "Sings one bright note and lets the canyon answer. Hits twice: once for the voice, once for the echo."
  }
};
