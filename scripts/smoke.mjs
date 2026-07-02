#!/usr/bin/env node
// End-to-end browser smoke test: boots the built game under `wrangler dev`,
// then drives the real flow — title → starter select → overworld → walk into
// grass → wild battle → use a move → sync attempt. Screenshots land in
// /tmp/gaiamon-smoke/. Exits non-zero on console errors or a stuck step.
//
// Usage: bun run build && bun scripts/smoke.mjs [--mobile]

import { chromium, devices } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const MOBILE = process.argv.includes("--mobile");
const SHOTS = "/tmp/gaiamon-smoke";
await mkdir(SHOTS, { recursive: true });

const server = spawn("bunx", ["wrangler", "dev", "--port", "8790"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let serverUp = false;
server.stdout.on("data", (d) => {
  if (String(d).includes("Ready on")) serverUp = true;
});
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    if (serverUp) return;
    try {
      const r = await fetch("http://localhost:8790/api/health");
      if (r.ok) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("wrangler dev never came up");
};

const errors = [];
let step = "boot";
let failPage = null;
const fail = async (msg) => {
  console.error(`✗ FAILED at [${step}]: ${msg}`);
  if (failPage) {
    await failPage.screenshot({ path: `${SHOTS}/FAIL-${step}.png` }).catch(() => {});
    console.error(`failure screenshot: ${SHOTS}/FAIL-${step}.png`);
  }
  server.kill();
  process.exit(1);
};

try {
  await waitForServer();
  console.log("server up");

  const browser = await chromium.launch();
  const context = await browser.newContext(
    MOBILE ? { ...devices["iPhone 13"] } : { viewport: { width: 1280, height: 800 } },
  );
  const page = await context.newPage();
  failPage = page;
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  const shot = (name) => page.screenshot({ path: `${SHOTS}/${MOBILE ? "m-" : ""}${name}.png` });

  step = "title";
  await page.goto("http://localhost:8790");
  await page.waitForSelector(".title-screen", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200)); // let backdrop settle
  await shot("1-title");

  step = "new-journey";
  await page.getByText("New Journey", { exact: false }).click();

  step = "opening-dialogue";
  await page.waitForSelector(".dialogue", { timeout: 8000 });
  for (let i = 0; i < 40; i++) {
    const dlg = await page.$(".dialogue");
    if (!dlg) break;
    await dlg.click();
    await new Promise((r) => setTimeout(r, 400));
  }

  step = "starter-select";
  await page.waitForSelector(".starter-card", { timeout: 8000 });
  await shot("2-starters");
  await page.locator(".starter-card").first().click();
  await new Promise((r) => setTimeout(r, 400));
  // confirm step if present
  const yes = page.getByRole("button", { name: /yes/i }).first();
  if (await yes.isVisible().catch(() => false)) await yes.click();

  step = "post-starter-dialogue";
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const dlg = await page.$(".dialogue");
    if (!dlg) break;
    await dlg.click();
  }

  step = "overworld";
  await page.waitForSelector(".area-tag", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 800));
  await shot("3-overworld");

  step = "walk-to-grass";
  // Head north out of the village (spawn is on the main path), then wander the
  // meadow grass until a battle starts.
  const dirs = ["w", "w", "w", "w", "w", "a", "w", "d", "d", "w", "a", "w", "d", "w", "a", "a", "w", "d"];
  let inBattle = false;
  for (let round = 0; round < 30 && !inBattle; round++) {
    const key = dirs[round % dirs.length];
    await page.keyboard.down(key);
    await new Promise((r) => setTimeout(r, 850));
    await page.keyboard.up(key);
    await new Promise((r) => setTimeout(r, 150));
    inBattle = (await page.$(".battle-menu")) !== null;
    if (round === 8) await shot("3b-midwalk");
  }
  if (!inBattle) {
    await shot("4-no-battle");
    await fail("never found a wild encounter while wandering");
  }

  step = "battle";
  await new Promise((r) => setTimeout(r, 1500));
  await shot("4-battle");

  step = "use-move";
  await page.getByText("Fight", { exact: false }).first().click();
  await page.waitForSelector(".move-btn", { timeout: 5000 });
  await shot("5-moves");
  await page.locator(".move-btn").first().click();
  await new Promise((r) => setTimeout(r, 4000));
  await shot("6-after-move");

  step = "sync";
  const syncBtn = page.getByText("Sync", { exact: false }).first();
  if (await syncBtn.isVisible().catch(() => false)) {
    await syncBtn.click();
    await new Promise((r) => setTimeout(r, 5000));
    await shot("7-sync");
  }

  console.log(`\n✓ smoke flow completed through [${step}]`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} console errors:`);
    for (const e of errors.slice(0, 10)) console.error("  -", e.slice(0, 200));
    await fail("console errors during run");
  }
  await browser.close();
  server.kill();
  console.log(`screenshots: ${SHOTS}/`);
  process.exit(0);
} catch (err) {
  errors.length && console.error("console errors:", errors.slice(0, 5));
  await fail(err.message);
}
