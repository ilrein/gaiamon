# Discussion: HD-2D Browser MMO — thinking out loud, want your input

We're noodling on building a persistent, browser-based monster-collecting MMO in the
HD-2D style — Pokémon-style gameplay loop, our own world and creatures. This is a
discussion, not a spec. We have leanings, not decisions. Pressure-test everything,
tell us where we're wrong, and propose paths we haven't considered. Treat the stack
choices below as open for debate — if you'd argue for something else, argue for it.

## The vibe we're going for
- A persistent online overworld: explore, catch/train original creatures, battle,
  trade, party up.
- Our own IP — original creatures, names, lore. Not literally Pokémon (partly taste,
  partly we don't want a legal target on our back). Open to hearing if that's overcautious.
- Art direction: HD-2D — 2D sprite characters/creatures in lit 3D environments
  (Octopath Traveler look). Tilted ortho-ish camera, depth of field, bloom, tilt-shift,
  dynamic day/night lighting. This part we feel strongly about; it'd be awesome.

## Where our heads are at on tech (all up for debate)

**Client / engine — leaning Three.js, but torn with Godot.**
We like Three.js because it's browser-native: instant load, no WASM engine bloat,
deploys as static assets, frictionless to share (which matters for an MMO — every
link is a player). HD-2D in Three.js seems doable (billboard sprites, ortho camera,
a postprocessing stack for DoF/bloom/tilt-shift), but we'd be assembling our own
tooling, physics, and animation glue.

Godot tempts us: its HD-2D tooling, 2D+3D hybrid, scene editor, and animation systems
are genuinely better out of the box, and there are proven HD-2D templates. The catch
is web export — heavier payload, threading/SharedArrayBuffer caveats, mobile friction —
which cuts against the browser-first thing we like. Question for you: is Godot's tooling
head-start worth giving up the clean web-native deploy? Or is there a hybrid we're missing?

**Backend — leaning Cloudflare-native (Durable Objects + Hono), but we looked hard at
SpacetimeDB.**
The Cloudflare idea: each zone/map instance = a Durable Object holding authoritative
live state in memory over WebSockets, persisting to DO storage; a Hono Worker for auth,
REST, accounts, and zone routing. Upside: stays entirely in one ecosystem, edge-cheap,
autoscaling, minimal ops. Downside: we hand-roll the netcode and sync layer ourselves.

SpacetimeDB really appealed to us — DB + game logic + real-time sync in one (reducers +
client subscriptions), MMO-proven (BitCraft), and it'd save us a ton of netcode. The
thing that gives us pause is that it's a stateful server we'd self-host, so it breaks
the "everything on Cloudflare" picture and adds ops + a framework to learn. We're not
ruling it out. Question: does SpacetimeDB save enough work to justify running a separate
stateful server, or do Durable Objects get us 80% of the way with less lock-in? Is there
a third option (Colyseus, custom Rust server on Fly, Partykit, etc.) that beats both?

## Scale — we're ambitious but trying to be honest
Dream is a true persistent MMO (hundreds–thousands concurrent, sharded world). We know
that's a lot of netcode and infra, so we'd want to architect toward it but prove a small
vertical slice first. Tell us if "true MMO on Durable Objects" is realistic or if we're
underestimating something (DO connection/CPU ceilings on a busy zone, cross-zone handoff,
interest management, etc.).

## Open-ended things we keep going back and forth on
- Netcode reality on Cloudflare WebSockets: achievable tick rate, snapshot interpolation
  vs deltas, client prediction + reconciliation. Is this a good substrate or a fight?
- Zone sharding: how big can one zone DO get before it falls over, and how do players
  cross boundaries seamlessly?
- Persistence: DO storage vs D1 vs KV for which data.
- HD-2D in Three.js specifically: sprite sorting against 3D geometry, the postFX
  pipeline, keeping load times tiny.
- Asset + content pipeline: how we'd author sprites, tilemaps, creature data — and
  whether we need a map/zone editor early.
- Anything we're not even asking that we should be.

## What we'd love from you
Not a build plan yet — a conversation. React to the leanings above, make the case for
or against Godot and SpacetimeDB given what we want, flag the biggest risks in the
Cloudflare/Three.js direction, and tell us what you'd do in our shoes and why. If a
vertical slice would clarify the hardest unknown, say what it should be.
