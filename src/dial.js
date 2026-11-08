import { LitElement, html, svg, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

const SWEEP = 270; // degrees of the arc, open at the bottom

/**
 * <cw-dial>: a value on a 270° arc with the number in the middle; a thermostat when it has a target.
 * With a finite `.target` a mark sits on the arc and − / + buttons move it by `step`, sending `cw-target` ({target})
 * after each press; the face changes at once. Values set from outside while paused wait; a target being changed
 * by the user is not moved from outside. In full motion the arc eases to a new value; in calm it takes 200ms.
 */
export class CwDial extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    unit: { type: String },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    digits: { type: Number },
    warnAbove: { type: Number, attribute: 'warn-above' },
    warnBelow: { type: Number, attribute: 'warn-below' },
    _value: { state: true },
    _target: { state: true },
    _size: { state: true },
  };

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; color: var(--cw-text, #ededed);
      font-family: var(--cw-font, system-ui, sans-serif); container-type: size; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    [part='track'] { fill: none; stroke: color-mix(in srgb, var(--cw-text, #ededed) 14%, transparent); stroke-linecap: round; }
    [part='arc'] { fill: none; stroke: var(--cw-signal, #4a90c2); stroke-linecap: round; transition: stroke-dashoffset 200ms ease-out; }
    :host([data-motion='full']) [part='arc'] { transition: stroke-dashoffset 900ms cubic-bezier(.2, .8, .2, 1); }
    :host([data-motion='off']) [part='arc'] { transition: none; }
    :host([warn]) [part='arc'] { stroke: var(--cw-warn, #f18b82); }
    [part='mark'] { fill: var(--cw-text, #ededed); stroke: var(--cw-surface, #1d1d1d); stroke-width: 2; }
    [part='tick'] { stroke: color-mix(in srgb, var(--cw-text, #ededed) 30%, transparent); stroke-width: 1; }
    .middle { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; }
    [part='value'] {
      font-size: min(26cqmin, 64px); line-height: 1; font-variant-numeric: tabular-nums;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal);
    }
    :host([warn]) [part='value'] { color: var(--cw-warn, #f18b82); }
    [part='unit'] { font-size: min(9cqmin, 18px); color: var(--cw-text-dim, #9a9a9a); }
    [part='label'] { font-size: min(8cqmin, 14px); color: var(--cw-text-dim, #9a9a9a); }
    .set { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: min(8cqmin, 14px); font-variant-numeric: tabular-nums; }
    button { all: unset; display: grid; place-items: center; width: min(14cqmin, 30px); height: min(14cqmin, 30px); border-radius: 50%; cursor: pointer;
      background: color-mix(in srgb, var(--cw-text, #ededed) 10%, transparent); font-size: min(10cqmin, 18px); line-height: 1; transform: var(--cw-label-skew, none); }
    button:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    button:disabled { opacity: .3; cursor: default; }
    /* a short box has no room for the arc: the number and the buttons sit in one line */
    @container (max-height: 150px) {
      svg { display: none; }
      .middle { flex-direction: row; flex-wrap: wrap; gap: 4px 10px; }
      [part='value'] { font-size: min(40cqh, 40px); }
      .set { margin-top: 0; }
    }
  `;

  constructor() {
    super();
    this.min = 0;
    this.max = 100;
    this.step = 0.5;
    this.digits = 0;
    this._value = NaN;
    this._target = NaN;
    this._pending = undefined;
    this._size = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._seeded) {
      this._seeded = true;
      if (this.hasAttribute('value')) this._value = this._num(this.getAttribute('value'));
      if (this.hasAttribute('target')) this._target = this._num(this.getAttribute('target'));
    }
    this._ro = new ResizeObserver(() => { this._size = Math.min(this.clientWidth, this.clientHeight); });
    this._ro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro.disconnect();
    clearTimeout(this._hold);
    this._pressing = false;
  }

  _num(v) { return v === null || v === '' || !Number.isFinite(Number(v)) ? NaN : Number(v); }

  /** The measured value; anything that is not a number shows a dash. */
  get value() { return this._pending?.value ?? this._value; }
  set value(v) { this._queue('value', this._num(v)); }

  /** The set point; NaN (the default) hides the mark and the buttons. */
  get target() { return this._pending?.target ?? this._target; }
  // right after a press a target from outside waits until the hold ends, then shows
  set target(v) {
    if (this._pressing) this._held = this._num(v);
    else this._queue('target', this._num(v));
  }

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

  // a press is the user's own: it shows at once and beats a waiting value; values from outside are held off briefly
  _nudge(dir) {
    // snap to the step and drop float noise (22.500000001)
    const t = Number(Math.min(this.max, Math.max(this.min, Math.round((this._target + dir * this.step) / this.step) * this.step)).toFixed(6));
    if (t === this._target) return;
    this._target = t;
    delete this._pending?.target;
    clearTimeout(this._hold);
    this._pressing = true;
    this._held = undefined;
    this._hold = setTimeout(() => {
      this._pressing = false;
      if (this._held !== undefined) this.target = this._held;
      this._held = undefined;
    }, 1500);
    // at a limit the pressed button switches off; keep the focus in the dial on the other one
    const pressed = this.renderRoot.activeElement?.getAttribute('part');
    emit(this, 'cw-target', { target: t });
    this.updateComplete.then(() => {
      const b = this.renderRoot.querySelector(`[part=${pressed}]`);
      if (pressed && b?.disabled) this.renderRoot.querySelector(`[part=${pressed === 'up' ? 'down' : 'up'}]`)?.focus();
    });
  }

  /** Digits of the set point: as many as the step has (0.5 → 1, 1 → 0, 0.05 → 2). */
  get _stepDigits() { return (String(this.step).split('.')[1] ?? '').length; }

  _fmt(v, digits = this.digits) { const s = v.toFixed(digits); return v < 0 ? `−${s.slice(1)}` : s; }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const v = this._value;
    this.toggleAttribute('warn', Number.isFinite(v) && ((Number.isFinite(this.warnAbove) && v > this.warnAbove) || (Number.isFinite(this.warnBelow) && v < this.warnBelow)));
    this.setAttribute('role', 'group');
    const set = Number.isFinite(this._target) ? `設定 ${this._fmt(this._target, this._stepDigits)}${this.unit ?? ''}` : '';
    this.setAttribute('aria-label', [this.label, Number.isFinite(v) ? `${this._fmt(v)}${this.unit ?? ''}` : '値なし', set].filter(Boolean).join(' '));
  }

  render() {
    const s = this._size || 200, w = Math.max(4, s * 0.06), r = s / 2 - w, len = (2 * Math.PI * r * SWEEP) / 360;
    const frac = (x) => Math.min(1, Math.max(0, (x - this.min) / (this.max - this.min || 1)));
    // the arc starts at the lower left (135° from the right, going clockwise)
    const at = (f) => { const a = ((135 + f * SWEEP) * Math.PI) / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const arc = `M ${at(0).join(' ')} A ${r} ${r} 0 1 1 ${at(1).join(' ')}`;
    const v = this._value, t = this._target, has = Number.isFinite(t);
    const [mx, my] = at(frac(t));
    return html`<svg viewBox="${-s / 2} ${-s / 2} ${s} ${s}" aria-hidden="true">${svg`
        <path part="track" d=${arc} stroke-width=${w}/>
        <path part="arc" d=${arc} stroke-width=${w} stroke-dasharray=${len} stroke-dashoffset=${len * (1 - (Number.isFinite(v) ? frac(v) : 0))}/>
        ${has ? svg`<circle part="mark" cx=${mx} cy=${my} r=${w * 0.75}/>` : nothing}`}
      </svg>
      <div class="middle">
        ${this.label ? html`<span part="label">${this.label}</span>` : nothing}
        <span part="value">${Number.isFinite(v) ? this._fmt(v) : '—'}</span>
        ${this.unit ? html`<span part="unit">${this.unit}</span>` : nothing}
        ${has ? html`<span class="set"><button part="down" aria-label="下げる" ?disabled=${t <= this.min} @click=${() => this._nudge(-1)}>−</button>
          <span part="target">設定 ${this._fmt(t, this._stepDigits)}</span>
          <button part="up" aria-label="上げる" ?disabled=${t >= this.max} @click=${() => this._nudge(1)}>+</button></span>` : nothing}
      </div>`;
  }
}
define('cw-dial', CwDial);
