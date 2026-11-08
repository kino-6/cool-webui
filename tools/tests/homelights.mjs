// The home sample's lighting screen: one <cw-switch> per room in both layouts; presses and the slider change the room.
export const demo = 'home.html?theme=tile&still';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const go = (page) => page.evaluate(async () => {
  [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'lights').click();
  await new Promise((r) => setTimeout(r, 500));
  const scr = document.querySelector('cw-screens'), sws = [...document.querySelectorAll('#switches cw-switch')];
  await Promise.all(sws.map((s) => s.updateComplete));
  const shown = sws.filter((s) => s.getBoundingClientRect().width > 150 && s.checkVisibility());
  return { current: scr.current, n: sws.length, shown: shown.length, labels: sws.map((s) => s.label).join(','), on: sws.filter((s) => s.on).length };
});

export async function run(page, check) {
  const base = page.url().split('?')[0];
  for (const [tag, query] of [['quiet', 'theme=tile&still'], ['bold', 'variant=bold&theme=game&still']]) {
    await page.goto(`${base}?${query}`, { waitUntil: 'load' });
    await wait(300);
    const s = await go(page);
    check(`${tag}: the 照明 button opens six room switches (${JSON.stringify(s)})`, s.current === 'lights' && s.n === 6 && s.shown === 6 && s.labels === '居間,台所,書斎,寝室,浴室,玄関');
    const lit = await page.evaluate(() => (document.querySelector('cw-floorplan')?.rooms ?? [...document.querySelectorAll('#rooms cw-panel')]).filter((r) => r.on).length);
    check(`${tag}: the switches agree with the lit rooms (${s.on} / ${lit})`, s.on === lit && lit >= 1);

    // press the study (off): it lights in the room view and the log says so
    const press = await page.evaluate(async () => {
      const sw = [...document.querySelectorAll('#switches cw-switch')].find((x) => x.label === '書斎');
      sw.shadowRoot.querySelector('[part=face]').click();
      await new Promise((r) => setTimeout(r, 50));
      const plan = document.querySelector('cw-floorplan');
      const room = plan ? plan.rooms.find((r) => r.name === '書斎').on : [...document.querySelectorAll('#rooms cw-panel')].find((p) => p.label === '書斎').on;
      const log = document.querySelector('#log');
      return { on: sw.on, room, log: log.shadowRoot.textContent.includes('書斎 を点灯') };
    });
    check(`${tag}: a press lights the room and logs it (${JSON.stringify(press)})`, press.on && press.room && press.log);

    // the slider sets the room's brightness
    const slide = await page.evaluate(async () => {
      const sw = [...document.querySelectorAll('#switches cw-switch')].find((x) => x.label === '居間');
      const r = sw.shadowRoot.querySelector('input[type=range]');
      r.value = '25'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change'));
      await new Promise((res) => setTimeout(res, 50));
      const plan = document.querySelector('cw-floorplan');
      const level = plan ? plan.rooms.find((x) => x.name === '居間').level : [...document.querySelectorAll('#rooms cw-panel')].find((p) => p.label === '居間').querySelector('cw-stat').value;
      return { level, swLevel: sw.level };
    });
    check(`${tag}: the slider sets the room's brightness (${JSON.stringify(slide)})`, Math.abs(slide.swLevel - 0.25) < 1e-9 && (slide.level === 25 || Math.abs(slide.level - 0.25) < 1e-9));
  }

  // bold in full motion: the screens take turns, but not away from the lighting screen
  await page.goto(`${base}?variant=bold&theme=glass&motion=full&swapms=300`, { waitUntil: 'load' });
  await wait(300);
  await go(page);
  await wait(1200);
  const stay = await page.evaluate(() => document.querySelector('cw-screens').current);
  check(`bold: the automatic turns leave the lighting screen alone (${stay})`, stay === 'lights');
}
