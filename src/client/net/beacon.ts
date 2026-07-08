// Fire-and-forget anonymous analytics: event names only, no PII. Uses
// sendBeacon so events survive tab closes, and fails silently everywhere —
// analytics must never surface as a console error or a gameplay hiccup.
// A one-time /api/health probe gates all sends: in vite-only dev there is no
// worker, and a 404'd beacon would log "Failed to load resource" noise.

let apiOk: Promise<boolean> | null = null;
const queued: string[] = [];

function probe(): Promise<boolean> {
  apiOk ??= fetch("/api/health", { cache: "no-store" })
    .then((r) => r.ok)
    .catch(() => false);
  return apiOk;
}

export function track(event: string, meta?: string): void {
  try {
    const payload = JSON.stringify(meta ? { e: event, m: meta } : { e: event });
    queued.push(payload);
    void probe().then((ok) => {
      if (!ok) {
        queued.length = 0;
        return;
      }
      for (const p of queued.splice(0)) navigator.sendBeacon?.("/api/e", p);
    });
  } catch {
    /* offline / blocked / ancient browser — drop the event */
  }
}
