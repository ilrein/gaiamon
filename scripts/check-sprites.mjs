#!/usr/bin/env node
// Finds generated sprites whose background isn't actually transparent
// (the image model sometimes paints a backdrop anyway) and emits a
// regeneration manifest for them.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const manifest = JSON.parse(await readFile("art/manifest.json", "utf8"));
const bad = [];

for (const item of manifest) {
  if (item.transparent === false) continue;
  try {
    const { stdout } = await run("python3", [
      "-c",
      `
from PIL import Image
im = Image.open("${item.out}")
if im.mode != "RGBA":
    print(0.0)
else:
    a = im.getchannel("A").getdata()
    print(sum(1 for p in a if p < 10) / len(a))
`,
    ]);
    const frac = parseFloat(stdout.trim());
    if (frac < 0.35) {
      console.log(`REGEN (${(frac * 100).toFixed(0)}% transparent): ${item.out}`);
      bad.push(item);
    } else {
      console.log(`ok    (${(frac * 100).toFixed(0)}% transparent): ${item.out}`);
    }
  } catch {
    console.log(`MISSING: ${item.out}`);
    bad.push(item);
  }
}

if (bad.length > 0) {
  await writeFile("art/regen-manifest.json", JSON.stringify(bad, null, 2));
  console.log(`\n${bad.length} sprites need regeneration -> art/regen-manifest.json`);
  console.log("Run: bun scripts/gen-batch.mjs art/regen-manifest.json --force");
  process.exit(2);
}
console.log("\nAll sprites have real transparency.");
