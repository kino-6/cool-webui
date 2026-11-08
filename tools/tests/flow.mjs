// <cw-flow>: dots by power, motion levels, pause and resume, node text, wire width, bad links.
export const demo = 'flow.html?motion=full';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function run(page, check) {
  const P = (fn, ...a) => page.evaluate(fn, ...a);
  await P(() => document.getElementById('flow').updateComplete);
  await wait(300);
  const dots = (i) => P((k) => [...document.getElementById('flow').shadowRoot.querySelectorAll(`[part=dot][data-link="${k}"]`)].map((c) => [+c.getAttribute('cx'), +c.getAttribute('cy'), +c.getAttribute('r')]), i);
  const big = await dots(3), small = await dots(1), none = await dots(2);
  check(`more power gives more and larger dots (${big.length} r${big[0]?.[2]} vs ${small.length} r${small[0]?.[2]})`, big.length > small.length && big[0][2] > small[0][2]);
  check(`no dots on a wire carrying nothing (${none.length})`, none.length === 0);
  // share of the wire covered in 200 ms, so a longer wire does not look faster
  const len = (i) => P((k) => document.getElementById('flow').shadowRoot.querySelector(`[part=wire][data-link="${k}"]`).getTotalLength(), i);
  const travel = async (i) => { const a = await dots(i); await wait(200); const b = await dots(i); return Math.hypot(b[0][0] - a[0][0], b[0][1] - a[0][1]) / (await len(i)); };
  const fast = await travel(3), slow = await travel(1);
  check(`faster dots on the bigger flow (${fast.toFixed(3)} vs ${slow.toFixed(3)} of the wire in 200 ms)`, fast > slow * 1.8 && slow > 0);
  const frames = (id = 'flow') => P((i) => +document.getElementById(i).dataset.frames, id);
  const f0 = await frames(); await wait(500); const f1 = await frames();
  check(`runs only in full motion (${f1 - f0} frames in 500 ms)`, f1 - f0 >= 5);

  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'calm'); await s.updateComplete; });
  await wait(150);
  const c0 = await dots(3), cf = await frames(); await wait(400); const c1 = await dots(3);
  check(`still dots in calm, spaced along the wire (${c1.length} dots, frames ${cf} -> ${await frames()})`, c1.length === big.length && JSON.stringify(c0) === JSON.stringify(c1) && cf === (await frames()));
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'full'); await s.updateComplete; });
  await wait(100);

  await P(async () => { const s = document.getElementById('stage'); s.pause(); await s.updateComplete; });
  const p0 = await dots(3); await wait(300); const p1 = await dots(3);
  const held = await P(async () => {
    const f = document.getElementById('flow'); f.nodes = f.nodes.map((n) => (n.id === 'home' ? { ...n, value: 9999 } : n)); await f.updateComplete;
    return f.shadowRoot.querySelector('[part=node][data-node=home]').getAttribute('aria-label');
  });
  check(`paused stage freezes the dots and holds new values (${held})`, JSON.stringify(p0) === JSON.stringify(p1) && p0.length > 0 && !held.includes('9,999'));
  const applied = await P(() => new Promise((res) => { const s = document.getElementById('stage'); s.addEventListener('cw-resume', (e) => res(e.detail.applied), { once: true }); s.resume(); }));
  await wait(100);
  const after = await P(() => document.getElementById('flow').shadowRoot.querySelector('[part=node][data-node=home]').getAttribute('aria-label'));
  check(`resume applies the held values (applied ${applied}, "${after}")`, applied >= 1 && after.includes('9,999'));

  const txt = await P(() => Object.fromEntries([...document.getElementById('flow').shadowRoot.querySelectorAll('[part=node]')].map((g) => [g.dataset.node, g.querySelector('.value').textContent.trim()])));
  check(`node value shows a rounded number and its unit (${JSON.stringify(txt)})`, txt.solar === '2,400W' && txt.batt === '64%' && txt.home === '9,999W');
  const widths = await P(() => [...document.getElementById('flow').shadowRoot.querySelectorAll('[part=wire]')].map((w) => parseFloat(w.style.strokeWidth)));
  check(`wire width follows power (${widths})`, widths[3] > widths[1] && widths[1] > widths[2]);
  const bad = await P(async () => {
    const f = document.getElementById('flow'); f.links = [...f.links, { from: 'nowhere', to: 'home', value: 500 }]; await f.updateComplete;
    await new Promise((r) => setTimeout(r, 100));
    return f.shadowRoot.querySelectorAll('[part=dot][data-link="4"]').length;
  });
  check(`missing node: the link draws nothing and nothing throws (${bad})`, bad === 0);

  const a0 = await frames('alone'); await wait(300);
  check('a flow outside any stage follows its own motion', (await frames('alone')) > a0);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await wait(150);
  const r0 = await frames(); await wait(400);
  check(`reduced motion stops the dots (${r0} -> ${await frames()})`, r0 === (await frames()));
  await more(page, check);
}

