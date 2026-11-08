import { LitElement, html, svg, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** The moon integration's phases, in Japanese, with how lit the moon is (0 new, 1 full) and which side. */
const PHASES = {
  new_moon: ['新月', 0], waxing_crescent: ['三日月', 0.25], first_quarter: ['上弦の月', 0.5], waxing_gibbous: ['満ちていく月', 0.75],
  full_moon: ['満月', 1], waning_gibbous: ['欠けていく月', -0.75], last_quarter: ['下弦の月', -0.5], waning_crescent: ['有明の月', -0.25],
};
const at = (v) => (typeof v === 'number' ? v : Date.parse(v ?? ''));
const hm = (t) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

/**
 * <cw-sky>: the day's path with the sun on it, sunrise, sunset and the length of the day, and the moon's phase.
 * `.now = {rise, set, phase, up, south}`: rise and set (epoch ms or ISO) are today's, or tonight's next ones; phase is the
 * moon integration's word (new_moon ... waning_crescent); up says whether the sun is above the horizon, which decides day
 * and night when there is no sunrise or sunset near (midnight sun, polar night); south mirrors the moon. Between rise and set the sun sits on the arc where the time is;
 * outside it the arc is dim and the moon shows. The clock is looked at again every minute unless paused; values set
 * while paused wait. In full motion the sun glows.
 */
export class CwSky extends StageMember(LitElement) {
  static properties = {
    _d: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    /* the arc keeps its shape and stays low, so the times below always fit */
    svg { display: block; width: 100%; height: min(40cqw, 96px); overflow: visible; }
    [part='path'] { fill: none; stroke: color-mix(in srgb, var(--cw-text, #ededed) 25%, transparent); stroke-width: 1.5; stroke-dasharray: 3 4; }
    [part='horizon'] { stroke: color-mix(in srgb, var(--cw-text, #ededed) 30%, transparent); stroke-width: 1; }
    [part='sun'] { fill: var(--cw-signal, #4a90c2); }
    :host([data-motion='full']:not([data-paused])) [part='sun'] { animation: glow 3s ease-in-out infinite; }
    @keyframes glow { 50% { opacity: .55; } }
    [part='moon'] .lit { fill: var(--cw-text, #ededed); }
    [part='moon'] .dark { fill: color-mix(in srgb, var(--cw-text, #ededed) 15%, transparent); }
    .row { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    .row b { display: block; font-size: 18px; font-weight: 500; color: var(--cw-text, #ededed);
      font-family: var(--cw-display-font, inherit); font-stretch: var(--cw-display-stretch, normal); }
    [part='phase'] { text-align: center; }
    @container (max-width: 220px) { [part='length'] { display: none; } }
  `;

  constructor() {
    super();
    this._d = { rise: NaN, set: NaN, phase: '', up: undefined, south: false };
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

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    if (!on) this._tick = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this._timer = setInterval(() => { if (!this.isPaused) this._tick = Date.now(); }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const rise = at(this._d.rise), set = at(this._d.set), phase = PHASES[this._d.phase]?.[0];
    this.toggleAttribute('data-day', this._day().day);
    this.setAttribute('aria-label', [Number.isFinite(rise) ? `日の出 ${hm(rise)}` : '', Number.isFinite(set) ? `日の入り ${hm(set)}` : '', phase ?? ''].filter(Boolean).join(' ') || '空の情報なし');
  }

  /** Whether it is day and how far through it: by sunrise and sunset, else by whether the sun is up (at its top). */
  _day() {
    const rise = at(this._d.rise), set = at(this._d.set), now = Date.now();
    if (Number.isFinite(rise) && Number.isFinite(set) && rise < set) return { day: rise <= now && now <= set, f: (now - rise) / (set - rise) };
    return { day: this._d.up === true, f: 0.5 };
  }

  // a moon lit from the right while waxing, from the left while waning: two arcs make the lit part
  _moon(x, y, r, lit) {
    const f = Math.abs(lit), right = lit >= 0, k = Math.cos(Math.PI * f) * r, side = right ? 1 : 0;
    const d = f === 0 ? '' : f === 1 ? `M${x} ${y - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}`
      : `M${x} ${y - r}A${r} ${r} 0 0 ${side} ${x} ${y + r}A${Math.abs(k)} ${r} 0 0 ${k > 0 ? 1 - side : side} ${x} ${y - r}`;
    return svg`<g part="moon"><circle class="dark" cx=${x} cy=${y} r=${r}/>${d ? svg`<path class="lit" d=${d}/>` : nothing}</g>`;
  }

  render() {
    const rise = at(this._d.rise), set = at(this._d.set), known = Number.isFinite(rise) && Number.isFinite(set) && rise < set;
    const { day, f } = this._day();
    const phase = PHASES[this._d.phase];
    // the arc: a half ellipse over the horizon, 0 at sunrise (left) and 1 at sunset (right)
    const W = 200, H = 80, sx = 10 + f * (W - 20), sy = H - Math.sin(Math.PI * f) * (H - 12);
    const mins = known ? Math.round((set - rise) / 60000) : NaN;
    return html`<svg viewBox="0 0 ${W} ${H + 6}" aria-hidden="true">
        <path part="path" d=${`M10 ${H} A ${(W - 20) / 2} ${H - 12} 0 0 1 ${W - 10} ${H}`}/>
        <line part="horizon" x1="0" y1=${H} x2=${W} y2=${H}/>
        ${day ? svg`<circle part="sun" cx=${sx} cy=${sy} r="7"/>` : phase ? this._moon(W / 2, H / 2, 16, this._d.south ? -phase[1] : phase[1]) : nothing}
      </svg>
      <div class="row">
        <span part="rise">日の出<b>${Number.isFinite(rise) ? hm(rise) : '—'}</b></span>
        ${phase ? html`<span part="phase">月<b>${phase[0]}</b></span>` : nothing}
        <span part="set" style="text-align:right">日の入り<b>${Number.isFinite(set) ? hm(set) : '—'}</b></span>
      </div>
      ${Number.isFinite(mins) && mins > 0 ? html`<div class="row" part="length"><span>昼の長さ ${Math.floor(mins / 60)}時間${mins % 60}分</span></div>` : nothing}`;
  }
}
define('cw-sky', CwSky);
