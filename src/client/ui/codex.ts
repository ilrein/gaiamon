// The Codex: the game's one menu. A bottom-sheet over the world with PARTY /
// DEX / SYSTEM tabs. It's the in-world ancient-tech field terminal, so it looks
// like a chunky handheld device and is fully usable one-thumb on a phone.

import type { Game } from "../game";
import { el } from "../dom";
import { creatureImg, placeholderDataUrl } from "../sprites";
import { typeChip } from "../colors";
import { clearSave } from "../save";
import { maxHpAt, xpForLevel } from "../../shared/stats";
import type { MonsterInstance, SpeciesRole } from "../../shared/model";

type Tab = "party" | "dex" | "system";
const VERSION = "v0.0.1";

// Dex display order: starter lines first (verdant, ember, tide), then wilds,
// titans last. Anything unexpected sorts just before titans.
const ROLE_RANK: Record<SpeciesRole, number> = {
  "starter-verdant": 0,
  "starter-ember": 1,
  "starter-tide": 2,
  wild: 3,
  titan: 5,
};

export async function openCodex(
  game: Game,
  opts: { healer?: boolean } = {},
): Promise<"closed" | "lead-changed"> {
  return new Promise((resolve) => {
    let leadChanged = false;
    let tab: Tab = "party";

    const wrap = el("div", { className: "codex-root" });
    const backdrop = el("div", {
      onClick: (e) => {
        if (e.target === backdrop) close();
      },
    });
    Object.assign(backdrop.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(20, 24, 34, 0.4)",
    } as CSSStyleDeclaration);

    const sheet = el("div", { className: "codex-sheet" });
    const closeBtn = el("button", { text: "✕", onClick: () => close() });
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "10px",
      right: "12px",
      width: "34px",
      height: "34px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.12)",
      color: "var(--paper)",
      fontSize: "16px",
      fontWeight: "800",
      zIndex: "2",
    } as CSSStyleDeclaration);

    const tabBar = el("div", { className: "codex-tabs" });
    const body = el("div", { className: "codex-body" });
    sheet.append(closeBtn, tabBar, body);
    wrap.append(backdrop, sheet);
    game.uiRoot.append(wrap);

    function close(): void {
      wrap.remove();
      resolve(leadChanged ? "lead-changed" : "closed");
    }

    function toast(text: string): void {
      const t = el("div", { text });
      Object.assign(t.style, {
        position: "fixed",
        left: "50%",
        top: "14%",
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

    function render(): void {
      // Tabs
      tabBar.replaceChildren();
      for (const [id, label] of [
        ["party", "PARTY"],
        ["dex", "DEX"],
        ["system", "SYSTEM"],
      ] as [Tab, string][]) {
        tabBar.append(
          el("button", {
            className: `codex-tab${tab === id ? " active" : ""}`,
            text: label,
            onClick: () => {
              if (tab !== id) {
                tab = id;
                render();
              }
            },
          }),
        );
      }
      // Body
      body.replaceChildren();
      if (tab === "party") renderParty();
      else if (tab === "dex") renderDex();
      else renderSystem();
    }

    // ---- PARTY -------------------------------------------------------------
    function renderParty(): void {
      if (opts.healer) {
        body.append(
          el("button", {
            className: "chunky-btn primary",
            text: "Rest at the Waystone",
            onClick: () => restAll(),
          }),
        );
        (body.lastElementChild as HTMLElement).style.width = "100%";
        (body.lastElementChild as HTMLElement).style.marginBottom = "12px";
      }

      game.player.party.forEach((mon, i) => {
        body.append(partyRow(mon, i));
      });
    }

    function partyRow(mon: MonsterInstance, index: number): HTMLElement {
      const def = game.data.species[mon.speciesId];
      const maxHp = maxHpAt(def.baseStats.hp, mon.level);
      const pct = Math.max(0, Math.min(100, (mon.currentHp / maxHp) * 100));
      const fillClass = pct <= 20 ? "fill crit" : pct <= 50 ? "fill warn" : "fill";

      const fill = el("div", { className: fillClass });
      fill.style.width = `${pct}%`;
      const hpBar = el("div", { className: "hp-bar" }, [fill]);

      const nameLine = el("div", {}, [
        el("b", { text: mon.nickname ?? def.name }),
        el("span", { text: ` Lv ${mon.level}` }),
      ]);
      (nameLine.lastElementChild as HTMLElement).style.opacity = "0.7";
      (nameLine.lastElementChild as HTMLElement).style.fontSize = "13px";
      if (index === 0) {
        const leadTag = el("span", { text: "LEAD" });
        Object.assign(leadTag.style, {
          marginLeft: "6px",
          fontSize: "10px",
          fontWeight: "800",
          background: "var(--sun)",
          color: "var(--ink)",
          padding: "1px 7px",
          borderRadius: "999px",
        } as CSSStyleDeclaration);
        nameLine.append(leadTag);
      }

      const chips = el("div", { html: def.types.map(typeChip).join(" ") });
      chips.style.margin = "3px 0";

      const meta = el("div", {}, []);
      meta.style.display = "flex";
      meta.style.alignItems = "center";
      meta.style.gap = "8px";
      meta.style.marginTop = "4px";
      meta.style.fontSize = "12px";
      meta.style.opacity = "0.85";
      meta.append(el("span", { text: `${mon.currentHp}/${maxHp} HP` }));
      if (mon.status) {
        const st = game.data.statuses[mon.status];
        const chip = el("span", { text: st?.name ?? mon.status, className: "status-chip" });
        meta.append(chip);
      }
      const toNext = xpForLevel(mon.level + 1) - mon.xp;
      meta.append(
        el("span", {
          text: mon.level >= 40 ? "MAX" : `${Math.max(0, toNext)} XP → Lv ${mon.level + 1}`,
        }),
      );

      const info = el("div", { className: "info" }, [nameLine, chips, hpBar, meta]);
      const row = el("div", { className: "party-row" }, [creatureImg(mon.speciesId), info]);

      if (index !== 0) {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
          const party = game.player.party;
          [party[0], party[index]] = [party[index], party[0]];
          leadChanged = true;
          toast(`${mon.nickname ?? def.name} — Lead!`);
          render();
        });
      }
      return row;
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
        background: "radial-gradient(circle at 50% 60%, rgba(255,230,180,0.7), rgba(255,214,107,0))",
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

    // ---- DEX ---------------------------------------------------------------
    function renderDex(): void {
      const all = Object.values(game.data.species).sort((a, b) => {
        const r = (ROLE_RANK[a.role] ?? 4) - (ROLE_RANK[b.role] ?? 4);
        return r !== 0 ? r : a.name.localeCompare(b.name);
      });
      const registered = new Set(game.player.registered);

      const header = el("div", {
        text: `${registered.size} / ${all.length} synced`,
      });
      Object.assign(header.style, {
        fontWeight: "800",
        fontSize: "14px",
        margin: "2px 4px 10px",
        opacity: "0.9",
      } as CSSStyleDeclaration);
      body.append(header);

      const grid = el("div", { className: "dex-grid" });
      for (const species of all) {
        if (registered.has(species.id)) {
          grid.append(
            el("div", { className: "dex-cell" }, [
              creatureImg(species.id),
              el("div", { text: species.name }),
            ]),
          );
        } else {
          const ghost = el("img");
          ghost.src = placeholderDataUrl(species.id);
          grid.append(el("div", { className: "dex-cell unknown" }, [ghost, el("div", { text: "?" })]));
        }
      }
      body.append(grid);
    }

    // ---- SYSTEM ------------------------------------------------------------
    function renderSystem(): void {
      const saveBtn = el("button", {
        className: "chunky-btn primary",
        text: "Save Journey",
        onClick: () => {
          game.save();
          toast("Saved to Codex ✓");
        },
      });
      const newBtn = el("button", {
        className: "chunky-btn danger",
        text: "New Game",
        onClick: () => confirmNewGame(),
      });
      for (const b of [saveBtn, newBtn]) {
        b.style.width = "100%";
        b.style.marginBottom = "10px";
      }
      body.append(saveBtn, newBtn);

      const credits = el("div", {}, [
        el("span", { text: "Gaiamon — open source, MIT — " }),
        el("a", { text: "github.com/ilrein/gaiamon" }),
      ]);
      const link = credits.querySelector("a")!;
      link.setAttribute("href", "https://github.com/ilrein/gaiamon");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
      link.style.color = "var(--sun)";
      Object.assign(credits.style, {
        fontSize: "12px",
        opacity: "0.8",
        marginTop: "8px",
        lineHeight: "1.5",
      } as CSSStyleDeclaration);
      const ver = el("div", { text: VERSION });
      ver.style.fontSize = "11px";
      ver.style.opacity = "0.5";
      ver.style.marginTop = "4px";
      body.append(credits, ver);
    }

    function confirmNewGame(): void {
      // One confirm at a time, and it lives inside the codex root so closing
      // the codex removes it too (review finding: it stacked in uiRoot).
      wrap.querySelector(".confirm-newgame")?.remove();
      const panel = el("div", { className: "panel confirm-newgame" }, [
        el("div", { text: "Erase this journey and start over?" }),
        el("div", {}, [
          el("button", { className: "chunky-btn", text: "Cancel", onClick: () => panel.remove() }),
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
      Object.assign(panel.style, {
        position: "fixed",
        left: "50%",
        bottom: "calc(24px + var(--safe-bottom))",
        transform: "translateX(-50%)",
        width: "min(360px, calc(100vw - 32px))",
        textAlign: "center",
        zIndex: "60",
      } as CSSStyleDeclaration);
      const actions = panel.lastElementChild as HTMLElement;
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.justifyContent = "center";
      actions.style.marginTop = "12px";
      wrap.append(panel);
    }

    render();
  });
}
