#!/usr/bin/env node
// Gaiamon art pipeline: generate creature/prop art with gpt-image-2.
//
// Usage:
//   pnpm gen-art "a round mossy turtle with a mushroom cap" art/creatures/shroomshell.png
//   pnpm gen-art --raw "full scene, no style prefix" art/misc/thing.png
//
// Flags:
//   --quality low|medium|high   (default: medium)
//   --size 1024x1024|1536x1024|1024x1536  (default: 1024x1024)
//   --opaque                    keep the background (default: transparent)
//   --raw                       skip the house-style prompt prefix
//
// Requires OPENAI_API_KEY in .env (gitignored). Run via `pnpm gen-art`,
// which loads .env automatically.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// Every asset goes through the same style prefix so the roster reads as one
// game. Tweak deliberately — changing this shifts the whole aesthetic.
const HOUSE_STYLE =
  "Original creature design for a cute monster-collecting game. " +
  "Super cute, rounded shapes, big expressive eyes, chibi proportions. " +
  "Detailed pixel-art sprite with soft painterly lighting, HD-2D aesthetic. " +
  "Single creature, full body, 3/4 front view, centered. " +
  "Must be an original design, not similar to any existing Pokemon. Subject: ";

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--opaque" || args[i] === "--raw") flags.set(args[i], true);
  else if (args[i].startsWith("--")) flags.set(args[i], args[++i]);
  else positional.push(args[i]);
}

const [subject, outPath] = positional;
if (!subject || !outPath) {
  console.error('Usage: pnpm gen-art "<subject>" <output.png> [--quality medium] [--opaque] [--raw]');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const body = {
  model: "gpt-image-2",
  prompt: flags.get("--raw") ? subject : HOUSE_STYLE + subject,
  size: flags.get("--size") ?? "1024x1024",
  quality: flags.get("--quality") ?? "medium",
  n: 1,
};
if (!flags.get("--opaque")) body.background = "transparent";

console.log(`Generating (${body.quality}, ${body.size}${body.background ? ", transparent" : ""})…`);
const res = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const json = await res.json();
if (json.error) {
  console.error("API error:", json.error.message);
  process.exit(1);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, Buffer.from(json.data[0].b64_json, "base64"));

const u = json.usage;
console.log(`Saved ${outPath}`);
console.log(`Tokens: ${u.total_tokens} (${u.output_tokens} image out) — roughly $${((u.output_tokens * 40) / 1e6).toFixed(3)} if billed`);
