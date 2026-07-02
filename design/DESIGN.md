# Gaiamon — Design Bible

*Sync with the wild. Wake the sleeping world.*

Gaiamon is a small, cozy monster-collecting RPG built for one thumb and a short
sitting. It is a love letter to the genre that raised us, assembled entirely
from **"the best of things that never happened"** — creatures, moves, and
systems that feel like they *should* have shipped, but never did.

---

## Premise & Tone

The world of **Gaia** is alive. Every meadow, tide, and ember is quietly
dreaming, and **Gaiamon** are those dreams given small, walking shapes.

You are a **Warden**. You carry a **Codex** — an ancient-tech field terminal
left behind by the first mapmakers, built to listen to the land. Syncing is not
capture; it is a promise to walk together. Wherever a Warden and their Gaiamon
travel, the old waystones hum a little brighter and the land wakes a little
happier.

**Tone:** warm, wry, small-scale sincere. The world is kind, the stakes are
personal, and wonder comes from *noticing*, not from apocalypse. Humor is gentle
and character-driven — creatures with opinions, fond teasing, understatement.
Never saccharine: sweetness is earned with specificity (name the rock, the smell
of rain, the exact wrong noise the Ember starter makes when it sneezes). Lines
are mobile-first: one thought each, under ~90 characters, no walls of text.

---

## The Codex & Syncing

Wild Gaiamon aren't caught in a thrown object — they are **Synced**: the Codex
projects a resonance glyph, three rune-rings lock inward, and a willing (or
worn-out) creature agrees to join you.

**Sync chance** is computed live and shown on the glyph, rounded to 5%, before
you commit:

```
syncChance = clamp( speciesSyncRate * (1 - 0.7 * hpFraction) * statusBonus, 0.01, 0.95 )
```

- **speciesSyncRate** — per species: common ~0.55, uncommon ~0.40, rare ~0.25.
- **hpFraction** — lower HP, better odds. Weakening always matters.
- **statusBonus** — none 1.0, damage-over-time 1.25, action-impairing 1.5,
  incapacitating 2.0. Only the strongest active status counts; no stacking.

A full-HP rare sits near 12% — never hopeless — while a Dozing, near-fainted foe
can climb to 70%+. The single success roll is resolved once; the ring animation
is pure showmanship (1 ring = barely missed, 3 = success), so it says *"so
close!"* without ever lying about the odds. Syncing costs your turn, and it's
disabled against Trial constructs, the Keeper, and the Titan.

---

## Type Chart

Eleven types. Attack matchups (attacker → defender), everything else is 1×:

| Type | Strong vs (2×) | Weak vs (0.5×) | No effect (0×) |
|------|----------------|----------------|----------------|
| Verdant | Tide, Terra | Ember, Zephyr | — |
| Ember | Verdant, Frost | Tide, Terra | — |
| Tide | Ember, Terra | Verdant, Frost | — |
| Zephyr | Verdant, Fable | Terra, Volt | — |
| Terra | Volt, Ember, Frost | Zephyr | — |
| Volt | Tide, Zephyr | Verdant | Terra |
| Frost | Verdant, Zephyr, Terra | Ember, Tide | — |
| Lumen | Umbral | Fable | — |
| Umbral | Lumen, Fable | — | — |
| Fable | Umbral | Lumen | — |
| Neutral | — | — | — |

**Affinity** (same-type bonus) is a gentle **1.25×**, not the classic 1.5×, so
off-type coverage moves stay worth teaching. Damage uses a standard level/power
curve with a per-hit **1/16 crit** (1.5×, ignores unfavorable stat stages) and
an 85–100% variance roll.

---

## Statuses

Five named conditions, each tied to a flavor type. **v1 engine notes** flag
where the shipping engine simplifies the full design:

