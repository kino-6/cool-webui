import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const blank = (v) => v === null || v === undefined || v === '';

/**
 * <cw-table sort desc max key>: rows and columns. `.columns = [{key, label, unit, digits, warnAbove, warnBelow}]` (without
 * it, the keys of the first row); `.data = [{key: value}]`. A column whose values are numbers is right-aligned and shows
 * `digits` places; a number above `warnAbove` or below `warnBelow` is in the warning colour. An empty value is a dash.
 * Pressing a heading sorts by it (again for the other way); numbers sort as numbers, words in Japanese order, empty
 * values last either way. `sort` (a column key) and `desc` set the first order. `max` (default 20) rows are shown and
 * ほか N 行 says how many more. `key` names the column that tells rows apart (default the first): in full motion a value
 * that changed flashes. Values set while paused wait. A wide table scrolls sideways inside its box.
 */
export class CwTable extends StageMember(LitElement) {
  static properties = {
    sort: { type: String, reflect: true },
    desc: { type: Boolean, reflect: true },
    max: { type: Number },
    key: { type: String },
    _cols: { state: true },
    _rows: { state: true },
  };

  static styles = css`
    :host { display: block; overflow-x: auto; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { padding: 0; text-align: left; font-weight: 500; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); border-bottom: 1px solid var(--cw-border, rgba(255, 255, 255, .12)); }
    th button { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 6px 8px; cursor: pointer; white-space: nowrap; }
    th button:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: -2px; }
    th[aria-sort] { color: var(--cw-text, #ededed); }
    [part='arrow'] { margin-left: 4px; color: var(--cw-signal, #4a90c2); }
    td { padding: 6px 8px; white-space: nowrap; border-bottom: 1px solid color-mix(in srgb, var(--cw-border, rgba(255, 255, 255, .12)) 60%, transparent); }
    tr:last-child td { border-bottom: none; }
    .num, .num button { text-align: right; font-variant-numeric: tabular-nums; }
    [data-warn] { color: var(--cw-warn, #f18b82); }
    [part='unit'] { margin-left: 2px; font-size: 11px; color: var(--cw-text-dim, #9a9a9a); }
    :host([data-motion='full']:not([data-paused])) td[data-changed] { animation: flash 1.2s ease-out; }
    @keyframes flash { from { background: color-mix(in srgb, var(--cw-signal, #4a90c2) 35%, transparent); } }
    [part='more'], [part='empty'] { margin-top: 6px; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
  `;

  constructor() {
    super();
    this.desc = false;
    this.max = 20;
    this._cols = [];
    this._rows = [];
    this._pending = undefined;
    this._seen = new Map();
  }

  _put(change) {
    if (this.isPaused) this._pending = { ...this._pending, ...change };
    else Object.assign(this, change);
  }

  /** The rows (or the ones waiting, while paused). */
  get data() { return this._pending?._rows ?? this._rows; }
  set data(v) { this._put({ _rows: (Array.isArray(v) ? v : []).filter((r) => r && typeof r === 'object') }); }

  /** The columns as given (or waiting); empty means the keys of the first row. */
  get columns() { return this._pending?._cols ?? this._cols; }
  set columns(v) { this._put({ _cols: (Array.isArray(v) ? v : []).filter((c) => c && typeof c === 'object' && c.key != null) }); }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    Object.assign(this, this._pending);
    this._pending = undefined;
    return n;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  get _shownCols() {
    if (this._cols.length) return this._cols;
    return Object.keys(this._rows[0] ?? {}).map((key) => ({ key }));
  }

  _press(key) {
    this.desc = this.sort === key && !this.desc;
    this.sort = key;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
  }

  render() {
    const cols = this._shownCols, rows = this._rows;
    if (!cols.length) return html`<div part="empty">表示する行はありません</div>`;
    // a column is numeric when every value in it that is not empty reads as a number
    const numeric = new Map(cols.map((c) => {
      const vals = rows.map((r) => r[c.key]).filter((v) => !blank(v));
      return [c.key, vals.length > 0 && vals.every((v) => Number.isFinite(toNumber(v)))];
    }));
    let order = rows;
    const sc = cols.find((c) => c.key === this.sort);
    if (sc) {
      const num = numeric.get(sc.key), sign = this.desc ? -1 : 1;
      order = [...rows].sort((a, b) => {
        const x = a[sc.key], y = b[sc.key];
        if (blank(x) || blank(y)) return blank(x) - blank(y);
        return sign * (num ? toNumber(x) - toNumber(y) : String(x).localeCompare(String(y), 'ja'));
      });
    }
    const limit = Number.isFinite(this.max) && this.max >= 1 ? Math.floor(this.max) : 20;
    const shown = order.slice(0, limit);
    // what each row's values were when last drawn, to flash the ones that changed
    const id = this.key && cols.some((c) => c.key === this.key) ? this.key : cols[0].key;
    const before = this._seen, seen = new Map();
    const body = shown.map((r) => {
      const rid = String(r[id]), old = before.get(rid);
      seen.set(rid, r);
      return html`<tr>${cols.map((c) => {
        const v = r[c.key], num = numeric.get(c.key), n = toNumber(v);
        const warn = num && Number.isFinite(n) && ((c.warnAbove != null && n > c.warnAbove) || (c.warnBelow != null && n < c.warnBelow));
        const text = blank(v) ? '—' : num ? (c.digits != null ? n.toFixed(c.digits) : String(n)) : String(v);
        return html`<td class=${num ? 'num' : ''} ?data-warn=${warn} ?data-changed=${!!old && old[c.key] !== v}>${text}${c.unit && !blank(v) ? html`<span part="unit">${c.unit}</span>` : nothing}</td>`;
      })}</tr>`;
    });
    this._seen = seen;
    return html`<table>
        <thead><tr>${cols.map((c) => {
          const on = c.key === this.sort;
          return html`<th class=${numeric.get(c.key) ? 'num' : ''} aria-sort=${on ? (this.desc ? 'descending' : 'ascending') : nothing}>
            <button @click=${() => this._press(c.key)}>${c.label ?? c.key}${on ? html`<span part="arrow" aria-hidden="true">${this.desc ? '▼' : '▲'}</span>` : nothing}</button></th>`;
        })}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${rows.length ? nothing : html`<div part="empty">表示する行はありません</div>`}
      ${order.length > shown.length ? html`<div part="more">ほか ${order.length - shown.length} 行</div>` : nothing}`;
  }
}
define('cw-table', CwTable);
