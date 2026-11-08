// <cw-background kind="aura">: when the stage makes one, the frame cap, still drawing outside full motion, pause, and light colours.
export const demo = 'background.html';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function run(page, check) {
  await page.evaluate(() => Promise.all([...document.querySelectorAll('cw-stage')].map((s) => s.updateComplete)));
  await wait(150);
  const made = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('cw-stage')].map((s) => [s.id, !!s.shadowRoot.querySelector('cw-background')])));
  check(`full + auto makes an aura (${made.full})`, made.full === true);
  check(`calm + auto makes none (${made.calm})`, made.calm === false);
  check(`bg="aura" makes one even when calm (${made.aura})`, made.aura === true);
  check(`bg="none" and bg="plain" make none (${made.none}, ${made.plain})`, made.none === false && made.plain === false);

  const frames = (id) => page.evaluate((i) => +(document.getElementById(i).shadowRoot?.querySelector('cw-background') ?? document.getElementById(i)).dataset.frames, id);
  const f0 = await frames('full'); await wait(1000); const f1 = await frames('full');
  check(`full motion keeps drawing, capped at fps=10 (${f1 - f0} frames in 1 s)`, f1 - f0 >= 4 && f1 - f0 <= 12);
  const a0 = await frames('aura'); await wait(400); const a1 = await frames('aura');
  check(`calm aura draws once and stops (${a0} -> ${a1})`, a0 >= 1 && a1 === a0);

  await page.evaluate(async () => { const s = document.getElementById('full'); s.pause(); await s.updateComplete; });
  const p0 = await frames('full'); await wait(400); const p1 = await frames('full');
  check(`paused stage stops the aura (${p0} -> ${p1})`, p1 === p0);
  await page.evaluate(async () => { const s = document.getElementById('full'); s.resume(); await s.updateComplete; });
  await wait(400);
  check('resume restarts it', (await frames('full')) > p1);

  const px = await page.evaluate(async () => {
    const s = document.getElementById('aura');
    s.lights = [{ color: '#ff0000', level: 1 }];
    await new Promise((r) => setTimeout(r, 120));
    const c = s.shadowRoot.querySelector('cw-background').shadowRoot.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let r = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; b += d[i + 2]; }
    return { r, b };
  });
  check(`lights colour the aura (red ${px.r} > blue ${px.b})`, px.r > px.b * 3 && px.r > 0);

  const alone = await page.evaluate(async () => { const b = document.getElementById('alone'); const f = +b.dataset.frames; await new Promise((r) => setTimeout(r, 400)); return [f, +b.dataset.frames]; });
  check(`a background outside any stage follows its own motion="full" (${alone})`, alone[1] > alone[0]);
  await page.evaluate(() => document.getElementById('full').setAttribute('motion', 'calm'));
  await wait(150);
  check('switching the stage to calm removes the auto aura', await page.evaluate(() => !document.getElementById('full').shadowRoot.querySelector('cw-background')));

  // T048
  const sum = (id) => page.evaluate((i) => {
    const c = document.getElementById(i).shadowRoot.querySelector('cw-background').shadowRoot.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let r = 0; for (let k = 0; k < d.length; k += 4) r += d[k] + d[k + 1] + d[k + 2]; return r;
  }, id);
  const theme = await page.evaluate(async () => {
    const s = document.getElementById('calm'); s.style.setProperty('--cw-background-kind', 'aura'); s.requestUpdate(); await s.updateComplete;
    const made = !!s.shadowRoot.querySelector('cw-background');
    s.style.removeProperty('--cw-background-kind'); s.requestUpdate(); await s.updateComplete;
    return made && !s.shadowRoot.querySelector('cw-background');
  });
  check('theme kind decides the calm background (--cw-background-kind: aura)', theme);
  await page.evaluate(async () => { const s = document.getElementById('full'); s.setAttribute('motion', 'full'); await s.updateComplete; });
  await wait(300);
  const g0 = await frames('full'); await wait(1000); const g1 = await frames('full');
  check(`fps=10 gives 8 to 11 frames in 1 s (${g1 - g0})`, g1 - g0 >= 8 && g1 - g0 <= 11);
  await page.evaluate(async () => { const s = document.getElementById('full'); s.pause(); await s.updateComplete; });
  await wait(300);
  const kept = await sum('full');
  check(`paused keeps the last frame (${kept})`, kept > 0);
  await page.evaluate(async () => { const s = document.getElementById('full'); s.resume(); await s.updateComplete; });
  await page.evaluate(() => { document.getElementById('aura').lights = [{ color: '#ff0000', level: 0.1 }]; });
  await wait(150);
  const weak = await sum('aura');
  await page.evaluate(() => { document.getElementById('aura').lights = [{ color: '#ff0000', level: 1 }]; });
  await wait(150);
  const strong = await sum('aura');
  check(`level sets strength (${weak} < ${strong})`, strong > weak * 1.3);
  const bgEl = await page.evaluateHandle(() => document.getElementById('full').shadowRoot.querySelector('cw-background'));
  await page.evaluate(async () => { const s = document.getElementById('full'); s.setAttribute('motion', 'calm'); await s.updateComplete; });
  const r0 = await bgEl.evaluate((b) => +b.dataset.frames); await wait(400); const r1 = await bgEl.evaluate((b) => +b.dataset.frames);
  check(`removed background stops drawing (${r0} -> ${r1})`, r0 === r1 && !(await bgEl.evaluate((b) => b.isConnected)));
  await page.evaluate(async () => { const s = document.getElementById('full'); s.setAttribute('motion', 'full'); await s.updateComplete; });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await wait(300);
  const rm = await page.evaluate(() => !document.getElementById('full').shadowRoot.querySelector('cw-background'));
  check('reduced motion makes no auto aura', rm);
  const q0 = await frames('aura'); await wait(400); const q1 = await frames('aura');
  check(`reduced motion draws once for bg="aura" (${q0} -> ${q1})`, q0 >= 1 && q0 === q1);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
}
