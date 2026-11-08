// cw-ha-card kind: timer: a timer entity (H:MM:SS attributes) and a sensor whose state is an end time.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [
      { entity: 'timer.tea', kind: 'timer' }, { entity: 'timer.rice', kind: 'timer' }, { entity: 'timer.idle', kind: 'timer', label: '待つ' },
      { entity: 'sensor.washer_end', kind: 'timer', duration: 90 }, { entity: 'sensor.dryer_end', kind: 'timer' }, { entity: 'sensor.broken', kind: 'timer' },
    ] });
    const end = new Date(Date.now() + 5 * 60e3 + 30e3).toISOString();
    const states = {
      'timer.tea': { state: 'active', attributes: { duration: '0:10:00', remaining: '0:10:00', finishes_at: end, friendly_name: 'お茶' } },
      'timer.rice': { state: 'paused', attributes: { duration: '1:00:00', remaining: '0:25:30', friendly_name: '炊飯' } },
      'timer.idle': { state: 'idle', attributes: { duration: '0:03:00' } },
      'sensor.washer_end': { state: new Date(Date.now() + 47 * 60e3).toISOString(), attributes: { device_class: 'timestamp', friendly_name: '洗濯機' } },
      'sensor.dryer_end': { state: new Date(Date.now() - 60e3).toISOString(), attributes: { device_class: 'timestamp', friendly_name: '乾燥機' } },
      'sensor.broken': { state: 'unknown', attributes: {} },
    };
    card.hass = { states };
    const els = [...card.shadowRoot.querySelectorAll('cw-timer')];
    await Promise.all(els.map((e) => e.updateComplete));
    const out = els.map((e) => ({ state: e.getAttribute('state'), time: e.shadowRoot.querySelector('[part=time]').textContent, label: e.label, dur: e.now.duration, bar: !!e.shadowRoot.querySelector('[part=bar]') }));
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(els[0]), 'now');
    Object.defineProperty(els[0], 'now', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states: { ...states } };
    card.remove();
    return { out, sets };
  });
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ entity: 'timer.egg', kind: 'timer' }, { entity: 'timer.long', kind: 'timer', duration: 15 }, { entity: 'timer.gone', kind: 'timer' }, { entity: 'sensor.number', kind: 'timer' }, { entity: 'sensor.past', kind: 'timer' }] });
    const states = (egg) => ({ 'timer.egg': egg, 'timer.long': { state: 'idle', attributes: { duration: '1 day, 2:00:00' } }, 'sensor.number': { state: '5', attributes: {} },
      'sensor.past': { state: new Date(Date.now() - 60e3).toISOString(), attributes: {} } });
    const set = (egg) => { card.hass = { states: states(egg) }; };
    const [egg, long, gone, number, past] = card.shadowRoot.querySelectorAll('cw-timer');
    let n = 0, p = 0; egg.addEventListener('cw-done', () => n++); past.addEventListener('cw-done', () => p++);
    set({ state: 'active', attributes: { duration: '0:05:00', finishes_at: new Date(Date.now() + 1000).toISOString() } });
    await egg.updateComplete;
    const before = egg.getAttribute('state');
    set({ state: 'idle', attributes: { duration: '0:05:00' } }); await egg.updateComplete; await new Promise((r) => setTimeout(r, 10));
    const done = [egg.getAttribute('state'), n];
    set({ state: 'idle', attributes: { duration: '0:05:00', editable: true } }); await egg.updateComplete; await new Promise((r) => setTimeout(r, 10));
    const still = [egg.getAttribute('state'), n];
    set({ state: 'active', attributes: { duration: '0:05:00', finishes_at: new Date(Date.now() + 300e3).toISOString() } }); await egg.updateComplete;
    const again = egg.getAttribute('state');
    set({ state: 'idle', attributes: { duration: '0:05:00' } }); await egg.updateComplete;
    const cancelled = egg.getAttribute('state');
    await Promise.all([long, gone, number, past].map((e) => e.updateComplete));
    const out = { before, done, still, again, cancelled, longDur: long.now.duration, rowDur: long.now.duration, gone: gone.getAttribute('state'), number: number.getAttribute('state'), pastDone: [past.getAttribute('state'), p] };
    card.remove();
    return out;
  });
  check(`active then idle at its end is done once (${h.before}, ${h.done}, then ${h.still})`, h.before === 'active' && h.done.join() === 'done,1' && h.still.join() === 'done,1');
  check(`holes: started again it is active; cancelled before its end it is idle (${h.again}, ${h.cancelled})`, h.again === 'active' && h.cancelled === 'idle');
  check(`a day and more is read; the row's duration in minutes wins for a timer too (${h.longDur})`, h.longDur === 900);
  const day = await page.evaluate(async () => { const c = document.createElement('cw-ha-card'); document.body.append(c); c.setConfig({ entities: [{ entity: 'timer.long', kind: 'timer' }] }); c.hass = { states: { 'timer.long': { state: 'idle', attributes: { duration: '1 day, 2:00:00' } } } }; const e = c.shadowRoot.querySelector('cw-timer'); await e.updateComplete; const d = e.now.duration; c.remove(); return d; });
  check(`holes: 1 day, 2:00:00 is 26 hours (${day})`, day === 93600);
  check(`holes: a missing timer and a sensor that is just a number are idle (${h.gone}, ${h.number})`, h.gone === 'idle' && h.number === 'idle');
  check(`holes: an end time already past on load is done without cw-done (${h.pastDone})`, h.pastDone.join() === 'done,0');
  const [tea, rice, idle, washer, dryer, broken] = r.out;
  check(`an active timer counts to finishes_at (${tea.state}, ${tea.time}, ${tea.label})`, tea.state === 'active' && /^5:(29|30)$/.test(tea.time) && tea.label === 'お茶');
  check(`H:MM:SS duration is the full bar (${tea.dur}, ${rice.dur})`, tea.dur === 600 && rice.dur === 3600 && tea.bar);
  check(`a paused timer shows its remaining (${rice.state}, ${rice.time})`, rice.state === 'paused' && rice.time === '25:30');
  check(`an idle timer shows its duration, and a row label wins (${idle.state}, ${idle.time}, ${idle.label})`, idle.state === 'idle' && idle.time === '3:00' && idle.label === '待つ');
  check(`an end-time sensor in the future is active; duration: minutes gives its bar (${washer.state}, ${washer.time}, ${washer.dur})`, washer.state === 'active' && /^4[67]:\d\d$/.test(washer.time) && washer.dur === 5400 && washer.bar);
  check(`an end time already past is done (${dryer.state}, ${dryer.time})`, dryer.state === 'done' && dryer.time === '0:00');
  check(`an unreadable sensor is idle with a dash (${broken.state}, ${broken.time})`, broken.state === 'idle' && broken.time === '—');
  check(`the same states do not set it again (${r.sets})`, r.sets === 0);
}
