// <cw-stat>, <cw-status>, <cw-clock>: values, formatting, warnings, pause buffering (own and stage), motion.
export const demo = 'values.html';
const until = (page, fn, arg) => page.waitForFunction(fn, { timeout: 3000 }, arg).then(() => true, () => false);

export async function run(page, check) {
  const ready = () => page.evaluate(async () => Promise.all([...document.querySelectorAll('cw-stat,cw-status,cw-clock,cw-stage')].map((e) => e.updateComplete)));
  const txt = (sel, part = 'value') => page.evaluate((s, p) => document.querySelector(s).shadowRoot.querySelector(`[part=${p}]`).textContent.replace(/\s+/g, ''), sel, part);
  const set = async (sel, prop, v) => { await page.evaluate((s, p, x) => { document.querySelector(s)[p] = x; }, sel, prop, v); await ready(); };
  await ready();

  // stat: initial attribute, digits, non-numbers, warnings, aria, attribute after load
  check(`initial value attribute (${await txt('#temp')})`, (await txt('#temp')) === '22.4');
  await set('#temp', 'value', 12.345);
  check(`digits=1 rounds (${await txt('#temp')})`, (await txt('#temp')) === '12.3');
  await set('#temp', 'value', 'abc');
  check(`non-number shows a dash (${await txt('#temp')})`, (await txt('#temp')) === '—');
  await set('#temp', 'value', NaN);
  check('NaN shows a dash', (await txt('#temp')) === '—');
  await set('#temp', 'value', 31);
  const warn = await page.evaluate(() => {
    const e = document.querySelector('#temp');
    return { attr: e.hasAttribute('warn'), color: getComputedStyle(e.shadowRoot.querySelector('[part=value]')).color, aria: e.getAttribute('aria-label') };
  });
  check(`warn-above=28 marks 31 (${warn.color})`, warn.attr && warn.color === 'rgb(241, 139, 130)');
  check(`aria-label carries the value (${warn.aria})`, warn.aria === '室温 31.0 °C');
  await set('#temp', 'value', 10);
  check('warn-below=12 marks 10', await page.evaluate(() => document.querySelector('#temp').hasAttribute('warn')));
  await set('#temp', 'value', 20);
  check('in range clears the warning', await page.evaluate(() => !document.querySelector('#temp').hasAttribute('warn')));
  await page.evaluate(() => document.querySelector('#temp').setAttribute('value', '99'));
  await ready();
  check('value attribute after load is ignored', (await txt('#temp')) === '20.0');

  // own pause: keep only the latest value, apply on resume, events once each
  const own = await page.evaluate(async () => {
    const e = document.querySelector('#temp'); const log = [];
    e.addEventListener('cw-pause', () => log.push('pause'));
    e.addEventListener('cw-resume', (ev) => log.push('resume:' + ev.detail.applied));
    e.pause(); e.value = 5; e.value = 6; await e.updateComplete;
    const during = e.shadowRoot.querySelector('[part=value]').textContent.trim();
    e.resume(); await e.updateComplete;
    return { during, after: e.shadowRoot.querySelector('[part=value]').textContent.trim(), log: log.join(',') };
  });
  check(`own pause holds the value (${own.during})`, own.during === '20.0');
  check(`resume shows the latest (${own.after}; ${own.log})`, own.after === '6.0' && own.log === 'pause,resume:1');

  // stage pause reaches members; own pause outlives a stage resume
  const st = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), a = document.querySelector('#power'), b = document.querySelector('#hum');
    let applied = -1; stage.addEventListener('cw-resume', (ev) => (applied = ev.detail.applied), { once: true });
    b.pause();
    stage.pause(); await stage.updateComplete;
    const lampStopped = document.querySelector('#door').hasAttribute('data-paused');
    a.value = 777; b.value = 66; await a.updateComplete;
    const during = a.shadowRoot.querySelector('[part=value]').textContent.replace(/\s+/g, '');
    stage.resume(); await stage.updateComplete; await a.updateComplete; await b.updateComplete;
    const r = { lampStopped, lampGoes: !document.querySelector('#door').hasAttribute('data-paused'), during, after: a.shadowRoot.querySelector('[part=value]').textContent.replace(/\s+/g, ''), applied,
      bStill: b.shadowRoot.querySelector('[part=value]').textContent.trim() };
    b.resume(); await b.updateComplete;
    r.bAfter = b.shadowRoot.querySelector('[part=value]').textContent.trim();
    return r;
  });
  check('stage pause reaches the status lamp, and resume restarts it', st.lampStopped && st.lampGoes);
  check(`stage pause holds members (${st.during})`, st.during !== '777');
  check(`stage resume applies (${st.after}, applied=${st.applied})`, st.after === '777' && st.applied === 1);
  check(`own pause survives stage resume (${st.bStill} then ${st.bAfter})`, st.bStill !== '66' && st.bAfter === '66');

  // motion: rolling digits only when the stage says full
  const rolls = await page.evaluate(() => ['#power', '#loose'].map((s) => document.querySelector(s).shadowRoot.querySelectorAll('.roll').length));
  check(`calm stage: no rolling digits (${rolls[0]})`, rolls[0] === 0);
  check(`stat outside any stage uses its own motion="full" (${rolls[1]})`, rolls[1] > 0);
  await page.evaluate(() => document.querySelector('#board').setAttribute('motion', 'full'));
  check('stage switched to full rolls its stats', await until(page, () => document.querySelector('#power').shadowRoot.querySelectorAll('.roll').length > 0));
  check('rolling digits still read as the number', await page.evaluate(() => document.querySelector('#power').getAttribute('aria-label').includes('777')));
  await page.evaluate(() => document.querySelector('#board').setAttribute('motion', 'auto'));

  // status
  const status = async (v) => { await set('#door', 'state', v); return page.evaluate(() => {
    const e = document.querySelector('#door');
    return { text: e.shadowRoot.querySelector('[part=value]').textContent.trim(), lamp: getComputedStyle(e.shadowRoot.querySelector('[part=lamp]')).backgroundColor, state: e.state, aria: e.getAttribute('aria-label') };
  }); };
  const on = await status('online');
  check(`online (${on.text}, ${on.lamp})`, on.text === '稼働中' && on.lamp === 'rgb(128, 201, 148)');
  const off = await status('offline');
  check(`offline (${off.text}, ${off.lamp})`, off.text === '停止' && off.lamp === 'rgb(241, 139, 130)');
  const bad = await status('exploded');
  check(`unknown values become unknown (${bad.state}, ${bad.text})`, bad.state === 'unknown' && bad.text === '不明');
  check(`status aria-label (${bad.aria})`, bad.aria === '玄関の鍵 不明');
  await page.evaluate(() => { document.querySelector('#door').since = Date.now() - (2 * 3600 + 5 * 60) * 1000; });
  await ready();
  check(`since shows elapsed time (${await txt('#door', 'since')})`, (await txt('#door', 'since')) === '2時間5分');
  await page.evaluate(() => { document.querySelector('#door').since = new Date(Date.now() - 50 * 1000).toISOString(); });
  await ready();
  check(`since accepts ISO strings (${await txt('#door', 'since')})`, (await txt('#door', 'since')) === '0分');
  const sp = await page.evaluate(async () => {
    const e = document.querySelector('#door'); e.state = 'online'; await e.updateComplete;
    e.pause(); e.state = 'standby'; await e.updateComplete;
    const during = e.shadowRoot.querySelector('[part=value]').textContent.trim();
    e.resume(); await e.updateComplete;
    return [during, e.shadowRoot.querySelector('[part=value]').textContent.trim()];
  });
  check(`paused status holds its state (${sp.join(' -> ')})`, sp[0] === '稼働中' && sp[1] === '待機');

  // clock: time zone, ticking, pause
  const clk = await page.evaluate(() => {
    const t = (s) => document.querySelector(s).shadowRoot.querySelector('[part=value]').textContent.trim();
    const want = (tz) => new Intl.DateTimeFormat('ja-JP', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    return { tokyo: t('#tokyo'), utc: t('#utc'), wantT: want('Asia/Tokyo'), wantU: want('UTC') };
  });
  check(`clock follows its time zone (${clk.tokyo} / ${clk.utc})`, clk.tokyo.startsWith(clk.wantT) && clk.utc.startsWith(clk.wantU) && clk.tokyo !== clk.utc);
  const s0 = await txt('#utc');
  check('hms clock ticks', await until(page, (s) => document.querySelector('#utc').shadowRoot.querySelector('[part=value]').textContent.replace(/\s+/g, '') !== s, s0));
  await page.evaluate(() => document.querySelector('#utc').pause());
  const p0 = await txt('#utc');
  await new Promise((r) => setTimeout(r, 1300));
  check('paused clock stands still', (await txt('#utc')) === p0);
  await page.evaluate(async () => { const c = document.querySelector('#utc'); c.resume(); await c.updateComplete; });
  check('resumed clock jumps to now', (await txt('#utc')) !== p0);
  await more(page, check);
}

