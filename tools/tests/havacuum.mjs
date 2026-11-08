// cw-ha-card kind: vacuum: state, battery from a sensor or battery_level, area and time sensors, buttons by supported_features.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noEntity = tryCfg({ entities: [{ kind: 'vacuum' }] });
    card.setConfig({ entities: [
      { entity: 'vacuum.roomba', kind: 'vacuum', battery: 'sensor.roomba_battery', area: 'sensor.roomba_area', duration: 'sensor.roomba_time' },
      { entity: 'vacuum.old', kind: 'vacuum', label: '古い掃除機' },
      { entity: 'vacuum.cheap', kind: 'vacuum' },
      { entity: 'vacuum.gone', kind: 'vacuum' },
    ] });
    const calls = [];
    const states = {
      'vacuum.roomba': { state: 'cleaning', attributes: { friendly_name: 'ルンバ', supported_features: 4 | 8 | 16 | 8192 } },
      'sensor.roomba_battery': { state: '72', attributes: {} }, 'sensor.roomba_area': { state: '23.6', attributes: {} }, 'sensor.roomba_time': { state: 'unknown', attributes: {} },
      'vacuum.old': { state: 'error', attributes: { battery_level: 14, status: 'ブラシが詰まっています', supported_features: 16 | 8192 } },
      'vacuum.cheap': { state: 'docked', attributes: { friendly_name: '安い掃除機', supported_features: 16 } },
      'vacuum.gone': { state: 'unavailable', attributes: {} },
    };
    card.hass = { states, callService: (d, s, data) => calls.push([d, s, data.entity_id]) };
    const els = [...card.shadowRoot.querySelectorAll('cw-vacuum')];
    await Promise.all(els.map((e) => e.updateComplete));
    const view = (e) => ({ ...e.now, label: e.label, buttons: [...e.shadowRoot.querySelectorAll('button')].map((b) => b.getAttribute('part') + (b.disabled ? ':off' : '')).join() });
    const out = { noEntity, v: els.map(view) };
    for (const p of ['start', 'stop', 'return']) els[0].shadowRoot.querySelector(`[part=${p}]`).click();
    out.calls = JSON.stringify(calls);
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(els[0]), 'now');
    Object.defineProperty(els[0], 'now', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states: { ...states }, callService: () => {} };
    out.sets = sets;
    card.hass = { states: { ...states, 'sensor.roomba_battery': { state: '71', attributes: {} } }, callService: () => {} };
    out.sets2 = sets;
    card.remove();
    return out;
  });
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [
      { entity: 'vacuum.err', kind: 'vacuum' }, { entity: 'vacuum.stoponly', kind: 'vacuum' }, { entity: 'vacuum.pauseonly', kind: 'vacuum' },
      { entity: 'vacuum.secs', kind: 'vacuum', duration: 'sensor.secs', area: 'sensor.area' }, { entity: 'vacuum.hours', kind: 'vacuum', duration: 'sensor.hours' },
      { entity: 'vacuum.nopause', kind: 'vacuum' },
    ] });
    const calls = [];
    const states = {
      'vacuum.err': { state: 'error', attributes: { status: '詰まり', supported_features: 8192 | 4 } },
      'vacuum.stoponly': { state: 'cleaning', attributes: { status: '掃除中', supported_features: 8 } },
      'vacuum.pauseonly': { state: 'cleaning', attributes: { supported_features: 4 } },
      'vacuum.secs': { state: 'docked', attributes: { status: 'charging' } }, 'sensor.secs': { state: '1080', attributes: { unit_of_measurement: 's' } }, 'sensor.area': { state: '30', attributes: {} },
      'vacuum.hours': { state: 'docked', attributes: {} }, 'sensor.hours': { state: '0.5', attributes: { unit_of_measurement: 'h' } },
      'vacuum.nopause': { state: 'docked', attributes: { supported_features: 8192 | 16 } },
    };
    card.hass = { states, callService: (d, s, data) => calls.push(s + ':' + data.entity_id) };
    const els = [...card.shadowRoot.querySelectorAll('cw-vacuum')];
    await Promise.all(els.map((e) => e.updateComplete));
    const parts = (e) => [...e.shadowRoot.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).join();
    const out = { stoponly: parts(els[1]), pauseonly: parts(els[2]), secs: els[3].now.duration, hours: els[4].now.duration, notErr: els[3].now.error };
    els[0].shadowRoot.querySelector('[part=start]').click(); await els[0].updateComplete;
    out.pressed = els[0].getAttribute('state');
    els[5].shadowRoot.querySelector('[part=start]').click(); await els[5].updateComplete;
    out.afterStart = parts(els[5]);
    card.hass = { states: { ...states }, callService: (d, s, data) => calls.push(s + ':' + data.entity_id) };
    await new Promise((r) => setTimeout(r, 3200)); await els[0].updateComplete;
    out.back = [els[0].getAttribute('state'), els[0].shadowRoot.querySelector('[part=error]')?.textContent];
    out.calls = calls.join();
    card.remove();
    return out;
  });
  check(`holes: a vacuum that can only stop shows stop and nothing else while cleaning (${h.stoponly})`, h.stoponly === '止める');
  check(`holes: a vacuum that can only pause shows pause while cleaning (${h.pauseonly})`, h.pauseonly === '一時停止');
  check(`holes: time in seconds and hours becomes minutes (${h.secs}, ${h.hours})`, h.secs === 18 && h.hours === 30);
  check(`holes: status is the error only in the error state (${h.notErr})`, h.notErr === '');
  check(`holes: start calls vacuum.start; a vacuum without pause shows no pause after starting (${h.calls}; ${h.afterStart})`, h.calls.startsWith('start:vacuum.err,start:vacuum.nopause') && h.afterStart === '充電台に戻す');
  check(`holes: a pressed face goes back to what Home Assistant says when it still says so (${h.pressed} -> ${h.back})`, h.pressed === 'cleaning' && h.back[0] === 'error' && h.back[1] === '詰まり');
  const [a, b, c, d] = r.v;
  check(`a vacuum row needs an entity (${r.noEntity})`, /entity/.test(r.noEntity));
  check(`state, name and the sensors named in the row (${a.state}, ${a.label}, ${a.battery}, ${a.area}, ${a.duration})`, a.state === 'cleaning' && a.label === 'ルンバ' && a.battery === 72 && a.area === 23.6 && a.duration == null);
  check(`an older integration's battery_level and its status as the error (${b.battery}, ${b.error}, ${b.label})`, b.battery === 14 && b.error === 'ブラシが詰まっています' && b.label === '古い掃除機');
  check(`every button for a vacuum that can do everything (${a.buttons})`, a.buttons === 'start,stop,return');
  check(`no STOP: no stop button (${b.buttons})`, b.buttons === 'start,return');
  check(`no START: only return (${c.buttons})`, c.buttons === 'return');
  check(`unavailable: no state, buttons off (${d.state}, ${d.buttons})`, d.state === '' && d.buttons === 'start:off,stop:off,return:off');
  check(`buttons call vacuum.pause, stop and return_to_base (${r.calls})`, r.calls === JSON.stringify([['vacuum', 'pause', 'vacuum.roomba'], ['vacuum', 'stop', 'vacuum.roomba'], ['vacuum', 'return_to_base', 'vacuum.roomba']]));
  check(`the same states do not set it again; a sensor change does (${r.sets}, ${r.sets2})`, r.sets === 0 && r.sets2 === 1);
}
