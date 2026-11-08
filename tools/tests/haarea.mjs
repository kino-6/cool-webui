// cw-ha-card kind: area: an area's temperature and humidity sensors, its lights and motion sensors from the registries.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noArea = tryCfg({ entities: [{ kind: 'area' }] });
    card.setConfig({ entities: [{ kind: 'area', area: 'living' }, { kind: 'area', area: 'bed', label: '寝室' }, { kind: 'area', area: 'nowhere' }] });
    const calls = [];
    const hass = (over = {}) => ({
      areas: { living: { area_id: 'living', name: '居間', temperature_entity_id: 'sensor.lt', humidity_entity_id: 'sensor.lh' }, bed: { area_id: 'bed', name: 'ベッドルーム' } },
      devices: { d1: { id: 'd1', area_id: 'living' }, d2: { id: 'd2', area_id: 'bed' } },
      entities: {
        'light.ceiling': { entity_id: 'light.ceiling', area_id: 'living' }, 'light.lamp': { entity_id: 'light.lamp', device_id: 'd1', area_id: null },
        'light.hidden': { entity_id: 'light.hidden', area_id: 'living', hidden: true }, 'light.moved': { entity_id: 'light.moved', device_id: 'd1', area_id: 'bed' },
        'binary_sensor.pir': { entity_id: 'binary_sensor.pir', device_id: 'd1' }, 'binary_sensor.door': { entity_id: 'binary_sensor.door', area_id: 'living' },
        'sensor.lt': { entity_id: 'sensor.lt', area_id: 'living' },
      },
      states: { 'sensor.lt': { state: '22.4', attributes: {} }, 'sensor.lh': { state: '48', attributes: {} },
        'light.ceiling': { state: 'on', attributes: {} }, 'light.lamp': { state: 'off', attributes: {} }, 'light.hidden': { state: 'on', attributes: {} }, 'light.moved': { state: 'on', attributes: {} },
        'binary_sensor.pir': { state: 'on', attributes: { device_class: 'motion' } }, 'binary_sensor.door': { state: 'on', attributes: { device_class: 'door' } }, ...over },
      callService: (d, s, data) => calls.push([d, s, data]),
    });
    card.hass = hass();
    const [living, bed, nowhere] = card.shadowRoot.querySelectorAll('cw-area');
    await Promise.all([living, bed, nowhere].map((e) => e.updateComplete));
    const out = { noArea, living: { ...living.now, label: living.label }, bed: { ...bed.now, label: bed.label }, nowhere: { ...nowhere.now, label: nowhere.label } };
    living.shadowRoot.querySelector('[part=lights]').click();
    out.calls = JSON.stringify(calls);
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(living), 'now');
    Object.defineProperty(living, 'now', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = hass();
    out.sets = sets;
    card.hass = hass({ 'binary_sensor.pir': { state: 'off', attributes: { device_class: 'motion' } } });
    out.sets2 = sets;
    out.motionAfter = living.now.motion;
    card.remove();
    return out;
  });
  check(`an area row needs its area id (${r.noArea})`, /area is required/.test(r.noArea));
  check(`temperature and humidity from the area's sensors, its name (${JSON.stringify(r.living)})`, r.living.temperature === 22.4 && r.living.humidity === 48 && r.living.label === '居間');
  check(`lights: its own, and a device's in the area; not hidden ones, not one moved to another area (${r.living.lightsOn}/${r.living.lights})`, r.living.lights === 2 && r.living.lightsOn === 1);
  check(`motion from a motion sensor through its device, not from a door (${r.living.motion})`, r.living.motion === true);
  check(`an entity whose own area differs from its device's goes by its own; the row label wins (${JSON.stringify(r.bed)})`, r.bed.lights === 1 && r.bed.lightsOn === 1 && r.bed.label === '寝室');
  check(`an unknown area shows nothing and its id as the name (${JSON.stringify(r.nowhere)})`, r.nowhere.lights === 0 && r.nowhere.label === 'nowhere' && r.nowhere.temperature == null);
  check(`the lights button turns the area's lights off together (${r.calls})`, r.calls === JSON.stringify([['light', 'turn_off', { entity_id: ['light.ceiling', 'light.lamp'] }]]));
  check(`the same states do not set it again; motion stopping does (${r.sets}, ${r.sets2}, ${r.motionAfter})`, r.sets === 0 && r.sets2 === 1 && r.motionAfter === false);
  // holes found by the audit of T109
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ kind: 'area', area: 'den' }, { kind: 'area', area: 'hall' }, { kind: 'area', area: 'dark' }] });
    const calls = [];
    let st = {
      'light.a': { state: 'off', attributes: {} }, 'light.b': { state: 'off', attributes: {} }, 'light.grp': { state: 'off', attributes: { entity_id: ['light.a', 'light.b'] } },
      'light.led': { state: 'on', attributes: {} }, 'light.gone': { state: 'unavailable', attributes: {} },
      'binary_sensor.occ': { state: 'on', attributes: { device_class: 'occupancy' } }, 'binary_sensor.pres': { state: 'off', attributes: { device_class: 'presence' } },
      'binary_sensor.m1': { state: 'unavailable', attributes: { device_class: 'motion' } }, 'binary_sensor.m2': { state: 'unknown', attributes: { device_class: 'motion' } },
    };
    const ent = (id, area, extra = {}) => ({ [id]: { entity_id: id, area_id: area, ...extra } });
    const hass = () => ({ areas: { den: { name: '書斎' }, hall: { name: '廊下' }, dark: { name: '物置' } }, devices: {},
      entities: { ...ent('light.a', 'den'), ...ent('light.b', 'den'), ...ent('light.grp', 'den'), ...ent('light.led', 'den', { entity_category: 'diagnostic' }), ...ent('light.gone', 'den'),
        ...ent('binary_sensor.occ', 'hall'), ...ent('binary_sensor.pres', 'den'), ...ent('binary_sensor.m1', 'dark'), ...ent('binary_sensor.m2', 'dark') },
      states: st, callService: (d, s, data) => calls.push([s, data.entity_id]) });
    card.hass = hass();
    const [den, hall, dark] = card.shadowRoot.querySelectorAll('cw-area');
    await Promise.all([den, hall, dark].map((e) => e.updateComplete));
    const out = { den: [den.now.lights, den.now.lightsOn, den.now.motion], hall: hall.now.motion, dark: dark.now.motion };
    den.shadowRoot.querySelector('[part=lights]').click(); await den.updateComplete;
    out.pressed = den.now.lightsOn;
    out.calls = JSON.stringify(calls);
    card.hass = hass();
    await new Promise((r) => setTimeout(r, 3200)); await den.updateComplete;
    out.back = den.now.lightsOn;
    card.remove();
    return out;
  });
  check(`holes: a group of room lights, a diagnostic LED and an unavailable light are not counted (${h.den})`, h.den[0] === 2 && h.den[1] === 0);
  check(`holes: occupancy and presence count as motion (${h.hall}, ${h.den[2]})`, h.hall === true && h.den[2] === false);
  check(`holes: a room whose motion sensors are all unknown has no motion mark (${h.dark})`, h.dark == null);
  check(`holes: with every light off the button turns the usable ones on (${h.calls})`, h.calls === JSON.stringify([['turn_on', ['light.a', 'light.b']]]));
  check(`holes: the press shows at once and goes back when Home Assistant still disagrees 3 s later (${h.pressed} -> ${h.back})`, h.pressed === 2 && h.back === 0);
}
