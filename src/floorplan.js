import { LitElement, html, svg, css } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

const S = 44; // pixels per grid unit before the view box scales it
const iso = (x, y, z = 0) => [(x - y) * S * 0.866, (x + y) * S * 0.5 - z * S];
const pts = (a) => a.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
const quad = (x, y, w, h, z = 0) => pts([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + h, z), iso(x, y + h, z)]);
const wallX = (x0, x1, y, z0, z1) => pts([iso(x0, y, z0), iso(x1, y, z0), iso(x1, y, z1), iso(x0, y, z1)]);
const wallY = (y0, y1, x, z0, z1) => pts([iso(x, y0, z0), iso(x, y1, z0), iso(x, y1, z1), iso(x, y0, z1)]);
const clamp01 = (n, d) => (Number.isFinite(+n) ? Math.min(1, Math.max(0, +n)) : d);

function normRooms(v) {
  return (Array.isArray(v) ? v : []).map((r, i) => ({
    id: String(r?.id ?? i), name: String(r?.name ?? ''), note: r?.note == null ? '' : String(r.note),
    x: +r?.x || 0, y: +r?.y || 0, w: Math.max(0.5, +r?.w || 1), h: Math.max(0.5, +r?.h || 1),
    on: !!r?.on, color: String(r?.color || 'var(--cw-signal, #4a90c2)'), level: clamp01(r?.level, 1),
  }));
}
const normPeople = (v) => (Array.isArray(v) ? v : []).map((p) => ({ name: String(p?.name ?? ''), color: String(p?.color || '#9cc9ef'), room: p?.room == null ? null : String(p.room) }));
const normItems = (v) => (Array.isArray(v) ? v : []).map((b) => ({ x: +b?.x || 0, y: +b?.y || 0, w: +b?.w || 1, h: +b?.h || 1, z: +b?.z || 0.5 }));

/**
 * <cw-floorplan>: the house drawn as a raised floor plan. Lit rooms glow in their light's colour.
 * `.rooms = [{id, name, x, y, w, h, on, color, level, note}]` in grid units, `.people = [{name, color, room}]`,
 * `.items = [{x, y, w, h, z}]` for furniture, `focus` = a room id outlined with a dashed line.
 * Clicking a room (or Enter / Space on it) sends `cw-room` with `{id, on}`.
 * In full motion the outline flows and the lamps breathe; otherwise it is still. Values set while paused wait.
 */
export class CwFloorplan extends StageMember(LitElement) {
  static properties = {
    focus: { type: String, reflect: true },
    label: { type: String },
    fps: { type: Number },
    _v: { state: true },
    _host: { state: true },
  };

  static styles = css`
    :host {
      display: block; width: 100%; height: 100%; position: relative;
      color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif);
      /* mixed into the surface colour, so tile walls are solid and glass walls stay see-through */
      --_floor: var(--cw-floor, color-mix(in srgb, var(--cw-text, #ededed) 7%, var(--cw-surface, #1d1d1d)));
      --_wall: var(--cw-wall, color-mix(in srgb, var(--cw-text, #ededed) 12%, var(--cw-surface, #1d1d1d)));
      --_wall-top: var(--cw-wall-top, color-mix(in srgb, var(--cw-text, #ededed) 18%, var(--cw-surface, #1d1d1d)));
    }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    [part='room'] { cursor: pointer; outline: none; }
    [part='room'] polygon { stroke: var(--cw-text-dim, #9a9a9a); stroke-opacity: .25; stroke-width: 1; }
    [part='room']:focus-visible polygon { stroke: var(--cw-signal, #4a90c2); stroke-opacity: 1; stroke-width: 2.5; }
    .glow { mix-blend-mode: screen; pointer-events: none; }
    .wall { fill: var(--_wall); } .cap { fill: var(--_wall-top); } .item { fill: var(--_wall-top); }
    [part='focus'] { fill: none; stroke: var(--cw-signal, #4a90c2); stroke-width: 2.5; stroke-dasharray: 10 8; pointer-events: none; }
    .name { font-size: calc(13px * var(--_zoom, 1)); font-weight: 600; fill: var(--cw-text, #ededed); pointer-events: none; }
    .note { font-size: calc(12px * var(--_zoom, 1)); fill: color-mix(in srgb, var(--cw-text, #ededed) 78%, transparent); pointer-events: none; font-variant-numeric: tabular-nums; }
    [part='person'] text { font-size: calc(12px * var(--_zoom, 1)); font-weight: 700; fill: #121212; }
    :host(:not([data-motion='off'])) [part='person'] { transition: transform 2.4s cubic-bezier(.45, 0, .2, 1), opacity .6s; }
    :host(:not([data-motion='off'])) .floor, :host(:not([data-motion='off'])) .glow { transition: fill .6s, opacity .8s; }
  `;

