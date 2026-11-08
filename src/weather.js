import { LitElement, html, svg, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** Home Assistant's condition words, in Japanese. Unknown words show as they are. */
const WORDS = {
  sunny: '晴れ', 'clear-night': '晴れ', partlycloudy: '晴れ時々くもり', cloudy: 'くもり', fog: '霧', rainy: '雨', pouring: '大雨',
  snowy: '雪', 'snowy-rainy': 'みぞれ', hail: 'ひょう', lightning: '雷', 'lightning-rainy': '雷雨', windy: '強風', 'windy-variant': '強風', exceptional: '荒天',
};
// the picture is built from four pieces: sun, moon, cloud, and what falls
const PIECES = {
  sunny: ['sun'], 'clear-night': ['moon'], partlycloudy: ['sun', 'cloud'], cloudy: ['cloud'], fog: ['cloud', 'fog'], rainy: ['cloud', 'rain'],
  pouring: ['cloud', 'rain', 'rain2'], snowy: ['cloud', 'snow'], 'snowy-rainy': ['cloud', 'rain', 'snow'], hail: ['cloud', 'snow'],
  lightning: ['cloud', 'bolt'], 'lightning-rainy': ['cloud', 'bolt', 'rain'], windy: ['wind'], 'windy-variant': ['cloud', 'wind'], exceptional: ['cloud', 'bolt'],
};
const DRAW = {
  sun: svg`<g part="sun"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g>`,
  moon: svg`<path part="moon" d="M15.5 3.5a8.5 8.5 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z"/>`,
  cloud: svg`<path part="cloud" d="M7 18h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7 11.2 3.5 3.5 0 0 0 7 18z"/>`,
  rain: svg`<path part="rain" d="M9 20l-1 2.5M13 20l-1 2.5M17 20l-1 2.5"/>`,
  rain2: svg`<path part="rain" d="M11 20.5l-1 2.5M15 20.5l-1 2.5"/>`,
  snow: svg`<g part="snow"><circle cx="9" cy="21.5" r=".9"/><circle cx="13" cy="22.5" r=".9"/><circle cx="17" cy="21.5" r=".9"/></g>`,
  bolt: svg`<path part="bolt" d="M13 15l-3 5h3l-1.5 3.5"/>`,
  fog: svg`<path part="fog" d="M5 21h14M7 23h10"/>`,
  wind: svg`<path part="wind" d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7"/>`,
};

/**
 * <cw-weather>: the weather now and the next days. `.now = {condition, temp, high, low, humidity, wind}` (condition
 * in Home Assistant's words, e.g. sunny, rainy; wind in m/s) and `.forecast = [{time, condition, high, low, rain}]`
 * (rain in %). Values set while paused wait. In full motion the picture moves (the sun turns, rain falls).
 */
export class CwWeather extends StageMember(LitElement) {
  static properties = {
    unit: { type: String },
    days: { type: Number },
    _now: { state: true },
    _forecast: { state: true },
  };

  static styles = css`
    :host { display: flex; flex-direction: column; gap: 14px; height: 100%; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif);
      container-type: inline-size; overflow: hidden; }
    .now { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; min-width: 0; }
    svg { flex: none; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }
    .now svg { width: 64px; height: 64px; }
    [part='sun'] { color: var(--cw-signal, #4a90c2); stroke: var(--cw-signal, #4a90c2); transform-origin: 12px 12px; }
    [part='moon'], [part='bolt'] { stroke: var(--cw-signal, #4a90c2); }
    /* the cloud is painted solid so a sun behind it does not show through a see-through glass surface */
    [part='cloud'] { fill: var(--cw-ground-solid, #121212); stroke: var(--cw-text, #ededed); }
    [part='rain'], [part='snow'], [part='fog'] { stroke: var(--cw-text-dim, #9a9a9a); }
    [part='snow'] { fill: var(--cw-text-dim, #9a9a9a); }
    :host([data-motion='full']:not([data-paused])) [part='sun'] { animation: turn 24s linear infinite; }
    :host([data-motion='full']:not([data-paused])) [part='rain'], :host([data-motion='full']:not([data-paused])) [part='snow'] { animation: fall 1.2s linear infinite; }
    @keyframes turn { to { transform: rotate(360deg); } }
    @keyframes fall { from { transform: translateY(-2px); opacity: 1; } to { transform: translateY(2px); opacity: .2; } }
    [part='temp'] {
      font-size: 56px; line-height: 1; font-variant-numeric: tabular-nums;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
    }
    [part='temp'] small { font-size: 20px; color: var(--cw-text-dim, #9a9a9a); margin-left: 2px; }
    .side { flex: 1 1 120px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    [part='word'] { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='detail'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    @container (max-width: 280px) { .now svg { width: 44px; height: 44px; } [part='temp'] { font-size: 40px; } [part='forecast'] { gap: 2px; } [part='day'] { font-size: 11px; } [part='day'] svg { width: 24px; height: 24px; } }
    @container (max-width: 240px) { [part='day']:nth-child(n+4) { display: none; } }
    [part='forecast'] { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; min-width: 0; }
    [part='day'] { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 13px; font-variant-numeric: tabular-nums; min-width: 0; white-space: nowrap; }
    [part='day'] svg { width: 30px; height: 30px; }
    [part='day'] b { font-weight: 500; color: var(--cw-text-dim, #9a9a9a); }
    .low { color: var(--cw-text-dim, #9a9a9a); }
    .rain { font-size: 11px; color: var(--cw-signal, #4a90c2); }
  `;

  constructor() {
    super();
    this.unit = '°C';
    this.days = 5;
    this._now = {};
    this._forecast = [];
    this._pending = undefined;
  }

  /** The weather now: {condition, temp, high, low, humidity, wind}. */
  get now() { return this._pending?.now ?? this._now; }
  set now(v) { this._queue('now', v && typeof v === 'object' ? v : {}); }

  /** The next days: [{time, condition, high, low, rain}]. */
  get forecast() { return this._pending?.forecast ?? this._forecast; }
  set forecast(v) { this._queue('forecast', Array.isArray(v) ? v.filter(Boolean) : []); }

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

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const n = this._now;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', [WORDS[n.condition] ?? n.condition, this._num(n.temp) ? `${this._round(n.temp)}${this.unit}` : ''].filter(Boolean).join(' ') || '天気の情報なし');
  }

  _num(v) { return v !== null && v !== '' && Number.isFinite(Number(v)); }
  // a true minus sign: the hyphen leaves a gap in tabular figures
  _round(v) { const n = Math.round(Number(v)); return n < 0 ? `\u2212${-n}` : String(n); }

  _picture(condition) {
    return html`<svg viewBox="0 0 24 24" aria-hidden="true">${(PIECES[condition] ?? ['cloud']).map((p) => DRAW[p])}</svg>`;
  }

  _dayName(t) {
    const d = new Date(typeof t === 'number' ? t : Date.parse(t));
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ja-JP', { weekday: 'short' });
  }

  render() {
    const n = this._now, u = this.unit, num = (v) => this._num(v);
    const detail = [
      num(n.high) || num(n.low) ? `${num(n.high) ? this._round(n.high) : '–'}° / ${num(n.low) ? this._round(n.low) : '–'}°` : '',
      num(n.humidity) ? `湿度 ${this._round(n.humidity)}%` : '',
      num(n.wind) ? `風 ${Number(n.wind).toFixed(1)} m/s` : '',
    ].filter(Boolean).join('　');
    return html`<div class="now">
        ${n.condition ? this._picture(n.condition) : nothing}
        <span part="temp">${num(n.temp) ? this._round(n.temp) : '—'}<small>${u}</small></span>
        <span class="side"><span part="word">${WORDS[n.condition] ?? n.condition ?? ''}</span><span part="detail">${detail}</span></span>
      </div>
      ${this._forecast.length ? html`<div part="forecast">${this._forecast.slice(0, this.days).map((f) => html`<div part="day" aria-label=${[this._dayName(f.time), WORDS[f.condition] ?? f.condition, num(f.high) ? `最高 ${this._round(f.high)}°` : '', num(f.low) ? `最低 ${this._round(f.low)}°` : ''].filter(Boolean).join(' ')}>
        <b>${this._dayName(f.time)}</b>${this._picture(f.condition)}
        <span>${num(f.high) ? `${this._round(f.high)}°` : '–'} <span class="low">${num(f.low) ? `${this._round(f.low)}°` : ''}</span></span>
        ${num(f.rain) ? html`<span class="rain">${this._round(f.rain)}%</span>` : nothing}
      </div>`)}</div>` : nothing}`;
  }
}
define('cw-weather', CwWeather);
