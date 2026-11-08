// cw-ha-card kind: floorplan / flow — config checks, mapping HA states onto the plan and the flow, light.toggle on tap.
export const demo = 'ha-card-house.html?still';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
export async function run(page, check) {
  const P = (fn, ...a) => page.evaluate(fn, ...a);
  const errs = await P(() => {
    const c = document.createElement('cw-ha-card');
    const t = (cfg) => { try { c.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    return {
      rooms: t({ entities: [{ kind: 'floorplan', rooms: [{ entity: 'light.a', x: 0, y: 0, w: 2 }] }] }),
      nodes: t({ entities: [{ kind: 'flow', nodes: [{ name: 'x' }] }] }),
      links: t({ entities: [{ kind: 'flow', nodes: [{ id: 'a' }], links: [{ from: 'a', to: 'b' }] }] }),
      size: (t({ entities: [{ kind: 'floorplan', height: 400, rooms: [{ entity: 'light.a', x: 0, y: 0, w: 2, h: 2 }] }, { kind: 'flow', nodes: [{ id: 'a' }] }] }), c.getCardSize()),
    };
  });
  check(`rooms throws without h (${errs.rooms})`, errs.rooms.includes('rooms'));
  check(`nodes throws without id (${errs.nodes})`, errs.nodes.includes('nodes'));
  check(`links throws without entity (${errs.links})`, errs.links.includes('links'));
  check(`card size counts the drawn heights (${errs.size})`, errs.size === Math.ceil(1 + 400 / 50 + 320 / 50));

  await page.wait(300);
  const plan = () => P(() => {
    const f = document.getElementById('tile').shadowRoot.querySelector('cw-floorplan');
    return { rooms: f.rooms, people: f.people, focus: f.focus };
  });
  const p = await plan();
  const room = (id) => p.rooms.find((r) => r.id === id);
  check(`light state lights the room (${p.rooms.filter((r) => r.on).map((r) => r.id)})`, room('light.living').on && room('light.kitchen').on && !room('light.study').on);
  check(`light colour comes from rgb_color or hs_color (${room('light.living').color}, ${room('light.kitchen').color})`, room('light.living').color === 'rgb(255,180,92)' && room('light.kitchen').color.startsWith('hsl(48'));
  check(`brightness sets the level (${room('light.living').level.toFixed(2)}, ${room('light.study').level})`, Math.abs(room('light.living').level - 220 / 255) < 0.01 && room('light.study').level === 1);
  check(`temperature note from its sensor (${room('light.living').note})`, room('light.living').note === '22.4°' && room('light.kitchen').note === '');
  check(`person at home sits in their room, away is out (${JSON.stringify(p.people.map((x) => x.room))})`, p.people[0].room === 'light.living' && p.people[1].room === null);

  const tap = await P(async () => {
    const f = document.getElementById('tile').shadowRoot.querySelector('cw-floorplan');
    f.shadowRoot.querySelector('[part=room][data-room="light.study"] .floor').dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await window.__wait(50); await f.updateComplete;
    return { calls: window.haCalls.slice(), on: f.rooms.find((r) => r.id === 'light.study').on };
  });
  check(`tap calls light.toggle with the room's entity (${JSON.stringify(tap.calls)})`, JSON.stringify(tap.calls) === '[["light","toggle","light.study"]]' && tap.on);

  const fl = await P(() => {
    const f = document.getElementById('tile').shadowRoot.querySelector('cw-flow');
    return { links: f.links, nodes: f.nodes };
  });
  const grid = fl.links.find((l) => l.from === 'home' || l.to === 'home' && l.from === 'grid');
  check(`negative link runs the other way (${JSON.stringify(grid)})`, grid.from === 'home' && grid.to === 'grid' && grid.value === 300);
  const n = Object.fromEntries(fl.nodes.map((x) => [x.id, x]));
  check(`node unit and value from the sensor (${n.solar.value} ${n.solar.unit}, ${n.batt.unit})`, n.solar.value >= 2400 && n.solar.unit === 'W' && n.batt.unit === '%');

  const same = await P(async () => {
    const card = document.getElementById('tile'), f = card.shadowRoot.querySelector('cw-flow');
    let sets = 0; const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), 'nodes');
    Object.defineProperty(f, 'nodes', { configurable: true, get() { return d.get.call(this); }, set(v) { sets++; d.set.call(this, v); } });
    const h = card._hass; card.hass = h; card.hass = h;
    return sets;
  });
  check(`unchanged states are not written again (${same} writes)`, same === 0);

  const zoom = await P(() => parseFloat(document.getElementById('tile').shadowRoot.querySelector('cw-floorplan').shadowRoot.querySelector('svg').style.getPropertyValue('--_zoom')));
  check(`text grows when the plan is drawn small (zoom ${zoom})`, zoom > 1.2);
}
