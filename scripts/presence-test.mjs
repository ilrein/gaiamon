#!/usr/bin/env node
// Two-player presence e2e: builds the client, boots `wrangler dev` (worker +
// PresenceZone Durable Object), then opens TWO browser contexts with distinct
// injected saves (Ada and Bo, same starting area). Each side must see the
// other's remote walker + name tag (via the shipped debug hooks
// window.__presenceCount / window.__presenceNames), and an emote sent from A
// must land on B (window.__lastEmote). Exits non-zero on any failure or any
// console error.
//
// Usage: bun scripts/presence-test.mjs

import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";

const PORT = 8791;
const SHOTS = "/tmp/gaiamon-presence";
await mkdir(SHOTS, { recursive: true });

console.log("building client...");
const build = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
if (build.status !== 0) {
  console.error("✗ build failed");
  process.exit(1);
}

const server = spawn("bunx", ["wrangler", "dev", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
});
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/health`);
      if (r.ok) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("wrangler dev never came up");
};

// A minimal save that passes save.ts's validMon repair: fernby (starter),
// level 5 → maxHp floor(62*2*5/100)+5+10 = 21, moves = learnset ≤ lvl 5.
const makeSave = (name) => ({
  name,
  party: [
    {
      uid: "m1",
      speciesId: "fernby",
      nickname: null,
      level: 5,
      xp: 125,
      currentHp: 21,
      moves: ["boop", "sproutswat", "steady-stance", "cradleroots"],
      status: null,
    },
  ],
  registered: ["fernby"],
  flags: ["starter-chosen"],
  areaId: "hearthglow",
  pos: { x: 15, z: 12 },
  nextUid: 2,
});

const errors = [];
let step = "boot";
let browser = null;
const pages = {};

const fail = async (msg) => {
  console.error(`✗ FAILED at [${step}]: ${msg}`);
  for (const [who, page] of Object.entries(pages)) {
    await page.screenshot({ path: `${SHOTS}/FAIL-${step}-${who}.png` }).catch(() => {});
  }
  console.error(`failure screenshots (if any): ${SHOTS}/`);
  server.kill();
  process.exit(1);
};

const openPlayer = async (who, name, clientId) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  pages[who] = page;
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${who}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${who}] ${String(e)}`));
  await page.addInitScript(
    ({ save, cid }) => {
      localStorage.setItem("gaiamon-save-v1", save);
      localStorage.setItem("gaiamon-client-id", cid);
    },
    { save: JSON.stringify(makeSave(name)), cid: clientId },
  );
  await page.goto(`http://localhost:${PORT}`);
  await page.waitForSelector(".title-screen", { timeout: 15000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector(".area-tag", { timeout: 10000 });
  return page;
};

try {
  await waitForServer();
  console.log("server up");
  browser = await chromium.launch();

  step = "join-ada";
  const pageA = await openPlayer("ada", "Ada", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  console.log("Ada in the overworld");

  step = "join-bo";
  const pageB = await openPlayer("bo", "Bo", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  console.log("Bo in the overworld");

  step = "ada-sees-bo";
  await pageA.waitForFunction(
    () => (window.__presenceCount ?? 0) >= 1 && (window.__presenceNames ?? []).includes("Bo"),
    { timeout: 15000 },
  );
  console.log("✓ Ada sees Bo (remote walker + name tag registered)");

  step = "bo-sees-ada";
  await pageB.waitForFunction(
    () => (window.__presenceCount ?? 0) >= 1 && (window.__presenceNames ?? []).includes("Ada"),
    { timeout: 15000 },
  );
  console.log("✓ Bo sees Ada");
  await pageA.screenshot({ path: `${SHOTS}/1-ada-sees-bo.png` });
  await pageB.screenshot({ path: `${SHOTS}/2-bo-sees-ada.png` });

  step = "emote";
  await pageA.keyboard.press("e");
  await pageB.waitForFunction(
    () => window.__lastEmote && window.__lastEmote.k === "heart",
    { timeout: 10000 },
  );
  console.log("✓ Bo received Ada's heart emote");
  await pageB.screenshot({ path: `${SHOTS}/3-bo-got-emote.png` });

  // Bo joined AFTER Ada was already in the zone, so Ada must have gotten an
  // arrival toast (window.__lastToast is the shipped debug hook; the DOM toast
  // itself auto-dismisses after 4s, so the hook is the race-free assertion).
  step = "arrival-toast";
  await pageA.waitForFunction(
    () => typeof window.__lastToast === "string" && window.__lastToast.includes("Bo wandered in"),
    { timeout: 10000 },
  );
  console.log("✓ Ada got a toast for Bo joining late");

  step = "wave-emote";
  // Clear the emote rate limits (client 800ms, server 600ms) by pumping ~1s of
  // real time as rAF frames on Bo, so his game clock also advances a little
  // (headless pages barely tick between assertions, and dt is clamped at 50ms,
  // so the heart bubble outlives its 2s here — newest-on-top renderOrder keeps
  // the wave visible over it regardless).
  await pageB.bringToFront();
  const pumpFrames = (page, ms) =>
    page.evaluate(async (budget) => {
      const start = performance.now();
      while (performance.now() - start < budget) await new Promise(requestAnimationFrame);
    }, ms);
  await pumpFrames(pageB, 1000);
  await pageA.keyboard.press("r");
  await pageB.waitForFunction(
    () => window.__lastEmote && window.__lastEmote.k === "wave",
    { timeout: 10000 },
  );
  console.log("✓ Bo received Ada's wave emote");
  await pumpFrames(pageB, 400); // let the wave bubble rise into view
  console.log("live bubbles on Bo:", await pageB.evaluate(() => JSON.stringify(window.__emoteLive)));
  await pageB.screenshot({ path: `${SHOTS}/4-bo-got-wave.png` });

  step = "console-errors";
  if (errors.length > 0) {
    console.error(`\n${errors.length} console errors:`);
    for (const e of errors.slice(0, 10)) console.error("  -", e.slice(0, 200));
    await fail("console errors during run");
  }

  await browser.close();
  server.kill();
  console.log(`\n✓ presence e2e passed. screenshots: ${SHOTS}/`);
  process.exit(0);
} catch (err) {
  errors.length && console.error("console errors:", errors.slice(0, 5));
  await fail(err.message);
}
