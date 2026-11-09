import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** Six colours from the look's own values, in the order states take them. */
const COLOURS = [
  'var(--cw-signal, #4a90c2)', 'var(--cw-ok, #7bc47f)', 'var(--cw-warn, #f18b82)', 'var(--cw-text-dim, #9a9a9a)',
  'color-mix(in srgb, var(--cw-signal, #4a90c2) 50%, var(--cw-ok, #7bc47f))', 'color-mix(in srgb, var(--cw-warn, #f18b82) 50%, var(--cw-signal, #4a90c2))',
];
/** States that mean nothing is going on: no band is drawn for them. */
const IDLE = new Set(['off', 'false', 'closed', 'idle', 'not_home', 'standby']);
const toTime = (v) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN);
const hhmm = (t) => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const length = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `${m}分` : `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}`; };

/**
 * <cw-timeline hours>: for each thing, which state it was in when, as bands along a time axis that ends now and
 * reaches back `hours` (default 24). `.data = [{label, spans: [{from, to, state}]}]`, from and to a timestamp, a Date or
 * a date string; a span without `to` goes on to now. States off, false, closed, idle, not_home and standby draw no
 * band; the others take the look's colours in the order they first appear, or `.colors = {state: colour}`. A legend
 * names them. Each band says its state, times and length when hovered; each row reads how long each state lasted in
 * the window. The axis moves with the clock once a minute. Values set while paused wait. In full motion a band that
 * goes on to now pulses.
 */
export class CwTimeline extends StageMember(LitElement) {
  static properties = {
    hours: { type: Number },
    colors: { attribute: false },
    _data: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    [part='row'], [part='axisrow'] { display: grid; grid-template-columns: minmax(4em, 9em) 1fr; align-items: center; gap: 10px; padding: 3px 0; }
    [part='label'] { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='track'] { position: relative; height: 18px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--cw-text, #ededed) 7%, transparent); }
    [part='band'] { position: absolute; top: 0; bottom: 0; min-width: 2px; }
    :host([data-motion='full']:not([data-paused])) [part='band'][data-open] { animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .55; } }
    [part='axis'] { position: relative; height: 14px; font-size: 10px; color: var(--cw-text-dim, #9a9a9a); }
    [part='tick'] { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; font-variant-numeric: tabular-nums; }
    [part='legend'] { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; font-size: 11px; color: var(--cw-text-dim, #9a9a9a); }
    [part='key'] { display: inline-flex; align-items: center; gap: 5px; }
    [part='key'] i { width: 10px; height: 10px; border-radius: 3px; }
    [part='empty'] { font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    @container (max-width: 260px) { [part='row'], [part='axisrow'] { grid-template-columns: 1fr; gap: 2px; } [part='tick']:nth-child(even):not(:last-child) { display: none; } }
  `;

  constructor() {
    super();
    this.hours = 24;
    this.colors = undefined;
    this._data = [];
    this._pending = undefined;
    this._tick = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    // the window ends now, so the axis moves once a minute
    this._timer = setInterval(() => { if (!this.isPaused) this._tick = Date.now(); }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  /** The rows (or the ones waiting, while paused). */
  get data() { return this._pending ?? this._data; }
  set data(v) {
    const list = (Array.isArray(v) ? v : []).filter((e) => e && typeof e === 'object');
    if (this.isPaused) this._pending = list;
    else this._data = list;
  }

  flush() {
    this._tick = Date.now();
    if (!this._pending) return 0;
    this._data = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  /** The window shown: [start, end] in ms, end being now. */
  get range() {
    const h = Number.isFinite(this.hours) && this.hours > 0 ? this.hours : 24;
    const end = Date.now();
    return [end - h * 3600e3, end];
  }

  /** Each row's spans clipped to the window, with the colour of their state: [{label, spans: [{from, to, state, open, color}]}]. */
  get rows() {
    const [lo, hi] = this.range, order = [];
    const rows = this._data.map((e) => ({
      label: String(e.label ?? ''),
      spans: (Array.isArray(e.spans) ? e.spans : []).filter((s) => s && typeof s === 'object').map((s) => {
        const from = toTime(s.from), open = s.to === undefined || s.to === null, to = open ? hi : toTime(s.to), state = String(s.state ?? '');
        return { from: Math.max(lo, from), to: Math.min(hi, to), state, open };
      }).filter((s) => Number.isFinite(s.from) && Number.isFinite(s.to) && s.to > s.from && !IDLE.has(s.state)),
    }));
    for (const r of rows) for (const s of r.spans) if (!order.includes(s.state)) order.push(s.state);
    const given = this.colors && typeof this.colors === 'object' ? this.colors : {};
    this._states = order.map((st, i) => [st, typeof given[st] === 'string' ? given[st] : COLOURS[i % COLOURS.length]]);
    const colour = Object.fromEntries(this._states);
    for (const r of rows) for (const s of r.spans) s.color = colour[s.state];
    return rows;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('role', 'list');
  }

  render() {
    void this._tick;
    if (!this._data.length) return html`<div part="empty">表示する対象はありません</div>`;
    const [lo, hi] = this.range, span = hi - lo, rows = this.rows;
    const at = (t) => ((t - lo) / span) * 100;
    // ticks on whole hours, about four of them, kept clear of いま at the right end
    const every = [1, 2, 3, 4, 6, 12, 24, 48].find((h) => span / (h * 3600e3) <= 5) ?? 168;
    const first = new Date(lo); first.setMinutes(0, 0, 0);
    const ticks = [];
    for (let t = first.getTime() + 3600e3; t < hi; t += 3600e3) {
      if (new Date(t).getHours() % every === 0 && at(t) > 4 && at(t) < 88) ticks.push(t);
    }
    return html`${rows.map((r) => {
      const total = new Map();
      for (const s of r.spans) total.set(s.state, (total.get(s.state) ?? 0) + (s.to - s.from));
      const words = [r.label, ...[...total].map(([st, ms]) => `${st} ${length(ms)}`)].filter(Boolean).join(' ');
      return html`<div part="row" role="listitem" aria-label=${words || r.label}>
        <span part="label">${r.label}</span>
        <span part="track">${r.spans.map((s) => html`<i part="band" ?data-open=${s.open} data-state=${s.state}
          style="left:${at(s.from)}%;width:${at(s.to) - at(s.from)}%;background:${s.color}"
          title=${`${s.state} ${hhmm(s.from)}〜${s.open ? 'いま' : hhmm(s.to)}（${length(s.to - s.from)}）`}></i>`)}</span>
      </div>`;
    })}
      <div part="axisrow" aria-hidden="true"><span></span><span part="axis">${ticks.map((t) => html`<span part="tick" style="left:${at(t)}%">${hhmm(t)}</span>`)}<span part="tick" style="left:100%;transform:translateX(-100%)">いま</span></span></div>
      ${this._states.length ? html`<div part="legend">${this._states.map(([st, c]) => html`<span part="key"><i style="background:${c}"></i>${st}</span>`)}</div>` : nothing}`;
  }
}
define('cw-timeline', CwTimeline);
