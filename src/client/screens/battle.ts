// The battle screen: a pure event-playback layer over the shared battle engine.
// The turn loop is: player picks an action -> chooseFoeAction -> stepBattle ->
// play the returned BattleEvent[] back sequentially as tweens + DOM effects.
// The engine mutates the live MonsterInstance references it was handed; this
// screen never decides battle outcomes, it only performs them.

import * as THREE from "three";
import type { Game, Screen } from "../game";
import type { BattleAction, BattleConfig, BattleEvent, BattleState, Side } from "../../shared/battle";
import { FLAIL, MAX_STAMINA, forceSwitch, startBattle, stepBattle } from "../../shared/battle";
import { chooseFoeAction } from "../../shared/ai";
import type { MonsterInstance, MoveCategory, TypeId } from "../../shared/model";
import { maxHpAt, xpForLevel } from "../../shared/stats";
import { makeRng, type Rng } from "../../shared/rng";
import { el } from "../dom";
import { typeChip, TYPE_COLORS } from "../colors";
import { creatureImg } from "../sprites";
import { clampPct, hpFillClass } from "../ui/format";
import {
  type BattleScene,
  type CombatantView,
  type SyncRing,
  ImpactFX,
  Tweens,
  buildBattleScene,
  easeInCubic,
  easeOutBack,
  easeOutCubic,
  makeCombatantView,
  makeSyncRing,
  worldToScreen,
} from "./battle-fx";
import { PostFX } from "../postfx";

export interface BattleScreenOpts {
  config: BattleConfig;
  playerParty: MonsterInstance[];
  foeParty: MonsterInstance[];
  backdrop: { ground1: string; ground2: string; fog: string };
  opponentTitle?: string;
  onFinish: (result: {
    outcome: BattleState["outcome"];
    syncedSpeciesId: string | null;
    /** Whether the synced wild mon rolled shiny at encounter time. */
    syncedShiny: boolean;
  }) => void;
}

/** Sprite world-height per species stage; titans loom. */
// Tuned for the alpha-trimmed sprites (content fills the quad now); the
// player-side back sprite gets a further trim so it frames instead of crops.
// Small, side-by-side combatants (user direction): both share the same scale
// treatment in the left-vs-right arena.
const STAGE_SCALE: Record<number, number> = { 1: 1.35, 2: 1.65, 3: 1.95 };
const TITAN_SCALE = 3.4;

const CONFETTI = ["#ffd66b", "#8ee08a", "#6ab8e8", "#e8a8d0", "#ffffff"];
const GREENS = ["#8ee08a", "#b6f0a0", "#5cc95c", "#e9ffd8"];

interface PlaybackMon {
  mon: MonsterInstance;
  hp: number;
  max: number;
  status: string | null;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

export class BattleScreen implements Screen {
  private readonly opts: BattleScreenOpts;
  private readonly state: BattleState;
  private readonly rng: Rng;
  private readonly tweens = new Tweens();

  private game!: Game;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private camBase!: THREE.Vector3;
  private lookAt!: THREE.Vector3;
  private playerPos!: THREE.Vector3;
  private foePos!: THREE.Vector3;

  private views!: { player: CombatantView; foe: CombatantView };
  private pb!: { player: PlaybackMon; foe: PlaybackMon };
  private impactFx!: ImpactFX;
  private postfx!: PostFX;

  // Hit-stop: a global freeze (seconds of real time) the update loop honors by
  // feeding 0 to the tween/idle-bob/FX time. Set on damage playback to sell the
  // impact before the shake resolves.
  private hitStop = 0;
  // The move being played back drives which impact recipe fires. Carried from
  // the preceding `moveUsed` event into the `damage` events that follow it.
  private lastMoveType: TypeId = "neutral";
  private lastMoveCategory: MoveCategory = "physical";

  private battleUi!: HTMLElement;
  private fxLayer!: HTMLElement;
  private logEl!: HTMLElement;
  private foeCard!: HTMLElement;
  private allyCard!: HTMLElement;
  private menuEl!: HTMLElement;

  private elapsed = 0;
  private alive = true;
  private camPush = 0;
  private camShakeX = 0;
  private camShakeY = 0;
  private renderW = window.innerWidth;
  private renderH = window.innerHeight;
  private syncRing: SyncRing | null = null;
  private syncedSpeciesId: string | null = null;
  private syncedShiny = false;
  private pendingEvolutions: { monUid: string; toSpeciesId: string }[] = [];

  constructor(opts: BattleScreenOpts) {
    this.opts = opts;
    this.state = startBattle(opts.config, opts.playerParty, opts.foeParty);
    this.rng = makeRng(Date.now() >>> 0);
  }

  private get data() {
    return this.game.data;
  }

  // ---- lifecycle ---------------------------------------------------------
  mount(game: Game): void {
    this.game = game;
    this.pb = {
      player: this.mkPb(this.state.player.active.mon),
      foe: this.mkPb(this.state.foe.active.mon),
    };

    const titanScene = this.data.species[this.pb.foe.mon.speciesId]?.role === "titan";
    const bs: BattleScene = buildBattleScene(this.opts.backdrop, titanScene);
    this.scene = bs.scene;
    this.camera = bs.camera;
    this.camBase = bs.camBase.clone();
    this.lookAt = bs.lookAt;
    this.playerPos = bs.playerPos;
    this.foePos = bs.foePos;
    this.platforms = bs.platforms;

    this.renderer = game.renderer; // proto views bake their meshes on the GPU
    this.views = { player: this.spawnView("player"), foe: this.spawnView("foe") };

    this.impactFx = new ImpactFX();
    this.scene.add(this.impactFx.group);

    // HD-2D post stack (bloom + tilt-shift + vignette + grade).
    // No tilt-shift in battle: the combatants span the frame vertically, so
    // the focus band was blurring their faces.
    this.postfx = new PostFX(game.renderer, this.scene, this.camera, { tiltShift: false });

    this.buildDom(game.uiRoot);
    this.renderCard("foe");
    this.renderCard("player");
    this.resize(game, window.innerWidth, window.innerHeight);

    void this.run();
  }

  unmount(): void {
    this.alive = false;
    this.tweens.clear();
    this.postfx?.dispose();
    // Frees the FX pool's shared geometry + per-particle materials + the 12
    // cached shape textures (which the traverse below would otherwise miss for
    // any shape that never spawned).
    this.impactFx?.dispose();
    this.scene?.traverse((o) => {
      const any = o as unknown as { geometry?: { dispose?: () => void }; material?: unknown };
      any.geometry?.dispose?.();
      const mats = Array.isArray(any.material) ? any.material : [any.material];
      for (const mat of mats) {
        const m = mat as { dispose?: () => void; map?: { dispose?: () => void } } | undefined;
        // Material.dispose() does NOT free its texture — do it explicitly
        // (the per-battle ground-disc CanvasTexture was leaking).
        m?.map?.dispose?.();
        m?.dispose?.();
      }
    });
  }

