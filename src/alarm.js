import { LitElement, html, css, nothing } from 'lit';
import { define, emit } from './core.js';
import { StageMember } from './member.js';

/** Home Assistant's alarm states, in Japanese. */
const WORDS = {
  disarmed: '解除中', armed_home: '在宅警戒', armed_away: '外出警戒', armed_night: '夜間警戒', armed_vacation: '長期不在の警戒',
  armed_custom_bypass: '一部を除く警戒', pending: '警戒の前の待ち時間', arming: '警戒に切り替え中', disarming: '解除に切り替え中', triggered: '発報',
};
/** The arming buttons, in the order shown. */
const MODES = [['home', '在宅'], ['away', '外出'], ['night', '夜間'], ['vacation', '長期不在'], ['custom_bypass', '一部を除く']];

/**
 * <cw-alarm label="...">: an alarm panel. `.now = {state, codeFormat, codeArmRequired, modes}` merges into what is shown:
 * state in Home Assistant's words; codeFormat 'number' gives a keypad, 'text' a password field, '' or null no code;
 * codeArmRequired says arming needs the code too; modes lists the arming buttons (home, away, night, vacation,
 * custom_bypass). Disarmed, the arming buttons show; otherwise 解除 does. A press sends `cw-alarm` ({action: arm_away ...
 * | disarm, code}), shows arming or disarming at once and clears the code. The code is never shown or read out: only
 * how many characters were typed. Values set while paused wait. In full motion a triggered alarm blinks.
 */
export class CwAlarm extends StageMember(LitElement) {
  static properties = {
    label: { type: String },
    _d: { state: true },
    _code: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    [part='label'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); }
    [part='state'] { font-size: 24px; line-height: 1.3;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    :host([state^='armed']) [part='state'] { color: var(--cw-signal, #4a90c2); }
    :host([state='triggered']) [part='state'] { color: var(--cw-warn, #f18b82); }
    :host([data-motion='full'][state='triggered']:not([data-paused])) [part='state'] { animation: blink 1s steps(2, start) infinite; }
    @keyframes blink { to { visibility: hidden; } }
    [part='code'] { margin: 8px 0; min-height: 22px; font-size: 18px; letter-spacing: .3em; font-variant-numeric: tabular-nums; }
    input { all: unset; box-sizing: border-box; width: 100%; padding: 6px 10px; border-radius: 8px; font-size: 16px;
      background: color-mix(in srgb, var(--cw-text, #ededed) 8%, transparent); }
    [part='keys'] button { padding: 0 4px; white-space: nowrap; }
    [part='keys'] { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 220px; margin-bottom: 10px; }
    /* with room, the twelve keys sit in two rows of six, so the panel stays low */
    @container (min-width: 280px) { [part='keys'] { grid-template-columns: repeat(6, 1fr); max-width: 330px; } }
    button { all: unset; box-sizing: border-box; display: grid; place-items: center; min-height: 34px; padding: 0 12px; border-radius: 10px; cursor: pointer;
      font-size: 15px; font-variant-numeric: tabular-nums; background: color-mix(in srgb, var(--cw-text, #ededed) 9%, transparent); transform: var(--cw-label-skew, none); }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--cw-signal, #4a90c2); outline-offset: 2px; }
    button:disabled { opacity: .35; cursor: default; }
    [part='actions'] { display: flex; flex-wrap: wrap; gap: 6px; }
    [part='actions'] button { background: var(--cw-signal, #4a90c2); color: var(--cw-text-on, #121212); }
    @container (max-width: 220px) { [part='state'] { font-size: 18px; } [part='keys'] button { min-height: 28px; } }
  `;

  constructor() {
    super();
    this._d = { state: '', codeFormat: null, codeArmRequired: true, modes: ['home', 'away'] };
    this._code = '';
    this._pending = undefined;
  }

  /** What is shown, with any values still waiting while paused. */
  get now() { return { ...this._d, ...this._pending }; }
  set now(v) {
    if (!v || typeof v !== 'object') return;
    if (this.isPaused) this._pending = { ...this._pending, ...v };
    else this._set(v);
  }

  // a half-typed code belongs to what was shown when it was typed: a new state or code rule drops it
  _set(v) {
    const d = { ...this._d, ...v };
    if (['state', 'codeFormat', 'codeArmRequired'].some((k) => d[k] !== this._d[k])) this._code = '';
    this._d = d;
  }

  flush() {
    if (!this._pending) return 0;
    const n = Object.keys(this._pending).length;
    this._set(this._pending);
    this._pending = undefined;
    return n;
  }

  connectedCallback() {
    super.connectedCallback();
    // digits, Backspace and Enter on the keyboard work the keypad
    this._keys ??= (e) => {
      const d = this._d, fmt = d.codeFormat;
      if (fmt !== 'number' || e.target !== this) return;
      if (/^[0-9]$/.test(e.key)) this._code += e.key;
      else if (e.key === 'Backspace') this._code = this._code.slice(0, -1);
      else if (e.key === 'Enter' && d.state && d.state !== 'disarmed' && this._code) this._press('disarm');
      else return;
      e.preventDefault();
    };
    this.addEventListener('keydown', this._keys);
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._keys);
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  // a press is the user's own: it shows at once, beats a waiting state, and the code is gone once sent
  _press(action) {
    const code = this._code;
    this._code = '';
    this._d = { ...this._d, state: action === 'disarm' ? 'disarming' : 'arming' };
    if (this._pending) delete this._pending.state;
    emit(this, 'cw-alarm', { action, ...(code && { code }) });
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('state', this._d.state ?? '');
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', [this.label, WORDS[this._d.state] ?? this._d.state ?? ''].filter(Boolean).join(' ') || '防犯');
  }

  render() {
    const d = this._d, known = !!d.state, disarmed = d.state === 'disarmed', fmt = d.codeFormat;
    // the code is needed to disarm whenever there is one, and to arm only when the panel says so
    const needs = !!fmt && (!disarmed || d.codeArmRequired !== false), ready = !needs || this._code.length > 0;
    const key = (k) => html`<button aria-label=${k} @click=${() => { this._code += k; }}>${k}</button>`;
    const modes = MODES.filter(([m]) => (Array.isArray(d.modes) ? d.modes : []).includes(m));
    return html`${this.label ? html`<div part="label">${this.label}</div>` : nothing}
      <div part="state">${known ? WORDS[d.state] ?? d.state : '—'}</div>
      ${known && needs ? html`
        <div part="code" aria-live="polite" aria-label=${`暗証番号 ${this._code.length} 文字`}>${fmt === 'text'
          ? html`<input type="password" autocomplete="off" aria-label="暗証番号" .value=${this._code} @input=${(e) => { this._code = e.target.value; }}
              @keydown=${(e) => { if (e.key === 'Enter' && this._code && !disarmed) this._press('disarm'); }}>`
          : '●'.repeat(this._code.length)}</div>
        ${fmt === 'number' ? html`<div part="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key)}
          <button part="clear" aria-label="消す" @click=${() => { this._code = ''; }}>消す</button>${key('0')}</div>` : nothing}` : nothing}
      ${known ? html`<div part="actions">${disarmed
        ? modes.map(([m, word]) => html`<button part=${`arm_${m}`} ?disabled=${!ready} @click=${() => this._press(`arm_${m}`)}>${word}</button>`)
        : html`<button part="disarm" ?disabled=${!ready} @click=${() => this._press('disarm')}>解除</button>`}</div>` : nothing}`;
  }
}
define('cw-alarm', CwAlarm);
