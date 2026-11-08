// cw-ha-card: config validation, card size, the hass-to-element mapping, skip-if-unchanged, and the look switch.
export const demo = 'ha-card.html?still';
export async function run(page, check) {
  const errs = await page.evaluate(() => {
    const c = document.createElement('cw-ha-card');
    const tryCfg = (cfg) => { try { c.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    return {
      none: tryCfg({}), kind: tryCfg({ entities: [{ entity: 'a.b', kind: 'gauge' }] }),
      bars: tryCfg({ entities: [{ entity: 'a.b', kind: 'bars' }] }), look: tryCfg({ look: 'neon', entities: [{ entity: 'a.b', kind: 'stat' }] }),
      good: tryCfg({ entities: [{ entity: 'a.b', kind: 'stat' }, { entity: 'c.d', kind: 'status' }] }), size: c.getCardSize(),
    };
  });
  check(`missing entities throws (${errs.none})`, errs.none.includes('entities'));
  check(`unknown kind throws (${errs.kind})`, errs.kind.includes('kind'));
  check(`bars without attributes throws (${errs.bars})`, errs.bars.includes('attributes'));
  check(`unknown look throws (${errs.look})`, errs.look.includes('look'));
  check(`valid config passes (${errs.good}, size ${errs.size})`, errs.good === 'ok' && errs.size >= 2);

  const read = () => page.evaluate(async () => {
    const card = document.querySelector('#tile');
    const els = [...card.shadowRoot.querySelectorAll('.rows > *')];
    await Promise.all(els.map((e) => e.updateComplete));
    const v = (e) => e.shadowRoot.querySelector('[part=value]').textContent.replace(/\s+/g, '');
    const u = (e) => e.shadowRoot.querySelector('[part=unit]')?.textContent;
    return { temp: v(els[0]), unit: u(els[0]), hum: v(els[1]), door: [els[2].state, v(els[2]), els[2].shadowRoot.querySelector('[part=since]')?.textContent.trim()], cam: els[3].state,
      title: card.shadowRoot.querySelector('cw-panel').label };
  });
  const r = await read();
  check(`stat takes the number and the unit from HA (${r.temp} ${r.unit})`, /^2[12]\.\d$/.test(r.temp) && r.unit === '°C');
  check(`title goes to the panel (${r.title})`, r.title === '居間');
  check(`locked maps to online with since (${r.door})`, r.door[0] === 'online' && r.door[1] === '施錠' && r.door[2] === '2時間14分');
  check(`unavailable maps to unknown (${r.cam})`, r.cam === 'unknown');

  const map = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [
      { entity: 'x.a', kind: 'status' }, { entity: 'x.b', kind: 'status' }, { entity: 'x.c', kind: 'status' }, { entity: 'x.d', kind: 'stat' },
      { entity: 'x.e', kind: 'bars', attributes: ['p', 'q', 'r'] }, { entity: 'x.f', kind: 'stat', unit: 'kW' } ] });
    card.hass = { states: {
      'x.a': { state: 'on', attributes: {} }, 'x.b': { state: 'idle', attributes: {} }, 'x.c': { state: 'heat', attributes: {} },
      'x.d': { state: 'unknown', attributes: {} }, 'x.e': { state: '1', attributes: { p: 3, q: 'n/a', r: '7' } }, 'x.f': { state: '2', attributes: { unit_of_measurement: 'W' } } } };
    const els = [...card.shadowRoot.querySelectorAll('.rows > *')];
    await Promise.all(els.map((e) => e.updateComplete));
    const out = { st: els.slice(0, 3).map((e) => e.state).join(','), d: els[3].shadowRoot.querySelector('[part=value]').textContent.trim(),
      bars: els[4].data.map((b) => b.label + '=' + b.value).join(','), unit: els[5].shadowRoot.querySelector('[part=unit]').textContent };
    card.remove();
    return out;
  });
  check(`state words map (${map.st})`, map.st === 'online,standby,online');
  const words = await page.evaluate(async () => {
    const table = { on: 'online オン', home: 'online 在宅', open: 'online 開', playing: 'online 再生中', locked: 'online 施錠',
      off: 'standby オフ', not_home: 'standby 外出', closed: 'standby 閉', idle: 'standby 待機', paused: 'standby 一時停止',
      unlocked: 'offline 解錠', jammed: 'offline 故障', unknown: 'unknown 不明', unavailable: 'unknown 不明', heat: 'online 稼働中' };
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: Object.keys(table).map((w) => ({ entity: 'w.' + w, kind: 'status' })) });
    card.hass = { states: Object.fromEntries(Object.keys(table).map((w) => ['w.' + w, { state: w, attributes: {} }])) };
    const els = [...card.shadowRoot.querySelectorAll('cw-status')];
    await Promise.all(els.map((e) => e.updateComplete));
    const got = Object.keys(table).map((w, i) => [w, els[i].state + ' ' + els[i].shadowRoot.querySelector('[part=value]').textContent.trim(), table[w]]);
    card.remove();
    return got;
  });
  for (const [w, got, want] of words) check(`word ${w} -> ${got}`, got === want);
  const missing = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'gone.a', kind: 'status' }, { entity: 'gone.b', kind: 'stat' }, { entity: 'x.n', kind: 'bars', attributes: ['a', 'b', 'c'] }, { entity: 'x.door', kind: 'status' }] });
    let threw = false;
    try {
      card.hass = { states: { 'x.n': { state: '1', attributes: { a: null, b: '', c: 4 } }, 'x.door': { state: 'locked', last_changed: new Date(Date.now() - 3600e3).toISOString(), attributes: {} } } };
    } catch { threw = true; }
    const els = [...card.shadowRoot.querySelectorAll('.rows > *')];
    await Promise.all(els.map((e) => e.updateComplete));
    const before = els[3].shadowRoot.querySelector('[part=since]')?.textContent.trim();
    card.hass = { states: { 'x.n': { state: '1', attributes: { a: null, b: '', c: 4 } }, 'x.door': { state: 'unavailable', attributes: {} } } };
    await els[3].updateComplete;
    const out = { threw, a: els[0].state, b: els[1].shadowRoot.querySelector('[part=value]').textContent.trim(), bars: els[2].data.map((r) => r.label).join(','), before, after: els[3].shadowRoot.querySelector('[part=since]')?.textContent ?? '' };
    card.remove();
    return out;
  });
  check(`missing entity: no throw, unknown and a dash (${missing.threw}, ${missing.a}, ${missing.b})`, !missing.threw && missing.a === 'unknown' && missing.b === '—');
  check(`missing attribute values are skipped (${missing.bars})`, missing.bars === 'c');
  check(`missing state clears the elapsed time (${missing.before} -> '${missing.after}')`, missing.before === '1時間0分' && missing.after === '');
  const unchanged = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'u.s', kind: 'status' }, { entity: 'u.b', kind: 'bars', attributes: ['p'] }] });
    const h = (st, p) => ({ states: { 'u.s': { state: st, last_changed: '2026-10-30T00:00:00Z', attributes: {} }, 'u.b': { state: '1', attributes: { p } } } });
    card.hass = h('on', 1);
    const els = [...card.shadowRoot.querySelectorAll('.rows > *')];
    await Promise.all(els.map((e) => e.updateComplete));
    const applied = [];
    for (const e of els) e.addEventListener('cw-resume', (ev) => applied.push(e.localName + ':' + ev.detail.applied));
    const round = async (hass) => { for (const e of els) { e.pause(); await e.updateComplete; } card.hass = hass; for (const e of els) { e.resume(); await e.updateComplete; } };
    await round(h('on', 1));
    await round(h('off', 2));
    card.remove();
    return applied.join(',');
  });
  check(`unchanged status and bars are not written again (${unchanged})`, unchanged === 'cw-status:0,cw-bars:0,cw-status:2,cw-bars:1');
  const order = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.hass = { states: { 'o.t': { state: '7', attributes: {} } } };
    card.setConfig({ entities: [{ entity: 'o.t', kind: 'stat', label: '温度' }] });
    const el = card.shadowRoot.querySelector('cw-stat'); await el.updateComplete;
    const out = [el.shadowRoot.querySelector('[part=value]').textContent.trim(), el.shadowRoot.querySelector('[part=label]')?.textContent];
    card.remove();
    return out;
  });
  check(`order: hass before setConfig still shows the value (${order[0]})`, order[0] === '7');
  check(`label reaches the element (${order[1]})`, order[1] === '温度');
  check('registry: the card is listed in window.customCards once', await page.evaluate(() => window.customCards.filter((c) => c.type === 'cw-ha-card').length === 1));
  check('motion is checked', await page.evaluate(() => { try { document.createElement('cw-ha-card').setConfig({ motion: 'ful', entities: [{ entity: 'a.b', kind: 'stat' }] }); return false; } catch (e) { return e.message.includes('motion'); } }));
  const sizes = await page.evaluate(() => ['tile', 'tile2', 'full', 'glass', 'glass2'].map((id) => { const c = document.getElementById(id); return [id, c.getCardSize(), Math.round(c.getBoundingClientRect().height / 50 * 10) / 10]; }));
  for (const [id, size, h] of sizes) check(`card size matches the height (${id}: ${size} vs ${h})`, Math.abs(size - h) <= 1);
  check(`unknown stat shows a dash (${map.d})`, map.d === '—');
  check(`bars take the listed numeric attributes (${map.bars})`, map.bars === 'p=3,r=7');
  check(`configured unit wins over HA's (${map.unit})`, map.unit === 'kW');

  const skip = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'x.t', kind: 'stat' }] });
    const h = (v) => ({ states: { 'x.t': { state: v, attributes: {} } } });
    card.hass = h('1');
    const el = card.shadowRoot.querySelector('cw-stat'); await el.updateComplete;
    let applied = []; el.addEventListener('cw-resume', (e) => applied.push(e.detail.applied));
    el.pause(); await el.updateComplete; card.hass = h('1'); el.resume(); await el.updateComplete;
    el.pause(); await el.updateComplete; card.hass = h('2'); el.resume(); await el.updateComplete;
    card.remove();
    return applied.join(',');
  });
  check(`an unchanged state is not written again (${skip})`, skip === '0,1');

  const look = await page.evaluate(() => {
    const f = (id) => getComputedStyle(document.getElementById(id).shadowRoot.querySelector('cw-panel').shadowRoot.querySelector('[part=frame]'));
    const accent = getComputedStyle(document.getElementById('tile').shadowRoot.querySelector('cw-panel')).getPropertyValue('--cw-signal').trim();
    return { accent, tile: f('tile').borderTopLeftRadius + ' ' + f('tile').backgroundColor, glass: f('glass').borderTopLeftRadius + ' ' + f('glass').backdropFilter };
  });
  check(`look: tile (${look.tile}, accent ${look.accent})`, look.tile === '16px rgb(29, 29, 29)' && look.accent === '#4A90C2');
  check(`look: glass (${look.glass})`, look.glass.startsWith('20px blur(12px)'));
  check('the fonts of both looks are linked once each', await page.evaluate(() => {
    const links = [...document.head.querySelectorAll('link[href*="fonts.googleapis.com"]')].map((l) => l.href);
    return links.filter((h) => h.includes('family=Inter')).length === 1 && links.filter((h) => h.includes('Hanken')).length === 1;
  }));
  check('motion: full reaches the elements', await page.evaluate(() => document.querySelector('#full').shadowRoot.querySelector('cw-stat').shadowRoot.querySelectorAll('.roll').length > 0));
}
