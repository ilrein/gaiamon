# Show HN — draft

## Title options (≤80 chars, factual)

1. `Show HN: Gaiamon – open-source monster-catching MMO where creatures are shaders`
2. `Show HN: A browser monster-catching game with raymarched SDF creatures`
3. `Show HN: Gaiamon – MIT-licensed creature-collecting RPG that loads as a link`

## Post body (~300 words, first person)

I've been building Gaiamon, an open-source (MIT) monster-collecting RPG that
runs entirely in the browser: https://gaiamon.com — no download, no account,
a link is a session. Progress saves locally; multiplayer presence is the
piece landing now.

The part I think HN will find interesting is the creature rendering
experiment. Instead of models, rigs, or sprite sheets, each creature is a
raymarched signed distance field — a small GLSL chunk defining a distance
function and an albedo function. Bodies are blended primitives (smin'd
ellipsoids and capsules; one creature's tail is 17 spheres on a logarithmic
spiral). Faces are painted as 2D masks in the albedo pass rather than
modeled, which is why they survive any deformation. Animation is two layers
of pure math driven by uniforms: an always-on idle layer (breathing, blinks
on beat frequencies) and "action verbs" (hop, attack, hit, faint, celebrate)
that deform the sample point with squash-and-stretch that conserves volume.
Syncing a creature over the network is just `(verb, startTime)`. Authoring
guide: design/PROCEDURAL-CREATURES.md in the repo.

Stack is deliberately boring: Three.js + Vite client, a Cloudflare Worker +
Hono API, Durable Objects for zones. The battle engine is a pure
deterministic function emitting an event stream, so the server-authoritative
port is a move, not a rewrite.

Full disclosure: this was built with heavy AI-agent orchestration — code,
creature art (disclosed in CREDITS.md), even adversarial review passes. The
repo history is the honest dev log of that process, warts included.

What's unfinished: the SDF renderer is a workshop page, not yet in battles
(next step is baking the SDF to a mesh at load so the same verb curves run
in a vertex shader). Balance is rough, audio is missing, and it's pre-alpha
in the truest sense. Feedback very welcome, especially on the SDF approach.
