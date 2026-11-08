// The home sample's chores screen (vacuum, washer and dishwasher, batteries, family) and the windows on the lights screen.
export const demo = 'home.html?theme=tile&still';
export const virtualTime = true;

export async function run(page, check) {
  const base = page.url().split('?')[0];
  for (const [tag, query] of [['quiet', 'theme=tile&still'], ['bold', 'variant=bold&theme=game&still']]) {
    await page.goto(`${base}?${query}`, { waitUntil: 'load' });
    await page.wait(300);
    const s = await page.evaluate(async () => {
      const buttons = [...document.querySelectorAll('nav button')].filter((b) => b.dataset.to);
      buttons.find((b) => b.dataset.to === 'chores').click();
      await window.__wait(900);
      const ids = ['robot', 'washer-t', 'dish-t', 'batteries', 'family'], els = ids.map((i) => document.getElementById(i));
      const seen = (e) => e.getBoundingClientRect().width > 120 && e.checkVisibility();
      // nothing sticks out of its panel
      const inside = els.every((e) => { const p = e.closest('cw-panel').getBoundingClientRect(), r = e.getBoundingClientRect(); return r.right <= p.right + 1 && r.bottom <= p.bottom + 1; });
      return { current: document.querySelector('cw-screens').current, shown: els.map(seen), inside, labels: buttons.map((b) => b.textContent.trim()).join(),
        robot: document.getElementById('robot').getAttribute('state'), washer: document.getElementById('washer-t').getAttribute('state'),
        first: document.getElementById('batteries').shadowRoot.querySelector('[part=row]').getAttribute('aria-label'),
        home: document.getElementById('family').shadowRoot.querySelector('[part=person]').getAttribute('aria-label') };
    });
    check(`${tag}: the 家事 button opens the chores screen with every part shown (${s.current}, ${s.shown})`, s.current === 'chores' && s.shown.every(Boolean));
    check(`${tag}: the parts stay inside their panels (${s.inside})`, s.inside);
    check(`${tag}: six screen buttons (${s.labels})`, s.labels.split(',').length === 6 && s.labels.includes('家事'));
    check(`${tag}: the vacuum cleans, the washer counts down, the emptiest battery and someone at home come first (${s.robot}, ${s.washer}, ${s.first}, ${s.home})`,
      s.robot === 'cleaning' && s.washer === 'active' && s.first === '寝室の温度計 12% 少ない' && s.home.startsWith('アオイ 在宅'));
  }
  const nav = await page.evaluate(() => { const n = document.querySelector('.rail nav'), b = [...n.querySelectorAll('button')]; return b.every((x) => x.getBoundingClientRect().bottom <= n.getBoundingClientRect().bottom + 0.5 && x.scrollHeight <= x.clientHeight + 1 && x.scrollWidth <= x.clientWidth + 1); });
  check(`bold: six screen buttons fit the rail in two columns (${nav})`, nav);
  const press = await page.evaluate(async () => {
    const r = document.getElementById('robot');
    r.shadowRoot.querySelector('[part=return]').click(); await r.updateComplete;
    const right = r.getAttribute('state');
    await window.__wait(4500); await r.updateComplete;
    return { right, later: r.getAttribute('state'), log: document.querySelector('#log').shadowRoot.textContent.includes('充電台に戻した') };
  });
  check(`the return button sends it home, the log says so, and it docks (${JSON.stringify(press)})`, press.right === 'returning' && press.later === 'docked' && press.log);
  const win = await page.evaluate(async () => {
    [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'lights').click();
    await window.__wait(900);
    const covers = [...document.querySelectorAll('#covers cw-cover')];
    const c = covers[1];
    c.shadowRoot.querySelector('[part=open]').click(); await c.updateComplete;
    const right = c.getAttribute('state');
    await window.__wait(2500); await c.updateComplete;
    return { n: covers.length, shown: covers.every((e) => e.checkVisibility()), right, later: c.getAttribute('state'), pos: c.now.position };
  });
  check(`the lights screen has three windows (${win.n}, ${win.shown})`, win.n === 3 && win.shown);
  check(`opening the closed blind opens it (${win.right} -> ${win.later}, ${win.pos})`, win.right === 'opening' && win.later === 'open' && win.pos === 100);

  // holes found by the audit of T107
  for (const [tag, query] of [['quiet', 'theme=tile&still'], ['bold', 'variant=bold&theme=game&still']]) {
    await page.goto(`${base}?${query}`, { waitUntil: 'load' });
    await page.keyboard.press('6');
    await page.wait(900);
    const h = await page.evaluate(async () => {
      // the last line of each part sits inside the part, so nothing inside is cut
      const inside = ['robot', 'washer-t', 'dish-t', 'batteries', 'family'].every((id) => {
        const e = document.getElementById(id), box = e.getBoundingClientRect(), all = [...e.shadowRoot.querySelectorAll('*')].filter((x) => x.getClientRects().length && getComputedStyle(x).display !== 'none');
        return all.every((x) => x.getBoundingClientRect().bottom <= box.bottom + 1);
      });
      const charging = document.getElementById('batteries').shadowRoot.querySelector('[part=row][data-charging] [part=name]');
      return { current: document.querySelector('cw-screens').current, inside, dish: document.getElementById('dish-t').getAttribute('state'),
        charging: charging.scrollWidth <= charging.clientWidth + 1 && charging.textContent.includes('充電中') };
    });
    check(`holes: ${tag}: key 6 opens the chores screen (${h.current})`, h.current === 'chores');
    check(`holes: ${tag}: nothing inside the parts is cut (${h.inside})`, h.inside);
    check(`holes: ${tag}: the dishwasher is paused and the charging phone shows 充電中 whole (${h.dish}, ${h.charging})`, h.dish === 'paused' && h.charging);
  }
  // the bold layout: its screen buttons' text fits, and the windows sit below the lights
  const fit = await page.evaluate(async () => {
    const text = [...document.querySelectorAll('.rail nav button')].every((b) => { const r = document.createRange(); r.selectNodeContents(b); const t = r.getBoundingClientRect(), x = b.getBoundingClientRect(); return t.left >= x.left - 0.5 && t.right <= x.right + 0.5; });
    [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'lights').click();
    await window.__wait(900);
    const lights = document.getElementById('switches').closest('cw-panel').getBoundingClientRect(), covers = document.getElementById('covers').closest('cw-panel').getBoundingClientRect();
    return { text, below: covers.top >= lights.bottom - 0.5 };
  });
  check(`holes: bold: each screen button's words fit inside it (${fit.text})`, fit.text);
  check(`holes: bold: the windows sit below the lights (${fit.below})`, fit.below);
  // the rail and the chores screen count the same washer down
  // (without still, so the page's own two-second update runs the rail)
  await page.goto(`${base}?variant=bold&theme=tile`, { waitUntil: 'load' });
  const wash = await page.evaluate(async () => {
    const left = () => { const m = /残り (\d+) 分/.exec(document.getElementById('washer').text ?? ''); return m ? +m[1] : 0; };
    const timer = () => { const t = document.getElementById('washer-t'); t.requestUpdate(); return t.updateComplete.then(() => { const [m, x] = t.shadowRoot.querySelector('[part=time]').textContent.split(':').map(Number); return m + x / 60; }); };
    const out = [];
    for (const step of [0, 600000, 900000]) { await window.__wait(step + 1); await window.__wait(2100); out.push([left(), await timer(), document.getElementById('washer').text]); }
    return out;
  });
  check(`holes: the rail's minutes and the washer timer agree as time goes by (${JSON.stringify(wash)})`, wash.slice(0, 2).every(([a, b]) => Math.abs(a - b) <= 1) && wash[2][2] === '待機');
}
