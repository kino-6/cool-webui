// <cw-uptime>: squares per check, the share up, the state now, Uptime Kuma's numbers, padding, narrow, pause, motion, look.
export const demo = 'uptime.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, rows = [...r.querySelectorAll('[part=row]')];
  return {
    rows: rows.map((x) => [x.querySelector('[part=label]').textContent, x.querySelector('[part=state]').textContent, x.querySelector('[part=ratio]').textContent]),
    squares: rows.map((x) => [...x.querySelectorAll('[part=squares] i')].map((i) => ({ up: 'u', down: 'd', pending: 'p', maintenance: 'm' }[i.dataset.s] ?? '.')).join('')),
    colors: rows.map((x) => [...x.querySelectorAll('[part=squares] i')].map((i) => getComputedStyle(i).backgroundColor)),
    stateColor: rows.map((x) => getComputedStyle(x.querySelector('[part=state]')).color),
    anim: rows.map((x) => getComputedStyle(x.querySelector('[part=squares] i:last-child')).animationName),
    shown: rows[0] ? getComputedStyle(rows[0].querySelector('[part=squares]')).display : null,
    aria: rows.map((x) => x.getAttribute('aria-label')), role: e.getAttribute('role'), itemRole: rows[0]?.getAttribute('role'),
    empty: r.querySelector('[part=empty]')?.textContent ?? null,
  };
}, sel);
const tokens = (page) => page.evaluate(() => Object.fromEntries(['ok', 'warn', 'text-dim', 'signal'].map((v) => { const d = document.createElement('div'); d.style.color = `var(--cw-${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return [v, c]; })));

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const t = await tokens(page);
  const s = await read(page, '#sites');
  check(`labels, the state now and the share up (${JSON.stringify(s.rows)})`, JSON.stringify(s.rows) === JSON.stringify([
    ['Home Assistant', '稼働中', '100%'], ['ルーター', '稼働中', '93.3%'], ['NAS', '稼働中', '99.9%'], ['庭のカメラ', '停止', '90.0%'], ['バックアップ', '確認中', '100%']]));
  check(`one square per check, oldest left (${s.squares[1]})`, s.squares[1] === 'u'.repeat(11) + 'dd' + 'u'.repeat(17) && s.squares[3].endsWith('uddd'));
  check(`fewer checks than points leave the left empty (${s.squares[4]})`, s.squares[4] === '.'.repeat(18) + 'u'.repeat(11) + 'p');
  check(`maintenance squares are their own kind (${s.squares[2].slice(18, 25)})`, s.squares[2].slice(20, 23) === 'mmm');
  check(`square colours: up ok, down warn, pending dim, maintenance signal (${s.colors[1][11]}, ${s.colors[4][29]})`,
    s.colors[0][0] === t.ok && s.colors[1][11] === t.warn && s.colors[4][29] === t['text-dim'] && s.colors[2][20] === t.signal);
  check(`a thing down now says so in the warning colour (${s.stateColor[3]}, ${s.stateColor[0]})`, s.stateColor[3] === t.warn && s.stateColor[0] === t.ok);
  check(`each row reads its name, state and share (${s.aria[3]})`, s.aria[3] === '庭のカメラ 停止 稼働 90.0%' && s.role === 'list' && s.itemRole === 'listitem');
  const k = await read(page, '#kuma');
  check(`Uptime Kuma's numbers and {status} objects read; points=20 (${JSON.stringify(k.rows)}; ${k.squares})`,
    k.rows[0].join() === 'api,稼働中,93.7%' && k.rows[1].join() === 'web,稼働中,100%' && k.squares[1] === '....uuuuuuupuuuummuu' && k.squares[0].length === 20);
  const nr = await read(page, '#narrow');
  check(`under 200px the squares are hidden, the shares stay (${nr.shown}, ${nr.rows.map((r) => r[2])})`, nr.shown === 'none' && nr.rows.length === 4);
  const n = await read(page, '#none');
  check(`nothing to watch says so (${n.empty})`, n.empty === '見張る対象はありません');
  check(`calm: the newest square of a thing down stays still (${s.anim[3]})`, s.anim[3] === 'none');

  const holes = await page.evaluate(async () => {
    const e = document.createElement('cw-uptime'); document.querySelector('#board').append(e);
    e.data = [{ label: 'a', history: ['up', 'up'], state: 'down' }, { label: 'b', history: 'x' }, { label: 'c', history: [true, false, 'nope'], ratio: '' },
      { label: 'd', ratio: 99.96 }, { label: 'e', ratio: 140 }, null, 4];
    await e.updateComplete;
    const out = [...e.shadowRoot.querySelectorAll('[part=row]')].map((x) => x.getAttribute('aria-label'));
    e.remove(); return out;
  });
  check(`state beats the last check; no history is 不明 —; '' ratio is worked out; 99.96 is 99.9; over 100 is 100; non-objects dropped (${holes})`,
    holes.join('|') === 'a 停止 稼働 100%|b 不明 稼働 —|c 不明 稼働 50.0%|d 不明 稼働 99.9%|e 不明 稼働 100%');

  const held = await page.evaluate(async () => {
    const st = document.querySelector('#board'), e = document.querySelector('#kuma');
    st.pause(); await st.updateComplete;
    e.data = [{ label: 'new', history: [0] }]; await e.updateComplete;
    const during = e.shadowRoot.querySelectorAll('[part=row]').length, waiting = e.data.length;
    st.resume(); await st.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.shadowRoot.querySelector('[part=row]').getAttribute('aria-label') };
  });
  check(`paused: new values wait, resume shows them (${JSON.stringify(held)})`, held.during === 2 && held.waiting === 1 && held.after === 'new 停止 稼働 0.0%');

  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#sites');
  check(`full: the newest square of a thing down blinks, others do not (${f.anim})`, f.anim[3] === 'blink' && f.anim.filter((a) => a === 'blink').length === 1);
  const fp = await page.evaluate(async () => { const st = document.querySelector('#board'); st.pause(); await st.updateComplete; const e = document.querySelector('#sites'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelectorAll('[part=row]')[3].querySelector('i:last-child')).animationName; });
  check(`full but paused: the blink stops (${fp})`, fp === 'none');

  await page.goto(`${base}?theme=dracula`, { waitUntil: 'load' });
  const dt = await tokens(page);
  const d = await read(page, '#sites');
  check(`dracula: same rows, the theme's colours (${d.colors[1][11]})`, JSON.stringify(d.rows) === JSON.stringify(s.rows) && d.colors[1][11] === dt.warn && dt.warn !== t.warn);
}
