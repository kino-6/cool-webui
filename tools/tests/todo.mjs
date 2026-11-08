// <cw-todo>: open items by due date, done ones, overdue, ticking, readonly, max, pause, motion, narrow, look.
export const demo = 'todo.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, rows = [...r.querySelectorAll('[part=item]')];
  return { rows: rows.map((x) => x.querySelector('[part=summary]').textContent.trim()), due: rows.map((x) => x.querySelector('[part=due]')?.textContent.trim() ?? ''),
    overdue: rows.map((x) => x.hasAttribute('data-overdue')), done: rows.map((x) => x.hasAttribute('data-done')), aria: rows.map((x) => x.getAttribute('aria-label')),
    checks: rows.map((x) => x.querySelector('[part=check]').getAttribute('aria-checked') + (x.querySelector('[part=check]').disabled ? ':off' : '')),
    more: [...r.querySelectorAll('[part=more]')].map((x) => x.textContent.trim()), empty: r.querySelector('[part=empty]')?.textContent.trim() ?? null,
    dueShown: rows[0]?.querySelector('[part=due]') ? getComputedStyle(rows[0].querySelector('[part=due]')).display !== 'none' : null,
    pulse: rows.map((x) => (x.querySelector('[part=due]') ? getComputedStyle(x.querySelector('[part=due]')).animationName : '')), role: e.getAttribute('role') };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const s = await read(page, '#shop');
  check(`open items, the soonest due first, no due date last (${s.rows})`, s.rows.join() === '洗剤,卵,電池（単三）,牛乳');
  check(`due words: today, tomorrow, else the date (${s.due})`, s.due[1] === '今日' && s.due[2] === '明日' && /^\d+\/\d+$/.test(s.due[0]) && s.due[3] === '');
  check(`only the past due date is overdue; today is not (${s.overdue})`, s.overdue.join() === 'true,false,false,false');
  check(`done ones are counted, not listed, without done (${s.more})`, s.more.join() === '完了 1 件');
  check(`a list of items read with due and overdue (${s.role}; ${s.aria[0]})`, s.role === 'list' && /^洗剤 期限 \d+\/\d+ 期限切れ$/.test(s.aria[0]));
  const c = await read(page, '#chores');
  check(`with done, done ones follow struck through, ticked (${c.rows}, ${c.done}, ${c.checks})`, c.rows.join() === 'フィルターの掃除,車検の予約,燃えるごみ,植木の水やり' && c.done.join() === 'false,false,true,true' && c.checks[2] === 'true');
  const ro = await read(page, '#ro');
  check(`readonly: the circles cannot be pressed (${ro.checks})`, ro.checks.every((x) => x.endsWith(':off')));
  const n = await read(page, '#none');
  check(`nothing to do says so (${n.empty})`, n.empty === 'やることはありません');
  const nr = await read(page, '#narrow');
  check(`a narrow box hides the due dates (${nr.dueShown}; wide ${s.dueShown})`, nr.dueShown === false && s.dueShown === true);
  const tick = await page.evaluate(async () => {
    const e = document.querySelector('#shop'), sent = [];
    e.addEventListener('cw-todo', (ev) => sent.push(ev.detail));
    e.shadowRoot.querySelectorAll('[part=check]')[3].click(); await e.updateComplete;
    const after = [...e.shadowRoot.querySelectorAll('[part=more]')].map((x) => x.textContent.trim()).join();
    const c = document.querySelector('#chores'); c.addEventListener('cw-todo', (ev) => sent.push(ev.detail)); c.shadowRoot.querySelectorAll('[part=check]')[2].click(); await c.updateComplete;
    return { sent, after, back: c.shadowRoot.querySelectorAll('[part=item]')[2].hasAttribute('data-done') };
  });
  check(`ticking sends the other status and shows at once (${JSON.stringify(tick.sent)}, ${tick.after})`, JSON.stringify(tick.sent[0]) === JSON.stringify({ uid: 'a', summary: '牛乳', status: 'completed' }) && tick.after === '完了 2 件');
  check(`unticking a done one sends needs_action (${JSON.stringify(tick.sent[1])})`, tick.sent[1].status === 'needs_action' && tick.sent[1].uid === '2');
  const mx = await page.evaluate(async () => { const e = document.querySelector('#chores'); e.max = 2; await e.updateComplete; const out = [e.shadowRoot.querySelectorAll('[part=item]').length, [...e.shadowRoot.querySelectorAll('[part=more]')].map((x) => x.textContent.trim()).join()]; e.max = 5; await e.updateComplete; return out; });
  check(`max=2 shows two and says how many more (${mx})`, mx[0] === 2 && mx[1] === 'ほか 2 件');
  const times = await page.evaluate(async () => {
    const e = document.querySelector('#narrow'), t = Date.now();
    e.items = [{ uid: 'x', summary: '朝の会議', status: 'needs_action', due: new Date(t + 60 * 60e3).toISOString() }]; await e.updateComplete;
    const before = e.shadowRoot.querySelector('[part=item]').hasAttribute('data-overdue');
    await window.__wait(2 * 3600e3); await e.updateComplete;
    return [before, e.shadowRoot.querySelector('[part=item]').hasAttribute('data-overdue')];
  });
  check(`a date and time becomes overdue once it passes, by the minute check (${times})`, times.join() === 'false,true');
  const held = await page.evaluate(async () => { const s = document.querySelector('#board'), e = document.querySelector('#none'); s.pause(); await s.updateComplete; e.items = [{ summary: '新しい用事', status: 'needs_action' }]; await e.updateComplete; const during = e.shadowRoot.querySelector('[part=empty]')?.textContent; s.resume(); await s.updateComplete; await e.updateComplete; return [during, e.shadowRoot.querySelector('[part=summary]')?.textContent]; });
  check(`paused: new items wait (${held})`, held.join() === 'やることはありません,新しい用事');
  check(`calm: an overdue date does not pulse (${s.pulse[0]})`, s.pulse[0] === 'none');
  // holes found by the audit of T113
  const h = await page.evaluate(async () => {
    const e = document.createElement('cw-todo'); document.body.append(e);
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv'); };
    const row = (summary) => [...e.shadowRoot.querySelectorAll('[part=item]')].find((x) => x.querySelector('[part=summary]').textContent === summary);
    e.done = true;
    e.items = [{ uid: '1', summary: 'きのう', status: 'needs_action', due: day(-1) }, { uid: '2', summary: 'きょう', status: 'needs_action', due: day(0) },
      { uid: '3', summary: 'おわり', status: 'completed', due: day(-3) }, { summary: null, status: 'needs_action' }];
    await e.updateComplete;
    const out = { y: [row('きのう').querySelector('[part=due]').textContent, row('きのう').hasAttribute('data-overdue')], t: row('きょう').hasAttribute('data-overdue'),
      done: [getComputedStyle(row('おわり').querySelector('[part=summary]')).textDecorationLine, row('おわり').hasAttribute('data-overdue')],
      nameless: [...e.shadowRoot.querySelectorAll('[part=item]')].find((x) => x.querySelector('[part=summary]').textContent === '').querySelector('[part=check]').disabled };
    e.done = false; e.items = [{ uid: 'z', summary: '済', status: 'completed' }]; await e.updateComplete;
    out.onlyDone = [e.shadowRoot.querySelector('[part=empty]')?.textContent ?? null, [...e.shadowRoot.querySelectorAll('[part=more]')].map((x) => x.textContent.trim()).join()];
    // a time zone decides the day of a date and time: 23:30 in Los Angeles is the next day in Tokyo
    e.items = [{ uid: 'tz', summary: '電話', status: 'needs_action', due: '2030-01-10T23:30:00-08:00' }];
    e.timeZone = 'America/Los_Angeles'; await e.updateComplete;
    const la = e.shadowRoot.querySelector('[part=due]').textContent;
    e.timeZone = 'Asia/Tokyo'; await e.updateComplete;
    out.tz = [la, e.shadowRoot.querySelector('[part=due]').textContent];
    e.remove();
    const st = document.querySelector('#board'), c = document.querySelector('#chores');
    st.pause(); await st.updateComplete;
    c.items = [{ uid: '9', summary: '新しい用事', status: 'needs_action' }];
    st.resume(); await st.updateComplete; await c.updateComplete;
    c.items = [{ uid: '9', summary: '新しい用事', status: 'needs_action' }, { uid: '8', summary: '窓ふき', status: 'needs_action' }]; await c.updateComplete;
    st.pause(); await st.updateComplete;
    c.items = [{ uid: '9', summary: '新しい用事', status: 'needs_action' }, { uid: '8', summary: '窓ふき', status: 'needs_action' }, { uid: '7', summary: 'もう一つ', status: 'needs_action' }];
    c.shadowRoot.querySelector('[part=check]').click(); await c.updateComplete;
    st.resume(); await st.updateComplete; await c.updateComplete;
    out.survives = c.items.find((x) => x.uid === '9').status;
    return out;
  });
  check(`holes: a date due yesterday reads 昨日 and is overdue; today is not (${h.y}, ${h.t})`, h.y[0] === '昨日' && h.y[1] && !h.t);
  check(`holes: a done item is struck through and never overdue (${h.done})`, h.done[0] === 'line-through' && h.done[1] === false);
  check(`holes: an item with no uid and no words cannot be pressed (${h.nameless})`, h.nameless === true);
  check(`holes: a list with only done items counts them and does not say there is nothing (${h.onlyDone})`, h.onlyDone[0] === null && h.onlyDone[1] === '完了 1 件');
  check(`holes: the time zone decides the day of a date and time (${h.tz})`, h.tz[0] === '1/10' && h.tz[1] === '1/11');
  check(`holes: a tick while paused survives the list waiting for resume (${h.survives})`, h.survives === 'completed');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#shop');
  check(`full: an overdue date pulses, others do not (${f.pulse})`, f.pulse[0] === 'pulse' && f.pulse[1] === 'none');
  const pp = await page.evaluate(async () => { const st = document.querySelector('#board'); st.pause(); await st.updateComplete; const e = document.querySelector('#shop'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=due]')).animationName; });
  check(`holes: full but paused, an overdue date does not pulse (${pp})`, pp === 'none');
}
