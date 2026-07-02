// Unified input: WASD/arrows on desktop, virtual joystick + action button on
// touch. Consumers only read `direction` (normalized) and `consumeAction()`.

import { el } from "./dom";

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export class Input {
  private pressed = new Set<string>();
  private joyVector = { x: 0, y: 0 };
  private actionQueued = false;
  readonly isTouch: boolean;

  constructor(uiRoot: HTMLElement) {
    this.isTouch = window.matchMedia("(pointer: coarse)").matches;

    window.addEventListener("keydown", (e) => {
      if (e.code in KEY_DIRS) {
        this.pressed.add(e.code);
        e.preventDefault();
      }
      if (e.code === "Space" || e.code === "Enter" || e.code === "KeyE") {
        this.actionQueued = true;
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.pressed.delete(e.code));
    window.addEventListener("blur", () => {
      this.pressed.clear();
      this.joyVector = { x: 0, y: 0 };
    });

    if (this.isTouch) this.buildTouchControls(uiRoot);
  }

  /** Normalized movement direction, {0,0} when idle. */
  get direction(): { x: number; y: number } {
    let x = this.joyVector.x;
    let y = this.joyVector.y;
    for (const code of this.pressed) {
      const [dx, dy] = KEY_DIRS[code];
      x += dx;
      y += dy;
    }
    const len = Math.hypot(x, y);
    if (len < 0.25) return { x: 0, y: 0 }; // dead zone
    return { x: x / Math.max(1, len), y: y / Math.max(1, len) };
  }

  /** True once per action press (interact / confirm). */
  consumeAction(): boolean {
    const was = this.actionQueued;
    this.actionQueued = false;
    return was;
  }

  private buildTouchControls(uiRoot: HTMLElement): void {
    const JOY_RADIUS = 60;

    const joy = el("div", { className: "joystick" });
    const knob = el("div", { className: "joystick-knob" });
    joy.append(knob);

    let activePointer: number | null = null;
    const setKnob = (dx: number, dy: number) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    joy.addEventListener("pointerdown", (e) => {
      activePointer = e.pointerId;
      joy.setPointerCapture(e.pointerId);
    });
    joy.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointer) return;
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) {
        dx = (dx / len) * JOY_RADIUS;
        dy = (dy / len) * JOY_RADIUS;
      }
      setKnob(dx, dy);
      this.joyVector = { x: dx / JOY_RADIUS, y: dy / JOY_RADIUS };
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      setKnob(0, 0);
      this.joyVector = { x: 0, y: 0 };
    };
    joy.addEventListener("pointerup", release);
    joy.addEventListener("pointercancel", release);

    const action = el("button", { className: "action-button", text: "A" });
    action.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.actionQueued = true;
    });

    uiRoot.append(joy, action);
  }
}
