import { LitElement, html, svg, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/**
 * <cw-ring text="...">: words running around a circle, with a ring of ticks inside turning the other way.
 * The text repeats until it fills the circle. In full motion the rings turn once every `speed` seconds;
 * otherwise they stand still. Pausing stops them where they are.
 */
export class CwRing extends StageMember(LitElement) {
  static properties = {
    text: { type: String },
    speed: { type: Number },
    ticks: { type: Number },
    fps: { type: Number },
    _size: { state: true },
    _copies: { state: true },
  };

  static styles = css`
    :host { display: block; width: 100%; height: 100%; position: relative; pointer-events: none; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    [part='text'] {
      fill: var(--cw-text-dim, #9a9a9a); letter-spacing: .32em; text-transform: uppercase;
      font-family: var(--cw-display-font, var(--cw-font, system-ui, sans-serif)); font-weight: var(--cw-display-weight, 500);
      font-stretch: var(--cw-display-stretch, normal);
    }
    [part='ticks'] { fill: none; stroke: var(--cw-signal, #4a90c2); stroke-linecap: butt; opacity: .7; }
    .guide { fill: none; stroke: color-mix(in srgb, var(--cw-text-dim, #9a9a9a) 30%, transparent); stroke-width: 1; }
  `;

  constructor() {
    super();
    this.text = '';
    this.speed = 60;
    this.ticks = 72;
    this.fps = 30;
    this._size = 0;
    this._copies = 0;
    this._spacing = 0;
    this._angle = 0;
  }

  /** Current turn of the text ring in degrees (the ticks turn the other way). */
  get angle() { return this._angle; }

  connectedCallback() {
    super.connectedCallback();
    this.dataset.frames ??= '0';
    this._ro = new ResizeObserver(() => { this._size = Math.min(this.clientWidth, this.clientHeight); });
    this._ro.observe(this);
    // the width of the words changes when the web font arrives; measure again then
    this._remeasure = () => { this._copies = 0; this.requestUpdate(); };
    document.fonts?.addEventListener('loadingdone', this._remeasure);
    document.fonts?.ready.then(() => this.isConnected && this._remeasure());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro.disconnect();
    document.fonts?.removeEventListener('loadingdone', this._remeasure);
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  onPauseChange() { this.requestUpdate(); }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    if (changed.has('text') || changed.has('_size')) this._copies = 0;
  }

  updated(changed) {
    super.updated(changed);
    // _copies 0 draws one copy to measure; then the text repeats and is spaced to fill the circle exactly
    const t = this.renderRoot.querySelector('[part=text]');
    if (this._copies === 0 && t && this._size && this.text) {
      const one = t.getComputedTextLength(), around = 2 * Math.PI * this._radius() * 0.995;
      const copies = one > 0 ? Math.max(1, Math.round(around / one)) : 1;
      // what the whole copies miss or overshoot goes into the gaps between letters, so the font keeps its look
      this._spacing = this._font() * 0.32 + (around - copies * one) / (copies * t.textContent.length);
      this._copies = copies;
    }
    const running = this.motionLevel === 'full' && !this.isPaused;
    if (running && !this._raf) {
      this._last = undefined;
      this._raf = requestAnimationFrame((n) => this._frame(n));
    }
    if (!running) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    this._place();
  }

  _radius() { return this._size / 2 - this._font() * 1.2; }
  _font() { return Math.max(10, this._size * 0.032); }

  _frame(t) {
    this._raf = this.motionLevel === 'full' && !this.isPaused ? requestAnimationFrame((n) => this._frame(n)) : 0;
    if (this._last !== undefined && t - this._last < 1000 / Math.max(1, this.fps) - 2) return;
    const dt = this._last === undefined ? 0 : Math.min(0.1, (t - this._last) / 1000);
    this._last = t;
    this._angle = (this._angle + (360 / Math.max(1, this.speed)) * dt) % 360;
    this._place();
    this.dataset.frames = String(+this.dataset.frames + 1);
  }

  _place() {
    const outer = this.renderRoot?.querySelector('.outer'), inner = this.renderRoot?.querySelector('.inner');
    if (outer) outer.setAttribute('transform', `rotate(${this._angle.toFixed(2)})`);
    if (inner) inner.setAttribute('transform', `rotate(${(-this._angle * 1.6).toFixed(2)})`);
  }

  render() {
    const s = this._size;
    if (!s) return html`<svg aria-hidden="true"></svg>`;
    const r = this._radius(), f = this._font(), ri = r - f * 1.6;
    const circle = `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`;
    const words = this.text ? Array(Math.max(1, this._copies)).fill(this.text.trim() + ' · ').join('') : '';
    const fill = this._copies ? (2 * Math.PI * r * 0.995).toFixed(1) : undefined;
    // fewer ticks on a small ring, so each gap is at least three tick widths
    const width = f * 0.7, step = (2 * Math.PI * ri) / Math.max(1, Math.min(this.ticks, Math.floor((2 * Math.PI * ri) / (width * 3))));
    return html`<svg viewBox="${-s / 2} ${-s / 2} ${s} ${s}" role="img" aria-label=${this.text}>
      ${svg`<defs><path id="arc" d=${circle}/></defs>
      <circle class="guide" r=${ri - f * 0.9}/>
      <g class="outer"><text part="text" style="font-size:${f.toFixed(1)}px${this._copies ? `;letter-spacing:${this._spacing.toFixed(2)}px` : ''}" dy=${f * 0.35}><textPath href="#arc" textLength=${fill ?? nothing} lengthAdjust="spacing">${words}</textPath></text></g>
      <g class="inner"><circle part="ticks" r=${ri} stroke-width=${width.toFixed(1)} stroke-dasharray="${(step * 0.12).toFixed(2)} ${(step * 0.88).toFixed(2)}"/></g>`}
    </svg>`;
  }
}
define('cw-ring', CwRing);
