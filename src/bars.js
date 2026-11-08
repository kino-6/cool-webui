import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** <cw-bars>: a list of horizontal bars. `.data = [{label, value}]`; `max` fixes the scale. */
export class CwBars extends StageMember(LitElement) {
  static properties = {
    max: { type: Number },
    unit: { type: String },
    _rows: { state: true },
  };

  static styles = css`
    :host { display: block; height: 100%; overflow: auto; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .list { display: flex; flex-direction: column; gap: 10px; }
    [part='row'] { display: grid; grid-template-columns: minmax(0, 7em) 1fr auto; align-items: center; gap: 12px; font-size: 14px; }
    [part='label'] { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--cw-text-dim, #9a9a9a); }
    .track { height: 8px; border-radius: 4px; background: var(--cw-well, #171717); overflow: hidden; }
    [part='fill'] { height: 100%; border-radius: 4px; background: var(--cw-signal, #4a90c2); }
    :host([data-motion='full']) [part='fill'] { transition: width 700ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    [part='value'] { font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; min-width: 4.5em; text-align: right; }
    [part='unit'] { color: var(--cw-text-dim, #9a9a9a); margin-left: 3px; font-weight: 400; }
  `;

  constructor() {
    super();
    this._rows = [];
    this._pending = undefined;
  }

  /** The rows shown: [{label, value}]. */
  get data() { return this._pending ?? this._rows; }
  set data(v) {
    const rows = Array.isArray(v) ? v.map((r) => ({ label: String(r?.label ?? ''), value: typeof r?.value === 'number' ? r.value : Number.NaN })) : [];
    if (this.isPaused) this._pending = rows;
    else this._rows = rows;
  }

  flush() {
    if (!this._pending) return 0;
    this._rows = this._pending;
    this._pending = undefined;
    return 1;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('role', 'list');
  }

  render() {
    const top = this.max > 0 ? this.max : Math.max(0, ...this._rows.map((r) => (Number.isFinite(r.value) ? r.value : 0)));
    return html`<div class="list">${this._rows.map((r) => {
      const ok = Number.isFinite(r.value);
      const pct = ok && top > 0 ? Math.min(100, Math.max(0, (r.value / top) * 100)) : 0;
      const text = ok ? String(Math.round(r.value * 10) / 10) : '—';
      return html`<div part="row" role="listitem" aria-label=${[r.label, text, ok ? this.unit : ''].filter(Boolean).join(' ')}>
        <span part="label">${r.label}</span>
        <span class="track"><span part="fill" style="display:block;width:${pct}%"></span></span>
        <span part="value">${text}${ok && this.unit ? html`<span part="unit">${this.unit}</span>` : ''}</span>
      </div>`;
    })}</div>`;
  }
}
define('cw-bars', CwBars);
