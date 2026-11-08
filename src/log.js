import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** <cw-log>: newest-first log lines. `push({time, level, type, text, id?})`; a repeated id replaces its line. */
export class CwLog extends StageMember(LitElement) {
  static properties = {
    lines: { type: Number },
    levels: { type: String },
    live: { type: String },
    _rows: { state: true },
  };

  static styles = css`
    :host { display: block; height: 100%; overflow: hidden; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); font-size: 13px; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    [part='row'] { display: grid; grid-template-columns: auto auto auto 1fr; gap: 10px; align-items: baseline; white-space: nowrap; min-width: 0; }
    [part='time'] { color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    [part='level'] { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--cw-text-dim, #9a9a9a); }
    [part='level'][data-level='warn'], [part='level'][data-level='error'] { color: var(--cw-warn, #f18b82); }
    [part='type'] { color: var(--cw-signal, #4a90c2); font-weight: 500; }
    [part='text'] { overflow: hidden; text-overflow: ellipsis; }
    :host([data-motion='full']) [part='row']:first-child { animation: enter 400ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    @keyframes enter { from { opacity: 0; transform: translateY(-6px); } }
  `;

  constructor() {
    super();
    this.lines = 30;
    this.live = 'off';
    this._rows = [];
    this._held = [];
  }

  /** Append one entry or an array of entries (oldest first). */
  push(v) {
    const add = (Array.isArray(v) ? v : [v]).filter((e) => e && typeof e === 'object');
    if (this.isPaused) this._held = [...this._held, ...add].slice(-this.lines);
    else this._rows = this._merge(this._rows, add);
  }

  /** Remove every line. */
  clear() {
    this._rows = [];
    this._held = [];
  }

  _merge(rows, add) {
    let out = rows;
    for (const e of add) {
      const row = { id: e.id, time: String(e.time ?? ''), level: String(e.level ?? 'info').toLowerCase(), type: String(e.type ?? ''), text: String(e.text ?? '') };
      out = [row, ...(row.id != null ? out.filter((r) => r.id !== row.id) : out)];
    }
    return out.slice(0, this.lines);
  }

  flush() {
    const n = this._held.length;
    if (n) this._rows = this._merge(this._rows, this._held);
    this._held = [];
    return n;
  }

  willUpdate(changed) {
    super.willUpdate(changed);
    this.dataset.motion = this.motionLevel;
  }

  render() {
    const allow = this.levels ? this.levels.split(',').map((s) => s.trim().toLowerCase()) : null;
    const rows = allow ? this._rows.filter((r) => allow.includes(r.level)) : this._rows;
    return html`<div class="list" role="log" aria-live=${this.live === 'polite' ? 'polite' : 'off'}>${rows.map((r) => html`
      <div part="row"><span part="time">${r.time}</span><span part="level" data-level=${r.level}>${r.level}</span><span part="type">${r.type}</span><span part="text">${r.text}</span></div>`)}</div>`;
  }
}
define('cw-log', CwLog);
