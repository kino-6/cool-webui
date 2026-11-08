// <cw-battery>: batteries from the emptiest, low ones marked, charging and unknown ones, more than max, pause, motion, look.
export const demo = 'battery.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, rows = [...r.querySelectorAll('[part=row]')];
  return {
    rows: rows.map((x) => [[...x.querySelector('[part=name]').childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('').trim(), x.querySelector('[part=level]').textContent.trim()]),
    low: rows.map((x) => x.hasAttribute('data-low')),
    aria: rows.map((x) => x.getAttribute('aria-label')),
    widths: rows.map((x) => Math.round(x.querySelector('[part=fill]').getBoundingClientRect().width / x.querySelector('[part=bar]').getBoundingClientRect().width * 1000) / 10 + '%'),
    colors: rows.map((x) => getComputedStyle(x.querySelector('[part=fill]')).backgroundColor),
    anim: rows.map((x) => getComputedStyle(x.querySelector('[part=fill]')).animationName),
    bar: rows[0] ? getComputedStyle(rows[0].querySelector('[part=bar]')).display : null,
    more: r.querySelector('[part=more]')?.textContent.trim() ?? null,
    empty: r.querySelector('[part=empty]')?.textContent.trim() ?? null,
    role: e.getAttribute('role'), itemRole: rows[0]?.getAttribute('role'),
  };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const h = await read(page, '#home');
  check(`emptiest first; a low flag before the unknown one (${JSON.stringify(h.rows)})`,
    h.rows.map((r) => r[0]).join() === '寝室の温度計,ドアの鍵,窓の開閉センサー,玄関の人感センサー,スマホ,浴室の水漏れ,庭の水やり');
  check(`percent rounds; unknown is a dash; a bare low flag says 少ない (${h.rows.map((r) => r[1])})`, h.rows.map((r) => r[1]).join() === '12%,20%,38%,64%,81%,少ない,—');
  check(`at or under 20 is low, and so is the flag (${h.low})`, h.low.join() === 'true,true,false,false,false,true,false');
  check(`the bar is as long as the level (${h.widths})`, h.widths.join() === '12%,19.6%,38%,64%,81%,0%,0%');
  const [warn, sig, ok] = await page.evaluate(() => ['--cw-warn', '--cw-signal', '--cw-ok'].map((v) => { const d = document.createElement('div'); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }));
  check(`low bars are in the warning colour, charging in the ok colour (${h.colors[0]}, ${h.colors[4]}, ${h.colors[2]})`, h.colors[0] === warn && h.colors[4] === ok && h.colors[2] === sig);
  check(`each row reads its name, percent, low and charging (${h.aria[0]}; ${h.aria[4]})`, h.aria[0] === '寝室の温度計 12% 少ない' && h.aria[4] === 'スマホ 81% 充電中' && h.aria[6] === '庭の水やり —');
  check(`it is a list of items (${h.role}, ${h.itemRole})`, h.role === 'list' && h.itemRole === 'listitem');
  const m = await read(page, '#many');
  check(`max=4 shows four and says how many more (${m.rows.length}, ${m.more})`, m.rows.length === 4 && m.more === 'ほか 5 件' && m.rows[0][1] === '5%');
  check(`low=30 moves the line (${m.low})`, m.low.join() === 'true,true,true,false');
  const n = await read(page, '#none');
  check(`nothing to show says so (${n.empty})`, n.empty === '電池の情報はありません' && n.rows.length === 0);
  const nr = await read(page, '#narrow');
  check(`a narrow list drops the bars, keeps the numbers (${nr.bar}, ${nr.rows.map((r) => r[1])})`, nr.bar === 'none' && nr.rows.length === 4);
  check(`calm: low bars stay still (${h.anim[0]})`, h.anim[0] === 'none');

  // paused: new items wait; resume shows them
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#home');
    s.pause(); await s.updateComplete;
    e.items = [{ name: '新しい電池', level: 3 }]; await e.updateComplete;
    const during = e.shadowRoot.querySelectorAll('[part=row]').length, waiting = e.items.length;
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.shadowRoot.querySelector('[part=name]').textContent.trim() };
  });
  check(`paused: new items wait, resume shows them (${JSON.stringify(held)})`, held.during === 7 && held.waiting === 1 && held.after === '新しい電池');

  // holes found by the audit of T094: exactly 20, the default line, a low one charging, null, a max that is not a number
  const holes = await page.evaluate(async () => {
    const e = document.createElement('cw-battery'); e.setAttribute('motion', 'full'); document.body.append(e);
    e.items = [{ name: 'a', level: 20 }, { name: 'b', level: 21 }, { name: 'c', level: 8, charging: true }, { name: 'd', level: null }, { name: 'e', level: '' }];
    await e.updateComplete;
    const rows = [...e.shadowRoot.querySelectorAll('[part=row]')];
    const out = { low: rows.map((r) => `${r.getAttribute('aria-label')}:${r.hasAttribute('data-low')}`), pulse: rows.map((r) => getComputedStyle(r.querySelector('[part=fill]')).animationName) };
    e.max = NaN; await e.updateComplete;
    out.nanMax = e.shadowRoot.querySelectorAll('[part=row]').length;
    e.remove();
    return out;
  });
  check(`holes: exactly 20 is low by default, 21 is not (${holes.low.slice(0, 3)})`, holes.low[0] === 'c 8% 少ない 充電中:true' && holes.low[1] === 'a 20% 少ない:true' && holes.low[2] === 'b 21%:false');
  check(`holes: a low one that is charging does not pulse (${holes.pulse})`, holes.pulse[0] === 'none' && holes.pulse[1] === 'pulse');
  check(`holes: null and empty levels are unknown, not 0% (${holes.low.slice(3)})`, holes.low[3] === 'd —:false' && holes.low[4] === 'e —:false');
  check(`holes: a max that is not a number shows the default rows (${holes.nanMax})`, holes.nanMax === 5);
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#home');
  check(`full: low bars pulse, a charging one does not (${f.anim})`, f.anim[0] === 'pulse' && f.anim[1] === 'pulse' && f.anim[4] === 'none' && f.anim[2] === 'none');
  const fp = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#home'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=fill]')).animationName; });
  check(`full but paused: the pulse stops (${fp})`, fp === 'none');

  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  const g = await read(page, '#home');
  check(`game: same order and numbers (${g.rows.map((r) => r[1])})`, g.rows.map((r) => r[1]).join() === h.rows.map((r) => r[1]).join());
  const garbage = await page.evaluate(async () => { const e = document.querySelector('#none'); e.items = 'x'; await e.updateComplete; const a = e.shadowRoot.querySelector('[part=empty]')?.textContent; e.items = [null, 3, { name: 'ok', level: 150 }, { name: 'neg', level: -5 }]; await e.updateComplete; return [a, [...e.shadowRoot.querySelectorAll('[part=level]')].map((x) => x.textContent).join()]; });
  check(`not a list, nulls and numbers outside 0-100 are handled (${garbage})`, garbage[0] === '電池の情報はありません' && garbage[1] === '0%,100%');
}
