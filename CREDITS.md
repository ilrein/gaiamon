# Credits

Gaiamon is built on open assets and AI-generated original art. Everything in
this repo is redistributable; this file documents where each piece came from.

## Third-party assets

| Asset | Creator | License | Source |
|---|---|---|---|
| Overworld NPC / trainer walk sprites (planned) | [Screen Smith](https://screensmith.itch.io/) | Creative Commons (see each pack page for the exact variant) | [Openmon NPC Sprites](https://screensmith.itch.io/), Pokemon Style Character packs |

> Before bundling any pack, verify the exact CC variant on its itch.io page and
> record it here. CC-BY requires this attribution to ship with the game.

## AI-generated art

Creature and environment art in `art/` is generated with OpenAI's
`gpt-image-2` via `scripts/gen-art.mjs`, then curated by hand. All designs are
original to Gaiamon. We disclose this openly — if you contribute art, note in
your PR whether it's hand-made or AI-assisted.

## Code

- [Three.js](https://threejs.org/) (MIT) — rendering
- [Hono](https://hono.dev/) (MIT) — worker API framework
