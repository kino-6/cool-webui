// <cw-screens>: first screen by default, show(name), events, keys only with the keys attribute, transitions by motion level.
export const demo = 'screens.html';
const visible = (page) => page.evaluate(() => [...document.querySelectorAll('cw-screen')].filter((s) => getComputedStyle(s).visibility === 'visible').map((s) => s.name).join(','));
export async function run(page, check) {
  await page.evaluate(() => document.querySelector('#sc').updateComplete);
  check(`the first screen shows by default (${await visible(page)})`, (await visible(page)) === 'home');
  const ev = await page.evaluate(async () => {
    const sc = document.querySelector('#sc'); const log = [];
    sc.addEventListener('cw-screen-change', (e) => log.push(e.detail.from + '>' + e.detail.to));
    const a = sc.show('energy'); const b = sc.show('nope'); const c = sc.show('energy');
    await sc.updateComplete;
    return { a, b, c, log: log.join(','), current: sc.current };
  });
  check(`calm: show() switches at once (${ev.current}, ${ev.log})`, ev.a && ev.current === 'energy' && ev.log === 'home>energy');
  check('unknown and current names are ignored', !ev.b && !ev.c);
  check(`only the current screen is visible (${await visible(page)})`, (await visible(page)) === 'energy');
  const fade = await page.evaluate(() => document.querySelector('cw-screen[name=energy]').getAnimations().length);
  check(`calm fades the new screen in (${fade})`, fade === 1);

  await page.keyboard.press('1');
  await page.evaluate(() => document.querySelector('#sc').updateComplete);
  check('digit keys switch when keys is set', (await page.evaluate(() => document.querySelector('#sc').current)) === 'home');
  await page.evaluate(() => document.querySelector('#sc').removeAttribute('keys'));
  await page.keyboard.press('2');
  check('without keys, digits do nothing', (await page.evaluate(() => document.querySelector('#sc').current)) === 'home');
  await page.evaluate(() => document.querySelector('#sc').setAttribute('keys', ''));

  const full = await page.evaluate(async () => {
    const st = document.querySelector('#board'); st.setAttribute('motion', 'full'); await st.updateComplete;
    const sc = document.querySelector('#sc'); await sc.updateComplete;
    sc.show('energy');
    const wipe = sc.shadowRoot.querySelector('.wipe').getAnimations().length;
    const early = sc.current;
    await new Promise((r) => setTimeout(r, 500));
    return { wipe, early, late: sc.current };
  });
  check(`full: a wipe plays and the screens swap under it (${full.wipe}, ${full.early} -> ${full.late})`, full.wipe === 1 && full.early === 'home' && full.late === 'energy');

  const tint = await page.evaluate(async () => {
    const st = document.querySelector('#board'), sc = document.querySelector('#sc');
    st.lights = [{ color: 'rgb(10, 200, 30)', level: 0.3 }, { color: 'rgb(250, 120, 10)', level: 0.9 }];
    sc.show(sc.current === 'home' ? 'energy' : 'home');
    const bg = sc.shadowRoot.querySelector('.wipe').style.background;
    await new Promise((r) => setTimeout(r, 750));
    return bg;
  });
  check(`full: the wipe takes the brightest light's colour (${tint.slice(0, 50)})`, tint.includes('rgb(250, 120, 10)'));

  const off = await page.evaluate(async () => {
    const st = document.querySelector('#board'); st.setAttribute('motion', 'off'); await st.updateComplete;
    const sc = document.querySelector('#sc'); await sc.updateComplete;
    sc.show('home');
    return { current: sc.current, anims: sc.shadowRoot.querySelector('.wipe').getAnimations().length + document.querySelector('cw-screen[name=home]').getAnimations().length };
  });
  check(`off: instant, no animation (${off.current}, ${off.anims})`, off.current === 'home' && off.anims === 0);
  const tn = await page.evaluate(async () => {
    const st = document.querySelector('#board'); st.setAttribute('motion', 'full'); await st.updateComplete;
    const sc = document.querySelector('#sc'); sc.transition = 'none'; await sc.updateComplete;
    sc.show('energy'); const r = sc.current; sc.transition = undefined; return r;
  });
  check(`transition="none" switches at once even in full (${tn})`, tn === 'energy');

  // T049
  const cur = await page.evaluate(async () => {
    const st = document.querySelector('#board'); st.setAttribute('motion', 'calm'); st.lights = []; await st.updateComplete;
    const box = document.createElement('div'); box.innerHTML = '<cw-screens current="b"><cw-screen name="a">A</cw-screen><cw-screen name="b">B</cw-screen></cw-screens>';
    st.append(box);
    const sc = box.firstElementChild; await sc.updateComplete; await new Promise((r) => setTimeout(r, 50));
    const vis = () => [...sc.querySelectorAll('cw-screen')].filter((x) => getComputedStyle(x).visibility === 'visible').map((x) => x.getAttribute('name')).join(',');
    const first = vis();
    sc.setAttribute('current', 'a'); await sc.updateComplete;
    const later = vis();
    const box2 = document.createElement('div'); box2.innerHTML = '<cw-screens><cw-screen name="x">X</cw-screen><cw-screen name="y">Y</cw-screen></cw-screens>';
    st.append(box2); const sc2 = box2.firstElementChild; await sc2.updateComplete; await new Promise((r) => setTimeout(r, 50));
    const def = sc2.current;
    box.remove(); box2.remove();
    return { first, later, def };
  });
  check(`current attribute picks the screen (written: ${cur.first}, set later: ${cur.later})`, cur.first === 'b' && cur.later === 'a');
  check(`children at once: the first is the default (${cur.def})`, cur.def === 'x');

  const last = await page.evaluate(async () => {
    const st = document.querySelector('#board'); st.setAttribute('motion', 'full'); await st.updateComplete;
    const sc = document.querySelector('#sc'); sc.current = 'home'; await sc.updateComplete;
    sc.show('energy'); const back = sc.show('home');
    await new Promise((r) => setTimeout(r, 600));
    return [back, sc.current];
  });
  check(`last show wins during a wipe (${last})`, last[0] === true && last[1] === 'home');

  const keys = await page.evaluate(() => {
    const sc = document.querySelector('#sc'); sc.transition = 'none'; sc.current = 'home';
    const fire = (target, init) => target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, ...init }));
    const input = document.createElement('input'); const ed = document.createElement('div'); ed.contentEditable = 'true';
    document.body.append(input, ed);
    fire(input, { key: '2' }); const a = sc.current;
    fire(ed, { key: '2' }); const b = sc.current;
    fire(document.body, { key: '2', ctrlKey: true }); fire(document.body, { key: '2', metaKey: true }); fire(document.body, { key: '2', altKey: true }); const c = sc.current;
    fire(document.body, { key: '2' }); const d = sc.current;
    input.remove(); ed.remove(); sc.transition = undefined;
    return { a, b, c, d };
  });
  check(`digits in an input do nothing (${keys.a})`, keys.a === 'home');
  check(`digits in contenteditable do nothing (${keys.b})`, keys.b === 'home');
  check(`modifier keys do nothing (${keys.c})`, keys.c === 'home');
  check(`key 2 picks the second screen (${keys.d})`, keys.d === 'energy');

  const order = await page.evaluate(async () => {
    const st = document.querySelector('#board'), sc = document.querySelector('#sc');
    st.lights = [{ color: 'rgb(250, 120, 10)', level: 0.9 }, { color: 'rgb(10, 200, 30)', level: 0.3 }];
    sc.show(sc.current === 'home' ? 'energy' : 'home');
    const bg = sc.shadowRoot.querySelector('.wipe').style.background;
    await new Promise((r) => setTimeout(r, 330));
    const op = +getComputedStyle(sc.shadowRoot.querySelector('.wipe')).opacity;
    await new Promise((r) => setTimeout(r, 500));
    st.lights = [];
    return { bg, op };
  });
  check(`brightest regardless of order (${order.bg.slice(0, 44)})`, order.bg.includes('rgb(250, 120, 10)'));
  check(`wipe is visible mid-way (opacity ${order.op.toFixed(2)})`, order.op > 0.5);

  const fade2 = await page.evaluate(async () => {
    const st = document.querySelector('#board'); st.setAttribute('motion', 'calm'); await st.updateComplete;
    const sc = document.querySelector('#sc'); await sc.updateComplete;
    const to = sc.current === 'home' ? 'energy' : 'home'; sc.show(to);
    const a = document.querySelector(`cw-screen[name=${to}]`).getAnimations()[0];
    const k = a.effect.getKeyframes();
    return { d: a.effect.getTiming().duration, from: k[0].opacity, to: k.at(-1).opacity };
  });
  check(`calm fade is 0 to 1 in 200ms (${fade2.from} -> ${fade2.to}, ${fade2.d}ms)`, fade2.d === 200 && +fade2.from === 0 && +fade2.to === 1);
}
