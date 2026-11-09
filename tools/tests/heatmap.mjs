// <cw-heatmap>: the calendar's days up to today, Monday on top, month names, five shades, sums, the week layout,
// days and max, pause, motion, look. Run under another TZ too: days are local days.
export const demo = 'heatmap.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, cells = [...r.querySelectorAll('[part=grid] [part=cell]')];
  const inside = cells.filter((c) => !c.hasAttribute('data-out'));
  const grid = r.querySelector('[part=grid]').getBoundingClientRect();
  const today = r.querySelector('[data-today]');
  return {
    all: cells.length, shown: inside.length, first: inside[0]?.dataset.key, last: inside.at(-1)?.dataset.key,
    keys: inside.map((c) => c.dataset.key), steps: inside.map((c) => c.dataset.step),
    titles: Object.fromEntries(inside.map((c) => [c.dataset.key, c.title])),
    today: today?.dataset.key ?? null,
    // which row today sits in, 0 = the top: every column holds 7 squares in order
    todayRow: today ? cells.indexOf(today) % 7 : null,
    labels: [...r.querySelectorAll('[part=grid] > span')].map((x) => x.textContent.trim()).filter(Boolean),
    fill: inside.length ? getComputedStyle(inside.find((c) => c.dataset.step === '4') ?? inside[0]).backgroundColor : null,
    anim: today ? getComputedStyle(today).animationName : null,
    fits: grid.width <= e.getBoundingClientRect().width + 1,
    aria: e.getAttribute('aria-label'), role: e.getAttribute('role'),
  };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const local = await page.evaluate(() => { const d = new Date(); const k = (x) => x.toLocaleDateString('sv'); return { today: k(d), start: k(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 90)), wd: (d.getDay() + 6) % 7, monthOf: d.getMonth() + 1 }; });
  const c = await read(page, '#cal');
  check(`the calendar shows the last 91 days up to today (${c.shown}, ${c.first}..${c.last})`, c.shown === 91 && c.first === local.start && c.last === local.today);
  check(`whole weeks: the grid is a multiple of 7 squares (${c.all})`, c.all % 7 === 0 && c.all >= 91 && c.all < 91 + 14);
  check(`today is outlined and sits in its weekday's row, Monday on top (${c.today}, row ${c.todayRow}, weekday ${local.wd})`, c.today === local.today && c.todayRow === local.wd);
  check(`weekday names on the left, month names on top (${c.labels.slice(0, 6)})`, c.labels.slice(0, 4).join() === '月,水,金,日' && c.labels.includes(`${local.monthOf}月`));
  check(`five shades, the largest square the strongest (${[...new Set(c.steps)].sort()})`, [...new Set(c.steps)].sort().join() === '1,2,3,4' || [...new Set(c.steps)].sort().join() === '0,1,2,3,4');
  const sig = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-signal)'; document.body.append(d); const x = getComputedStyle(d).color; d.remove(); return x; });
  check(`the strongest shade is the accent (${c.fill})`, c.fill === sig);
  check(`each square says its day and value (${c.titles[local.today]})`, /^\d{4}-\d{2}-\d{2} \d+\.\d kWh$/.test(c.titles[local.today]));
  check(`it reads the largest and the total (${c.aria})`, /^最大 \d+\.\d kWh、合計 \d+\.\d kWh$/.test(c.aria) && c.role === 'img');
  check(`calm: today does not pulse (${c.anim})`, c.anim === 'none');

  const s = await read(page, '#short');
  check(`days=30 shows 30; YYYY-MM-DD strings are local days (${s.shown}, ${s.last})`, s.shown === 30 && s.last === local.today);
  check(`max=10: 0 empty, 2 → 1, 5 → 2, 8 → 4, 12 past max → 4, 3 → 2 (${s.steps.slice(-7).reverse()})`, s.steps.slice(-6).reverse().join() === '0,1,2,4,4,2');

  const w = await read(page, '#week');
  check(`the week layout is 7 weekdays by 24 hours, hours named every 6 (${w.all}, ${w.labels.slice(0, 4)})`, w.all === 168 && w.labels.slice(0, 4).join() === '0,6,12,18' && w.labels.includes('日'));
  const placed = await page.evaluate(async () => {
    const e = document.createElement('cw-heatmap'); e.layout = 'week'; document.querySelector('#board').append(e);
    // a Wednesday at 14:30 local, twice, and a Sunday at 23:00
    const wed = new Date(2026, 10, 4, 14, 30), sun = new Date(2026, 10, 8, 23, 0);
    e.data = [{ date: wed.getTime(), value: 2 }, { date: wed, value: 3 }, { date: sun.toISOString(), value: 1 }];
    await e.updateComplete;
    const t = (k) => e.shadowRoot.querySelector(`[data-key="${k}"]`).title;
    const out = [t('2-14'), t('6-23'), t('0-0')];
    e.remove(); return out;
  });
  check(`values land on their local weekday and hour and add up (${placed})`, placed.join('|') === '水 14時 5|日 23時 1|月 0時 —');

  const n = await read(page, '#none');
  check(`no values: every square empty, read as such (${[...new Set(n.steps)]}, ${n.aria})`, n.steps.every((x) => x === '0') && n.aria === '値はありません' && n.shown === 30);

  const odd = await page.evaluate(async () => {
    const e = document.createElement('cw-heatmap'); e.days = 7; document.querySelector('#board').append(e);
    const k = new Date().toLocaleDateString('sv');
    e.data = [{ date: k, value: 'x' }, { date: 'not a date', value: 3 }, { date: k, value: '4' }, null, 5, { value: 2 }];
    await e.updateComplete;
    const out = [e.shadowRoot.querySelector(`[data-key="${k}"]`).title, e.shadowRoot.querySelectorAll('[part=grid] [part=cell]:not([data-out])').length];
    e.days = 'many'; await e.updateComplete; out.push(e.shadowRoot.querySelectorAll('[part=grid] [part=cell]:not([data-out])').length);
    e.remove(); return out;
  });
  check(`bad dates and values are left out, a numeric string counts; a days that is not a number is 91 (${odd})`, odd[0].endsWith(' 4') && odd[1] === 7 && odd[2] === 91);

  const held = await page.evaluate(async () => {
    const st = document.querySelector('#board'), e = document.querySelector('#none');
    st.pause(); await st.updateComplete;
    e.data = [{ date: Date.now(), value: 9 }]; await e.updateComplete;
    const during = e.getAttribute('aria-label'), waiting = e.data.length;
    st.resume(); await st.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.getAttribute('aria-label') };
  });
  check(`paused: new values wait, resume shows them (${JSON.stringify(held)})`, held.during === '値はありません' && held.waiting === 1 && held.after === '最大 9、合計 9');

  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#cal');
  check(`full: today's outline pulses (${f.anim})`, f.anim === 'pulse');
  const fp = await page.evaluate(async () => { const st = document.querySelector('#board'); st.pause(); await st.updateComplete; const e = document.querySelector('#cal'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[data-today]')).animationName; });
  check(`full but paused: it stops (${fp})`, fp === 'none');

  await page.goto(`${base}?theme=nord`, { waitUntil: 'load' });
  const nsig = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-signal)'; document.body.append(d); const x = getComputedStyle(d).color; d.remove(); return x; });
  const nd = await read(page, '#cal');
  check(`nord: same squares, the theme's accent (${nd.fill})`, nd.steps.join() === c.steps.join() && nd.fill === nsig && nsig !== sig);
}
