#!/usr/bin/env node
// Screenshot a voxel creature from the workshop page for authoring iteration.
//
// Usage: bun scripts/voxel-shot.mjs <speciesId> [more ids...]
// Writes /tmp/voxel-<id>-{hero,front,side,back}.png (spin disabled for
// deterministic shots). Boots its own vite dev server.

import { chromium } from "playwright";
import { spawn } from "node:child_process";

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (ids.length === 0) {
  console.error("Usage: bun scripts/voxel-shot.mjs <speciesId> [...]");
  process.exit(1);
}

// Unique port per invocation so concurrent authoring sessions don't collide.
const PORT = 5100 + (process.pid % 700);
const server = spawn("bunx", ["vite", "--port", String(PORT), "--strictPort"], {
  stdio: ["ignore", "pipe", "pipe"],
});
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/voxel-preview.html`);
    if (r.ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

for (const id of ids) {
  for (const angle of ["hero", "front", "side", "back"]) {
    await page.goto(`http://localhost:${PORT}/voxel-preview.html?species=${id}&spin=0&angle=${angle}`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `/tmp/voxel-${id}-${angle}.png` });
  }
  console.log(`shot: /tmp/voxel-${id}-{hero,front,side,back}.png`);
}

if (errors.length) {
  console.error("page errors:", errors.slice(0, 3).join("\n"));
}
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
