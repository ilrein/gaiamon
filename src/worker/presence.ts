// PresenceZone: one Durable Object per overworld area. Pure ephemeral relay —
// who is here, where they are, what they emoted. Uses the WebSocket
// Hibernation API (ctx.acceptWebSocket + serializeAttachment) so an idle zone
// costs nothing; identity survives hibernation in the socket attachment,
// positions live in memory only (no storage writes, by design — a hibernation
// wake just means remote players snap in on their next pos tick).
//
// Protocol (JSON, all messages have a `t` tag):
//   client → server: join {id,name,sprite,x,z,dir} · pos {x,z,dir,moving} · emote {k}
//   server → client: roster {players} (reply to join) · join · pos · emote · leave
//
// The relay must never throw (an uncaught exception kills every socket in the
// zone), so every handler swallows malformed input.

const MAX_SOCKETS = 48;
/** Close code the client treats as "zone full — stay offline, don't retry". */
export const FULL_CLOSE_CODE = 4001;
/** Server-side pos rate limit: drop anything faster than 10/s per client. */
const MIN_POS_INTERVAL_MS = 100;
const MAX_MESSAGE_BYTES = 512;
const MAX_NAME_LEN = 24;
const MAX_EMOTE_LEN = 16;

const DIRS = new Set(["down", "left", "right", "up"]);

interface Attachment {
  id: string;
  name: string;
  sprite: number;
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
  /** Last known position per client id (ephemeral — see file header). */
  private readonly positions = new Map<string, Pos>();
  /** Per-socket pos rate limiter (ephemeral; resets on hibernation wake). */
  private readonly lastPosAt = new Map<WebSocket, number>();

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  fetch(request: Request): Response {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) {
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
      if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return;
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
    const att: Attachment = {
      id,
      name: str(msg.name, MAX_NAME_LEN) || "Warden",
      sprite: Math.abs(Math.floor(num(msg.sprite))) % 32,
    };
    ws.serializeAttachment(att);
    const pos: Pos = { x: num(msg.x), z: num(msg.z), dir: dirOf(msg.dir) };
    this.positions.set(id, pos);

    // Full roster back to the joiner (everyone already in the zone).
    const players: (Attachment & Partial<Pos>)[] = [];
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const otherAtt = attachmentOf(other);
      if (!otherAtt || otherAtt.id === id) continue;
      players.push({ ...otherAtt, ...this.positions.get(otherAtt.id) });
    }
    send(ws, { t: "roster", players });

    this.broadcast(ws, { t: "join", ...att, ...pos });
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
    this.broadcast(ws, { t: "pos", id: att.id, ...pos, moving: msg.moving === true });
  }

  private onEmote(ws: WebSocket, msg: Record<string, unknown>): void {
    const att = attachmentOf(ws);
    if (!att) return;
    const k = str(msg.k, MAX_EMOTE_LEN);
    if (!k) return;
    this.broadcast(ws, { t: "emote", id: att.id, k });
  }

  // -- plumbing ---------------------------------------------------------------
  private dropSocket(ws: WebSocket): void {
    try {
      this.lastPosAt.delete(ws);
      const att = attachmentOf(ws);
      if (!att) return;
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
