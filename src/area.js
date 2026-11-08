import { LitElement, html, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

const num = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN);

/**
 * <cw-area label="居間">: one room at a glance. `.now = {temperature, humidity, lightsOn, lights, motion}` merges into what
 * is shown (lights is how many lights the room has, lightsOn how many are on; motion true, false or unknown). The
 * lights button turns them all off when any is on, else all on: it sends `cw-lights` ({on}) and shows the change at
 * once. Values set while paused wait. In full motion the motion mark pulses while someone moves.
 */
export class CwArea extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    unit: { type: String },
    _d: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    .top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    [part='label'] { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    [part='motion'] { flex: none; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    [part='motion'] i { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, currentColor 40%, transparent); }
    :host([data-moving]) [part='motion'] { color: var(--cw-ok, #7bc47f); }
    :host([data-moving]) [part='motion'] i { background: var(--cw-ok, #7bc47f); }
    :host([data-motion='full'][data-moving]:not([data-paused])) [part='motion'] i { animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--cw-ok, #7bc47f) 30%, transparent); } }
    .climate { display: flex; align-items: baseline; gap: 14px; margin: 6px 0 10px; }
    [part='temperature'] { font-size: min(16cqw, 44px); line-height: 1; font-variant-numeric: tabular-nums;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    [part='temperature'] small { font-size: .45em; color: var(--cw-text-dim, #9a9a9a); margin-left: 2px; }
    [part='humidity'] { font-size: 14px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    [part='lights'] { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer;
      border-radius: calc(var(--cw-radius, 16px) * .6); font-size: 13px; font-variant-numeric: tabular-nums; transform: var(--cw-label-skew, none);
      background: color-mix(in srgb, var(--cw-text, #ededed) 8%, transparent); }
    /* lit: the on surface, ringed in the accent so it also shows on the faint glass surface */
    :host([data-lit]) [part='lights'] { background: var(--cw-surface-on, rgba(255,255,255,.85)); color: var(--cw-text-on, #121212); box-shadow: inset 0 0 0 1.5px var(--cw-signal, #4a90c2); }
    [part='lights'] i { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, currentColor 35%, transparent); }
    :host([data-lit]) [part='lights'] i { background: var(--cw-signal-on, var(--cw-signal, #4a90c2)); }
    [part='lights']:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    @container (max-width: 200px) { [part='humidity'] { display: none; } }
  `;

  constructor() {
    super();
    this.unit = '°C';
    this._d = { temperature: NaN, humidity: NaN, lightsOn: NaN, lights: NaN, motion: undefined };
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

  // a press is the user's own: it shows at once and beats a waiting count
  _press() {
    const total = num(this._d.lights), on = !(num(this._d.lightsOn) > 0);
    this._d = { ...this._d, lightsOn: on ? total : 0 };
    if (this._pending) delete this._pending.lightsOn;
    emit(this, 'cw-lights', { on });
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    const d = this._d, t = num(d.temperature), h = num(d.humidity);
    this.dataset.motion = this.motionLevel;
    this.toggleAttribute('data-moving', d.motion === true);
    this.toggleAttribute('data-lit', num(d.lightsOn) > 0);
    this.setAttribute('role', 'group');
    const lights = num(d.lights) > 0 ? `照明 ${num(d.lightsOn) || 0}/${num(d.lights)} 点灯` : '';
    this.setAttribute('aria-label', [this.label, Number.isFinite(t) ? `${t.toFixed(1)}${this.unit}` : '', Number.isFinite(h) ? `湿度 ${Math.round(h)}%` : '', lights,
      d.motion === true ? '動きあり' : d.motion === false ? '動きなし' : ''].filter(Boolean).join(' ') || '部屋');
  }

  render() {
    const d = this._d, t = num(d.temperature), h = num(d.humidity), total = num(d.lights), on = num(d.lightsOn) || 0;
    return html`<div class="top"><span part="label">${this.label ?? ''}</span>
        ${d.motion === true || d.motion === false ? html`<span part="motion"><i></i>${d.motion ? '動きあり' : '動きなし'}</span>` : nothing}</div>
      <div class="climate">
        <span part="temperature">${Number.isFinite(t) ? `${t < 0 ? '−' : ''}${Math.abs(t).toFixed(1)}` : '—'}<small>${this.unit}</small></span>
        ${Number.isFinite(h) ? html`<span part="humidity">湿度 ${Math.round(h)}%</span>` : nothing}
      </div>
      ${total > 0 ? html`<button part="lights" aria-label=${on > 0 ? `${this.label ?? ''}の照明を消す` : `${this.label ?? ''}の照明を点ける`}
        @click=${this._press}><i></i>照明 ${on}/${total} 点灯</button>` : nothing}`;
  }
}
define('cw-area', CwArea);
