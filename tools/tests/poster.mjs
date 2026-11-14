// The composition parts and demo/poster.html: <cw-verdict> says many states in one word, <cw-hero> lays a huge name
// over a ball with tags, <cw-folio> is a huge screen number, <cw-panel number> a numbered bar. The page overlaps
// them on purpose, with extreme size differences, and switches screens by key.
export const demo = 'poster.html';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await wait(600);

  const v = await page.evaluate(async () => {
    const e = document.createElement('cw-verdict'); e.style.cssText = 'display:block;width:600px;height:220px';
    document.querySelector('cw-stage').append(e);
    const read = async (items) => { e.items = items; await e.updateComplete; const r = e.shadowRoot;
      return { v: e.getAttribute('verdict'), lines: [...r.querySelectorAll('[part=word] span')].map((s) => s.textContent), first: r.querySelector('[part=item] [part=label]')?.textContent,
        aria: e.getAttribute('aria-label'), face: getComputedStyle(r.querySelector('[part=face]')).backgroundColor }; };
    const probe = document.createElement('div'); probe.style.color = 'var(--cw-surface-on)'; document.body.append(probe); const on = getComputedStyle(probe).color; probe.remove();
    const out = {
      ok: await read([{ label: '鍵', state: 'locked' }, { label: '窓', state: 'closed' }, { label: 'カメラ', state: 'online' }]),
      bad: await read([{ label: '鍵', state: 'locked' }, { label: '窓', state: 'open' }, { label: 'ドア', state: 'unlocked' }, { label: '謎', state: 'whatever' }]),
      warn: await read([{ label: '鍵', state: 'locked' }, { label: '電池', state: 'warn' }, null, 'x']),
      on,
    };
    e.okText = 'ALL CLEAR'; e.items = [{ label: 'a', state: true }]; await e.updateComplete;
    out.custom = [...e.shadowRoot.querySelectorAll('[part=word] span')].map((s) => s.textContent);
    e.remove(); return out;
  });
  check(`all well says 異常 なし on two lines, on the look's lit face (${JSON.stringify(v.ok)})`, v.ok.v === 'ok' && v.ok.lines.join('|') === '異常|なし' && v.ok.face === v.on && v.ok.aria === '異常なし');
  check(`open and unlocked are bad: counted, listed first, read out (${JSON.stringify(v.bad)})`, v.bad.v === 'bad' && v.bad.lines.join('|') === '異常|2件' && ['窓', 'ドア'].includes(v.bad.first) && /窓 異常/.test(v.bad.aria) && /謎 注意/.test(v.bad.aria));
  check(`only warnings say 注意 with the count; bad entries are left out (${JSON.stringify(v.warn)})`, v.warn.v === 'warn' && v.warn.lines.join('|') === '注意|1件' && v.warn.first === '電池');
  check(`ok-text replaces the word; a space breaks lines; true reads as ok (${v.custom})`, v.custom.join('|') === 'ALL|CLEAR');

  const h = await page.evaluate(async () => {
    const e = document.getElementById('hero'); await e.updateComplete;
    const r = e.shadowRoot, ball = r.querySelector('[part=ball]'), lines = [...r.querySelectorAll('[part=line]')];
    const glow = (lvl) => { e.level = lvl; return e.updateComplete.then(() => parseFloat(r.querySelector('[part=ball]').style.getPropertyValue('--glow'))); };
    const lo = await glow(0), hi = await glow(1);
    const t = document.createElement('cw-hero'); t.tags = [1, 2, 3, 4, 5, 6].map((i) => ({ label: `t${i}`, value: i })); document.body.append(t); await t.updateComplete;
    const tags = t.shadowRoot.querySelectorAll('[part=tag]').length; t.remove();
    return { lines: lines.map((l) => l.textContent), size: parseFloat(getComputedStyle(lines[0]).fontSize), height: e.getBoundingClientRect().height,
      second: getComputedStyle(lines[1]).color, lo, hi, tags, aria: e.getAttribute('aria-label'), round: getComputedStyle(ball).borderRadius };
  });
  const sig = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-signal)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  check(`the hero's name is huge, its second line in the accent (${JSON.stringify(h)})`, h.lines[0] === 'HOME' && /W$/.test(h.lines[1]) && h.size >= h.height * 0.2 && h.second === sig);
  check(`level spreads the ball's glow; at most four tags; read out with the tags (${h.lo} < ${h.hi}, ${h.tags}, ${h.aria})`, h.lo < h.hi && h.tags === 4 && /^HOME \d+W 外気 14\.2°C/.test(h.aria) && h.round === '50%');

  const f = await page.evaluate(async () => {
    const e = document.getElementById('folio'); await e.updateComplete; const r = e.shadowRoot;
    return { role: e.getAttribute('role'), aria: e.getAttribute('aria-label'), number: parseFloat(getComputedStyle(r.querySelector('[part=number]')).fontSize), title: parseFloat(getComputedStyle(r.querySelector('[part=title]')).fontSize) };
  });
  check(`the folio is a heading "01 ホーム" whose number dwarfs its title (${JSON.stringify(f)})`, f.role === 'heading' && f.aria === '01 ホーム' && f.number >= 150 && f.number >= f.title * 2.4);

  const p = await page.evaluate(async () => {
    const e = document.querySelector('cw-panel[number]'); await e.updateComplete; const r = e.shadowRoot, head = r.querySelector('header');
    const d = document.createElement('div'); d.style.color = 'var(--cw-text)'; document.body.append(d); const text = getComputedStyle(d).color; d.remove();
    return { num: r.querySelector('[part=number]')?.textContent, bar: getComputedStyle(head).backgroundColor, text, plain: !!document.querySelector('cw-panel:not([number])').shadowRoot.querySelector('[part=number]') };
  });
  check(`number makes the label row a bar in the text colour with the number on a slab (${JSON.stringify(p)})`, p.num === '01' && p.bar === p.text && p.plain === false);

  // the composition: things overlap on purpose, and nothing runs off the screen
  const lay = await page.evaluate(() => {
    const box = (s) => document.querySelector(s).getBoundingClientRect();
    const meet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const ring = box('#ring'), hero = box('#hero'), verdict = box('#verdict'), folio = box('#folio');
    const off = [...document.querySelectorAll('cw-stage > *')].filter((x) => { const r = x.getBoundingClientRect(); return r.right > innerWidth + 2 || r.bottom > innerHeight + 2; }).map((x) => x.className);
    return { heroRing: meet(hero, ring), verdictRing: meet(verdict, ring), folioRing: meet(folio, ring), off };
  });
  check(`the name sits in the ring, the verdict and the page number break into it, nothing runs off (${JSON.stringify(lay)})`, lay.heroRing && lay.verdictRing && lay.folioRing && lay.off.length === 0);

  await page.keyboard.press('2');
  await wait(200);
  const s2 = await page.evaluate(async () => { await document.getElementById('hero').updateComplete; return [document.getElementById('folio').getAttribute('aria-label'), document.getElementById('hero').name, document.querySelector('#menu [aria-current=true]').dataset.screen]; });
  check(`key 2 turns to the second screen: number, name and menu follow (${s2})`, s2[0] === '02 電気' && s2[1] === 'POWER' && s2[2] === '1');

  // full motion: the ball breathes, a word that is not ok blinks; paused they stop and new values wait
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  await wait(500);
  const full = await page.evaluate(async () => {
    const hero = document.getElementById('hero'), v = document.getElementById('verdict'), st = document.getElementById('stage');
    v.items = [{ label: '窓', state: 'open' }]; await v.updateComplete;
    const run = [getComputedStyle(hero.shadowRoot.querySelector('[part=ball]')).animationName, getComputedStyle(v.shadowRoot.querySelector('[part=word]')).animationName];
    st.pause(); await st.updateComplete; await hero.updateComplete; await v.updateComplete;
    v.items = [{ label: '窓', state: 'closed' }]; await v.updateComplete;
    const held = [getComputedStyle(hero.shadowRoot.querySelector('[part=ball]')).animationName, v.getAttribute('verdict'), v.items[0].state];
    st.resume(); await st.updateComplete; await v.updateComplete;
    return { run, held, after: v.getAttribute('verdict') };
  });
  check(`full: the ball breathes and 異常 blinks; paused both stop and new items wait (${JSON.stringify(full)})`,
    full.run.join() === 'breathe,blink' && full.held.join() === 'none,bad,ok' && full.after === 'ok');

  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await wait(500);
  const calm = await page.evaluate(() => getComputedStyle(document.getElementById('hero').shadowRoot.querySelector('[part=ball]')).animationName);
  check(`calm: the ball stays still (${calm})`, calm === 'none');
}