  constructor() {
    super();
    this.fps = 30;
    this._v = { rooms: [], people: [], items: [], focus: '' };
    this._pending = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    this.dataset.frames ??= '0';
    this._ro = new ResizeObserver(() => { this._host = [this.clientWidth, this.clientHeight]; });
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

  /** Rooms in grid units: [{id, name, x, y, w, h, on, color, level, note}]. */
  get rooms() { return (this._pending ?? this._v).rooms; }
  set rooms(v) { this._set('rooms', normRooms(v)); }

  /** People: [{name, color, room}]; room null means away. */
  get people() { return (this._pending ?? this._v).people; }
  set people(v) { this._set('people', normPeople(v)); }

  /** Furniture boxes: [{x, y, w, h, z}]. */
  get items() { return (this._pending ?? this._v).items; }
  set items(v) { this._set('items', normItems(v)); }

  flush() {
    if (!this._pending) return 0;
    this._v = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange() { this.requestUpdate(); }

  willUpdate(changed) {
    super.willUpdate(changed);
    if (changed.has('focus')) this._set('focus', this.focus ?? '');
    this.dataset.motion = this.motionLevel;
  }

  /** The outline flows and the lamps breathe only in full motion while not paused. */
  get _running() { return this.motionLevel === 'full' && !this.isPaused; }

  updated(changed) {
    super.updated(changed);
    const running = this._running;
    if (running && !this._raf) this._raf = requestAnimationFrame((t) => this._frame(t));
    if (!running) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  _frame(t) {
    this._raf = this._running ? requestAnimationFrame((n) => this._frame(n)) : 0;
    if (t - (this._last ?? -Infinity) < 1000 / Math.max(1, this.fps) - 2) return;
    this._last = t;
    const f = this.renderRoot.querySelector('[part=focus]');
    if (f) f.style.strokeDashoffset = String(-t / 40);
    this.renderRoot.querySelectorAll('.lamp').forEach((c, i) => c.setAttribute('r', String(c.dataset.on ? 5 + Math.sin(t / 600 + i) * 1.2 : 4)));
    this.dataset.frames = String(+this.dataset.frames + 1);
  }

  _toggle(r) { emit(this, 'cw-room', { id: r.id, on: r.on }); }

  render() {
    const { rooms, people, items, focus } = this._v;
    if (!rooms.length) return html`<svg role="group" aria-label=${this.label || '間取り'}></svg>`;
    const x0 = Math.min(...rooms.map((r) => r.x)), y0 = Math.min(...rooms.map((r) => r.y));
    const x1 = Math.max(...rooms.map((r) => r.x + r.w)), y1 = Math.max(...rooms.map((r) => r.y + r.h));
    // the view box holds the floor, the tall back walls and the footing, plus room for people and labels
    const corners = [iso(x0, y0, 1.6), iso(x1, y0, 1.6), iso(x0, y1, 1.6), iso(x1, y1, -0.3), iso(x0, y1, -0.3), iso(x1, y0, -0.3)];
    const minX = Math.min(...corners.map((p) => p[0])) - 16, maxX = Math.max(...corners.map((p) => p[0])) + 16;
    const minY = Math.min(...corners.map((p) => p[1])) - 16, maxY = Math.max(...corners.map((p) => p[1])) + 16;
    const fr = rooms.find((r) => r.id === focus);
    // when the plan is drawn small, grow the text and the people so they stay readable
    const fit = this._host?.[0] && this._host[1] ? Math.min(this._host[0] / (maxX - minX), this._host[1] / (maxY - minY)) : 1;
    const zoom = Math.min(2.4, Math.max(1, 0.85 / fit));
    const box = (b) => svg`<polygon class="item" opacity=".75" points=${wallX(b.x, b.x + b.w, b.y + b.h, 0, b.z)}/>
      <polygon class="item" opacity=".55" points=${wallY(b.y, b.y + b.h, b.x + b.w, 0, b.z)}/><polygon class="item" points=${quad(b.x, b.y, b.w, b.h, b.z)}/>`;
    return html`<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" preserveAspectRatio="xMidYMid meet" style="--_zoom:${zoom.toFixed(2)}" role="group" aria-label=${this.label || '間取り'}>
      <defs><filter id="bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter></defs>
      <polygon class="wall" points=${wallX(x0, x1, y1, -0.28, 0)}/><polygon class="wall" opacity=".7" points=${wallY(y0, y1, x1, -0.28, 0)}/>
      ${rooms.map((r) => svg`<g part="room" role="button" tabindex="0" data-room=${r.id} aria-pressed=${String(r.on)}
          aria-label=${[r.name, r.on ? `点灯 ${Math.round(r.level * 100)}%` : '消灯', r.note].filter(Boolean).join(' ')}
          @click=${() => this._toggle(r)} @keydown=${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggle(r); } }}>
        <polygon class="floor" points=${quad(r.x, r.y, r.w, r.h)}
          style="fill:${r.on ? `color-mix(in srgb, ${r.color} ${Math.round(22 + r.level * 30)}%, var(--_floor))` : 'var(--_floor)'}"/></g>`)}
      ${rooms.map((r) => { const [cx, cy] = iso(r.x + r.w / 2, r.y + r.h / 2); return svg`<ellipse class="glow" data-room=${r.id} cx=${cx} cy=${cy}
          rx=${(r.w + r.h) * 15} ry=${(r.w + r.h) * 8} filter="url(#bloom)" style="fill:${r.color};opacity:${r.on ? 0.25 + r.level * 0.6 : 0}"/>`; })}
      <polygon class="wall" points=${wallX(x0, x1, y0, 0, 1.5)}/><polygon class="cap" points=${wallX(x0, x1, y0, 1.5, 1.6)}/>
      <polygon class="wall" opacity=".8" points=${wallY(y0, y1, x0, 0, 1.5)}/><polygon class="cap" points=${wallY(y0, y1, x0, 1.5, 1.6)}/>
      ${rooms.map((r) => svg`${r.y > y0 ? svg`<polygon class="wall" opacity=".9" points=${wallX(r.x, r.x + r.w, r.y, 0, 0.5)}/>` : ''}
        ${r.x > x0 ? svg`<polygon class="wall" opacity=".9" points=${wallY(r.y, r.y + r.h, r.x, 0, 0.5)}/>` : ''}`)}
      ${items.map(box)}
      ${rooms.map((r) => { const [cx, cy] = iso(r.x + r.w / 2, r.y + r.h / 2, 0.02); return svg`<circle class="lamp" data-on=${r.on ? '1' : ''} cx=${cx} cy=${cy} r="5"
          style="fill:${r.on ? r.color : 'var(--cw-text-dim, #9a9a9a)'}"/>`; })}
      ${fr ? svg`<polygon part="focus" points=${quad(fr.x + 0.08, fr.y + 0.08, fr.w - 0.16, fr.h - 0.16, 0.01)}/>` : ''}
      ${rooms.map((r) => { const [lx, ly] = iso(r.x + 0.35, r.y + r.h - 0.4); return svg`<text class="name" x=${lx} y=${ly}>${r.name}</text>
          <text class="note" x=${lx} y=${ly + 16 * zoom}>${r.note}</text>`; })}
      ${people.map((p, i) => {
        const r = rooms.find((x) => x.id === p.room);
        const [x, y] = r ? iso(r.x + r.w * (0.62 + i * 0.1), r.y + r.h * (0.38 + i * 0.12), 0.3) : iso(x1 + 0.9, y1 - 0.8, 0.3);
        return svg`<g part="person" data-room=${p.room ?? ''} style="transform:translate(${x.toFixed(1)}px, ${y.toFixed(1)}px);opacity:${r ? 1 : 0.35}">
          <circle r=${13 * zoom} style="fill:${p.color}"/><text y=${4.5 * zoom} text-anchor="middle">${[...p.name][0] ?? ''}</text></g>`;
      })}
    </svg>`;
  }
}
define('cw-floorplan', CwFloorplan);
