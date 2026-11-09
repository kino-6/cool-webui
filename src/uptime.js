import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** What a check said, in the kit's four words; Uptime Kuma's numbers 0-3 and true / false read too. */
function status(v) {
  const s = v && typeof v === 'object' ? v.status : v;
  if (s === 'up' || s === 1 || s === true) return 'up';
  if (s === 'down' || s === 0 || s === false) return 'down';
  if (s === 'pending' || s === 2) return 'pending';
  if (s === 'maintenance' || s === 3) return 'maintenance';
  return 'unknown';
}
const WORDS = { up: '稼働中', down: '停止', pending: '確認中', maintenance: '保守中', unknown: '不明' };

/**
 * <cw-uptime points>: for each thing watched, its recent checks as small squares (oldest left), how much of the time
 * it was up, and what it is now. `.data = [{label, history, ratio, state}]`: history lists the checks, each 'up' /
 * 'down' / 'pending' / 'maintenance', true / false, Uptime Kuma's 1 / 0 / 2 / 3, or {status} holding one of those;
 * ratio (0-100) is the share up, worked out from history (up against up and down) when it is not given; state is
 * now, the last check when it is not given. The last `points` (default 30) checks are shown and fewer leave the left
 * empty. A thing that is down now is in the warning colour. Values set while paused wait. In full motion the newest
 * square of a thing that is down blinks. Under 200px wide the squares are hidden.
 */
export class CwUptime extends StageMember(LitElement) {
  static properties = {
    points: { type: Number },
    _rows: { state: true },
  };

  static styles = css`
    :host { display: block; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); container-type: inline-size; }
    [part='row'] { display: grid; grid-template-columns: minmax(4em, 1fr) minmax(80px, 2.4fr) 4.2em; align-items: center; gap: 10px; padding: 5px 0; }
    [part='name'] { min-width: 0; }
    [part='label'] { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [part='state'] { font-size: 11px; color: var(--cw-ok, #7bc47f); }
    [part='row'][data-now='down'] [part='state'] { color: var(--cw-warn, #f18b82); }
    [part='row'][data-now='pending'] [part='state'], [part='row'][data-now='unknown'] [part='state'] { color: var(--cw-text-dim, #9a9a9a); }
    [part='row'][data-now='maintenance'] [part='state'] { color: var(--cw-signal, #4a90c2); }
    [part='squares'] { display: flex; gap: 2px; height: 20px; }
    [part='squares'] i { flex: 1; min-width: 2px; border-radius: 2px; background: color-mix(in srgb, var(--cw-text, #ededed) 10%, transparent); }
    [part='squares'] i[data-s='up'] { background: var(--cw-ok, #7bc47f); }
    [part='squares'] i[data-s='down'] { background: var(--cw-warn, #f18b82); }
    [part='squares'] i[data-s='pending'] { background: var(--cw-text-dim, #9a9a9a); }
    [part='squares'] i[data-s='maintenance'] { background: var(--cw-signal, #4a90c2); }
    :host([data-motion='full']:not([data-paused])) [part='row'][data-now='down'] i:last-child { animation: blink 1s steps(2, start) infinite; }
    @keyframes blink { to { opacity: .25; } }
    [part='ratio'] { font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; color: var(--cw-text-dim, #9a9a9a); }
    [part='empty'] { font-size: 12px; color: var(--cw-text-dim, #9a9a9a); }
    @container (max-width: 200px) { [part='row'] { grid-template-columns: minmax(0, 1fr) auto; } [part='squares'] { display: none; } }
  `;

  constructor() {
    super();
    this.points = 30;
    this._rows = [];
    this._pending = undefined;
  }

  /** The things watched (or waiting, while paused). */
  get data() { return this._pending ?? this._rows; }
  set data(v) {
    const list = (Array.isArray(v) ? v : []).filter((e) => e && typeof e === 'object');
    if (this.isPaused) this._pending = list;
    else this._rows = list;
  }

  flush() {
    if (!this._pending) return 0;
    this._rows = this._pending;
    this._pending = undefined;
    return 1;
  }

  onPauseChange(on) { this.toggleAttribute('data-paused', on); }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
    this.setAttribute('role', 'list');
  }

  render() {
    if (!this._rows.length) return html`<div part="empty">見張る対象はありません</div>`;
    const n = Number.isFinite(this.points) && this.points >= 1 ? Math.floor(this.points) : 30;
    return this._rows.map((e) => {
      const all = (Array.isArray(e.history) ? e.history : []).map(status);
      const now = e.state != null ? status(e.state) : all.at(-1) ?? 'unknown';
      const up = all.filter((s) => s === 'up').length, down = all.filter((s) => s === 'down').length;
      const given = e.ratio !== null && e.ratio !== '' && Number.isFinite(Number(e.ratio)) ? Math.min(100, Math.max(0, Number(e.ratio))) : NaN;
      const ratio = Number.isFinite(given) ? given : up + down ? (up / (up + down)) * 100 : NaN;
      // one place under 100 so 99.96 does not read as 100
      const pct = Number.isFinite(ratio) ? `${ratio >= 100 ? '100' : (Math.floor(ratio * 10) / 10).toFixed(1)}%` : '—';
      const shown = all.slice(-n), pad = n - shown.length;
      const label = e.label ?? '';
      return html`<div part="row" role="listitem" data-now=${now} aria-label=${[label, WORDS[now], `稼働 ${pct}`].filter(Boolean).join(' ')}>
        <span part="name"><span part="label">${label}</span><span part="state">${WORDS[now]}</span></span>
        <span part="squares" aria-hidden="true">${Array.from({ length: pad }, () => html`<i></i>`)}${shown.map((s) => html`<i data-s=${s}></i>`)}</span>
        <span part="ratio">${pct}</span>
      </div>`;
    });
  }
}
define('cw-uptime', CwUptime);
