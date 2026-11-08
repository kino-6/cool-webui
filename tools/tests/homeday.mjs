// The stage scales the page, so the rail check compares each button with its own text, not with pixels.
// The home sample's day screen: weather, the family's plans and the air conditioner, in both layouts.
export const demo = 'home.html?theme=tile&still';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;

export async function run(page, check) {
  const base = page.url().split('?')[0];
  for (const [tag, query] of [['quiet', 'theme=tile&still'], ['bold', 'variant=bold&theme=game&still']]) {
    await page.goto(`${base}?${query}`, { waitUntil: 'load' });
    await page.wait(300);
    const s = await page.evaluate(async () => {
      [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'day').click();
      await window.__wait(900);
      const wx = document.querySelector('#wx'), ag = document.querySelector('#agenda'), th = document.querySelector('#thermo');
      const seen = (e) => e.getBoundingClientRect().width > 200 && e.checkVisibility();
      return { current: document.querySelector('cw-screens').current, shown: [wx, ag, th].map(seen),
        word: wx.shadowRoot.querySelector('[part=word]').textContent.trim(), days: wx.shadowRoot.querySelectorAll('[part=day]').length,
        now: ag.shadowRoot.querySelector('[part=event][data-now] [part=title]')?.textContent.trim(), room: th.value, living: document.querySelector('cw-floorplan')?.rooms[0].note ?? null };
    });
    check(`${tag}: the 今日 button opens weather, plans and the air conditioner (${JSON.stringify(s)})`, s.current === 'day' && s.shown.every(Boolean) && s.word === '晴れ時々くもり' && s.days === 5 && s.now === 'オンラインの会議');
    check(`${tag}: the dial shows the living-room temperature (${s.room})`, Number.isFinite(s.room) && s.room > 15 && s.room < 30);
  }
  const press = await page.evaluate(async () => {
    const th = document.querySelector('#thermo');
    th.shadowRoot.querySelector('[part=up]').click(); await th.updateComplete;
    await window.__wait(50);
    return { target: th.target, log: document.querySelector('#log').shadowRoot.textContent.includes('居間 23.0°C に設定') };
  });
  check(`the + button raises the set point and the log says so (${JSON.stringify(press)})`, press.target === 23 && press.log);
  await page.goto(`${base}?variant=bold&theme=glass&motion=full&swapms=300`, { waitUntil: 'load' });
  await page.wait(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'day').click());
  await page.wait(1200);
  check(`bold: the automatic turns leave the day screen alone (${await page.evaluate(() => document.querySelector('cw-screens').current)})`, (await page.evaluate(() => document.querySelector('cw-screens').current)) === 'day');
  const nav = await page.evaluate(() => { const n = document.querySelector('.rail nav'), b = [...n.querySelectorAll('button')]; return b.every((x) => x.getBoundingClientRect().bottom <= n.getBoundingClientRect().bottom + 0.5 && x.scrollHeight <= x.clientHeight + 1); });
  check(`bold: five screen buttons fit the rail (${nav})`, nav);
}
