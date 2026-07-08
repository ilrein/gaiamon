// The Codex: Gaiamon's one menu, reimagined as a full-screen field terminal.
// When it's open, the Codex *is* the screen — an ancient-tech handheld device
// that takes over the whole viewport: a gunmetal frame with glowing teal
// accents wrapped around a warm paper display. Tabs: PARTY / LEDGER / MAP /
// SYSTEM (+ REST at a waystone). Fully one-thumb usable on a phone.

import "./codex.css";
import type { Game } from "../game";
import { el } from "../dom";
import { creatureImg, placeholderDataUrl, spritePath } from "../sprites";
import { hasProtoPortrait } from "../world/proto-portrait";
import { typeChip } from "../colors";
import { clampPct, hpFillClass } from "./format";
import { clearSave } from "../save";
import { openWorldMap } from "./map";
import { computeStats, maxHpAt, xpForLevel } from "../../shared/stats";
import { STAT_NAMES } from "../../shared/model";
import type { MonsterInstance, SpeciesDef, SpeciesRole, StatName } from "../../shared/model";

type Tab = "party" | "ledger" | "map" | "system";
const VERSION = "v0.0.1";

// Ledger display order: starter lines first (verdant, ember, tide), then wilds,
// titans last. Anything unexpected sorts just before titans.
const ROLE_RANK: Record<SpeciesRole, number> = {
  "starter-verdant": 0,
  "starter-ember": 1,
  "starter-tide": 2,
  wild: 3,
  titan: 5,
};

// Rough per-stat ceilings so the cute bars read well across levels 1-40.
const STAT_BAR_MAX: Record<StatName, number> = {
  hp: 220,
  attack: 150,
  defense: 150,
  spirit: 150,
  speed: 150,
};
const BASE_STAT_MAX = 150;

