// <cw-area>: one room's temperature, humidity, lights and motion; the lights button, pause, motion, narrow, look.
export const demo = 'area.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}]`)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const shown = (p) => { const x = r.querySelector(`[part=${p}]`); return !!x && getComputedStyle(x).display !== 'none'; };
  return { label: t('label'), temp: t('temperature'), humidity: t('humidity'), lights: t('lights'), lightsLabel: r.querySelector('[part=lights]')?.getAttribute('aria-label') ?? null,
    motion: t('motion'), lit: e.hasAttribute('data-lit'), moving: e.hasAttribute('data-moving'), aria: e.getAttribute('aria-label'), humidityShown: shown('humidity'),
    pulse: r.querySelector('[part=motion] i') ? getComputedStyle(r.querySelector('[part=motion] i')).animationName : null };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const a = await read(page, '#living');
  check(`name, temperature to one decimal, humidity (${a.label}, ${a.temp}, ${a.humidity})`, a.label === '居間' && a.temp === '22.4°C' && a.humidity === '湿度 48%');
  check(`lights on of all, and motion (${a.lights}, ${a.motion})`, a.lights === '照明 2/3 点灯' && a.motion === '動きあり' && a.lit && a.moving);
  check(`a group read in one line (${a.aria})`, a.aria === '居間 22.4°C 湿度 48% 照明 2/3 点灯 動きあり');
  check(`with a light on, the button turns them off (${a.lightsLabel})`, a.lightsLabel === '居間の照明を消す');
  const b = await read(page, '#bed');
  check(`no light on: the button turns them on; no motion (${b.lightsLabel}, ${b.motion}, ${b.lit})`, b.lightsLabel === '寝室の照明を点ける' && b.motion === '動きなし' && !b.lit && !b.moving);
  const h = await read(page, '#hall');
  check(`a negative temperature with a true minus; no humidity, no motion sensor (${h.temp}, ${h.humidity}, ${h.motion})`, h.temp === '−1.5°C' && h.humidity === null && h.motion === null);
  const n = await read(page, '#none');
  check(`no values: a dash and no lights button (${n.temp}, ${n.lights}, ${n.aria})`, n.temp === '—°C' && n.lights === null && n.aria === '物置');
  const nr = await read(page, '#narrow');
  check(`a narrow box hides the humidity (${nr.humidityShown}; wide ${a.humidityShown})`, nr.humidityShown === false && a.humidityShown === true);
  check(`calm: the motion mark is still (${a.pulse})`, a.pulse === 'none');
  const press = await page.evaluate(async () => {
    const out = [];
    for (const id of ['living', 'bed']) {
      const e = document.getElementById(id); let sent;
      e.addEventListener('cw-lights', (ev) => { sent = ev.detail.on; }, { once: true });
      e.shadowRoot.querySelector('[part=lights]').click(); await e.updateComplete;
      out.push([sent, e.shadowRoot.querySelector('[part=lights]').textContent.trim()]);
    }
    return out;
  });
  check(`pressing turns the living room off and the bedroom on, at once (${JSON.stringify(press)})`, JSON.stringify(press) === JSON.stringify([[false, '照明 0/3 点灯'], [true, '照明 2/2 点灯']]));
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.getElementById('hall');
    s.pause(); await s.updateComplete;
    e.now = { temperature: 5, lightsOn: 0 };
    e.shadowRoot.querySelector('[part=lights]').click(); await e.updateComplete;
    const during = e.shadowRoot.querySelector('[part=temperature]').textContent;
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { during, after: e.shadowRoot.querySelector('[part=temperature]').textContent, lights: e.shadowRoot.querySelector('[part=lights]').textContent.trim() };
  });
  check(`paused: new values wait; a press beats the waiting count (${JSON.stringify(held)})`, held.during === '−1.5°C' && held.after === '5.0°C' && held.lights === '照明 0/1 点灯');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#living'), fb = await read(page, '#bed');
  check(`full: the motion mark pulses while someone moves, not otherwise (${f.pulse}, ${fb.pulse})`, f.pulse === 'pulse' && fb.pulse === 'none');
  const fp = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.getElementById('living'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=motion] i')).animationName; });
  check(`full but paused: the mark stands still (${fp})`, fp === 'none');
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  const g = await page.evaluate(() => getComputedStyle(document.getElementById('living').shadowRoot.querySelector('[part=temperature]')).fontFamily);
  check(`game: the temperature uses the wide display face (${g})`, /^Archivo/.test(g));
  const wins = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.getElementById('bed');
    e.now = { lightsOn: 0, lights: 2 }; await e.updateComplete;
    s.pause(); await s.updateComplete;
    e.now = { lightsOn: 1 };
    e.shadowRoot.querySelector('[part=lights]').click(); await e.updateComplete;
    s.resume(); await s.updateComplete; await e.updateComplete;
    return e.now.lightsOn;
  });
  check(`holes: a press while paused beats a waiting count that differs (${wins})`, wins === 2);
}
