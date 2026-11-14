import { LitElement, html, css, nothing } from 'lit';
import { define } from './core.js';

/**
 * <cw-folio number title kicker>: a screen's number and name, the number huge. `kicker` is a small slab above
 * the title (a section name in other letters, say HOME). The number's size is `--cw-folio-size` (default 150px).
 * Read as a heading: "01 ホーム".
 */
export class CwFolio extends LitElement {
  static properties = {
    number: { type: String },
    title: { type: String },
    kicker: { type: String },
  };

  static styles = css`
    :host { display: flex; align-items: flex-end; gap: .12em; color: var(--cw-text, #ededed); font-size: var(--cw-folio-size, 150px); line-height: .8; }
    [part='number'] { font-family: var(--cw-display-font, var(--cw-font, system-ui, sans-serif)); font-weight: var(--cw-display-weight, 800);
      font-stretch: var(--cw-display-stretch, normal); letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
    [part='side'] { display: flex; flex-direction: column; align-items: flex-start; gap: .1em; padding-bottom: .04em; }
    [part='kicker'] { font: 600 .1em/1 var(--cw-display-font, var(--cw-font, system-ui, sans-serif)); letter-spacing: .12em; padding: .35em .7em;
      background: var(--cw-text, #ededed); color: var(--cw-ground-solid, #121212); transform: var(--cw-label-skew, none); }
    [part='title'] { font-family: var(--cw-display-font, var(--cw-font, system-ui, sans-serif)); font-weight: var(--cw-display-weight, 800);
      font-stretch: var(--cw-display-stretch, normal); font-size: .4em; line-height: 1; white-space: nowrap; }
  `;

  willUpdate() {
    this.setAttribute('role', 'heading');
    this.setAttribute('aria-level', '1');
    this.setAttribute('aria-label', [this.number, this.title].filter(Boolean).join(' '));
  }

  render() {
    return html`<span part="number" aria-hidden="true">${this.number ?? ''}</span>
      <span part="side" aria-hidden="true">${this.kicker ? html`<span part="kicker">${this.kicker}</span>` : nothing}<span part="title">${this.title ?? ''}</span></span>`;
  }
}
define('cw-folio', CwFolio);