export async function openCodex(
  game: Game,
  opts: { healer?: boolean } = {},
): Promise<"closed" | "lead-changed"> {
  return new Promise((resolve) => {
    let leadChanged = false;
    let tab: Tab = "party";
    // Detail drill-downs; null = the tab's list/grid view.
    let partyDetail: number | null = null;
    let ledgerDetail: string | null = null;

    const root = el("div", { className: "cdx-root" });
    const device = el("div", { className: "cdx-device" });
    const rail = el("div", { className: "cdx-rail" });
    const screen = el("div", { className: "cdx-screen" });
    const head = el("div", { className: "cdx-head" });
    const bodyScroll = el("div", { className: "cdx-body" });

    screen.append(head, bodyScroll);
    device.append(rail, screen);
    root.append(device);
    game.uiRoot.append(root);

    // Boot shimmer — a quick scanline sweep over the screen on open.
    const boot = el("div", { className: "cdx-boot" });
    screen.append(boot);
    setTimeout(() => boot.remove(), 320);

    // Swipe-down-to-close, driven from the screen header so it never fights
    // with the scrolling body.
    let touchY = 0;
    let touchX = 0;
    head.addEventListener(
      "touchstart",
      (e) => {
        touchY = e.touches[0].clientY;
        touchX = e.touches[0].clientX;
      },
      { passive: true },
    );
    head.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches[0];
        if (t.clientY - touchY > 70 && Math.abs(t.clientX - touchX) < 60) close();
      },
      { passive: true },
    );

    function close(): void {
      root.remove();
      resolve(leadChanged ? "lead-changed" : "closed");
    }

    function toast(text: string): void {
      const t = el("div", { text });
      Object.assign(t.style, {
        position: "fixed",
        left: "50%",
        top: "12%",
        transform: "translateX(-50%)",
        background: "var(--sun)",
        color: "var(--ink)",
        fontWeight: "800",
        fontSize: "15px",
        padding: "8px 16px",
        borderRadius: "999px",
        boxShadow: "0 3px 0 var(--shadow)",
        zIndex: "60",
        animation: "pop-in 0.18s ease-out",
      } as CSSStyleDeclaration);
      game.uiRoot.append(t);
      setTimeout(() => {
        t.style.transition = "opacity 0.3s ease";
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 300);
      }, 900);
    }

    // ---- device frame: tab rail + screen header --------------------------
    function renderRail(): void {
      rail.replaceChildren();
      const tabs: [Tab, string, string][] = [
        ["party", "◈", "PARTY"],
        ["ledger", "▤", "LEDGER"],
        ["map", "✦", "MAP"],
        ["system", "⚙", "SYSTEM"],
      ];
      for (const [id, ico, label] of tabs) {
        rail.append(
          el(
            "button",
            {
              className: `cdx-tab${tab === id ? " active" : ""}`,
              onClick: () => {
                if (id === "map") {
                  // Hand off to the sibling full-screen world map; highlight
                  // the MAP tab while it's open, restore after.
                  const prev = tab;
                  tab = "map";
                  renderRail();
                  void openWorldMap(game).then(() => {
                    tab = prev;
                    renderRail();
                  });
                  return;
                }
                if (tab !== id) {
                  tab = id;
                  partyDetail = null;
                  ledgerDetail = null;
                  render();
                }
              },
            },
            [el("span", { className: "cdx-tab-ico", text: ico }), el("span", { text: label })],
          ),
        );
      }
      if (opts.healer) {
        rail.append(
          el("button", { className: "cdx-tab rest", onClick: () => restAll() }, [
            el("span", { className: "cdx-tab-ico", text: "✿" }),
            el("span", { text: "REST" }),
          ]),
        );
      }
    }

    function renderHead(title: string, opt?: { sub?: string; onBack?: () => void }): void {
      head.replaceChildren();
      head.append(el("div", { className: "cdx-grab" }));
      if (opt?.onBack) {
        head.append(el("button", { className: "cdx-back", text: "‹ Back", onClick: opt.onBack }));
      }
      head.append(el("div", { className: "cdx-title", text: title }));
      if (opt?.sub) head.append(el("div", { className: "cdx-sub", text: opt.sub }));
      head.append(el("button", { className: "cdx-close", text: "✕", onClick: () => close() }));
    }

    function render(): void {
      renderRail();
      bodyScroll.replaceChildren();
      bodyScroll.scrollTop = 0;
      if (tab === "party") {
        if (partyDetail !== null && game.player.party[partyDetail]) renderPartyDetail(partyDetail);
        else renderParty();
      } else if (tab === "ledger") {
        if (ledgerDetail && game.data.species[ledgerDetail]) renderLedgerDetail(ledgerDetail);
        else renderLedger();
      } else {
        renderSystem();
      }
    }

    // ---- PARTY -----------------------------------------------------------
    function renderParty(): void {
      renderHead("Party", { sub: `${game.player.party.length} with you` });
      game.player.party.forEach((mon, i) => bodyScroll.append(partyCard(mon, i)));
    }

    function partyCard(mon: MonsterInstance, index: number): HTMLElement {
      const def = game.data.species[mon.speciesId];
      const maxHp = maxHpAt(def.baseStats.hp, mon.level);
      const pct = clampPct((mon.currentHp / maxHp) * 100);

      const nameline = el("div", { className: "cdx-nameline" }, [
        el("b", { text: mon.nickname ?? def.name }),
        el("span", { className: "cdx-lv", text: `Lv ${mon.level}` }),
      ]);
      if (index === 0) nameline.append(el("span", { className: "cdx-lead-tag", text: "LEAD" }));
      if (mon.shiny) nameline.append(el("span", { className: "cdx-shiny-tag", text: "✨ SHINY" }));

      const meta = el("div", { className: "cdx-meta" }, [
        el("span", { text: `${mon.currentHp}/${maxHp} HP` }),
      ]);
      if (mon.status) {
        const st = game.data.statuses[mon.status];
        meta.append(el("span", { className: "cdx-status-chip", text: st?.name ?? mon.status }));
      }
      meta.append(el("span", { text: xpToNextLabel(mon) }));

      const info = el("div", { className: "cdx-pinfo" }, [
        nameline,
        el("div", { className: "cdx-chips", html: def.types.map(typeChip).join("") }),
        hpBar(pct),
        meta,
      ]);

      return el(
        "button",
        {
          className: "cdx-pcard",
          onClick: () => {
            partyDetail = index;
            render();
          },
        },
        [creatureImg(mon.speciesId, "", { shiny: mon.shiny }), info],
      );
    }

    function renderPartyDetail(index: number): void {
      const mon = game.player.party[index];
      const def = game.data.species[mon.speciesId];
      const stats = computeStats(def, mon.level);
      const maxHp = stats.hp;

      renderHead(mon.nickname ?? def.name, {
        sub: `#${dexNumber(def.id)}`,
        onBack: () => {
          partyDetail = null;
          render();
        },
      });

      const heroText = el("div", {}, [
        el("h2", { text: mon.nickname ?? def.name }),
        el("div", { className: "cdx-lv", text: `Lv ${mon.level}` }),
        el("div", { className: "cdx-chips", html: def.types.map(typeChip).join("") }),
      ]);
      if (mon.nickname) {
        const original = el("div", { className: "cdx-lv", text: `(${def.name})` });
        original.style.marginTop = "4px";
        heroText.append(original);
      }
      bodyScroll.append(
        el("div", { className: "cdx-detail cdx-detail-hero" }, [
          creatureImg(mon.speciesId, "", { shiny: mon.shiny }),
          heroText,
        ]),
      );

      // HP + status + xp line.
      bodyScroll.append(el("div", { className: "cdx-section-label", text: "Condition" }));
      const condMeta = el("div", { className: "cdx-meta" }, [
        el("span", { text: `${mon.currentHp}/${maxHp} HP` }),
      ]);
      if (mon.status) {
        condMeta.append(
          el("span", {
            className: "cdx-status-chip",
            text: game.data.statuses[mon.status]?.name ?? mon.status,
          }),
        );
      }
      condMeta.append(el("span", { text: xpToNextLabel(mon) }));
      bodyScroll.append(
        el("div", { className: "cdx-detail" }, [
          hpBar(clampPct((mon.currentHp / maxHp) * 100)),
          condMeta,
        ]),
      );

      // Computed stats as cute bars.
      bodyScroll.append(el("div", { className: "cdx-section-label", text: "Stats" }));
      for (const s of STAT_NAMES) {
        bodyScroll.append(statBar(s, stats[s], STAT_BAR_MAX[s]));
      }

      // Known moves.
      bodyScroll.append(el("div", { className: "cdx-section-label", text: "Moves" }));
      const known = mon.moves.map((id) => game.data.moves[id]).filter(Boolean);
      if (known.length === 0) {
        bodyScroll.append(el("div", { className: "cdx-entry", text: "No moves learned." }));
      }
      for (const mv of known) {
        bodyScroll.append(
          el("div", { className: "cdx-move" }, [
            el("span", { html: typeChip(mv.type) }),
            el("span", { className: "cdx-move-name", text: mv.name }),
            el("span", {
              className: "cdx-move-num",
              text: `${mv.power || "—"} PWR · ${mv.accuracy}% · ${mv.stamina} STA`,
            }),
          ]),
        );
      }

      if (index !== 0) {
        bodyScroll.append(
          el("button", {
            className: "chunky-btn primary cdx-primary-btn",
            text: "Make Lead",
            onClick: () => {
              const party = game.player.party;
              [party[0], party[index]] = [party[index], party[0]];
              leadChanged = true;
              partyDetail = 0;
              toast(`${mon.nickname ?? def.name} — Lead!`);
              render();
            },
          }),
        );
      } else {
        bodyScroll.append(
          el("div", { className: "cdx-note" }, [
            el("b", { text: "Lead" }),
            "This one heads into battle first.",
          ]),
        );
      }
    }

    function restAll(): void {
      for (const mon of game.player.party) {
        const def = game.data.species[mon.speciesId];
        mon.currentHp = maxHpAt(def.baseStats.hp, mon.level);
        mon.status = null;
      }
      cozyFlash();
      toast("Your party is fully rested ✿");
      render();
    }

    function cozyFlash(): void {
      const flash = el("div");
      Object.assign(flash.style, {
        position: "fixed",
        inset: "0",
        background:
          "radial-gradient(circle at 50% 60%, rgba(255,230,180,0.7), rgba(255,214,107,0))",
        pointerEvents: "none",
        zIndex: "55",
        opacity: "0",
        transition: "opacity 0.35s ease",
      } as CSSStyleDeclaration);
      game.uiRoot.append(flash);
      requestAnimationFrame(() => (flash.style.opacity = "1"));
      setTimeout(() => {
        flash.style.opacity = "0";
        setTimeout(() => flash.remove(), 400);
      }, 300);
    }

    // ---- LEDGER (the dex) ------------------------------------------------
    function sortedSpecies(): SpeciesDef[] {
      return Object.values(game.data.species).sort((a, b) => {
        const r = (ROLE_RANK[a.role] ?? 4) - (ROLE_RANK[b.role] ?? 4);
        return r !== 0 ? r : a.name.localeCompare(b.name);
      });
    }

    function dexNumber(id: string): string {
      const idx = sortedSpecies().findIndex((s) => s.id === id);
      return String(idx + 1).padStart(2, "0");
    }

    function renderLedger(): void {
      const all = sortedSpecies();
      const registered = new Set(game.player.registered);
      renderHead("Ledger", { sub: `${registered.size} / ${all.length} synced` });

      const grid = el("div", { className: "cdx-ledger-grid" });
      all.forEach((species, i) => {
        const num = String(i + 1).padStart(2, "0");
        if (registered.has(species.id)) {
          grid.append(
            el(
              "button",
              {
                className: "cdx-cell",
                onClick: () => {
                  ledgerDetail = species.id;
                  render();
                },
              },
              [
                el("span", { className: "cdx-num", text: `#${num}` }),
                creatureImg(species.id),
                el("div", { text: species.name }),
              ],
            ),
          );
        } else {
          const ghost = el("img");
          ghost.src = placeholderDataUrl(species.id);
          grid.append(
            el("div", { className: "cdx-cell locked" }, [
              el("span", { className: "cdx-num", text: `#${num}` }),
              ghost,
              el("div", { text: "?" }),
            ]),
          );
        }
      });
      bodyScroll.append(grid);
    }

    function renderLedgerDetail(id: string): void {
      const species = game.data.species[id];
      const registered = new Set(game.player.registered);

      renderHead("Ledger", {
        sub: `#${dexNumber(id)}`,
        onBack: () => {
          ledgerDetail = null;
          render();
        },
      });

      bodyScroll.append(
        el("div", { className: "cdx-detail cdx-detail-hero" }, [
          creatureImg(species.id),
          el("div", {}, [
            el("h2", { text: species.name }),
            el("div", { className: "cdx-chips", html: species.types.map(typeChip).join("") }),
          ]),
        ]),
      );

      // Procedural species open in the 3D workshop (spin/drag/verbs/shiny).
      if (hasProtoPortrait(species.id)) {
        const link = el("a", {
          className: "cdx-3d-link",
          text: "✦ View in 3D",
        }) as HTMLAnchorElement;
        link.href = `/proto-preview.html?species=${species.id}`;
        link.target = "_blank";
        link.rel = "noopener";
        bodyScroll.append(link);
      }

      bodyScroll.append(el("div", { className: "cdx-section-label", text: "Field Entry" }));
      bodyScroll.append(el("div", { className: "cdx-entry", text: species.dexEntry }));

      bodyScroll.append(el("div", { className: "cdx-section-label", text: "Base Stats" }));
      for (const s of STAT_NAMES) {
        bodyScroll.append(statBar(s, species.baseStats[s], BASE_STAT_MAX));
      }

      const chain = evolutionChain(species.id);
      if (chain.length > 1) {
        bodyScroll.append(el("div", { className: "cdx-section-label", text: "Evolution" }));
        const evo = el("div", { className: "cdx-evo" });
        chain.forEach((stage, i) => {
          if (i > 0) evo.append(el("span", { className: "cdx-evo-arrow", text: "→" }));
          const known = registered.has(stage.id);
          const cls = `cdx-evo-stage${stage.id === species.id ? " here" : ""}${known ? "" : " locked"}`;
          const img = el("img");
          if (known) {
            img.src = spritePath(stage.id);
            img.onerror = () => {
              img.onerror = null;
              img.src = placeholderDataUrl(stage.id);
            };
          } else {
            img.src = placeholderDataUrl(stage.id);
          }
          const cell = el("div", { className: cls }, [
            img,
            el("div", { className: "nm", text: known ? stage.name : "???" }),
          ]);
          if (stage.evolveLevel) {
            cell.append(el("div", { className: "lvl", text: `Lv ${stage.evolveLevel}` }));
          }
          evo.append(cell);
        });
        bodyScroll.append(evo);
      }

      if (species.inspiration) {
        bodyScroll.append(
          el("div", { className: "cdx-note" }, [
            el("b", { text: "Archivist's note" }),
            species.inspiration,
          ]),
        );
      }
    }

    // Build the full evolution line a species belongs to, walking back to the
    // root then forward via evolvesTo.
    function evolutionChain(id: string): SpeciesDef[] {
      const species = game.data.species;
      let root = species[id];
      let guard = 0;
      for (;;) {
        const prev = Object.values(species).find((s) => s.evolvesTo === root.id);
        if (!prev || guard++ > 8) break;
        root = prev;
      }
      const chain: SpeciesDef[] = [root];
      let cur = root;
      while (cur.evolvesTo && species[cur.evolvesTo] && chain.length < 8) {
        cur = species[cur.evolvesTo];
        chain.push(cur);
      }
      return chain;
    }

    // ---- SYSTEM ----------------------------------------------------------
    function renderSystem(): void {
      renderHead("System");

      bodyScroll.append(
        el("button", {
          className: "chunky-btn primary cdx-sys-btn",
          text: "Save Journey",
          onClick: () => {
            game.save();
            toast("Saved to Codex ✓");
          },
        }),
        el("button", {
          className: "chunky-btn danger cdx-sys-btn",
          text: "New Game",
          onClick: () => confirmNewGame(),
        }),
      );

      const link = el("a", { text: "github.com/ilrein/gaiamon" });
      link.setAttribute("href", "https://github.com/ilrein/gaiamon");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
      const credits = el("div", { className: "cdx-credits" }, [
        el("div", { text: "Gaiamon — open source, MIT licensed." }),
        el("div", {}, ["Source: ", link]),
      ]);
      bodyScroll.append(credits, el("div", { className: "cdx-ver", text: VERSION }));
    }

    function confirmNewGame(): void {
      // One confirm at a time, hosted inside the codex root so closing the
      // codex tears it down too (never stacks in uiRoot).
      screen.querySelector(".cdx-confirm")?.remove();
      const panel = el("div", { className: "cdx-confirm" }, [
        el("div", { className: "cdx-confirm-msg", text: "Erase this journey and start over?" }),
        el("div", { className: "cdx-confirm-row" }, [
          el("button", {
            className: "chunky-btn",
            text: "Cancel",
            onClick: () => panel.remove(),
          }),
          el("button", {
            className: "chunky-btn danger",
            text: "Erase",
            onClick: () => {
              clearSave();
              location.reload();
            },
          }),
        ]),
      ]);
      screen.append(panel);
    }

    // ---- small view helpers ---------------------------------------------
    function hpBar(pct: number): HTMLElement {
      const fill = el("div", { className: hpFillClass(pct) });
      fill.style.width = `${pct}%`;
      return el("div", { className: "hp-bar" }, [fill]);
    }

    function statBar(label: string, value: number, max: number): HTMLElement {
      const bar = el("i");
      bar.style.width = `${clampPct((value / max) * 100)}%`;
      return el("div", { className: "cdx-statbar" }, [
        el("span", { className: "lbl", text: label }),
        el("div", { className: "track" }, [bar]),
        el("span", { className: "val", text: String(value) }),
      ]);
    }

    function xpToNextLabel(mon: MonsterInstance): string {
      if (mon.level >= 40) return "MAX";
      const toNext = xpForLevel(mon.level + 1) - mon.xp;
      return `${Math.max(0, toNext)} XP → Lv ${mon.level + 1}`;
    }

    render();
  });
}