  update(game: Game, dt: number): void {
    if (!this.alive) return;
    // Hit-stop: while frozen, feed 0 to everything time-driven (tweens, idle-bob,
    // sync-ring spin, FX) so the frame holds; the timer itself burns real dt.
    let s = dt;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      s = 0;
    }
    this.tweens.update(s);
    this.elapsed += s;

    for (const side of ["player", "foe"] as Side[]) {
      const v = this.views[side];
      if (!v || !v.group.visible) continue;
      v.update?.(this.elapsed); // proto idle/verb clock (frozen by hit-stop)
      if (v.fainting) continue;
      // proto meshes breathe in-shader and stand on the ground; only the
      // billboard/voxel renderers get the hover-bob
      const bob = v.kind === "proto" ? 0 : Math.sin(this.elapsed * 2 + v.phase) * 0.06;
      v.group.position.set(
        v.basePos.x + v.offset.x,
        v.basePos.y + v.offset.y + bob,
        v.basePos.z + v.offset.z,
      );
    }

    if (this.syncRing) this.syncRing.ticks.rotation.y += s * 2.4;
    this.impactFx.update(s, this.camera);

    const sway = Math.sin(this.elapsed * 0.5) * 0.15;
    this.camera.position.set(
      this.camBase.x + sway + this.camShakeX,
      this.camBase.y + this.camShakeY + this.portraitPull * 0.25,
      this.camBase.z - this.camPush + this.portraitPull,
    );
    this.camera.lookAt(this.lookAt.x, this.lookAt.y - this.portraitLift, this.lookAt.z);
    this.postfx.render(dt);
  }

  resize(_game: Game, width: number, height: number): void {
    this.renderW = width;
    this.renderH = height;
    if (this.camera) {
      const aspect = width / height;
      this.camera.aspect = aspect;
      // Portrait phones: pull the camera back so both combatants fit without
      // the player mon swallowing the screen.
      this.portraitPull = aspect < 0.8 ? (0.8 - aspect) * 9 : 0;
      // Aim lower on portrait so the arena rides up the tall screen instead of
      // leaving half the frame as empty sky above a crowded bottom.
      this.portraitLift = aspect < 0.8 ? 0.6 : 0;
      this.camera.updateProjectionMatrix();

      this.applyLayout();
    }
    this.postfx?.resize(width, height);
  }
  private portraitPull = 0;
  private portraitLift = 0;

  // ---- setup helpers -----------------------------------------------------
  private mkPb(mon: MonsterInstance): PlaybackMon {
    const sp = this.data.species[mon.speciesId];
    return { mon, hp: mon.currentHp, max: maxHpAt(sp.baseStats.hp, mon.level), status: mon.status };
  }

  private scaleFor(speciesId: string): number {
    const sp = this.data.species[speciesId];
    if (sp.role === "titan") return TITAN_SCALE;
    return STAGE_SCALE[sp.stage] ?? 2.4;
  }

  private spawnView(side: Side): CombatantView {
    const mon = this.pb[side].mon;
    const sp = this.data.species[mon.speciesId];
    const scale = this.scaleFor(mon.speciesId);
    // Natural scale per side; applyLayout() derives the on-screen framing
    // (portrait squeezes both inward and down) after every spawn/resize.
    this.baseScales[side] = scale;
    const phase = side === "player" ? 0 : Math.PI;
    const v = makeCombatantView(mon.speciesId, scale, phase, {
      titan: sp.role === "titan",
      renderer: this.renderer ?? undefined,
      shinySeed: (mon as { shiny?: boolean }).shiny ? 2.6 : 0,
    });
    const pos = side === "player" ? this.playerPos : this.foePos;
    v.basePos.copy(pos);
    v.group.position.copy(v.basePos);
    this.scene.add(v.group);
    return v;
  }

  /** Left-vs-right framing for the current aspect: portrait pulls both
   *  creatures (and their platforms) inward and shrinks them so the arena
   *  fits a tall screen. */
  private applyLayout(): void {
    const portrait = this.renderW / this.renderH < 0.8;
    const factor = portrait ? 0.72 : 1;
    const anchors: Record<Side, THREE.Vector3> = { player: this.playerPos, foe: this.foePos };
    (["player", "foe"] as Side[]).forEach((side, i) => {
      const v = this.views?.[side];
      if (!v) return;
      const x = portrait ? Math.sign(anchors[side].x) * 0.95 : anchors[side].x;
      const base = this.baseScales[side];
      if (base > 0) {
        v.scale = base * factor;
        if (!v.fainting) {
          v.setScale(v.scale, v.scale);
        }
      }
      v.basePos.x = x;
      const plat = this.platforms[i];
      if (plat) plat.position.x = x;
    });
  }
  private baseScales: Record<Side, number> = { player: 0, foe: 0 };
  private platforms: THREE.Mesh[] = [];
  private renderer: THREE.WebGLRenderer | null = null;

  private buildDom(uiRoot: HTMLElement): void {
    this.battleUi = el("div", { className: "battle-ui" });
    this.foeCard = el("div", { className: "panel hp-card foe" });
    this.allyCard = el("div", { className: "panel hp-card ally" });
    this.logEl = el("div", { className: "panel battle-log" });
    this.logEl.style.display = "none";
    this.menuEl = el("div", { className: "battle-menu" });
    this.fxLayer = el("div");
    this.fxLayer.style.cssText =
      "position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:5;";
    this.battleUi.append(this.foeCard, this.allyCard, this.logEl, this.menuEl);
    uiRoot.append(this.battleUi, this.fxLayer);
  }

  // ---- HP cards ----------------------------------------------------------
  private cardEl(side: Side): HTMLElement {
    return side === "foe" ? this.foeCard : this.allyCard;
  }