| Status | Effect | v1 note |
|--------|--------|---------|
| **Smolder** | 6% HP/turn, attack ×0.75 | as designed |
| **Drowse** | can't act; 50% wake each turn | approximated as skip + 50% wake (no guaranteed 4th-turn wake, no hit-to-wake) |
| **Rimebound** | speed ×0.5 | designed **+1 stamina cost per move is not in v1** |
| **Tangleroot** | HP drain | flat **8%/turn** in v1 (designed as escalating 4→8→12%) |
| **Storydaze** | may act out the wrong story | modeled as a **33% skip** (designed as a self-hit) |

Type immunities to status (e.g. Tide can't Smolder) are **deferred to v2**; v1
applies statuses regardless of the target's type.

---

## Stamina

No move-PP counting. Instead every Gaiamon has a **10-pip stamina bar**.

- Costs by power tier: status & ≤40 power → 2, 41–70 → 3, 71–95 → 4, ≥96 → 5.
- Regen: **+2 pips** at the start of that Gaiamon's turn (cap 10).
- A free fourth action, **Attune**, skips the turn and restores 6 pips (with a
  cute Codex-hum). If nothing is affordable, the UI suggests it.

The result is a fast, readable rhythm: spend big, breathe, spend again — legible
as pip-dots on each move button, one thumb, no menus.

---

## The 16 Gaiamon

Each creature exists to make a single "never happened" idea real.

### Starters

- **Fernby → Frondelle → Arbrella** *(Verdant; Verdant/Terra)* — a chinchilla
  sprout whose fern tail literally unfurls with its courage. Its power fantasy
  is *protection*: the final form is a walking shelter-tree, and wild Gaiamon
  gather under its canopy when storms roll in.
- **Kindlet → Scampyre → Embermine** *(Ember; Ember/Umbral)* — a fire ferret
  built on *generosity*, forever trying to gift warm coals to friends who can't
  hold them. Its desynced shadow slowly comes alive across evolutions until, as
  Embermine, the living smoke-shadow hunts beside it as an inseparable duet.
- **Puddlop → Lagoonet → Abyssong** *(Tide; Tide/Lumen)* — an octopod that
  balances its own puddle on its head like a hat. That puddle deepens from
  puddle to lagoon to a *bottomless well of starlit brine* — the abyss
  reimagined as a lighthouse, where the light and the music are kept safe.

### Wild companions

- **Dandelamb → Thistleram** *(Verdant/Zephyr)* — a lamb of dandelion seed-fluff
  whose panic response is *literal dispersal*: it scatters on the wind and
  regrows overnight, planting the meadow it lives on. Its evolution is the thing
  the wind gets out of the way for.
- **Pottle** *(Terra/Verdant)* — a shy clay hermit that wears abandoned
  flowerpots as armor. Townsfolk leave cracked pots on windowsills for it, so
  its habitat is, quite literally, other people's kindness.
- **Zizzle** *(Volt)* — an electric type born from *domestic static*, not
  storms: the spark off a doorknob, given a face and a habit of hoarding lost
  buttons and single earrings, which it returns sorted by how much it misses you.
- **Nibbin** *(Neutral)* — the mandatory route-1 rodent, reimagined as a tiny
  merchant of worthless treasures who trades a pebble for any song and always
  overpays, and always looks like it knows.
- **Fablefray** *(Fable/Umbral)* — a rare spirit stitched from the torn pages of
  unfinished storybooks, searching for how its own tale ends. Not haunted by
  death — haunted by *lack of an ending*. You Sync it by, in effect, promising
  to finish its story.

### The Titan

- **Cairnoss** *(Terra/Lumen)* — the oldest "waystone" at the trial site was
  never a waystone at all, but a colossus that knelt to rest an age ago and let
  travelers carve runes into its back. The landmark-as-boss: players use it as
  scenery for hours before the Trial reveals the furniture is the guardian.

---

## A Tour of Elowen Vale

Four connected areas, climbing from the village up to the ancient Rise.

1. **Hearthglow Village** — a ring of round-roofed cottages around a stone hearth
   that has never gone out (legend says a Titan lit it as an apology). Home of the
   **Archivists' Annex**, where every new Warden receives their Codex. No wild
   encounters; rest at Posy's inn. *Mentor: Archivist Maru.*
2. **Petalway Meadow** — sun-warmed grass split by a dirt path lined with
   drifting seed-fluff that never lands. Tall grass rustles with young wild ones
   who treat ambushing travelers as a beloved sport. *(Dandelamb, Pottle, Zizzle;
   Lv 2–4.)*
3. **Gloamlight Caverns** — a soft-dark route where luminous teal mushrooms grow
   in tall-grass-like patches and crystals chime under moth-wings. Umbral and
   Lumen Gaiamon share the caves in a truce enforced mostly by mutual
   embarrassment. *(Nibbin, Pottle, Zizzle, rare Fablefray; Lv 5–8.)*
4. **Waystone Rise** — a windswept lavender-stone plateau crowned by the great
   Waystone. Golden braziers ring the trial; beyond a crumbling arch lies the
   Titan Arena. *(Thistleram, Nibbin, rare Fablefray; Lv 9–12.)*

---

## Trial, Keeper & Titan

**The Trial of Echoes.** The Waystone animates stone constructs of local species
and remembers every battle fought at its foot. Three back-to-back 1v1 duels — no
items, no fleeing, no syncing — with the Waystone restoring 50% of your party's
HP between rounds (but *not* clearing status; managing conditions across the
gauntlet is the point). The designed centerpiece gimmick is **Echo Drafting**:
after each win you may accept an *Echo* of the construct you just beat as a
temporary 7th party member — but every remaining construct gains +2 levels per
Echo taken. You draft the enemy's team against a scaling gauntlet. Clearing it
earns **Waystone Mark I** and opens the arena gate. *(v1 ships the gauntlet; Echo
Drafting is a v2 wishlist item — see below.)*

**Keeper Solenne**, of the Stillwater Sanctum, is a barefoot cartographer who
maps the marsh by ear — she listens to water, hums while she battles, and
narrates the fight like field notes. A **Tide** specialist: Nibbin (Lv 12),
Thistleram (Lv 13), and her ace Lagoonet (Lv 15). Beat her for the Stillwater
Sigil.

**Cairnoss, the Waking Waystone.** Completing the Trial wakes the guardian —
the arena floor *is* its back. Terra/Lumen, arena-sized, moving slow and heavy
with warm rune-light in its cracks. It is **not capturable** (the Codex reads
*RESONANCE TOO VAST*; SYNC becomes STUDY). It fights in phases: a drowsing
opening with a telegraphed **Stonehum** charge you can dodge by switching, then
a **WOKEN** turn at 50% HP where it kneels, drops its guard, and hits far harder.
Cute-first: ancient and sleepy, annoyed at being woken — never menacing.

---

## v2 Wishlist

Designed in full, simplified or deferred for the v1 engine:

- **Echo Drafting** in the Trial (temporary drafted party slots + a scaling
  gauntlet).
- **Titan sub-mechanics**: destructible Glyph Shards, the resonance-attunement
  chip damage that rewards packing both of the Titan's types, and the Dawnshear
  telegraph loop.
- **Status fidelity**: Drowse's guaranteed 4th-turn wake and hit-to-wake,
  Rimebound's +1 stamina tax, Tangleroot's escalating drain, Storydaze's
  typeless self-hit, and type-based status immunities.
- **Rimebound's stamina tax** and other stamina interactions with status.
- **Sanctum Link** storage, Waystone Sigil fast-travel, and the full Ledger
  lore-archive.

---

## Act 2 — the Mistmere Coast

Past the Waystone Rise, the road bends down to the water. Act 2 climbs from a
misty lakeshore, through a harbor town and a forest where dusk never leaves, up
to a frozen summit — and the whole time the aurora overhead is watching back.

### The twelve new Gaiamon

- **Hushpup → Mistcalf → Fathomoo** *(Tide; Tide; Tide/Zephyr)* — a lake-seal pup
  whose bark comes out as a tiny foghorn. Its line is built on *sound as safety*:
  Mistcalf ferries lost rowboats home for applause, and Fathomoo's endless low
  MOO *is* the coast's mist, exhaled. (Fathomoo is evolution-only — the "big one"
  is never a wild slot.) *Inspiration: a water line where the weapon is a voice
  that keeps people from being lost.*
