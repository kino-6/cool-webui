// <cw-timer>: the time left counts down to its end, paused and idle stand still, it finishes once, pause, motion, look.
export const demo = 'timer.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); e.requestUpdate(); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}]`)?.textContent.trim() ?? null;
  const fill = r.querySelector('[part=fill]');
  return { time: t('time'), state: t('state'), label: t('label'), host: e.getAttribute('state'), aria: e.getAttribute('aria-label'), role: e.getAttribute('role'),
    frac: fill ? Math.round(fill.getBoundingClientRect().width / r.querySelector('[part=bar]').getBoundingClientRect().width * 100) : null,
    blink: getComputedStyle(r.querySelector('[part=time]')).animationName };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  // the oven ends 3 s after load: count its cw-done from the start
  await page.evaluate(() => { window.__done = 0; document.querySelector('#oven').addEventListener('cw-done', () => window.__done++); });
  const w = await read(page, '#wash');
  check(`an hour and more is h:mm:ss (${w.time})`, /^1:12:0[45]$/.test(w.time));
  check(`active reads 動作中 and the bar is the share left (${w.state}, ${w.frac})`, w.state === '動作中' && w.frac === 60);
  check(`a timer that is read as name, state and time left (${w.role}, ${w.aria})`, w.role === 'timer' && /^洗濯機 動作中 残り 1:12:0[45]$/.test(w.aria));
  await page.wait(10000);
  const w2 = await read(page, '#wash');
  check(`ten seconds later it shows ten seconds less (${w.time} -> ${w2.time})`, /^1:11:5[45]$/.test(w2.time));
  const t = await read(page, '#tea'), i = await read(page, '#idle'), n = await read(page, '#none');
  check(`paused shows its remaining and stands still (${t.time}, ${t.state}, ${t.frac})`, t.time === '1:35' && t.state === '一時停止' && t.frac === 53);
  check(`idle without remaining shows the full length, full bar (${i.time}, ${i.state}, ${i.frac})`, i.time === '1:30:00' && i.state === '待機' && i.frac === 100);
  check(`no values: a dash, no bar (${n.time}, ${n.frac})`, n.time === '—' && n.frac === null && n.state === '待機');
  const d = await read(page, '#done');
  check(`done reads 終了 at 0:00 with an empty bar (${d.time}, ${d.state}, ${d.frac})`, d.time === '0:00' && d.state === '終了' && d.frac === 0);

  // the oven ends 3 s after load (an ISO end): it finishes, and says so once
  const fin = await page.evaluate(async () => {
    const e = document.querySelector('#oven');
    await window.__wait(2000); e.requestUpdate(); await e.updateComplete;
    return { n: window.__done, state: e.getAttribute('state'), time: e.shadowRoot.querySelector('[part=time]').textContent };
  });
  check(`an active timer past its end is done and sends cw-done once (${JSON.stringify(fin)})`, fin.n === 1 && fin.state === 'done' && fin.time === '0:00');
  const again = await page.evaluate(async () => {
    const e = document.querySelector('#oven'); let n = 0; e.addEventListener('cw-done', () => n++);
    e.now = { state: 'active', end: Date.now() + 2000 }; await e.updateComplete;
    const mid = e.getAttribute('state');
    await window.__wait(3000); e.requestUpdate(); await e.updateComplete;
    return { mid, n, state: e.getAttribute('state') };
  });
  check(`started again with a new end, it finishes again (${JSON.stringify(again)})`, again.mid === 'active' && again.n === 1 && again.state === 'done');

  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#wash'), tm = () => e.shadowRoot.querySelector('[part=time]').textContent;
    s.pause(); await s.updateComplete; e.requestUpdate(); await e.updateComplete;
    const t0 = tm();
    e.now = { duration: 9999 };
    await window.__wait(5000); e.requestUpdate(); await e.updateComplete;
    const during = [tm(), e.now.duration, e._d.duration];
    s.resume(); await s.updateComplete; e.requestUpdate(); await e.updateComplete;
    return { t0, during, after: tm(), dur: e._d.duration };
  });
  check(`paused: the time stands still and new values wait (${JSON.stringify(held)})`, held.during[0] === held.t0 && held.during[1] === 9999 && held.during[2] === 7200);
  check(`resumed: it catches up and takes the waiting values (${held.after}, ${held.dur})`, held.after !== held.t0 && held.dur === 9999);
  // holes found by the audit of T098
  const holes = await page.evaluate(async () => {
    const e = document.querySelector('#tea'), out = {};
    let n = 0; e.addEventListener('cw-done', () => n++);
    e.now = { state: 'active', end: Date.now() + 65500, duration: 100 }; await e.updateComplete;
    out.ceil = e.shadowRoot.querySelector('[part=time]').textContent;
    const end = Date.now() + 2000;
    e.now = { state: 'active', end }; await e.updateComplete;
    const s = document.querySelector('#board');
    s.pause(); await s.updateComplete;
    await window.__wait(5000); e.requestUpdate(); await e.updateComplete;
    out.pausedPast = [e.getAttribute('state'), n];
    s.resume(); await s.updateComplete; await e.updateComplete;
    out.resumed = [e.getAttribute('state'), n];
    e.now = { state: 'active', end }; await e.updateComplete; await window.__wait(1000); await e.updateComplete;
    out.sameEnd = n;
    const w = document.querySelector('#wash'), t0 = w.shadowRoot.querySelector('[part=time]').textContent;
    s.pause(); await s.updateComplete; await window.__wait(5000);
    s.resume(); await s.updateComplete; await w.updateComplete;
    out.catchUp = [t0, w.shadowRoot.querySelector('[part=time]').textContent];
    let m = 0; const o = document.querySelector('#oven'); o.addEventListener('cw-done', () => m++);
    o.now = { state: 'active', end: Date.now() + 60000 }; await o.updateComplete;
    o.now = { state: 'done' }; await o.updateComplete; await window.__wait(10);
    o.now = { state: 'done' }; await o.updateComplete; await window.__wait(10);
    out.toldDone = m;
    return out;
  });
  check(`holes: the time left rounds up, 65.5 s is 1:06 (${holes.ceil})`, holes.ceil === '1:06');
  check(`holes: paused past its end it stays as it was and sends nothing (${holes.pausedPast})`, holes.pausedPast.join() === 'active,0');
  check(`holes: resumed past its end it finishes, once (${holes.resumed})`, holes.resumed.join() === 'done,1');
  check(`holes: the same end received again does not finish again (${holes.sameEnd})`, holes.sameEnd === 1);
  check(`holes: resume catches up without being asked (${holes.catchUp})`, holes.catchUp[0] !== holes.catchUp[1]);
  check(`holes: told done straight from active is finishing too, once (${holes.toldDone})`, holes.toldDone === 1);
  const calm = await read(page, '#done');
  check(`calm: a finished time does not blink (${calm.blink})`, calm.blink === 'none');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const full = await read(page, '#done');
  check(`full: a finished time blinks (${full.blink})`, full.blink === 'blink');
  const pausedBlink = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#done'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=time]')).animationName; });
  check(`holes: full but paused, a finished time does not blink (${pausedBlink})`, pausedBlink === 'none');
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  const lab = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-text-dim)'; document.body.append(d); const want = getComputedStyle(d).color; d.remove(); return [getComputedStyle(document.querySelector('#wash').shadowRoot.querySelector('[part=label]')).color, want]; });
  check(`game: the name is in the dim text colour, not the dark colour meant for the label tag (${lab})`, lab[0] === lab[1]);
  const g = await page.evaluate(() => getComputedStyle(document.querySelector('#wash').shadowRoot.querySelector('[part=time]')).fontFamily);
  check(`game: the time uses the wide display face (${g})`, /^Archivo/.test(g));
  const odd = await page.evaluate(async () => { const e = document.querySelector('#none'); e.now = { state: 'running', remaining: 'x', duration: 60 }; await e.updateComplete; return [e.getAttribute('state'), e.shadowRoot.querySelector('[part=time]').textContent]; });
  check(`an unknown state is idle; an unreadable remaining shows the full length (${odd})`, odd.join() === 'idle,1:00');
}
