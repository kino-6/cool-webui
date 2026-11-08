// <cw-agenda>: upcoming events under day headings; what is under way and what is next; limits, pause, motion and look.
export const demo = 'agenda.html';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot;
  return {
    days: [...r.querySelectorAll('[part=day]')].map((d) => d.textContent.trim()),
    rows: [...r.querySelectorAll('[part=event]')].map((x) => ({ time: x.querySelector('[part=time]').textContent.trim(), title: x.querySelector('[part=title]').textContent.trim(),
      where: x.querySelector('[part=where]')?.textContent.trim() ?? '', badge: x.querySelector('[part=badge]').textContent.trim(), now: x.hasAttribute('data-now'),
      bar: getComputedStyle(x.querySelector('[part=bar]')).backgroundColor, anim: getComputedStyle(x.querySelector('[part=bar]')).animationName, aria: x.getAttribute('aria-label') })),
    empty: r.querySelector('[part=empty]')?.textContent.trim() ?? '', role: e.getAttribute('role'),
  };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(300);
  const f = await read(page, '#fixed');
  const titles = f.rows.map((r) => r.title).join(',');
  check(`finished and far-off events drop off; the rest in time order (${titles})`, titles === '燃えるごみ,在宅の会議,歯医者,夕食の買い出し,ハル 遠足,車の点検');
  check(`one heading per day: 今日, 明日, then the date (${f.days})`, f.days.join() === '今日,明日,11月5日(木)');
  const [trash, meeting, dentist, dinner] = f.rows;
  check(`an event under way is marked いま (${JSON.stringify(meeting)})`, meeting.now && meeting.badge === 'いま' && meeting.time === '09:30–10:30');
  check(`the next one today says how long until it starts (${dentist.badge}); later ones say nothing (${dinner.badge})`, dentist.badge === 'あと 25 分' && dinner.badge === '' && !dentist.now);
  check(`all-day events say 終日 and are never いま (${trash.time}, ${trash.badge})`, trash.time === '終日' && trash.badge === '' && !trash.now);
  check(`place and colour show (${dentist.where}, ${dentist.bar}; default ${meeting.bar})`, dentist.where === '駅前クリニック' && dentist.bar === 'rgb(240, 180, 90)' && meeting.bar === 'rgb(74, 144, 194)');
  check(`each event is read as one line (${f.role}; ${dentist.aria})`, f.role === 'list' && dentist.aria === '今日 10:25 歯医者 駅前クリニック あと 25 分');

  const more = await page.evaluate(async () => {
    const e = document.querySelector('#fixed');
    e.max = 3; await e.updateComplete; const capped = e.shadowRoot.querySelectorAll('[part=event]').length;
    e.max = 8; e.days = 2; await e.updateComplete; const two = [...e.shadowRoot.querySelectorAll('[part=day]')].map((d) => d.textContent.trim()).join();
    e.days = 7; e.now += 45 * 60e3; await e.updateComplete;
    const later = [...e.shadowRoot.querySelectorAll('[part=event]')].map((x) => x.querySelector('[part=title]').textContent.trim() + ':' + x.querySelector('[part=badge]').textContent.trim()).slice(0, 3).join(',');
    e.now -= 45 * 60e3; return { capped, two, later };
  });
  check(`max limits the rows (${more.capped}); days limits the span (${more.two})`, more.capped === 3 && more.two === '今日,明日');
  check(`45 minutes later the meeting is gone and the dentist is under way (${more.later})`, more.later === '燃えるごみ:,歯医者:いま,夕食の買い出し:あと 7 時間 15 分');

  const live = await read(page, '#live');
  // the laundry starts 24 minutes from now; after 23:36 that is tomorrow, and only today's next event counts down
  const laundryToday = await page.evaluate(() => new Date(Date.now() + 0.4 * 3600e3).getDate() === new Date().getDate());
  check(`the real clock works too (${live.rows.map((r) => r.title + ':' + r.badge).join(',')}; laundry today ${laundryToday})`,
    live.rows[0].badge === 'いま' && (laundryToday ? /^あと (2[3-5]) 分$/.test(live.rows[1].badge) : live.rows[1].badge === ''));

  const empty = await read(page, '#empty');
  check(`nothing coming up says 予定はありません (${empty.empty})`, empty.empty === '予定はありません');
  const bad = await page.evaluate(async () => { const e = document.querySelector('#empty'); e.events = [{ title: 'x', start: 'not a date' }, null]; await e.updateComplete; return e.events.length; });
  check(`events without a usable start are left out (${bad})`, bad === 0);

  const held = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#live');
    stage.pause(); await stage.updateComplete;
    e.events = [{ title: '新しい予定', start: Date.now() + 600e3 }]; await e.updateComplete;
    const during = e.shadowRoot.querySelector('[part=title]').textContent.trim();
    stage.resume(); await stage.updateComplete; await e.updateComplete;
    return [during, e.shadowRoot.querySelector('[part=title]').textContent.trim()];
  });
  check(`paused: new events wait (${held})`, held[0] !== '新しい予定' && held[1] === '新しい予定');

  check(`calm: the いま bar is still (${meeting.anim})`, meeting.anim === 'none');
  await page.goto(`${base}?motion=full&theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const g = await read(page, '#fixed');
  const day = await page.evaluate(() => { const d = getComputedStyle(document.querySelector('#fixed').shadowRoot.querySelector('[part=day]')); return { t: d.transform, bg: d.backgroundColor }; });
  check(`full: the いま bar glows (${g.rows[1].anim})`, g.rows[1].anim === 'glow');
  check(`game: day headings are slanted amber slabs (${JSON.stringify(day)})`, day.t.startsWith('matrix(') && day.bg === 'rgb(255, 194, 26)');
  // holes found by the T075 audit: fixed-time edges on a fresh element
  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await page.wait(300);
  const edge = await page.evaluate(async () => {
    const at = (d, h, m = 0) => new Date(2026, 10, 2 + d, h, m).getTime();
    const make = async (now, events, attrs = {}) => {
      const e = document.createElement('cw-agenda'); Object.assign(e, attrs); e.now = now; document.body.append(e); e.events = events; await e.updateComplete;
      const rows = [...e.shadowRoot.querySelectorAll('[part=event]')].map((x) => ({ day: x.closest('section').querySelector('[part=day]').textContent.trim(), time: x.querySelector('[part=time]').textContent.trim(),
        title: x.querySelector('[part=title]').textContent.trim(), badge: x.querySelector('[part=badge]').textContent.trim(), role: x.getAttribute('role'), aria: x.getAttribute('aria-label') }));
      const out = { rows, days: e.days, max: e.max }; e.remove(); return out;
    };
    const o = {};
    o.endless = await make(at(0, 10), [{ title: '終わり無し', start: at(0, 9, 30) }, { title: '1 時間前', start: at(0, 8, 45) }, { title: '昨日の終わり無し', start: at(-1, 23, 30) }]);
    o.iso = await make(at(0, 10), [{ title: 'ISO', start: new Date(at(0, 11)).toISOString(), end: new Date(at(0, 12)).toISOString() }, { title: '文化の日', start: '2026-11-03', end: '2026-11-04', allDay: true }]);
    o.lateDay = await make(at(2, 8), [{ title: '文化の日', start: '2026-11-03', end: '2026-11-04', allDay: true }]);
    o.yesterday = await make(at(0, 10), [{ title: '夜行', start: at(-1, 23), end: at(0, 11) }]);
    o.none = await make(at(0, 22), [{ title: '明日', start: at(1, 8) }]);
    o.hour = await make(at(0, 10), [{ title: '1 時間', start: at(0, 11) }]);
    o.twoHours = await make(at(0, 10), [{ title: '2 時間', start: at(0, 12) }]);
    o.round = await make(at(0, 10), [{ title: '90 秒', start: at(0, 10) + 90e3 }]);
    o.instant = await make(at(0, 10), [{ title: '始まった', start: at(0, 10), end: at(0, 11) }]);
    o.many = await make(at(0, 10), Array.from({ length: 12 }, (_, i) => ({ title: 'e' + i, start: at(0, 11) + i * 864e5 * 0.5 })));
    o.edge = await make(at(0, 10), [{ title: '境目', start: new Date(2026, 10, 9).getTime() }, { title: '内', start: new Date(2026, 10, 9).getTime() - 60e3 }]);
    o.allday = await make(at(0, 10), [{ title: 'ごみ', start: at(0, 0), allDay: true }]);
    return o;
  });
  check(`holes: an event without an end lasts an hour (${edge.endless.rows.map((r) => r.title + ':' + r.badge)})`, edge.endless.rows.length === 1 && edge.endless.rows[0].title === '終わり無し' && edge.endless.rows[0].badge === 'いま');
  check(`holes: ISO strings are read (${JSON.stringify(edge.iso.rows[0])})`, edge.iso.rows[0].title === 'ISO' && edge.iso.rows[0].time === '11:00–12:00' && edge.iso.rows[0].badge === 'あと 1 時間');
  check(`holes: a date-only all-day event stays on its own day (${JSON.stringify(edge.iso.rows[1])}; on the 4th at 8:00: ${edge.lateDay.rows.length} rows)`, edge.iso.rows[1].day === '明日' && edge.lateDay.rows.length === 0);
  check(`holes: an event from yesterday sits under 今日 and says so (${JSON.stringify(edge.yesterday.rows[0])})`, edge.yesterday.rows[0].day === '今日' && edge.yesterday.rows[0].time === '〜11:00' && edge.yesterday.rows[0].badge === 'いま' && edge.yesterday.rows[0].aria.includes('昨日から 11:00 まで'));
  check(`holes: nothing left today means no countdown (${JSON.stringify(edge.none.rows)})`, edge.none.rows[0].badge === '' && edge.none.rows[0].day === '明日');
  check(`holes: 60 minutes say あと 1 時間, whole hours add no 0 分 (${edge.hour.rows[0].badge}; ${edge.twoHours.rows[0].badge})`, edge.hour.rows[0].badge === 'あと 1 時間' && edge.twoHours.rows[0].badge === 'あと 2 時間');
  check(`holes: minutes round up (${edge.round.rows[0].badge})`, edge.round.rows[0].badge === 'あと 2 分');
  check(`holes: the moment it starts it is いま (${edge.instant.rows[0].badge})`, edge.instant.rows[0].badge === 'いま');
  check(`holes: by default 7 days and 8 rows (${edge.many.days}, ${edge.many.max}, ${edge.many.rows.length} rows)`, edge.many.days === 7 && edge.many.max === 8 && edge.many.rows.length === 8);
  check(`holes: the last day ends before the 8th midnight (${edge.edge.rows.map((r) => r.title)})`, edge.edge.rows.map((r) => r.title).join() === '内');
  check(`holes: an all-day event reads 終日 and each row is a listitem (${edge.allday.rows[0].aria}, ${edge.allday.rows[0].role})`, edge.allday.rows[0].aria === '今日 終日 ごみ' && edge.allday.rows[0].role === 'listitem');

  // the clock looks again by itself, rests while paused and catches up on resume
  const tick = await page.evaluate(async () => {
    const A = customElements.get('cw-agenda'), keep = A.TICK; A.TICK = 150;
    const stage = document.querySelector('#board'), e = document.createElement('cw-agenda');
    stage.querySelector('cw-panel').append(e);
    e.events = [{ title: 'すぐ', start: Date.now() + 600, end: Date.now() + 600e3 }];
    await e.updateComplete;
    const badge = () => e.shadowRoot.querySelector('[part=badge]').textContent.trim();
    const first = badge();
    stage.pause(); await stage.updateComplete;
    await window.__wait(900);
    const paused = badge();
    stage.resume(); await stage.updateComplete; await e.updateComplete;
    const resumed = badge();
    e.remove(); A.TICK = keep;
    return { first, paused, resumed };
  });
  check(`holes: the clock moves by itself, stops while paused and catches up on resume (${JSON.stringify(tick)})`, tick.first === 'あと 1 分' && tick.paused === 'あと 1 分' && tick.resumed === 'いま');
  const glow = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#fixed');
    stage.setAttribute('motion', 'full'); await stage.updateComplete; await window.__wait(50); await e.updateComplete;
    const bar = () => getComputedStyle(e.shadowRoot.querySelector('[part=event][data-now] [part=bar]')).animationName;
    const full = bar(); stage.pause(); await stage.updateComplete;
    const paused = [bar(), e.hasAttribute('data-paused')]; stage.resume();
    return { full, paused };
  });
  check(`holes: the いま bar rests while paused (${JSON.stringify(glow)})`, glow.full === 'glow' && glow.paused[0] === 'none' && glow.paused[1]);

  // a narrow list keeps the badge whole and some of the title
  for (const w of [220, 160]) {
    const n = await page.evaluate(async (width) => {
      const e = document.createElement('cw-agenda'); e.now = new Date(2026, 10, 2, 10).getTime();
      Object.assign(e.style, { position: 'fixed', left: '0', top: '0', width: width + 'px' }); document.body.append(e);
      e.events = [{ title: '在宅の会議', start: new Date(2026, 10, 2, 9, 30).getTime(), end: new Date(2026, 10, 2, 10, 30).getTime() },
        { title: '歯医者', start: new Date(2026, 10, 2, 10, 25).getTime(), end: new Date(2026, 10, 2, 11).getTime() }];
      await e.updateComplete;
      const host = e.getBoundingClientRect(), rows = [...e.shadowRoot.querySelectorAll('[part=event]')];
      const out = rows.map((x) => { const b = x.querySelector('[part=badge]'), t = x.querySelector('[part=title]'); return { badge: b.scrollWidth <= b.clientWidth + 0.5 && b.getBoundingClientRect().right <= host.right + 0.5, title: t.clientWidth }; });
      e.remove(); return out;
    }, w);
    check(`narrow: in a ${w}px box the badge is whole and the title keeps some width (${JSON.stringify(n)})`, n.every((r) => r.badge && r.title >= 30));
  }
}
