import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const DAY = 86400e3;
// a date alone (2026-11-03, how calendars send all-day events) is that day's local midnight, not UTC's
const ms = (v) => {
  if (typeof v === 'number') return v;
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
  return d ? new Date(+d[1], d[2] - 1, +d[3]).getTime() : Date.parse(v);
};
const midnight = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const hm = (t) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

/**
 * <cw-agenda>: what is coming up, from today on, under one heading per day (今日, 明日, then the date).
 * `.events = [{title, start, end, allDay, where, color}]` (start and end as ISO strings or epoch ms).
 * Finished events drop off; one under way is marked いま, and the next one today says how long until it starts.
 * `days` (default 7) and `max` (default 8 rows) limit the list. `.now` (epoch ms) freezes the clock, otherwise
 * it is the real time, looked at again every 30 seconds unless paused. Events set while paused wait.
 */
export class CwAgenda extends StageMember(LitElement) {
  /** How often the clock is looked at again, in ms. */
  static TICK = 30000;

  static properties = {
    days: { type: Number },
    max: { type: Number },
    now: { type: Number },
    _events: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); overflow: hidden; container-type: inline-size; }
    section + section { margin-top: 12px; }
    [part='day'] {
      display: inline-block; margin-bottom: 6px; font-size: 13px; color: var(--cw-label-color, var(--cw-text-dim, #9a9a9a));
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
      padding: var(--cw-label-pad, 0); background: var(--cw-label-bg, none); transform: var(--cw-label-skew, none);
    }
    [part='event'] { display: grid; grid-template-columns: 4px auto minmax(3em, 1fr) auto; align-items: center; gap: 10px; padding: 5px 0; }
    [part='bar'] { align-self: stretch; border-radius: 2px; background: var(--color, var(--cw-signal, #4a90c2)); }
    [part='time'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .what { min-width: 0; }
    [part='title'] { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='where'] { font-size: 12px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* in a narrow list the end time goes first, then the title gives way; the badge is never cut */
    @container (max-width: 260px) { .end { display: none; } [part='event'] { gap: 6px; grid-template-columns: 4px auto minmax(2.5em, 1fr) auto; } }
    [part='badge'] { flex: none; font-size: 12px; white-space: nowrap; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    [part='event'][data-now] [part='badge'] { color: var(--cw-text-on, #121212); background: var(--cw-signal, #4a90c2); padding: 1px 8px; border-radius: 999px; }
    :host([data-motion='full']:not([data-paused])) [part='event'][data-now] [part='bar'] { animation: glow 2s ease-in-out infinite; }
    @keyframes glow { 50% { opacity: .35; } }
    [part='empty'] { font-size: 14px; color: var(--cw-text-dim, #9a9a9a); }
  `;

  constructor() {
    super();
    this.days = 7;
    this.max = 8;
    this._events = [];
    this._pending = undefined;
  }

  /** The events shown (or waiting, while paused). */
  get events() { return this._pending ?? this._events; }
  set events(v) {
    const list = (Array.isArray(v) ? v : []).filter((e) => e && Number.isFinite(ms(e.start)));
    if (this.isPaused) this._pending = list;
    else this._events = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._events = this._pending;
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
    this._timer = setInterval(() => { if (!this.isPaused) this._tick = Date.now(); }, this.constructor.TICK);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
  }

  _dayName(day, today) {
    const n = Math.round((day - today) / DAY);
    if (n === 0) return '今日';
    if (n === 1) return '明日';
    return new Date(day).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  }

  render() {
    const now = Number.isFinite(this.now) ? this.now : Date.now(), today = midnight(now), until = today + this.days * DAY;
    // an event without an end lasts an hour, an all-day one the whole day
    const end = (e) => (Number.isFinite(ms(e.end)) ? ms(e.end) : e.allDay ? midnight(ms(e.start)) + DAY : ms(e.start) + 3600e3);
    const list = this._events.filter((e) => end(e) > now && ms(e.start) < until).sort((a, b) => ms(a.start) - ms(b.start)).slice(0, this.max);
    if (!list.length) return html`<div part="empty">予定はありません</div>`;
    const next = list.find((e) => !e.allDay && ms(e.start) > now && ms(e.start) < today + DAY);
    const groups = new Map();
    for (const e of list) {
      const day = Math.max(today, midnight(ms(e.start)));
      (groups.get(day) ?? groups.set(day, []).get(day)).push(e);
    }
    return html`${[...groups].map(([day, events]) => html`<section>
      <div part="day">${this._dayName(day, today)}</div>
      ${events.map((e) => {
        const on = ms(e.start) <= now && !e.allDay, before = ms(e.start) < today;
        const mins = e === next ? Math.ceil((ms(e.start) - now) / 60000) : NaN;
        const badge = on ? 'いま' : Number.isFinite(mins) ? (mins >= 60 ? `あと ${Math.floor(mins / 60)} 時間${mins % 60 ? ` ${mins % 60} 分` : ''}` : `あと ${mins} 分`) : '';
        return html`<div part="event" role="listitem" ?data-now=${on} style=${e.color ? `--color:${e.color}` : ''}
          aria-label=${[this._dayName(day, today), e.allDay ? '終日' : before ? `昨日から ${hm(end(e))} まで` : hm(ms(e.start)), e.title, e.where, badge].filter(Boolean).join(' ')}>
          <span part="bar"></span>
          <span part="time">${e.allDay ? '終日' : before ? `〜${hm(end(e))}` : html`${hm(ms(e.start))}<span class="end">–${hm(end(e))}</span>`}</span>
          <span class="what"><div part="title">${e.title}</div>${e.where ? html`<div part="where">${e.where}</div>` : nothing}</span>
          <span part="badge">${badge}</span>
        </div>`;
      })}
    </section>`)}`;
  }
}
define('cw-agenda', CwAgenda);