  private renderCard(side: Side): void {
    const card = this.cardEl(side);
    const { mon, hp, max, status } = this.pb[side];
    const sp = this.data.species[mon.speciesId];
    const name = mon.nickname ?? sp.name;
    const pct = clampPct((hp / max) * 100);
    const fillCls = hpFillClass(pct);
    const statusName = status ? (this.data.statuses[status]?.name ?? "") : "";
    const rows: string[] = [
      `<div class="name-row"><span class="mon-name">${esc(name)}</span><span class="level">Lv ${mon.level}</span></div>`,
      `<div class="hp-bar"><div class="${fillCls}" style="width:${pct}%"></div></div>`,
      `<div class="status-chip" style="${statusName ? "" : "display:none"}">${esc(statusName)}</div>`,
    ];
    if (side === "player") {
      rows.push(`<div class="xp-bar"><div class="fill" style="width:${this.xpFraction(mon) * 100}%"></div></div>`);
      rows.push(this.staminaRowHtml());
    }
    card.innerHTML = rows.join("");
  }

  private staminaRowHtml(): string {
    const stam = this.state.player.active.stamina;
    let pips = "";
    for (let i = 0; i < MAX_STAMINA; i++) {
      const on = i < stam;
      pips += `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:2px;background:${on ? "var(--sun)" : "var(--paper-dim)"}"></span>`;
    }
    return `<div class="stamina-row" style="margin-top:5px;line-height:0">${pips}</div>`;
  }

  private xpFraction(mon: MonsterInstance): number {
    const cur = xpForLevel(mon.level);
    const next = xpForLevel(mon.level + 1);
    return next > cur ? Math.max(0, Math.min(1, (mon.xp - cur) / (next - cur))) : 1;
  }

  private applyHp(side: Side): void {
    const fill = this.cardEl(side).querySelector<HTMLElement>(".hp-bar > .fill");
    if (!fill) return;
    const { hp, max } = this.pb[side];
    const pct = clampPct((hp / max) * 100);
    fill.style.width = `${pct}%`;
    fill.className = hpFillClass(pct);
  }

  private applyStatusChip(side: Side): void {
    const chip = this.cardEl(side).querySelector<HTMLElement>(".status-chip");
    if (!chip) return;
    const st = this.pb[side].status;
    const nm = st ? (this.data.statuses[st]?.name ?? "") : "";
    chip.textContent = nm;
    chip.style.display = nm ? "" : "none";
  }

  private applyXp(): void {
    const xp = this.allyCard.querySelector<HTMLElement>(".xp-bar > .fill");
    if (xp) xp.style.width = `${this.xpFraction(this.pb.player.mon) * 100}%`;
  }

  private applyStamina(): void {
    const row = this.allyCard.querySelector<HTMLElement>(".stamina-row");
    if (row) row.innerHTML = this.staminaRowHtml().replace(/^<div[^>]*>|<\/div>$/g, "");
  }

  // ---- names -------------------------------------------------------------
  private monName(mon: MonsterInstance | undefined): string {
    if (!mon) return "Your monster";
    return mon.nickname ?? this.data.species[mon.speciesId].name;
  }

  private name(side: Side): string {
    return this.monName(this.pb[side].mon);
  }

  private foeSpeciesName(): string {
    return this.data.species[this.pb.foe.mon.speciesId].name;
  }

  private findMon(uid: string): MonsterInstance | undefined {
    return [...this.opts.playerParty, ...this.opts.foeParty].find((m) => m.uid === uid);
  }

  private other(side: Side): Side {
    return side === "player" ? "foe" : "player";
  }

  // ---- log ---------------------------------------------------------------
  private log(text: string): void {
    this.logEl.style.display = "";
    this.logEl.textContent = text;
    this.logEl.style.animation = "none";
    void this.logEl.offsetWidth; // reflow to restart the pop-in
    this.logEl.style.animation = "";
  }

  // ---- turn loop ---------------------------------------------------------
  private async run(): Promise<void> {
    await this.intro();
    while (this.state.outcome === "ongoing" && this.alive) {
      const action = await this.awaitPlayerAction();
      if (!this.alive) return;
      this.clearMenu();
      const foeAction = chooseFoeAction(this.data, this.state, this.rng);
      const events = stepBattle(this.data, this.state, action, foeAction, this.rng);
      await this.playEvents(events);
      if (!this.alive) return;
      if (this.state.outcome === "ongoing" && this.state.player.active.mon.currentHp <= 0) {
        await this.forcedSwitch();
      }
    }
    if (!this.alive) return;
    for (const ev of this.pendingEvolutions) await this.playEvolution(ev);
    await this.tweens.wait(0.3);
    this.opts.onFinish({
      outcome: this.state.outcome,
      syncedSpeciesId: this.syncedSpeciesId,
      syncedShiny: this.syncedShiny,
    });
  }

  private async intro(): Promise<void> {
    if (this.opts.opponentTitle) {
      await this.banner(this.opts.opponentTitle);
      this.log(`${this.opts.opponentTitle} wants to battle!`);
    } else {
      this.log(`A wild ${this.foeSpeciesName()} appeared!`);
    }
    await this.tweens.wait(0.7);
  }

  private async playEvents(events: BattleEvent[]): Promise<void> {
    for (const e of events) {
      if (!this.alive) return;
      await this.handle(e);
    }
  }