- **Snugget → Duvetusk** *(Frost)* — a round snow-vole that hoards sunbeams in its
  cheeks and gifts its last one to shivering travelers; Duvetusk is a walrus-yak
  whose quilted coat is a living duvet, built to be *slept on*. *Inspiration: a
  frost line whose treasure is heat and whose defense stat is hospitality.*
- **Dimmet → Gloamane** *(Umbral)* — a dusk-fox kit that tucks sleeping creatures
  in on its nightly rounds; Gloamane's mane is a fold of actual night sky, so
  evening arrives wherever it walks. *Inspiration: Umbral reimagined as care
  work — the dark type does the bedtime rounds.*
- **Rumblit** *(Volt)* — a pond frog that swallows thunderclaps and burps them
  back weeks later at the worst moment. Keeper Voss's stormlight ace. *Inspiration:
  an electric type that stores sound, not charge — thunder as a perishable snack.*
- **Waylume** *(Lumen)* — a sprite of road-light that stands very straight at
  forks, pretending to be a waymarker so travelers pick the way home. *Inspiration:
  a light type descended from the first mapmakers' surveying lanterns.*
- **Kipkite** *(Zephyr)* — a paper kite the wind loved so much it woke up, still
  looking for the hand that let its string go. *Inspiration: a wind type made
  from a toy, animated by being played with.*
