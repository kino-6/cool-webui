// cw-ha-card kind: switch: states map onto <cw-switch>, presses and the slider call Home Assistant services.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noEntity = tryCfg({ entities: [{ kind: 'switch' }] });
    card.setConfig({ entities: [
      { entity: 'light.a', kind: 'switch', label: '天井' }, { entity: 'switch.fan', kind: 'switch' },
      { entity: 'light.off', kind: 'switch', label: '消えた灯り' }, { entity: 'light.gone', kind: 'switch', label: '外した灯り' },
    ] });
    const calls = [];
    const states = {
      'light.a': { state: 'on', attributes: { brightness: 153, rgb_color: [255, 120, 40], friendly_name: '天井の灯り' } },
      'switch.fan': { state: 'off', attributes: { friendly_name: '換気扇' } },
      'light.off': { state: 'off', attributes: { brightness: null } },
      'light.gone': { state: 'unavailable', attributes: {} },
    };
    card.hass = { states, callService: (d, s, data) => calls.push([d, s, data]) };
    const els = [...card.shadowRoot.querySelectorAll('cw-switch')];
    await Promise.all(els.map((e) => e.updateComplete));
    const read = (e) => ({ on: e.on, level: e.level, label: e.label, text: e.shadowRoot.querySelector('[part=state]').textContent.trim(),
      slider: !!e.shadowRoot.querySelector('input[type=range]'), lamp: e.style.getPropertyValue('--lamp') });
    const first = els.map(read);

    // a press toggles through Home Assistant; the slider turns the light on at a percentage, or off at 0
    els[0].shadowRoot.querySelector('[part=face]').click();
    els[1].shadowRoot.querySelector('[part=face]').click();
    const range = els[0].shadowRoot.querySelector('input[type=range]');
    range.value = '40'; range.dispatchEvent(new Event('input')); range.dispatchEvent(new Event('change'));
    range.value = '0'; range.dispatchEvent(new Event('input')); range.dispatchEvent(new Event('change'));

    // the off light remembers its last level once it has had one
    card.hass = { states: { ...states, 'light.off': { state: 'on', attributes: { brightness: 51 } } }, callService: () => {} };
    card.hass = { states: { ...states, 'light.off': { state: 'off', attributes: { brightness: null } } }, callService: () => {} };
    await els[2].updateComplete;
    const remembered = els[2].level;

    // the same states again do not touch the switch (a drag in progress is not overwritten)
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(els[1]), 'on');
    Object.defineProperty(els[1], 'on', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states: { ...states, 'light.off': { state: 'off', attributes: { brightness: null } } }, callService: () => {} };
    card.hass = { states: { ...states, 'light.off': { state: 'off', attributes: { brightness: null } } }, callService: () => {} };

    const size = card.getCardSize();
    card.setConfig({ look: 'game', entities: [{ entity: 'light.a', kind: 'switch' }] });
    card.hass = { states, callService: () => {} };
    const g = card.shadowRoot.querySelector('cw-switch');
    await g.updateComplete;
    const gameFace = getComputedStyle(g.shadowRoot.querySelector('[part=face]')).backgroundColor;
    card.remove();
    return { noEntity, first, calls, remembered, sets, size, gameFace };
  });
  const [a, fan, off, gone] = r.first;
  check(`a switch row needs an entity (${r.noEntity})`, /entity/.test(r.noEntity));
  check(`a lit light is on at its brightness (${JSON.stringify(a)})`, a.on && Math.abs(a.level - 0.6) < 1e-9 && a.slider && a.label === '天井');
  check(`the light's colour becomes the lamp (${a.lamp})`, a.lamp === 'rgb(255, 120, 40)');
  check(`a plain switch has no slider and takes the friendly name (${JSON.stringify(fan)})`, !fan.on && !fan.slider && fan.label === '換気扇');
  check(`an off light keeps a slider at 0 (${JSON.stringify(off)})`, !off.on && off.slider && off.level === 0);
  check(`an unavailable entity is off and says 不明 (${JSON.stringify(gone)})`, !gone.on && gone.text === '不明');
  const c = JSON.stringify(r.calls);
  check(`a press calls homeassistant.toggle (${c})`, c.includes('["homeassistant","toggle",{"entity_id":"light.a"}]') && c.includes('["homeassistant","toggle",{"entity_id":"switch.fan"}]'));
  check(`letting go of the slider calls light.turn_on with the percentage (${c})`, c.includes('["light","turn_on",{"entity_id":"light.a","brightness_pct":40}]'));
  check(`sliding to 0 calls light.turn_off (${c})`, c.includes('["light","turn_off",{"entity_id":"light.a"}]') && r.calls.length === 4);
  check(`an off light remembers its last level (${r.remembered})`, Math.abs(r.remembered - 0.2) < 1e-9);
  check(`the same state twice does not set the switch again (${r.sets})`, r.sets === 0);
  check(`card size counts the switch rows (${r.size})`, r.size >= 5 && r.size <= 8);
  check(`look: game paints a lit switch amber (${r.gameFace})`, r.gameFace === 'rgb(255, 194, 26)');

  // the demo page's lighting card answers its own presses
  const demo = await page.evaluate(async () => {
    const card = document.getElementById('lights'), sw = card.shadowRoot.querySelector('cw-switch');
    const before = sw.on;
    sw.shadowRoot.querySelector('[part=face]').click();
    await new Promise((res) => setTimeout(res, 50));
    await sw.updateComplete;
    return { before, after: sw.on, n: card.shadowRoot.querySelectorAll('cw-switch').length };
  });
  check(`the demo's lighting card toggles a light (${JSON.stringify(demo)})`, demo.n >= 3 && demo.before !== demo.after);

  // holes2 (T106): a press shows at once; 3 s later the face follows what Home Assistant says
  const back = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'switch.stuck', kind: 'switch' }, { entity: 'switch.ok', kind: 'switch' }] });
    let ok = 'off';
    const hass = () => ({ states: { 'switch.stuck': { state: 'off', attributes: {} }, 'switch.ok': { state: ok, attributes: {} } }, callService: () => {} });
    card.hass = hass();
    const [stuck, fine] = card.shadowRoot.querySelectorAll('cw-switch');
    await Promise.all([stuck, fine].map((e) => e.updateComplete));
    for (const e of [stuck, fine]) e.shadowRoot.querySelector('[part=face]').click();
    const pressed = [stuck.on, fine.on];
    ok = 'on'; card.hass = hass();
    await new Promise((r) => setTimeout(r, 3200));
    const after = [stuck.on, fine.on];
    card.remove();
    return { pressed, after };
  });
  check(`holes2: a switch Home Assistant leaves off goes back to off (${back.pressed[0]} -> ${back.after[0]})`, back.pressed[0] === true && back.after[0] === false);
  check(`holes2: a switch Home Assistant turned on stays on (${back.pressed[1]} -> ${back.after[1]})`, back.pressed[1] === true && back.after[1] === true);
}
