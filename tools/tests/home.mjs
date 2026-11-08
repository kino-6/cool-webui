// demo/home.html: the prototype's home rebuilt from cw- elements only, in all four look x motion combinations.
export const demo = 'home.html?theme=tile&motion=calm';
const combos = [['tile', 'calm'], ['tile', 'full'], ['glass', 'calm'], ['glass', 'full']];
export async function run(page, check) {
  for (const [theme, motion] of combos) {
    const url = page.url().split('?')[0] + `?theme=${theme}&motion=${motion}`;
    await page.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 1200));
    const r = await page.evaluate(() => {
      const stage = document.querySelector('cw-stage');
      const kinds = new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.startsWith('cw-')));
      const roll = [...document.querySelectorAll('cw-stat')].some((s) => s.shadowRoot.querySelector('.roll'));
      const stats = [...document.querySelectorAll('cw-screen[name=home] cw-stat')].map((s) => s.getAttribute('aria-label'));
      return { motion: stage.dataset.motion, aura: !!stage.shadowRoot.querySelector('cw-background'), kinds: [...kinds].sort().join(','), roll,
        dash: stats.filter((a) => !a || a.includes('—')).length, n: stats.length, log: document.querySelector('cw-log').shadowRoot.querySelectorAll('[part=row]').length,
        theme: document.documentElement.dataset.theme };
    });
    const tag = `${theme}/${motion}`;
    check(`${tag}: the theme and motion apply (${r.theme}, ${r.motion})`, r.theme === theme && r.motion === motion);
    check(`${tag}: uses the parts (${r.kinds})`, ['cw-stage', 'cw-screens', 'cw-panel', 'cw-stat', 'cw-status', 'cw-bars', 'cw-chart', 'cw-log', 'cw-clock', 'cw-ticker'].every((k) => r.kinds.includes(k)));
    check(`${tag}: every home number has a value (${r.n - r.dash}/${r.n})`, r.n >= 4 && r.dash === 0);
    check(`${tag}: the event log has lines (${r.log})`, r.log >= 3);
    check(`${tag}: aura and rolling digits only in full (${r.aura}, ${r.roll})`, r.aura === (motion === 'full') && r.roll === (motion === 'full'));
  }
  const sw = await page.evaluate(async () => {
    const sc = document.querySelector('cw-screens'); sc.show('energy');
    await new Promise((r) => setTimeout(r, 900));
    return [sc.current, getComputedStyle(document.querySelector('cw-screen[name=energy]')).visibility];
  });
  check(`the energy screen opens (${sw})`, sw[0] === 'energy' && sw[1] === 'visible');
  const onText = await page.evaluate(() => {
    const p = [...document.querySelectorAll('#rooms cw-panel')].find((x) => x.on);
    const v = getComputedStyle(p.querySelector('cw-stat').shadowRoot.querySelector('[part=value]')).color;
    return [v, getComputedStyle(p.shadowRoot.querySelector('[part=frame]')).color];
  });
  check(`numbers on a lit tile take the on-face text colour (${onText})`, onText[0] === onText[1]);
  const lights = await page.evaluate(() => document.querySelector('cw-stage').lights.length);
  check(`the stage gets one light per lit room (${lights})`, lights >= 1);
}
