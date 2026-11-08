import { LitElement, html, css } from 'lit';
import { define } from './core.js';
import { StageMember } from './member.js';

/** <cw-feed>: the newest few messages with who said them. `push({who, text, time, id?})`. */
export class CwFeed extends StageMember(LitElement) {
  static properties = {
    items: { type: Number },
    live: { type: String },
    _rows: { state: true },
  };

  static styles = css`
    :host { display: block; height: 100%; overflow: hidden; color: var(--cw-text, #ededed); font-family: var(--cw-font, system-ui, sans-serif); }
    .list { display: flex; flex-direction: column; gap: 12px; }
    [part='item'] { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .meta { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }
    [part='who'] { font-weight: 600; color: var(--cw-signal, #4a90c2); }
    [part='time'] { color: var(--cw-text-dim, #9a9a9a); font-variant-numeric: tabular-nums; }
    [part='text'] { font-size: 15px; line-height: 1.45; overflow-wrap: anywhere; }
    :host([data-motion='full']) [part='item']:first-child { animation: enter 450ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    @keyframes enter { from { opacity: 0; transform: translateX(-10px); } }
  `;

  constructor() {
    super();
    this.items = 4;
    this.live = 'off';
    this._rows = [];
    this._held = [];
  }

  /** Append one message or an array of messages (oldest first). */
  push(v) {
    const add = (Array.isArray(v) ? v : [v]).filter((e) => e && typeof e === 'object');
    if (this.isPaused) this._held = [...this._held, ...add].slice(-this.items);
    else this._rows = this._merge(this._rows, add);
  }

  _merge(rows, add) {
    let out = rows;
    for (const e of add) {
      const row = { id: e.id, who: String(e.who ?? ''), text: String(e.text ?? ''), time: String(e.time ?? '') };
      out = [row, ...(row.id != null ? out.filter((r) => r.id !== row.id) : out)];
    }
    return out.slice(0, this.items);
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
    return html`<div class="list" role="log" aria-live=${this.live === 'polite' ? 'polite' : 'off'}>${this._rows.map((r) => html`
      <div part="item"><div class="meta"><span part="who">${r.who}</span><span part="time">${r.time}</span></div><span part="text">${r.text}</span></div>`)}</div>`;
  }
}
define('cw-feed', CwFeed);
