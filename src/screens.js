import { LitElement, html, css } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

/** <cw-screen name>: one screen inside <cw-screens>. Hidden unless it is the current one. */
export class CwScreen extends LitElement {
  static properties = { name: { type: String, reflect: true } };
  static styles = css`
    :host { display: block; position: absolute; inset: 0; }
    :host(:not([current])) { visibility: hidden; }
  `;
  render() { return html`<slot></slot>`; }
}
define('cw-screen', CwScreen);

/**
 * <cw-screens>: shows one <cw-screen> at a time. `show(name)` switches; with `keys`, the digit keys 1-9
 * pick the screens in order. The switch is a coloured wipe in full motion (a slanted slab when the theme sets
 * `--cw-wipe: slash`), a short fade in calm, instant when off.
 */
export class CwScreens extends StageMember(LitElement) {
  static properties = {
    keys: { type: Boolean },
    transition: { type: String },
    current: { type: String, reflect: true },
  };

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; overflow: hidden; }
    .wipe { position: absolute; inset: 0; pointer-events: none; z-index: 10; opacity: 0; }
  `;

  constructor() {
    super();
    this._onKey = (e) => {
      const t = e.composedPath()[0];
      if (!this.keys || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName) || t?.isContentEditable) return;
      const i = '123456789'.indexOf(e.key);
      const list = this.screens;
      if (i >= 0 && i < list.length) this.show(list[i].getAttribute('name'));
    };
  }

  /** The <cw-screen> children in order. */
  get screens() { return [...this.querySelectorAll(':scope > cw-screen')]; }

  connectedCallback() {
    super.connectedCallback();
    addEventListener('keydown', this._onKey);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    removeEventListener('keydown', this._onKey);
    clearTimeout(this._timer);
  }

  // children may arrive after this element upgrades, so settle the first screen on slotchange
  _slotChange() {
    if (!this.current || !this.screens.some((s) => s.getAttribute('name') === this.current)) this.current = this.screens[0]?.getAttribute('name');
    this._mark();
  }

  _mark() {
    for (const s of this.screens) s.toggleAttribute('current', s.getAttribute('name') === this.current);
  }

  /** Switch to the screen with this name. Unknown names are ignored. Returns true when it switched. */
  show(name) {
    const to = this.screens.find((s) => s.getAttribute('name') === name);
    if (!to) return false;
    const pending = this._target !== undefined;
    if (name === (pending ? this._target : this.current)) return false;
    this._wipe?.cancel?.();
    clearTimeout(this._timer);
    this._target = undefined;
    if (name === this.current) return true; // the last call wins: going back cancels a switch still under the wipe
    const from = this.current;
    const level = this.transition === 'none' ? 'off' : this.motionLevel;
    const swap = () => {
      this._target = undefined;
      this.current = name;
      this._mark();
      emit(this, 'cw-screen-change', { from, to: name });
    };
    const el = this.renderRoot.querySelector('.wipe');
    if (level === 'off' || this.isPaused || !el?.animate) { swap(); return true; }
    if (level === 'calm') {
      swap();
      to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
      return true;
    }
    // full: a circle in the brightest light's colour (or the accent) grows from the centre, the screens swap under it, then it fades
    const lights = this.stage?.lights ?? [];
    const brightest = lights.reduce((x, y) => ((y.level ?? 0) > (x?.level ?? -1) ? y : x), null);
    const color = brightest?.color || getComputedStyle(this).getPropertyValue('--cw-signal').trim() || '#4a90c2';
    if (getComputedStyle(this).getPropertyValue('--cw-wipe').trim() === 'slash') {
      // a slanted slab with a thin leading stripe sweeps across from the left
      el.style.inset = '0 -40%';
      el.style.background = `linear-gradient(90deg, transparent 0 4%, ${color} 4% 8%, transparent 8% 12%, ${color} 12% 100%)`;
      const at = (x) => ({ opacity: 1, transform: `translateX(${x}%) skewX(-20deg)` });
      this._wipe = el.animate([at(-130), { ...at(0), offset: 0.5 }, at(130)], { duration: 700, easing: 'cubic-bezier(0.7, 0, 0.3, 1)' });
      this._target = name;
      this._timer = setTimeout(swap, 350);
      return true;
    }
    el.style.inset = '';
    el.style.background = `radial-gradient(circle at 50% 50%, ${color} 0 40%, transparent 70%)`;
    this._wipe = el.animate([
      { opacity: 0, transform: 'scale(0.2)' },
      { opacity: 0.9, transform: 'scale(1.6)', offset: 0.5 },
      { opacity: 0, transform: 'scale(2.2)' },
    ], { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' });
    this._target = name;
    this._timer = setTimeout(swap, 350);
    return true;
  }

  updated(changed) {
    super.updated(changed);
    // the current attribute or property also switches screens (without a transition)
    if (changed.has('current')) this._mark();
  }

  render() {
    return html`<slot @slotchange=${this._slotChange}></slot><div class="wipe" aria-hidden="true"></div>`;
  }
}
define('cw-screens', CwScreens);
