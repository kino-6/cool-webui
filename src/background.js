import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/**
 * <cw-background kind="aura">: soft light-coloured glows drifting over the ground.
 * `.lights = [{color, level}]` (level 0..1). kind="streaks": slanted bands of the accent colour drifting sideways. Draws continuously only in full motion, capped at `fps`;
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
    if (this.kind === 'streaks') this._streaks(g, w, h, t);
    else this._aura(g, w, h, t);
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
