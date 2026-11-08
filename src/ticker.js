import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const KEEP = 20;

/** <cw-ticker>: a line of text. In full motion it flows right to left at `speed` px/s; otherwise it shows the latest text. */
export class CwTicker extends StageMember(LitElement) {
  static properties = {
    speed: { type: Number },
    _texts: { state: true },
  };

  static styles = css`
    :host { display: block; overflow: hidden; position: relative; height: 1.8em; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); font-size: 14px; }
    [part='track'] { position: absolute; left: 0; top: 0; line-height: 1.8em; white-space: nowrap; will-change: transform; }
    .sep { color: var(--cw-text-dim, #9a9a9a); margin: 0 1.2em; }
  `;

  constructor() {
    super();
    this.speed = 60;
    this._texts = [];
    this._held = [];
    this._x = 0;
  }

  /** Append one text or an array of texts. */
  push(v) {
    const add = (Array.isArray(v) ? v : [v]).map(String);
    if (this.isPaused) this._held = [...this._held, ...add].slice(-KEEP);
    else this._texts = [...this._texts, ...add].slice(-KEEP);
  }

  flush() {
    const n = this._held.length;
    if (n) this._texts = [...this._texts, ...this._held].slice(-KEEP);
    this._held = [];
    return n;
  }

  /** Current horizontal offset of the text in px (for tests and syncing). */
  get offsetPosition() { return this._x; }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  updated(changed) {
    super.updated(changed);
    const flowing = this.motionLevel === 'full' && !this.isPaused && this.isConnected;
    if (flowing && !this._raf) {
      this._last = performance.now();
      this._raf = requestAnimationFrame((t) => this._frame(t));
    }
    if (!flowing) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (this.motionLevel !== 'full') this._x = 0;
      this._place();
    }
  }

  onPauseChange() { this.requestUpdate(); }

  _frame(t) {
    const dt = Math.min(0.1, (t - this._last) / 1000);
    this._last = t;
    const track = this.renderRoot.querySelector('[part=track]');
    this._x -= this.speed * dt;
    if (track && this._x < -track.offsetWidth) this._x = this.clientWidth;
    this._place();
    this._raf = this.motionLevel === 'full' && !this.isPaused ? requestAnimationFrame((n) => this._frame(n)) : 0;
  }

  _place() {
    const track = this.renderRoot?.querySelector('[part=track]');
    if (track) track.style.transform = `translateX(${this._x}px)`;
  }

  render() {
    const full = this.motionLevel === 'full';
    const shown = full ? this._texts : this._texts.slice(-1);
    return html`<div part="track" role="marquee" aria-label=${this._texts.at(-1) ?? ''}>${shown.map((t, i) => html`${i ? html`<span class="sep" aria-hidden="true">·</span>` : ''}<span>${t}</span>`)}</div>`;
  }
}
define('cw-ticker', CwTicker);