- **Hummabye** *(Fable, rare)* — the region's oldest lullaby, escaped from every
  cradle that ever hummed it, now drifting where the mist meets the lake at dusk.
  The act-long Fable rumor made flesh; the rare encounter in all three routes.
- **Aurvela** *(Frost/Fable, Titan)* — see below.

### The four new areas

1. **Mistmere Shallows** *(40×24, misty-lakeshore)* — zigzag boardwalks over still
   silver water, reed-grass banks taller than most Wardens. *(Hushpup, Mistcalf,
   Rumblit, rare Hummabye; Lv 8–12.)* Warden **Quill** fishes here with a battle
   rod. West to Gloamlight Caverns, east to Saltwhistle.
2. **Saltwhistle Harbor** *(36×26, coastal town, no encounters)* — a crescent of
   shingled houses around a working harbor named for the note the wind plays
   through its sea-arch. Chowder heals at the inn; the **Stormglass Sanctum** on
   the lighthouse point is Keeper Voss's hall.
3. **Murmurwood** *(38×26, dusk-mushroom forest)* — watchtower-sized mushrooms
   under a canopy the sun only rumors through, grass mazes the Umbral ones re-grow
   nightly. *(Dimmet, Gloamane, Waylume, rare Hummabye; Lv 12–16.)* Warden
   **Teasel**, the Mushroom-Cap Knight, guards the maze.
4. **Rimeveil Summit** *(36×28, frost highland)* — wind-carved snowfields where
   crystal outcrops ring as the aurora moves. *(Snugget, Duvetusk, Kipkite, rare
   Hummabye; Lv 16–20.)* Warden **Halla** the postwoman holds the last switchback;
   Yule's hut and a mini-waystone heal the party. A steep connector drops east to
   Waystone Rise.

### Keeper Voss & the Chimegate

