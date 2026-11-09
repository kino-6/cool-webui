// <cw-table>: columns, numbers right and with digits, warning cells, sorting by a heading, empty values, more rows,
// columns from the first row, a narrow box, pause, the full motion flash, look.
export const demo = 'table.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, rows = [...r.querySelectorAll('tbody tr')];
  return {
    heads: [...r.querySelectorAll('th')].map((h) => h.textContent.replace(/\s+/g, '')),
    sorted: [...r.querySelectorAll('th')].map((h) => h.getAttribute('aria-sort')).filter(Boolean),
    cells: rows.map((tr) => [...tr.children].map((td) => td.textContent.replace(/\s+/g, ''))),
    warn: rows.map((tr) => [...tr.children].map((td) => (td.hasAttribute('data-warn') ? 1 : 0)).join('')),
    align: rows[0] ? [...rows[0].children].map((td) => getComputedStyle(td).textAlign) : [],
    warnColor: r.querySelector('[data-warn]') ? getComputedStyle(r.querySelector('[data-warn]')).color : null,
    more: r.querySelector('[part=more]')?.textContent.trim() ?? null,
    empty: r.querySelector('[part=empty]')?.textContent.trim() ?? null,
    scroll: [e.scrollWidth, e.clientWidth, getComputedStyle(e).overflowX],
  };
}, sel);
const press = (page, sel, i) => page.evaluate(async (s, n) => { const e = document.querySelector(s); e.shadowRoot.querySelectorAll('th button')[n].click(); await e.updateComplete; }, sel, i);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const c = await read(page, '#containers');
  check(`headings from the columns; the sorted one carries the arrow (${c.heads})`, c.heads.join() === '名前,状態,CPU▼,メモリ,稼働');
  check(`sort="cpu" desc: highest CPU first, max=6 rows (${c.cells.map((x) => x[0])})`,
    c.cells.map((x) => x[0]).join() === 'frigate,homeassistant,influxdb,zigbee2mqtt,node-red,grafana' && c.sorted.join() === 'descending');
  check(`ほか N 行 counts the rest (${c.more})`, c.more === 'ほか 2 行');
  check(`digits and units in the cells (${c.cells[0]})`, c.cells[0].join() === 'frigate,動作中,86.2%,1720MB,3日' && c.cells[3][2] === '3.1%');
  check(`numbers right, words left (${c.align})`, c.align.map((a) => (a === 'right' ? 'right' : 'left')).join() === 'left,left,right,right,right');
  const warn = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-warn)'; document.body.append(d); const x = getComputedStyle(d).color; d.remove(); return x; });
  check(`over warnAbove is in the warning colour, only there (${c.warn.slice(0, 2)}, ${c.warnColor})`, c.warn[0] === '00110' && c.warn.slice(1).every((w) => w === '00000') && c.warnColor === warn);

  await press(page, '#containers', 2);
  const up = await read(page, '#containers');
  check(`pressing the sorted heading turns the order (${up.cells.map((x) => x[2])}, ${up.sorted})`, up.cells[0][0] === 'mosquitto' && up.cells.at(-1)[0] === 'homeassistant' && up.sorted.join() === 'ascending' && up.heads[2] === 'CPU▲');
  await press(page, '#containers', 0);
  const byName = await read(page, '#containers');
  check(`pressing another heading sorts by it, words in order (${byName.cells.map((x) => x[0])})`, byName.cells.map((x) => x[0]).join() === 'backup,frigate,grafana,homeassistant,influxdb,mosquitto' && byName.heads[0] === '名前▲');
  check(`an empty value is a dash with no unit (${byName.cells[0]})`, byName.cells[0].join() === 'backup,停止,—,—,—');

  // empty values go last both ways
  const last = await page.evaluate(async () => {
    const e = document.createElement('cw-table'); document.querySelector('#board').append(e);
    e.data = [{ n: 'a', v: 2 }, { n: 'b', v: null }, { n: 'c', v: 10 }, { n: 'd', v: '' }, { n: 'e', v: '3' }];
    e.sort = 'v'; await e.updateComplete;
    const names = () => [...e.shadowRoot.querySelectorAll('tbody tr')].map((tr) => tr.children[0].textContent).join('');
    const asc = names(); e.desc = true; await e.updateComplete; const desc = names();
    e.remove(); return [asc, desc];
  });
  check(`numbers sort as numbers ('3' is 3, 10 after 3) and empties stay last both ways (${last})`, last[0] === 'aecbd' && last[1] === 'ceabd');

  const p = await read(page, '#plain');
  check(`without columns, the first row's keys; without sort, the given order (${p.heads}; ${p.cells.map((x) => x[0])})`, p.heads.join() === '部屋,温度,湿度' && p.cells.map((x) => x[0]).join() === '居間,寝室,書斎' && p.sorted.length === 0);
  const n = await read(page, '#none');
  check(`no rows says so (${n.empty})`, n.empty === '表示する行はありません' && n.cells.length === 0);
  const nr = await read(page, '#narrow');
  check(`a narrow box scrolls sideways inside itself (${nr.scroll})`, nr.scroll[0] > nr.scroll[1] && nr.scroll[2] === 'auto');

  // paused: new rows wait; resume shows them
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#plain');
    s.pause(); await s.updateComplete;
    e.data = [{ 部屋: '台所', 温度: 25 }]; await e.updateComplete;
    const during = e.shadowRoot.querySelectorAll('tbody tr').length, waiting = e.data.length;
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.shadowRoot.querySelector('tbody td').textContent };
  });
  check(`paused: new rows wait, resume shows them (${JSON.stringify(held)})`, held.during === 3 && held.waiting === 1 && held.after === '台所');

  const flash = async () => page.evaluate(async () => {
    const e = document.querySelector('#plain');
    e.key = '部屋'; e.data = [{ 部屋: '居間', 温度: 22 }, { 部屋: '寝室', 温度: 19 }]; await e.updateComplete;
    e.data = [{ 部屋: '寝室', 温度: 19 }, { 部屋: '居間', 温度: 23 }]; await e.updateComplete;
    return [...e.shadowRoot.querySelectorAll('tbody td')].map((td) => `${td.textContent}:${td.hasAttribute('data-changed') ? 'changed' : '-'}:${getComputedStyle(td).animationName}`);
  });
  const calm = await flash();
  check(`a changed value is marked by its row's key, not its place; calm does not flash (${calm})`, calm.join() === '寝室:-:none,19:-:none,居間:-:none,23:changed:none');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const full = await flash();
  check(`full: the changed value flashes (${full})`, full[3] === '23:changed:flash' && full[1] === '19:-:none');

  await page.goto(`${base}?theme=latte`, { waitUntil: 'load' });
  const l = await read(page, '#containers');
  check(`latte: same rows (${l.cells.map((x) => x[0])})`, l.cells.map((x) => x[0]).join() === c.cells.map((x) => x[0]).join());
  const odd = await page.evaluate(async () => { const e = document.querySelector('#none'); e.data = 'x'; e.columns = [null, { label: 'no key' }]; await e.updateComplete; const a = e.shadowRoot.querySelector('[part=empty]')?.textContent; e.data = [null, 3, { a: 1 }]; await e.updateComplete; return [a, e.shadowRoot.querySelectorAll('tbody tr').length]; });
  check(`not a list, columns without a key and rows that are not objects are dropped (${odd})`, odd[0] === '表示する行はありません' && odd[1] === 1);
}
