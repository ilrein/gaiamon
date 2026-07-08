// Cloudflare Worker entry: a Hono app that answers /api/* routes and otherwise
// falls through to static assets (SPA index.html for client-side routes).
//
// Websocket routes must be registered explicitly — anything that slips to
// notFound gets index.html from the assets binding instead of an upgrade.

import { Hono } from "hono";
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