**Keeper Meridee Voss** of the Stormglass Sanctum is a retired fish-market
auctioneer who calls every battle like a live lot — opening bids, going-once, a
brass bell (a chowder-stall spoon) for every Keen Hit. Her beacon runs entirely
on her ace Rumblit's stormlight. Party: Mistcalf (Lv 15), Dimmet (Lv 16), ace
Rumblit (Lv 18). Beat her for the **Stormglass Sigil**.

At the summit's crown stands the **Chimegate** — a dark-ice arch with three empty
crystal sockets and a resonance slot. Each road Warden (Quill, Teasel, Halla)
carries a **Chimeshard** ringing one note of a chord; socketing all three *and*
presenting Voss's Stormglass Sigil makes the gate ring the full chord and melt
open. Everything is earnable within Act 2 — three route battles and the Sanctum —
and Fenwick the crystal-tuner explains the chord the moment you arrive.

### Aurvela, the Dreaming Aurora

The coast has always believed the aurora is weather. It is not: it is the leaking
dream of a colossal **Frost/Fable** moth-titan curled beneath the summit snow, her
wings folded so long ago that the windless Hushbowl arena *is* them. The crystals
ring because she breathes; the "summit bells" the townsfolk hear are her sleeping
heartbeat. Where Cairnoss was furniture-as-boss, **Aurvela is weather-as-boss** —
the sky the player admired all act was the encounter. Enormous, soft, moth-fuzzy
and unbearably sleepy, she fights like someone whose beautiful dream you just
stepped on. She is **not syncable** (the Codex reads *RESONANCE TOO VAST*; SYNC
becomes STUDY, stamping "The Dream Above the Snow" into the Ledger). She wakes in
phases: a **Veiled** opening, then at 50% HP she unfolds — **Aurora-Woken** —
wings up, spirit and speed surging, the aurora flooding down into the bowl.

## Act 3 — the Emberfall Caldera

East of Waystone Rise the road turns warm underfoot and climbs into a dormant
volcano. Act 3 runs from soft ash-fern fields, up through a forge-town built in
the crater, along a canyon of living glass, to a dusk-dark summit rim — and the
whole time the ground keeps a slow, steady heartbeat nobody will explain.

### The twelve new Gaiamon

*(Final display names; wild slots follow the badlands→canyon→rim level bands.)*

