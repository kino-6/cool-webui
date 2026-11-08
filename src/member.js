import { emit, resolveMotion, onReducedMotionChange } from './core.js';

/**
 * Mixin for value elements: takes pause state and motion from the nearest <cw-stage>,
 * or from its own `paused` / `motion` attributes when it stands alone.
 *
 * Subclasses buffer incoming values while `isPaused` and implement `flush()`, which
 * applies the buffer and returns how many updates it applied.
 */
/** The nearest <cw-stage> above el, crossing shadow-root boundaries. */
function findStage(el) {
  for (let n = el; n; n = n.getRootNode().host) {
    const s = n.closest('cw-stage');
    if (s) return s;
  }
  return null;
}

export const StageMember = (Base) => class extends Base {
  static properties = {
    paused: { type: Boolean, reflect: true },
    motion: { type: String },
  };

  connectedCallback() {
    super.connectedCallback();
    this.stage = findStage(this);
    if (this.stage) {
      this.stage.members.add(this);
      this._mo = new MutationObserver(() => this.requestUpdate());
      this._mo.observe(this.stage, { attributes: true, attributeFilter: ['data-motion'] });
    }
    this._offMedia = onReducedMotionChange(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stage?.members.delete(this);
    this._mo?.disconnect();
    this._offMedia();
  }

  /** calm / full / off: the stage's level, else this element's own `motion`. */
  get motionLevel() {
    return this.stage?.dataset.motion ?? resolveMotion(this.motion);
  }

  /** True while this element or its stage is paused. */
  get isPaused() {
    return !!this.paused || !!this.stage?.paused;
  }

  /** Stop this element alone. */
  pause() { this.paused = true; }

  /** Resume this element, applying what arrived while paused. */
  resume() { this.paused = false; }

  /** Called by the stage. Returns how many buffered updates were applied on resume. */
  stagePaused(on) {
    if (this.paused) return 0;
    this.onPauseChange?.(on);
    return on ? 0 : this.flush();
  }

  willUpdate(changed) {
    super.willUpdate?.(changed);
    this._resumed = undefined;
    if (!changed.has('paused') || (changed.get('paused') === undefined && !this.paused)) return;
    if (this.paused) this.onPauseChange?.(true);
    else if (this.stage?.paused) this._resumed = 0; // resumed by itself, still held by the stage
    else {
      this.onPauseChange?.(false);
      this._resumed = this.flush();
    }
  }

  updated(changed) {
    super.updated?.(changed);
    if (!changed.has('paused') || (changed.get('paused') === undefined && !this.paused)) return;
    if (this.paused) emit(this, 'cw-pause', {});
    else if (this._resumed !== undefined) emit(this, 'cw-resume', { applied: this._resumed });
  }

  /** Apply buffered updates; returns the count. Subclasses override. */
  flush() { return 0; }
};
