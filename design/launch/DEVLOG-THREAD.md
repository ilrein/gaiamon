# X/Twitter launch thread — draft

Rules applied: no invented metrics, no hype adjectives without a fact behind
them, every claim checkable in the repo. `[clip]` = attach the noted footage.

---

**1 / hook**
I built an open-source monster-catching MMO that runs in your browser.

No download. No ROMs. A link is a session.

And the creatures aren't 3D models. They're shaders.

gaiamon.com — thread on how it works:

[clip: 10s overworld → battle transition on a phone]

---

**2 / the problem**
Sprite sheets and rigged models are the expensive part of a creature game.
Every new monster means art, animation, and file size.

I wanted a pipeline where adding a creature is adding one small text file.

---

**3 / SDF creatures**
Each Gaiamon is a raymarched signed distance field: a GLSL function that
answers "how far is this point from the creature?"

Bodies are blended primitives. This tail is 17 spheres on a logarithmic
spiral, smoothly welded together.

[clip: proto-preview orbit of Fernby, then wireframe-of-thought overlay or the spiral in isolation]

---

**4 / painted faces**
The face isn't modeled — it's painted. Eyes, smile, blush are 2D masks in
the color pass, gated to the front surface.

Moving an eye is changing a number. And the face survives any deformation,
which matters for the next part.

[clip: face tracking through an attack squash]

---

**5 / animation is math**
No keyframes. Two layers of pure functions:

- idle: breathing, tail sway, blinks every ~4.7s
- verbs: hop / attack / hit / faint / celebrate — squash that conserves
  volume, anticipation before the lunge, damped-sine landings

Syncing a creature over the network is just (verb, startTime).

[clip: all five verbs back to back on Kindlet]

---

**6 / bake-to-mesh**
Raymarching every creature is fine for one hero shot, not for a battle
scene. The plan: at load, bake the same SDF to a mesh (marching cubes) with
animation weights in vertex attributes.

Same verb curves, now a cheap vertex shader. One draw call per creature.

---

**7 / shinies as seeds**
Because everything is procedural, rare variants don't need new art. A shiny
is a seed: shift the palette, perturb the noise, and the shader does the
rest. Every creature file becomes a family of creatures for free.

---

**8 / multiplayer presence**
The battle engine is a pure deterministic function that emits an event
stream — built that way from day one so the server-authoritative MMO port
is a move, not a rewrite. Zone presence via Cloudflare Durable Objects is
what's shipping now.

[clip: two browsers, two wardens, same meadow]

---

**9 / the repo is the dev log**
Built in the open, MIT licensed, with heavy AI-agent orchestration — and
I'm not hiding that. The commit history is the honest record: the bugs,
the adversarial review passes, the dead ends (RIP voxel creatures).

AI-generated art is disclosed in CREDITS.md. Contributions are welcome
either way, just label yours.

---

**10 / CTA**
Play it: gaiamon.com (pre-alpha — 40 species, 3 acts, works one-thumb on
your phone)

Read the creature authoring guide, or PR your own: [repo link]

If a monster-catching game that's just a link sounds good, a repost helps
more than you'd think.
