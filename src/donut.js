import { LitElement, html, css, nothing, svg } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** Six colours from the look's own values, in the order slices take them. */
const COLOURS = [
  'var(--cw-signal, #4a90c2)', 'var(--cw-ok, #7bc47f)', 'var(--cw-warn, #f18b82)', 'var(--cw-text-dim, #9a9a9a)',
  'color-mix(in srgb, var(--cw-signal, #4a90c2) 50%, var(--cw-ok, #7bc47f))', 'color-mix(in srgb, var(--cw-warn, #f18b82) 50%, var(--cw-signal, #4a90c2))',
];
const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/**
 * <cw-donut label unit digits max slices>: shares as a ring with the total in the middle. `.data = [{label, value,
 * color}]`, the same shape as <cw-bars>. Values that are not numbers above zero are left out. More than `slices`
 * (default 6) items keep the largest and put the rest together as その他. One item makes a progress ring against
 * `max` (default 100) with its percent in the middle. A legend lists each item and its share. Values set while
 * paused wait. In full motion the ring moves to new shares. Under 220px wide the legend is hidden.
 */
export class CwDonut extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    unit: { type: String },
    digits: { type: Number },
    max: { type: Number },
    slices: { type: Number },
    _data: { state: true },
  };

  static styles = css`
    :host { display: flex; align-items: center; gap: 18px; height: 100%; min-height: 100px; container-type: inline-size;
      color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    [part='ring'] { position: relative; flex: none; width: min(100%, 180px); aspect-ratio: 1; }
    svg { display: block; width: 100%; height: 100%; transform: rotate(-90deg); }
    [part='track'] { fill: none; stroke: color-mix(in srgb, var(--cw-text, #ededed) 10%, transparent); stroke-width: 6; }
    [part='slice'] { fill: none; stroke-width: 6; }
    :host([data-motion='full']:not([data-paused])) [part='slice'] { transition: stroke-dasharray 700ms cubic-bezier(0.2, 0.8, 0.2, 1), stroke-dashoffset 700ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    [part='middle'] { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1; }
    [part='total'] { font-size: 26px; font-variant-numeric: tabular-nums;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    [part='unit'] { font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    [part='label'] { font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    [part='legend'] { flex: 1; min-width: 0; display: grid; gap: 6px; font-size: 13px; }
    [part='item'] { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 8px; }
    [part='swatch'] { width: 10px; height: 10px; border-radius: 3px; }
    [part='name'] { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='share'] { font-variant-numeric: tabular-nums; color: var(--cw-text-dim, #9a9a9a); }
    @container (max-width: 220px) { :host { justify-content: center; } [part='legend'] { display: none; } }
  `;

  constructor() {
    super();
    this.digits = 0;
    this.max = 100;
    this.slices = 6;
    this._data = [];
    this._pending = undefined;
  }

  /** The items (or the ones waiting, while paused). */
  get data() { return this._pending ?? this._data; }
  set data(v) {
    const list = (Array.isArray(v) ? v : []).filter((e) => e && typeof e === 'object');
    if (this.isPaused) this._pending = list;
    else this._data = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._data = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  /** The slices drawn, in the given order: [{label, value, share (0-1), color}]. */
  get parts() {
    const items = this._data.map((e) => ({ label: String(e.label ?? ''), value: toNumber(e.value), color: typeof e.color === 'string' ? e.color : undefined }))
      .filter((e) => Number.isFinite(e.value) && e.value > 0);
    if (items.length === 1) {
      const max = Number.isFinite(this.max) && this.max > 0 ? this.max : 100;
      return [{ ...items[0], share: Math.min(1, items[0].value / max) }];
    }
    const keep = Number.isFinite(this.slices) && this.slices >= 2 ? Math.floor(this.slices) : 6;
    let list = items;
    if (items.length > keep) {
      const big = [...items].sort((a, b) => b.value - a.value).slice(0, keep - 1);
      list = items.filter((e) => big.includes(e));
      list.push({ label: 'その他', value: items.filter((e) => !big.includes(e)).reduce((s, e) => s + e.value, 0) });
    }
    const total = list.reduce((s, e) => s + e.value, 0);
    return list.map((e) => ({ ...e, share: e.value / total }));
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const parts = this.parts, single = parts.length === 1;
    const words = single ? [`${Math.round(parts[0].share * 100)}%`]
      : parts.length ? [`合計 ${this._total(parts)}${this.unit ? ` ${this.unit}` : ''}`, parts.map((p) => `${p.label} ${Math.round(p.share * 100)}%`).join('、')] : ['—'];
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', [this.label, ...words].filter(Boolean).join(' '));
  }

  _total(parts) { return parts.reduce((s, p) => s + p.value, 0).toFixed(this.digits || 0); }

  render() {
    const parts = this.parts, single = parts.length === 1;
    // circumference 100 with pathLength, so dash lengths are percents; a hair of a gap between slices
    const gap = parts.length > 1 ? 0.6 : 0;
    let at = 0;
    const arcs = parts.map((p, i) => {
      const len = Math.max(0, p.share * 100 - gap), arc = svg`<circle part="slice" cx="21" cy="21" r="15.9" pathLength="100"
        style=${`stroke:${p.color ?? COLOURS[i % COLOURS.length]}`} stroke-dasharray=${`${len} ${100 - len}`} stroke-dashoffset=${-at}></circle>`;
      at += p.share * 100;
      return arc;
    });
    const middle = single ? html`<span part="total">${Math.round(parts[0].share * 100)}<span part="unit">%</span></span>`
      : parts.length ? html`<span part="total">${this._total(parts)}</span>${this.unit ? html`<span part="unit">${this.unit}</span>` : nothing}`
      : html`<span part="total">—</span>`;
    return html`<div part="ring">
        <svg viewBox="0 0 42 42" aria-hidden="true">${svg`<circle part="track" cx="21" cy="21" r="15.9"></circle>`}${arcs}</svg>
        <div part="middle">${middle}${this.label ? html`<span part="label">${this.label}</span>` : nothing}</div>
      </div>
      ${parts.length ? html`<div part="legend">${parts.map((p, i) => html`<div part="item">
        <span part="swatch" style="background:${p.color ?? COLOURS[i % COLOURS.length]}"></span>
        <span part="name">${p.label}</span>
        <span part="share">${single ? `${p.value.toFixed(this.digits || 0)}${this.unit ? ` ${this.unit}` : ''}` : `${Math.round(p.share * 100)}%`}</span>
      </div>`)}</div>` : nothing}`;
  }
}
define('cw-donut', CwDonut);
