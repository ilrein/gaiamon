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
  }
};
