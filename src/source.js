import { emit } from './core.js';

// what a notice may write, per element: the default prop for set, the props set may write, and whether push is allowed
const RULES = {
  'cw-stat': { set: ['value'], def: 'value', push: false },
  'cw-status': { set: ['state', 'since', 'text'], def: 'state', push: false },
  'cw-bars': { set: ['data'], def: 'data', push: false },
  'cw-chart': { set: ['data'], def: 'data', push: true },
  'cw-log': { set: [], push: true },
  'cw-feed': { set: [], push: true },
  'cw-ticker': { set: [], push: true },
  'cw-switch': { set: ['on', 'level', 'color', 'text'], def: 'on', push: false },
  'cw-camera': { set: ['src'], def: 'src', push: false },
  'cw-media': { set: ['now'], def: 'now', push: false },
  'cw-agenda': { set: ['events', 'now'], def: 'events', push: false },
  'cw-weather': { set: ['now', 'forecast'], def: 'now', push: false },
  'cw-dial': { set: ['value', 'target'], def: 'value', push: false },
  'cw-battery': { set: ['items'], def: 'items', push: false },
  'cw-vacuum': { set: ['now'], def: 'now', push: false },
  'cw-timer': { set: ['now'], def: 'now', push: false },
  'cw-cover': { set: ['now'], def: 'now', push: false },
  'cw-person': { set: ['people'], def: 'people', push: false },
  'cw-area': { set: ['now'], def: 'now', push: false },
  'cw-sky': { set: ['now'], def: 'now', push: false },
  'cw-alarm': { set: ['now'], def: 'now', push: false },
  'cw-todo': { set: ['items'], def: 'items', push: false },
  'cw-table': { set: ['data', 'columns'], def: 'data', push: false },
  'cw-trend': { set: ['value', 'data', 'previous'], def: 'value', push: true },
  'cw-floorplan': { set: ['rooms', 'people', 'items', 'focus'], def: 'rooms', push: false },
  'cw-flow': { set: ['nodes', 'links'], def: 'links', push: false },
  'cw-ring': { set: ['text'], def: 'text', push: false },
};
const KEEP_IDS = 500;
const MAX_WAIT = 30000;

/** The nearest <cw-stage> above el, crossing shadow roots. */
function stageOf(el) {
  for (let n = el; n; n = n.getRootNode().host) {
    const s = n.closest('cw-stage');
    if (s) return s;
  }
  return null;
}

/**
 * <cw-source>: receives JSON notices ({id?, to, op: set|push, prop?, value}, or an array of them) over
 * WebSocket, SSE, polling or postMessage, and applies them to cw- elements in the nearest stage.
 * Loaded separately (dist/cw-source.js), so pages that do not use it carry no networking code.
 */
export class CwSource extends HTMLElement {
  constructor() {
    super();
    this._ids = [];
    this._idSet = new Set();
    this._wait = 1000;
    this._onMessage = (e) => {
      const list = this.getAttribute('origin');
      const ok = list ? list.split(/\s+/).includes(e.origin) : e.origin === location.origin || e.source === window;
      if (!ok) return; // silently: do not answer probes from other origins
      this.handle(e.data);
    };
  }

  connectedCallback() {
    this.hidden = true;
    this._open();
  }

  disconnectedCallback() {
    this._close();
  }

  get kind() { return this.getAttribute('kind') || 'ws'; }

  _close() {
    this._closed = true;
    this._ws?.close();
    this._es?.close();
    clearTimeout(this._timer);
    removeEventListener('message', this._onMessage);
  }

  _open() {
    this._closed = false;
    const src = this.getAttribute('src');
    if (this.kind === 'message') { addEventListener('message', this._onMessage); return; }
    if (!src) return;
    if (this.kind === 'poll') { this._poll(src); return; }
    try {
      if (this.kind === 'sse') {
        this._es = new EventSource(src);
        this._es.onopen = () => this._up();
        this._es.onmessage = (e) => this.handle(e.data);
        this._es.onerror = () => { this._es.close(); this._down(); };
      } else {
        this._ws = new WebSocket(src);
        this._ws.onopen = () => this._up();
        this._ws.onmessage = (e) => this.handle(e.data);
        this._ws.onclose = () => this._down();
      }
    } catch {
      this._down();
    }
  }

  async _poll(src) {
    if (this._closed) return;
    const every = Math.max(1, Number(this.getAttribute('interval')) || 5) * 1000;
    try {
      const url = new URL(src, location.href);
      if (this._ids.length) url.searchParams.set('after', String(this._ids.at(-1)));
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      this._up();
      this.handle(await res.text());
      this._timer = setTimeout(() => this._poll(src), every);
    } catch {
      this._down(() => this._poll(src));
    }
  }

  _linkHolder() { return stageOf(this) ?? this; }

  _up() {
    this._wait = 1000;
    this._linkHolder().removeAttribute('data-link');
  }

  _down(retry = () => this._open()) {
    if (this._closed) return;
    this._linkHolder().setAttribute('data-link', 'down');
    clearTimeout(this._timer);
    this._timer = setTimeout(retry, this._wait);
    this._wait = Math.min(MAX_WAIT, this._wait * 2);
  }

  _error(code, message, raw) {
    console.warn(`cw-source ${code}: ${message}`);
    emit(this, 'cw-source-error', { code, message, raw });
  }

  /** Apply one received payload: a JSON string or an already-parsed notice or array of notices. */
  handle(payload) {
    let data = payload;
    if (typeof payload === 'string') {
      try { data = JSON.parse(payload); } catch { this._error('bad-json', 'not one JSON value', payload); return; }
    }
    for (const n of Array.isArray(data) ? data : [data]) this._apply(n);
  }

  _apply(n) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) { this._error('bad-json', 'a notice must be an object', n); return; }
    if (n.id != null) {
      if (this._idSet.has(n.id)) return;
      this._ids.push(n.id);
      this._idSet.add(n.id);
      if (this._ids.length > KEEP_IDS) this._idSet.delete(this._ids.shift());
    }
    if (n.op !== 'set' && n.op !== 'push') { this._error('bad-op', `unknown op ${n.op}`, n); return; }
    const scope = stageOf(this) ?? document;
    let targets = [];
    try { targets = typeof n.to === 'string' ? [...scope.querySelectorAll(n.to)] : []; } catch { /* bad selector: no target */ }
    if (!targets.length) { this._error('no-target', `nothing matches ${n.to}`, n); return; }
    for (const el of targets) {
      const rule = RULES[el.localName];
      if (!rule) { this._error('bad-prop', `${el.localName} takes no notices`, n); continue; }
      if (n.op === 'push') {
        if (!rule.push || n.prop != null) { this._error('bad-op', `${el.localName} does not take push`, n); continue; }
        el.push(n.value);
        continue;
      }
      if (!rule.set.length) { this._error('bad-op', `${el.localName} takes push only`, n); continue; }
      const prop = n.prop ?? rule.def;
      if (!rule.set.includes(prop)) { this._error('bad-prop', `${el.localName} has no value ${prop}`, n); continue; }
      el[prop] = n.value;
    }
  }
}
if (!customElements.get('cw-source')) customElements.define('cw-source', CwSource);
