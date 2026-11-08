import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const STATES = { online: '稼働中', standby: '待機', offline: '停止', unknown: '不明' };

/** <cw-status>: a lamp, the state name and the time since it changed. */
export class CwStatus extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    text: { type: String },
    _state: { state: true },
    _since: { state: true },
    _now: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .row { display: flex; align-items: center; gap: 10px; min-width: 0; }
    [part='lamp'] { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--cw-text-dim, #9a9a9a); }
    :host([state='online']) [part='lamp'] { background: var(--cw-ok, #80c994); }
    :host([state='standby']) [part='lamp'] { background: var(--cw-signal, #4a90c2); }
    :host([state='offline']) [part='lamp'] { background: var(--cw-warn, #f18b82); }
    :host([data-motion='full'][state='online']:not([data-paused])) [part='lamp'] { animation: pulse 2.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .35; } }
    [part='label'] { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }
    [part='value'] { font-size: 14px; font-weight: 500; white-space: nowrap; }
    [part='since'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; white-space: nowrap; }
  `;

  constructor() {
    super();
    this._state = 'unknown';
    this._since = NaN;
    this._now = Date.now();
    this._pending = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._seeded) {
      this._seeded = true;
      if (this.hasAttribute('state')) this._state = this._norm(this.getAttribute('state'));
      if (this.hasAttribute('since')) this._since = this._time(this.getAttribute('since'));
    }
    this._timer = setInterval(() => { if (!this.isPaused) this._now = Date.now(); }, 15000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  _norm(v) { return typeof v === 'string' && Object.hasOwn(STATES, v) ? v : 'unknown'; }
  _time(v) { return typeof v === 'number' ? v : /^\d+$/.test(String(v).trim()) ? Number(v) : Date.parse(v); }

  /** online / standby / offline / unknown; anything else becomes unknown. */
  get state() { return this._pending?.state ?? this._state; }
  set state(v) { this._queue('state', this._norm(v)); }

  /** When the state began: an ISO 8601 string or epoch milliseconds. */
  get since() { return this._pending?.since ?? this._since; }
  set since(v) { this._queue('since', this._time(v)); }

  _queue(key, v) {
    if (this.isPaused) (this._pending ??= {})[key] = v;
    else { this['_' + key] = v; this._now = Date.now(); }
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    Object.assign(this, Object.fromEntries(Object.entries(this._pending).map(([k, v]) => ['_' + k, v])));
    this._pending = undefined;
    this._now = Date.now();
    return n;
  }

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    if (!on) this._now = Date.now();
  }

  get elapsed() {
    if (!Number.isFinite(this._since)) return '';
    const m = Math.max(0, Math.floor((this._now - this._since) / 60000));
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
    return d ? `${d}日${h}時間` : h ? `${h}時間${m % 60}分` : `${m}分`;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.setAttribute('state', this._state);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', [this.label, this.text || STATES[this._state]].filter(Boolean).join(' '));
  }

  render() {
    return html`<div class="row" aria-hidden="true">
      <span part="lamp"></span>
      ${this.label ? html`<span part="label">${this.label}</span>` : nothing}
      <span part="value">${this.text || STATES[this._state]}</span>
      ${this.elapsed ? html`<span part="since">${this.elapsed}</span>` : nothing}
    </div>`;
  }
}
define('cw-status', CwStatus);
