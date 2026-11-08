// cw-ha-card kind: cover: state and current_position, buttons by supported_features, services.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ entity: 'cover.living', kind: 'cover' }, { entity: 'cover.garage', kind: 'cover', label: '車庫' }, { entity: 'cover.gone', kind: 'cover' }] });
    const calls = [];
    const states = {
      'cover.living': { state: 'open', attributes: { current_position: 60, friendly_name: '南の窓', supported_features: 1 | 2 | 4 | 8 } },
      'cover.garage': { state: 'closed', attributes: { supported_features: 1 | 2 } },
      'cover.gone': { state: 'unavailable', attributes: {} },
    };
    card.hass = { states, callService: (d, s, data) => calls.push([d, s, data]) };
    const els = [...card.shadowRoot.querySelectorAll('cw-cover')];
    await Promise.all(els.map((e) => e.updateComplete));
    const out = els.map((e) => ({ ...e.now, label: e.label, buttons: [...e.shadowRoot.querySelectorAll('button')].map((b) => b.getAttribute('part')).join(), range: !!e.shadowRoot.querySelector('input[type=range]') }));
    for (const p of ['open', 'stop', 'close']) els[0].shadowRoot.querySelector(`[part=${p}]`).click();
    const range = els[0].shadowRoot.querySelector('input[type=range]');
    range.value = '30'; range.dispatchEvent(new Event('input')); range.dispatchEvent(new Event('change'));
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(els[0]), 'now');
    Object.defineProperty(els[0], 'now', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states: { ...states }, callService: () => {} };
    card.remove();
    return { out, calls: JSON.stringify(calls), sets };
  });
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    const ids = ['cover.pos', 'cover.stop', 'cover.open', 'cover.none', 'cover.tilt', 'cover.full'];
    card.setConfig({ entities: ids.map((entity) => ({ entity, kind: 'cover' })) });
    const calls = [];
    const states = {
      'cover.pos': { state: 'open', attributes: { current_position: 50, supported_features: 4 } },
      'cover.stop': { state: 'open', attributes: { supported_features: 8 } },
      'cover.open': { state: 'closed', attributes: { supported_features: 1 } },
      'cover.none': { state: 'open', attributes: {} },
      'cover.tilt': { state: 'open', attributes: { current_tilt_position: 30, supported_features: 16 | 32 | 64 | 128 } },
      'cover.full': { state: 'open', attributes: { current_position: 100, supported_features: 15 } },
    };
    const hass = () => ({ states: { ...states }, callService: (d, s, data) => calls.push([s, data]) });
    card.hass = hass();
    const els = [...card.shadowRoot.querySelectorAll('cw-cover')];
    await Promise.all(els.map((e) => e.updateComplete));
    const parts = (e) => [...e.shadowRoot.querySelectorAll('button')].map((b) => b.getAttribute('part')).concat(e.shadowRoot.querySelector('input[type=range]') ? ['slider'] : []).join();
    const out = { bits: els.slice(0, 5).map(parts), tiltPos: els[4].now.position };
    els[4].shadowRoot.querySelector('[part=open]').click();
    const tr = els[4].shadowRoot.querySelector('input[type=range]'); tr.value = '60'; tr.dispatchEvent(new Event('input')); tr.dispatchEvent(new Event('change'));
    els[5].shadowRoot.querySelector('[part=open]').click(); await els[5].updateComplete;
    out.pressed = els[5].getAttribute('state');
    card.hass = hass();
    await new Promise((r) => setTimeout(r, 3200)); await els[5].updateComplete;
    out.back = els[5].getAttribute('state');
    out.calls = JSON.stringify(calls.slice(0, 2));
    card.remove();
    return out;
  });
  check(`holes2: each bit gives its own control: 4 slider, 8 stop, 1 open, none all buttons (${JSON.stringify(h.bits.slice(0, 4))})`, JSON.stringify(h.bits.slice(0, 4)) === JSON.stringify(['slider', 'stop', 'open', 'open,stop,close']));
  check(`holes2: a cover that only tilts gets the controls for its tilt (${h.bits[4]}, ${h.tiltPos})`, h.bits[4] === 'open,stop,close,slider' && h.tiltPos === 30);
  check(`holes2: its buttons and slider call the tilt services (${h.calls})`, h.calls === JSON.stringify([['open_cover_tilt', { entity_id: 'cover.tilt' }], ['set_cover_tilt_position', { entity_id: 'cover.tilt', tilt_position: 60 }]]));
  check(`holes2: open pressed on a fully open cover goes back to open when Home Assistant still says so (${h.pressed} -> ${h.back})`, h.pressed === 'opening' && h.back === 'open');
  const [a, g, x] = r.out;
  check(`state, current_position and the name (${a.state}, ${a.position}, ${a.label})`, a.state === 'open' && a.position === 60 && a.label === '南の窓');
  check(`a cover with every feature gets every button and the slider (${a.buttons}, ${a.range})`, a.buttons === 'open,stop,close' && a.range);
  check(`open and close only: no stop, no slider; the row label wins (${g.buttons}, ${g.range}, ${g.label})`, g.buttons === 'open,close' && !g.range && g.label === '車庫');
  check(`unavailable: no state (${x.state})`, x.state === '');
  check(`buttons call open_cover, stop_cover, close_cover; the slider calls set_cover_position (${r.calls})`,
    r.calls === JSON.stringify([['cover', 'open_cover', { entity_id: 'cover.living' }], ['cover', 'stop_cover', { entity_id: 'cover.living' }], ['cover', 'close_cover', { entity_id: 'cover.living' }], ['cover', 'set_cover_position', { entity_id: 'cover.living', position: 30 }]]));
  check(`the same states do not set it again (${r.sets})`, r.sets === 0);
}
