// Overworld party HUD: a compact readout of the player's team that lives in
// game.hudRoot, tucked under the codex fab. Purely presentational — it reads
// PlayerState and never mutates it. Rebuild is a light reconcile keyed by uid so
// sprite <img>s aren't reloaded (and don't flash) on every refresh.

import "./party-hud.css";
import type { MonsterInstance, PlayerState } from "../../shared/model";
import { maxHpAt } from "../../shared/stats";
import { DATA } from "../../data";
import { creatureImg } from "../sprites";
import { clampPct } from "./format";
import { el } from "../dom";

// HP color stops mirror the battle hp-bar: green normally, amber <=50%, red <=20%.
const HP_WARN = 50;
const HP_CRIT = 20;
const COLOR_OK = "#5cc95c";
const COLOR_WARN = "#f4b942";
const COLOR_CRIT = "#e8674a";

interface CardRefs {
  card: HTMLElement;
  lv: HTMLElement;
  status: HTMLElement;
  speciesId: string;
}

export class PartyHud {
  readonly root: HTMLElement;
  private readonly player: PlayerState;
  private readonly cards = new Map<string, CardRefs>();

  constructor(player: PlayerState) {
    this.player = player;
    this.root = el("div", { className: "party-hud" });
    this.refresh();
  }

  /** Re-sync the badges with the current party (order, HP, level, status). */
  refresh(): void {
    const party = this.player.party;
    this.root.style.display = party.length ? "" : "none";

    const seen = new Set<string>();
    party.forEach((mon, index) => {
      seen.add(mon.uid);
      const refs = this.ensureCard(mon);
      this.updateCard(refs, mon, index === 0);
      // Keep DOM order aligned with party order (lead first).
      this.root.appendChild(refs.card);
    });

    for (const [uid, refs] of this.cards) {
      if (!seen.has(uid)) {
        refs.card.remove();
        this.cards.delete(uid);
      }
    }
  }

  private ensureCard(mon: MonsterInstance): CardRefs {
    const existing = this.cards.get(mon.uid);
    // Reuse unless the species changed under us (evolution) — then the sprite
    // must be rebuilt.
    if (existing && existing.speciesId === mon.speciesId) return existing;
    if (existing) existing.card.remove();

    const thumb = creatureImg(mon.speciesId, "party-hud-thumb", { shiny: mon.shiny });
    const lv = el("span", { className: "party-hud-lv" });
    const fill = el("div", { className: "party-hud-fill" });
    const bar = el("div", { className: "party-hud-bar" }, [fill]);
    const status = el("span", { className: "party-hud-status" });
    const meta = el("div", { className: "party-hud-meta" }, [lv, bar]);
    const card = el("div", { className: "party-hud-card" }, [thumb, meta, status]);

    const refs: CardRefs = { card, lv, status, speciesId: mon.speciesId };
    this.cards.set(mon.uid, refs);
    return refs;
  }

  private updateCard(refs: CardRefs, mon: MonsterInstance, isLead: boolean): void {
    const def = DATA.species[mon.speciesId];
    const maxHp = def ? maxHpAt(def.baseStats.hp, mon.level) : Math.max(1, mon.currentHp);
    const pct = clampPct((mon.currentHp / maxHp) * 100);
    const color = pct <= HP_CRIT ? COLOR_CRIT : pct <= HP_WARN ? COLOR_WARN : COLOR_OK;

    // A single pair of CSS vars drives both the phone HP ring and the desktop bar.
    refs.card.style.setProperty("--hp", `${pct}`);
    refs.card.style.setProperty("--hp-color", color);
    refs.card.dataset.lead = isLead ? "true" : "false";
    refs.card.dataset.fainted = mon.currentHp <= 0 ? "true" : "false";
    refs.card.dataset.shiny = mon.shiny ? "true" : "false";
    refs.lv.textContent = `Lv ${mon.level}`;

    const st = mon.status ? DATA.statuses[mon.status] : null;
    if (mon.status) {
      const label = st?.name ?? mon.status;
      refs.status.style.display = "";
      refs.status.title = label;
      refs.status.setAttribute("aria-label", `Status: ${label}`);
    } else {
      refs.status.style.display = "none";
      refs.status.removeAttribute("title");
      refs.status.removeAttribute("aria-label");
    }

    const name = mon.nickname ?? def?.name ?? mon.speciesId;
    const statusNote = mon.status ? `, ${st?.name ?? mon.status}` : "";
    refs.card.setAttribute(
      "aria-label",
      `${name}, level ${mon.level}, ${Math.round(pct)}% HP${statusNote}`,
    );
  }

  dispose(): void {
    this.cards.clear();
    this.root.remove();
  }
}
