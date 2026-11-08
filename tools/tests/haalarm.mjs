// cw-ha-card kind: alarm: state, code_format, code_arm_required, arming ways by supported_features, services with the code.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ entity: 'alarm_control_panel.home', kind: 'alarm' }, { entity: 'alarm_control_panel.shed', kind: 'alarm', label: '物置' }, { entity: 'alarm_control_panel.gone', kind: 'alarm' }] });
    const calls = [];
    const states = {
      'alarm_control_panel.home': { state: 'armed_away', attributes: { code_format: 'number', code_arm_required: true, supported_features: 1 | 2 | 32, friendly_name: '家' } },
      'alarm_control_panel.shed': { state: 'disarmed', attributes: { code_format: null, code_arm_required: false, supported_features: 2 | 4 } },
      'alarm_control_panel.gone': { state: 'unavailable', attributes: {} },
    };
    card.hass = { states, callService: (d, s, data) => calls.push([d, s, data]) };
    const [home, shed, gone] = card.shadowRoot.querySelectorAll('cw-alarm');
    await Promise.all([home, shed, gone].map((e) => e.updateComplete));
    const out = { home: { ...home.now, label: home.label }, shed: { ...shed.now, label: shed.label }, gone: gone.now.state };
    for (const k of ['9', '8', '7', '6']) [...home.shadowRoot.querySelectorAll('[part=keys] button')].find((b) => b.textContent.trim() === k).click();
    await home.updateComplete;
    home.shadowRoot.querySelector('[part=disarm]').click();
    shed.shadowRoot.querySelector('[part=arm_night]').click();
    out.calls = JSON.stringify(calls);
    out.size = card.getCardSize();
    card.remove();
    return out;
  });
  check(`state, code format, code to arm, the name (${JSON.stringify(r.home)})`, r.home.state === 'armed_away' && r.home.codeFormat === 'number' && r.home.codeArmRequired === true && r.home.label === '家');
  check(`arming ways from the feature bits: 1 home, 2 away, 32 vacation (${r.home.modes})`, r.home.modes.join() === 'home,away,vacation');
  check(`2 and 4: away and night; no code; the row label wins (${JSON.stringify(r.shed)})`, r.shed.modes.join() === 'away,night' && r.shed.codeFormat === null && r.shed.codeArmRequired === false && r.shed.label === '物置');
  check(`unavailable: no state (${r.gone})`, r.gone === '');
  check(`disarm sends the code to alarm_disarm; arming without a code sends none (${r.calls})`, r.calls === JSON.stringify([
    ['alarm_control_panel', 'alarm_disarm', { entity_id: 'alarm_control_panel.home', code: '9876' }], ['alarm_control_panel', 'alarm_arm_night', { entity_id: 'alarm_control_panel.shed' }]]));
  check(`card size counts the alarm rows (${r.size})`, r.size === 18);
  // holes found by the audit of T112
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'alarm_control_panel.a', kind: 'alarm' }, { entity: 'alarm_control_panel.b', kind: 'alarm' }] });
    const states = { 'alarm_control_panel.a': { state: 'disarmed', attributes: { code_format: null, supported_features: 16 | 2 } }, 'alarm_control_panel.b': { state: 'disarmed', attributes: { code_format: 'number' } } };
    const hass = () => ({ states: { ...states }, callService: () => {} });
    card.hass = hass();
    const [a, b] = card.shadowRoot.querySelectorAll('cw-alarm');
    await Promise.all([a, b].map((e) => e.updateComplete));
    const out = { a: a.now.modes.join(), b: [b.now.modes.join(), b.now.codeArmRequired] };
    a.shadowRoot.querySelector('[part=arm_away]').click(); await a.updateComplete;
    out.pressed = a.getAttribute('state');
    card.hass = hass();
    await new Promise((r) => setTimeout(r, 3200)); await a.updateComplete;
    out.back = a.getAttribute('state');
    card.remove();
    return out;
  });
  check(`holes: bit 16 is custom_bypass (${h.a})`, h.a === 'away,custom_bypass');
  check(`holes: without supported_features every way shows; without code_arm_required arming needs the code (${h.b})`, h.b[0] === 'home,away,night,custom_bypass,vacation' && h.b[1] === true);
  check(`holes: a pressed face goes back to Home Assistant's state 3 s later (${h.pressed} -> ${h.back})`, h.pressed === 'arming' && h.back === 'disarmed');
}
