// <cw-trend>: the number, the move and its colour by the good way, the line, push, pause, motion, narrow, look.
export const demo = 'trend.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, q = (p) => r.querySelector(`[part=${p}]`);
  const line = q('line')?.getAttribute('points') ?? '';
  const dot = q('dot'), spark = q('spark');
  return {
    value: q('value').textContent.trim(), unit: q('unit')?.textContent.trim() ?? '',
    delta: q('delta')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
    pct: q('pct') ? getComputedStyle(q('pct')).display : null,
    color: q('delta') ? getComputedStyle(q('delta')).color : null,
    mood: e.getAttribute('mood'), dir: e.getAttribute('dir'),
    n: line ? line.split(' ').length : 0, first: line.split(' ')[0], last: line.split(' ').at(-1),
    // where the dot sits against the end of the drawn line, in pixels
    dot: dot && spark ? [Math.round(dot.getBoundingClientRect().left + 3.5 - spark.getBoundingClientRect().right), Math.round(dot.getBoundingClientRect().top + 3.5 - spark.getBoundingClientRect().top)] : null,
    sparkH: spark ? Math.round(spark.getBoundingClientRect().height) : 0,
    anim: dot ? getComputedStyle(dot).animationName : null,
    aria: e.getAttribute('aria-label'), role: e.getAttribute('role'),
  };
}, sel);
const colours = (page) => page.evaluate(() => ['--cw-ok', '--cw-warn', '--cw-text-dim'].map((v) => { const d = document.createElement('div'); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }));

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const [ok, warn, dim] = await colours(page);
  const p = await read(page, '#power');
  check(`the number and unit (${p.value} ${p.unit})`, p.value === '812' && p.unit === 'W');
  check(`without previous, the move is from the first value, with its percent (${p.delta})`, p.delta === '▲ +492 (+153.8%)' && p.dir === 'up');
  check(`up is good by default: the ok colour (${p.mood}, ${p.color})`, p.mood === 'good' && p.color === ok);
  check(`the line has every point, oldest at the left, newest at the right (${p.n}, ${p.first}, ${p.last})`, p.n === 12 && p.first.startsWith('0.00,') && p.last.startsWith('100.00,'));
  check(`the highest point is at the top; 320 sits just above the lowest, 310 (${p.last}, ${p.first})`, p.last === '100.00,2.00' && p.first === '0.00,27.48');
  check(`the dot sits on the end of the line (${p.dot}, height ${p.sparkH})`, Math.abs(p.dot[0]) <= 1 && Math.abs(p.dot[1] - Math.round((2 / 30) * p.sparkH)) <= 1);
  check(`it reads the label-less number, unit and move (${p.aria})`, p.aria === '812 W 前より +492 増加' && p.role === 'img');
  const pr = await read(page, '#price');
  check(`good="down": a fall is good (${pr.delta}, ${pr.mood}, ${pr.color})`, pr.delta === '▼ −2.5 (−8.0%)' && pr.mood === 'good' && pr.color === ok);
  const t = await read(page, '#temp');
  check(`previous is what the move is measured from; good="none" stays dim (${t.delta}, ${t.mood}, ${t.color})`, t.delta === '▼ −0.7 (−3.1%)' && t.mood === 'flat' && t.color === dim);
  const f = await read(page, '#flat');
  check(`no change: ±0, no percent, dim, and a flat line in the middle (${f.delta}, ${f.mood}, ${f.first})`, f.delta === '– ±0' && f.dir === 'flat' && f.mood === 'flat' && f.first === '0.00,15.00');
  const n = await read(page, '#none');
  check(`no value yet: a dash, no move, no line (${n.value}, ${n.delta}, ${n.n})`, n.value === '—' && n.delta === null && n.n === 0 && n.dir === 'none');
  const nr = await read(page, '#narrow');
  check(`under 160px the percent is hidden, the move stays (${nr.pct}, ${nr.delta})`, nr.pct === 'none' && nr.delta.startsWith('▲ +18'));
  check(`calm: the dot stays still (${p.anim})`, p.anim === 'none');

  // a rise where down is good is bad: the warning colour
  const bad = await page.evaluate(async () => { const e = document.querySelector('#price'); e.value = 40; await e.updateComplete; return [e.getAttribute('mood'), getComputedStyle(e.shadowRoot.querySelector('[part=delta]')).color]; });
  check(`good="down" and a rise: the warning colour (${bad})`, bad[0] === 'bad' && bad[1] === warn);

  // push adds to the line and becomes the number; points keeps only the last ones; things that are not numbers are skipped
  const pushed = await page.evaluate(async () => {
    const e = document.createElement('cw-trend'); e.points = 4; document.querySelector('#board').append(e);
    e.push([1, 2, 'x', null, 3]); e.push(5); e.push('7'); await e.updateComplete;
    const out = { data: e.data.join(), value: e.value, text: e.shadowRoot.querySelector('[part=value]').textContent };
    e.data = 'nope'; await e.updateComplete; out.cleared = e.shadowRoot.querySelector('[part=line]') === null;
    e.remove(); return out;
  });
  check(`push adds to the line and becomes the number; points keeps the last four; non-numbers skipped (${JSON.stringify(pushed)})`,
    pushed.data === '2,3,5,7' && pushed.value === 7 && pushed.text === '7' && pushed.cleared);

  // paused: value, line and previous wait; resume shows them together
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#power');
    s.pause(); await s.updateComplete;
    e.push(100); e.previous = 50; await e.updateComplete;
    const during = e.shadowRoot.querySelector('[part=value]').textContent, waiting = [e.value, e.previous];
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.shadowRoot.querySelector('[part=value]').textContent, delta: e.shadowRoot.querySelector('[part=delta]').textContent.replace(/\s+/g, ' ').trim() };
  });
  check(`paused: new values wait, resume shows them (${JSON.stringify(held)})`, held.during === '812' && held.waiting.join() === '100,50' && held.after === '100' && held.delta === '▲ +50 (+100.0%)');

  // <cw-source> reaches it: set value, data and previous, and push
  await page.addScriptTag({ path: 'dist/cw-source.iife.js' });
  const src = await page.evaluate(async () => {
    const e = document.createElement('cw-trend'); e.id = 'fed'; document.querySelector('#board').append(e);
    const s = document.createElement('cw-source'); s.setAttribute('kind', 'message'); document.querySelector('#board').append(s);
    const errors = []; s.addEventListener('cw-source-error', (x) => errors.push(x.detail.code));
    s.handle([{ to: '#fed', op: 'set', prop: 'data', value: [1, 2] }, { to: '#fed', op: 'push', value: 4 }, { to: '#fed', op: 'set', prop: 'previous', value: 2 }]);
    await e.updateComplete;
    return { errors, value: e.value, data: e.data.join(), delta: e.shadowRoot.querySelector('[part=delta]').textContent.replace(/\s+/g, ' ').trim() };
  });
  check(`<cw-source> sets data and previous and pushes (${JSON.stringify(src)})`, src.errors.length === 0 && src.value === 4 && src.data === '1,2,4' && src.delta === '▲ +2 (+100.0%)');

  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const fm = await read(page, '#power');
  check(`full: the newest point pulses (${fm.anim})`, fm.anim === 'pulse');
  const fp = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#power'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=dot]')).animationName; });
  check(`full but paused: the pulse stops (${fp})`, fp === 'none');

  await page.goto(`${base}?theme=latte`, { waitUntil: 'load' });
  const [lok] = await colours(page);
  const l = await read(page, '#power');
  check(`latte: same move, the theme's ok colour (${l.delta}, ${l.color})`, l.delta === p.delta && l.color === lok && lok !== ok);
}
