/**
 * cw-ha-card: a Home Assistant custom card built from cw- elements.
 *
 *   type: custom:cw-ha-card
 *   title: 居間
 *   look: tile          # tile (default), glass, game, mocha, latte (light), dracula, nord, hud, crt, pixel, brutal (light) or synthwave
 *   motion: calm        # calm (default), full or off
 *   entities:
 *     - { entity: sensor.living_temp, kind: stat, label: 室温 }
 *     - { entity: lock.front_door, kind: status, label: 玄関 }
 *     - { entity: sensor.power, kind: bars, attributes: [living, kitchen] }
 *     - { entity: light.living, kind: switch, label: 天井 }   # press toggles; a light with brightness gets a slider
 *     - { entity: camera.garden, kind: camera, refresh: 10, height: 200 }   # shows the entity's picture
 *     - { entity: media_player.living, kind: media }   # what plays, with play/pause, next, previous and volume
 *     - { entity: calendar.family, kind: agenda, days: 3 }   # asks the calendar every 5 minutes
 *     - { entity: weather.home, kind: weather, days: 5 }     # the forecast comes by subscription
 *     - { entity: climate.living, kind: dial }               # a thermostat; a sensor gives a plain dial
 *     - { kind: battery, low: 20 }                           # every battery, emptiest first (or list them in entities)
 *     - { entity: vacuum.robot, kind: vacuum, battery: sensor.robot_battery }   # state and buttons; area / duration sensors too
 *     - { entity: timer.laundry, kind: timer }               # or a sensor whose state is an end time; duration: minutes for its bar
 *     - { entity: cover.living, kind: cover }                # open / stop / close and a position slider, as the cover supports
 *     - { kind: person }                                     # who is where, home first (or list them in entities)
 *     - { kind: area, area: living_room }                    # one room: temperature, humidity, lights on, motion
 *     - { kind: sky, moon: sensor.moon_phase }               # sunrise and sunset from sun.sun, the moon's phase
 *     - { entity: alarm_control_panel.home, kind: alarm }     # an alarm panel with a keypad when it has a code
 *     - { entity: todo.shopping, kind: todo, done: true }      # a to-do list by subscription; ticking calls todo.update_item
 *     - kind: floorplan     # rooms are lights; tapping a room toggles it
 *       rooms: [{ entity: light.living, name: 居間, x: 0, y: 0, w: 6, h: 4.5, temperature: sensor.living_temp }]
 *       people: [{ entity: person.aoi, name: アオイ, room: light.living }]
 *     - kind: flow          # a negative link value runs the other way
 *       nodes: [{ id: solar, name: 太陽光, entity: sensor.solar_power, x: 0.5, y: 0.2 }, { id: home, name: 家, entity: sensor.home_power, x: 0.5, y: 0.8 }]
 *       links: [{ from: solar, to: home, entity: sensor.solar_to_home }]
 */
import '../src/index.js';
import { resolveMotion } from '../src/core.js';
import tile from '../themes/tile.css';
import glass from '../themes/glass.css';
import game from '../themes/game.css';
import mocha from '../themes/mocha.css';
import latte from '../themes/latte.css';
import dracula from '../themes/dracula.css';
import nord from '../themes/nord.css';
import hud from '../themes/hud.css';
import crt from '../themes/crt.css';
import pixel from '../themes/pixel.css';
import brutal from '../themes/brutal.css';
import synthwave from '../themes/synthwave.css';

