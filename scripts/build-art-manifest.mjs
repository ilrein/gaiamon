#!/usr/bin/env node
// Builds art/manifest.json from design/design.json: one transparent sprite per
// species (+ a few extras). Feed the result to scripts/gen-batch.mjs.

import { readFile, writeFile, mkdir } from "node:fs/promises";

const design = JSON.parse(await readFile("design/design.json", "utf8"));
const expansion = JSON.parse(await readFile("design/expansion-1.json", "utf8"));
// Titan patch mirror (see build-data.mjs).
for (const s of expansion.roster.species) {
  if (s.id === "rimegarde") {
    s.id = "aurvela";
    s.name = "Aurvela";
    s.visualPrompt =
      "A vast, serene polar guardian beast of frost and dream: translucent glacier-fur rippling with slow aurora colors (teal, violet, rose), a crown of dark ice crystals, closed sleepy eyes leaking soft light, sitting curled like a mountain that is also a lullaby.";
  }
}
design.roster.species = [...design.roster.species, ...expansion.roster.species];
const renameMap = new Map((design.renames?.renames ?? []).map((r) => [r.from, r.to]));

const TYPE_MOOD = {
  verdant: "leafy greens and warm cream",
  ember: "warm oranges, soft charcoal and candle-glow",
  tide: "aqua blues and seafoam",
  zephyr: "mint, white and sky pastels",
  terra: "warm browns and moss",
  volt: "sunny yellows with spark accents",
  frost: "icy blues and white",
  umbral: "soft purples and dusk tones",
  lumen: "cream, gold and gentle glow",
  fable: "rose, lilac and storybook pastels",
  neutral: "soft warm neutrals",
};

const manifest = [];
for (const s of design.roster.species) {
  const name = renameMap.get(s.name) ?? s.name;
  const mood = TYPE_MOOD[s.types[0]] ?? TYPE_MOOD.neutral;
  const titanNote = s.role === "titan" ? " Imposing and ancient but still charming, moss and stone details." : "";
  manifest.push({
    prompt: `${s.visualPrompt} Palette of ${mood}.${titanNote} (Creature name: "${name}")`,
    out: `public/sprites/creatures/${s.id}.png`,
    quality: "medium",
    transparent: true,
  });
}

// Extras: the player warden sprite and a social share image.
manifest.push({
  prompt:
    "A cute chibi human adventurer seen from behind at a 3/4 angle, rounded pixel-art style, " +
    "wearing a moss-green traveling cloak and a small satchel, holding a small glowing teal handheld device (an ancient-tech field terminal), " +
    "short fluffy hair, full body, standing. HD-2D pixel sprite, soft painterly lighting.",
  out: "public/sprites/warden.png",
  quality: "medium",
  transparent: true,
  raw: true,
});
manifest.push({
  prompt:
    "Key art for 'Gaiamon', a cute monster-collecting game: a small chibi adventurer in a moss-green cloak stands in a sunlit meadow " +
    "holding up a glowing teal handheld terminal, surrounded by three tiny adorable original creatures (a leafy fox-sprout, a candle-flame imp, a water droplet puppy), " +
    "HD-2D style: pixel-art characters in a softly lit painterly 3D diorama, tilt-shift depth of field, warm golden-hour light, big readable silhouettes, no text.",
  out: "public/og-image.png",
  quality: "high",
  transparent: false,
  raw: true,
  size: "1536x1024",
});

await mkdir("art", { recursive: true });
await writeFile("art/manifest.json", JSON.stringify(manifest, null, 2));
console.log(`Manifest: ${manifest.length} images`);
