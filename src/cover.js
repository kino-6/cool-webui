import { LitElement, html, svg, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

/** Home Assistant's cover states, in Japanese. */
const WORDS = { open: '開いている', closed: '閉まっている', opening: '開けている', closing: '閉めている' };
const ICON = { open: svg`<path d="M12 6l7 9H5z"/>`, stop: svg`<path d="M7 7h10v10H7z"/>`, close: svg`<path d="M12 18l7-9H5z"/>` };
const AFTER = { open: 'opening', close: 'closing' };
const pos = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Math.min(100, Math.max(0, Number(v))) : NaN);

/**
 * <cw-cover label="...">: a blind or shutter, drawn as a window with its shade, with how open it is and buttons.
 * `.now = {state, position, controls}` merges into what is shown (state: open, closed, opening, closing; position
 * 0 closed to 100 open; controls, the buttons shown, default ['open', 'stop', 'close', 'position']). Buttons send
 * `cw-cover` ({action: open | stop | close}) and change the face at once; letting go of the position slider sends
 * `cw-position` ({position}). A slider held by a finger is not moved from outside. Values set while paused wait.
 * In full motion the shade's slats run while it moves.
 */
export class CwCover extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    _d: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    .top { display: flex; align-items: center; gap: 14px; }
    [part='window'] { position: relative; flex: none; width: 56px; height: 64px; border: 2px solid currentColor; border-radius: 4px; overflow: hidden;
      background: color-mix(in srgb, var(--cw-signal, #4a90c2) 22%, transparent); box-sizing: border-box; }
    [part='window'][data-unknown] { opacity: .4; }
    [part='shade'] { position: absolute; left: 0; right: 0; top: 0; background: repeating-linear-gradient(180deg, var(--cw-text-dim, #9a9a9a) 0 5px, transparent 5px 7px);
      transition: height 400ms ease-out; }
    :host([data-motion='off']) [part='shade'] { transition: none; }
    :host([data-motion='full']:not([data-paused])[state='opening']) [part='shade'],
    :host([data-motion='full']:not([data-paused])[state='closing']) [part='shade'] { animation: slats .6s linear infinite; }
    @keyframes slats { to { background-position: 0 7px; } }
    .what { min-width: 0; }
    [part='label'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='state'] { font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    [part='position'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    .row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    button { all: unset; flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: inherit;
      background: color-mix(in srgb, var(--cw-text, #ededed) 10%, transparent); transform: var(--cw-label-skew, none); }
    button svg { width: 18px; height: 18px; fill: currentColor; }
    button:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    button:disabled { opacity: .35; cursor: default; }
    input[type=range] { flex: 1 1 60px; min-width: 0; accent-color: var(--cw-signal, #4a90c2); }
    @container (max-width: 220px) { [part='window'] { width: 40px; height: 46px; } input[type=range] { display: none; } }
  `;

  constructor() {
    super();
    this._d = { state: '', position: NaN, controls: ['open', 'stop', 'close', 'position'] };
    this._pending = undefined;
  }

  /** What is shown, with any values still waiting while paused. */
  get now() { return { ...this._d, ...this._pending }; }
  set now(v) {
    if (!v || typeof v !== 'object') return;
    // a slider held by a finger keeps its place
    const w = this._dragging && 'position' in v ? (({ position, ...rest }) => rest)(v) : v;
    if (this.isPaused) this._pending = { ...this._pending, ...w };
    else this._d = { ...this._d, ...w };
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
    const p = pos(this._d.position);
    const state = AFTER[action] ?? (p === 0 ? 'closed' : 'open');
    this._d = { ...this._d, state };
    if (this._pending) delete this._pending.state;
    emit(this, 'cw-cover', { action });
  }

  _slide(e) { this._dragging = true; this._d = { ...this._d, position: Number(e.target.value) }; if (this._pending) delete this._pending.position; }

  // letting go where it was taken sends no change: still let go of it
  _free() { this._dragging = false; }

  _let(e) {
    this._dragging = false;
    const position = Number(e.target.value);
    this._d = { ...this._d, position };
    emit(this, 'cw-position', { position });
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    const d = this._d, p = pos(d.position);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('state', d.state ?? '');
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', [this.label, WORDS[d.state] ?? d.state ?? '', Number.isFinite(p) ? `${Math.round(p)}% 開` : ''].filter(Boolean).join(' ') || '窓の覆い');
  }

  render() {
    const d = this._d, p = pos(d.position), known = !!d.state;
    // without a position: open shows the shade up, closed down, moving halfway; not known, no shade and a dim window
    const shown = Number.isFinite(p) ? p : { open: 100, closed: 0 }[d.state] ?? 50;
    const has = (name) => !Array.isArray(d.controls) || d.controls.includes(name);
    const button = (name, label) => html`<button part=${name} aria-label=${label} ?disabled=${!known}
      @click=${() => this._press(name)}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg></button>`;
    return html`<div class="top">
        <div part="window" aria-hidden="true" ?data-unknown=${!known}>${known ? html`<div part="shade" style="height:${100 - shown}%"></div>` : nothing}</div>
        <div class="what">
          ${this.label ? html`<div part="label">${this.label}</div>` : nothing}
          <div part="state">${known ? WORDS[d.state] ?? d.state : '—'}</div>
          ${Number.isFinite(p) ? html`<div part="position">${Math.round(p)}% 開</div>` : nothing}
        </div>
      </div>
      <div class="row">
        ${has('open') ? button('open', '開ける') : nothing}
        ${has('stop') ? button('stop', '止める') : nothing}
        ${has('close') ? button('close', '閉める') : nothing}
        ${has('position') && Number.isFinite(p) ? html`<input type="range" min="0" max="100" step="1" .value=${String(Math.round(p))} aria-label=${`${this.label ?? ''}の開き具合`}
          aria-valuetext=${`${Math.round(p)}%`} ?disabled=${!known} @input=${this._slide} @change=${this._let} @pointerup=${this._free} @blur=${this._free}>` : nothing}
      </div>`;
  }
}
define('cw-cover', CwCover);
