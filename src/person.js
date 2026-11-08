import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

// the first letter as it looks: a family emoji or a flag is one letter made of several code points
const letters = new Intl.Segmenter('ja', { granularity: 'grapheme' });
const first = (name) => letters.segment(name || '?')[Symbol.iterator]().next().value?.segment ?? '?';
const at = (v) => (typeof v === 'number' ? v : Date.parse(v ?? ''));
const ago = (ms) => {
  const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d ? `${d}日前から` : h ? `${h}時間前から` : m ? `${m}分前から` : 'いまから';
};

/**
 * <cw-person>: who is where. `.people = [{name, place, since, picture}]`: place is home, not_home or a zone's name
 * (read as 在宅, 外出 or that name); since (epoch ms or ISO) gives how long they have been there; picture is a photo,
 * else the first letter of the name. People at home come first. The times are looked at again every minute unless
 * paused; people set while paused wait. In full motion the ring of someone at home breathes.
 */
export class CwPerson extends StageMember(LitElement) {
  static properties = {
    _people: { state: true },
    _tick: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    [part='person'] { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
    [part='face'] { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; overflow: hidden;
      background: color-mix(in srgb, var(--cw-text, #ededed) 14%, transparent); font-size: 17px; box-sizing: border-box;
      border: 2px solid color-mix(in srgb, var(--cw-text, #ededed) 25%, transparent); }
    [part='face'] img { width: 100%; height: 100%; object-fit: cover; }
    [part='person'][data-home] [part='face'] { border-color: var(--cw-ok, #7bc47f); }
    :host([data-motion='full']:not([data-paused])) [part='person'][data-home] [part='face'] { animation: breathe 3s ease-in-out infinite; }
    @keyframes breathe { 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--cw-ok, #7bc47f) 30%, transparent); } }
    .what { min-width: 0; flex: 1; }
    [part='name'] { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: var(--cw-display-font, inherit); font-weight: var(--cw-display-weight, 500); font-stretch: var(--cw-display-stretch, normal); }
    [part='place'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='person'][data-home] [part='place'] { color: var(--cw-ok, #7bc47f); }
    [part='since'] { flex: none; font-size: 12px; color: var(--cw-text-dim, #9a9a9a); white-space: nowrap; font-variant-numeric: tabular-nums; }
    [part='empty'] { font-size: 13px; color: var(--cw-text-dim, #9a9a9a); }
    @container (max-width: 220px) { [part='since'] { display: none; } }
  `;

  constructor() {
    super();
    this._people = [];
    this._pending = undefined;
  }

  /** The people shown (or waiting, while paused). */
  get people() { return this._pending ?? this._people; }
  set people(v) {
    const list = (Array.isArray(v) ? v : []).filter((p) => p && typeof p === 'object');
    if (this.isPaused) this._pending = list;
    else this._people = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._people = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) {
    this.toggleAttribute('data-paused', on);
    if (!on) this._tick = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'list');
    this._timer = setInterval(() => { if (!this.isPaused) this._tick = Date.now(); }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
  }

  render() {
    if (!this._people.length) return html`<div part="empty">人の情報はありません</div>`;
    const now = Date.now();
    const rows = this._people.map((p) => ({ ...p, home: p.place === 'home', word: p.place === 'home' ? '在宅' : p.place === 'not_home' ? '外出' : p.place || '不明' }));
    // at home first, the rest as given
    rows.sort((a, b) => b.home - a.home);
    return html`${rows.map((p) => {
      const since = Number.isFinite(at(p.since)) ? ago(now - at(p.since)) : '';
      return html`<div part="person" role="listitem" ?data-home=${p.home} aria-label=${[p.name, p.word, since].filter(Boolean).join(' ')}>
        <span part="face" aria-hidden="true">${p.picture ? html`<img src=${p.picture} alt="">` : first(p.name)}</span>
        <span class="what"><div part="name">${p.name ?? ''}</div><div part="place">${p.word}</div></span>
        ${since ? html`<span part="since">${since}</span>` : nothing}
      </div>`;
    })}`;
  }
}
define('cw-person', CwPerson);
