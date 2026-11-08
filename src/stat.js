import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** <cw-stat>: one large number with a unit; warns outside warn-below..warn-above; rolls digits in full motion. */
/** Numbers and numeric strings become numbers; anything else (including '' and null) becomes NaN. */
function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

export class CwStat extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    unit: { type: String },
    digits: { type: Number },
    warnAbove: { type: Number, attribute: 'warn-above' },
    warnBelow: { type: Number, attribute: 'warn-below' },
    _shown: { state: true },
  };

  static styles = css`
    :host { display: block; width: 100%; height: 100%; container-type: size; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .wrap { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px; }
    [part='label'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); }
    .num { display: flex; align-items: baseline; gap: 6px; line-height: 1; white-space: nowrap; }
    [part='value'] { font-size: var(--cw-stat-size, min(64cqh, 30cqw)); font-weight: var(--cw-display-weight, 500); font-family: var(--cw-display-font, inherit); font-stretch: var(--cw-display-stretch, normal); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
    [part='unit'] { font-size: max(13px, calc(var(--cw-stat-size, min(64cqh, 30cqw)) * 0.32)); color: var(--cw-text-dim, #9a9a9a); }
    :host([warn]) [part='value'] { color: var(--cw-warn, #f18b82); }
    .roll { display: inline-block; height: 1.15em; overflow: hidden; vertical-align: bottom; line-height: 1.15; }
    .col { display: flex; flex-direction: column; transition: transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1); }
  `;

  constructor() {
    super();
    this.digits = 0;
    this._shown = NaN;
    this._pending = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    // the value attribute seeds the first value only
    if (this._seeded) return;
    this._seeded = true;
    if (this.hasAttribute('value')) this._shown = toNumber(this.getAttribute('value'));
  }

  /** The number shown; anything that is not a finite number shows a dash. */
  get value() { return this._pending !== undefined ? this._pending : this._shown; }
  set value(v) {
    const n = toNumber(v);
    if (this.isPaused) this._pending = n;
    else this._shown = n;
  }

  flush() {
    if (this._pending === undefined) return 0;
    this._shown = this._pending;
    this._pending = undefined;
    return 1;
  }

  get text() {
    return Number.isFinite(this._shown) ? this._shown.toFixed(this.digits || 0) : '—';
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    const v = this._shown;
    const warn = Number.isFinite(v) && ((this.warnAbove != null && v > this.warnAbove) || (this.warnBelow != null && v < this.warnBelow));
    this.toggleAttribute('warn', warn);
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', [this.label, this.text, this.unit].filter(Boolean).join(' '));
  }

  _digits(text) {
    return [...text].map((ch) => /\d/.test(ch)
      ? html`<span class="roll"><span class="col" style="transform:translateY(${-+ch * 1.15}em)">${[...'0123456789'].map((d) => html`<span>${d}</span>`)}</span></span>`
      : html`<span>${ch}</span>`);
  }

  render() {
    const t = this.text;
    return html`<div class="wrap">
      ${this.label ? html`<span part="label">${this.label}</span>` : nothing}
      <div class="num" aria-hidden="true"><span part="value">${this.motionLevel === 'full' && t !== '—' ? this._digits(t) : t}</span>${this.unit ? html`<span part="unit">${this.unit}</span>` : nothing}</div>
    </div>`;
  }
}
define('cw-stat', CwStat);