  // ---- event handlers ----------------------------------------------------
  private async handle(e: BattleEvent): Promise<void> {
    switch (e.kind) {
      case "text":
        this.log(e.text);
        await this.tweens.wait(0.6);
        break;

      case "moveUsed": {
        const mv = this.data.moves[e.moveId];
        this.lastMoveType = mv?.type ?? "neutral";
        this.lastMoveCategory = mv?.category ?? "physical";
        this.log(`${this.name(e.side)} used ${e.moveName}!`);
        await this.lunge(e.side);
        break;
      }

      case "damage": {
        this.pb[e.side].hp = e.hpAfter;
        this.pb[e.side].max = e.maxHp;
        this.applyHp(e.side);
        this.playMoveImpact(e.side, e.effectiveness, e.crit);
        // Freeze on contact, then let the shake resolve. Crits hold longer.
        this.hitStop = e.crit ? 0.14 : 0.07;
        this.views[e.side].verb?.("hit"); // proto: jelly wobble + knockback
        await Promise.all([this.flash(e.side), this.shake(e.side, e.crit ? 0.26 : 0.12)]);
        this.floatText(e.side, String(e.amount), e.crit ? "#ffec7a" : "#ffffff", e.crit);
        if (e.crit) {
          this.log("Critical hit!");
          await this.tweens.wait(0.4);
        }
        const t = this.effText(e.effectiveness);
        if (t) {
          this.log(t);
          await this.tweens.wait(0.5);
        }
        if (!e.crit && !t) await this.tweens.wait(0.3);
        break;
      }

      case "miss":
        this.log("It missed!");
        await this.sidestep(this.other(e.side));
        await this.tweens.wait(0.2);
        break;

      case "statStage": {
        const up = e.stages > 0;
        this.chevrons(e.side, up);
        const statName = { attack: "Attack", defense: "Defense", spirit: "Spirit", speed: "Speed" }[
          e.stat
        ];
        const mag = Math.abs(e.stages);
        const verb = up
          ? mag >= 2
            ? "rose sharply"
            : "rose"
          : mag >= 2
            ? "fell sharply"
            : "fell";
        this.log(`${this.name(e.side)}'s ${statName} ${verb}!`);
        await this.tweens.wait(0.5);
        break;
      }

      case "statusApplied":
        this.pb[e.side].status = e.statusId;
        this.applyStatusChip(e.side);
        this.impactFx.spawnImpact(this.worldChest(e.side), "wisp", this.statusColor(e.statusId), 8);
        await this.tintFlash(e.side, 0xc9a0ff);
        this.log(`${this.name(e.side)} ${this.data.statuses[e.statusId]?.flavor ?? "is afflicted"}!`);
        await this.tweens.wait(0.4);
        break;

      case "statusEnded": {
        this.pb[e.side].status = null;
        this.applyStatusChip(e.side);
        const nm = this.data.statuses[e.statusId]?.name ?? "The status";
        this.log(`${this.name(e.side)}'s ${nm} faded.`);
        await this.tweens.wait(0.35);
        break;
      }

      case "statusHurt":
        this.pb[e.side].hp = e.hpAfter;
        this.pb[e.side].max = e.maxHp;
        this.applyHp(e.side);
        await this.tintFlash(e.side, 0xff6a4a);
        this.floatText(e.side, String(e.amount), "#ff9a6a");
        this.log(`${this.name(e.side)} ${this.data.statuses[e.statusId]?.flavor ?? "is hurt"}!`);
        await this.tweens.wait(0.4);
        break;

      case "heal":
        this.pb[e.side].hp = e.hpAfter;
        this.pb[e.side].max = e.maxHp;
        this.applyHp(e.side);
        this.sparklesAt(this.screenAt(e.side, 0.6), GREENS);
        this.impactFx.spawnImpact(this.worldChest(e.side), "mote", "#8ee08a", 10);
        this.floatText(e.side, `+${e.amount}`, "#8ee08a");
        this.log(`${this.name(e.side)} recovered ${e.amount} HP!`);
        await this.tweens.wait(0.4);
        break;

      case "faint":
        this.log(`${this.name(e.side)} fainted!`);
        await this.faintAnim(e.side);
        await this.tweens.wait(0.3);
        break;

      case "switchIn":
        await this.switchInAnim(e.side, e.partyIndex);
        break;

      case "syncAttempt":
        await this.playSyncAttempt(e.chance);
        break;

      case "syncResult":
        if (e.success) {
          this.syncedSpeciesId = e.speciesId;
        this.syncedShiny = this.pb.foe.mon.shiny === true;
          await this.syncSuccess();
          const burst = this.foePos.clone();
          burst.y += 1.2;
          this.impactFx.spawnImpact(burst, "star", "#aef7ff", 18);
          this.impactFx.spawnImpact(burst, "star", "#ffffff", 8);
          this.log(`${this.foeSpeciesName()} synced to your Codex!`);
        } else {
          await this.syncFail();
          this.log("The sync broke!");
        }
        this.syncRing = null;
        void this.tweens.tween(0.3, (k) => {
          this.camPush = 0.8 * (1 - k);
        });
        await this.tweens.wait(0.3);
        break;

      case "fleeAttempt":
        if (e.success) {
          this.log("Got away safely!");
          await this.fadeOut();
        } else {
          this.log("Couldn't slip away!");
          await this.tweens.wait(0.6);
        }
        break;

      case "xp": {
        const mon = this.findMon(e.monUid);
        if (mon && mon.uid === this.pb.player.mon.uid) this.applyXp();
        this.log(`${this.monName(mon)} gained ${e.amount} XP!`);
        await this.tweens.wait(0.4);
        break;
      }

      case "levelUp": {
        const mon = this.findMon(e.monUid);
        this.log(`${this.monName(mon)} grew to Lv ${e.level}!`);
        if (mon && mon.uid === this.pb.player.mon.uid) {
          const sp = this.data.species[mon.speciesId];
          this.pb.player.max = maxHpAt(sp.baseStats.hp, mon.level);
          this.pb.player.hp = mon.currentHp;
          this.renderCard("player");
          await this.bounce("player");
          this.applyHp("player");
        }
        await this.tweens.wait(0.4);
        break;
      }

      case "moveLearned":
        await this.toast(`${this.monName(this.findMon(e.monUid))} learned ${e.moveName}!`);
        break;

      case "readyToEvolve":
        this.pendingEvolutions.push({ monUid: e.monUid, toSpeciesId: e.toSpeciesId });
        break;

      case "bossPhase":
        await this.bossPhase(e.announcement);
        break;

      case "end":
        if (e.outcome === "victory") {
          this.log(this.opts.opponentTitle ? `${this.opts.opponentTitle} was defeated!` : "You won the battle!");
          this.views.player.verb?.("celebrate"); // proto: victory spin
        } else if (e.outcome === "defeat") {
          this.log("Your team was defeated...");
        }
        await this.tweens.wait(0.6);
        break;
    }
  }

  private effText(eff: number): string {
    if (eff === 0) return "It has no effect...";
    if (eff >= 2) return "It resonates powerfully!";
    if (eff < 1) return "It barely lands...";
    return "";
  }

  // ---- move-impact FX ----------------------------------------------------
  /** Chest-height world point of a side's current sprite (impact origin). */
  private worldChest(side: Side): THREE.Vector3 {
    const v = this.views[side];
    return new THREE.Vector3(
      v.group.position.x,
      v.group.position.y + v.scale * 0.55,
      v.group.position.z,
    );
  }

  private statusColor(statusId: string): string {
    const byStatus: Record<string, string> = {
      smolder: TYPE_COLORS.ember,
      rimebound: TYPE_COLORS.frost,
      tangleroot: TYPE_COLORS.verdant,
      drowse: TYPE_COLORS.umbral,
      storydaze: TYPE_COLORS.fable,
    };
    return byStatus[statusId] ?? "#c9a0ff";
  }

