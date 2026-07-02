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

*Gaiamon's world, roster, and systems were designed by a team of AI agents and
then verified adversarially against the genre's greats — which is how a sleeping
stone giant ended up hiding in plain sight as a waystone, and why not one
creature name is a pun you've heard before.*
