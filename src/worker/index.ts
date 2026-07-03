// Cloudflare Worker entry: a Hono app that answers /api/* routes and otherwise
// falls through to static assets (SPA index.html for client-side routes).

import { Hono } from "hono";

type Bindings = {
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    name: "gaiamon",
    time: Date.now(),
  }),
);

// Anything that isn't an /api route falls through to static assets.
// `not_found_handling: single-page-application` serves index.html for
// client-side routes.
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