  /** Type+category → procedural particle recipe, layered over the sprite hit. */
  private playMoveImpact(defender: Side, eff: number, crit: boolean): void {
    const type = this.lastMoveType;
    const cat = this.lastMoveCategory;
    const color = TYPE_COLORS[type];
    const at = this.worldChest(defender);
    const mult = eff > 1 ? 1.5 : 1;
    const n = (base: number) => Math.max(1, Math.round(base * mult));

    switch (type) {
      case "ember":
        this.impactFx.spawnImpact(at, "ember", color, n(14));
        this.impactFx.spawnImpact(at, "spark", "#ffd27a", n(6));
        this.pointBurst(at, 0xff7a3a);
        break;
      case "tide":
        this.impactFx.spawnImpact(at, "droplet", color, n(16));
        break;
      case "verdant":
        this.impactFx.spawnImpact(at, "leaf", color, n(12));
        break;
      case "frost":
        this.impactFx.spawnImpact(at, "shard", color, n(14));
        break;
      case "volt":
        this.impactFx.spawnImpact(at, "zap", color, n(8));
        this.screenFlash("#ffffff", 0.5, 0.12);
        break;
      case "zephyr":
        this.impactFx.spawnImpact(at, "streak", color, n(12));
        break;
      case "lumen":
        this.impactFx.spawnImpact(at, "ray", color, n(12));
        break;
      case "umbral":
        this.impactFx.spawnImpact(at, "wisp", color, n(14));
        break;
      case "fable":
        this.impactFx.spawnImpact(at, "star", color, n(8));
        this.impactFx.spawnImpact(at, "note", "#ffd6f0", n(5));
        break;
      case "terra":
        this.impactFx.spawnImpact(at, "pebble", color, n(12));
        this.impactFx.spawnImpact(at, "star", "#ffe8b0", n(4));
        break;
      default: // neutral (and any unmapped type)
        this.impactFx.spawnImpact(at, "slash", color, n(2));
        this.impactFx.spawnImpact(at, "star", "#ffffff", n(6));
        break;
    }

    // A melee slash accent on physical hits whose recipe isn't already slash-led.
    if (cat === "physical" && type !== "neutral" && type !== "terra") {
      this.impactFx.spawnImpact(at, "slash", "#ffffff", 2);
    }
    // Spirit moves ground a colored ring pulse under the target.
    if (cat === "spirit") this.spiritRing(defender, color);

    if (crit) {
      this.impactFx.spawnImpact(at, "star", "#fff2a0", 8);
      this.screenFlash("#ffffff", 0.6, 0.16);
    }
  }

  /** Brief coloured point light at a world point (embers). Fades and cleans up. */
  private pointBurst(at: THREE.Vector3, hex: number): void {
    const light = new THREE.PointLight(hex, 6, 8, 2);
    light.position.copy(at);
    this.scene.add(light);
    void this.tweens
      .tween(0.35, (k) => {
        light.intensity = 6 * (1 - k);
      })
      .then(() => {
        this.scene.remove(light);
        light.dispose();
      });
  }

  /** Flat additive ring that scales up + fades under a combatant (spirit hits). */
  private spiritRing(side: Side, color: string): void {
    const v = this.views[side];
    const geo = new THREE.RingGeometry(0.5, 0.62, 40);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(v.group.position.x, 0.03, v.group.position.z);
    ring.renderOrder = 15;
    this.scene.add(ring);
    void this.tweens
      .tween(
        0.5,
        (k) => {
          const s = 0.6 + k * 1.8;
          ring.scale.set(s, s, 1);
          mat.opacity = 0.9 * (1 - k);
        },
        easeOutCubic,
      )
      .then(() => {
        this.scene.remove(ring);
        geo.dispose();
        mat.dispose();
      });
  }

  /** Full-screen additive colour flash (volt / crit). Real-time via WAAPI. */
  private screenFlash(color: string, strength: number, dur: number): void {
    const f = el("div");
    f.style.cssText =
      `position:absolute;inset:0;background:${color};opacity:0;` +
      `pointer-events:none;mix-blend-mode:screen;`;
    this.fxLayer.append(f);
    f.animate([{ opacity: strength }, { opacity: 0 }], {
      duration: dur * 1000,
      easing: "ease-out",
    }).onfinish = () => f.remove();
  }

  // ---- sprite animations -------------------------------------------------
  private async flash(side: Side): Promise<void> {
    const v = this.views[side];
    await this.tweens.tween(0.18, (k) => {
      v.setFlash((1 - k) * 0.9);
    });
    v.setFlash(0);
  }

  private async tintFlash(side: Side, _hex: number): Promise<void> {
    const v = this.views[side];
    await this.tweens.tween(0.3, (k) => {
      v.setFlash((1 - k) * 0.8);
    });
    v.setFlash(0);
  }

  private async shake(side: Side, amount = 0.12): Promise<void> {
    const v = this.views[side];
    await this.tweens.tween(0.28, (k) => {
      v.offset.x = Math.sin(k * 40) * amount * (1 - k);
    });
    v.offset.x = 0;
  }

  private async lunge(side: Side): Promise<void> {
    const v = this.views[side];
    const target = this.views[this.other(side)].basePos;
    const dir = target.clone().sub(v.basePos);
    dir.y = 0;
    if (v.verb && v.face) {
      // proto: turn toward the opponent and run the attack verb — the verb
      // itself carries the anticipation crouch + lunge + settle
      v.face(Math.atan2(dir.x, dir.z));
      v.verb("attack");
      await this.tweens.wait(0.4); // strike lands mid-verb
      void this.tweens.wait(0.5).then(() => {
        if (!v.fainting) v.face?.(0);
      });
      return;
    }
    if (dir.lengthSq() > 0) dir.normalize().multiplyScalar(0.7);
    await this.tweens.tween(
      0.16,
      (k) => {
        v.offset.x = dir.x * k;
        v.offset.z = dir.z * k;
      },
      easeOutBack,
    );
    await this.tweens.tween(
      0.14,
      (k) => {
        v.offset.x = dir.x * (1 - k);
        v.offset.z = dir.z * (1 - k);
      },
      easeOutCubic,
    );
    v.offset.set(0, 0, 0);
  }

  private async sidestep(side: Side): Promise<void> {
    const v = this.views[side];
    const dx = side === "player" ? -0.5 : 0.5;
    await this.tweens.tween(0.18, (k) => {
      v.offset.x = Math.sin(k * Math.PI) * dx;
    });
    v.offset.x = 0;
  }

  private async bounce(side: Side): Promise<void> {
    const v = this.views[side];
    const s = v.scale;
    await this.tweens.tween(0.18, (k) => {
      const f = 1 + Math.sin(k * Math.PI) * 0.15;
      v.setScale(s * f, s * f);
    });
    v.setScale(s, s);
  }

