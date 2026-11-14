import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

const OK = new Set(['ok', 'good', 'normal', 'on', 'online', 'true', 'home', 'locked', 'closed', 'idle', '正常']);
const BAD = new Set(['bad', 'error', 'problem', 'offline', 'unavailable', 'false', 'open', 'unlocked', 'alarm', '異常']);
const WORDS = { ok: '正常', warn: '注意', bad: '異常' };
/** ok / warn / bad from a state word, true/false or {state}. Anything not known is warn. */
const judge = (s) => { const k = String(s ?? '').trim().toLowerCase(); return OK.has(k) ? 'ok' : BAD.has(k) ? 'bad' : 'warn'; };

/**
 * <cw-verdict ok-text warn-text bad-text>: many states said in one huge word. `.items = [{label, state}]`; states
 * read as ok (ok, on, online, locked, closed, home ...), bad (bad, error, offline, open, unlocked ...) or else warn.
 * All ok shows `ok-text` (default 異常 なし); otherwise `bad-text` or `warn-text` with {n} as the count (default
 * 異常 {n}件 / 注意 {n}件). A space breaks the word into lines. The list beside it puts the ones not ok first. All
 * ok sits on the look's lit face; otherwise the ground takes the warning's colour. Items set while paused wait. In full motion a word that is not ok blinks.
 */
export class CwVerdict extends StageMember(LitElement) {
  static properties = {
    okText: { type: String, attribute: 'ok-text' },
    warnText: { type: String, attribute: 'warn-text' },
    badText: { type: String, attribute: 'bad-text' },
    _items: { state: true },
  };

  static styles = css`
    :host { display: block; height: 100%; container-type: size; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    [part='face'] { box-sizing: border-box; height: 100%; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 5cqw; padding: 6cqh 5cqw;
      border: var(--cw-border, 1px solid rgba(255,255,255,.06)); background: color-mix(in srgb, var(--tone) 20%, var(--cw-surface, #1d1d1d)); }
    :host([verdict='ok']) { --tone: var(--cw-ok, #80c994); }
    :host([verdict='warn']) { --tone: var(--cw-signal, #4a90c2); }
    :host([verdict='bad']) { --tone: var(--cw-warn, #f18b82); }
    [part='word'] { display: flex; flex-direction: column; line-height: .86; white-space: nowrap; font-size: min(36cqh, 13cqw); letter-spacing: -.02em;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 800); font-stretch: var(--cw-display-stretch, normal); }
    :host(:not([verdict='ok'])) [part='word'] { color: var(--tone); }
    /* all well: the look's lit face, like a lit panel */
    :host([verdict='ok']) [part='face'] { background: var(--cw-surface-on, rgba(255,255,255,.85)); color: var(--cw-text-on, #121212); }
    :host([data-motion='full']:not([data-paused]):not([verdict='ok'])) [part='word'] { animation: blink 1.4s steps(2, jump-none) infinite; }
    @keyframes blink { 50% { opacity: .35; } }
    [part='list'] { display: grid; gap: .5em; font-size: max(12px, 6cqh); min-width: 0; }
    [part='item'] { display: grid; grid-template-columns: auto minmax(1em, 1fr) auto; align-items: center; gap: .6em; white-space: nowrap; }
    [part='item'] i { border-top: 1px solid currentColor; opacity: .5; }
    [part='item'] [part='label'] { overflow: hidden; text-overflow: ellipsis; }
    [part='item'][data-state='warn'] b { color: var(--cw-signal, #4a90c2); }
    [part='item'][data-state='bad'] b { color: var(--cw-warn, #f18b82); }
    b { font-weight: 600; }
  `;

  constructor() {
    super();
    this.okText = '異常 なし';
    this.warnText = '注意 {n}件';
    this.badText = '異常 {n}件';
    this._items = [];
    this._pending = undefined;
  }

  /** The items (or the ones waiting, while paused). */
  get items() { return this._pending ?? this._items; }
  set items(v) {
    const list = (Array.isArray(v) ? v : []).filter((e) => e && typeof e === 'object').map((e) => ({ label: String(e.label ?? ''), state: judge(e.state) }));
    if (this.isPaused) this._pending = list;
    else this._items = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._items = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  /** ok / warn / bad for the whole, and the word shown. */
  get verdict() {
    const bad = this._items.filter((e) => e.state === 'bad').length, warn = this._items.filter((e) => e.state === 'warn').length;
    if (bad) return ['bad', this.badText.replace('{n}', bad)];
    if (warn) return ['warn', this.warnText.replace('{n}', warn)];
    return ['ok', this.okText];
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    const [v, word] = this.verdict;
    this.setAttribute('verdict', v);
    this.setAttribute('role', 'status');
    const off = this._items.filter((e) => e.state !== 'ok').map((e) => `${e.label} ${WORDS[e.state]}`);
    this.setAttribute('aria-label', [word.replace(/\s+/g, ''), ...off].join('、'));
  }

  render() {
    const [, word] = this.verdict;
    const rank = { bad: 0, warn: 1, ok: 2 };
    const list = [...this._items].sort((a, b) => rank[a.state] - rank[b.state]).slice(0, 6);
    return html`<div part="face">
      <div part="word" aria-hidden="true">${word.split(/\s+/).filter(Boolean).map((w) => html`<span>${w}</span>`)}</div>
      <div part="list" aria-hidden="true">${list.map((e) => html`<div part="item" data-state=${e.state}><span part="label">${e.label}</span><i></i><b>${WORDS[e.state]}</b></div>`)}</div>
    </div>`;
  }
}
define('cw-verdict', CwVerdict);
