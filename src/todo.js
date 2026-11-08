import { LitElement, html, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

const DAY = 864e5;
// a date alone (2026-11-03) is that day's local midnight; a date and time is that moment
const when = (v) => {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
  return d ? new Date(+d[1], d[2] - 1, +d[3]).getTime() : Date.parse(v ?? '');
};
// the day a moment falls on in a time zone (the browser's when none), counted in days
const dayNumber = (t, tz) => {
  let f;
  try { f = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, year: 'numeric', month: 'numeric', day: 'numeric' }); } catch { f = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }); }
  const p = Object.fromEntries(f.formatToParts(t).map((x) => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day) / DAY;
};
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * <cw-todo>: a to-do list. `.items = [{uid, summary, status, due}]` (status needs_action or completed; due a date or a
 * date and time). Items to do come first, the soonest due first and those without a due date after; done ones follow,
 * struck through, when `done` is set, else only their count shows. `max` (default 8) rows. Pressing an item's circle
 * sends `cw-todo` ({uid, summary, status}) with the other status and shows it at once; `readonly` turns the circles off.
 * Overdue dates are in the warning colour. Items set while paused wait; the dates are looked at again every minute.
 * In full motion an overdue date pulses. `time-zone` (an IANA name) decides which day a date and time falls on.
 */
export class CwTodo extends StageMember(LitElement) {
  static properties = {
    max: { type: Number },
    done: { type: Boolean },
    readonly: { type: Boolean },
    timeZone: { type: String, attribute: 'time-zone' },
    _items: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    [part='item'] { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
    [part='check'] { all: unset; flex: none; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
      border: 2px solid color-mix(in srgb, var(--cw-text, #ededed) 45%, transparent); box-sizing: border-box; }
    [part='check']:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    [part='check']:disabled { cursor: default; opacity: .5; }
    [part='item'][data-done] [part='check'] { background: var(--cw-signal, #4a90c2); border-color: var(--cw-signal, #4a90c2); }
    [part='item'][data-done] [part='check']::after { content: ''; width: 8px; height: 4px; border: 2px solid var(--cw-text-on, #121212); border-top: 0; border-right: 0; transform: rotate(-45deg) translate(1px, -1px); }
    [part='summary'] { flex: 1; min-width: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='item'][data-done] [part='summary'] { text-decoration: line-through; color: var(--cw-text-dim, #9a9a9a); }
    [part='due'] { flex: none; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; white-space: nowrap; }
    [part='item'][data-overdue] [part='due'] { color: var(--cw-warn, #f18b82); }
    :host([data-motion='full']:not([data-paused])) [part='item'][data-overdue] [part='due'] { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .4; } }
    [part='more'], [part='empty'] { margin-top: 6px; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    @container (max-width: 200px) { [part='due'] { display: none; } }
  `;

  constructor() {
    super();
    this.max = 8;
    this._items = [];
    this._pending = undefined;
  }

  /** The items shown (or waiting, while paused). */
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

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    if (!on) this._tick = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'list');
    this._timer = setInterval(() => { if (!this.isPaused) this._tick = Date.now(); }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
  }

  // a press is the user's own: it shows at once, and a list waiting while paused gets it too
  _press(item) {
    const status = item.status === 'completed' ? 'needs_action' : 'completed';
    const same = (e) => e === item || (item.uid != null ? e.uid === item.uid : e.summary === item.summary);
    this._items = this._items.map((e) => (same(e) ? { ...e, status } : e));
    if (this._pending) this._pending = this._pending.map((e) => (same(e) ? { ...e, status } : e));
    emit(this, 'cw-todo', { uid: item.uid, summary: item.summary, status });
  }

  /** Days from today to the due day: a date alone is that day, a date and time the day it falls on in the time zone. */
  _days(due, now) {
    const d = DATE_ONLY.exec(due ?? '');
    return (d ? Date.UTC(+d[1], d[2] - 1, +d[3]) / DAY : dayNumber(when(due), this.timeZone)) - dayNumber(now, this.timeZone);
  }

  _dueWords(due, t, now) {
    const days = this._days(due, now);
    if (days === 0) return '今日';
    if (days === 1) return '明日';
    if (days === -1) return '昨日';
    if (DATE_ONLY.test(due ?? '')) { const d = DATE_ONLY.exec(due); return `${+d[2]}/${+d[3]}`; }
    try { return new Date(t).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: this.timeZone || undefined }); } catch { return new Date(t).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }); }
  }

  render() {
    const now = Date.now(), max = Number.isFinite(this.max) ? Math.max(1, this.max) : 8;
    const open = this._items.filter((e) => e.status !== 'completed'), closed = this._items.filter((e) => e.status === 'completed');
    // the soonest due first, those without a due date after, in their own order
    const due = (e) => (Number.isFinite(when(e.due)) ? when(e.due) : Infinity);
    const list = [...open].sort((a, b) => due(a) - due(b)).concat(this.done ? closed : []);
    if (!this._items.length) return html`<div part="empty">やることはありません</div>`;
    const shown = list.slice(0, max), rest = list.length - shown.length;
    return html`${shown.map((e) => {
      const t = when(e.due), done = e.status === 'completed';
      // a date alone is overdue from the next day; a date and time from that moment
      const overdue = !done && Number.isFinite(t) && (DATE_ONLY.test(e.due ?? '') ? this._days(e.due, now) < 0 : t < now);
      const words = Number.isFinite(t) ? this._dueWords(e.due, t, now) : '';
      return html`<div part="item" role="listitem" ?data-done=${done} ?data-overdue=${overdue}
        aria-label=${[e.summary, done ? '完了' : '', words ? `期限 ${words}` : '', overdue ? '期限切れ' : ''].filter(Boolean).join(' ')}>
        <button part="check" role="checkbox" aria-checked=${String(done)} aria-label=${e.summary ?? ''} ?disabled=${this.readonly || (e.uid == null && !e.summary)} @click=${() => this._press(e)}></button>
        <span part="summary">${e.summary ?? ''}</span>
        ${words ? html`<span part="due">${words}</span>` : nothing}
      </div>`;
    })}${rest > 0 ? html`<div part="more">ほか ${rest} 件</div>` : nothing}${!this.done && closed.length ? html`<div part="more">完了 ${closed.length} 件</div>` : nothing}`;
  }
}
define('cw-todo', CwTodo);