  private async faintAnim(side: Side): Promise<void> {
    const v = this.views[side];
    v.fainting = true;
    if (v.verb) {
      // proto: the faint verb slumps the body in place, then fade out
      v.verb("faint");
      await this.tweens.wait(0.9);
      await this.tweens.tween(0.35, (k) => v.setOpacity(1 - k), easeInCubic);
      v.group.visible = false;
      return;
    }
    const startY = v.group.position.y;
    const tip = side === "player" ? 1.4 : -1.4;
    await this.tweens.tween(
      0.4,
      (k) => {
        v.setTip(k * tip);
        v.group.position.y = startY - k * 0.6;
        v.setOpacity(1 - k);
      },
      easeInCubic,
    );
    v.group.visible = false;
  }

  private async switchInAnim(side: Side, partyIndex: number): Promise<void> {
    const party = side === "player" ? this.opts.playerParty : this.opts.foeParty;
    const mon = party[partyIndex];
    if (!mon) return;

    const old = this.views[side];
    if (old.group.visible && !old.fainting) {
      const away = side === "player" ? -4 : 4;
      await this.tweens.tween(
        0.18,
        (k) => {
          old.group.position.x = old.basePos.x + away * k;
          old.setOpacity(1 - k);
        },
        easeInCubic,
      );
    }
    this.scene.remove(old.group);
    old.dispose(); // unmount only disposes what's still in the scene

    this.pb[side] = this.mkPb(mon);
    const v = this.spawnView(side);
    this.views[side] = v;
    this.applyLayout(); // portrait sizing/position for the fresh view

    const target = v.scale;
    v.setOpacity(0);
    await this.tweens.tween(0.3, (k) => {
      const s = easeOutBack(k);
      const sc = target * (0.55 + 0.45 * s);
      v.setScale(sc, sc);
      v.setOpacity(Math.min(1, k * 2));
    });
    v.setScale(target, target);
    v.verb?.("hop"); // proto: land with a happy entry hop

    this.renderCard(side);
    this.log(`${this.name(side)} ${side === "player" ? "is ready!" : "steps up!"}`);
    await this.tweens.wait(0.2);
  }

  // ---- sync (the signature moment) --------------------------------------
  private async playSyncAttempt(chance: number): Promise<void> {
    const ring = makeSyncRing();
    ring.group.position.copy(this.foePos);
    ring.group.position.y += 0.05;
    this.setRingOpacity(ring, 0);
    ring.group.scale.setScalar(1.6);
    this.scene.add(ring.group);
    this.syncRing = ring;

    const label = this.syncLabel(`Sync rate: ${Math.round(chance * 100)}%`);
    await this.tweens.tween(0.3, (k) => {
      ring.group.scale.setScalar(1.6 - 0.6 * k);
      this.setRingOpacity(ring, k);
    });
    void this.tweens.tween(0.4, (k) => {
      this.camPush = 0.8 * k;
    });
    for (let p = 0; p < 3; p++) {
      const amp = 0.5 - p * 0.13;
      await this.tweens.tween(0.28, (k) => {
        ring.group.scale.setScalar(1 + Math.sin(k * Math.PI) * amp);
      });
    }
    await this.tweens.wait(0.1);
    label.remove();
  }

  private async syncSuccess(): Promise<void> {
    const ring = this.syncRing;
    const v = this.views.foe;
    await this.tweens.tween(
      0.24,
      (k) => {
        v.setScale(v.scale * (1 - 0.7 * k), v.scale * (1 + 0.5 * k));
      },
      easeInCubic,
    );
    await this.tweens.tween(0.16, (k) => {
      v.setOpacity(1 - k);
      v.setScale(v.scale * 0.3 * (1 - k), v.scale * 1.5);
    });
    v.group.visible = false;
    this.beamToCodex("foe");
    if (ring) {
      await this.tweens.tween(0.3, (k) => {
        ring.group.scale.setScalar(0.9 * (1 - k));
        this.setRingOpacity(ring, 1 - k);
      });
      this.scene.remove(ring.group);
    }
    this.sparklesAt({ x: this.renderW / 2, y: this.renderH - 80 }, CONFETTI);
    await this.tweens.wait(0.3);
  }

  private async syncFail(): Promise<void> {
    const ring = this.syncRing;
    if (ring) {
      await this.tweens.tween(0.3, (k) => {
        ring.group.scale.setScalar(1 + k * 1.2);
        this.setRingOpacity(ring, 1 - k);
      });
      this.scene.remove(ring.group);
    }
    const v = this.views.foe;
    await this.tweens.tween(0.18, (k) => {
      v.offset.y = Math.sin(k * Math.PI) * 0.5;
    });
    await this.tweens.tween(0.16, (k) => {
      v.offset.y = Math.sin(k * Math.PI) * 0.32;
    });
    v.offset.y = 0;
  }

  private setRingOpacity(ring: SyncRing, o: number): void {
    (ring.ring.material as THREE.Material).opacity = 0.95 * o;
    (ring.glow.material as THREE.Material).opacity = 0.18 * o;
    for (const t of ring.ticks.children) {
      ((t as THREE.Mesh).material as THREE.Material).opacity = 0.95 * o;
    }
  }

  private async bossPhase(announcement: string): Promise<void> {
    await this.shakeCamera();
    await this.banner(announcement);
    const v = this.views.foe;
    const from = v.scale;
    v.scale = from * 1.08;
    await this.tweens.tween(0.3, (k) => {
      const s = from + (v.scale - from) * k;
      v.setScale(s, s);
    });
    this.log(announcement);
    await this.tweens.wait(0.3);
  }

  private async shakeCamera(amount = 0.25, dur = 0.4): Promise<void> {
    await this.tweens.tween(dur, (k) => {
      this.camShakeX = Math.sin(k * 50) * amount * (1 - k);
      this.camShakeY = Math.cos(k * 47) * amount * (1 - k);
    });
    this.camShakeX = 0;
    this.camShakeY = 0;
  }

