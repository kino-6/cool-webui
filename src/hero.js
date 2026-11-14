import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** Where the small tags sit around the name, in order. */
const SPOTS = ['left:0;top:16%', 'right:0;top:14%', 'right:6%;bottom:16%', 'left:8%;bottom:10%'];

/**
 * <cw-hero name sub level>: the centrepiece of a screen. A huge name on two lines (`name`, then `sub` in the
 * accent) laid over a glowing ball, with up to four small tags around it, `.tags = [{label, value}]`. `level`
 * (0 to 1, say the share of power in use) sets how far the ball glows. Everything scales with the element's own
 * size. Tags set while paused wait. In full motion the ball breathes.
 */
export class CwHero extends StageMember(LitElement) {
  static properties = {
    name: { type: String },
    sub: { type: String },
    level: { type: Number },
    _tags: { state: true },
  };

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; container-type: size; pointer-events: none;
      color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    [part='ball'] { position: absolute; left: 50%; top: 52%; width: 44cqmin; aspect-ratio: 1; translate: -50% -50%; border-radius: 50%;
      background: radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--cw-signal, #4a90c2) 45%, var(--cw-surface, #1d1d1d)) 0%, var(--cw-well, #171717) 62%, var(--cw-ground-solid, #121212) 100%);
      box-shadow: 0 0 var(--glow) color-mix(in srgb, var(--cw-signal, #4a90c2) 55%, transparent), inset 0 0 6cqmin rgb(0 0 0 / .45); }
    :host([data-motion='full']:not([data-paused])) [part='ball'] { animation: breathe 4.8s ease-in-out infinite; }
    @keyframes breathe { 50% { scale: 1.035; filter: brightness(1.15); } }
    [part='name'] { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: .84; white-space: nowrap;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 800); font-stretch: var(--cw-display-stretch, normal); }
    [part='line'] { display: block; font-size: 25cqmin; letter-spacing: -.02em; }
    [part='line'] + [part='line'] { color: var(--cw-signal, #4a90c2); translate: 9cqmin 0; }
    [part='tag'] { position: absolute; display: flex; font: 500 max(11px, 2.4cqmin) ui-monospace, Menlo, monospace; white-space: nowrap; }
    [part='tag'] b { font-weight: 600; padding: .25em .6em; background: var(--cw-text, #ededed); color: var(--cw-ground-solid, #121212); }
    [part='tag'] span { padding: .25em .6em; border: 1px solid var(--cw-text, #ededed); background: var(--cw-ground-solid, #121212); font-variant-numeric: tabular-nums; }
  `;

  constructor() {
    super();
    this.name = '';
    this.sub = '';
    this.level = 0.5;
    this._tags = [];
    this._pending = undefined;
  }

  /** The tags (or the ones waiting, while paused). */
  get tags() { return this._pending ?? this._tags; }
  set tags(v) {
    const list = (Array.isArray(v) ? v : []).filter((t) => t && typeof t === 'object').slice(0, SPOTS.length);
    if (this.isPaused) this._pending = list;
    else this._tags = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._tags = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('role', 'img');
    const tags = this._tags.map((t) => `${t.label ?? ''} ${t.value ?? ''}`.trim());
    this.setAttribute('aria-label', [this.name, this.sub, ...tags].filter(Boolean).join(' '));
  }

  render() {
    const level = Number.isFinite(this.level) ? Math.min(1, Math.max(0, this.level)) : 0.5;
    return html`<div part="ball" style="--glow:${(2 + level * 16).toFixed(1)}cqmin"></div>
      <div part="name" aria-hidden="true">${this.name ? html`<span part="line">${this.name}</span>` : nothing}${this.sub ? html`<span part="line">${this.sub}</span>` : nothing}</div>
      ${this._tags.map((t, i) => html`<div part="tag" style=${SPOTS[i]} aria-hidden="true"><b>${t.label ?? ''}</b><span>${t.value ?? ''}</span></div>`)}`;
  }
}
define('cw-hero', CwHero);
