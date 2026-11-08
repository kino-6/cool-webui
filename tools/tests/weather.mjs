// <cw-weather>: the weather now in Japanese words, the next days, a picture per condition, pause, motion and look.
export const demo = 'weather.html';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}]`)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  return { temp: t('temp'), word: t('word'), detail: t('detail'), aria: e.getAttribute('aria-label'),
    days: [...r.querySelectorAll('[part=day]')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
    dayAria: r.querySelector('[part=day]')?.getAttribute('aria-label'),
    pieces: [...r.querySelectorAll('.now svg [part]')].map((p) => p.getAttribute('part')).join(','),
    sun: r.querySelector('[part=sun]') ? getComputedStyle(r.querySelector('[part=sun]')).animationName : null,
    fall: r.querySelector('[part=rain], [part=snow]') ? getComputedStyle(r.querySelector('[part=rain], [part=snow]')).animationName : null,
    tempFont: getComputedStyle(r.querySelector('[part=temp]')).fontFamily };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(300);
  const t = await read(page, '#tokyo');
  check(`the temperature rounds and carries the unit (${t.temp})`, t.temp === '15°C');
  check(`the condition is in Japanese (${t.word})`, t.word === '晴れ時々くもり');
  check(`high / low, humidity and wind (${t.detail})`, t.detail === '18° / 9° 湿度 58% 風 3.2 m/s');
  check(`the picture is sun and cloud (${t.pieces})`, t.pieces === 'sun,cloud');
  check(`five days by default, with weekday, high, low and rain (${t.days.join(' | ')})`, t.days.length === 5 && t.days[0] === '月 18° 9° 10%' && t.days[3] === '木 20° 8° 0%');
  check(`it reads as one group (${t.aria}; ${t.dayAria})`, t.aria === '晴れ時々くもり 15°C' && t.dayAria === '月 晴れ時々くもり 最高 18° 最低 9°');
  const h = await read(page, '#hill');
  check(`days=3 and partial values (${h.temp}, ${h.detail}, ${h.days.length})`, h.temp === '\u22121°C' && h.detail === '湿度 82%' && h.days.length === 3 && h.word === '雪');
  const n = await read(page, '#none');
  check(`no values: a dash and no picture (${n.temp}, ${n.pieces}, ${n.aria})`, n.temp === '—°C' && n.pieces === '' && n.aria === '天気の情報なし');
  const words = await page.evaluate(async () => {
    const e = document.querySelector('#none'), out = {};
    for (const c of ['sunny', 'clear-night', 'cloudy', 'rainy', 'pouring', 'fog', 'lightning-rainy', 'snowy-rainy', 'hail', 'windy', 'exceptional', 'mystery', 'snowy', 'lightning', 'windy-variant']) {
      e.now = { condition: c }; await e.updateComplete;
      out[c] = e.shadowRoot.querySelector('[part=word]').textContent.trim() + ':' + [...e.shadowRoot.querySelectorAll('.now svg [part]')].map((p) => p.getAttribute('part')).join('+');
    }
    e.now = {}; return out;
  });
  check(`each Home Assistant condition has a word and a picture (${JSON.stringify(words)})`,
    words.sunny === '晴れ:sun' && words['clear-night'] === '晴れ:moon' && words.cloudy === 'くもり:cloud' && words.rainy === '雨:cloud+rain' && words.pouring === '大雨:cloud+rain+rain'
    && words.fog === '霧:cloud+fog' && words['lightning-rainy'] === '雷雨:cloud+bolt+rain' && words['snowy-rainy'] === 'みぞれ:cloud+rain+snow' && words.hail === 'ひょう:cloud+snow'
    && words.windy === '強風:wind' && words.exceptional === '荒天:cloud+bolt' && words.mystery === 'mystery:cloud'
    && words.snowy === '雪:cloud+snow' && words.lightning === '雷:cloud+bolt' && words['windy-variant'] === '強風:cloud+wind');

  const held = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#tokyo');
    stage.pause(); await stage.updateComplete;
    e.now = { condition: 'rainy', temp: 11 }; e.forecast = []; await e.updateComplete;
    const during = [e.shadowRoot.querySelector('[part=word]').textContent.trim(), e.shadowRoot.querySelectorAll('[part=day]').length, e.now.temp];
    stage.resume(); await stage.updateComplete; await e.updateComplete;
    return { during, after: [e.shadowRoot.querySelector('[part=word]').textContent.trim(), e.shadowRoot.querySelectorAll('[part=day]').length] };
  });
  check(`paused: new values wait (${JSON.stringify(held)})`, held.during[0] === '晴れ時々くもり' && held.during[1] === 5 && held.during[2] === 11 && held.after[0] === '雨' && held.after[1] === 0);

  check(`calm: the picture is still (${t.sun})`, t.sun === 'none');
  await page.goto(`${base}?motion=full&theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const g = await read(page, '#tokyo'), gh = await read(page, '#hill');
  check(`full: the sun turns and snow falls (${g.sun}, ${gh.fall})`, g.sun === 'turn' && gh.fall === 'fall');
  check(`game: the temperature is in the wide face (${g.tempFont}; tile ${t.tempFont})`, /^Archivo/.test(g.tempFont) && !/^Archivo/.test(t.tempFont));
  // holes found by the T076 audit
  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await page.wait(300);
  const odd = await page.evaluate(async () => {
    const e = document.querySelector('#none'), t = (p) => e.shadowRoot.querySelector(`[part=${p}]`).textContent.replace(/\s+/g, ' ').trim(), out = {};
    for (const [k, v] of [['unavailable', 'unavailable'], ['null', null], ['empty', '']]) { e.now = { condition: 'cloudy', temp: v, humidity: v, high: v, low: v }; await e.updateComplete; out[k] = t('temp') + '|' + t('detail'); }
    e.now = { condition: 'cloudy', temp: 10, high: 15 }; await e.updateComplete; out.highOnly = t('detail');
    e.now = { condition: 'cloudy', temp: 10, low: 3 }; await e.updateComplete; out.lowOnly = t('detail');
    e.unit = '°F'; await e.updateComplete; out.unit = t('temp'); e.unit = '°C';
    e.forecast = [null, { time: new Date(2026, 10, 3, 0, 30).getTime(), condition: 'rainy', low: 4 }]; await e.updateComplete;
    out.days = [...e.shadowRoot.querySelectorAll('[part=day]')].map((d) => d.textContent.replace(/\s+/g, ' ').trim());
    out.role = e.getAttribute('role');
    e.forecast = []; e.now = {}; return out;
  });
  check(`holes: unavailable, null and empty show dashes, never NaN or 0 (${JSON.stringify([odd.unavailable, odd.null, odd.empty])})`, [odd.unavailable, odd.null, odd.empty].every((x) => x === '—°C|'));
  check(`holes: a missing high or low shows – (${odd.highOnly}; ${odd.lowOnly})`, odd.highOnly === '15° / –°' && odd.lowOnly === '–° / 3°');
  check(`holes: the unit attribute is used (${odd.unit})`, odd.unit === '10°F');
  check(`holes: a null day is dropped, a time in ms is read, a missing high shows – (${odd.days})`, odd.days.length === 1 && odd.days[0] === '火 – 4°');
  check(`holes: it is a group (${odd.role})`, odd.role === 'group');
  const still = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#hill'), a = () => getComputedStyle(e.shadowRoot.querySelector('[part=snow]')).animationName;
    const calm = a();
    stage.setAttribute('motion', 'full'); await stage.updateComplete; await window.__wait(50); await e.updateComplete;
    const full = a(), tokyo = document.querySelector('#tokyo'); tokyo.now = { condition: 'sunny', temp: 20 }; await tokyo.updateComplete;
    stage.pause(); await stage.updateComplete;
    const paused = [a(), getComputedStyle(tokyo.shadowRoot.querySelector('[part=sun]')).animationName, e.hasAttribute('data-paused')];
    stage.resume(); await stage.updateComplete;
    return { calm, full, paused };
  });
  check(`holes: snow rests in calm and while paused, falls in full (${JSON.stringify(still)})`, still.calm === 'none' && still.full === 'fall' && still.paused[0] === 'none' && still.paused[2]);
  check(`holes: the sun rests while paused (${still.paused[1]})`, still.paused[1] === 'none');
  const glass = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#hill').shadowRoot.querySelector('[part=cloud]')).fill; return c; });
  await page.goto(`${base}?theme=glass`, { waitUntil: 'load' });
  await page.wait(300);
  const gfill = await page.evaluate(() => getComputedStyle(document.querySelector('#tokyo').shadowRoot.querySelector('[part=cloud]')).fill);
  check(`holes: in glass the cloud is painted solid (${gfill}; tile ${glass})`, /^rgb\(/.test(gfill) && /^rgb\(/.test(glass));
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const gw = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#tokyo').shadowRoot.querySelector('[part=temp]')); return [c.fontWeight, c.fontStretch]; });
  check(`holes: game sets the temperature heavy and wide (${gw})`, gw[0] === '900' && gw[1] === '125%');

  // narrow boxes: nothing spills out, words get an ellipsis, details wrap
  for (const w of [260, 200]) {
    const n = await page.evaluate(async (width) => {
      const e = document.createElement('cw-weather');
      Object.assign(e.style, { position: 'fixed', left: '0', top: '0', width: width + 'px', height: '220px' });
      document.body.append(e);
      e.now = { condition: 'lightning-rainy', temp: 14.6, high: 18, low: 9, humidity: 58, wind: 3.2 };
      e.forecast = [0, 1, 2, 3, 4].map((i) => ({ time: new Date(2026, 10, 2 + i, 0, 30).getTime(), condition: 'rainy', high: 18, low: -9, rain: 80 }));
      await e.updateComplete; await window.__wait(50);
      const host = e.getBoundingClientRect(), r = e.shadowRoot;
      const spill = [...r.querySelectorAll('[part]')].filter((x) => x.getBoundingClientRect().right > host.right + 0.5 && !x.closest('svg')).map((x) => x.getAttribute('part'));
      const word = r.querySelector('[part=word]'), detail = r.querySelector('[part=detail]');
      const crowded = [...r.querySelectorAll('[part=day]')].filter((d) => getComputedStyle(d).display !== 'none' && d.scrollWidth > d.clientWidth + 1).length;
      const out = { crowded, spill, wordCut: word.scrollWidth > word.clientWidth ? getComputedStyle(word).textOverflow : 'fits', detailWhole: detail.scrollWidth <= detail.clientWidth + 0.5 };
      e.remove();
      return out;
    }, w);
    check(`narrow: in ${w}px nothing spills out on the right (${n.spill.join(',') || 'none'})`, n.spill.length === 0);
    check(`narrow: in ${w}px each forecast day fits its column (${n.crowded} crowded)`, n.crowded === 0);
    check(`narrow: in ${w}px the word is whole or ends in an ellipsis, the details wrap whole (${n.wordCut}, ${n.detailWhole})`, (n.wordCut === 'fits' || n.wordCut === 'ellipsis') && n.detailWhole);
  }
}
