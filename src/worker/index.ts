// Cloudflare Worker entry: a Hono app that answers /api/* routes and otherwise
// falls through to static assets (SPA index.html for client-side routes).
//
// Websocket routes must be registered explicitly — anything that slips to
// notFound gets index.html from the assets binding instead of an upgrade.

import { Hono } from "hono";
import { AREAS } from "../data";
import { PresenceZone } from "./presence";

// Durable Object classes must be (re-)exported from the deploy entry module.
export { PresenceZone };

type Bindings = {
  ASSETS: Fetcher;
  PRESENCE: DurableObjectNamespace;
  /** Optional so a missing/renamed binding degrades to "no analytics". */
  AE?: AnalyticsEngineDataset;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    name: "gaiamon",
    time: Date.now(),
  }),
);

// Presence websocket: one Durable Object zone per overworld area.
app.get("/api/presence/:areaId", (c) => {
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket") {
    return c.text("expected websocket upgrade", 426);
  }
  const areaId = c.req.param("areaId");
  const zone = c.env.PRESENCE.get(c.env.PRESENCE.idFromName(areaId));
  return zone.fetch(c.req.raw);
});

// Live social proof: total JOINED presence sockets across every area zone.
// Each zone answers ?count without waking hibernated sockets' handlers; a
// failing zone counts as 0 (this endpoint must never throw).
//
// COST GUARDRAILS (review finding: a cache-missing poller could wake all 12
// zone DOs every request and burn the free plan's daily DO quota, taking
// presence itself down):
//   1. edge cache: responses carry s-maxage and are stored in caches.default,
//      so a burst collapses to ~one fan-out per colo per TTL
//   2. per-isolate 10s memory cache on top
//   3. in-flight dedupe: concurrent misses in one isolate share one fan-out
const AREA_IDS = Object.keys(AREAS);
const NOW_CACHE_MS = 10_000;
const NOW_EDGE_TTL_S = 15;
let nowCache: { at: number; n: number } | null = null;
let nowInFlight: Promise<number> | null = null;

async function countWardens(env: Bindings): Promise<number> {
  const counts = await Promise.all(
    AREA_IDS.map(async (areaId) => {
      try {
        const zone = env.PRESENCE.get(env.PRESENCE.idFromName(areaId));
        const res = await zone.fetch(new Request("https://do/?count"));
        if (!res.ok) return 0;
        const body = (await res.json()) as { n?: unknown };
        return typeof body.n === "number" && Number.isFinite(body.n) && body.n > 0
          ? Math.floor(body.n)
          : 0;
      } catch {
        return 0; // a sick zone must not hide everyone else
      }
    }),
  );
  return counts.reduce((sum, v) => sum + v, 0);
}

app.get("/api/now", async (c) => {
  const now = Date.now();
  if (nowCache && now - nowCache.at < NOW_CACHE_MS) {
    return c.json({ n: nowCache.n });
  }
  // Edge cache (no-op on workers.dev, effective on the custom domain).
  const cacheKey = new Request(new URL("/api/now", c.req.url).toString());
  try {
    const hit = await caches.default.match(cacheKey);
    if (hit) {
      const body = (await hit.json()) as { n?: number };
      nowCache = { at: now, n: body.n ?? 0 };
      return c.json({ n: body.n ?? 0 });
    }
  } catch {
    /* cache API unavailable — fall through to the fan-out */
  }
  nowInFlight ??= countWardens(c.env).finally(() => {
    nowInFlight = null;
  });
  const n = await nowInFlight;
  nowCache = { at: now, n };
  const res = new Response(JSON.stringify({ n }), {
    headers: {
      "content-type": "application/json",
      "cache-control": `public, s-maxage=${NOW_EDGE_TTL_S}, max-age=5`,
    },
  });
  try {
    c.executionCtx.waitUntil(caches.default.put(cacheKey, res.clone()));
  } catch {
    /* no execution context in some test harnesses — cache skip is fine */
  }
  return res;
});

// Anonymous analytics beacon: {e: string, m?: string}, counted in Analytics
// Engine. Always 204 — analytics must never fail (or slow) the client.
// Event names are allowlisted so random POSTs can't poison the dataset index.
const KNOWN_EVENTS = new Set([
  "session-start",
  "new-journey",
  "battle-start",
  "sync-capture",
  "presence-join",
]);
app.post("/api/e", async (c) => {
  try {
    const body = JSON.parse(await c.req.text()) as { e?: unknown; m?: unknown };
    const e = typeof body.e === "string" ? body.e.slice(0, 64) : "";
    const m = typeof body.m === "string" ? body.m.slice(0, 64) : "";
    if (KNOWN_EVENTS.has(e)) {
      c.env.AE?.writeDataPoint({ blobs: [e, m], doubles: [1], indexes: [e] });
    }
  } catch {
    /* malformed body or missing binding — drop the event */
  }
  return c.body(null, 204);
});

// Anything that isn't an /api route falls through to static assets.
// `not_found_handling: single-page-application` serves index.html for
// client-side routes.
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