// T054: holes from the T051 audit
export async function more(page, check) {
  const P = (fn, ...a) => page.evaluate(fn, ...a);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const base = page.url().split('?')[0];
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const expected = (links, top) => links.map((l) => (l.value / top < 0.01 ? 0 : 2 + Math.round(Math.min(1, l.value / top) * 5)));

  await page.goto(`${base}?motion=calm`, { waitUntil: 'load' }); await wait(400);
  const calm = await P(() => { const f = document.getElementById('flow'); return { n: f.shadowRoot.querySelectorAll('[part=dot]').length, frames: +f.dataset.frames, links: f.links }; });
  const want = expected(calm.links, Math.max(...calm.links.map((l) => l.value))).reduce((a, b) => a + b, 0);
  check(`calm from load shows still dots (${calm.n} of ${want}, ${calm.frames} frames)`, calm.n === want && calm.frames === 0);

  await page.goto(`${base}?motion=full`, { waitUntil: 'load' }); await wait(400);
  const per = await P(() => { const f = document.getElementById('flow'); return { counts: f.links.map((_, i) => f.shadowRoot.querySelectorAll(`[part=dot][data-link="${i}"]`).length), links: f.links }; });
  const top = Math.max(...per.links.map((l) => l.value));
  check(`proportional dot count per link (${per.counts} = ${expected(per.links, top)})`, per.counts.join() === expected(per.links, top).join());
  // share of the wire covered per second, sampled with page time so the ratio is exact enough
  const pace = (i) => P(async (k) => {
    const sr = document.getElementById('flow').shadowRoot, w = sr.querySelector(`[part=wire][data-link="${k}"]`), len = w.getTotalLength();
    const at = () => { const c = sr.querySelector(`[part=dot][data-link="${k}"]`); const x = +c.getAttribute('cx'), y = +c.getAttribute('cy');
      let best = 0, d = Infinity; for (let s = 0; s <= 400; s++) { const p = w.getPointAtLength((s / 400) * len); const e = Math.hypot(p.x - x, p.y - y); if (e < d) { d = e; best = s / 400; } } return best; };
    const a = at(), t0 = performance.now(); await new Promise((r) => setTimeout(r, 300)); const b = at(), t1 = performance.now();
    return (((b - a) % 1) + 1) % 1 / ((t1 - t0) / 1000);
  }, i);
  const s3 = per.links[3].value / top, s1 = per.links[1].value / top;
  const fast = await pace(3), slow = await pace(1), ratio = fast / slow, model = (0.12 + 0.5 * s3) / (0.12 + 0.5 * s1);
  check(`proportional speed (${ratio.toFixed(2)} vs ${model.toFixed(2)})`, Math.abs(ratio / model - 1) < 0.2);
  check(`dots run from source to target (${fast.toFixed(3)} of the wire per second, forward)`, fast > 0.3 && fast < 0.9);
  const dir = await P(async () => {
    const sr = document.getElementById('flow').shadowRoot, f = document.getElementById('flow');
    const to = f.nodes.find((n) => n.id === 'batt'), tx = to.x * f.clientWidth, ty = to.y * f.clientHeight;
    const d = () => { const c = [...sr.querySelectorAll('[part=dot][data-link="3"]')].map((c) => Math.hypot(+c.getAttribute('cx') - tx, +c.getAttribute('cy') - ty)); return c; };
    const a = d(); await new Promise((r) => setTimeout(r, 120)); const b = d();
    return a.filter((x, i) => b[i] < x).length / a.length;
  });
  check(`dots run from source to target (${Math.round(dir * 100)}% of dots get closer to the battery)`, dir >= 0.7);

  const sc = await P(async () => {
    const f = document.getElementById('flow'), sr = f.shadowRoot;
    const read = () => ({ n: sr.querySelectorAll('[part=dot][data-link="3"]').length, w: parseFloat(sr.querySelector('[part=wire][data-link="3"]').style.strokeWidth) });
    const a = read(); f.scale = 5000; await f.updateComplete; await new Promise((r) => setTimeout(r, 80)); const b = read();
    f.scale = 100; await f.updateComplete; await new Promise((r) => setTimeout(r, 80)); const c = read(); const cGrid = parseFloat(sr.querySelector('[part=wire][data-link="1"]').style.strokeWidth);
    f.scale = undefined; await f.updateComplete;
    return { a, b, c, cGrid };
  });
  check(`scale sets a full wire: a larger scale thins the wire and drops dots (${JSON.stringify(sc.a)} -> ${JSON.stringify(sc.b)})`, sc.b.n < sc.a.n && sc.b.w < sc.a.w);
  check(`scale sets a full wire: flows above it stay at the cap (${sc.c.w}, ${sc.cGrid})`, Math.abs(sc.c.w - sc.cGrid) < 0.01 && sc.c.n === 7);

  const lab = await P(() => [...document.getElementById('flow').shadowRoot.querySelectorAll('[part=node]')].map((g) => {
    const c = g.querySelector('circle').getBoundingClientRect(), l = g.querySelector('.label').getBoundingClientRect();
    return { id: g.dataset.node, text: g.querySelector('.label').textContent, above: l.bottom <= c.top, below: l.top >= c.bottom };
  }));
  const where = Object.fromEntries(lab.map((l) => [l.id, l.above ? 'above' : l.below ? 'below' : 'inside']));
  check(`label placement: above for upper nodes, below for the rest (${JSON.stringify(where)})`, where.solar === 'above' && where.grid === 'below' && where.batt === 'below' && where.home === 'below' && lab.every((l) => l.text));

  const fr = await P(async () => {
    const f = document.getElementById('flow'); f.nodes = f.nodes.map((n) => (n.id === 'home' ? { ...n, value: 1180.6 } : n)); await f.updateComplete;
    const v = f.shadowRoot.querySelector('[part=node][data-node=home] .value'); return v.textContent.replace(v.querySelector('.unit').textContent, '');
  });
  check(`fractional values are rounded (${fr})`, fr.trim() === '1,181');
}
