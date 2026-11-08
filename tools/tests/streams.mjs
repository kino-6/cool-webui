// <cw-log>, <cw-feed>, <cw-ticker>: push, limits, level filter, text-only, pause buffering, live region, motion.
export const demo = 'streams.html';
export async function run(page, check) {
  const ready = () => page.evaluate(() => Promise.all([...document.querySelectorAll('cw-log,cw-feed,cw-ticker')].map((e) => e.updateComplete)));
  await ready();

  // log
  const rows = () => page.evaluate(() => [...document.querySelector('#log').shadowRoot.querySelectorAll('[part=row]')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  await page.evaluate(() => { const l = document.querySelector('#log'); l.clear(); for (let i = 1; i <= 8; i++) l.push({ time: `19:0${i}`, level: i % 3 ? 'info' : 'warn', type: 'EVT', text: 'n' + i }); });
  await ready();
  let r = await rows();
  check(`lines="5" keeps the newest 5, newest first (${r.length}: ${r[0]})`, r.length === 5 && r[0].includes('n8') && r[4].includes('n4'));
  await page.evaluate(() => document.querySelector('#log').push([{ time: '20:00', level: 'error', type: 'X', text: '<b>bold</b>' }, { time: '20:01', level: 'info', type: 'Y', text: 'last' }]));
  await ready();
  r = await rows();
  check(`push takes an array, in order (${r[0]} / ${r[1]})`, r[0].includes('last') && r[1].includes('<b>bold</b>'));
  check('text is never HTML', await page.evaluate(() => !document.querySelector('#log').shadowRoot.querySelector('b')));
  const lvl = await page.evaluate(() => getComputedStyle(document.querySelector('#log').shadowRoot.querySelectorAll('[part=level]')[1]).color);
  check(`error level uses the warn color (${lvl})`, lvl === 'rgb(241, 139, 130)');
  await page.evaluate(() => document.querySelector('#log').push({ id: 7, time: '20:02', level: 'info', type: 'Z', text: 'first' }));
  await page.evaluate(() => document.querySelector('#log').push({ id: 7, time: '20:03', level: 'info', type: 'Z', text: 'updated' }));
  await ready();
  r = await rows();
  const zs = r.filter((x) => /infoZ(first|updated)/.test(x));
  check(`same id replaces the row (${zs.length}: ${r[0]})`, zs.length === 1 && r[0].includes('updated'));
  await page.evaluate(() => document.querySelector('#log').setAttribute('levels', 'warn,error'));
  await ready();
  r = await rows();
  check(`levels="warn,error" filters (${r.length})`, r.length >= 1 && r.every((x) => /WARN|ERROR/i.test(x)));
  await page.evaluate(() => document.querySelector('#log').removeAttribute('levels'));
  const aria = await page.evaluate(() => [document.querySelector('#log').shadowRoot.querySelector('[aria-live]').getAttribute('aria-live'), document.querySelector('#feed').shadowRoot.querySelector('[aria-live]').getAttribute('aria-live')]);
  check(`live region off by default, polite when asked (${aria})`, aria[0] === 'off' && aria[1] === 'polite');
  const lp = await page.evaluate(async () => {
    const l = document.querySelector('#log'); let applied = -1;
    l.addEventListener('cw-resume', (e) => (applied = e.detail.applied), { once: true });
    l.pause(); await l.updateComplete;
    const before = l.shadowRoot.querySelector('[part=row]').textContent;
    for (let i = 0; i < 9; i++) l.push({ time: 't', level: 'info', type: 'P', text: 'p' + i });
    await l.updateComplete;
    const same = l.shadowRoot.querySelector('[part=row]').textContent === before;
    l.resume(); await l.updateComplete;
    return { same, applied, top: l.shadowRoot.querySelector('[part=row]').textContent.includes('p8'), n: l.shadowRoot.querySelectorAll('[part=row]').length };
  });
  check(`paused log holds; resume applies up to lines (applied=${lp.applied})`, lp.same && lp.applied === 5 && lp.top && lp.n === 5);

  // feed
  const fd = await page.evaluate(async () => {
    const f = document.querySelector('#feed');
    for (let i = 1; i <= 6; i++) f.push({ who: 'アオイ', text: 'msg' + i, time: '10:0' + i });
    await f.updateComplete;
    const items = [...f.shadowRoot.querySelectorAll('[part=item]')];
    return { n: items.length, first: items[0].querySelector('[part=text]').textContent, who: items[0].querySelector('[part=who]').textContent };
  });
  check(`items="3" keeps the newest 3 (${fd.n}, ${fd.first}, ${fd.who})`, fd.n === 3 && fd.first === 'msg6' && fd.who === 'アオイ');

  // ticker
  const tk = await page.evaluate(async () => {
    const t = document.querySelector('#ticker'), c = document.querySelector('#ticker-calm');
    t.push('one'); t.push(['two', 'three']); c.push('quiet one'); c.push('quiet two');
    await t.updateComplete; await c.updateComplete;
    const x0 = t.offsetPosition;
    await new Promise((r) => setTimeout(r, 600));
    const x1 = t.offsetPosition;
    const calmText = c.shadowRoot.querySelector('[part=track]').textContent.trim();
    const calmAnim = c.shadowRoot.querySelector('[part=track]').getAnimations().length;
    t.pause(); await t.updateComplete;
    const p0 = t.offsetPosition; await new Promise((r) => setTimeout(r, 400)); const p1 = t.offsetPosition;
    t.push('four'); await t.updateComplete;
    const during = t.shadowRoot.querySelector('[part=track]').textContent.includes('four');
    t.resume(); await t.updateComplete;
    return { moved: x1 - x0, calmText, calmAnim, stopped: p1 === p0, during, after: t.shadowRoot.querySelector('[part=track]').textContent.includes('four'), text: t.shadowRoot.querySelector('[part=track]').textContent };
  });
  check(`full ticker flows (${Math.round(tk.moved)}px in 0.6 s)`, tk.moved < -10);
  check(`calm ticker stands still and shows the latest (${tk.calmText})`, tk.calmAnim === 0 && tk.calmText === 'quiet two');
  check('paused ticker stops and holds pushes', tk.stopped && !tk.during);
  check('resume adds the held text', tk.after);

  // T048
  const made = await page.evaluate(async () => {
    const mk = (tag, attrs = {}) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); document.querySelector('.grid').append(e); return e; };
    const lp = mk('cw-log', { live: 'polite' }), lv = mk('cw-log', { levels: 'WARN' }), ld = mk('cw-log'), fd = mk('cw-feed');
    for (let i = 0; i < 40; i++) ld.push({ time: 't', level: 'info', type: 'D', text: 'd' + i });
    lv.push([{ level: 'info', text: 'a' }, { level: 'warn', text: 'b' }, { level: 'Error', text: 'c' }]);
    for (let i = 0; i < 6; i++) fd.push({ who: 'x', text: 'f' + i });
    fd.push({ id: 1, who: 'x', text: 'first' }); fd.push({ id: 1, who: 'x', text: 'second' });
    await Promise.all([lp, lv, ld, fd].map((e) => e.updateComplete));
    const out = {
      polite: lp.shadowRoot.querySelector('[aria-live]').getAttribute('aria-live'),
      levels: [...lv.shadowRoot.querySelectorAll('[part=text]')].map((t) => t.textContent).join(','),
      lines: ld.shadowRoot.querySelectorAll('[part=row]').length,
      items: fd.shadowRoot.querySelectorAll('[part=item]').length,
      ids: [...fd.shadowRoot.querySelectorAll('[part=text]')].map((t) => t.textContent).filter((t) => t === 'first' || t === 'second').join(','),
    };
    let applied = -1; fd.addEventListener('cw-resume', (e) => (applied = e.detail.applied), { once: true });
    fd.pause(); await fd.updateComplete;
    const before = fd.shadowRoot.querySelector('[part=text]').textContent;
    fd.push({ who: 'y', text: 'held' }); await fd.updateComplete;
    out.feedHeld = fd.shadowRoot.querySelector('[part=text]').textContent === before;
    fd.resume(); await fd.updateComplete;
    out.feedAfter = fd.shadowRoot.querySelector('[part=text]').textContent; out.feedApplied = applied;
    [lp, lv, ld, fd].forEach((e) => e.remove());
    return out;
  });
  check(`log polite when asked (${made.polite})`, made.polite === 'polite');
  check(`levels ignore case (${made.levels})`, made.levels === 'b');
  check(`default lines 30 (${made.lines})`, made.lines === 30);
  check(`default items 4 (${made.items})`, made.items === 4);
  check(`feed same id replaces (${made.ids})`, made.ids === 'second');
  check(`paused feed holds, then applies (${made.feedAfter}, ${made.feedApplied})`, made.feedHeld && made.feedAfter === 'held' && made.feedApplied === 1);

  let speed = 0;
  for (let tries = 0; tries < 3 && !(speed < 0); tries++) {
    const a = await page.evaluate(() => document.querySelector('#ticker').offsetPosition);
    await new Promise((r) => setTimeout(r, 1000));
    speed = (await page.evaluate(() => document.querySelector('#ticker').offsetPosition)) - a;
  }
  check(`ticker speed within 25% of speed="120" (${Math.round(speed)} px/s)`, speed < -90 && speed > -150);
  const calm = await page.evaluate(async () => { const c = document.querySelector('#ticker-calm'); c.push('x'); await new Promise((r) => setTimeout(r, 400)); return c.offsetPosition; });
  check(`calm ticker offset stays 0 (${calm})`, calm === 0);
  const hold = await page.evaluate(async () => {
    const t = document.querySelector('#ticker'); t.pause(); await t.updateComplete;
    const a = t.offsetPosition; await new Promise((r) => setTimeout(r, 400));
    const b = t.offsetPosition; t.resume(); await t.updateComplete; return [a, b];
  });
  check(`paused ticker keeps its place (${hold.map(Math.round)})`, hold[0] === hold[1] && hold[0] !== 0);
}
