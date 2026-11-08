import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';

/** <cw-panel>: a themed frame with an optional label row; content goes into the default slot. */
export class CwPanel extends LitElement {
  static properties = {
    label: { type: String },
    sublabel: { type: String },
    on: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host { display: block; width: 100%; height: 100%; box-sizing: border-box; }
    [part='frame'] {
      box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; gap: 8px;
      padding: var(--cw-panel-padding, 16px); overflow: hidden;
      background: var(--cw-surface, #1d1d1d); color: var(--cw-text, #ededed);
      border: var(--cw-border, 1px solid rgba(255,255,255,.06)); border-radius: var(--cw-radius, 16px);
      backdrop-filter: var(--cw-blur, none); -webkit-backdrop-filter: var(--cw-blur, none);
      font-family: var(--cw-font, system-ui, sans-serif);
      rotate: var(--cw-tilt, none); box-shadow: var(--cw-shadow, none);
      transition: background-color 150ms, color 150ms;
    }
    /* the on face also hands its text colours to the elements slotted inside */
    :host([on]) [part='frame'] {
      background: var(--cw-surface-on, rgba(255,255,255,.85)); color: var(--cw-text-on, #121212);
      --cw-text: var(--cw-text-on, #121212);
      --cw-text-dim: color-mix(in srgb, var(--cw-text-on, #121212) 62%, transparent);
    }
    header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
    [part='label'] {
      font-size: 14px; font-weight: var(--cw-display-weight, 500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      padding: var(--cw-label-pad, 0); background: var(--cw-label-bg, none); color: var(--cw-label-color, inherit); transform: var(--cw-label-skew, none);
      font-family: var(--cw-display-font, inherit); font-stretch: var(--cw-display-stretch, normal);
    }
    /* on a lit panel the slab swaps colours so it does not melt into the panel; an empty label shows no slab */
    :host([on]) [part='label'] { background: var(--cw-label-on-bg, var(--cw-label-bg, none)); color: var(--cw-label-on-color, var(--cw-label-color, inherit)); }
    [part='label']:empty { padding: 0; background: none; }
    [part='sublabel'] { font-size: 13px; opacity: .7; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .body { flex: 1; min-height: 0; position: relative; }
  `;

  render() {
    const head = this.label || this.sublabel
      ? html`<header><span part="label">${this.label ?? ''}</span>${this.sublabel ? html`<span part="sublabel">${this.sublabel}</span>` : nothing}</header>`
      : nothing;
    return html`<div part="frame">${head}<div class="body"><slot></slot></div></div>`;
  }
}
define('cw-panel', CwPanel);
