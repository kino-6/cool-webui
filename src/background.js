import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/**
 * <cw-background kind="aura">: soft light-coloured glows drifting over the ground.
 * `.lights = [{color, level}]` (level 0..1). kind="streaks": slanted bands of the accent colour drifting sideways.
 * kind="grid": a faint grid with a bright line sweeping down. kind="scan": a dark-edged screen with a bright band
 * rolling down. kind="stars": square stars that twinkle and drift left. kind="horizon": a striped sun on the horizon
 * over a grid running toward the viewer. All take the look's accent. Draws continuously only in full motion, capped at `fps`;
 * otherwise draws one frame and stops. Pausing keeps the last frame.
 */
export class CwBackground extends StageMember(LitElement) {
  static properties = {
    kind: { type: String },
    fps: { type: Number },
    lights: { attribute: false },
  };

  static styles = css`
    :host { display: block; position: absolute; inset: 0; pointer-events: none; }
    canvas { width: 100%; height: 100%; display: block; }
  `;

  constructor() {
    super();
    this.kind = 'aura';
    this.fps = 30;
    this.lights = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.dataset.frames ??= '0';
    this._ro = new ResizeObserver(() => this._size());
    this._ro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  onPauseChange() { this.requestUpdate(); }

  _size() {
    const c = this.renderRoot.querySelector('canvas');
    if (!c) return;
    // half resolution: the glow is blurry anyway
    c.width = Math.max(1, Math.round(this.clientWidth / 2));
    c.height = Math.max(1, Math.round(this.clientHeight / 2));
    this._draw(performance.now());
  }

  updated(changed) {
    super.updated(changed);
    const running = this.motionLevel === 'full' && !this.isPaused;
    if (running && !this._raf) this._raf = requestAnimationFrame((t) => this._frame(t));
    if (!running) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (!this.isPaused) this._draw(performance.now());
    }
  }

  _frame(t) {
    this._raf = this.motionLevel === 'full' && !this.isPaused ? requestAnimationFrame((n) => this._frame(n)) : 0;
    if (t - (this._last ?? -Infinity) < 1000 / Math.max(1, this.fps) - 2) return;
    this._last = t;
    this._draw(t);
  }

  _draw(t) {
    const c = this.renderRoot?.querySelector('canvas');
    if (!c) return;
    const g = c.getContext('2d'), w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    const draw = { streaks: this._streaks, grid: this._grid, scan: this._scan, stars: this._stars, horizon: this._horizon }[this.kind] ?? this._aura;
    draw.call(this, g, w, h, t);
    this.dataset.frames = String(+this.dataset.frames + 1);
  }

