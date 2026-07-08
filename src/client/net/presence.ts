// PresenceClient: the websocket half of multiplayer presence. Lives OUTSIDE
// any screen (battles unmount the overworld — the socket must survive them).
// Every failure path is silent: no console noise (the smoke test fails on any
// console error), exponential backoff capped at 30s, and a "zone full" close
// code means give up gracefully until the next area change.

import { track } from "./beacon";

export type Dir = "down" | "left" | "right" | "up";

export interface RemotePlayerInfo {
  id: string;
  name: string;
  sprite: number;
  x?: number;
  z?: number;
  dir?: Dir;
}

export interface PosUpdate {
  id: string;
  x: number;
  z: number;
  dir: Dir;
  moving: boolean;
}

const SAVE_KEY = "gaiamon-save-v1";
const CLIENT_ID_KEY = "gaiamon-client-id";
/** Server closes with this when the zone is at capacity: stay offline. */
const FULL_CLOSE_CODE = 4001;
/** A newer connection with our id took over (other tab): stay offline. */
const SUPERSEDED_CLOSE_CODE = 4002;
// ~4 updates/s per moving player: the remote lerp reads smooth at this rate
// and it halves the Durable Object wake budget vs 8/s (free-plan headroom).
const SEND_INTERVAL_MS = 250;
const MIN_MOVE = 0.05;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
/** Edge keepalive; answered by the DO's auto-response without waking it. */
const PING_INTERVAL_MS = 25_000;