  // ---- evolution ---------------------------------------------------------
  private async playEvolution(ev: { monUid: string; toSpeciesId: string }): Promise<void> {
    const mon = this.findMon(ev.monUid);
    if (!mon) return;
    const from = this.data.species[mon.speciesId];
    const to = this.data.species[ev.toSpeciesId];
    if (!to) return;

    const oldMax = maxHpAt(from.baseStats.hp, mon.level);
    const frac = oldMax > 0 ? mon.currentHp / oldMax : 1;

    const glow = el("div");
    glow.style.cssText = "position:fixed;inset:0;background:#fff;opacity:0;z-index:55;pointer-events:none;";
    this.game.uiRoot.append(glow);

    this.log(`What? ${this.monName(mon)} is evolving!`);
    await this.tweens.tween(0.7, (k) => {
      glow.style.opacity = String(k);
    });

    mon.speciesId = ev.toSpeciesId;
    // Keep the moveset the player actually has (stage learnsets overlap by
    // design); rewriting it here silently deleted just-learned moves.
    const newMax = maxHpAt(to.baseStats.hp, mon.level);
    mon.currentHp = Math.max(1, Math.round(newMax * frac));

    if (mon.uid === this.pb.player.mon.uid) {
      this.pb.player = this.mkPb(mon);
      this.scene.remove(this.views.player.group);
      this.views.player.dispose(); // replaced views aren't reached by unmount
      this.views.player = this.spawnView("player");
      this.applyLayout();
      this.renderCard("player");
      this.applyHp("player");
    }
    await this.tweens.wait(0.2);
    await this.tweens.tween(0.7, (k) => {
      glow.style.opacity = String(1 - k);
    });
    glow.remove();
    this.log(`…evolved into ${to.name}!`);
    await this.bounce("player");
    await this.tweens.wait(0.5);
  }

  // ---- menu / input ------------------------------------------------------
  private setMenu(items: HTMLElement[]): void {
    // The lingering log line bleeds through gaps in taller menus (visual-judge
    // finding); narration returns via log() as soon as playback resumes.
    this.logEl.style.display = "none";
    this.menuEl.replaceChildren(...items);
    this.menuEl.style.display = "";
  }

  private clearMenu(): void {
    this.menuEl.replaceChildren();
  }

  private menuButton(label: string, cls: string, onClick: () => void): HTMLElement {
    return el("button", { className: `chunky-btn${cls ? ` ${cls}` : ""}`, text: label, onClick });
  }

  private awaitPlayerAction(): Promise<BattleAction> {
    this.applyStamina(); // stamina regenerates between turns
    return new Promise((resolve) => {
      const finish = (a: BattleAction) => resolve(a);
      const showMain = () => {
        const items: HTMLElement[] = [this.menuButton("Fight", "primary", showFight)];
        if (this.opts.config.canSync) items.push(this.menuButton("Sync", "", () => finish({ kind: "sync" })));
        items.push(this.menuButton("Party", "", showParty));
        if (this.opts.config.canFlee) items.push(this.menuButton("Run", "danger", () => finish({ kind: "flee" })));
        this.setMenu(items);
      };
      const showFight = () => {
        this.setMenu(this.buildMoveButtons((moveId) => finish({ kind: "move", moveId }), showMain));
      };
      const showParty = () => {
        this.setMenu(this.buildPartySheet(false, (i) => finish({ kind: "switch", partyIndex: i }), showMain));
      };
      showMain();
    });
  }

  private buildMoveButtons(onPick: (moveId: string) => void, onBack: () => void): HTMLElement[] {
    const active = this.state.player.active;
    const stam = active.stamina;
    const moveIds = active.mon.moves;
    const affordable = moveIds.map((id) => this.data.moves[id]).filter((m) => m && m.stamina <= stam);
    const btns: HTMLElement[] = [];
    for (const id of moveIds) {
      const m = this.data.moves[id];
      if (!m) continue;
      btns.push(this.moveButton(m, m.stamina <= stam, () => onPick(id)));
    }
    if (affordable.length === 0) btns.push(this.moveButton(FLAIL, true, () => onPick(FLAIL.id)));
    btns.push(this.menuButton("Back", "", onBack));
    return btns;
  }

  private moveButton(
    m: { name: string; type: import("../../shared/model").TypeId; power: number; stamina: number },
    enabled: boolean,
    onClick: () => void,
  ): HTMLElement {
    const b = el("button", { className: "chunky-btn move-btn" });
    if (!enabled) b.disabled = true;
    const cost = m.stamina > 0 ? "◆".repeat(m.stamina) : "free";
    const powText = m.power > 0 ? `Pow ${m.power}` : "Status";
    b.innerHTML = `<div class="move-name">${esc(m.name)}</div><div class="move-meta">${typeChip(m.type)} ${powText} · ${cost}</div>`;
    if (enabled) b.addEventListener("click", onClick);
    return b;
  }

  private buildPartySheet(
    forced: boolean,
    onPick: (index: number) => void,
    onBack?: () => void,
  ): HTMLElement[] {
    const panel = el("div", { className: "panel" });
    panel.style.gridColumn = "1 / -1";
    panel.style.maxHeight = "44vh";
    panel.style.overflowY = "auto";
    if (forced) {
      const h = el("div", { text: "Choose your next monster!" });
      h.style.cssText = "font-weight:800;margin-bottom:8px;text-align:center;";
      panel.append(h);
    }
    this.opts.playerParty.forEach((mon, i) => panel.append(this.partyRow(mon, i, onPick)));
    if (!forced && onBack) {
      const back = this.menuButton("Back", "", onBack);
      back.style.marginTop = "6px";
      back.style.width = "100%";
      panel.append(back);
    }
    return [panel];
  }

