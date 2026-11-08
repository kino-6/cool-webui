import { LitElement, html, svg, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

/** Home Assistant's vacuum states, in Japanese. Unknown words show as they are. */
const WORDS = { cleaning: '掃除中', docked: '充電台', paused: '一時停止', idle: '待機', returning: '戻り中', error: 'エラー' };
const ICON = {
  start: svg`<path d="M7 4v16l13-8z"/>`,
  pause: svg`<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>`,
  stop: svg`<path d="M6 6h12v12H6z"/>`,
  return: svg`<path d="M12 3 3 11h3v9h5v-6h2v6h5v-9h3z"/>`,
};
// what the face shows at once after a press, before the vacuum says so
const AFTER = { start: 'cleaning', pause: 'paused', stop: 'idle', return: 'returning' };
const num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN);

/**
 * <cw-vacuum label="...">: a robot vacuum's state, battery, cleaned area and time, with buttons. `.now = {state, battery,
 * area, duration, error, controls}` merges into what is shown (state in Home Assistant's words: cleaning, docked, paused,
 * idle, returning, error; battery 0-100; area in m²; duration in minutes; controls, the buttons shown, default
 * ['start', 'pause', 'stop', 'return']). The first button starts, or pauses while cleaning (shown only when that is in controls). Buttons send `cw-vacuum` ({action:
 * start | pause | stop | return}) and change the face at once. Values set while paused wait. In full motion the robot
 * turns while it cleans or returns.
 */
export class CwVacuum extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    _d: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    .top { display: flex; align-items: center; gap: 14px; }
    [part='robot'] { flex: none; width: 52px; height: 52px; }
    [part='robot'] circle { fill: none; stroke: currentColor; stroke-width: 2; }
    [part='robot'] .eye { fill: var(--cw-signal, #4a90c2); stroke: none; }
    :host([data-motion='full']:not([data-paused])[state='cleaning']) [part='robot'],
    :host([data-motion='full']:not([data-paused])[state='returning']) [part='robot'] { animation: turn 3s linear infinite; }
    @keyframes turn { to { transform: rotate(360deg); } }
    .what { min-width: 0; }
    [part='label'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='state'] {
      font-size: 24px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
    }
    :host([state='error']) [part='state'], [part='error'] { color: var(--cw-warn, #f18b82); }
    [part='error'] { font-size: 13px; }
    [part='details'] { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 10px; font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    [part='battery'] { display: inline-flex; align-items: center; gap: 6px; }
    .cell { display: inline-block; width: 26px; height: 10px; border: 1.5px solid currentColor; border-radius: 3px; padding: 1px; box-sizing: border-box; }
    .cell i { display: block; height: 100%; background: currentColor; border-radius: 1px; }
    :host([data-low]) [part='battery'] { color: var(--cw-warn, #f18b82); }
    .buttons { display: flex; gap: 8px; margin-top: 12px; }
    button { all: unset; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; color: inherit;
      background: color-mix(in srgb, var(--cw-text, #ededed) 10%, transparent); transform: var(--cw-label-skew, none); }
    button svg { width: 18px; height: 18px; fill: currentColor; }
    [part='start'] { background: var(--cw-signal, #4a90c2); color: var(--cw-text-on, #121212); }
    button:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    button:disabled { opacity: .35; cursor: default; }
    @container (max-width: 240px) { [part='robot'] { width: 36px; height: 36px; } [part='state'] { font-size: 18px; } [part='details'] { display: none; } }
  `;

  constructor() {
    super();
    this._d = { state: '', battery: NaN, area: NaN, duration: NaN, error: '', controls: ['start', 'pause', 'stop', 'return'] };
    this._pending = undefined;
  }

  /** What is shown, with any values still waiting while paused. */
  get now() { return { ...this._d, ...this._pending }; }
  set now(v) {
    if (!v || typeof v !== 'object') return;
    if (this.isPaused) this._pending = { ...this._pending, ...v };
    else this._d = { ...this._d, ...v };
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    this._d = { ...this._d, ...this._pending };
    this._pending = undefined;
    return n;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  // a press is the user's own: it shows at once and beats a waiting state
  _press(action) {
    this._d = { ...this._d, state: AFTER[action], error: '' };
    if (this._pending) delete this._pending.state;
    emit(this, 'cw-vacuum', { action });
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    const d = this._d, b = num(d.battery);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('state', d.state ?? '');
    this.toggleAttribute('data-low', Number.isFinite(b) && b <= 20);
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', [this.label, WORDS[d.state] ?? d.state ?? '', Number.isFinite(b) ? `電池 ${Math.round(b)}%` : '', d.error].filter(Boolean).join(' ') || '掃除機');
  }

  render() {
    const d = this._d, b = num(d.battery), area = num(d.area), mins = num(d.duration), known = !!d.state;
    const has = (name) => !Array.isArray(d.controls) || d.controls.includes(name);
    const button = (name, label, action = name, icon = name) => html`<button part=${name} aria-label=${label} ?disabled=${!known}
      @click=${() => this._press(action)}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[icon]}</svg></button>`;
    return html`<div class="top">
        <svg part="robot" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22"/><circle cx="26" cy="26" r="9"/><circle class="eye" cx="26" cy="9" r="3"/></svg>
        <div class="what">
          ${this.label ? html`<div part="label">${this.label}</div>` : nothing}
          <div part="state">${known ? WORDS[d.state] ?? d.state : '—'}</div>
          ${d.error ? html`<div part="error">${d.error}</div>` : nothing}
        </div>
      </div>
      <div part="details">
        ${Number.isFinite(b) ? html`<span part="battery"><span class="cell"><i style="width:${Math.min(100, Math.max(0, b))}%"></i></span>${Math.round(b)}%</span>` : nothing}
        ${Number.isFinite(area) ? html`<span part="area">${Math.round(area)} m²</span>` : nothing}
        ${Number.isFinite(mins) ? html`<span part="duration">${Math.round(mins)} 分</span>` : nothing}
      </div>
      <div class="buttons">
        ${d.state === 'cleaning' ? (has('pause') ? button('start', '一時停止', 'pause', 'pause') : nothing) : has('start') ? button('start', '始める') : nothing}
        ${has('stop') ? button('stop', '止める') : nothing}
        ${has('return') ? button('return', '充電台に戻す') : nothing}
      </div>`;
  }
}
define('cw-vacuum', CwVacuum);
