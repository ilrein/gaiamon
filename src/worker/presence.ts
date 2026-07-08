// PresenceZone: one Durable Object per overworld area. Pure ephemeral relay —
// who is here, where they are, what they emoted. Uses the WebSocket
// Hibernation API (ctx.acceptWebSocket + serializeAttachment) so an idle zone
// costs nothing; identity AND last position survive hibernation in the socket
// attachment (position writes throttled), so rosters stay correct for idle
// players after a wake. The in-memory positions map is just the fast path.
//
// Protocol (JSON, all messages have a `t` tag):
//   client → server: join {id,name,sprite,x,z,dir} · pos {x,z,dir,moving} · emote {k}
//   server → client: roster {players} (reply to join) · join · pos · emote · leave
// Plus a hibernation-friendly keepalive: literal "ping" → "pong" auto-response
// (never wakes the DO).
//
// Identity is the client's persistent anonymous id. One id maps to exactly one
// live socket: a new join with an existing id supersedes the old socket
// (refresh/second tab take over cleanly). A hostile client can therefore
// bump a specific player's avatar — acceptable for cosmetic presence v1;
// real identity needs accounts.
//
// The relay must never throw (an uncaught exception kills every socket in the
// zone), so every handler swallows malformed input.

/** Joined-socket cap per zone. */
const MAX_PLAYERS = 48;
/** Hard cap on raw sockets (incl. not-yet-joined) so idlers can't lock a zone. */
const MAX_UNJOINED_EXTRA = 16;
/** Close code the client treats as "zone full — stay offline, don't retry". */
export const FULL_CLOSE_CODE = 4001;
/** Close code for a socket replaced by a newer connection with the same id. */
export const SUPERSEDED_CLOSE_CODE = 4002;
/** Server-side pos rate limit: drop anything faster than 10/s per client. */
const MIN_POS_INTERVAL_MS = 100;
/** Emotes are chunky UI on every peer — keep them slow. */
const MIN_EMOTE_INTERVAL_MS = 600;
/** UTF-16 code-unit cap (bounds bytes at 3x this — a DoS guard, not exact). */
const MAX_MESSAGE_CHARS = 512;
const MAX_NAME_LEN = 24;
const MAX_EMOTE_LEN = 16;
/** Attachment rewrites are storage-ish work — throttle position persistence. */
const ATTACHMENT_POS_INTERVAL_MS = 2000;

const DIRS = new Set(["down", "left", "right", "up"]);

interface Attachment {
  id: string;
  name: string;
  sprite: number;
  x?: number;
  z?: number;
  dir?: string;
}

interface Pos {
  x: number;
  z: number;
  dir: string;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function dirOf(v: unknown): string {
  return typeof v === "string" && DIRS.has(v) ? v : "down";
}

export class PresenceZone {
  private readonly ctx: DurableObjectState;
  /** Last known position per client id (fast path; attachment is the durable copy). */
  private readonly positions = new Map<string, Pos>();
  /** Per-socket rate limiters (ephemeral; reset on hibernation wake is fine). */
  private readonly lastPosAt = new Map<WebSocket, number>();
  private readonly lastEmoteAt = new Map<WebSocket, number>();
  private readonly lastAttachmentAt = new Map<WebSocket, number>();

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
    // Keepalive that never wakes the DO: the edge answers ping with pong.
    try {
      this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    } catch {
      /* older runtimes: clients just reconnect on idle timeout */
    }
  }

