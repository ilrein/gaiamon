# Authoring Procedural Creatures

How to build a Gaiamon as a **raymarched signed distance field** — geometry,
surface, face, and animation all procedural, no model files, no rig, no
textures. Fernby is the reference implementation:
[`src/client/proto-preview.ts`](../src/client/proto-preview.ts), viewable at
`/proto-preview.html`.

## Try it

```bash
docker compose up -d        # dev server on :5273 (or: bun run dev → :5173)
open http://localhost:5273/proto-preview.html
bun scripts/proto-shot.mjs  # headless screenshots → /tmp/proto-fernby-*.png
```

URL params: `?angle=hero|front|side|back`, `?spin=0`, `?t=2.2` (freeze time),
`?action=hit&at=0.1` (freeze a verb mid-pose), `?px=2` (render scale, default
1), `?fps=60` (default 30).

## Anatomy of a creature

Everything lives in one fragment shader. A creature is a `mapCreature(p)`
function: it returns the distance from point `p` to the creature's surface,
plus a material id.

**Coordinate space.** Feet on the ground plane `y=0`, facing `+z`, roughly
1.3 units tall. The camera rigs and the ground/sky shading assume this.

**Build the body from blended primitives.** The toolkit is small and it's
enough: `sdEllipsoid`, `sdCapsule`, spheres via `length(p-c)-r`, and
polynomial `smin(a, b, k)` to weld them. `k` is the fillet radius — `0.16`
melts a head into a body seamlessly, `0.04` keeps a tail visually distinct.
Mirror limbs with `abs(p.x)` instead of authoring both sides. Chains of
spheres along a curve make organic shapes cheaply — fernby's fiddlehead tail
is 17 spheres on a logarithmic spiral (`R = R0 * pow(0.905, i)`), smin'd
together.

**Materials by nearest part.** Track a material id alongside the distance
(`if (dPart < d) m = PART_ID`). Keep the palette identical to the species'
voxel palette (`src/data/voxels/*.ts`) so the two renderers agree.

**Moss/fur.** Two cheap tricks, both gated for perf: a small fbm displacement
on the distance (`d += (fbm(p*20)-0.5)*0.007`, only when `d < 0.08`) roughens
the silhouette; an fbm-perturbed normal in shading fakes plush micro-detail.
Skip both for scaly/glossy species.

**Face is painted, not modeled.** Eyes, nose, smile, blush, belly patch are
2D masks in `albedo()` — ellipse distances over the creature's local `x/y`,
gated by `p.z > …` so they only appear on the front surface. This is why the
face survives any deformation (see below) and why authoring is fast: moving
an eye is changing a number, not resculpting.

## Animation

Two layers, both driven purely by uniforms — this is the architecture the
game will use, because syncing a creature over the network is just
`(verb, startTime)`.

**Layer 1 — idle (always on).** Gentle curves added directly into the part
positions inside `mapCreature`: breathing scales the body radii
(`1 + 0.01*sin(t*2.2)`), the tail sways, ears twitch on beat frequencies
(`sin(t*0.9)*sin(t*2.7)` reads as "occasional"), eyes blink every ~4.7 s via
a mask squash in `albedo()`. Give each creature instance a phase offset so
groups don't move in sync.

**Layer 2 — action verbs.** `uAction` selects `hop | attack | hit | faint |
celebrate`; `uActionT` is seconds since the verb started. `actionTransform()`
turns those into a squash factor, offsets, lean, and spin, then deforms the
*sample point* (the inverse of deforming the creature). Rules that keep verbs
feeling right:

- **Squash conserves volume**: `p.y /= s; p.xz *= sqrt(s)`.
- **Anticipation before action**: attack crouches back before the lunge.
- **Follow-through after**: hop lands in a squash that rings out with a
  damped sine; hit is a knockback impulse plus `cos(a*24)*exp(-a*5)` jelly
  wobble and a white flash in shading.
- **Verbs end at identity** (`a = 1` → no deformation) so gameplay never has
  to clean up — except `faint`, which holds its slump until another verb
  replaces it.

**The two correctness rules** (both were real bugs during development):

1. **Paint in undeformed space.** Shading must run the surface hit point
   through the same `actionTransform` before calling `albedo()`, or the face
   slides off the body mid-verb.
2. **Scale distances under squash.** Non-uniform scale breaks SDF distance
   guarantees; multiply the returned distance by `min(s, inversesqrt(s))` or
   the marcher overshoots and the silhouette tears.

## Performance rules

- **Bounding sphere first.** `mapCreature` early-outs with a cheap sphere
  distance for far samples. It must contain the creature under *every*
  deformation (faint's xz bulge is the widest). Without this, a held squash
  slows every ray on screen — sky pixels included.
- Default render scale is 1× (never devicePixelRatio) and 30 fps; the page
  stops rendering entirely when time is frozen and skips frames when hidden.
- Budget: ~110 march steps, 32 shadow steps, 5 AO taps. Plenty on a real
  GPU at creature scale; do not add octaves/steps without measuring
  (`scripts/proto-shot.mjs` + the fps probe pattern from the PR history).

## Authoring a new species — checklist

1. Copy the fernby SDF block; keep the shell (camera, lighting, ground, verb
   system) untouched.
2. Block the silhouette from primitives: body mass first, then the one
   signature feature (fernby = fiddlehead; kindlet = flame?) — the thing that
   reads at 100 px.
3. Palette from the species' voxel file; material ids by nearest part.
4. Paint the face; check `front` and `hero` angles after every change
   (`bun scripts/proto-shot.mjs`).
5. Tune idle amplitudes — creatures should feel *alive*, not *busy*.
6. Verify all five verbs at extreme poses
   (`?action=faint&at=1.2`, `?action=hop&at=0.4`) — check the face tracks
   and nothing clips the bounding sphere.

## Where this is going

The raymarched page is the **authoring workshop and hero renderer**. For
battle/overworld at scale, the plan is to **bake the same SDF to a mesh** at
load (marching cubes), with animation weights (height, part id) baked into
vertex attributes so the same verb curves run in a cheap vertex shader —
one draw call per creature, works with shadow maps and the HD-2D postFX.
The verb API (`uAction`, `uActionT`) stays identical, so `battle.ts` wiring
is renderer-agnostic.