// T041: the holes found by the T035 audit
export async function more(page, check) {
  const v = (sel) => page.evaluate(async (s) => { const e = document.querySelector(s); await e.updateComplete; return e.shadowRoot.querySelector('[part=value]').textContent.replace(/\s+/g, ''); }, sel);
  const setv = (sel, x) => page.evaluate(async (s, y) => { const e = document.querySelector(s); e.value = y === '__null' ? null : y === '__inf' ? Infinity : y; await e.updateComplete; }, sel, x);
  await page.evaluate(async () => { const s = document.querySelector('#board'); s.setAttribute('motion', 'calm'); await s.updateComplete; });
  await setv('#temp', '12');
  check(`value coercion: numeric strings are numbers (${await v('#temp')})`, (await v('#temp')) === '12.0');
  await setv('#temp', '');
  const empty = await v('#temp');
  await setv('#temp', '__null');
  check(`value coercion: '' and null show a dash (${empty}, ${await v('#temp')})`, empty === '—' && (await v('#temp')) === '—');
  await setv('#temp', '__inf');
  check(`value coercion: Infinity shows a dash (${await v('#temp')})`, (await v('#temp')) === '—');
  check(`value coercion: value="" attribute shows a dash (${await v('#empty')})`, (await v('#empty')) === '—');

  await setv('#temp', 28);
  check('warn-above is strict (28 does not warn)', await page.evaluate(() => !document.querySelector('#temp').hasAttribute('warn')));
  await setv('#power', -5);
  const w1 = await page.evaluate(() => document.querySelector('#power').hasAttribute('warn'));
  await setv('#power', 0);
  check('no thresholds never warn (-5, 0)', !w1 && !(await page.evaluate(() => document.querySelector('#power').hasAttribute('warn'))));

  const cols = await page.evaluate(async () => {
    const s = document.querySelector('#board'); s.setAttribute('motion', 'full'); await s.updateComplete;
    const e = document.querySelector('#power'); e.value = 3907; await e.updateComplete; await new Promise((r) => setTimeout(r, 900));
    return [...e.shadowRoot.querySelectorAll('.roll')].map((roll) => {
      const r = roll.getBoundingClientRect();
      const hit = [...roll.querySelectorAll('.col > span')].find((d) => { const b = d.getBoundingClientRect(); return Math.abs(b.top - r.top) < 2; });
      return hit?.textContent;
    }).join('');
  });
  check(`rolling columns sit on the shown digits (${cols})`, cols === '3907');

  // status
  const lamp = (sel) => page.evaluate((s) => { const e = document.querySelector(s); const l = e.shadowRoot.querySelector('[part=lamp]'); return { color: getComputedStyle(l).backgroundColor, anims: l.getAnimations().length }; }, sel);
  check(`status standby uses the signal colour (${(await lamp('#wash')).color})`, (await lamp('#wash')).color === 'rgb(74, 144, 194)');
  await page.evaluate(async () => { const d = document.querySelector('#door'); d.state = 'online'; await d.updateComplete; });
  const fullBlink = (await lamp('#door')).anims;
  await page.evaluate(async () => { const s = document.querySelector('#board'); s.setAttribute('motion', 'calm'); await s.updateComplete; await document.querySelector('#door').updateComplete; });
  const calmBlink = (await lamp('#door')).anims;
  check(`status lamp blinks only in full motion (full ${fullBlink}, calm ${calmBlink})`, fullBlink > 0 && calmBlink === 0);
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'); s.setAttribute('motion', 'full'); await s.updateComplete;
    const d = document.querySelector('#door'); await d.updateComplete;
    d.pause(); await d.updateComplete;
    const anims = d.shadowRoot.querySelector('[part=lamp]').getAnimations().length;
    d.since = Date.now() - 3 * 86400e3; await d.updateComplete;
    const during = d.shadowRoot.querySelector('[part=since]')?.textContent;
    d.resume(); await d.updateComplete;
    return { anims, during, after: d.shadowRoot.querySelector('[part=since]')?.textContent };
  });
  check(`status paused stops the blink (${held.anims})`, held.anims === 0);
  check(`status paused holds since (${held.during} -> ${held.after})`, held.during !== held.after && held.after === '3日0時間');
  check(`status shows days and hours (${held.after})`, held.after === '3日0時間');
  check(`status initial state attribute (${await page.evaluate(() => document.querySelector('#wash').state)})`, (await page.evaluate(() => document.querySelector('#wash').state)) === 'standby');
  check(`status since attribute in ms (${await page.evaluate(() => document.querySelector('#wash').since)})`, (await page.evaluate(() => document.querySelector('#wash').since)) === 1730000000000);
  const inh = await page.evaluate(async () => { const d = document.querySelector('#door'); d.state = 'toString'; await d.updateComplete; const r = [d.state, d.shadowRoot.querySelector('[part=value]').textContent.trim()]; d.state = 'online'; await d.updateComplete; return r; });
  check(`inherited names become unknown (${inh[0]})`, inh[0] === 'unknown' && inh[1] === '不明');

  // own resume while the stage is paused
  const own = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#power'); const log = [];
    e.addEventListener('cw-resume', (ev) => log.push(ev.detail.applied));
    e.pause(); await e.updateComplete;
    s.pause(); await s.updateComplete;
    e.value = 1234; e.resume(); await e.updateComplete;
    const during = e.getAttribute('aria-label');
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { log: log.join(','), during, after: e.getAttribute('aria-label') };
  });
  check(`own resume under a paused stage fires cw-resume once (${own.log}; ${own.after})`, own.log === '0' && !own.during.includes('1234') && own.after.includes('1234'));

  // motion priority
  const prio = await page.evaluate(async () => {
    const s = document.querySelector('#board'); s.setAttribute('motion', 'calm'); await s.updateComplete;
    const h = document.querySelector('#hum'); h.value = 51; await h.updateComplete;
    return h.shadowRoot.querySelectorAll('.roll').length;
  });
  check(`reduced motion and stage: the stage level beats the element's own motion="full" (${prio} rolls)`, prio === 0);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const loose = await page.waitForFunction(() => document.querySelector('#loose').shadowRoot.querySelectorAll('.roll').length === 0, { timeout: 2000 }).then(() => true, () => false);
  check('reduced motion beats a loose motion="full"', loose);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  const clk = await page.evaluate(() => {
    const c = document.querySelector('#tokyo');
    const want = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
    return { date: c.shadowRoot.querySelector('[part=date]').textContent.trim(), aria: c.getAttribute('aria-label'), want };
  });
  check(`clock shows date and aria-label (${clk.date}; ${clk.aria})`, clk.date === clk.want && clk.aria.startsWith(clk.want + ' '));
}