  _streaks(g, w, h, t) {
    const color = getComputedStyle(this).getPropertyValue('--cw-signal').trim() || '#4a90c2';
    const lean = h * 0.55, span = w + lean * 2;
    g.fillStyle = color;
    for (let i = 0; i < 6; i++) {
      const bw = w * (0.03 + ((i * 37) % 9) / 100);
      const x = ((i * span) / 6 + t * w * 0.00003 * (1 + (i % 3) * 0.6)) % span - lean;
      g.globalAlpha = 0.05 + (i % 3) * 0.04;
      g.beginPath();
      g.moveTo(x + lean, 0); g.lineTo(x + lean + bw, 0); g.lineTo(x + bw, h); g.lineTo(x, h);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  _colour(name, fallback) { return getComputedStyle(this).getPropertyValue(name).trim() || fallback; }

  _grid(g, w, h, t) {
    const step = 22;
    g.strokeStyle = this._colour('--cw-signal', '#4a90c2');
    g.lineWidth = 1;
    g.globalAlpha = 0.07;
    g.beginPath();
    for (let x = (w / 2) % step; x < w; x += step) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); }
    for (let y = (h / 2) % step; y < h; y += step) { g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); }
    g.stroke();
    // the sweep: a line with a fading tail above it, once every 8 s
    const y = ((t / 8000) % 1) * (h + 60) - 30;
    const tail = g.createLinearGradient(0, y - 50, 0, y);
    tail.addColorStop(0, 'transparent');
    tail.addColorStop(1, g.strokeStyle);
    g.globalAlpha = 0.12;
    g.fillStyle = tail;
    g.fillRect(0, y - 50, w, 50);
    g.globalAlpha = 0.35;
    g.fillRect(0, y, w, 1);
    g.globalAlpha = 1;
  }

  _scan(g, w, h, t) {
    const y = ((t / 6000) % 1) * (h * 1.4) - h * 0.2;
    const band = g.createLinearGradient(0, y - h * 0.15, 0, y + h * 0.15);
    band.addColorStop(0, 'transparent');
    band.addColorStop(0.5, this._colour('--cw-signal', '#4a90c2'));
    band.addColorStop(1, 'transparent');
    g.globalAlpha = 0.07;
    g.fillStyle = band;
    g.fillRect(0, 0, w, h);
    // the curved glass: darker toward the edges
    const edge = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    edge.addColorStop(0, 'transparent');
    edge.addColorStop(1, '#000');
    g.globalAlpha = 0.55;
    g.fillStyle = edge;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  }

  _stars(g, w, h, t) {
    const colours = [this._colour('--cw-text', '#ededed'), this._colour('--cw-signal', '#4a90c2'), this._colour('--cw-ok', '#7bc47f')];
    for (let i = 0; i < 90; i++) {
      // fixed places from the index; far stars (small) drift slower than near ones
      const size = 1 + (i % 3 === 0) + (i % 11 === 0);
      const x = ((((i * 7919) % 1000) / 1000) * w - t * 0.0004 * size * w / 100 % w + w) % w;
      const y = (((i * 104729) % 1000) / 1000) * h;
      g.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(t / (700 + (i % 7) * 260) + i));
      g.fillStyle = colours[i % 5 === 0 ? 1 : i % 13 === 0 ? 2 : 0];
      g.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
    g.globalAlpha = 1;
  }

  _horizon(g, w, h, t) {
    const sky = h * 0.58, signal = this._colour('--cw-signal', '#4a90c2'), warm = this._colour('--cw-warn', '#f18b82');
    // the sun: a warm-to-accent disc cut by stripes that thicken toward the horizon
    const r = Math.min(w, h) * 0.24, cx = w / 2;
    const sun = g.createLinearGradient(0, sky - r, 0, sky);
    sun.addColorStop(0, warm);
    sun.addColorStop(1, signal);
    g.save();
    g.beginPath();
    g.arc(cx, sky, r, Math.PI, 0);
    g.closePath();
    g.clip();
    g.globalAlpha = 0.5;
    g.fillStyle = sun;
    g.fillRect(cx - r, sky - r, r * 2, r);
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    for (let k = 0; k < 6; k++) { const yy = sky - r * 0.45 + k * r * 0.1; g.fillRect(cx - r, yy, r * 2, 1 + k * 0.8); }
    g.restore();
    // the floor: lines toward a point on the horizon, and cross lines coming closer
    g.strokeStyle = signal;
    g.lineWidth = 1;
    g.globalAlpha = 0.3;
    g.beginPath();
    for (let k = -12; k <= 12; k++) { g.moveTo(cx + k * w * 0.012, sky); g.lineTo(cx + k * w * 0.16, h); }
    const phase = (t / 1600) % 1;
    for (let k = 0; k < 10; k++) {
      const d = (k + phase) / 10, yy = sky + (h - sky) * d * d;
      g.moveTo(0, yy); g.lineTo(w, yy);
    }
    g.stroke();
    g.globalAlpha = 0.6;
    g.fillStyle = signal;
    g.fillRect(0, sky, w, 1);
    g.globalAlpha = 1;
  }

  _aura(g, w, h, t) {
    const lights = this.lights?.length ? this.lights : [{ color: getComputedStyle(this).getPropertyValue('--cw-signal').trim() || '#4a90c2', level: 0.6 }];
    lights.forEach((l, i) => {
      const level = Math.min(1, Math.max(0, Number(l.level) || 0));
      if (!level) return;
      const x = w / 2 + Math.sin(t / 9000 + i * 1.7) * w * 0.38;
      const y = h / 2 + Math.cos(t / 11000 + i * 2.3) * h * 0.36;
      const r = Math.max(w, h) * (0.3 + level * 0.15);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, l.color);
      grad.addColorStop(1, 'transparent');
      g.globalAlpha = 0.16 * (0.5 + level);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    g.globalAlpha = 1;
  }

  render() {
    return html`<canvas aria-hidden="true"></canvas>`;
  }

  firstUpdated() { this._size(); }
}
define('cw-background', CwBackground);