/** Persistent anonymous client id (survives saves being wiped). */
export function clientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    // Private mode / blocked storage: a per-session id is fine.
    return `anon-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Display name from the save (never trusted further than rendering a tag). */
function playerName(): string {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return "Warden";
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" && parsed.name ? parsed.name.slice(0, 24) : "Warden";
  } catch {
    return "Warden";
  }
}

/** Stable walker-sheet index for a client id (1..14 — 0 is the local player). */
export function spriteIndexFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 1 + (hash % 14);
}

export class PresenceClient {
  onRoster: (players: RemotePlayerInfo[]) => void = () => {};
  onJoin: (player: RemotePlayerInfo) => void = () => {};
  onPos: (update: PosUpdate) => void = () => {};
  onEmote: (id: string, kind: string) => void = () => {};
  onLeave: (id: string) => void = () => {};

  readonly id = clientId();
  readonly sprite = spriteIndexFor(this.id);

  private ws: WebSocket | null = null;
  private areaId: string | null = null;
  private backoff = BASE_BACKOFF_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  /** True after a terminal close (full/superseded) or close(): stop reconnecting. */
  private stopped = false;
  /** Area that reported "zone full" — don't retry it until we go elsewhere. */
  private fullArea: string | null = null;
  /** Bumped on connect()/close(); stale async open chains check it and bail. */
  private generation = 0;

  // Last observed player state (always tracked, so `join` has fresh coords).
  private lastX = 0;
  private lastZ = 0;
  private lastDir: Dir = "down";
  // Last state actually sent (for change detection).
  private sentX = NaN;
  private sentZ = NaN;
  private sentDir: Dir = "down";
  private sentMoving = false;
  private sentAt = 0;

  /** Join `areaId`'s zone. Returns true if this switched zones (caller should
   *  reset its remote-players layer); false when already connected there. */
  connect(areaId: string): boolean {
    if (this.areaId === areaId && !this.stopped && this.ws) return false;
    // "Zone full" is sticky per area: returning from a battle in the same
    // area must not hammer a full zone (it clears when we go somewhere else).
    if (this.fullArea === areaId) return false;
    this.fullArea = null;
    this.generation++;
    this.areaId = areaId;
    this.stopped = false;
    this.backoff = BASE_BACKOFF_MS;
    this.teardownSocket();
    this.open();
    return true;
  }

  close(): void {
    this.generation++;
    this.stopped = true;
    this.areaId = null;
    this.teardownSocket();
  }

  sendPos(x: number, z: number, dir: Dir, moving: boolean): void {
    this.lastX = x;
    this.lastZ = z;
    this.lastDir = dir;
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - this.sentAt < SEND_INTERVAL_MS) return;
    const changed =
      Math.hypot(x - this.sentX, z - this.sentZ) > MIN_MOVE ||
      dir !== this.sentDir ||
      moving !== this.sentMoving;
    if (!changed && !Number.isNaN(this.sentX)) return;
    this.sentAt = now;
    this.sentX = x;
    this.sentZ = z;
    this.sentDir = dir;
    this.sentMoving = moving;
    this.send({ t: "pos", x, z, dir, moving });
  }

  sendEmote(kind: string): void {
    this.send({ t: "emote", k: kind });
  }

  // -- socket lifecycle -------------------------------------------------------
  private open(): void {
    void this.preflightThenOpen(this.generation);
  }

  /** Chrome logs failed WebSocket handshakes to the console no matter what we
   *  catch — so never construct one unless the API answers a health check
   *  first (vite-only dev has no worker; keep that console clean). The
   *  generation guard kills chains orphaned by a connect()/close() that
   *  happened while the fetch was in flight. */
  private async preflightThenOpen(gen: number): Promise<void> {
    if (gen !== this.generation || this.stopped || !this.areaId) return;
    let ok = false;
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (gen !== this.generation || this.stopped || !this.areaId) return;
    if (!ok) {
      this.scheduleReconnect();
      return;
    }
    this.openSocket(gen);
  }

  private openSocket(gen: number): void {
    if (gen !== this.generation || this.stopped || !this.areaId) return;
    this.teardownSocket(); // never leave a previous socket dangling open
    try {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/api/presence/${encodeURIComponent(this.areaId)}`);
      this.ws = ws;
      ws.onopen = () => {
        if (ws !== this.ws) return;
        this.backoff = BASE_BACKOFF_MS;
        this.sentX = NaN; // force the first pos through the throttle
        this.startPing();
        this.send({
          t: "join",
          id: this.id,
          name: playerName(),
          sprite: this.sprite,
          x: this.lastX,
          z: this.lastZ,
          dir: this.lastDir,
        });
        track("presence-join");
      };
      ws.onmessage = (ev) => {
        if (ws === this.ws) this.dispatch(ev.data as string);
      };
      ws.onclose = (ev) => {
        if (ws !== this.ws) return;
        this.ws = null;
        this.stopPing();
        if (this.stopped) return;
        if (ev.code === FULL_CLOSE_CODE) {
          this.stopped = true; // zone full: stay offline until a new area
          this.fullArea = this.areaId;
          return;
        }
        if (ev.code === SUPERSEDED_CLOSE_CODE) {
          this.stopped = true; // another tab owns this identity now
          return;
        }
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        /* onclose follows and handles the retry */
      };
    } catch {
      this.ws = null;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return;
    const delay = this.backoff + Math.random() * 250;
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      const ws = this.ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send("ping"); // DO auto-response answers without waking it
        } catch {
          /* close path handles it */
        }
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private teardownSocket(): void {
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }

  private send(payload: unknown): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* ignore — close/retry paths handle it */
    }
  }

  private dispatch(raw: string): void {
    try {
      const msg = JSON.parse(raw) as Record<string, unknown>;
      switch (msg.t) {
        case "roster":
          if (Array.isArray(msg.players)) {
            this.onRoster(
              (msg.players as RemotePlayerInfo[]).filter(
                (p) => p && typeof p.id === "string" && p.id !== this.id,
              ),
            );
          }
          break;
        case "join": {
          const p = msg as unknown as RemotePlayerInfo;
          if (typeof p.id === "string" && p.id !== this.id) this.onJoin(p);
          break;
        }
        case "pos": {
          const p = msg as unknown as PosUpdate;
          if (typeof p.id === "string" && typeof p.x === "number" && typeof p.z === "number") {
            this.onPos(p);
          }
          break;
        }
        case "emote":
          if (typeof msg.id === "string" && typeof msg.k === "string") {
            this.onEmote(msg.id, msg.k);
          }
          break;
        case "leave":
          if (typeof msg.id === "string") this.onLeave(msg.id);
          break;
      }
    } catch {
      /* malformed server frame — ignore */
    }
  }
}
