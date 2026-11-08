import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** <cw-clock>: the time and date, ticking by itself. `format` is hm (default) or hms. */
export class CwClock extends StageMember(LitElement) {
  static properties = {
    timezone: { type: String },
    format: { type: String, reflect: true },
    _now: { state: true },
  };

  static styles = css`
    :host { display: block; width: 100%; height: 100%; container-type: size; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .wrap { height: 100%; display: flex; flex-direction: column; justify-content: center; }
    .wrap { --auto: min(62cqh, 26cqw); }
    :host([format='hms']) .wrap { --auto: min(54cqh, 16.5cqw); }
    [part='value'] { font-size: var(--cw-clock-size, var(--auto)); font-weight: var(--cw-display-weight, 500); font-family: var(--cw-display-font, inherit); font-stretch: var(--cw-display-stretch, normal); line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; letter-spacing: -0.02em; }
    [part='date'] { font-size: max(13px, calc(var(--cw-clock-size, var(--auto)) * 0.2)); color: var(--cw-text-dim, #9a9a9a); margin-top: .4em; white-space: nowrap; }
  `;

  constructor() {
    super();
    this.format = 'hm';
    this._now = new Date();
  }

  connectedCallback() {
    super.connectedCallback();
    this._tick();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  _tick() {
    if (!this.isPaused) this._now = new Date();
    this._timer = setTimeout(() => this._tick(), 1000 - (Date.now() % 1000) + 5);
  }

  onPauseChange(on) {
    if (!on) this._now = new Date();
  }

  _fmt(opts) {
    try {
      return new Intl.DateTimeFormat('ja-JP', { timeZone: this.timezone || undefined, ...opts }).format(this._now);
    } catch {
      return new Intl.DateTimeFormat('ja-JP', opts).format(this._now);
    }
  }

  render() {
    const time = this._fmt({ hour: '2-digit', minute: '2-digit', ...(this.format === 'hms' ? { second: '2-digit' } : {}), hourCycle: 'h23' });
    const date = this._fmt({ month: 'long', day: 'numeric', weekday: 'short' });
    this.setAttribute('aria-label', `${date} ${time}`);
    return html`<div class="wrap"><span part="value">${time}</span><span part="date">${date}</span></div>`;
  }
}
define('cw-clock', CwClock);
