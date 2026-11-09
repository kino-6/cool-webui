// <cw-donut>: shares as slices, the total in the middle, その他 past slices, one item as progress, legend, narrow,
// pause, motion, look.
export const demo = 'donut.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, slices = [...r.querySelectorAll('[part=slice]')];
  return {
    middle: r.querySelector('[part=middle]').textContent.replace(/\s+/g, ''),
    dash: slices.map((c) => c.getAttribute('stroke-dasharray').split(' ').map((x) => Math.round(Number(x) * 10) / 10)[0]),
    offset: slices.map((c) => Math.round(Number(c.getAttribute('stroke-dashoffset')) * 10) / 10),
    stroke: slices.map((c) => getComputedStyle(c).stroke),
    legend: [...r.querySelectorAll('[part=item]')].map((i) => `${i.querySelector('[part=name]').textContent}:${i.querySelector('[part=share]').textContent}`),
    swatch: [...r.querySelectorAll('[part=swatch]')].map((x) => getComputedStyle(x).backgroundColor),
    legendShown: r.querySelector('[part=legend]') ? getComputedStyle(r.querySelector('[part=legend]')).display : null,
    transition: slices[0] ? getComputedStyle(slices[0]).transitionProperty : null,
    duration: slices[0] ? getComputedStyle(slices[0]).transitionDuration : null,
    aria: e.getAttribute('aria-label'), role: e.getAttribute('role'),
  };
}, sel);
const tokens = (page) => page.evaluate(() => ['signal', 'ok', 'warn', 'text-dim'].map((v) => { const d = document.createElement('div'); d.style.color = `var(--cw-${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }));

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const t = await tokens(page);
  const u = await read(page, '#use');
  check(`the total and unit in the middle (${u.middle})`, u.middle === '12.0kWh');
  check(`one slice per item, each as long as its share less a hair of gap (${u.dash})`, u.dash.join() === '51.1,16.9,11.1,18.6');
  check(`each slice starts where the last ended (${u.offset})`, u.offset.join() === '0,-51.7,-69.2,-80.8');
  check(`slices take the look's colours in order (${u.stroke})`, u.stroke.join('|') === t.join('|'));
  check(`the legend lists each item with its share, same colours (${u.legend})`, u.legend.join() === 'エアコン:52%,冷蔵庫:18%,照明:12%,その他の家電:19%' && u.swatch.join('|') === t.join('|'));
  check(`it reads the total and each share (${u.aria})`, u.aria === '合計 12.0 kWh エアコン 52%、冷蔵庫 18%、照明 12%、その他の家電 19%' && u.role === 'img');
  const d = await read(page, '#disk');
  check(`one item is progress against max: percent in the middle, the value in the legend (${d.middle}; ${d.legend}; ${d.dash})`,
    d.middle === '72%使用' && d.legend.join() === '写真と動画:371 GB' && d.dash.join() === '72.5' && d.aria === '使用 72%');
  const m = await read(page, '#many');
  check(`past slices=5 the smallest go together as その他 (${m.legend})`, m.legend.join() === 'A:30%,B:22%,C:18%,D:12%,その他:18%');
  const nr = await read(page, '#narrow');
  check(`under 220px the legend is hidden, the ring stays (${nr.legendShown}, ${nr.middle})`, nr.legendShown === 'none' && nr.middle === '12.0kWh');
  const n = await read(page, '#none');
  check(`nothing to show is a dash, no slices, no legend (${n.middle}, ${n.dash.length}, ${n.legendShown})`, n.middle === '—' && n.dash.length === 0 && n.legendShown === null && n.aria === '—');
  check(`calm: slices do not move (${u.duration})`, u.duration === '0s');

  const odd = await page.evaluate(async () => {
    const e = document.createElement('cw-donut'); document.querySelector('#board').append(e);
    e.data = [{ label: 'a', value: 3, color: '#ff0000' }, { label: 'b', value: '1' }, { label: 'neg', value: -2 }, { label: 'zero', value: 0 }, { label: 'x', value: 'n/a' }, null, 7];
    await e.updateComplete;
    const r = e.shadowRoot, out = { legend: [...r.querySelectorAll('[part=item]')].map((i) => i.textContent.replace(/\s+/g, '')), stroke: getComputedStyle(r.querySelector('[part=slice]')).stroke };
    e.data = [{ label: 'over', value: 300 }]; await e.updateComplete;
    out.over = r.querySelector('[part=total]').textContent.replace(/\s+/g, '');
    e.remove(); return out;
  });
  check(`zero, negative and non-numbers are left out; a numeric string counts; color sets a slice (${JSON.stringify(odd)})`,
    odd.legend.join() === 'a75%,b25%' && odd.stroke === 'rgb(255, 0, 0)');
  check(`one item past max stops at 100% (${odd.over})`, odd.over === '100%');

  const held = await page.evaluate(async () => {
    const st = document.querySelector('#board'), e = document.querySelector('#use');
    st.pause(); await st.updateComplete;
    e.data = [{ label: 'x', value: 1 }, { label: 'y', value: 3 }]; await e.updateComplete;
    const during = e.shadowRoot.querySelectorAll('[part=slice]').length, waiting = e.data.length;
    st.resume(); await st.updateComplete; await e.updateComplete;
    return { during, waiting, after: e.shadowRoot.querySelector('[part=total]').textContent };
  });
  check(`paused: new values wait, resume shows them (${JSON.stringify(held)})`, held.during === 4 && held.waiting === 2 && held.after === '4.0');

  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#use');
  check(`full: slices move to new shares (${f.transition}, ${f.duration})`, /stroke-dasharray/.test(f.transition) && /stroke-dashoffset/.test(f.transition) && f.duration.startsWith('0.7s'));
  const fp = await page.evaluate(async () => { const st = document.querySelector('#board'); st.pause(); await st.updateComplete; const e = document.querySelector('#use'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=slice]')).transitionDuration; });
  check(`full but paused: no movement (${fp})`, fp === '0s');

  await page.goto(`${base}?theme=mocha`, { waitUntil: 'load' });
  const mt = await tokens(page);
  const mo = await read(page, '#use');
  check(`mocha: same shares, the theme's colours (${mo.stroke[0]})`, mo.legend.join() === u.legend.join() && mo.stroke.join('|') === mt.join('|') && mt[0] !== t[0]);
}
