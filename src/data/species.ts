// GENERATED from design/design.json by scripts/build-data.mjs — edit the design, not this file.
import type { SpeciesDef } from "../shared/model";

export const SPECIES: Record<string, SpeciesDef> = {
  "fernby": {
    "id": "fernby",
    "name": "Fernby",
    "types": [
      "verdant"
    ],
    "role": "starter-verdant",
    "stage": 1,
    "evolvesTo": "frondelle",
    "evolveLevel": 14,
    "baseStats": {
      "hp": 62,
      "attack": 55,
      "defense": 66,
      "spirit": 68,
      "speed": 57
    },
    "syncRate": 1,
    "xpYield": 55,
    "dexEntry": "A round chinchilla-like sprout whose tail is a tightly coiled fern fiddlehead. It unrolls the tail a tiny bit each time it feels brave, and rolls it back up when it thinks nobody saw.",
    "inspiration": "A starter whose evolution is literally visible day to day: its fern tail unfurls with its courage, so players watch it grow between battles, not just at level-ups.",
    "visualPrompt": "A small round chinchilla-like creature with soft moss-green fur, a cream belly, and a large coiled fern fiddlehead for a tail; big glossy dark eyes, tiny leaf-shaped ears, sitting upright with a shy hopeful smile.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "sproutswat"
      },
      {
        "level": 3,
        "moveId": "steady-stance"
      },
      {
        "level": 5,
        "moveId": "cradleroots"
      },
      {
        "level": 9,
        "moveId": "sapsip"
      },
      {
        "level": 13,
        "moveId": "petal-pirouette"
      },
      {
        "level": 13,
        "moveId": "drumroll-flurry"
      }
    ]
  },
  "frondelle": {
    "id": "frondelle",
    "name": "Frondelle",
    "types": [
      "verdant"
    ],
    "role": "starter-verdant",
    "stage": 2,
    "evolvesTo": "arbrella",
    "evolveLevel": 30,
    "baseStats": {
      "hp": 78,
      "attack": 70,
      "defense": 84,
      "spirit": 86,
      "speed": 70
    },
    "syncRate": 1,
    "xpYield": 100,
    "dexEntry": "Its fern tail has unfurled into a graceful frond it carries overhead like a parasol. It insists on holding the frond over its Warden in the rain, even though it barely reaches their knees.",
    "inspiration": "The awkward middle stage played as chivalry: a creature practicing to be a shelter before it is big enough to shelter anything.",
    "visualPrompt": "A lanky adolescent chinchilla-fawn creature with moss-green fur and darker leaf markings, holding a single elegant unfurled fern frond above its head like a parasol; earnest determined expression, slightly too-big paws.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "sproutswat"
      },
      {
        "level": 1,
        "moveId": "cradleroots"
      },
      {
        "level": 1,
        "moveId": "sapsip"
      },
      {
        "level": 14,
        "moveId": "petal-pirouette"
      },
      {
        "level": 18,
        "moveId": "heartened-hum"
      },
      {
        "level": 22,
        "moveId": "pebbletoss"
      },
      {
        "level": 26,
        "moveId": "bloomburst"
      }
    ]
  },
  "arbrella": {
    "id": "arbrella",
    "name": "Arbrella",
    "types": [
      "verdant",
      "terra"
    ],
    "role": "starter-verdant",
    "stage": 3,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 100,
      "attack": 85,
      "defense": 112,
      "spirit": 108,
      "speed": 80
    },
    "syncRate": 1,
    "xpYield": 165,
    "dexEntry": "Its canopy has grown into a vast living umbrella of layered fronds, and wild Gaiamon instinctively gather beneath it when storms roll in. It pretends not to notice them, but always widens the canopy a little.",
    "inspiration": "A final evolution whose power fantasy is protection, not aggression: a walking shelter-tree that turns the battlefield into its own grove.",
    "visualPrompt": "A tall, gentle treant-beast with bark-plated legs rooted like boots in fresh soil, its back and head crowned by an enormous layered fern canopy shaped like a round umbrella; warm amber eyes glowing softly under the leaf-shade, small flowers dotting its shoulders.",
    "learnset": [
      {
        "level": 1,
        "moveId": "sproutswat"
      },
      {
        "level": 1,
        "moveId": "sapsip"
      },
      {
        "level": 1,
        "moveId": "petal-pirouette"
      },
      {
        "level": 1,
        "moveId": "pebbletoss"
      },
      {
        "level": 30,
        "moveId": "loamslam"
      },
      {
        "level": 34,
        "moveId": "bloomburst"
      },
      {
        "level": 38,
        "moveId": "burrowbrace"
      }
    ]
  },
  "kindlet": {
    "id": "kindlet",
    "name": "Kindlet",
    "types": [
      "ember"
    ],
    "role": "starter-ember",
    "stage": 1,
    "evolvesTo": "scampyre",
    "evolveLevel": 14,
    "baseStats": {
      "hp": 56,
      "attack": 70,
      "defense": 52,
      "spirit": 64,
      "speed": 70
    },
    "syncRate": 1,
    "xpYield": 55,
    "dexEntry": "A sooty ferret kit with a topknot of living kindling that crackles when it is excited, which is always. It gifts warm coals to friends on cold mornings and is baffled when they cannot hold them.",
    "inspiration": "A fire starter built around generosity instead of temper: fire as a gift it keeps trying to share with creatures who cannot carry it.",
    "visualPrompt": "A tiny soot-grey ferret kit with a cream muzzle and a flickering tuft of orange kindling-flame on its head like a topknot; round amber eyes, ember-freckles on its cheeks, mid-bounce with an eager open-mouthed grin.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "cindersneeze"
      },
      {
        "level": 4,
        "moveId": "zipnudge"
      },
      {
        "level": 5,
        "moveId": "wickflick"
      },
      {
        "level": 9,
        "moveId": "stokeheart"
      },
      {
        "level": 13,
        "moveId": "duskgnaw"
      },
      {
        "level": 13,
        "moveId": "heartened-hum"
      }
    ]
  },
  "scampyre": {
    "id": "scampyre",
    "name": "Scampyre",
    "types": [
      "ember"
    ],
    "role": "starter-ember",
    "stage": 2,
    "evolvesTo": "blazermine",
    "evolveLevel": 30,
    "baseStats": {
      "hp": 68,
      "attack": 88,
      "defense": 62,
      "spirit": 80,
      "speed": 94
    },
    "syncRate": 1,
    "xpYield": 100,
    "dexEntry": "A sleek fire-ferret that runs so fast its flame streams behind it like a scarf. Its shadow has started arriving a half-second late, and sometimes in the wrong place.",
    "inspiration": "A middle stage that foreshadows its final dual-type on screen: the desynced shadow is a visible tell the player notices before the dex explains it.",
    "visualPrompt": "A sleek, long-bodied ember ferret with charcoal fur, blazing orange flame trailing from its head and tail-tip like a windblown scarf, and a subtly misaligned shadow beneath it; confident smirk, body in a full running stretch.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "cindersneeze"
      },
      {
        "level": 1,
        "moveId": "wickflick"
      },
      {
        "level": 1,
        "moveId": "zipnudge"
      },
      {
        "level": 14,
        "moveId": "stokeheart"
      },
      {
        "level": 18,
        "moveId": "duskgnaw"
      },
      {
        "level": 22,
        "moveId": "umbra-sigh"
      },
      {
        "level": 26,
        "moveId": "pyre-dive"
      }
    ]
  },
  "blazermine": {
    "id": "blazermine",
    "name": "Embermine",
    "types": [
      "ember",
      "umbral"
    ],
    "role": "starter-ember",
    "stage": 3,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 80,
      "attack": 112,
      "defense": 72,
      "spirit": 98,
      "speed": 126
    },
    "syncRate": 1,
    "xpYield": 165,
    "dexEntry": "A regal ermine of flame whose smoke-shadow has fully come alive and hunts alongside it. The two share every meal precisely in half, though nobody knows what the shadow does with its portion.",
    "inspiration": "A fire/dark design where the darkness is not edgy but companionable: the creature and its living smoke-shadow fight as an inseparable duet.",
    "visualPrompt": "A large elegant ermine with ember-orange and charcoal fur, a mane of low blue-cored flame, and a second creature-shaped shadow of living smoke standing beside it mimicking its pose; sharp but kind golden eyes, long plume tail.",
    "learnset": [
      {
        "level": 1,
        "moveId": "wickflick"
      },
      {
        "level": 1,
        "moveId": "zipnudge"
      },
      {
        "level": 1,
        "moveId": "duskgnaw"
      },
      {
        "level": 1,
        "moveId": "stokeheart"
      },
      {
        "level": 30,
        "moveId": "umbra-sigh"
      },
      {
        "level": 34,
        "moveId": "pyre-dive"
      },
      {
        "level": 38,
        "moveId": "lullshade"
      }
    ]
  },
  "puddlop": {
    "id": "puddlop",
    "name": "Puddlop",
    "types": [
      "tide"
    ],
    "role": "starter-tide",
    "stage": 1,
    "evolvesTo": "lagoonet",
    "evolveLevel": 14,
    "baseStats": {
      "hp": 66,
      "attack": 48,
      "defense": 60,
      "spirit": 74,
      "speed": 58
    },
    "syncRate": 1,
    "xpYield": 55,
    "dexEntry": "A wobbly little octopod that balances its own personal puddle on its head like a hat and refills it from every rain gutter it passes. If the puddle spills, it sulks until someone helps refill it.",
    "inspiration": "A water starter that carries its water with it: the tide is a possession it tends, waters plants with, and will eventually learn to sing.",
    "visualPrompt": "A squishy round blue-lavender octopus blob with stubby ear-like fins, big pearly eyes, and a shallow shimmering puddle balanced flat on its head like a hat; four stubby tentacle-feet, delighted wobbling posture.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "dewdart"
      },
      {
        "level": 4,
        "moveId": "mistveil"
      },
      {
        "level": 5,
        "moveId": "riptail"
      },
      {
        "level": 9,
        "moveId": "tideswell"
      },
      {
        "level": 13,
        "moveId": "flurrykiss"
      },
      {
        "level": 13,
        "moveId": "heartened-hum"
      }
    ]
  },
  "lagoonet": {
    "id": "lagoonet",
    "name": "Lagoonet",
    "types": [
      "tide"
    ],
    "role": "starter-tide",
    "stage": 2,
    "evolvesTo": "abyssong",
    "evolveLevel": 30,
    "baseStats": {
      "hp": 82,
      "attack": 58,
      "defense": 74,
      "spirit": 94,
      "speed": 76
    },
    "syncRate": 1,
    "xpYield": 100,
    "dexEntry": "Its head-puddle has deepened into a private lagoon, complete with one tiny fish it refuses to explain. At night it hums into the water and listens to the note come back changed.",
    "inspiration": "An evolution measured in ecosystem: the starter levels up and so does the body of water it carries, from puddle to lagoon to singing abyss.",
    "visualPrompt": "A taller graceful octopod in deep teal with trailing skirt-like tentacles, its head crowned by a wide bowl-shaped lagoon of glowing turquoise water with one tiny golden fish inside; serene half-closed eyes, faint freckles of light along its arms.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "dewdart"
      },
      {
        "level": 1,
        "moveId": "riptail"
      },
      {
        "level": 1,
        "moveId": "mistveil"
      },
      {
        "level": 14,
        "moveId": "tideswell"
      },
      {
        "level": 18,
        "moveId": "flurrykiss"
      },
      {
        "level": 22,
        "moveId": "glowdart"
      },
      {
        "level": 26,
        "moveId": "maelspout"
      }
    ]
  },
  "abyssong": {
    "id": "abyssong",
    "name": "Abyssong",
    "types": [
      "tide",
      "lumen"
    ],
    "role": "starter-tide",
    "stage": 3,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 100,
      "attack": 66,
      "defense": 88,
      "spirit": 122,
      "speed": 104
    },
    "syncRate": 1,
    "xpYield": 165,
    "dexEntry": "A deep-sea siren whose head-water has become a bottomless well of starlit brine; its song rises out of the depths a few seconds before it opens its mouth. Sailors' lanterns are said to burn brighter when one passes beneath their hull.",
    "inspiration": "The abyss reimagined as a lighthouse: instead of horror-of-the-deep, the deep is where the light and the music are kept safe.",
    "visualPrompt": "A majestic siren-octopus with flowing ribbon tentacles in midnight blue, dotted with constellations of bioluminescent gold lanterns, its head crowned by a deep dark pool of water full of tiny stars; luminous gentle eyes, mouth open mid-song.",
    "learnset": [
      {
        "level": 1,
        "moveId": "dewdart"
      },
      {
        "level": 1,
        "moveId": "riptail"
      },
      {
        "level": 1,
        "moveId": "tideswell"
      },
      {
        "level": 1,
        "moveId": "glowdart"
      },
      {
        "level": 30,
        "moveId": "dawnsip"
      },
      {
        "level": 34,
        "moveId": "lantern-verdict"
      },
      {
        "level": 38,
        "moveId": "maelspout"
      }
    ]
  },
  "dandelamb": {
    "id": "dandelamb",
    "name": "Dandelamb",
    "types": [
      "verdant",
      "zephyr"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": "thistleram",
    "evolveLevel": 16,
    "baseStats": {
      "hp": 60,
      "attack": 50,
      "defense": 56,
      "spirit": 64,
      "speed": 76
    },
    "syncRate": 0.65,
    "xpYield": 50,
    "dexEntry": "A lamb whose wool is a cloud of dandelion seed-fluff. When startled it scatters into the wind entirely, then regrows overnight, and always looks mildly surprised to still exist.",
    "inspiration": "A route-1 creature whose defense mechanism is literal dispersal: it plants a meadow everywhere it panics, terraforming the route it lives on.",
    "visualPrompt": "A tiny lamb with a slate-grey face and legs, its body an oversized puffball of white dandelion seed-fluff with a few seeds always drifting off; huge damp dark eyes, permanently gently startled expression.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "flitfeather"
      },
      {
        "level": 3,
        "moveId": "sproutswat"
      },
      {
        "level": 5,
        "moveId": "featherstep"
      },
      {
        "level": 9,
        "moveId": "zephyr-reel"
      },
      {
        "level": 13,
        "moveId": "sapsip"
      },
      {
        "level": 15,
        "moveId": "petal-pirouette"
      }
    ]
  },
  "thistleram": {
    "id": "thistleram",
    "name": "Thistleram",
    "types": [
      "verdant",
      "zephyr"
    ],
    "role": "wild",
    "stage": 2,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 76,
      "attack": 84,
      "defense": 70,
      "spirit": 76,
      "speed": 88
    },
    "syncRate": 0.35,
    "xpYield": 105,
    "dexEntry": "Its seed-wool has toughened into a bristling mantle of thistledown and its curled horns whistle in the wind. Old shepherds say every meadow on the route was planted by one Thistleram losing its temper, once, long ago.",
    "inspiration": "The payoff of the dispersal gimmick: the panicky puffball grows into the thing the wind itself gets out of the way for.",
    "visualPrompt": "A proud ram with storm-grey wool bristling with silver thistledown spikes, sweeping spiral horns carved with wind-grooves, and seed-fluff streaming off its shoulders like a cape; steady golden eyes, braced stance on a hilltop.",
    "learnset": [
      {
        "level": 1,
        "moveId": "flitfeather"
      },
      {
        "level": 1,
        "moveId": "sproutswat"
      },
      {
        "level": 1,
        "moveId": "featherstep"
      },
      {
        "level": 1,
        "moveId": "zephyr-reel"
      },
      {
        "level": 16,
        "moveId": "sapsip"
      },
      {
        "level": 20,
        "moveId": "petal-pirouette"
      },
      {
        "level": 24,
        "moveId": "drumroll-flurry"
      },
      {
        "level": 28,
        "moveId": "bloomburst"
      }
    ]
  },
  "pottle": {
    "id": "pottle",
    "name": "Pottle",
    "types": [
      "terra",
      "verdant"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 70,
      "attack": 58,
      "defense": 92,
      "spirit": 60,
      "speed": 28
    },
    "syncRate": 0.55,
    "xpYield": 60,
    "dexEntry": "A shy clay hermit that wears abandoned flowerpots as armor, with one stubborn sprout growing from the soil it keeps inside. Kind gardeners in town leave their cracked pots on windowsills, just in case.",
    "inspiration": "A hermit-crab loop with human culture: the community leaves out pots for it, so the creature's habitat is literally people's kindness.",
    "visualPrompt": "A small terracotta-orange clay creature peeking out of an upside-down weathered flowerpot worn like a shell, one bright green two-leaf sprout growing from the pot's drainage hole; stubby clay paws, bashful round black eyes.",
    "learnset": [
      {
        "level": 1,
        "moveId": "pebbletoss"
      },
      {
        "level": 1,
        "moveId": "sproutswat"
      },
      {
        "level": 4,
        "moveId": "burrowbrace"
      },
      {
        "level": 5,
        "moveId": "cradleroots"
      },
      {
        "level": 9,
        "moveId": "sapsip"
      },
      {
        "level": 13,
        "moveId": "loamslam"
      },
      {
        "level": 18,
        "moveId": "heartened-hum"
      }
    ]
  },
  "zizzle": {
    "id": "zizzle",
    "name": "Zizzle",
    "types": [
      "volt"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 48,
      "attack": 56,
      "defense": 44,
      "spirit": 70,
      "speed": 92
    },
    "syncRate": 0.6,
    "xpYield": 55,
    "dexEntry": "A static-charged dust bunny that lives under floorboards and collects lost buttons, hairpins, and single earrings. It returns them eventually, arranged in neat rows, sorted by how much it misses you.",
    "inspiration": "An electric-type born from domestic static instead of storms: the spark you get from a doorknob, given a face and a hoarding habit.",
    "visualPrompt": "A fist-sized ball of grey-lavender fuzz crackling with tiny yellow static arcs, two long rabbit-like tufts standing up like antennae, several shiny buttons stuck in its fur; wide sparking eyes and a tiny crooked grin.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "zapnibble"
      },
      {
        "level": 3,
        "moveId": "zipnudge"
      },
      {
        "level": 5,
        "moveId": "static-serenade"
      },
      {
        "level": 10,
        "moveId": "drumroll-flurry"
      },
      {
        "level": 14,
        "moveId": "featherstep"
      },
      {
        "level": 19,
        "moveId": "stormcrown"
      }
    ]
  },
  "nibbin": {
    "id": "nibbin",
    "name": "Nibbin",
    "types": [
      "neutral"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 64,
      "attack": 58,
      "defense": 52,
      "spirit": 48,
      "speed": 78
    },
    "syncRate": 0.7,
    "xpYield": 42,
    "dexEntry": "A round harvest mouse that hoards pretty pebbles and will solemnly trade one for any song hummed at it. Wardens report it always overpays, and always looks like it knows.",
    "inspiration": "The mandatory route-1 rodent replaced by a tiny merchant of worthless treasures: an economy of pebbles and songs instead of a filler encounter.",
    "visualPrompt": "A chubby wheat-gold harvest mouse standing upright, cheeks full, clutching a smooth river pebble in both paws like a precious gem; oversized round ears, tiny satchel woven from grass, earnest shiny black eyes.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "zipnudge"
      },
      {
        "level": 3,
        "moveId": "drumroll-flurry"
      },
      {
        "level": 5,
        "moveId": "steady-stance"
      },
      {
        "level": 9,
        "moveId": "heartened-hum"
      },
      {
        "level": 13,
        "moveId": "glowdart"
      },
      {
        "level": 17,
        "moveId": "dawnsip"
      }
    ]
  },
  "tattertale": {
    "id": "tattertale",
    "name": "Fablefray",
    "types": [
      "fable",
      "umbral"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 56,
      "attack": 44,
      "defense": 50,
      "spirit": 88,
      "speed": 72
    },
    "syncRate": 0.3,
    "xpYield": 65,
    "dexEntry": "A small spirit stitched together from the torn pages of unfinished storybooks, forever searching for how its own tale ends. It rewrites one word on any page left open overnight, always for the better.",
    "inspiration": "A ghost-type haunted not by death but by lack of an ending: the rare creature you sync by, in effect, promising to finish its story.",
    "visualPrompt": "A small floating wisp-creature made of overlapping torn parchment pages with faded ink script, edges fluttering like a ragged cloak, a single inky ribbon bookmark trailing behind; two soft glowing violet eyes peering from between the pages, curious tilt of the head.",
    "learnset": [
      {
        "level": 1,
        "moveId": "heartened-hum"
      },
      {
        "level": 1,
        "moveId": "tale-twirl"
      },
      {
        "level": 4,
        "moveId": "plot-twist"
      },
      {
        "level": 5,
        "moveId": "umbra-sigh"
      },
      {
        "level": 10,
        "moveId": "lullshade"
      },
      {
        "level": 15,
        "moveId": "grand-finale"
      }
    ]
  },
  "cairnoss": {
    "id": "cairnoss",
    "name": "Cairnoss",
    "types": [
      "terra",
      "lumen"
    ],
    "role": "titan",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 200,
      "attack": 140,
      "defense": 170,
      "spirit": 130,
      "speed": 60
    },
    "syncRate": 0,
    "xpYield": 500,
    "dexEntry": "The oldest waystone at the trial site was never a waystone at all, but a colossus that knelt to rest an age ago and let travelers carve runes into its back. When it finally stands, moss avalanches from its shoulders and every carved rune ignites like a lantern.",
    "inspiration": "The landmark-as-boss: players have used this 'monument' as scenery for hours before the trial reveals the furniture is the Titan.",
    "visualPrompt": "A colossal kneeling-then-rising stone giant built of stacked cairn boulders, blanketed in deep moss and tiny white flowers, hundreds of carved runes across its body glowing warm lantern-gold; two calm ancient eyes of soft light deep in a weathered stone face.",
    "learnset": [
      {
        "level": 1,
        "moveId": "pebbletoss"
      },
      {
        "level": 1,
        "moveId": "loamslam"
      },
      {
        "level": 1,
        "moveId": "burrowbrace"
      },
      {
        "level": 1,
        "moveId": "lantern-verdict"
      },
      {
        "level": 1,
        "moveId": "shardfall"
      },
      {
        "level": 1,
        "moveId": "dawnsip"
      }
    ]
  },
  "hushpup": {
    "id": "hushpup",
    "name": "Hushpup",
    "types": [
      "tide"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": "mistcalf",
    "evolveLevel": 9,
    "baseStats": {
      "hp": 62,
      "attack": 50,
      "defense": 58,
      "spirit": 70,
      "speed": 65
    },
    "syncRate": 0.6,
    "xpYield": 52,
    "dexEntry": "A lake-seal pup whose bark comes out as a tiny, faraway foghorn no matter how close it is standing. It practices against the coast cliffs every evening and mistakes its own echo for a friend answering.",
    "inspiration": "A water line built on sound as safety rather than water as weapon: a species whose entire biology is a living foghorn, so its evolution is measured in how far its voice can keep someone from being lost.",
    "visualPrompt": "A small pearl-grey seal pup with an oversized, gently flared trumpet-bell throat like a soft brass horn, wisps of mist curling from its nose; huge dark hopeful eyes and stubby flippers pressed together mid-toot.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "dewdart"
      },
      {
        "level": 4,
        "moveId": "mistveil"
      },
      {
        "level": 6,
        "moveId": "riptail"
      },
      {
        "level": 10,
        "moveId": "tideswell"
      },
      {
        "level": 14,
        "moveId": "heartened-hum"
      }
    ]
  },
  "mistcalf": {
    "id": "mistcalf",
    "name": "Mistcalf",
    "types": [
      "tide"
    ],
    "role": "wild",
    "stage": 2,
    "evolvesTo": "fathomoo",
    "evolveLevel": 21,
    "baseStats": {
      "hp": 78,
      "attack": 60,
      "defense": 72,
      "spirit": 90,
      "speed": 85
    },
    "syncRate": 0.35,
    "xpYield": 102,
    "dexEntry": "Its horn-call has grown strong enough to part the fog into a clean corridor, and it spends whole evenings ferrying lost rowboats home. It accepts payment only in applause, and counts it.",
    "inspiration": "A middle stage whose power-up is civic: the awkward teen phase spent doing volunteer harbor work, so the player watches it grow into a public service before it grows into a legend.",
    "visualPrompt": "A sleek adolescent seal with a collar-ruff of cloud clinging to its neck like a scarf, faint sound-rings rippling from its chest; long body arched proudly, one flipper raised as if directing fog traffic.",
    "learnset": [
      {
        "level": 1,
        "moveId": "dewdart"
      },
      {
        "level": 1,
        "moveId": "riptail"
      },
      {
        "level": 1,
        "moveId": "mistveil"
      },
      {
        "level": 1,
        "moveId": "tideswell"
      },
      {
        "level": 18,
        "moveId": "foghorn-lull"
      },
      {
        "level": 22,
        "moveId": "zephyr-reel"
      },
      {
        "level": 26,
        "moveId": "flurrykiss"
      },
      {
        "level": 30,
        "moveId": "maelspout"
      }
    ]
  },
  "fathomoo": {
    "id": "fathomoo",
    "name": "Fathomoo",
    "types": [
      "tide",
      "zephyr"
    ],
    "role": "wild",
    "stage": 3,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 100,
      "attack": 72,
      "defense": 88,
      "spirit": 118,
      "speed": 102
    },
    "syncRate": 0.3,
    "xpYield": 168,
    "dexEntry": "A great fog-siren whose single low MOO can be heard two days' sail apart; the coast's mist is simply its song, exhaled. When one Fathomoo fell silent for a week, every lighthouse keeper on the coast whispered until it sang again.",
    "inspiration": "A final form whose ultimate power is atmosphere itself: the biome's signature weather is revealed to be one creature's ongoing lullaby, making the map a character the player has been walking through all along.",
    "visualPrompt": "A long, majestic seal-leviathan with a vast bellows chest, fins trailing like wind-ribbons, and a crown of slowly coiling fog it continuously breathes; heavy-lidded serene eyes, mouth open in an endless quiet note.",
    "learnset": [
      {
        "level": 1,
        "moveId": "riptail"
      },
      {
        "level": 1,
        "moveId": "tideswell"
      },
      {
        "level": 1,
        "moveId": "foghorn-lull"
      },
      {
        "level": 1,
        "moveId": "zephyr-reel"
      },
      {
        "level": 34,
        "moveId": "featherstep"
      },
      {
        "level": 38,
        "moveId": "maelspout"
      }
    ]
  },
  "snugget": {
    "id": "snugget",
    "name": "Snugget",
    "types": [
      "frost"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": "duvetusk",
    "evolveLevel": 17,
    "baseStats": {
      "hp": 66,
      "attack": 54,
      "defense": 68,
      "spirit": 62,
      "speed": 55
    },
    "syncRate": 0.55,
    "xpYield": 56,
    "dexEntry": "A round snow-vole that hoards sunbeams in its cheek pouches to get through blizzards. It will give a shivering traveler its very last one, then insist, teeth chattering, that it wasn't even cold out.",
    "inspiration": "An ice-type whose treasure is heat: inverting the frost archetype so the coldest creature on the mountain is the one whose whole life is collecting and gifting warmth.",
    "visualPrompt": "A plump snowball-shaped vole with white fur patterned in frost-blue rosettes, cheeks glowing faint sunrise-amber from the sunbeams stored inside; tiny rounded ears, stubby paws clasped, breath visible as a proud little puff.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "flurrykiss"
      },
      {
        "level": 4,
        "moveId": "steady-stance"
      },
      {
        "level": 8,
        "moveId": "powderpounce"
      },
      {
        "level": 12,
        "moveId": "rimecall"
      },
      {
        "level": 16,
        "moveId": "dawnsip"
      }
    ]
  },
  "duvetusk": {
    "id": "duvetusk",
    "name": "Duvetusk",
    "types": [
      "frost"
    ],
    "role": "wild",
    "stage": 2,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 92,
      "attack": 76,
      "defense": 96,
      "spirit": 74,
      "speed": 52
    },
    "syncRate": 0.35,
    "xpYield": 110,
    "dexEntry": "A walrus-yak whose quilted coat is a living duvet, warm on the inside and snowproof on the out. It has waited out a three-day blizzard without moving because a lost climber was asleep against its flank, and would do it again.",
    "inspiration": "A tank species whose defense stat is literally hospitality: its evolutionary niche is being slept on, so its bulk exists to shelter others rather than to win.",
    "visualPrompt": "A big, round walrus-yak with a snow-white quilted blanket coat stitched in ice-blue seams, two short downward tusks like carved bedposts, and a broad flat back drifted with snow; small kind eyes under heavy frost lashes.",
    "learnset": [
      {
        "level": 1,
        "moveId": "flurrykiss"
      },
      {
        "level": 1,
        "moveId": "powderpounce"
      },
      {
        "level": 1,
        "moveId": "rimecall"
      },
      {
        "level": 1,
        "moveId": "steady-stance"
      },
      {
        "level": 18,
        "moveId": "shardfall"
      },
      {
        "level": 22,
        "moveId": "dawnsip"
      },
      {
        "level": 26,
        "moveId": "whiteout-hymn"
      },
      {
        "level": 30,
        "moveId": "loamslam"
      }
    ]
  },
  "dimmet": {
    "id": "dimmet",
    "name": "Dimmet",
    "types": [
      "umbral"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": "gloamane",
    "evolveLevel": 13,
    "baseStats": {
      "hp": 56,
      "attack": 62,
      "defense": 50,
      "spirit": 60,
      "speed": 82
    },
    "syncRate": 0.55,
    "xpYield": 54,
    "dexEntry": "A dusk-fox kit that patrols the forest at nightfall, pulling leaf-blankets over sleeping creatures and dimming glow-mushrooms with a polite pat. It always tucks its own tail in last, and usually misses.",
    "inspiration": "A dark-type built from bedtime instead of menace: the scary forest at night reframed as a creature doing rounds, so Umbral reads as care work the player only notices by its results.",
    "visualPrompt": "A small charcoal fox kit with soft dusk-mist rising off its paws and a single sunset-orange sliver at its tail tip like the last light of day; drowsy half-moon eyes, mid-tiptoe with one paw raised to shush.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "shadenip"
      },
      {
        "level": 5,
        "moveId": "lullshade"
      },
      {
        "level": 7,
        "moveId": "duskgnaw"
      },
      {
        "level": 11,
        "moveId": "umbra-sigh"
      },
      {
        "level": 14,
        "moveId": "zipnudge"
      }
    ]
  },
  "gloamane": {
    "id": "gloamane",
    "name": "Gloamane",
    "types": [
      "umbral"
    ],
    "role": "wild",
    "stage": 2,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 72,
      "attack": 88,
      "defense": 66,
      "spirit": 74,
      "speed": 100
    },
    "syncRate": 0.35,
    "xpYield": 108,
    "dexEntry": "Its mane is a fold of actual night sky, and evening arrives in the forest wherever it chooses to walk. It keeps one firefly in its mane as a nightlight and insists, to anyone who asks, that this is for the firefly's benefit.",
    "inspiration": "A creature that is the schedule: dusk in its home forest is not a time but a place this animal carries, letting level designers move nightfall around like a prop.",
    "visualPrompt": "A lean, long-legged fox-wolf with a flowing indigo mane speckled with faint stars, night visibly pooling and trailing behind its stride; calm gold eyes, one tiny firefly glowing inside the mane like a lantern.",
    "learnset": [
      {
        "level": 1,
        "moveId": "shadenip"
      },
      {
        "level": 1,
        "moveId": "duskgnaw"
      },
      {
        "level": 1,
        "moveId": "lullshade"
      },
      {
        "level": 1,
        "moveId": "umbra-sigh"
      },
      {
        "level": 19,
        "moveId": "gloamrush"
      },
      {
        "level": 24,
        "moveId": "featherstep"
      }
    ]
  },
  "rumblit": {
    "id": "rumblit",
    "name": "Rumblit",
    "types": [
      "volt"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 60,
      "attack": 52,
      "defense": 56,
      "spirit": 78,
      "speed": 66
    },
    "syncRate": 0.5,
    "xpYield": 58,
    "dexEntry": "A round pond frog that swallows thunderclaps during storms and burps them back out weeks later, always at the worst possible moment. The village archive bans it every reading season, and every reading season it sneaks back in.",
    "inspiration": "An electric type that stores sound instead of charge: thunder as a perishable snack with a delayed-release mechanic, making its whole personality a mistimed punchline.",
    "visualPrompt": "A plump moss-yellow frog with a storm-grey croak sac that flickers from inside with tiny lightning, faint zigzag markings down its back; smug closed-mouth smile of something holding in a very big noise.",
    "learnset": [
      {
        "level": 1,
        "moveId": "boop"
      },
      {
        "level": 1,
        "moveId": "zapnibble"
      },
      {
        "level": 6,
        "moveId": "rumblecroak"
      },
      {
        "level": 10,
        "moveId": "static-serenade"
      },
      {
        "level": 14,
        "moveId": "tideswell"
      },
      {
        "level": 20,
        "moveId": "stormcrown"
      }
    ]
  },
  "waylume": {
    "id": "waylume",
    "name": "Waylume",
    "types": [
      "lumen"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 64,
      "attack": 44,
      "defense": 70,
      "spirit": 82,
      "speed": 50
    },
    "syncRate": 0.5,
    "xpYield": 60,
    "dexEntry": "A little sprite of road-light that stands very straight at forks in the path, pretending to be a waymarker so travelers pick the right way home. One still waits at a crossroads outside town for the traveler who used to wave goodnight to it.",
    "inspiration": "A light-type descended from infrastructure kindness: the first mapmakers' surveying lights left burning so long they woke up, tying the species directly into the region's waymarker-stone lore.",
    "visualPrompt": "A small upright teardrop of warm lamplight wearing a weathered wooden sign-arm across its head like a crooked hat, hovering a coin's height above the ground; a steady golden core for a heart and patient round eyes.",
    "learnset": [
      {
        "level": 1,
        "moveId": "glowdart"
      },
      {
        "level": 1,
        "moveId": "steady-stance"
      },
      {
        "level": 7,
        "moveId": "gleamsweep"
      },
      {
        "level": 11,
        "moveId": "dawnsip"
      },
      {
        "level": 15,
        "moveId": "lantern-verdict"
      },
      {
        "level": 19,
        "moveId": "heartened-hum"
      }
    ]
  },
  "kipkite": {
    "id": "kipkite",
    "name": "Kipkite",
    "types": [
      "zephyr"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 52,
      "attack": 58,
      "defense": 48,
      "spirit": 62,
      "speed": 95
    },
    "syncRate": 0.55,
    "xpYield": 55,
    "dexEntry": "A paper kite the wind loved so much it woke up. It naps on updrafts with its string curled beneath it like a cat's tail, and every festival it loops low over the village, looking for the hand that let it go.",
    "inspiration": "A wind-type made from a toy instead of a bird: an object animated by being played with, whose sync fiction is simply someone finally picking the string back up.",
    "visualPrompt": "A diamond-shaped paper kite creature with crayon-scribbled eyes, patched corners, and a long ribbon-bow tail rippling behind it; its loose string trails below like a leash hoping to be held.",
    "learnset": [
      {
        "level": 1,
        "moveId": "flitfeather"
      },
      {
        "level": 1,
        "moveId": "zipnudge"
      },
      {
        "level": 6,
        "moveId": "gustloop"
      },
      {
        "level": 10,
        "moveId": "featherstep"
      },
      {
        "level": 14,
        "moveId": "zephyr-reel"
      },
      {
        "level": 18,
        "moveId": "drumroll-flurry"
      }
    ]
  },
  "hummabye": {
    "id": "hummabye",
    "name": "Hummabye",
    "types": [
      "fable"
    ],
    "role": "wild",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 60,
      "attack": 40,
      "defense": 56,
      "spirit": 92,
      "speed": 70
    },
    "syncRate": 0.2,
    "xpYield": 75,
    "dexEntry": "The region's oldest lullaby, escaped from every cradle that ever hummed it, now drifting where the mist touches the lake at dusk. It puts the parents to sleep first, out of professional courtesy, and finishes the verse for the baby alone.",
    "inspiration": "A mythic that is a song, not a creature that sings: a piece of shared culture old enough to have grown a body, so syncing it means the oldest thing in the valley chooses to be hummed by you.",
    "visualPrompt": "A tiny drifting spirit shaped like a swaddled crescent moon crossed with a musical note, wrapped in a blanket of pale mist that trails faint silver notation behind it; eyes closed in a contented sleeping smile.",
    "learnset": [
      {
        "level": 1,
        "moveId": "lullanote"
      },
      {
        "level": 1,
        "moveId": "heartened-hum"
      },
      {
        "level": 6,
        "moveId": "tale-twirl"
      },
      {
        "level": 10,
        "moveId": "lullshade"
      },
      {
        "level": 14,
        "moveId": "plot-twist"
      },
      {
        "level": 18,
        "moveId": "dawnsip"
      },
      {
        "level": 22,
        "moveId": "grand-finale"
      }
    ]
  },
  "aurvela": {
    "id": "aurvela",
    "name": "Aurvela",
    "types": [
      "frost",
      "fable"
    ],
    "role": "titan",
    "stage": 1,
    "evolvesTo": null,
    "evolveLevel": null,
    "baseStats": {
      "hp": 200,
      "attack": 140,
      "defense": 170,
      "spirit": 130,
      "speed": 60
    },
    "syncRate": 0,
    "xpYield": 520,
    "dexEntry": "A mountain-sized elk of glacier ice and buried stone, frozen mid-stride an age ago while shouldering back an endless blizzard; the highland pass exists because it has never once moved. Each solstice the shepherds hang lanterns from its antler tips, and it has never once said it minds.",
    "inspiration": "A guardian whose heroism is stillness: the boss fight is the one time in an age it allows itself to move, which means winning is convincing it the valley is safe enough for it to rest.",
    "visualPrompt": "A colossal recumbent elk of deep blue glacier ice veined with dark stone, its back drifted into a snowfield and its vast antlers rising like frozen aurora curtains hung with tiny lanterns; slow-blinking calm eyes under heavy frost lashes.",
    "learnset": [
      {
        "level": 1,
        "moveId": "shardfall"
      },
      {
        "level": 1,
        "moveId": "whiteout-hymn"
      },
      {
        "level": 1,
        "moveId": "powderpounce"
      },
      {
        "level": 1,
        "moveId": "loamslam"
      },
      {
        "level": 1,
        "moveId": "burrowbrace"
      },
      {
        "level": 1,
        "moveId": "rimecall"
      }
    ]
  }
};
