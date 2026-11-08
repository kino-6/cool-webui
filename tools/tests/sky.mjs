// <cw-sky>: the sun on the day's arc, sunrise, sunset and day length, the moon at night, minute refresh, pause, motion.
export const demo = 'sky.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); e.requestUpdate(); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}] b`)?.textContent.trim() ?? null, sun = r.querySelector('[part=sun]');
  return { rise: t('rise'), set: t('set'), phase: t('phase'), length: r.querySelector('[part=length]')?.textContent.trim() ?? null,
    lengthShown: r.querySelector('[part=length]') ? getComputedStyle(r.querySelector('[part=length]')).display !== 'none' : null,
    sun: sun ? [+sun.getAttribute('cx'), +sun.getAttribute('cy')] : null, moon: !!r.querySelector('[part=moon]'), lit: r.querySelector('[part=moon] .lit')?.getAttribute('d') ?? null,
    glow: sun ? getComputedStyle(sun).animationName : null, aria: e.getAttribute('aria-label'), day: e.hasAttribute('data-day') };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const hm = (t) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const d = await read(page, '#day');
  const want = await page.evaluate(() => { const e = document.querySelector('#day'); return [e.now.rise, e.now.set]; });
  check(`sunrise and sunset times (${d.rise}, ${d.set})`, d.rise === hm(want[0]) && d.set === hm(want[1]));
  check(`the length of the day (${d.length})`, d.length === '昼の長さ 10時間40分');
  check(`a quarter of the way through the day, the sun is a quarter along the arc and up (${d.sun})`, Math.abs(d.sun[0] - (10 + 0.25 * 180)) < 1.5 && d.sun[1] < 40 && d.day);
  check(`by day no moon, but the phase word is given (${d.moon}, ${d.phase})`, !d.moon && d.phase === '三日月');
  check(`read as sunrise, sunset and phase (${d.aria})`, d.aria === `日の出 ${d.rise} 日の入り ${d.set} 三日月`);
  const n = await read(page, '#night');
  check(`at night no sun, the moon drawn and named (${n.sun}, ${n.moon}, ${n.phase})`, n.sun === null && n.moon && n.phase === '満ちていく月' && !n.day);
  const x = await read(page, '#none');
  check(`no values: dashes, no sun or moon (${x.rise}, ${x.set}, ${x.aria})`, x.rise === '—' && x.set === '—' && x.sun === null && !x.moon && x.aria === '空の情報なし');
  const nr = await read(page, '#narrow');
  check(`a narrow box hides the day length, no phase without the moon (${nr.lengthShown}, ${nr.phase})`, nr.lengthShown === false && nr.phase === null);
  const phases = await page.evaluate(async () => {
    const e = document.querySelector('#night'), out = {};
    for (const p of ['new_moon', 'first_quarter', 'full_moon', 'last_quarter', 'waning_crescent']) { e.now = { phase: p }; await e.updateComplete; out[p] = [e.shadowRoot.querySelector('[part=phase] b').textContent, e.shadowRoot.querySelector('[part=moon] .lit')?.getAttribute('d') ?? '']; }
    return out;
  });
  check(`new moon has no lit part, full moon is a whole circle (${phases.new_moon}, ${phases.full_moon[1].slice(0, 20)})`, phases.new_moon[1] === '' && phases.new_moon[0] === '新月' && /a16 16 0 1 1 0 32/.test(phases.full_moon[1]));
  check(`first and last quarter are lit on opposite sides (${phases.first_quarter[1]} | ${phases.last_quarter[1]})`, phases.first_quarter[0] === '上弦の月' && phases.last_quarter[0] === '下弦の月' && phases.first_quarter[1] !== phases.last_quarter[1]);
  const moved = await page.evaluate(async () => {
    const e = document.querySelector('#day'), cx = () => +e.shadowRoot.querySelector('[part=sun]').getAttribute('cx');
    const a = cx(); await window.__wait(3 * 3600e3 + 61000); await e.updateComplete;
    const b = cx();
    const s = document.querySelector('#board'); s.pause(); await s.updateComplete; await e.updateComplete;
    const p = cx();
    await window.__wait(3600e3); await e.updateComplete;
    const c = cx(); s.resume(); await s.updateComplete; await e.updateComplete;
    return { a, b: p, c, d: cx() };
  });
  check(`three hours later the sun has moved on, by the minute refresh (${moved.a} -> ${moved.b})`, moved.b - moved.a > 40);
  check(`paused it stands still; resumed it catches up (${moved.b}, ${moved.c}, ${moved.d})`, moved.c === moved.b && moved.d > moved.c);
  const held = await page.evaluate(async () => { const s = document.querySelector('#board'), e = document.querySelector('#none'); s.pause(); await s.updateComplete; e.now = { rise: Date.now() - 3600e3, set: Date.now() + 3600e3 }; await e.updateComplete; const during = !!e.shadowRoot.querySelector('[part=sun]'); s.resume(); await s.updateComplete; await e.updateComplete; return [during, !!e.shadowRoot.querySelector('[part=sun]')]; });
  check(`paused: new values wait (${held})`, held.join() === 'false,true');
  check(`calm: the sun does not glow (${d.glow})`, d.glow === 'none');
  // holes found by the audit of T110
  const h = await page.evaluate(async () => {
    const e = document.createElement('cw-sky'); document.body.append(e);
    const out = {};
    const t = Date.now(), H = 3600e3;
    e.now = { rise: t - 2.5 * H, set: t + 7.5 * H }; await e.updateComplete;
    out.sy = +e.shadowRoot.querySelector('[part=sun]').getAttribute('cy');
    e.now = { rise: NaN, set: NaN };
    const shapes = {};
    for (const south of [false, true]) {
      for (const p of ['new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent']) {
        e.now = { phase: p, south, up: false }; await e.updateComplete;
        const lit = e.shadowRoot.querySelector('[part=moon] .lit'), b = lit?.getBBox();
        // is the point 4 to the right / left of the middle lit?
        const at = (dx) => !!lit && lit.isPointInFill(new DOMPoint(100 + dx, 40));
        shapes[(south ? 's:' : '') + p] = [e.shadowRoot.querySelector('[part=phase] b').textContent, b ? Math.round(b.x + b.width / 2) : null, `${at(4) ? 'R' : ''}${at(-4) ? 'L' : ''}`];
      }
    }
    out.shapes = shapes;
    e.now = { phase: '', south: false, up: true, rise: NaN, set: NaN }; await e.updateComplete;
    const sun = e.shadowRoot.querySelector('[part=sun]');
    out.polar = [sun ? Math.round(+sun.getAttribute('cx')) : null, !!e.shadowRoot.querySelector('[part=length]'), e.shadowRoot.querySelector('[part=rise] b').textContent];
    e.remove();
    return out;
  });
  check(`holes: a quarter through the day the sun is at the arc's height there (${h.sy})`, Math.abs(h.sy - (80 - Math.sin(Math.PI / 4) * 68)) < 1);
  const words = Object.fromEntries(Object.entries(h.shapes).filter(([k]) => !k.startsWith('s:')).map(([k, v]) => [k, v[0]]));
  check(`holes: the eight phase words (${Object.values(words)})`, Object.values(words).join() === '新月,三日月,上弦の月,満ちていく月,満月,欠けていく月,下弦の月,有明の月');
  const sh = h.shapes;
  check(`holes: waxing is lit on the right, waning on the left (${['waxing_crescent', 'waxing_gibbous', 'waning_gibbous', 'waning_crescent'].map((k) => sh[k][1])})`,
    sh.waxing_crescent[1] > 100 && sh.first_quarter[1] > 100 && sh.waxing_gibbous[1] > 100 && sh.waning_gibbous[1] < 100 && sh.last_quarter[1] < 100 && sh.waning_crescent[1] < 100);
  check(`holes: near the middle a crescent is dark, a quarter lit on one side, a gibbous and a full moon on both (${['waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full_moon', 'last_quarter'].map((k) => sh[k][2] || '-')})`,
    sh.waxing_crescent[2] === '' && sh.first_quarter[2] === 'R' && sh.waxing_gibbous[2] === 'RL' && sh.full_moon[2] === 'RL' && sh.last_quarter[2] === 'L' && sh.new_moon[2] === '');
  check(`holes: in the south the moon is mirrored (${sh['s:waxing_crescent'][1]}, ${sh['s:waning_gibbous'][1]})`, sh['s:waxing_crescent'][1] < 100 && sh['s:waning_gibbous'][1] > 100);
  check(`holes: midnight sun: the sun at the top, no times, no day length (${h.polar})`, h.polar[0] === 100 && h.polar[1] === false && h.polar[2] === '—');
  const ticks = await page.evaluate(async () => {
    const e = document.querySelector('#day'), cx = () => +e.shadowRoot.querySelector('[part=sun]').getAttribute('cx');
    const a = cx(); await window.__wait(3 * 3600e3 + 61000);
    return [a, cx()];
  });
  check(`holes: the minute check alone moves the sun on (${ticks})`, ticks[1] - ticks[0] > 40);
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#day');
  check(`full: the sun glows (${f.glow})`, f.glow === 'glow');
  const pg = await page.evaluate(async () => { const st = document.querySelector('#board'); st.pause(); await st.updateComplete; const e = document.querySelector('#day'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=sun]')).animationName; });
  check(`holes: full but paused, the sun does not glow (${pg})`, pg === 'none');
}