  fetch(request: Request): Response {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const sockets = this.ctx.getWebSockets();
    const joined = sockets.filter((s) => attachmentOf(s) !== null);
    const unjoined = sockets.length - joined.length;
    // Never let never-joining connections lock the zone out: past a small
    // allowance, evict unjoined sockets oldest-first (order of getWebSockets).
    if (unjoined > MAX_UNJOINED_EXTRA) {
      for (const s of sockets) {
        if (!attachmentOf(s)) {
          try {
            s.close(1011, "join timeout");
          } catch {
            /* already closing */
          }
          break;
        }
      }
    }
    if (joined.length >= MAX_PLAYERS) {
      // Zone full: complete the handshake, then close with the "full" code so
      // the client knows to stay offline rather than hammer reconnects.
      pair[1].accept();
      pair[1].close(FULL_CLOSE_CODE, "zone full");
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    try {
      if (typeof message !== "string" || message.length > MAX_MESSAGE_CHARS) return;
      const msg = JSON.parse(message) as Record<string, unknown>;
      switch (msg.t) {
        case "join":
          this.onJoin(ws, msg);
          break;
        case "pos":
          this.onPos(ws, msg);
          break;
        case "emote":
          this.onEmote(ws, msg);
          break;
      }
    } catch {
      // Malformed input from a client must never take the zone down.
    }
  }

  webSocketClose(ws: WebSocket): void {
    this.dropSocket(ws);
  }

  webSocketError(ws: WebSocket): void {
    this.dropSocket(ws);
  }

  // -- message handlers -------------------------------------------------------
  private onJoin(ws: WebSocket, msg: Record<string, unknown>): void {
    const id = str(msg.id, 64);
    if (!id) return;

    // One id = one socket: supersede any previous connection with this id
    // (refresh / second tab). Detach it first so its close handler doesn't
    // broadcast a bogus leave for the id we now own.
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const otherAtt = attachmentOf(other);
      if (otherAtt?.id === id) {
        try {
          other.serializeAttachment(null);
          other.close(SUPERSEDED_CLOSE_CODE, "superseded");
        } catch {
          /* already closing */
        }
      }
    }

    const pos: Pos = { x: num(msg.x), z: num(msg.z), dir: dirOf(msg.dir) };
    const att: Attachment = {
      id,
      name: str(msg.name, MAX_NAME_LEN) || "Warden",
      sprite: Math.abs(Math.floor(num(msg.sprite))) % 32,
      ...pos,
    };
    ws.serializeAttachment(att);
    this.lastAttachmentAt.set(ws, Date.now());
    this.positions.set(id, pos);

    // Full roster back to the joiner. Fall back to the attachment's persisted
    // position when the in-memory map was lost to a hibernation wake.
    const players: (Attachment & Partial<Pos>)[] = [];
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const otherAtt = attachmentOf(other);
      if (!otherAtt || otherAtt.id === id) continue;
      const known = this.positions.get(otherAtt.id);
      players.push({ ...otherAtt, ...(known ?? {}) });
    }
    send(ws, { t: "roster", players });

    this.broadcast(ws, { t: "join", ...att });
  }

  private onPos(ws: WebSocket, msg: Record<string, unknown>): void {
    const att = attachmentOf(ws);
    if (!att) return; // pos before join — ignore
    const now = Date.now();
    const last = this.lastPosAt.get(ws) ?? 0;
    if (now - last < MIN_POS_INTERVAL_MS) return;
    this.lastPosAt.set(ws, now);

    const pos: Pos = { x: num(msg.x), z: num(msg.z), dir: dirOf(msg.dir) };
    this.positions.set(att.id, pos);
    // Persist into the attachment (throttled) so idle players stay visible
    // to post-hibernation joiners.
    const lastPersist = this.lastAttachmentAt.get(ws) ?? 0;
    if (now - lastPersist >= ATTACHMENT_POS_INTERVAL_MS) {
      try {
        ws.serializeAttachment({ ...att, ...pos });
        this.lastAttachmentAt.set(ws, now);
      } catch {
        /* attachment too large or socket closing — fast path still works */
      }
    }
    this.broadcast(ws, { t: "pos", id: att.id, ...pos, moving: msg.moving === true });
  }

  private onEmote(ws: WebSocket, msg: Record<string, unknown>): void {
    const att = attachmentOf(ws);
    if (!att) return;
    const now = Date.now();
    if (now - (this.lastEmoteAt.get(ws) ?? 0) < MIN_EMOTE_INTERVAL_MS) return;
    this.lastEmoteAt.set(ws, now);
    const k = str(msg.k, MAX_EMOTE_LEN);
    if (!k) return;
    this.broadcast(ws, { t: "emote", id: att.id, k });
  }

  // -- plumbing ---------------------------------------------------------------
  private dropSocket(ws: WebSocket): void {
    try {
      this.lastPosAt.delete(ws);
      this.lastEmoteAt.delete(ws);
      this.lastAttachmentAt.delete(ws);
      const att = attachmentOf(ws);
      if (!att) return;
      // Another live socket with the same id (superseding reconnect) still
      // represents this player — don't ghost them.
      for (const other of this.ctx.getWebSockets()) {
        if (other !== ws && attachmentOf(other)?.id === att.id) return;
      }
      this.positions.delete(att.id);
      this.broadcast(ws, { t: "leave", id: att.id });
    } catch {
      /* never throw from a close handler */
    }
  }

  /** Send to every joined socket except `from`. */
  private broadcast(from: WebSocket, payload: unknown): void {
    const raw = JSON.stringify(payload);
    for (const other of this.ctx.getWebSockets()) {
      if (other === from || !attachmentOf(other)) continue;
      try {
        other.send(raw);
      } catch {
        /* socket already closing — its close handler will clean up */
      }
    }
  }
}

function attachmentOf(ws: WebSocket): Attachment | null {
  try {
    const att = ws.deserializeAttachment() as Attachment | null;
    return att && typeof att.id === "string" ? att : null;
  } catch {
    return null;
  }
}

function send(ws: WebSocket, payload: unknown): void {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