  private partyRow(mon: MonsterInstance, i: number, onPick: (index: number) => void): HTMLElement {
    const active = i === this.state.player.activeIndex;
    const fainted = mon.currentHp <= 0;
    const disabled = active || fainted;
    const sp = this.data.species[mon.speciesId];
    const max = maxHpAt(sp.baseStats.hp, mon.level);
    const pct = Math.max(0, (mon.currentHp / max) * 100);
    const fillCls = pct <= 20 ? "crit" : pct <= 50 ? "warn" : "";

    const row = el("div", { className: "party-row" });
    const img = creatureImg(mon.speciesId, "", { shiny: mon.shiny });
    const info = el("div", { className: "info" });
    info.innerHTML =
      `<div style="font-weight:800">${esc(mon.nickname ?? sp.name)} ` +
      `<span style="opacity:.6;font-size:12px">Lv ${mon.level}</span>` +
      `${active ? ' <span style="opacity:.6;font-size:12px">(active)</span>' : ""}` +
      `${fainted ? ' <span style="opacity:.6;font-size:12px">(fainted)</span>' : ""}</div>` +
      `<div class="hp-bar"><div class="fill ${fillCls}" style="width:${pct}%"></div></div>`;
    row.append(img, info);
    if (!disabled) {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => onPick(i));
    } else {
      row.style.opacity = "0.5";
    }
    return row;
  }

  private forcedSwitch(): Promise<void> {
    return new Promise((resolve) => {
      const onPick = async (i: number) => {
        const evts = forceSwitch(this.state, i);
        this.clearMenu();
        await this.playEvents(evts);
        resolve();
      };
      this.setMenu(this.buildPartySheet(true, onPick));
      this.log("Choose your next monster!");
    });
  }

  // ---- DOM effects -------------------------------------------------------
  private screenAt(side: Side, yOffset = 0.6): { x: number; y: number } {
    const v = this.views[side];
    const p = v.group.position.clone();
    p.y += v.scale * yOffset;
    return worldToScreen(p, this.camera, this.renderW, this.renderH);
  }

  private floatText(side: Side, text: string, color: string, big = false): void {
    const pos = this.screenAt(side, 0.9);
    const d = el("div", { text });
    d.style.cssText =
      `position:absolute;left:${pos.x}px;top:${pos.y}px;transform:translate(-50%,-50%);` +
      `font-weight:900;font-size:${big ? 28 : 22}px;color:${color};` +
      `text-shadow:0 2px 0 rgba(0,0,0,.28);pointer-events:none;`;
    this.fxLayer.append(d);
    d.animate(
      [
        { transform: "translate(-50%,-50%) scale(0.6)", opacity: 0 },
        { transform: "translate(-50%,-120%) scale(1.1)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%,-220%) scale(1)", opacity: 0 },
      ],
      { duration: 900, easing: "ease-out" },
    ).onfinish = () => d.remove();
  }

  private chevrons(side: Side, up: boolean): void {
    const pos = this.screenAt(side, 0.8);
    const color = up ? "#6fe06f" : "#f2a24a";
    const glyph = up ? "▲" : "▼";
    for (let i = 0; i < 3; i++) {
      const d = el("div", { text: glyph });
      d.style.cssText =
        `position:absolute;left:${pos.x}px;top:${pos.y}px;color:${color};` +
        `font-size:20px;font-weight:900;pointer-events:none;transform:translate(-50%,-50%);`;
      this.fxLayer.append(d);
      const dy = up ? -60 : 60;
      d.animate(
        [
          { transform: `translate(-50%,calc(-50% + ${i * 10}px))`, opacity: 0 },
          { opacity: 1, offset: 0.3 },
          { transform: `translate(-50%,calc(-50% + ${dy - i * 10}px))`, opacity: 0 },
        ],
        { duration: 700, delay: i * 90, easing: "ease-out", fill: "forwards" },
      ).onfinish = () => d.remove();
    }
  }

  private sparklesAt(pos: { x: number; y: number }, colors: string[]): void {
    for (let i = 0; i < 22; i++) {
      const d = el("div");
      const c = colors[i % colors.length];
      d.style.cssText =
        `position:absolute;left:${pos.x}px;top:${pos.y}px;width:8px;height:8px;` +
        `border-radius:2px;background:${c};pointer-events:none;transform:translate(-50%,-50%);`;
      this.fxLayer.append(d);
      const ang = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 150;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 30;
      d.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(0.3)`, opacity: 0 },
        ],
        { duration: 800 + Math.random() * 400, easing: "ease-out", fill: "forwards" },
      ).onfinish = () => d.remove();
    }
  }

  private beamToCodex(side: Side): void {
    const from = this.screenAt(side, 0.6);
    const toX = this.renderW / 2;
    const toY = this.renderH - 70;
    const d = el("div");
    d.style.cssText =
      `position:absolute;left:${from.x}px;top:${from.y}px;width:20px;height:20px;` +
      `border-radius:50%;background:radial-gradient(circle,#fff,#66f0ff);` +
      `box-shadow:0 0 26px 10px rgba(102,240,255,.8);pointer-events:none;transform:translate(-50%,-50%);`;
    this.fxLayer.append(d);
    d.animate(
      [
        { left: `${from.x}px`, top: `${from.y}px`, transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { left: `${toX}px`, top: `${toY}px`, transform: "translate(-50%,-50%) scale(0.4)", opacity: 0.9 },
      ],
      { duration: 600, easing: "cubic-bezier(0.5,0,0.7,1)", fill: "forwards" },
    ).onfinish = () => d.remove();
  }

  private syncLabel(text: string): HTMLElement {
    const pos = this.screenAt("foe", 1.4);
    const d = el("div", { text });
    d.style.cssText =
      `position:absolute;left:${pos.x}px;top:${pos.y}px;transform:translate(-50%,-50%);` +
      `font-weight:800;font-size:14px;color:#aef7ff;` +
      `text-shadow:0 1px 4px rgba(0,0,0,.6);pointer-events:none;`;
    this.fxLayer.append(d);
    return d;
  }

  private banner(text: string): Promise<void> {
    return new Promise((resolve) => {
      const d = el("div", { text });
      d.style.cssText =
        `position:absolute;left:0;right:0;top:36%;text-align:center;` +
        `font-weight:900;font-size:clamp(22px,6vw,40px);color:#fff;` +
        `text-shadow:0 3px 0 rgba(0,0,0,.35),0 0 30px rgba(255,214,107,.5);pointer-events:none;`;
      this.fxLayer.append(d);
      const anim = d.animate(
        [
          { transform: "scale(1.6)", opacity: 0 },
          { transform: "scale(1)", opacity: 1, offset: 0.25 },
          { transform: "scale(1)", opacity: 1, offset: 0.8 },
          { transform: "scale(1.05)", opacity: 0 },
        ],
        { duration: 1400, easing: "cubic-bezier(0.22,1,0.36,1)" },
      );
      anim.onfinish = () => {
        d.remove();
        resolve();
      };
    });
  }

  private toast(text: string): Promise<void> {
    return new Promise((resolve) => {
      const d = el("div", { className: "panel", text });
      d.style.cssText +=
        "position:fixed;left:50%;top:28%;transform:translateX(-50%);font-weight:800;z-index:20;pointer-events:none;";
      this.fxLayer.append(d);
      d.animate(
        [
          { opacity: 0, transform: "translateX(-50%) translateY(-10px)" },
          { opacity: 1, transform: "translateX(-50%) translateY(0)", offset: 0.2 },
          { opacity: 1, offset: 0.8 },
          { opacity: 0 },
        ],
        { duration: 1600, easing: "ease" },
      ).onfinish = () => {
        d.remove();
        resolve();
      };
    });
  }

  private async fadeOut(): Promise<void> {
    const f = el("div");
    f.style.cssText = "position:fixed;inset:0;background:#1a202c;opacity:0;z-index:60;pointer-events:none;";
    this.game.uiRoot.append(f);
    await this.tweens.tween(0.35, (k) => {
      f.style.opacity = String(k);
    });
  }
}
