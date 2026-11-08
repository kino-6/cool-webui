import { LitElement, html, svg, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

const STATES = ['playing', 'paused', 'idle', 'off'];
const ICON = {
  previous: svg`<path d="M6 5h2v14H6zM20 5v14L9 12z"/>`,
  next: svg`<path d="M16 5h2v14h-2zM4 5v14l11-7z"/>`,
  play: svg`<path d="M7 4v16l13-8z"/>`,
  pause: svg`<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>`,
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * <cw-media>: what a speaker is playing. `.now = {title, artist, art, state, position, duration, volume}` merges into
 * what is shown (state: playing / paused / idle / off; position and duration in seconds; volume 0..1; controls, the buttons
 * shown, default ['previous', 'play', 'next']). While playing the
 * position moves on by itself. Buttons send `cw-media` ({action: play | pause | next | previous}) and flip play/pause at
 * once; letting go of the volume slider sends `cw-volume` ({volume}). Paused, the clock stops and new values wait.
 * In full motion small bars dance while it plays.
 */
export class CwMedia extends StageMember(LitElement) {
  static properties = {
    _d: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    /* the host measures its own width, so a narrow player drops the cover, the bars and then the volume */
    :host { display: block; width: 100%; height: 100%; min-height: 96px; container-type: inline-size;
      color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .wrap { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; height: 100%; }
    [part='art'] { height: 100%; aspect-ratio: 1; border-radius: calc(var(--cw-radius, 16px) * .5); overflow: hidden; background: var(--cw-well, #171717); }
    [part='art'] img { width: 100%; height: 100%; object-fit: cover; display: block; }
    /* no cover (or nothing playing): no empty box, the words take the whole width */
    :host(:not([data-art])) [part='art'] { display: none; }
    :host(:not([data-art])) .wrap { grid-template-columns: minmax(0, 1fr); }
    @container (max-width: 320px) { [part='art'], [part='eq'] { display: none; } .wrap { grid-template-columns: minmax(0, 1fr); } }
    @container (max-width: 240px) { input[type=range] { display: none; } }
    .body { display: flex; flex-direction: column; justify-content: space-between; min-width: 0; gap: 6px; }
    [part='title'] { font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 600); font-stretch: var(--cw-display-stretch, normal); }
    :host([state='idle']) [part='title'], :host([state='off']) [part='title'] { color: var(--cw-text-dim, #9a9a9a); font-weight: 500; }
    [part='artist'] { font-size: 14px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .line { display: flex; align-items: center; gap: 10px; }
    [part='progress'] { flex: 1; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--cw-text, #ededed) 16%, transparent); overflow: hidden; }
    [part='progress-fill'] { height: 100%; background: var(--cw-signal, #4a90c2); }
    [part='time'] { font-size: 12px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; white-space: nowrap; }
    button { all: unset; flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: inherit; }
    button svg { width: 18px; height: 18px; fill: currentColor; }
    /* round in tile and glass, a slanted square in the game look */
    [part='play'] { background: var(--cw-signal, #4a90c2); color: var(--cw-text-on, #121212); width: 38px; height: 38px;
      border-radius: min(50%, calc(var(--cw-radius, 16px) * 3)); transform: var(--cw-label-skew, none); }
    button:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    button:disabled { opacity: .35; cursor: default; }
    [part='eq'] { display: flex; align-items: flex-end; gap: 2px; height: 16px; margin-left: 4px; }
    [part='eq'] i { width: 3px; height: 40%; background: var(--cw-signal, #4a90c2); transform-origin: bottom; }
    [part='eq'] i:nth-child(2) { height: 80%; } [part='eq'] i:nth-child(3) { height: 60%; } [part='eq'] i:nth-child(4) { height: 30%; }
    :host(:not([state='playing'])) [part='eq'] { opacity: .3; }
    :host([data-motion='full'][state='playing']:not([data-paused])) [part='eq'] i { animation: dance .9s ease-in-out infinite alternate; }
    :host([data-motion='full'][state='playing']:not([data-paused])) [part='eq'] i:nth-child(2) { animation-duration: .7s; }
    :host([data-motion='full'][state='playing']:not([data-paused])) [part='eq'] i:nth-child(3) { animation-duration: 1.1s; }
    @keyframes dance { from { transform: scaleY(.3); } to { transform: scaleY(1.4); } }
    input[type=range] { flex: 1 1 40px; min-width: 0; max-width: 120px; margin-left: auto; accent-color: var(--cw-signal, #4a90c2); }
  `;

  constructor() {
    super();
    this._d = { title: '', artist: '', art: '', state: 'idle', position: 0, duration: NaN, volume: NaN, controls: ['previous', 'play', 'next'] };
    this._at = performance.now();
    this._pending = undefined;
  }

  /** What is shown, with any values still waiting while paused. */
  get now() { return { ...this._d, ...this._pending }; }
  set now(v) {
    if (this.isPaused) this._pending = { ...this._pending, ...v };
    else this._apply(v);
  }

  _apply(v) {
    const d = { ...this._d, position: this._position(), ...v };
    if (!STATES.includes(d.state)) d.state = 'idle';
    this._at = performance.now();
    this._d = d;
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    this._apply(this._pending);
    this._pending = undefined;
    return n;
  }

  // the position runs on from the last value while playing and not paused
  _position() {
    const d = this._d, run = d.state === 'playing' && !this._frozen ? (performance.now() - this._at) / 1000 : 0;
    return Number.isFinite(d.duration) ? Math.min(d.duration, d.position + run) : d.position + run;
  }

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    if (on) { this._d = { ...this._d, position: this._position() }; this._frozen = true; } else { this._frozen = false; this._at = performance.now(); }
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this._timer = setInterval(() => { if (this._d.state === 'playing' && !this.isPaused) this._tick = performance.now(); }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  _press(action) {
    if (action === 'play' || action === 'pause') this._apply({ state: action === 'play' ? 'playing' : 'paused' });
    emit(this, 'cw-media', { action });
  }

  _volume(e) {
    const volume = Number(e.target.value) / 100;
    this._d = { ...this._d, volume };
    emit(this, 'cw-volume', { volume });
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('state', this._d.state);
    this.toggleAttribute('data-art', !!this._d.art && ['playing', 'paused'].includes(this._d.state));
    const d = this._d;
    this.setAttribute('aria-label', d.title ? [d.title, d.artist].filter(Boolean).join(' · ') : '再生していない');
  }

  render() {
    const d = this._d, active = d.state === 'playing' || d.state === 'paused', pos = this._position();
    const has = (name) => !Array.isArray(d.controls) || d.controls.includes(name);
    const button = (name, label, icon = name) => html`<button part=${name} aria-label=${label} ?disabled=${!active} @click=${() => this._press(name === 'play' ? (this._d.state === 'playing' ? 'pause' : 'play') : name)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[icon]}</svg></button>`;
    return html`<div class="wrap"><div part="art">${active && d.art ? html`<img src=${d.art} alt="">` : nothing}</div>
      <div class="body">
        <div><div part="title">${active && d.title ? d.title : '再生していない'}</div><div part="artist">${active ? d.artist : ''}</div></div>
        ${active && Number.isFinite(d.duration) && d.duration > 0 ? html`<div class="line">
          <div part="progress"><div part="progress-fill" style="width:${((pos / d.duration) * 100).toFixed(2)}%"></div></div>
          <span part="time">${mmss(pos)} / ${mmss(d.duration)}</span></div>` : nothing}
        <div class="line">
          ${has('previous') ? button('previous', '前の曲') : nothing}
          ${!has('play') ? nothing : d.state === 'playing' ? button('play', '一時停止', 'pause') : button('play', '再生')}
          ${has('next') ? button('next', '次の曲') : nothing}
          <span part="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          ${Number.isFinite(d.volume) ? html`<input type="range" min="0" max="100" .value=${String(Math.round(d.volume * 100))} aria-label="音量" @change=${this._volume}>` : nothing}
        </div>
      </div></div>`;
  }
}
define('cw-media', CwMedia);