- **Clinkerbun → Kilnamble → Ashenvoy** *(Ember; Ember/Terra; Ember/Terra)* — a
  soot-beetle that gardens the wasteland: it rolls a warm coal to plant ash-ferns,
  grows into a two-terrace kiln-barrow, and finally into a wagon-sized rolling
  kiln-garden that runs a bloom-to-bloom bus route. (Ashenvoy is evolution-only —
  never a wild slot; she is Keeper Vesta's ace, "Bellows.") *Fire-type-as-farmer:
  controlled burn reimagined as gardening.*
- **Shellumen → Cathedrail** *(Lumen)* — a canyon snail whose shell holds one pane
  of true stained glass, leaving a trail of light for anyone who needs it; grown
  up, its shell is a full rose window and pilgrims build shrines where it naps.
  *Architecture as an animal.*
- **Burrowatt → Steamarmot** *(Volt/Terra)* — a marmot that plugs geyser vents with
  its rump, charges static from the pressure, and gets launched skyward; its
  evolution runs the whole vent-field like a rail timetable. *An electric type
  charged by geology instead of weather.*
- **Fossette** *(Terra)* — an ammonite that woke halfway through fossilizing and
  decided to just keep growing. *Deep time as a personality trait.*
- **Canyodel** *(Neutral)* — a jerboa that sings duets with its own echo and leaves
  a polite pause for the gorge wall that collapsed years ago. *A creature whose
  best friend is acoustics.*
- **Thermalark** *(Zephyr/Ember)* — a lark that surfs geyser thermals and whose dawn
  song warms the morning air; it plummets on the high notes and calls it style.
- **Eventideer** *(Umbral/Lumen, rare)* — the exact moment day becomes night, given
  hooves; the rare twilight encounter in all three Act 3 routes.
- **Caldessa** *(Ember/Terra, Titan)* — see below.

### The four new areas

1. **Ashfern Downs** *(40×26, warm-ash-badlands)* — chest-high silver ash-ferns and
   glassy cooled-lava paths; the Cinder Road carries the heaviest encounter rate.
   *(Clinkerbun, Kilnamble, Fossette; Eventideer rare.)* Warden **Peat** rakes the
   ash into battle-gardens here — the Cindertithe's first brazier.
2. **Kilnhollow** *(36×26, caldera-forge-town)* — a forge-town terraced down a
   crater's inner slope, every hammer set to one shared heartbeat. No wild
   encounters. Home of **Tilde's Cinderspring Inn** (a hot-springs full heal) and
   the third Sanctum, the Kilnheart, where **Keeper Vesta** forges your sigil
   *during* the battle.
3. **Prismglass Canyon** *(38×26, lumen-glass-canyon)* — walls of natural glass keep
   it golden hour all day; prism pools split light into wandering rainbows and
   Wardens are warned not to Sync mid-refraction. *(Shellumen, Cathedrail,
   Canyodel; Eventideer rare.)* Warden **Gilda** paints only what fights back —
   the second brazier.
4. **Obsidian Crown** *(34×26, volcanic-dusk-summit)* — the caldera's true rim of
   ridged black glass, dusk pooling violet in the rocks. *(Burrowatt, Steamarmot,
   Thermalark; Eventideer rare.)* A mini-waystone rest circle beside Norrick's tea
   hut; Warden **Tallow** keeps firewatch on the last switchback — the third
   brazier. A one-way **Aurora Traverse** drops back west to Rimeveil Summit.

### Keeper Vesta & the Cindertithe

**Vesta Kilbride**, Keeper of the Kilnheart Sanctum, is an Ember specialist and a
master smith: a portable anvil rings beside the field, one blow per exchange, and
your Kilnheart Sigil is finished on the exact strike that ends the fight — win or
lose. Her ace is **Ashenvoy**, nicknamed Bellows.

The Slag Gate atop the Crown is **The Cindertithe**: a slag-sealed forge door that
opens only for *warmth freely given, never taken*. Three cold braziers line Act 3's
road — Peat's, Gilda's, Tallow's — and each Warden lights theirs only on defeat,
"a battle worth its warmth." With all three burning and Vesta's Kilnheart Sigil
struck in the gate's slot, the door remembers it was always a hearth and melts
itself open — and far below, Hearthglow's eternal hearth flares in answer.

### Caldessa, the Banked Hearth

Kilnhollow believes it built its forges over a lucky lava tube. It did not: the
dormant crater *is* a colossal **Ember/Terra** kiln-tortoise, dozing shell-up for
an age. The terraces are her shell-rings, the hot spring is her bathwater kept
politely bath-warm, and the heartbeat every smith hammers to is hers. Long ago her
one bad sneeze made the Ashfern Downs; the never-dying hearth in Hearthglow was her
apology, carried down the mountain one ember at a time. Where Cairnoss was
furniture-as-boss and Aurvela weather-as-boss, **Caldessa is hearth-as-boss** — the
town's whole livelihood turns out to be one creature's banked kindness. She is
**not syncable** (*RESONANCE TOO VAST*; STUDY stamps "The Heart Beneath the Hearth"
into the Ledger). She fights in phases: **Banked**, fighting on the bellows rhythm
the smiths taught you, then at 50% HP she finally stands — **Stoked** — the crater
rim revealed as her shell rim, attack and speed surging as her banked shell drops
its guard.

---

*Gaiamon's world, roster, and systems were designed by a team of AI agents and
then verified adversarially against the genre's greats — which is how a sleeping
stone giant ended up hiding in plain sight as a waystone, a whole act's aurora
turned out to be a sleeping moth, and why not one creature name is a pun you've
heard before.*
