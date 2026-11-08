import { LitElement, html, css } from 'lit';
import { define, emit, resolveMotion, onReducedMotionChange } from './core.js';

/**
 * <cw-stage>: a fixed-size board scaled to fit its box. It resolves the motion level,
 * owns the pause state for every cw- element inside it, and paints the ground.
 */
export class CwStage extends LitElement {
  static properties = {
    ratio: { type: String },
    base: { type: String },
    motion: { type: String },
    bg: { type: String, reflect: true },
    fps: { type: Number },
    paused: { type: Boolean, reflect: true },
    controls: { type: String },
    lights: { attribute: false },
    _scale: { state: true },
  };

  static styles = css`
    :host {
      display: block; position: relative; width: 100%; height: 100%; min-height: 200px; overflow: hidden;
      background: var(--cw-ground, #121212); color: var(--cw-text, #ededed);
      font-family: var(--cw-font, system-ui, sans-serif);
    }
    :host([bg='none']) { --cw-ground: transparent; background: transparent; }
    :host([bg='plain']) { background: var(--cw-ground-solid, #121212); }
    cw-background { z-index: 0; }
    .box { z-index: 1; position: absolute; left: 50%; top: 50%; transform-origin: center; box-sizing: border-box; }
    [part='pause'] {
      position: absolute; right: 12px; bottom: 12px; width: 32px; height: 32px; border-radius: 50%;
      border: var(--cw-border, 1px solid rgba(255,255,255,.12)); background: var(--cw-surface, #1d1d1d);
      color: var(--cw-text-dim, #9a9a9a); cursor: pointer; display: grid; place-items: center; opacity: .55;
    }
    [part='pause']:hover, [part='pause']:focus-visible { opacity: 1; }
    :host([controls='none']) [part='pause'] { display: none; }
  `;

  constructor() {
    super();
    this.ratio = '16:9';
    this.motion = 'auto';
    this.bg = 'auto';
    this.fps = 30;
    this.paused = false;
    this.controls = 'auto';
    this._scale = 1;
    /** cw- elements that take their pause state from this stage. */
    this.members = new Set();
  }

  /** Base size in px, from `base` ("1600x900") or else from `ratio` at 1600 wide. */
  get size() {
    const m = /^(\d+)x(\d+)$/.exec(this.base || '');
    if (m) return [+m[1], +m[2]];
    const [a, b] = (this.ratio || '16:9').split(':').map(Number);
    return [1600, Math.round((1600 * b) / a)];
  }

  connectedCallback() {
    super.connectedCallback();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this);
    this._offMedia = onReducedMotionChange(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro.disconnect();
    this._offMedia();
  }

  _fit() {
    const [w, h] = this.size;
    this._scale = Math.min(this.clientWidth / w, this.clientHeight / h) || 1;
  }

  /** Stop every moving or updating cw- element inside the stage. */
  pause() { this.paused = true; }

  /** Resume, applying what arrived while paused. */
  resume() { this.paused = false; }

  /** The background kind to create: the theme's kind, else aura in full motion, or '' for none. */
  get backgroundKind() {
    const motion = this.dataset.motion;
    if (this.bg === 'none' || this.bg === 'plain') return '';
    if (this.bg && this.bg !== 'auto') return this.bg;
    const kind = getComputedStyle(this).getPropertyValue('--cw-background-kind').trim();
    if (kind && kind !== 'plain') return kind;
    return motion === 'full' ? 'aura' : '';
  }

  willUpdate(changed) {
    this.dataset.motion = resolveMotion(this.motion);
    if (changed.has('base') || changed.has('ratio')) this._fit();
  }

  updated(changed) {
    if (!changed.has('paused') || (changed.get('paused') === undefined && !this.paused)) return;
    if (this.paused) {
      for (const m of this.members) m.stagePaused?.(true);
      emit(this, 'cw-pause', {});
    } else {
      let applied = 0;
      for (const m of this.members) applied += m.stagePaused?.(false) || 0;
      emit(this, 'cw-resume', { applied });
    }
  }

  render() {
    const [w, h] = this.size;
    const style = `width:${w}px;height:${h}px;transform:translate(-50%,-50%) scale(${this._scale})`;
    const kind = this.backgroundKind;
    return html`
      ${kind ? html`<cw-background kind=${kind} .fps=${this.fps} .lights=${this.lights ?? []}></cw-background>` : ''}
      <div class="box" part="box" style=${style}><slot></slot></div>
      <button part="pause" type="button" aria-label=${this.paused ? '再開' : '一時停止'}
        @click=${() => (this.paused ? this.resume() : this.pause())}>
        ${this.paused
          ? html`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>`
          : html`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor"/></svg>`}
      </button>`;
  }
}
define('cw-stage', CwStage);
