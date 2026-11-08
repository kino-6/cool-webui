import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const clock = (t) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * <cw-camera src="..." label="庭" refresh="10">: a camera picture with its name and the time of the last frame.
 * A still is fetched again every `refresh` seconds (0 = once) at a new address so no cache answers; with `video`
 * the src plays as a muted inline video. When nothing arrives it says 映像なし. Paused, it stops fetching and
 * fetches at once on resume. In full motion the recording dot blinks.
 */
export class CwCamera extends StageMember(LitElement) {
  static properties = {
    src: { type: String },
    label: { type: String },
    refresh: { type: Number },
    video: { type: Boolean },
    _shown: { state: true },
    _state: { state: true },
    _at: { state: true },
  };

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; min-height: 80px; overflow: hidden;
      border-radius: calc(var(--cw-radius, 16px) * .5); background: var(--cw-well, #171717); color: #fff; font-family: var(--cw-font, system-ui, sans-serif); }
    img, video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    :host([state='offline']) img, :host([state='offline']) video { display: none; }
    [part='empty'] { position: absolute; inset: 0; display: none; place-items: center; color: var(--cw-text-dim, #9a9a9a); font-size: 14px; }
    :host([state='offline']) [part='empty'] { display: grid; }
    .top { position: absolute; left: 30px; right: 30px; top: 12px; display: flex; align-items: center; gap: 8px; text-shadow: 0 1px 3px rgb(0 0 0 / .7); }
    [part='rec'] { width: 8px; height: 8px; border-radius: 50%; background: #e5484d; flex: none; }
    :host([state='offline']) [part='rec'] { background: var(--cw-text-dim, #9a9a9a); }
    :host([data-motion='full'][state='online']:not([data-paused])) [part='rec'] { animation: blink 1.6s steps(1) infinite; }
    @keyframes blink { 50% { opacity: .15; } }
    [part='label'] {
      flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
      padding: var(--cw-label-pad, 0); background: var(--cw-label-bg, none); color: var(--cw-label-color, inherit); transform: var(--cw-label-skew, none);
      text-shadow: inherit;
    }
    /* the name gives way first, so the time is never cut */
    [part='time'] { flex: none; margin-left: auto; font-size: 13px; font-variant-numeric: tabular-nums; }
    /* viewfinder corners */
    [part='corner'] { position: absolute; width: 18px; height: 18px; border: 0 solid var(--cw-signal, #4a90c2); opacity: .9; pointer-events: none; }
    .tl { left: 6px; top: 6px; border-top-width: 2px; border-left-width: 2px; }
    .tr { right: 6px; top: 6px; border-top-width: 2px; border-right-width: 2px; }
    .bl { left: 6px; bottom: 6px; border-bottom-width: 2px; border-left-width: 2px; }
    .br { right: 6px; bottom: 6px; border-bottom-width: 2px; border-right-width: 2px; }
  `;

  constructor() {
    super();
    this.src = '';
    this.refresh = 10;
    this._shown = '';
    this._state = 'loading';
    this._at = NaN;
    this._n = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.dataset.frames ??= '0';
    this.setAttribute('role', 'img');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    const v = this.renderRoot?.querySelector('video');
    if (on) { clearTimeout(this._timer); v?.pause(); } else if (this.video) v?.play().catch(() => {}); else this._fetch();
  }

  // a still is loaded off screen and shown only once it has arrived, so the old frame stays until then
  _fetch() {
    clearTimeout(this._timer);
    if (!this.src || this.video) return;
    const url = `${this.src}${this.src.includes('?') ? '&' : '?'}_=${Date.now().toString(36)}${++this._n}`;
    const img = new Image(), src = this.src;
    // a picture from an older src that arrives late is dropped
    img.onload = () => { if (src === this.src) { this._got(url); this._next(); } };
    img.onerror = () => { if (src === this.src) { this._state = 'offline'; this._at = NaN; this._next(); } };
    img.src = url;
  }

  _got(url) {
    this._shown = url;
    this._state = 'online';
    this._at = Date.now();
    this.dataset.frames = String(+this.dataset.frames + 1);
  }

  _next() {
    if (this.refresh > 0 && !this.isPaused && this.isConnected) this._timer = setTimeout(() => this._fetch(), this.refresh * 1000);
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    if (changed.has('src') || changed.has('video')) {
      this._state = this.src ? 'loading' : 'offline';
      this._at = NaN;
      if (this.video) this._shown = this.src;
      else if (!this.isPaused) this._fetch();
    }
    this.setAttribute('state', this._state);
    const time = Number.isFinite(this._at) ? clock(this._at) : '';
    this.setAttribute('aria-label', [this.label, time || (this._state === 'offline' ? '映像なし' : '')].filter(Boolean).join(' '));
  }

  _videoOk() {
    this._state = 'online';
    this._at = Date.now();
    this.dataset.frames = String(+this.dataset.frames + 1);
  }

  render() {
    const time = Number.isFinite(this._at) ? clock(this._at) : '';
    const media = this.video
      ? html`<video src=${this._shown} muted autoplay playsinline loop .muted=${true} @loadeddata=${this._videoOk} @error=${() => { this._state = 'offline'; }}></video>`
      : this._shown ? html`<img src=${this._shown} alt="">` : nothing;
    return html`${media}<div part="empty">映像なし</div>
      <div class="top" aria-hidden="true"><span part="rec"></span>${this.label ? html`<span part="label">${this.label}</span>` : nothing}<span part="time">${time}</span></div>
      <span part="corner" class="tl"></span><span part="corner" class="tr"></span><span part="corner" class="bl"></span><span part="corner" class="br"></span>`;
  }
}
define('cw-camera', CwCamera);
