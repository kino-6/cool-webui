// <cw-bars> and <cw-chart>: data in, proportional drawing, limits, pause buffering, text-only labels.
export const demo = 'charts.html';
export async function run(page, check) {
  const ready = () => page.evaluate(() => Promise.all([...document.querySelectorAll('cw-bars,cw-chart')].map((e) => e.updateComplete)));
  await ready();

  // bars
  const bars = async () => page.evaluate(() => {
    const e = document.querySelector('#rooms');
    return [...e.shadowRoot.querySelectorAll('[part=row]')].map((r) => ({
      label: r.querySelector('[part=label]').textContent.trim(),
      value: r.querySelector('[part=value]').textContent.replace(/\s+/g, ''),
      width: Math.round(parseFloat(r.querySelector('[part=fill]').style.width)),
      img: !!r.querySelector('img'),
    }));
  });
  await page.evaluate(() => { document.querySelector('#rooms').data = [{ label: '居間', value: 50 }, { label: '台所', value: 100 }, { label: '<img src=x>', value: 'n/a' }]; });
  await ready();
  let b = await bars();
  check(`one row per item (${b.length})`, b.length === 3);
  check(`max="200" sets the scale (${b.map((x) => x.width).join(',')})`, b[0].width === 25 && b[1].width === 50);
  check(`non-number shows a dash and no bar (${b[2].value}, ${b[2].width})`, b[2].value === '—' && b[2].width === 0);
  check(`labels are text (${b[2].label})`, b[2].label === '<img src=x>' && !b[2].img);
  check(`value with unit (${b[0].value})`, b[0].value === '50W');
  await page.evaluate(() => document.querySelector('#rooms').removeAttribute('max'));
  await ready();
  b = await bars();
  check(`without max the largest fills the track (${b.map((x) => x.width).join(',')})`, b[1].width === 100 && b[0].width === 50);
  await page.evaluate(() => { document.querySelector('#rooms').data = [{ label: 'x', value: -5 }, { label: 'y', value: 5 }]; });
  await ready();
  b = await bars();
  check(`negative values clamp to an empty bar (${b[0].width})`, b[0].width === 0 && b[1].width === 100);
  const bp = await page.evaluate(async () => {
    const e = document.querySelector('#rooms'); let applied = -1;
    e.addEventListener('cw-resume', (ev) => (applied = ev.detail.applied), { once: true });
    e.pause(); e.data = [{ label: 'a', value: 1 }]; e.data = [{ label: 'b', value: 2 }, { label: 'c', value: 3 }]; await e.updateComplete;
    const during = e.shadowRoot.querySelectorAll('[part=row]').length;
    e.resume(); await e.updateComplete;
    return { during, after: [...e.shadowRoot.querySelectorAll('[part=label]')].map((l) => l.textContent.trim()).join(','), applied };
  });
  check(`paused bars keep the latest data only (${bp.during} rows, then ${bp.after}, applied=${bp.applied})`, bp.during === 2 && bp.after === 'b,c' && bp.applied === 1);
  check('bars rows read as label and value', await page.evaluate(() => document.querySelector('#rooms').shadowRoot.querySelector('[part=row]').getAttribute('aria-label') === 'b 2 W'));

  // chart
  const info = () => page.evaluate(() => {
    const e = document.querySelector('#lat');
    const lines = [...e.shadowRoot.querySelectorAll('polyline[part~=line]')];
    return { n: e.data.length, lines: lines.length, pts: lines.map((l) => l.getAttribute('points').trim().split(/\s+/).filter(Boolean).length), ys: lines.map((l) => l.getAttribute('points').trim().split(/\s+/).map((p) => +p.split(',')[1])), h: +e.shadowRoot.querySelector('svg').getAttribute('viewBox').split(' ')[3], aria: e.getAttribute('aria-label') };
  });
  await page.evaluate(() => { const e = document.querySelector('#lat'); e.data = []; for (let i = 0; i < 15; i++) e.push({ p50: 100 + i, p95: 200 + i }); });
  await ready();
  let c = await info();
  check(`points="10" keeps the last 10 (${c.n})`, c.n === 10);
  check(`one line per series (${c.lines}: ${c.pts})`, c.lines === 2 && c.pts.every((p) => p === 10));
  check(`aria-label has the latest values (${c.aria})`, c.aria === '応答時間 p50 114 ms, p95 214 ms');
  await page.evaluate(() => { document.querySelector('#lat').data = [{ p50: 0, p95: 500 }, { p50: 900, p95: 250 }]; });
  await ready();
  c = await info();
  check(`set data replaces (${c.n})`, c.n === 2);
  check(`values outside min/max stay inside the box (${c.ys.flat().join(',')})`, c.ys.flat().every((y) => y >= 0 && y <= c.h));
  await page.evaluate(() => { document.querySelector('#lat').push([{ p50: 10 }, { p50: 20, p95: 'x' }]); });
  await ready();
  c = await info();
  check(`push takes an array; missing values leave gaps (${c.pts})`, c.n === 4 && c.pts[0] === 4 && c.pts[1] === 2);
  const cp = await page.evaluate(async () => {
    const e = document.querySelector('#lat'); let applied = -1;
    e.addEventListener('cw-resume', (ev) => (applied = ev.detail.applied), { once: true });
    const before = e.shadowRoot.querySelector('polyline').getAttribute('points');
    e.pause(); for (let i = 0; i < 5; i++) e.push({ p50: i, p95: i }); await e.updateComplete;
    const same = e.shadowRoot.querySelector('polyline').getAttribute('points') === before;
    e.resume(); await e.updateComplete;
    return { same, applied, n: e.data.length };
  });
  check(`paused chart holds the drawing, resume adds them (applied=${cp.applied}, n=${cp.n})`, cp.same && cp.applied === 5 && cp.n === 9);
  const auto = await page.evaluate(async () => {
    const e = document.querySelector('#auto'); e.data = [{ v: 10 }, { v: 20 }, { v: 30 }]; await e.updateComplete;
    const ys = e.shadowRoot.querySelector('polyline').getAttribute('points').trim().split(/\s+/).map((p) => +p.split(',')[1]);
    return ys;
  });
  check(`without min/max the line spans the box (${auto.join(',')})`, auto[0] > auto[2] && auto[2] >= 0);

  // T043
  const over = await page.evaluate(async () => {
    const e = document.querySelector('#rooms'); e.setAttribute('max', '100'); e.data = [{ label: 'big', value: 250 }]; await e.updateComplete;
    const w = e.shadowRoot.querySelector('[part=fill]').style.width;
    return { w, roles: [e.getAttribute('role'), e.shadowRoot.querySelector('[part=row]').getAttribute('role'), document.querySelector('#lat').getAttribute('role')].join(',') };
  });
  check(`over max clamps to full (${over.w})`, over.w === '100%');
  check(`roles are list, listitem and img (${over.roles})`, over.roles === 'list,listitem,img');
  const pts = (sel) => page.evaluate(async (s) => { const e = document.querySelector(s); await e.updateComplete; return [...e.shadowRoot.querySelectorAll('polyline')].map((l) => l.getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number))); }, sel);
  await page.evaluate(() => { document.querySelector('#lat').data = [{ p50: 200, p95: 0 }, { p50: 400, p95: 100 }]; });
  let l = await pts('#lat');
  check(`min/max set the scale (p50 200 -> y ${l[0][0][1]}, 400 -> ${l[0][1][1]}, p95 100 -> ${l[1][1][1]})`, l[0][0][1] === 100 && l[0][1][1] === 0 && l[1][1][1] === 150);
  await page.evaluate(() => { document.querySelector('#auto').data = [{ v: 3 }, { v: 9 }, { v: 5 }]; });
  l = await pts('#auto');
  const ys = l[0].map((p) => p[1]);
  check(`auto range touches top and bottom (${ys})`, Math.min(...ys) === 0 && Math.max(...ys) === 200);
  const cap = await page.evaluate(async () => {
    const e = document.querySelector('#lat'); e.data = []; await e.updateComplete;
    let applied = -1; e.addEventListener('cw-resume', (ev) => (applied = ev.detail.applied), { once: true });
    e.pause(); await e.updateComplete;
    for (let i = 0; i < 25; i++) e.push({ p50: i, p95: i });
    e.resume(); await e.updateComplete;
    return { n: e.data.length, applied, last: e.data.at(-1).p50 };
  });
  check(`paused queue keeps at most points (n=${cap.n}, applied=${cap.applied})`, cap.n === 10 && cap.applied === 10 && cap.last === 24);
  const rep = await page.evaluate(async () => {
    const e = document.querySelector('#lat');
    const before = e.shadowRoot.querySelector('polyline').getAttribute('points');
    let applied = -1; e.addEventListener('cw-resume', (ev) => (applied = ev.detail.applied), { once: true });
    e.pause(); await e.updateComplete;
    e.push({ p50: 1, p95: 1 });
    e.data = [{ p50: 50, p95: 60 }, { p50: 70, p95: 80 }]; await e.updateComplete;
    const held = e.shadowRoot.querySelector('polyline').getAttribute('points') === before;
    e.resume(); await e.updateComplete;
    return { held, applied, n: e.data.length };
  });
  check(`paused data replace is held, then counts as one (applied=${rep.applied}, n=${rep.n})`, rep.held && rep.applied === 1 && rep.n === 2);
  const many = await page.evaluate(async () => { const e = document.querySelector('#lat'); e.data = Array.from({ length: 30 }, (_, i) => ({ p50: i, p95: i })); await e.updateComplete; return [e.data.length, e.data[0].p50]; });
  check(`set data keeps the last points (${many})`, many[0] === 10 && many[1] === 20);
}
