import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const toNumber = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
/** A local date as YYYY-MM-DD. */
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** A Date from a timestamp, a Date or a string; YYYY-MM-DD alone is that local day. */
function toDate(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); }
  const d = new Date(typeof v === 'string' || typeof v === 'number' || v instanceof Date ? v : NaN);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** Monday 0 ... Sunday 6. */
const weekday = (d) => (d.getDay() + 6) % 7;

/**
 * <cw-heatmap layout days max unit digits>: squares shaded by value. `.data = [{date, value}]`, date a timestamp, a
 * Date or YYYY-MM-DD (that local day). layout="calendar" (default) puts one square per day in week columns, Monday
 * on top, for the last `days` (default 91) up to today, with month names above. layout="week" puts the 7 weekdays
 * against the 24 hours. Values that land on the same square add up. Shading has five steps from empty to the full
 * accent, against `max` or else the largest square; each square says its date (or weekday and hour) and value when
 * hovered. Today is outlined. Values set while paused wait. In full motion today's square pulses.
 */
export class CwHeatmap extends StageMember(LitElement) {
  static properties = {
    layout: { type: String },
    days: { type: Number },
    max: { type: Number },
    unit: { type: String },
    digits: { type: Number },
    _data: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); font-size: 10px; }
    [part='grid'] { display: grid; gap: 3px; grid-auto-flow: column; grid-template-rows: auto repeat(7, 1fr); grid-template-columns: auto; grid-auto-columns: minmax(0, 20px); justify-content: start; }
    :host([layout='week']) [part='grid'] { grid-auto-flow: row; grid-template-rows: none; grid-template-columns: auto repeat(24, minmax(0, 20px)); }
    [part='grid'] > span { color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; line-height: 1; }
    [part='cell'] { aspect-ratio: 1; min-width: 6px; border-radius: 2px; background: color-mix(in srgb, var(--cw-text, #ededed) 8%, transparent); }
    [part='cell'][data-step='1'] { background: color-mix(in srgb, var(--cw-signal, #4a90c2) 30%, transparent); }
    [part='cell'][data-step='2'] { background: color-mix(in srgb, var(--cw-signal, #4a90c2) 55%, transparent); }
    [part='cell'][data-step='3'] { background: color-mix(in srgb, var(--cw-signal, #4a90c2) 78%, transparent); }
    [part='cell'][data-step='4'] { background: var(--cw-signal, #4a90c2); }
    [part='cell'][data-out] { visibility: hidden; }
    [part='cell'][data-today] { outline: 1.5px solid var(--cw-text, #ededed); outline-offset: 1px; }
    :host([data-motion='full']:not([data-paused])) [part='cell'][data-today] { animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 50% { outline-color: transparent; } }
    [part='legend'] { display: flex; align-items: center; gap: 3px; margin-top: 6px; color: var(--cw-text-dim, #9a9a9a); }
    [part='legend'] [part='cell'] { width: 10px; min-width: 0; }
  `;

  constructor() {
    super();
    this.layout = 'calendar';
    this.days = 91;
    this.digits = 0;
    this._data = [];
    this._pending = undefined;
  }

  /** The values (or the ones waiting, while paused). */
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

  /** Value per square: YYYY-MM-DD for the calendar, "weekday-hour" for the week. */
  get sums() {
    const week = this.layout === 'week', out = new Map();
    for (const e of this._data) {
      const d = toDate(e.date), v = toNumber(e.value);
      if (!d || !Number.isFinite(v)) continue;
      const k = week ? `${weekday(d)}-${d.getHours()}` : dayKey(d);
      out.set(k, (out.get(k) ?? 0) + v);
    }
    return out;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    if (this.layout !== 'week' && this.getAttribute('layout') !== 'calendar') this.setAttribute('layout', 'calendar');
    this._sums = this.sums;
    const values = [...this._sums.values()];
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', values.length ? `最大 ${this._fmt(Math.max(...values))}、合計 ${this._fmt(values.reduce((t, v) => t + v, 0))}` : '値はありません');
  }

  _fmt(v) { return `${v.toFixed(this.digits || 0)}${this.unit ? ` ${this.unit}` : ''}`; }

  render() {
    const sums = this._sums, values = [...sums.values()];
    const top = Number.isFinite(this.max) && this.max > 0 ? this.max : Math.max(0, ...values);
    const step = (v) => (v === undefined || v <= 0 || top <= 0 ? 0 : Math.min(4, Math.ceil((v / top) * 4)));
    const cell = (key, title, v, extra = {}) => html`<i part="cell" data-key=${key} data-step=${step(v)} title=${title}
      ?data-today=${extra.today} ?data-out=${extra.out}></i>`;
    const now = new Date();
    let body;
    if (this.layout === 'week') {
      const hours = Array.from({ length: 24 }, (_, h) => h);
      body = html`<span></span>${hours.map((h) => html`<span>${h % 6 === 0 ? h : ''}</span>`)}
        ${DAYS.map((name, d) => html`<span>${name}</span>${hours.map((h) => {
          const v = sums.get(`${d}-${h}`);
          return cell(`${d}-${h}`, `${name} ${h}時 ${v === undefined ? '—' : this._fmt(v)}`, v, { today: d === weekday(now) && h === now.getHours() });
        })}`)}`;
    } else {
      const n = Number.isFinite(this.days) && this.days >= 1 ? Math.min(Math.floor(this.days), 371) : 91;
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (n - 1));
      // the first column starts on the Monday on or before start; the last ends on the Sunday on or after today
      const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() - weekday(start));
      const cols = Math.ceil((weekday(start) + n + (6 - weekday(end))) / 7);
      const today = dayKey(end), from = dayKey(start);
      const weeks = Array.from({ length: cols }, (_, c) => Array.from({ length: 7 }, (_, r) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + c * 7 + r)));
      // a month's name over the column that holds its first day; the first column names its month too, when the next name is 3 columns away
      const names = weeks.map((days) => days.find((d) => d.getDate() === 1 && dayKey(d) >= from && dayKey(d) <= today));
      const next = names.findIndex(Boolean);
      const columns = weeks.map((days, c) => {
        const named = names[c] ?? (c === 0 && (next < 0 || next >= 3) ? start : null);
        return html`<span>${named ? `${named.getMonth() + 1}月` : ''}</span>
          ${days.map((d) => { const k = dayKey(d), v = sums.get(k), out = k < from || k > today;
            return cell(k, `${k} ${v === undefined ? '—' : this._fmt(v)}`, v, { today: k === today, out }); })}`;
      });
      body = html`<span></span>${DAYS.map((d, i) => html`<span>${i % 2 === 0 ? d : ''}</span>`)}${columns}`;
    }
    return html`<div part="grid">${body}</div>
      <div part="legend">少${[0, 1, 2, 3, 4].map((s) => html`<i part="cell" data-step=${s}></i>`)}多</div>`;
  }
}
define('cw-heatmap', CwHeatmap);
