import { LitElement, html, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

const WORDS = { active: '動作中', paused: '一時停止', idle: '待機', done: '終了' };
const num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN);
const at = (v) => (typeof v === 'number' ? v : Date.parse(v ?? ''));
const clock = (s) => {
  const t = Math.max(0, Math.ceil(s)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

/**
 * <cw-timer label="...">: how long is left, as a number and a bar that empties. `.now = {state, end, remaining, duration}`
 * merges into what is shown: state is active, paused, idle or done; while active the time left is counted to `end`
 * (epoch ms or an ISO string), otherwise `remaining` (seconds) is shown as it is; `duration` (seconds) is the full bar.
 * When an active timer reaches its end it shows 終了 and sends `cw-done` once. Values set while paused wait, and the
 * shown time stands still; on resume it catches up. In full motion a finished timer blinks.
 */
export class CwTimer extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    _d: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    .top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    [part='label'] { font-size: 14px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    [part='state'] { flex: none; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    :host([state='active']) [part='state'] { color: var(--cw-signal, #4a90c2); }
    :host([state='done']) [part='state'] { color: var(--cw-warn, #f18b82); }
    [part='time'] {
      display: block; margin: 4px 0 10px; font-size: min(18cqw, 48px); line-height: 1; font-variant-numeric: tabular-nums;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
    }
    :host(:not([state='active'])) [part='time'] { color: var(--cw-text-dim, #9a9a9a); }
    [part='bar'] { display: block; height: 8px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--cw-text, #ededed) 14%, transparent); }
    [part='fill'] { display: block; height: 100%; background: var(--cw-signal, #4a90c2); transition: width 1s linear; }
    :host(:not([state='active'])) [part='fill'] { background: var(--cw-text-dim, #9a9a9a); }
    :host([data-motion='off']) [part='fill'], :host([data-paused]) [part='fill'] { transition: none; }
    :host([state='done']) [part='fill'] { background: var(--cw-warn, #f18b82); }
    :host([data-motion='full'][state='done']:not([data-paused])) [part='time'] { animation: blink 1s steps(2, start) infinite; }
    @keyframes blink { to { visibility: hidden; } }
  `;

  constructor() {
    super();
    this._d = { state: 'idle', end: NaN, remaining: NaN, duration: NaN };
    this._pending = undefined;
    this._sent = false;
  }

  /** What is shown, with any values still waiting while paused. */
  get now() { return { ...this._d, ...this._pending }; }
  set now(v) {
    if (!v || typeof v !== 'object') return;
    if (this.isPaused) this._pending = { ...this._pending, ...v };
    else this._set(v);
  }

  _set(v) {
    const prev = this._d, d = { ...prev, ...v };
    if (!WORDS[d.state]) d.state = 'idle';
    // idle, or a new end, may finish again later; the same end received again has finished already
    if (d.state === 'idle' || (d.state === 'active' && at(d.end) !== at(prev.end))) this._sent = false;
    // told it is done straight from active (Home Assistant turns a timer idle at its end): that is finishing too
    if (d.state === 'done' && prev.state === 'active' && !this._sent) { this._sent = true; queueMicrotask(() => emit(this, 'cw-done', {})); }
    this._d = d;
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    this._set(this._pending);
    this._pending = undefined;
    return n;
  }

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    if (on) this._frozen = this._left(); else { this._frozen = undefined; this._tick = Date.now(); }
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'timer');
    this._timer = setInterval(() => { if (this._d.state === 'active' && !this.isPaused) this._tick = Date.now(); }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  /** Seconds left: counted to end while active, else the remaining given. */
  _left() {
    const d = this._d;
    if (d.state === 'done') return 0;
    if (d.state === 'active' && Number.isFinite(at(d.end))) return Math.max(0, (at(d.end) - Date.now()) / 1000);
    return num(d.remaining);
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const left = this._frozen ?? this._left();
    // an active timer that has reached its end is done, once
    if (this._d.state === 'active' && Number.isFinite(at(this._d.end)) && left <= 0 && this._frozen === undefined) {
      this._d = { ...this._d, state: 'done' };
      if (!this._sent) { this._sent = true; queueMicrotask(() => emit(this, 'cw-done', {})); }
    }
    this.setAttribute('state', this._d.state);
    this.setAttribute('aria-label', [this.label, WORDS[this._d.state], Number.isFinite(left) && this._d.state !== 'idle' ? `残り ${clock(left)}` : ''].filter(Boolean).join(' '));
  }

  render() {
    const d = this._d, left = this._frozen ?? this._left(), full = num(d.duration);
    const frac = d.state === 'done' ? 0 : Number.isFinite(left) && full > 0 ? Math.min(1, left / full) : d.state === 'idle' ? 1 : 0;
    return html`<div class="top">${this.label ? html`<span part="label">${this.label}</span>` : html`<span></span>`}<span part="state">${WORDS[d.state]}</span></div>
      <span part="time">${Number.isFinite(left) ? clock(left) : Number.isFinite(full) ? clock(full) : '—'}</span>
      ${Number.isFinite(full) || d.state === 'done' ? html`<span part="bar"><span part="fill" style="width:${(frac * 100).toFixed(2)}%"></span></span>` : nothing}`;
  }
}
define('cw-timer', CwTimer);
