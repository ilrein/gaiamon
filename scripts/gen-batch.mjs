#!/usr/bin/env node
// Batch art generation: reads a JSON manifest and generates images with
// bounded concurrency. Skips outputs that already exist (safe to re-run).
//
// Usage: bun scripts/gen-batch.mjs art/manifest.json [--concurrency 4] [--force]
// Manifest: [{ "prompt": "...", "out": "public/sprites/creatures/x.png",
//              "quality": "medium", "transparent": true, "raw": false, "size": "1024x1024" }]

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";

const HOUSE_STYLE =
  "Original creature design for a cute monster-collecting game. " +
  "Super cute, rounded shapes, big expressive eyes, chibi proportions. " +
  "Detailed pixel-art sprite with soft painterly lighting, HD-2D aesthetic. " +
  "Single creature, full body, 3/4 front view, centered. " +
  "Isolated on a fully transparent background: no ground, no shadow blob, no backdrop, no vignette — a clean sticker-style cutout of the creature only. " +
  "Must be an original design, not similar to any existing Pokemon. Subject: ";

const args = process.argv.slice(2);
const manifestPath = args.find((a) => !a.startsWith("--"));
const concurrency = Number(args[args.indexOf("--concurrency") + 1]) || 4;
const force = args.includes("--force");

if (!manifestPath || !process.env.OPENAI_API_KEY) {
  console.error("Usage: bun scripts/gen-batch.mjs <manifest.json> [--concurrency 4] [--force] (needs OPENAI_API_KEY)");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
let done = 0;
let skipped = 0;
let failed = 0;
let totalTokens = 0;

async function generate(item) {
  if (!force) {
    try {
      await access(item.out);
      skipped++;
      console.log(`skip (exists): ${item.out}`);
      return;
    } catch {
      /* not there — generate */
    }
  }
  // gpt-image-2 does not support transparent backgrounds; gpt-image-1 does.
  const transparent = item.transparent !== false;
  const body = {
    model: transparent ? "gpt-image-1" : "gpt-image-2",
    prompt: item.raw ? item.prompt : HOUSE_STYLE + item.prompt,
    size: item.size ?? "1024x1024",
    quality: item.quality ?? "medium",
    n: 1,
  };
  if (transparent) body.background = "transparent";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
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
        if (json.error.code === "rate_limit_exceeded" && attempt < 3) {
          await new Promise((r) => setTimeout(r, 15000 * attempt));
          continue;
        }
        throw new Error(json.error.message);
      }
      await mkdir(dirname(item.out), { recursive: true });
      await writeFile(item.out, Buffer.from(json.data[0].b64_json, "base64"));
      totalTokens += json.usage?.total_tokens ?? 0;
      done++;
      console.log(`ok (${done + skipped + failed}/${manifest.length}): ${item.out}`);
      return;
    } catch (err) {
      if (attempt === 3) {
        failed++;
        console.error(`FAIL: ${item.out} — ${err.message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

const queue = [...manifest];
await Promise.all(
  Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      await generate(queue.shift());
    }
  }),
);

console.log(`\nDone: ${done} generated, ${skipped} skipped, ${failed} failed.`);
console.log(`Tokens: ${totalTokens} (~$${((totalTokens * 40) / 1e6).toFixed(2)} if billed at output-token rate)`);
if (failed > 0) process.exit(1);