const KINDS = ['stat', 'status', 'bars', 'switch', 'camera', 'media', 'agenda', 'weather', 'dial', 'battery', 'vacuum', 'timer', 'cover', 'person', 'area', 'sky', 'alarm', 'todo', 'floorplan', 'flow'];
const DRAWN = ['floorplan', 'flow'];
// rows that read many entities rather than one
const MANY = [...DRAWN, 'battery', 'person', 'area', 'sky'];
const MOTIONS = ['calm', 'full', 'off'];
const MEDIA_SERVICE = { play: 'media_play', pause: 'media_pause', next: 'media_next_track', previous: 'media_previous_track' };
const STANDBY = ['off', 'not_home', 'closed', 'idle', 'paused'];
const ALERT = ['unlocked', 'jammed', 'problem'];
/** Home Assistant state words shown in Japanese; other words fall back to the lamp's state name. */
const WORDS = {
  on: 'オン', off: 'オフ', home: '在宅', not_home: '外出', open: '開', closed: '閉',
  playing: '再生中', paused: '一時停止', idle: '待機', locked: '施錠', unlocked: '解錠', jammed: '故障', problem: '異常',
};
/** Approximate height of one row in Home Assistant's 50px card units. */
const UNITS = { stat: 1.7, status: 0.6, bar: 0.5, switch: 1.3, media: 2.6, agenda: 4.2, weather: 4, dial: 4.2, battery: 4.2, vacuum: 3, timer: 2, cover: 2.8, person: 3.5, area: 2.6, sky: 3.6, alarm: 5.5, todo: 4.2 };
const CALENDAR_EVERY = 300e3;
const KMH = { 'km/h': 1 / 3.6, mph: 0.44704, kn: 0.514444, 'm/s': 1, 'ft/s': 0.3048 };
// a Beaufort number is shown as the middle of its band in m/s
const BEAUFORT = [0, 0.9, 2.4, 4.4, 6.7, 9.3, 12.3, 15.5, 18.9, 22.6, 26.4, 30.5, 32.7];
// weather supported_features: the forecast kinds, in the order the Home Assistant card editor picks them
const FORECASTS = [[1, 'daily'], [4, 'twice_daily'], [2, 'hourly']];
// media_player supported_features bits
const MEDIA_BITS = { pause: 1, volume: 4, previous: 16, next: 32, play: 16384 };
// vacuum supported_features bits (the battery is a sensor of its own now, not a feature)
const VACUUM_BITS = { pause: 4, stop: 8, return: 16, start: 8192 };
// alarm panel supported_features bits for each way of arming
const ALARM_BITS = { home: 1, away: 2, night: 4, custom_bypass: 16, vacation: 32 };
// cover supported_features bits, and the same four for the tilt
const COVER_BITS = { open: 1, close: 2, position: 4, stop: 8 };
const TILT_BITS = { open: 16, close: 32, stop: 64, position: 128 };
const isTiltOnly = (bits) => Number.isFinite(bits) && !(bits & 3) && (bits & 48) !== 0;
// the events of rows whose face changes at once when pressed
const PRESSES = { alarm: ['cw-alarm'], area: ['cw-lights'], vacuum: ['cw-vacuum'], cover: ['cw-cover', 'cw-position'], switch: ['cw-toggle', 'cw-level'], media: ['cw-media', 'cw-volume'] };
// the moon integration's phases
const PHASE_WORDS = ['new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
const VACUUM_SERVICE = { start: 'start', pause: 'pause', stop: 'stop', return: 'return_to_base' };
/** Seconds in Home Assistant's H:MM:SS (a timer's duration and remaining). */
const hms = (v) => { const m = /^(?:(\d+) days?, )?(-?\d+):(\d{2}):(\d{2})/.exec(v ?? ''); return m ? (+(m[1] ?? 0) * 24 + +m[2]) * 3600 + +m[3] * 60 + +m[4] : NaN; };
/** A date and time as Home Assistant writes one (2026-11-03T10:00:00+09:00), not just any number Date.parse would take. */
const stamp = (v) => (/^\d{4}-\d{2}-\d{2}[T ]\d/.test(v ?? '') ? Date.parse(v) : NaN);
const DRAWN_HEIGHT = 320;
const CAMERA_HEIGHT = 200;
const LAMP = '#ffb35c'; // a light with no colour attribute glows warm white
const THEMES = { tile, glass, game, mocha, latte, dracula, nord, hud, crt, pixel, brutal, synthwave };

/** Turn a theme file's :root block into rules for the card's shadow root (drop the font @import). */
function themeCss(text) {
  return text.replace(/@import\s+url\([^)]*\)[^;]*;/g, '').replace(':root', ':host');
}

/** Fonts do not load from inside a shadow root, so add the theme's font link to the page once. */
function loadFonts(text) {
  const url = /@import\s+url\('([^']+)'\)/.exec(text)?.[1];
  if (!url || document.head.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.append(link);
}

