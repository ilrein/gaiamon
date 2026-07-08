#!/usr/bin/env node
// Screenshot the procedural SDF prototype (proto-preview.html) at each angle.
// Usage: bun scripts/proto-shot.mjs [--t=2.2]

import { chromium } from "playwright";
import { spawn } from "node:child_process";

const tArg = process.argv.find((a) => a.startsWith("--t="));
const t = tArg ? tArg.slice(4) : "2.2";

const PORT = 5100 + (process.pid % 700);
const server = spawn("bunx", ["vite", "--port", String(PORT), "--strictPort"], {
  stdio: ["ignore", "pipe", "pipe"],
});
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/proto-preview.html`);
    if (r.ok) break;
  } catch {
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

for (const angle of ["hero", "front", "side", "back"]) {
  await page.goto(`http://localhost:${PORT}/proto-preview.html?angle=${angle}&t=${t}&px=1`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `/tmp/proto-fernby-${angle}.png` });
}
console.log("shot: /tmp/proto-fernby-{hero,front,side,back}.png");

if (errors.length) {
  console.error("page errors:", errors.slice(0, 5).join("\n"));
}
await browser.close();
server.kill();
process.exit(errors.length ? 1 : 0);
