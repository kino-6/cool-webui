import { LitElement, html, css, nothing, svg } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** Numbers and numeric strings become numbers; anything else (including '' and null) becomes NaN. */
const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/**
 * <cw-trend label unit digits good points>: a number with how far it moved and a small line of its recent values.
 * `.value` is the number; `.data = [numbers]` the recent values (the last `points`, default 60, are kept; ones that are
 * not numbers are skipped); `.previous` the value to compare with, and without it the first of the recent values.
 * `push(n | [n])` adds to the line and makes the last one the value. `good` says which way is good: `up` (default),
 * `down` (a price, say), or `none`; a good move is in the ok colour, a bad one in the warning colour. Values set while
 * paused wait. In full motion the newest point pulses. Under 160px wide the percent is hidden.
 */
export class CwTrend extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    unit: { type: String },
    digits: { type: Number },
    good: { type: String },
    points: { type: Number },
    _v: { state: true },
    _data: { state: true },
    _prev: { state: true },
  };

  static styles = css`
    :host { display: flex; flex-direction: column; gap: 2px; height: 100%; min-height: 80px; container-type: inline-size;
      color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    [part='label'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); }
    .num { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; line-height: 1.05; }
    [part='value'] { font-size: var(--cw-trend-size, 40px); font-variant-numeric: tabular-nums; white-space: nowrap;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    [part='unit'] { font-size: 15px; color: var(--cw-text-dim, #9a9a9a); margin-left: 4px; }
    [part='delta'] { font-size: 14px; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--cw-text-dim, #9a9a9a); }
    :host([mood='good']) [part='delta'] { color: var(--cw-ok, #7bc47f); }
    :host([mood='bad']) [part='delta'] { color: var(--cw-warn, #f18b82); }
    [part='spark'] { position: relative; flex: 1; min-height: 24px; margin-top: 6px; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    [part='line'] { fill: none; stroke: var(--cw-signal, #4a90c2); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
    [part='area'] { fill: color-mix(in srgb, var(--cw-signal, #4a90c2) 18%, transparent); stroke: none; }
    [part='dot'] { position: absolute; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: var(--cw-signal, #4a90c2); }
    :host([data-motion='full']:not([data-paused])) [part='dot'] { animation: pulse 1.4s ease-out infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--cw-signal, #4a90c2) 60%, transparent); } 100% { box-shadow: 0 0 0 9px transparent; } }
    @container (max-width: 160px) { [part='pct'] { display: none; } [part='value'] { font-size: 28px; } }
  `;

  constructor() {
    super();
    this.digits = 0;
    this.good = 'up';
    this.points = 60;
    this._v = NaN;
    this._data = [];
    this._prev = NaN;
    this._pending = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    // the value attribute seeds the first value only
    if (this._seeded) return;
    this._seeded = true;
    if (this.hasAttribute('value')) this._v = toNumber(this.getAttribute('value'));
  }

  get _keep() { return Number.isFinite(this.points) && this.points >= 2 ? Math.floor(this.points) : 60; }
  _list(v) { return (Array.isArray(v) ? v : []).map(toNumber).filter(Number.isFinite).slice(-this._keep); }

  // while paused, every change goes into one waiting set and lands on resume
  _put(change) {
    if (this.isPaused) this._pending = { ...this._pending, ...change };
    else Object.assign(this, change);
  }

  /** The number shown (or waiting, while paused); anything that is not a finite number shows a dash. */
  get value() { return this._pending?._v ?? this._v; }
  set value(v) { this._put({ _v: toNumber(v) }); }

  /** The recent values the line is drawn from. */
  get data() { return this._pending?._data ?? this._data; }
  set data(v) { this._put({ _data: this._list(v) }); }

  /** The value the move is measured from; without one, the first of the recent values. */
  get previous() { return this._pending?._prev ?? this._prev; }
  set previous(v) { this._put({ _prev: toNumber(v) }); }

  /** Add one value or several to the line; the last becomes the value. */
  push(v) {
    const add = this._list(Array.isArray(v) ? v : [v]);
    if (!add.length) return;
    this._put({ _data: [...this.data, ...add].slice(-this._keep), _v: add.at(-1) });
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    Object.assign(this, this._pending);
    this._pending = undefined;
    return n;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  /** How far the value moved: {diff, pct, dir} or null when either end is unknown. */
  get move() {
    const base = Number.isFinite(this._prev) ? this._prev : this._data[0];
    if (!Number.isFinite(this._v) || !Number.isFinite(base)) return null;
    const diff = this._v - base, round = Number(diff.toFixed(this.digits || 0));
    return { diff, pct: base !== 0 ? (diff / Math.abs(base)) * 100 : NaN, dir: round > 0 ? 'up' : round < 0 ? 'down' : 'flat' };
  }

  get text() { return Number.isFinite(this._v) ? this._v.toFixed(this.digits || 0) : '—'; }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const m = this.move, good = this.good === 'down' ? 'down' : this.good === 'none' ? '' : 'up';
    this.setAttribute('dir', m?.dir ?? 'none');
    this.setAttribute('mood', !m || m.dir === 'flat' || !good ? 'flat' : m.dir === good ? 'good' : 'bad');
    const words = m ? `前より ${this._deltaText(m)}${m.dir === 'up' ? ' 増加' : m.dir === 'down' ? ' 減少' : ' 変わらず'}` : '';
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', [this.label, this.text, this.unit, words].filter(Boolean).join(' '));
  }

  _deltaText(m) {
    const d = this.digits || 0, abs = Math.abs(m.diff).toFixed(d);
    return m.dir === 'flat' ? `±${(0).toFixed(d)}` : `${m.dir === 'up' ? '+' : '−'}${abs}`;
  }

  render() {
    const m = this.move, pts = this._data;
    let spark = nothing;
    if (pts.length >= 2) {
      const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
      // y runs 2..28 of 30 so the line never touches the edges; a flat line sits in the middle
      const xy = pts.map((p, i) => [(i / (pts.length - 1)) * 100, hi === lo ? 15 : 28 - ((p - lo) / span) * 26]);
      const line = xy.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      const [lx, ly] = xy.at(-1);
      spark = html`<div part="spark">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          ${svg`<polygon part="area" points="0,30 ${line} 100,30"></polygon><polyline part="line" points=${line}></polyline>`}
        </svg>
        <span part="dot" style="left:${lx}%;top:${(ly / 30) * 100}%"></span>
      </div>`;
    }
    const arrow = m ? { up: '▲', down: '▼', flat: '–' }[m.dir] : '';
    return html`${this.label ? html`<div part="label">${this.label}</div>` : nothing}
      <div class="num">
        <span><span part="value">${this.text}</span>${this.unit ? html`<span part="unit">${this.unit}</span>` : nothing}</span>
        ${m ? html`<span part="delta">${arrow} ${this._deltaText(m)}${Number.isFinite(m.pct) && m.dir !== 'flat'
          ? html`<span part="pct"> (${m.dir === 'up' ? '+' : '−'}${Math.abs(m.pct).toFixed(1)}%)</span>` : nothing}</span>` : nothing}
      </div>
      ${spark}`;
  }
}
define('cw-trend', CwTrend);
