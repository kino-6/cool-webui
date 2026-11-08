import { LitElement, html, svg, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const W = 600, H = 200;

/** <cw-chart>: line chart of the last `points` samples. `.data = [{p50, p95}]`, `push(sample | samples)`. */
export class CwChart extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    unit: { type: String },
    points: { type: Number },
    series: { type: String },
    min: { type: Number },
    max: { type: Number },
    _data: { state: true },
  };

  static styles = css`
    :host { display: block; width: 100%; height: 100%; min-height: 80px; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .wrap { display: flex; flex-direction: column; height: 100%; gap: 8px; }
    .legend { display: flex; gap: 16px; font-size: 13px; color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    .legend b { color: var(--cw-text, #ededed); font-weight: 500; margin-left: 4px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    svg { flex: 1; min-height: 0; width: 100%; background: var(--cw-well, #171717); border-radius: calc(var(--cw-radius, 16px) / 2); }
    polyline { fill: none; stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
    .area { stroke: none; opacity: .14; }
    .grid { stroke: var(--cw-text-dim, #9a9a9a); stroke-opacity: .12; vector-effect: non-scaling-stroke; }
  `;

  constructor() {
    super();
    this.points = 120;
    this.series = 'value';
    this._data = [];
    this._queue = [];
    this._replace = undefined;
  }

  get _keys() { return this.series.split(',').map((s) => s.trim()).filter(Boolean); }

  /** The samples kept, oldest first. */
  get data() {
    const base = this._replace ?? this._data;
    return [...base, ...this._queue].slice(-this.points);
  }
  set data(v) {
    const rows = (Array.isArray(v) ? v : []).slice(-this.points);
    if (this.isPaused) { this._replace = rows; this._queue = []; }
    else this._data = rows;
  }

  /** Append one sample or an array of samples. */
  push(v) {
    const add = Array.isArray(v) ? v : [v];
    if (this.isPaused) this._queue = [...this._queue, ...add].slice(-this.points);
    else this._data = [...this._data, ...add].slice(-this.points);
  }

  flush() {
    const n = this._queue.length + (this._replace ? 1 : 0);
    if (!n) return 0;
    this._data = this.data;
    this._queue = [];
    this._replace = undefined;
    return n;
  }

  _color(i) {
    return ['var(--cw-signal, #4a90c2)', 'var(--cw-text-dim, #9a9a9a)', 'var(--cw-ok, #80c994)', 'var(--cw-warn, #f18b82)'][i % 4];
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    const last = this._data.at(-1);
    const parts = last ? this._keys.map((k) => `${k} ${this._fmt(last[k])}${this.unit ? ' ' + this.unit : ''}`) : [];
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', [this.label, parts.join(', ')].filter(Boolean).join(' '));
  }

  _fmt(v) { return typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 10) / 10) : '—'; }

  render() {
    const keys = this._keys, d = this._data;
    const vals = d.flatMap((r) => keys.map((k) => r?.[k])).filter((v) => typeof v === 'number' && Number.isFinite(v));
    let lo = Number.isFinite(this.min) ? this.min : Math.min(...vals);
    let hi = Number.isFinite(this.max) ? this.max : Math.max(...vals);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = 0; hi = 1; }
    if (hi === lo) { hi += 1; lo -= 1; }
    const step = W / Math.max(1, this.points - 1);
    const x0 = W - (d.length - 1) * step;
    const y = (v) => H - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * H;
    const lines = keys.map((k) => d.map((r, i) => (typeof r?.[k] === 'number' && Number.isFinite(r[k]) ? `${(x0 + i * step).toFixed(1)},${y(r[k]).toFixed(1)}` : '')).filter(Boolean).join(' '));
    const last = d.at(-1);
    return html`<div class="wrap">
      <div class="legend" aria-hidden="true">${keys.map((k, i) => html`<span><span class="dot" style="background:${this._color(i)}"></span>${k}<b>${this._fmt(last?.[k])}</b>${this.unit ? ' ' + this.unit : ''}</span>`)}</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        ${[0.25, 0.5, 0.75].map((f) => svg`<line class="grid" x1="0" x2="${W}" y1="${H * f}" y2="${H * f}"></line>`)}
        ${lines[0] && lines[0].split(' ').length > 1 ? svg`<polygon class="area" style="fill:${this._color(0)}" points="${lines[0].split(' ')[0].split(',')[0]},${H} ${lines[0]} ${lines[0].split(' ').at(-1).split(',')[0]},${H}"></polygon>` : ''}
        ${lines.map((pts, i) => svg`<polyline part="line line-${i}" style="stroke:${this._color(i)}" points="${pts}"></polyline>`)}
      </svg>
    </div>`;
  }
}
define('cw-chart', CwChart);
