import { LitElement, html, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

/**
 * <cw-switch label="..." on level="0.6">: a face that turns something on and off when pressed,
 * with a brightness slider when it has a level. Pressing sends `cw-toggle` ({on}); letting go of the
 * slider sends `cw-level` ({level}, 0 to 1). Both change the face at once, so it answers before the
 * real device does; values set from outside while paused wait for resume.
 */
export class CwSwitch extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    text: { type: String },
    color: { type: String },
    _on: { state: true },
    _level: { state: true },
  };

  static styles = css`
    :host { display: block; position: relative; font-family: var(--cw-font, system-ui, sans-serif); }
    [part='face'] {
      all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px;
      padding: 12px 14px; cursor: pointer; border-radius: calc(var(--cw-radius, 16px) * .75);
      background: color-mix(in srgb, var(--cw-text, #ededed) 7%, transparent); color: var(--cw-text, #ededed);
      transition: background-color 150ms, color 150ms;
    }
    :host([data-level]) [part='face'] { padding-bottom: 44px; }
    :host([on]) [part='face'] { background: var(--cw-surface-on, rgba(255,255,255,.85)); color: var(--cw-text-on, #121212); }
    [part='face']:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    [part='lamp'] {
      flex: none; width: 12px; height: 12px; border-radius: 50%;
      background: color-mix(in srgb, currentColor 30%, transparent); transition: background-color 150ms, box-shadow 150ms;
    }
    /* on the lit face the accent is --cw-signal-on when the theme has one (in the game look the face is the accent itself) */
    /* the lamp shows the light's own colour, ringed so it reads on any face; the fill keeps to the face's accent */
    :host([on]) { --on-accent: var(--lamp, var(--cw-signal-on, var(--cw-signal, #4a90c2))); }
    :host([on]) [part='lamp'] { background: var(--on-accent); box-shadow: 0 0 10px var(--on-accent); outline: 2px solid var(--cw-signal-on, transparent); }
    :host([data-motion='full'][on]:not([data-paused])) [part='lamp'] { animation: breathe 2.8s ease-in-out infinite; }
    @keyframes breathe { 50% { box-shadow: 0 0 2px var(--on-accent); opacity: .7; } }
    [part='label'] {
      flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 15px;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
    }
    [part='state'] { font-size: 13px; opacity: .75; white-space: nowrap; font-variant-numeric: tabular-nums; }
    [part='slider'] { position: absolute; left: 14px; right: 14px; bottom: 14px; height: 18px; }
    [part='track'] {
      position: absolute; left: 0; right: 0; top: 6px; height: 6px; border-radius: 3px; overflow: hidden;
      background: color-mix(in srgb, var(--cw-text, #ededed) 16%, transparent);
    }
    :host([on]) [part='track'] { background: color-mix(in srgb, var(--cw-text-on, #121212) 16%, transparent); }
    [part='fill'] { position: absolute; left: 0; top: 0; bottom: 0; background: var(--cw-text-dim, #9a9a9a); }
    :host([on]) [part='fill'] { background: var(--cw-signal-on, var(--on-accent)); }
    [part='thumb'] {
      position: absolute; top: 0; width: 8px; height: 18px; margin-left: -4px; border-radius: 3px;
      background: var(--cw-text, #ededed); transform: var(--cw-label-skew, none); pointer-events: none;
    }
    :host([on]) [part='thumb'] { background: var(--cw-text-on, #121212); }
    input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
    input:focus-visible + [part='thumb'] { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    :host([data-motion='off']) *, :host([data-motion='off']) [part='face'] { transition: none; }
  `;

  constructor() {
    super();
    this._on = false;
    this._level = NaN;
    this._pending = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._seeded) return;
    this._seeded = true;
    this._on = this.hasAttribute('on');
    if (this.hasAttribute('level')) this._level = this._norm(this.getAttribute('level'));
  }

  _norm(v) {
    const n = Number(v);
    return v === null || v === '' || !Number.isFinite(n) ? NaN : Math.min(1, Math.max(0, n));
  }

  /** Whether it is on. */
  get on() { return this._pending?.on ?? this._on; }
  set on(v) { this._queue('on', !!v); }

  /** Brightness from 0 to 1; NaN (the default) hides the slider. */
  get level() { return this._pending?.level ?? this._level; }
  // a slider held by a finger is not moved from outside; letting go sends the finger's value
  set level(v) { if (!this._dragging) this._queue('level', this._norm(v)); }

  _queue(key, v) {
    if (this.isPaused) (this._pending ??= {})[key] = v;
    else this['_' + key] = v;
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    for (const [k, v] of Object.entries(this._pending)) this['_' + k] = v;
    this._pending = undefined;
    return n;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  // a press is the user's own action: it shows at once, even while paused, and beats a waiting value
  _press() {
    this._on = !this._on;
    delete this._pending?.on;
    emit(this, 'cw-toggle', { on: this._on });
  }

  _slide(e) {
    this._level = Number(e.target.value) / 100;
    this._dragging = true;
    delete this._pending?.level;
  }

  _let() {
    this._on = this._level > 0;
    this._dragging = false;
    delete this._pending?.on;
    emit(this, 'cw-level', { level: this._level });
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.toggleAttribute('on', this._on);
    this.toggleAttribute('data-level', Number.isFinite(this._level));
    this.dataset.motion = this.motionLevel;
    if (changed.has('color')) this.style.setProperty('--lamp', this.color || null);
  }

  render() {
    const has = Number.isFinite(this._level), pct = has ? Math.round(this._level * 100) : 0;
    // while the slider is held the face shows where it is, even on a light that is still off
    const state = this._dragging ? `${pct}%` : this.text || (!this._on ? 'オフ' : has ? `${pct}%` : 'オン');
    return html`<button part="face" role="switch" aria-checked=${String(this._on)} @click=${this._press}>
        <span part="lamp"></span><span part="label">${this.label ?? ''}</span> <span part="state">${state}</span>
      </button>
      ${has ? html`<div part="slider">
        <span part="track"><span part="fill" style="width:${pct}%"></span></span>
        <input type="range" min="0" max="100" .value=${String(pct)} aria-label="${this.label ?? ''}の明るさ" aria-valuetext="${pct}%"
          @input=${this._slide} @change=${this._let}>
        <span part="thumb" style="left:${pct}%"></span>
      </div>` : nothing}`;
  }
}
define('cw-switch', CwSwitch);
