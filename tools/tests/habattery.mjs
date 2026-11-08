// cw-ha-card kind: battery: listed entities, or every battery Home Assistant knows, emptiest first.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noEntity = tryCfg({ entities: [{ kind: 'battery' }] });
    const badList = tryCfg({ entities: [{ kind: 'battery', entities: 'sensor.a' }] });
    card.setConfig({ entities: [{ kind: 'battery', low: 30, max: 4 }, { kind: 'battery', entities: ['sensor.phone', 'sensor.gone'] }] });
    const states = {
      'sensor.door_battery': { state: '64', attributes: { device_class: 'battery', unit_of_measurement: '%', friendly_name: '玄関' } },
      'sensor.bed_battery': { state: '12', attributes: { device_class: 'battery', unit_of_measurement: '%', friendly_name: '寝室' } },
      'sensor.window_battery': { state: 'unavailable', attributes: { device_class: 'battery', friendly_name: '窓' } },
      'binary_sensor.leak_battery': { state: 'on', attributes: { device_class: 'battery', friendly_name: '水漏れ' } },
      'binary_sensor.smoke_battery': { state: 'off', attributes: { device_class: 'battery', friendly_name: '煙' } },
      'sensor.phone': { state: '28', attributes: { friendly_name: 'スマホ' } },
      'sensor.temperature': { state: '21', attributes: { device_class: 'temperature' } },
      'light.battery_lamp': { state: 'on', attributes: { device_class: 'battery' } },
    };
    card.hass = { states };
    const [all, listed] = card.shadowRoot.querySelectorAll('cw-battery');
    await Promise.all([all, listed].map((e) => e.updateComplete));
    const names = (e) => [...e.shadowRoot.querySelectorAll('[part=row]')].map((x) => x.getAttribute('aria-label'));
    const out = { noEntity, badList, all: names(all), listed: names(listed), low: all.low, max: all.max, more: all.shadowRoot.querySelector('[part=more]')?.textContent.trim() };
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(all), 'items');
    Object.defineProperty(all, 'items', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states: { ...states } };
    out.sets = sets;
    card.hass = { states: { ...states, 'sensor.bed_battery': { ...states['sensor.bed_battery'], state: '11' } } };
    await all.updateComplete;
    out.sets2 = sets;
    out.size = card.getCardSize();
    card.remove();
    return out;
  });
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ kind: 'battery', entities: ['binary_sensor.off_line', 'binary_sensor.missing', 'sensor.volts', 'sensor.blank', 'sensor.float'] }] });
    card.hass = { states: {
      'binary_sensor.off_line': { state: 'unavailable', attributes: { device_class: 'battery', friendly_name: '切れた' } },
      'sensor.volts': { state: '3.0', attributes: { device_class: 'voltage', unit_of_measurement: 'V', friendly_name: '電圧' } },
      'sensor.blank': { state: '', attributes: { unit_of_measurement: '%', friendly_name: '空' } },
      'sensor.float': { state: '45.0', attributes: { unit_of_measurement: '%', friendly_name: '小数' } },
    } };
    const e = card.shadowRoot.querySelector('cw-battery'); await e.updateComplete;
    const out = [...e.shadowRoot.querySelectorAll('[part=row]')].map((x) => x.getAttribute('aria-label'));
    card.remove();
    return out;
  });
  check(`holes: an unavailable or missing binary battery is unknown, not fine (${JSON.stringify(h)})`, h.includes('切れた —') && h.includes('binary_sensor.missing —'));
  check(`holes: a voltage is not a percent and an empty state is not 0% (${JSON.stringify(h)})`, h.includes('電圧 —') && h.includes('空 —'));
  check(`holes: '45.0' is 45% (${h[0]})`, h[0] === '小数 45%');
  check(`a battery row needs no entity (${r.noEntity})`, r.noEntity === 'ok');
  check(`entities must be a list of ids (${r.badList})`, /list of entity ids/.test(r.badList));
  check(`without entities, every sensor and binary sensor with device_class battery, emptiest first (${JSON.stringify(r.all)})`,
    JSON.stringify(r.all) === JSON.stringify(['寝室 12% 少ない', '玄関 64%', '水漏れ 少ない', '煙 十分']));
  check(`max=4 leaves one more, the unavailable one (${r.more})`, r.more === 'ほか 1 件');
  check(`low and max pass to the part (${r.low}, ${r.max})`, r.low === 30 && r.max === 4);
  check(`listed entities are used as they are, a missing one is a dash (${JSON.stringify(r.listed)})`, JSON.stringify(r.listed) === JSON.stringify(['スマホ 28%', 'sensor.gone —']));
  check(`the same states do not set the part again (${r.sets})`, r.sets === 0);
  check(`a changed level sets it once (${r.sets2})`, r.sets2 === 1);
  check(`card size counts the rows (${r.size})`, r.size >= 9);
}
