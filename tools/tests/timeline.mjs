// <cw-timeline>: bands at their times in a window ending now, idle states left out, colours by first appearance or
// given, ongoing bands, the axis, how long each state lasted, the clock moving, narrow, pause, motion, look.
export const demo = 'timeline.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, rows = [...r.querySelectorAll('[part=row]')];
  const round = (x) => Math.round(parseFloat(x) * 100) / 100;
  return {
    labels: rows.map((x) => x.querySelector('[part=label]').textContent),
    bands: rows.map((x) => [...x.querySelectorAll('[part=band]')].map((b) => ({ left: round(b.style.left), width: round(b.style.width), state: b.dataset.state, open: b.hasAttribute('data-open'), color: getComputedStyle(b).backgroundColor, title: b.title, anim: getComputedStyle(b).animationName }))),
    aria: rows.map((x) => x.getAttribute('aria-label')),
    ticks: [...r.querySelectorAll('[part=tick]')].map((t) => t.textContent),
    legend: [...r.querySelectorAll('[part=key]')].map((k) => k.textContent.trim()),
    // the label sits beside the band (wide) or above it (narrow)
    beside: rows[0] ? rows[0].querySelector('[part=label]').getBoundingClientRect().right <= rows[0].querySelector('[part=track]').getBoundingClientRect().left : null,
    axisLeft: r.querySelector('[part=axis]') ? Math.round(r.querySelector('[part=axis]').getBoundingClientRect().left) : null,
    trackLeft: rows[0] ? Math.round(rows[0].querySelector('[part=track]').getBoundingClientRect().left) : null,
    empty: r.querySelector('[part=empty]')?.textContent ?? null, role: e.getAttribute('role'),
  };
}, sel);
const tokens = (page) => page.evaluate(() => ['signal', 'ok', 'warn', 'text-dim'].map((v) => { const d = document.createElement('div'); d.style.color = `var(--cw-${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }));

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const t = await tokens(page);
  const d = await read(page, '#day');
  const lv = d.bands[0];
  check(`bands sit at their time in the 24 hours ending now (${lv.map((b) => `${b.left}+${b.width}`)})`,
    Math.abs(lv[0].left - 4.17) < 0.05 && Math.abs(lv[0].width - 6.25) < 0.05 && Math.abs(lv[1].left - 75) < 0.05 && Math.abs(lv[2].left + lv[2].width - 100) < 0.05);
  check(`a span without to goes on to now and is marked so (${lv.map((b) => b.open)})`, lv.map((b) => b.open).join() === 'false,false,true');
  check(`closed and other idle states draw no band (${d.bands[3].map((b) => b.state)})`, d.bands[3].map((b) => b.state).join() === 'open,open');
  check(`states take the look's colours in the order they first appear (${d.legend})`, d.legend.join() === 'on,heat,cool,open'
    && lv[0].color === t[0] && d.bands[2][0].color === t[1] && d.bands[2][1].color === t[2] && d.bands[3][0].color === t[3]);
  check(`each row reads how long each state lasted (${d.aria})`, d.aria.join('|') === '居間の照明 on 7時間|寝室の照明 on 1時間36分|エアコン heat 10時間 cool 2時間|玄関 open 18分' && d.role === 'list');
  check(`a band says its state, times and length (${d.bands[2][1].title})`, /^cool \d+:\d\d〜\d+:\d\d（2時間）$/.test(d.bands[2][1].title) && /〜いま（4時間）$/.test(d.bands[2][2].title));
  check(`the axis names whole hours every 6 and ends at いま (${d.ticks})`, d.ticks.at(-1) === 'いま' && d.ticks.length >= 4 && d.ticks.slice(0, -1).every((x) => /^(0|6|12|18):00$/.test(x)));
  check(`the axis lines up with the bands (${d.axisLeft}, ${d.trackLeft})`, d.axisLeft === d.trackLeft);
  check(`calm: ongoing bands stay still (${lv[2].anim})`, lv[2].anim === 'none');

  const w = await read(page, '#washer');
  check(`hours=6 and .colors set the colours; times add up per state (${w.aria})`, w.aria[0] === '洗濯機 洗い 1時間6分 すすぎ 1時間 脱水 12分' && w.bands[0][0].color === t[0] && w.bands[0][2].color === t[2] && w.bands[0][1].color === t[1]);
  check(`hours=6: the axis steps by the hour or two (${w.ticks})`, w.ticks.length >= 3 && w.ticks.slice(0, -1).every((x) => /:00$/.test(x)));

  const nr = await read(page, '#narrow');
  check(`under 260px the name sits above the band (${nr.beside})`, nr.beside === false && d.beside === true);
  const n = await read(page, '#none');
  check(`nothing to show says so (${n.empty})`, n.empty === '表示する対象はありません');

  const odd = await page.evaluate(async () => {
    const e = document.createElement('cw-timeline'); document.querySelector('#board').append(e);
    const now = Date.now(), H = 3600e3;
    e.data = [{ label: 'a', spans: [{ from: now - 30 * H, to: now - 20 * H, state: 'on' }, { from: 'nope', to: now, state: 'on' }, { from: now - H, to: now - 2 * H, state: 'on' },
      { from: new Date(now - 2 * H).toISOString(), to: new Date(now - H), state: 'on' }, null, { from: now - 50 * H, to: now - 40 * H, state: 'on' }] }, null, 'x', { label: 'b', spans: 'x' }];
    await e.updateComplete;
    const out = [...e.shadowRoot.querySelectorAll('[part=row]')].map((r) => r.getAttribute('aria-label'));
    const first = e.shadowRoot.querySelector('[part=band]').style.left;
    e.remove(); return [...out, first];
  });
  check(`a span from before the window starts at its left edge; bad times, backwards and outside spans are dropped; ISO strings and Dates read (${odd})`,
    odd.join('|') === 'a on 5時間|b|0%');

  // the window follows the clock: a minute later every band is a minute further left
  const before = d.bands[0][0].left;
  await page.wait(61000);
  const later = await read(page, '#day');
  check(`a minute later the bands move left with the clock (${before} → ${later.bands[0][0].left})`, Math.abs(before - later.bands[0][0].left - 0.07) < 0.02);

  const held = await page.evaluate(async () => {
    const st = document.querySelector('#board'), e = document.querySelector('#none');
    st.pause(); await st.updateComplete;
    e.data = [{ label: 'new', spans: [{ from: Date.now() - 3600e3, state: 'on' }] }]; await e.updateComplete;
    const during = e.shadowRoot.querySelectorAll('[part=row]').length, waiting = e.data.length;
    st.resume(); await st.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.shadowRoot.querySelector('[part=row]').getAttribute('aria-label') };
  });
  check(`paused: new values wait, resume shows them (${JSON.stringify(held)})`, held.during === 0 && held.waiting === 1 && held.after === 'new on 1時間');

  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#day');
  check(`full: ongoing bands pulse, finished ones do not (${f.bands[0].map((b) => b.anim)})`, f.bands[0].map((b) => b.anim).join() === 'none,none,pulse');
  const fp = await page.evaluate(async () => { const st = document.querySelector('#board'); st.pause(); await st.updateComplete; const e = document.querySelector('#day'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[data-open]')).animationName; });
  check(`full but paused: it stops (${fp})`, fp === 'none');

  await page.goto(`${base}?theme=dracula`, { waitUntil: 'load' });
  const dt = await tokens(page);
  const dr = await read(page, '#day');
  check(`dracula: same rows, the theme's colours (${dr.bands[0][0].color})`, dr.aria.join() === d.aria.join() && dr.bands[0][0].color === dt[0] && dt[0] !== t[0]);
}
