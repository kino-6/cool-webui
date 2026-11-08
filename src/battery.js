import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Math.min(100, Math.max(0, Number(v))) : NaN);

/**
 * <cw-battery>: batteries from the emptiest, each with a bar and its percent. `.items = [{name, level, charging, low}]`
 * (level 0 to 100; `low: true` / `low: false` mark one that says only whether it is low, read as 少ない / 十分). A level at or under `low` (default 20) is
 * shown in the warning colour and read as 少ない; one that cannot be read goes last with a dash. `max` (default 8) rows
 * are shown, and ほか N 件 says how many more there are. Items set while paused wait. In full motion the low bars pulse.
 */
export class CwBattery extends StageMember(LitElement) {
  static properties = {
    low: { type: Number },
    max: { type: Number },
    _items: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    [part='row'] { display: grid; grid-template-columns: minmax(3em, 1fr) minmax(40px, 1.2fr) 3.2em; align-items: center; gap: 10px; padding: 4px 0; }
    [part='name'] { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='bar'] { display: block; height: 8px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--cw-text, #ededed) 14%, transparent); }
    [part='fill'] { display: block; height: 100%; background: var(--cw-signal, #4a90c2); }
    [part='level'] { font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--cw-text-dim, #9a9a9a); }
    [part='row'][data-low] [part='fill'] { background: var(--cw-warn, #f18b82); }
    [part='row'][data-low] [part='level'] { color: var(--cw-warn, #f18b82); }
    [part='row'][data-charging] [part='fill'] { background: var(--cw-ok, #7bc47f); }
    :host([data-motion='full']:not([data-paused])) [part='row'][data-low]:not([data-charging]) [part='fill'] { animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .35; } }
    [part='note'] { font-size: 11px; color: var(--cw-text-dim, #9a9a9a); }
    [part='more'], [part='empty'] { margin-top: 6px; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    /* a narrow list drops the bars; the names and the numbers stay */
    @container (max-width: 200px) { [part='row'] { grid-template-columns: minmax(0, 1fr) auto; } [part='bar'] { display: none; } }
  `;

  constructor() {
    super();
    this.low = 20;
    this.max = 8;
    this._items = [];
    this._pending = undefined;
  }

  /** The batteries shown (or waiting, while paused). */
  get items() { return this._pending ?? this._items; }
  set items(v) {
    const list = (Array.isArray(v) ? v : []).filter((e) => e && typeof e === 'object');
    if (this.isPaused) this._pending = list;
    else this._items = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._items = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('role', 'list');
  }

  render() {
    const rows = this._items.map((e) => {
      const level = num(e.level);
      return { name: e.name ?? '', level, charging: !!e.charging, low: e.low === true || (Number.isFinite(level) && level <= this.low), fine: e.low === false };
    });
    // the emptiest first; then a bare low flag, a bare fine flag, and the unknown ones
    const key = (r) => (Number.isFinite(r.level) ? r.level : r.low ? 101 : r.fine ? 102 : 103);
    rows.sort((a, b) => key(a) - key(b));
    if (!rows.length) return html`<div part="empty">電池の情報はありません</div>`;
    const shown = rows.slice(0, Number.isFinite(this.max) ? Math.max(1, this.max) : 8);
    return html`${shown.map((r) => {
      const pct = Number.isFinite(r.level) ? `${Math.round(r.level)}%` : r.low ? '少ない' : r.fine ? '十分' : '—';
      const words = [r.name, pct, r.low && Number.isFinite(r.level) ? '少ない' : '', r.charging ? '充電中' : ''].filter(Boolean).join(' ');
      return html`<div part="row" role="listitem" aria-label=${words} ?data-low=${r.low} ?data-charging=${r.charging}>
        <span part="name">${r.name}${r.charging ? html` <span part="note">充電中</span>` : nothing}</span>
        <span part="bar"><span part="fill" style="width:${Number.isFinite(r.level) ? r.level : 0}%"></span></span>
        <span part="level">${pct}</span>
      </div>`;
    })}${rows.length > shown.length ? html`<div part="more">ほか ${rows.length - shown.length} 件</div>` : nothing}`;
  }
}
define('cw-battery', CwBattery);
