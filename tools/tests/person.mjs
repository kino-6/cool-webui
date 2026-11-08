// <cw-person>: who is where and since when, home first, photo or initial, minute refresh, pause, motion, narrow, look.
export const demo = 'person.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, rows = [...r.querySelectorAll('[part=person]')];
  const t = (x, p) => x.querySelector(`[part=${p}]`)?.textContent.trim() ?? null;
  return { rows: rows.map((x) => [t(x, 'name'), t(x, 'place'), t(x, 'since')]), home: rows.map((x) => x.hasAttribute('data-home')),
    faces: rows.map((x) => (x.querySelector('[part=face] img') ? 'img' : t(x, 'face'))), aria: rows.map((x) => x.getAttribute('aria-label')),
    ring: rows.map((x) => getComputedStyle(x.querySelector('[part=face]')).borderTopColor), breathe: rows.map((x) => getComputedStyle(x.querySelector('[part=face]')).animationName),
    sinceShown: rows[0] ? getComputedStyle(rows[0].querySelector('[part=since]')).display : null,
    empty: r.querySelector('[part=empty]')?.textContent.trim() ?? null, role: e.getAttribute('role') };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const f = await read(page, '#family');
  check(`home first, then the rest as given (${f.rows.map((r) => r[0])})`, f.rows.map((r) => r[0]).join() === 'アオイ,リク,ハル,ソラ');
  check(`home reads 在宅, not_home 外出, a zone its name (${f.rows.map((r) => r[1])})`, f.rows.map((r) => r[1]).join() === '在宅,在宅,外出,学校');
  check(`since: minutes, under a minute, hours, days (${f.rows.map((r) => r[2])})`, f.rows.map((r) => r[2]).join() === '25分前から,いまから,3時間前から,1日前から');
  check(`a photo, else the first letter (${f.faces})`, f.faces.join() === 'img,リ,ハ,ソ');
  const ok = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-ok)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  check(`people at home have a ring in the ok colour (${f.ring[0]}, ${f.ring[2]})`, f.ring[0] === ok && f.ring[1] === ok && f.ring[2] !== ok);
  check(`a list read as name, place and since (${f.role}; ${f.aria[2]})`, f.role === 'list' && f.aria[2] === 'ハル 外出 3時間前から');
  const n = await read(page, '#none');
  check(`nobody: says so (${n.empty})`, n.empty === '人の情報はありません');
  const nr = await read(page, '#narrow');
  check(`a narrow box hides since (${nr.sinceShown}; wide ${f.sinceShown})`, nr.sinceShown === 'none' && f.sinceShown !== 'none');
  check(`calm: rings stay still (${f.breathe[0]})`, f.breathe[0] === 'none');
  // times are looked at again every minute from when the part was put on the page: six minutes and a bit
  await page.wait(60000 * 6.2);
  const later = await read(page, '#family');
  // the minute check runs from when the part was put on the page, so the shown time is one of two minutes
  check(`six minutes later the times have moved on (${later.rows[0][2]}, ${later.rows[1][2]})`, ['30分前から', '31分前から'].includes(later.rows[0][2]) && ['5分前から', '6分前から'].includes(later.rows[1][2]));
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#family');
    s.pause(); await s.updateComplete;
    e.people = [{ name: '客', place: 'home' }]; await e.updateComplete;
    const during = [e.shadowRoot.querySelectorAll('[part=person]').length, e.people.length];
    const t0 = e.shadowRoot.querySelector('[part=since]').textContent;
    await window.__wait(120000); await e.updateComplete;
    const frozen = [t0, e.shadowRoot.querySelector('[part=since]').textContent];
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { during, frozen, after: e.shadowRoot.querySelector('[part=name]').textContent };
  });
  check(`paused: new people wait and the times stand still; resume shows them (${JSON.stringify(held)})`, held.during.join() === '4,1' && held.frozen[0] === held.frozen[1] && held.after === '客');
  // holes found by the audit of T101
  const h = await page.evaluate(async () => {
    const e = document.createElement('cw-person'); document.body.append(e);
    const now = Date.now();
    e.people = [{ name: '👨‍👩‍👧 家族', place: 'home' }, { name: '🇯🇵 旅', place: 'not_home', since: now - (23 * 60 + 59) * 60e3 }, { name: 'x', place: 'not_home', since: now - 24 * 3600e3 }];
    await e.updateComplete;
    const out = { faces: [...e.shadowRoot.querySelectorAll('[part=face]')].map((f) => f.textContent.trim()), since: [...e.shadowRoot.querySelectorAll('[part=since]')].map((f) => f.textContent) };
    e.remove();
    const f = document.querySelector('#family'), s = document.querySelector('#board');
    f.people = [{ name: 'A', place: 'home', since: Date.now() - 10 * 60e3 }]; await f.updateComplete;
    const t0 = f.shadowRoot.querySelector('[part=since]').textContent;
    s.pause(); await s.updateComplete;
    await window.__wait(150000);
    s.resume(); await s.updateComplete; await f.updateComplete;
    out.resume = [t0, f.shadowRoot.querySelector('[part=since]').textContent];
    return out;
  });
  check(`first letter is a whole grapheme (${h.faces})`, h.faces[0] === '👨‍👩‍👧' && h.faces[1] === '🇯🇵');
  check(`23h59m reads hours, 24h reads 1日前から (${h.since})`, h.since[0] === '23時間前から' && h.since[1] === '1日前から');
  check(`resume refreshes the times (${h.resume})`, h.resume[0] === '10分前から' && h.resume[1] === '12分前から');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const full = await read(page, '#family');
  check(`full: rings of people at home breathe, others do not (${full.breathe})`, full.breathe[0] === 'breathe' && full.breathe[2] === 'none');
  const pb = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#family'); await e.updateComplete; const v = getComputedStyle(e.shadowRoot.querySelector('[part=face]')).animationName; s.resume(); await s.updateComplete; return v; });
  check(`paused: full rings stand still (${pb})`, pb === 'none');
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  const g = await page.evaluate(() => getComputedStyle(document.querySelector('#family').shadowRoot.querySelector('[part=name]')).fontFamily);
  check(`game: names use the wide display face (${g})`, /^Archivo/.test(g));
  const odd = await page.evaluate(async () => { const e = document.querySelector('#none'); e.people = [null, { place: '' }, { name: 'X', place: 'home', since: 'bad' }]; await e.updateComplete; return [...e.shadowRoot.querySelectorAll('[part=person]')].map((x) => x.getAttribute('aria-label')).join('|'); });
  check(`nulls, a missing name and place, a bad time are handled (${odd})`, odd === 'X 在宅|不明');
}
