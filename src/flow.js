import { LitElement, html, svg, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const normNodes = (v) => (Array.isArray(v) ? v : []).map((n, i) => ({
  id: String(n?.id ?? i), label: String(n?.label ?? ''), value: n?.value, unit: n?.unit == null ? undefined : String(n.unit),
  x: Math.min(1, Math.max(0, +n?.x || 0)), y: Math.min(1, Math.max(0, +n?.y || 0)), color: n?.color ? String(n.color) : '', icon: n?.icon ? String(n.icon) : '',
}));
const normLinks = (v) => (Array.isArray(v) ? v : []).map((l) => ({ from: String(l?.from ?? ''), to: String(l?.to ?? ''), value: Math.max(0, +l?.value || 0), color: l?.color ? String(l.color) : '' }));

/**
 * <cw-flow>: power moving between places, drawn as dots running along wires.
 * `.nodes = [{id, label, value, unit, x, y, color, icon}]` with x, y from 0 to 1 across the box,
 * `.links = [{from, to, value}]`. More power gives more, larger and faster dots; `scale` is the value of a full wire
 * (the largest link when omitted). In full motion the dots run; otherwise they stand still, spaced along the wire.
 * Values set while paused wait.
 */
export class CwFlow extends StageMember(LitElement) {
  static properties = {
    unit: { type: String },
    scale: { type: Number },
    fps: { type: Number },
    label: { type: String },
    _v: { state: true },
    _size: { state: true },
  };

  static styles = css`
    :host { display: block; width: 100%; height: 100%; position: relative; font-family: var(--cw-font, system-ui, sans-serif); }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    [part='wire'] { fill: none; stroke: color-mix(in srgb, var(--cw-text-dim, #9a9a9a) 35%, transparent); stroke-linecap: round; }
    [part='node'] circle { fill: color-mix(in srgb, var(--cw-text, #ededed) 6%, var(--cw-surface, #1d1d1d)); stroke: color-mix(in srgb, var(--cw-text, #ededed) 16%, transparent); stroke-width: 1.5; }
    .value { fill: var(--cw-text, #ededed); font-weight: 500; text-anchor: middle; font-variant-numeric: tabular-nums; }
    .unit { fill: var(--cw-text-dim, #9a9a9a); font-weight: 400; }
    .label { fill: var(--cw-text-dim, #9a9a9a); text-anchor: middle; }
    .icon { fill: none; stroke: var(--cw-text-dim, #9a9a9a); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  `;

  constructor() {
    super();
    this.fps = 30;
    this._v = { nodes: [], links: [] };
    this._size = { w: 0, h: 0 };
  }

  connectedCallback() {
    super.connectedCallback();
    this.dataset.frames ??= '0';
    this._ro = new ResizeObserver(() => { this._size = { w: this.clientWidth, h: this.clientHeight }; });
    this._ro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _set(key, value) {
    if (this.isPaused) this._pending = { ...(this._pending ?? this._v), [key]: value };
    else this._v = { ...this._v, [key]: value };
  }

  /** Places: [{id, label, value, unit, x, y, color, icon}]; icon is SVG path data in a 24 x 24 box. */
  get nodes() { return (this._pending ?? this._v).nodes; }
  set nodes(v) { this._set('nodes', normNodes(v)); }

  /** Flows: [{from, to, value}]. */
  get links() { return (this._pending ?? this._v).links; }
  set links(v) { this._set('links', normLinks(v)); }

  flush() {
    if (!this._pending) return 0;
    this._v = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange() { this.requestUpdate(); }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
  }

  updated(changed) {
    super.updated(changed);
    const running = this.motionLevel === 'full' && !this.isPaused;
    if (running && !this._raf) this._raf = requestAnimationFrame((t) => this._frame(t));
    if (!running) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (!this.isPaused) this._dots(0);
    }
  }

  _frame(t) {
    this._raf = this.motionLevel === 'full' && !this.isPaused ? requestAnimationFrame((n) => this._frame(n)) : 0;
    if (t - (this._last ?? -Infinity) < 1000 / Math.max(1, this.fps) - 2) return;
    this._last = t;
    this._dots(t / 1000);
    this.dataset.frames = String(+this.dataset.frames + 1);
  }

  /** Place the dots for time t (seconds); t = 0 gives the still picture. */
  _dots(t) {
    const g = this.renderRoot.querySelector('.dots');
    if (!g) return;
    const top = this.scale > 0 ? this.scale : Math.max(1, ...this._v.links.map((l) => l.value));
    const k = Math.min(1.15, Math.min(this._size.w, this._size.h) / 560) || 1;
    let out = '';
    this.renderRoot.querySelectorAll('[part=wire]').forEach((w, i) => {
      const share = Math.min(1, this._v.links[i].value / top);
      if (w.dataset.missing || share < 0.01) return;
      const len = w.getTotalLength(), n = 2 + Math.round(share * 5), speed = 0.12 + share * 0.5, r = (2.8 + share * 2) * k;
      for (let j = 0; j < n; j++) {
        const p = w.getPointAtLength((((t * speed + j / n) % 1) + 1) % 1 * len);
        out += `<circle part="dot" data-link="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" style="fill:${w.dataset.color}"/>`;
      }
    });
    g.innerHTML = out;
  }

  render() {
    const { w, h } = this._size;
    const { nodes, links } = this._v;
    if (!w || !h) return html`<svg role="group" aria-label=${this.label || '電気の流れ'}></svg>`;
    const k = Math.min(1.15, Math.min(w, h) / 560);
    const R = 48 * k;
    const at = (n) => [n.x * w, n.y * h];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const top = this.scale > 0 ? this.scale : Math.max(1, ...links.map((l) => l.value));
    const path = (l, i) => {
      const a = byId.get(l.from), b = byId.get(l.to);
      if (!a || !b) return svg`<path part="wire" d="M0 0" data-missing="1"/>`;
      const [ax, ay] = at(a), [bx, by] = at(b);
      const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d, bend = (i % 2 ? -1 : 1) * 0.12 * d;
      const sx = ax + ux * R, sy = ay + uy * R, ex = bx - ux * R, ey = by - uy * R;
      const mx = (sx + ex) / 2 - uy * bend, my = (sy + ey) / 2 + ux * bend;
      const color = l.color || a.color || 'var(--cw-signal, #4a90c2)';
      return svg`<path part="wire" data-link=${i} data-color=${color} d="M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"
        style="stroke-width:${((2 + Math.min(1, l.value / top) * 3) * k).toFixed(1)}px"/>`;
    };
    const text = (n) => {
      const v = n.value;
      if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v).toLocaleString();
      return v == null || v === '' ? '—' : String(v);
    };
    return html`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label=${this.label || '電気の流れ'}>
      ${links.map(path)}
      <g class="dots" aria-hidden="true"></g>
      ${nodes.map((n) => {
        const [x, y] = at(n), unit = n.unit ?? this.unit ?? '';
        return svg`<g part="node" data-node=${n.id} transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" role="img" aria-label=${[n.label, text(n), unit].filter(Boolean).join(' ')}>
          <circle r=${R}/>
          ${n.icon ? svg`<path class="icon" transform="translate(${-12 * k} ${-38 * k}) scale(${k})" d=${n.icon}/>` : ''}
          <text class="value" y=${10 * k} style="font-size:${26 * k}px">${text(n)}<tspan class="unit" style="font-size:${13 * k}px" dx=${3 * k}>${unit}</tspan></text>
          <text class="label" y=${n.y < 0.5 ? -R - 12 * k : R + 24 * k} style="font-size:${14 * k}px">${n.label}</text></g>`;
      })}
    </svg>`;
  }
}
define('cw-flow', CwFlow);
