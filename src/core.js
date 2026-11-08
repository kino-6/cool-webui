/** Shared helpers for every cw- element. */

/**
 * Register a custom element unless the name is taken, so the npm and CDN builds can
 * both load on one page without throwing.
 */
export function define(name, cls) {
  if (!customElements.get(name)) customElements.define(name, cls);
}

/** Dispatch a cw- event that crosses shadow roots. */
export function emit(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
}

// Read the OS setting once and then only from change events: reading .matches in a frame loop lets
// Chrome take in the change silently, and then no change event reaches the other listeners.
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedQuery.matches;
const listeners = new Set();
reducedQuery.addEventListener('change', (e) => {
  reduced = e.matches;
  for (const fn of listeners) fn();
});

/** Resolve a motion attribute to calm / full / off. Reduced motion in the OS always wins. */
export function resolveMotion(value) {
  if (reduced) return 'off';
  return value === 'full' || value === 'off' ? value : 'calm';
}

/** Call fn whenever the OS reduced-motion setting changes; returns the unsubscribe. */
export function onReducedMotionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