export class CwHaCard extends HTMLElement {
  /** Validate and keep the card config; Home Assistant shows a thrown error in the card editor. */
  setConfig(config) {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) throw new Error('entities is required (a non-empty list)');
    if (config.look && !Object.hasOwn(THEMES, config.look)) throw new Error(`look must be one of ${Object.keys(THEMES).join(', ')}, not ${config.look}`);
    if (config.motion && !MOTIONS.includes(config.motion)) throw new Error(`motion must be one of ${MOTIONS.join(', ')}, not ${config.motion}`);
    for (const [i, row] of config.entities.entries()) {
      if (!KINDS.includes(row?.kind)) throw new Error(`entities[${i}].kind must be one of ${KINDS.join(', ')}`);
      if (!MANY.includes(row.kind) && typeof row.entity !== 'string') throw new Error(`entities[${i}].entity is required`);
      if (row.kind === 'area' && typeof row.area !== 'string') throw new Error(`entities[${i}].area is required (the area id)`);
      if (['battery', 'person'].includes(row.kind) && row.entities != null && !(Array.isArray(row.entities) && row.entities.every((e) => typeof e === 'string'))) throw new Error(`entities[${i}].entities must be a list of entity ids`);
      const grid = (r) => typeof r?.entity === 'string' && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(r[k]));
      if (row.kind === 'floorplan' && (!Array.isArray(row.rooms) || row.rooms.length === 0 || !row.rooms.every(grid))) throw new Error(`entities[${i}].rooms needs entity, x, y, w and h on every room`);
      if (row.kind === 'flow' && (!Array.isArray(row.nodes) || row.nodes.length === 0 || !row.nodes.every((n) => n?.id != null))) throw new Error(`entities[${i}].nodes needs an id on every node`);
      if (row.kind === 'flow' && !(row.links ?? []).every((l) => l?.from != null && l?.to != null && typeof l?.entity === 'string')) throw new Error(`entities[${i}].links needs from, to and entity on every link`);
      if (row.kind === 'bars' && (!Array.isArray(row.attributes) || row.attributes.length === 0)) throw new Error(`entities[${i}].attributes is required for bars`);
    }
    this._config = config;
    this._last = new Map();
    this._levels = new Map();
    this._asked = new Map();
    this._days = new Map();
    this._timerEnd = new Map();
    this._held = new Map();
    this._finished = new Set();
    this._unsubscribe();
    this._build();
  }

  /** Height in 50px units: the title line plus each row by its kind (bars count their bars). */
  getCardSize() {
    const rows = this._config?.entities ?? [];
    const size = (r) => (r.kind === 'bars' ? r.attributes.length * UNITS.bar : r.kind === 'camera' ? (r.height ?? CAMERA_HEIGHT) / 50
      : DRAWN.includes(r.kind) ? (r.height ?? DRAWN_HEIGHT) / 50 : UNITS[r.kind]);
    return Math.ceil(1 + rows.reduce((n, r) => n + size(r), 0));
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._els) return;
    this._config.entities.forEach((row, i) => {
      if (row.kind === 'floorplan') this._plan(row, this._els[i], hass.states ?? {});
      else if (row.kind === 'flow') this._flow(row, this._els[i], hass.states ?? {});
      else if (row.kind === 'battery') this._batteries(row, this._els[i], hass.states ?? {});
      else if (row.kind === 'person') this._people(row, this._els[i], hass.states ?? {});
      else if (row.kind === 'area') this._area(row, this._els[i], hass);
      else if (row.kind === 'sky') this._sky(row, this._els[i], hass.states ?? {});
      else this._apply(row, this._els[i], hass.states?.[row.entity]);
      if (row.kind === 'agenda') this._calendar(row, this._els[i]);
      if (row.kind === 'weather') this._forecast(row, this._els[i]);
      if (row.kind === 'todo') this._todo(row, this._els[i]);
    });
  }

  disconnectedCallback() {
    clearInterval(this._focusTimer);
    this._unsubscribe();
  }

  _unsubscribe() {
    for (const sub of this._subs?.values() ?? []) sub.off.then((f) => f?.());
    this._subs = new Map();
  }

  // the calendar is not in the states: ask the API for the days shown, at most every 5 minutes
  _calendar(row, el) {
    const now = Date.now();
    if (!this._hass?.callApi || now - (this._asked.get(el) ?? -Infinity) < CALENDAR_EVERY) return;
    this._asked.set(el, now);
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + (row.days ?? 7) * 864e5);
    const when = (t) => (t?.dateTime ? Date.parse(t.dateTime) : t?.date ? new Date(...t.date.split('-').map((n, i) => (i === 1 ? n - 1 : +n))).getTime() : NaN);
    this._hass.callApi('GET', `calendars/${row.entity}?start=${encodeURIComponent(from.toISOString())}&end=${encodeURIComponent(to.toISOString())}`)
      .then((list) => { el.events = (list ?? []).map((e) => ({ title: e.summary ?? '', start: when(e.start), end: when(e.end), allDay: !e.start?.dateTime, where: e.location || undefined })); })
      .catch(() => this._asked.delete(el));
  }

  /** Year, month, day and hour of a time in Home Assistant's time zone (the browser's when it does not say). */
  _clock(t) {
    const tz = this._hass?.config?.time_zone;
    let f = this._fmt;
    if (!f || f.tz !== tz) {
      try { f = { tz, fmt: new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }) }; }
      catch { f = { tz, fmt: new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }) }; }
      this._fmt = f;
    }
    const p = Object.fromEntries(f.fmt.formatToParts(t).map((x) => [x.type, Number(x.value)]));
    return { day: `${p.year}-${p.month}-${p.day}`, at: new Date(p.year, p.month - 1, p.day).getTime(), hour: p.hour };
  }

  // the forecast is not in the states either: subscribe per row while the card is on the page.
  // Not every weather service has a daily forecast: take twice-daily or hourly then, and fold it into days.
  // The kind follows supported_features, so a change there (or the entity turning up late) subscribes again.
  _forecast(row, el) {
    const s = this._hass?.states?.[row.entity];
    if (!s || !this._hass.connection?.subscribeMessage) return;
    const bits = s.attributes?.supported_features ?? 1;
    const type = (FORECASTS.find(([bit]) => bits & bit) ?? FORECASTS[0])[1];
    if (this._subs.get(el)?.type === type) return;
    this._subs.get(el)?.off.then((f) => f?.());
    // a forecast still on its way from the subscription this one replaces is dropped
    const sub = { type };
    this._subs.set(el, sub);
    sub.off = this._hass.connection.subscribeMessage((m) => {
      if (this._subs.get(el) !== sub) return;
      const byDay = new Map(), num = (v) => (Number.isFinite(v) ? v : NaN);
      for (const f of m?.forecast ?? []) {
        const t = new Date(f.datetime);
        if (Number.isNaN(t.getTime())) continue;
        const c = this._clock(t);
        const d = byDay.get(c.day) ?? byDay.set(c.day, { day: c.day, time: c.at, highs: [], lows: [], rains: [], score: Infinity }).get(c.day);
        // a daily entry is the day; otherwise the day's picture and high come from the daytime, the picture nearest noon
        const daytime = type === 'daily' || (f.is_daytime ?? (c.hour >= 6 && c.hour < 18));
        const score = !daytime ? 99 : type === 'hourly' ? Math.abs(c.hour - 12) : 0;
        if (score < d.score) { d.condition = f.condition; d.score = score; }
        if (daytime) d.highs.push(num(f.temperature));
        // the low is templow, else the night (twice-daily) or every hour (hourly); a daily entry without templow has none
        d.lows.push(num(f.templow ?? (type === 'hourly' || !daytime ? f.temperature : NaN)));
        d.rains.push(num(f.precipitation_probability));
      }
      const most = (list, pick) => { const v = list.filter(Number.isFinite); return v.length ? pick(...v) : undefined; };
      const days = [...byDay.values()].map((d) => ({ day: d.day, time: d.time, condition: d.condition, high: most(d.highs, Math.max), low: most(d.lows, Math.min), rain: most(d.rains, Math.max) }));
      this._days.set(el, days);
      el.forecast = days.map(({ day, ...rest }) => rest);
      if (this._hass) this._apply(row, el, this._hass.states?.[row.entity], true);
    }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: row.entity }).catch(() => undefined);
  }

  // the listed entities, or every battery Home Assistant knows: a sensor gives a percent, a binary sensor says low (on)
  _batteries(row, el, states) {
    const ids = row.entities ?? Object.keys(states).filter((id) => states[id]?.attributes?.device_class === 'battery' && /^(sensor|binary_sensor)\./.test(id));
    const items = ids.map((id) => {
      const s = states[id], a = s?.attributes ?? {};
      const name = a.friendly_name ?? id;
      // a binary sensor says low (on) or fine (off); anything else is not known
      if (id.startsWith('binary_sensor.')) return { name, ...(s?.state === 'on' ? { low: true } : s?.state === 'off' ? { low: false } : {}) };
      // only a percent is a level: a voltage or an empty state is not
      const pct = a.unit_of_measurement === undefined || a.unit_of_measurement === '%';
      return { name, level: s && pct && s.state !== '' ? Number(s.state) : NaN };
    });
    const key = JSON.stringify(items);
    if (this._last.get(el) === key) return;
    this._last.set(el, key);
    el.items = items;
  }

  // the listed people, or every person entity: place is home, not_home or a zone; the photo goes through hassUrl
  _people(row, el, states) {
    const ids = row.entities ?? Object.keys(states).filter((id) => id.startsWith('person.'));
    const people = ids.map((id) => {
      const s = states[id], a = s?.attributes ?? {}, missing = !s || ['unavailable', 'unknown'].includes(s.state);
      const pic = a.entity_picture ? this._hass?.hassUrl?.(a.entity_picture) ?? a.entity_picture : '';
      return { name: a.friendly_name ?? id, place: missing ? '' : s.state, since: missing ? NaN : s.last_changed, picture: pic };
    });
    const key = JSON.stringify(people);
    if (this._last.get(el) === key) return;
    this._last.set(el, key);
    el.people = people;
  }

  // one area from Home Assistant's registries: its temperature and humidity sensors, and the lights and motion sensors
  // put in it (an entity's own area, else its device's)
  _areaMembers(row, hass) {
    const area = hass.areas?.[row.area], where = (e) => e.area_id ?? hass.devices?.[e.device_id]?.area_id;
    // not hidden ones, and not a device's own config or diagnostic entities (a status LED is not a room light)
    const ids = Object.values(hass.entities ?? {}).filter((e) => where(e) === row.area && !e.hidden && !e.entity_category).map((e) => e.entity_id);
    const states = hass.states ?? {}, usable = (id) => states[id] && !['unavailable', 'unknown'].includes(states[id].state);
    // a light group whose members are in the room is those members again
    const isGroupOf = (id) => (states[id]?.attributes?.entity_id ?? []).some?.((m) => ids.includes(m));
    return {
      area, lights: ids.filter((id) => id.startsWith('light.') && usable(id) && !isGroupOf(id)),
      motion: ids.filter((id) => id.startsWith('binary_sensor.') && ['motion', 'occupancy', 'presence'].includes(states[id]?.attributes?.device_class)),
    };
  }

  _area(row, el, hass) {
    const { area, lights, motion } = this._areaMembers(row, hass), states = hass.states ?? {};
    const read = (id) => (id && states[id] && !['unavailable', 'unknown'].includes(states[id].state) ? Number(states[id].state) : NaN);
    const known = motion.filter((id) => ['on', 'off'].includes(states[id]?.state));
    const now = { temperature: read(area?.temperature_entity_id), humidity: read(area?.humidity_entity_id), lights: lights.length,
      lightsOn: lights.filter((id) => states[id]?.state === 'on').length, motion: known.length ? known.some((id) => states[id].state === 'on') : undefined };
    const key = JSON.stringify([now, area?.name]);
    if (this._last.get(el) === key) return;
    this._last.set(el, key);
    el.now = now;
    if (!row.label) el.label = area?.name ?? row.area;
  }

  // sun.sun only knows the next sunrise and sunset: in the day the next sunrise is tomorrow's, so today's is a day before
  // a sunrise or sunset more than a day away (midnight sun, polar night) is left out; the sun's state then says day or night.
  // Today's sunrise is the next one at the same clock time a day earlier, so a daylight-saving change does not shift it
  _sky(row, el, states) {
    const sun = states[row.entity ?? 'sun.sun'], a = sun?.attributes ?? {}, t = Date.now();
    const near = (v) => (Number.isFinite(v) && v - t <= 26 * 3600e3 ? v : NaN);
    const nextRise = near(stamp(a.next_rising)), nextSet = near(stamp(a.next_setting));
    const before = (v) => { const d = new Date(v); d.setDate(d.getDate() - 1); return d.getTime(); };
    const moon = row.moon ? states[row.moon]?.state : undefined;
    const now = { rise: nextSet < nextRise ? before(nextRise) : nextRise, set: nextSet, phase: moon && PHASE_WORDS.includes(moon) ? moon : '',
      up: sun ? sun.state === 'above_horizon' : undefined, south: Number(this._hass?.config?.latitude) < 0 };
    const key = JSON.stringify(now);
    if (this._last.get(el) === key) return;
    this._last.set(el, key);
    el.now = now;
  }

  // to-do items are not in the states: subscribe once per row while the card is on the page
  _todo(row, el) {
    if (this._subs.has(el) || !this._hass?.connection?.subscribeMessage) return;
    const sub = { type: 'todo' };
    this._subs.set(el, sub);
    sub.off = this._hass.connection.subscribeMessage((m) => {
      if (this._subs.get(el) === sub) el.items = m?.items ?? [];
    }, { type: 'todo/item/subscribe', entity_id: row.entity }).catch(() => undefined);
  }

  _plan(row, el, states) {
    const rooms = row.rooms.map((r) => {
      const s = states[r.entity], a = s?.attributes ?? {};
      const t = Number(states[r.temperature]?.state);
      const color = Array.isArray(a.rgb_color) ? `rgb(${a.rgb_color.join(',')})` : Array.isArray(a.hs_color) ? `hsl(${a.hs_color[0]} ${a.hs_color[1]}% 62%)` : LAMP;
      return { id: r.entity, name: r.name ?? a.friendly_name ?? r.entity, x: r.x, y: r.y, w: r.w, h: r.h, on: s?.state === 'on', color,
        level: Number.isFinite(a.brightness) ? a.brightness / 255 : 1, note: r.temperature && Number.isFinite(t) ? `${t.toFixed(1)}°` : '' };
    });
    const people = (row.people ?? []).map((p) => ({ name: p.name ?? states[p.entity]?.attributes?.friendly_name ?? '', color: p.color, room: states[p.entity]?.state === 'home' ? p.room ?? null : null }));
    const key = JSON.stringify([rooms, people]);
    if (this._last.get(el) === key) return;
    this._last.set(el, key);
    el.rooms = rooms;
    el.people = people;
    this._lit = rooms.filter((r) => r.on).map((r) => r.id);
    if (!this._lit.includes(el.focus)) el.focus = resolveMotion(this._config.motion) === 'full' ? this._lit[0] ?? '' : '';
  }

  _flow(row, el, states) {
    const num = (id) => { const v = Number(states[id]?.state); return Number.isFinite(v) ? v : NaN; };
    const nodes = row.nodes.map((n) => ({ id: String(n.id), label: n.name ?? '', x: n.x ?? 0.5, y: n.y ?? 0.5, color: n.color, icon: n.icon,
      value: n.entity ? num(n.entity) : undefined, unit: n.unit ?? states[n.entity]?.attributes?.unit_of_measurement }));
    const links = (row.links ?? []).map((l) => {
      const v = num(l.entity) || 0;
      return v < 0 ? { from: String(l.to), to: String(l.from), value: -v } : { from: String(l.from), to: String(l.to), value: v };
    });
    const key = JSON.stringify([nodes, links]);
    if (this._last.get(el) === key) return;
    this._last.set(el, key);
    el.nodes = nodes;
    el.links = links;
  }

  _build() {
    const c = this._config;
    const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    root.textContent = '';
    const theme = THEMES[c.look ?? 'tile'];
    loadFonts(theme);
    const style = document.createElement('style');
    style.textContent = themeCss(theme) + `
      :host { display: block; }
      cw-panel { height: auto; }
      .rows { display: flex; flex-direction: column; gap: 14px; }
      cw-stat { height: 72px; }`;
    const drawnHeight = (row) => `${Math.max(120, Number(row.height) || DRAWN_HEIGHT)}px`;
    const panel = document.createElement('cw-panel');
    if (c.title) panel.label = c.title;
    const rows = document.createElement('div');
    rows.className = 'rows';
    this._els = c.entities.map((row) => {
      const el = document.createElement('cw-' + row.kind);
      if (row.label) el.label = row.label;
      if (row.unit) el.unit = row.unit;
      if (row.digits != null) el.digits = row.digits;
      if (c.motion) el.motion = c.motion;
      if (DRAWN.includes(row.kind)) el.style.height = drawnHeight(row);
      if (row.kind === 'camera') {
        el.style.height = `${Math.max(80, Number(row.height) || CAMERA_HEIGHT)}px`;
        if (row.refresh != null) el.refresh = row.refresh;
      }
      if (row.kind === 'floorplan') {
        el.items = row.items ?? [];
        el.addEventListener('cw-room', (e) => this._hass?.callService('light', 'toggle', { entity_id: e.detail.id }));
      }
      if (row.kind === 'agenda') {
        el.style.height = '200px';
        if (row.days != null) el.days = row.days;
        if (row.max != null) el.max = row.max;
      }
      if (row.kind === 'vacuum') {
        el.addEventListener('cw-vacuum', (e) => this._hass?.callService('vacuum', VACUUM_SERVICE[e.detail.action], { entity_id: row.entity }));
      }
      if (row.kind === 'cover') {
        // a cover that only tilts gets the same buttons and slider, for its tilt
        const tilt = () => isTiltOnly(this._hass?.states?.[row.entity]?.attributes?.supported_features);
        el.addEventListener('cw-cover', (e) => this._hass?.callService('cover', `${e.detail.action}_cover${tilt() ? '_tilt' : ''}`, { entity_id: row.entity }));
        el.addEventListener('cw-position', (e) => this._hass?.callService('cover', tilt() ? 'set_cover_tilt_position' : 'set_cover_position',
          { entity_id: row.entity, [tilt() ? 'tilt_position' : 'position']: e.detail.position }));
      }
      if (row.kind === 'area') {
        el.addEventListener('cw-lights', (e) => {
          const { lights } = this._areaMembers(row, this._hass ?? {});
          if (lights.length) this._hass?.callService('light', e.detail.on ? 'turn_on' : 'turn_off', { entity_id: lights });
        });
      }
      if (row.kind === 'alarm') {
        // the code goes to Home Assistant with the call and nowhere else
        el.addEventListener('cw-alarm', (e) => this._hass?.callService('alarm_control_panel', `alarm_${e.detail.action}`, { entity_id: row.entity, ...(e.detail.code && { code: e.detail.code }) }));
      }
      if (row.kind === 'todo') {
        el.style.height = 'auto';
        for (const k of ['max', 'done']) if (row[k] != null) el[k] = row[k];
        // the item is found by its uid, or by its words when the list gives none
        el.addEventListener('cw-todo', (e) => this._hass?.callService('todo', 'update_item', { entity_id: row.entity, item: e.detail.uid ?? e.detail.summary, status: e.detail.status }));
      }
      if (row.kind === 'battery') {
        for (const k of ['low', 'max']) if (row[k] != null) el[k] = row[k];
      }
      if (row.kind === 'weather') {
        el.style.height = '190px';
        if (row.days != null) el.days = row.days;
      }
      if (row.kind === 'dial') {
        el.style.height = '200px';
        for (const k of ['min', 'max', 'step', 'digits']) if (row[k] != null) el[k] = row[k];
        el.addEventListener('cw-target', (e) => this._hass?.callService('climate', 'set_temperature', { entity_id: row.entity, temperature: e.detail.target }));
      }
      if (row.kind === 'media') {
        el.style.height = '120px';
        el.addEventListener('cw-media', (e) => this._hass?.callService('media_player', MEDIA_SERVICE[e.detail.action], { entity_id: row.entity }));
        el.addEventListener('cw-volume', (e) => this._hass?.callService('media_player', 'volume_set', { entity_id: row.entity, volume_level: e.detail.volume }));
      }
      if (row.kind === 'switch') {
        el.addEventListener('cw-toggle', () => this._hass?.callService('homeassistant', 'toggle', { entity_id: row.entity }));
        el.addEventListener('cw-level', (e) => {
          const pct = Math.round(e.detail.level * 100);
          this._hass?.callService('light', pct > 0 ? 'turn_on' : 'turn_off', { entity_id: row.entity, ...(pct > 0 && { brightness_pct: pct }) });
        });
      }
      // a press changes the face at once; if Home Assistant still says otherwise 3 s later, show what it says
      for (const name of PRESSES[row.kind] ?? []) {
        el.addEventListener(name, () => {
          clearTimeout(this._held.get(el));
          this._held.set(el, setTimeout(() => { this._last.delete(el); if (this._hass) this.hass = this._hass; }, 3000));
        });
      }
      rows.append(el);
      return el;
    });
    panel.append(rows);
    root.append(style, panel);
    // in full motion the floor plan's outline moves to the next lit room every 7 seconds
    clearInterval(this._focusTimer);
    const plan = this._els.find((e) => e.localName === 'cw-floorplan');
    if (plan) {
      this._focusTimer = setInterval(() => {
        if (resolveMotion(c.motion) !== 'full' || !this._lit?.length || plan.paused) return;
        plan.focus = this._lit[(this._lit.indexOf(plan.focus) + 1) % this._lit.length];
      }, 7000);
    }
    if (this._hass) this.hass = this._hass;
  }

  /** The temperature unit Home Assistant is set to, for entities that do not say. */
  _tempUnit() { return this._hass?.config?.unit_system?.temperature ?? '°C'; }

  _apply(row, el, s, force = false) {
    const missing = !s || s.state === 'unavailable' || s.state === 'unknown';
    let key, val;
    if (row.kind === 'stat') {
      val = missing ? NaN : Number(s.state);
      key = String(val);
      if (!row.unit && s?.attributes?.unit_of_measurement) el.unit = s.attributes.unit_of_measurement;
      if (this._last.get(el) !== key) el.value = val;
    } else if (row.kind === 'switch') {
      // a light that can dim lists brightness even when off (as null); keep the last level then, so the slider stays put
      const a = missing ? {} : s.attributes ?? {}, dims = Object.hasOwn(a, 'brightness');
      const level = !dims ? NaN : Number.isFinite(a.brightness) ? a.brightness / 255 : (this._levels.get(el) ?? 0);
      if (dims) this._levels.set(el, level);
      const color = Array.isArray(a.rgb_color) ? `rgb(${a.rgb_color.join(', ')})` : '';
      key = JSON.stringify([missing, s?.state, level, color, a.friendly_name]);
      if (this._last.get(el) !== key) {
        el.on = !missing && s.state === 'on';
        el.level = level;
        el.color = color;
        el.text = missing ? '不明' : '';
        if (!row.label) el.label = a.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'agenda') {
      key = '';
    } else if (row.kind === 'weather') {
      const a = missing ? {} : s.attributes ?? {}, today = this._days.get(el)?.find((d) => d.day === this._clock(new Date()).day);
      const unit = a.wind_speed_unit ?? 'km/h';
      const wind = !Number.isFinite(a.wind_speed) ? undefined : unit === 'Beaufort' ? BEAUFORT[Math.min(12, Math.max(0, Math.round(a.wind_speed)))]
        : Object.hasOwn(KMH, unit) ? a.wind_speed * KMH[unit] : undefined;
      if (!row.unit) el.unit = a.temperature_unit ?? this._tempUnit();
      const now = { condition: missing ? undefined : s.state, temp: a.temperature, humidity: a.humidity, wind, high: today?.high, low: today?.low };
      key = JSON.stringify(now);
      if (force || this._last.get(el) !== key) el.now = now;
    } else if (row.kind === 'dial') {
      const a = missing ? {} : s.attributes ?? {}, climate = row.entity.startsWith('climate.');
      key = JSON.stringify([missing, s?.state, climate && [a.current_temperature, a.temperature, a.min_temp, a.max_temp, a.target_temp_step, a.temperature_unit ?? this._tempUnit()], a.unit_of_measurement, a.friendly_name]);
      if (this._last.get(el) !== key) {
        el.value = missing ? NaN : climate ? a.current_temperature : s.state;
        el.target = climate && !missing ? a.temperature : NaN;
        // a climate entity has no unit_of_measurement; without target_temp_step the step is 1 in °F and 0.5 otherwise
        const unit = climate ? a.temperature_unit ?? this._tempUnit() : a.unit_of_measurement ?? '';
        if (climate) for (const [k, v] of [['min', a.min_temp], ['max', a.max_temp], ['step', a.target_temp_step ?? (unit === '°F' ? 1 : 0.5)]]) if (row[k] == null && Number.isFinite(v)) el[k] = v;
        if (climate && row.digits == null) el.digits = 1;
        el.unit = row.unit ?? unit;
        el.label = row.label ?? a.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'media') {
      // HA measures the position now and then; count on from when it did
      const a = missing ? {} : s.attributes ?? {}, num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : NaN);
      // buffering is on its way to playing; on is switched on with nothing playing yet, which Home Assistant offers to play
      const state = missing || s.state === 'off' ? 'off' : s.state === 'buffering' ? 'playing' : s.state === 'on' ? 'paused' : ['playing', 'paused'].includes(s.state) ? s.state : 'idle';
      // the local picture is the one the browser can reach when the player's own address is not
      const pic = a.entity_picture_local || a.entity_picture;
      // no supported_features: show every button rather than none
      const bits = a.supported_features, can = (k) => !Number.isFinite(bits) || (bits & MEDIA_BITS[k]) !== 0;
      // the middle button pauses while playing and plays otherwise: show it when the player can do that
      const controls = ['previous', 'next'].filter(can);
      if (can(state === 'playing' ? 'pause' : 'play')) controls.splice(1, 0, 'play');
      key = JSON.stringify([state, a.media_title, a.media_artist, pic, a.media_duration, a.media_position, a.media_position_updated_at, a.volume_level, controls]);
      if (this._last.get(el) !== key) {
        const at = Date.parse(a.media_position_updated_at), run = state === 'playing' && Number.isFinite(at) ? Math.max(0, (Date.now() - at) / 1000) : 0;
        el.now = { state, title: a.media_title ?? '', artist: a.media_artist ?? '', art: pic ? this._hass?.hassUrl?.(pic) ?? pic : '', controls,
          duration: num(a.media_duration), position: (num(a.media_position) || 0) + run, volume: can('volume') ? num(a.volume_level) : NaN };
      }
    } else if (row.kind === 'vacuum') {
      // battery, area and time come from sensors named in the row; an older integration still has battery_level
      const a = missing ? {} : s.attributes ?? {}, states = this._hass?.states ?? {};
      const read = (id) => (id && !['unavailable', 'unknown'].includes(states[id]?.state) ? Number(states[id]?.state) : NaN);
      const bits = a.supported_features, can = (k) => !Number.isFinite(bits) || (bits & VACUUM_BITS[k]) !== 0;
      // the first button starts, or pauses while cleaning: show it when the vacuum can do that
      const controls = ['start', 'pause', 'stop', 'return'].filter(can);
      // time in minutes, whatever the sensor counts in
      const per = { s: 1 / 60, min: 1, h: 60 }[states[row.duration]?.attributes?.unit_of_measurement] ?? 1;
      const now = { state: missing ? '' : s.state, battery: row.battery ? read(row.battery) : Number(a.battery_level ?? NaN), area: read(row.area), duration: read(row.duration) * per,
        error: s?.state === 'error' ? a.status ?? '' : '', controls };
      key = JSON.stringify([now, a.friendly_name]);
      if (this._last.get(el) !== key) {
        el.now = now;
        if (!row.label) el.label = a.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'cover') {
      const a = missing ? {} : s.attributes ?? {}, bits = a.supported_features, tilt = isTiltOnly(bits), use = tilt ? TILT_BITS : COVER_BITS;
      const controls = ['open', 'stop', 'close', 'position'].filter((k) => !Number.isFinite(bits) || (bits & use[k]) !== 0);
      const at = tilt ? a.current_tilt_position : a.current_position;
      const now = { state: missing ? '' : s.state, position: Number.isFinite(at) ? at : NaN, controls };
      key = JSON.stringify([now, a.friendly_name]);
      if (this._last.get(el) !== key) {
        el.now = now;
        if (!row.label) el.label = a.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'alarm') {
      const a = missing ? {} : s.attributes ?? {}, bits = a.supported_features;
      const now = { state: missing ? '' : s.state, codeFormat: a.code_format ?? null, codeArmRequired: a.code_arm_required !== false,
        modes: Object.keys(ALARM_BITS).filter((m) => !Number.isFinite(bits) || (bits & ALARM_BITS[m]) !== 0) };
      key = JSON.stringify([now, a.friendly_name]);
      if (this._last.get(el) !== key) {
        el.now = now;
        if (!row.label) el.label = a.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'todo') {
      // the state is how many are left; whether items can be ticked is UPDATE_TODO_ITEM (4)
      const bits = s?.attributes?.supported_features;
      key = JSON.stringify([missing, bits]);
      if (this._last.get(el) !== key) el.readonly = missing || (Number.isFinite(bits) && (bits & 4) === 0);
      // due days are counted in Home Assistant's time zone, as the weather's are
      el.timeZone = this._hass?.config?.time_zone ?? '';
    } else if (row.kind === 'timer') {
      // a timer entity, or a sensor whose state is the time something ends (a washer's end time)
      const a = missing ? {} : s.attributes ?? {};
      let now;
      if (row.entity.startsWith('timer.')) {
        // Home Assistant turns a timer idle the moment it ends: an active timer that goes idle at its end has finished
        const was = this._timerEnd.get(el), state = missing ? 'idle' : s.state;
        const finished = state === 'idle' && (this._finished.has(el) || (Number.isFinite(was) && Date.now() >= was - 2000));
        if (finished) this._finished.add(el); else this._finished.delete(el);
        this._timerEnd.set(el, state === 'active' ? stamp(a.finishes_at) : NaN);
        now = { state: finished ? 'done' : state, end: a.finishes_at ?? NaN, remaining: hms(a.remaining), duration: row.duration != null ? row.duration * 60 : hms(a.duration) };
      } else {
        const end = missing ? NaN : stamp(s.state);
        now = { state: !Number.isFinite(end) ? 'idle' : end > Date.now() ? 'active' : 'done', end, remaining: NaN, duration: row.duration != null ? row.duration * 60 : NaN };
      }
      key = JSON.stringify([now, a.friendly_name]);
      if (this._last.get(el) !== key) {
        el.now = now;
        if (!row.label) el.label = a.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'camera') {
      // entity_picture is a relative address carrying an access token that Home Assistant changes now and then
      const pic = missing ? '' : s.attributes?.entity_picture ?? '';
      const src = pic ? this._hass?.hassUrl?.(pic) ?? pic : '';
      key = JSON.stringify([src, s?.attributes?.friendly_name]);
      if (this._last.get(el) !== key) {
        el.src = src;
        if (!row.label) el.label = s?.attributes?.friendly_name ?? row.entity;
      }
    } else if (row.kind === 'status') {
      const word = missing ? '' : s.state;
      const state = missing ? 'unknown' : ALERT.includes(word) ? 'offline' : STANDBY.includes(word) ? 'standby' : 'online';
      key = state + '|' + word + '|' + (missing ? '' : s.last_changed ?? '');
      if (this._last.get(el) !== key) {
        el.state = state;
        el.text = Object.hasOwn(WORDS, word) ? WORDS[word] : '';
        el.since = missing || !s.last_changed ? NaN : s.last_changed;
      }
    } else {
      val = missing ? [] : row.attributes
        .map((name) => ({ label: name, value: Number(s.attributes?.[name]) }))
        .filter((r) => s.attributes?.[r.label] !== null && s.attributes?.[r.label] !== '' && Number.isFinite(r.value));
      key = JSON.stringify(val);
      if (this._last.get(el) !== key) el.data = val;
    }
    this._last.set(el, key);
  }
}

if (!customElements.get('cw-ha-card')) customElements.define('cw-ha-card', CwHaCard);
window.customCards ??= [];
if (!window.customCards.some((c) => c.type === 'cw-ha-card')) {
  window.customCards.push({ type: 'cw-ha-card', name: 'cool-webui card', description: 'Numbers, states, bars, switches, cameras, media players, agendas, weather, dials, batteries, vacuums, timers, covers, people, rooms, the sky, alarm panels, to-do lists, a floor plan and a power flow in the tile, glass or game look' });
}
