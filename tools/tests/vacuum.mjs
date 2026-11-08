// <cw-vacuum>: state in Japanese, battery, area and time, buttons that send what was asked, pause, motion, narrow, look.
export const demo = 'vacuum.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}]`)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const shown = (p) => { const x = r.querySelector(`[part=${p}]`); return !!x && getComputedStyle(x).display !== 'none'; };
  return { state: t('state'), label: t('label'), error: t('error'), battery: t('battery'), area: t('area'), duration: t('duration'),
    buttons: [...r.querySelectorAll('button')].map((b) => `${b.getAttribute('part')}:${b.getAttribute('aria-label')}${b.disabled ? ':off' : ''}`).join(','),
    stateColor: getComputedStyle(r.querySelector('[part=state]')).color, batteryColor: r.querySelector('[part=battery]') ? getComputedStyle(r.querySelector('[part=battery]')).color : null,
    turn: getComputedStyle(r.querySelector('[part=robot]')).animationName, details: shown('details'),
    aria: e.getAttribute('aria-label'), role: e.getAttribute('role') };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const a = await read(page, '#living');
  check(`cleaning reads 掃除中 with its name (${a.label}, ${a.state})`, a.label === 'ルンバ' && a.state === '掃除中');
  check(`battery, area and time (${a.battery}, ${a.area}, ${a.duration})`, a.battery === '72%' && a.area === '24 m²' && a.duration === '18 分');
  check(`while cleaning the first button pauses (${a.buttons})`, a.buttons === 'start:一時停止,stop:止める,return:充電台に戻す');
  check(`it is a group read as name, state and battery (${a.role}, ${a.aria})`, a.role === 'group' && a.aria === 'ルンバ 掃除中 電池 72%');
  const e = await read(page, '#error');
  const warn = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-warn)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  check(`an error is in the warning colour with its words (${e.state}, ${e.error})`, e.state === 'エラー' && e.error === 'ブラシに何か絡まっています' && e.stateColor === warn);
  check(`a battery at 20% or less is in the warning colour (${e.batteryColor})`, e.batteryColor === warn && a.batteryColor !== warn);
  const f = await read(page, '#few');
  check(`docked offers 始める, and controls leave out stop (${f.state}, ${f.buttons})`, f.state === '充電台' && f.buttons === 'start:始める,return:充電台に戻す');
  const n = await read(page, '#none');
  check(`no state: a dash and buttons that cannot be pressed (${n.state}, ${n.buttons})`, n.state === '—' && n.buttons === 'start:始める:off,stop:止める:off,return:充電台に戻す:off' && n.aria === '掃除機');
  const nr = await read(page, '#narrow');
  check(`a narrow box hides the details (${nr.details}; wide ${a.details})`, nr.details === false && a.details === true);
  check(`calm: the robot is still (${a.turn})`, a.turn === 'none');

  const sent = await page.evaluate(async () => {
    const e = document.querySelector('#living'), log = [], states = [];
    e.addEventListener('cw-vacuum', (ev) => log.push(ev.detail.action));
    for (const p of ['start', 'start', 'return', 'stop']) { e.shadowRoot.querySelector(`[part=${p}]`).click(); await e.updateComplete; states.push(e.getAttribute('state')); }
    return { log, states };
  });
  check(`buttons send pause, start, return, stop (${sent.log})`, sent.log.join() === 'pause,start,return,stop');
  check(`each press changes the face at once (${sent.states})`, sent.states.join() === 'paused,cleaning,returning,idle');
  const cleared = await page.evaluate(async () => { const e = document.querySelector('#error'); e.shadowRoot.querySelector('[part=start]').click(); await e.updateComplete; return [e.getAttribute('state'), e.shadowRoot.querySelector('[part=error]')]; });
  check(`starting after an error clears the error words (${cleared[0]}, ${cleared[1]})`, cleared[0] === 'cleaning' && cleared[1] === null);

  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#narrow');
    s.pause(); await s.updateComplete;
    e.now = { state: 'cleaning', battery: 90 }; await e.updateComplete;
    const during = [e.getAttribute('state'), e.now.state];
    s.resume(); await s.updateComplete; await e.updateComplete;
    return { during, after: e.getAttribute('state'), area: e.shadowRoot.querySelector('[part=area]')?.textContent };
  });
  check(`paused: new values wait, resume shows them and keeps the rest (${JSON.stringify(held)})`, held.during.join() === 'docked,cleaning' && held.after === 'cleaning' && held.area === '41 m²');

  // holes found by the audit of T096
  const h = await page.evaluate(async () => {
    const e = document.createElement('cw-vacuum'); document.body.append(e);
    e.now = { state: 'docked', battery: 20 }; await e.updateComplete;
    const warn20 = e.hasAttribute('data-low');
    e.now = { battery: 21 }; await e.updateComplete;
    const warn21 = e.hasAttribute('data-low');
    e.now = { state: 'docked', controls: ['start', 'return'] }; await e.updateComplete;
    e.shadowRoot.querySelector('[part=start]').click(); await e.updateComplete;
    const noPause = [e.getAttribute('state'), [...e.shadowRoot.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).join()];
    e.remove();
    const s = document.querySelector('#board'), v = document.querySelector('#few');
    s.pause(); await s.updateComplete;
    v.now = { state: 'docked' };
    v.shadowRoot.querySelector('[part=start]').click(); await v.updateComplete;
    s.resume(); await s.updateComplete; await v.updateComplete;
    return { warn20, warn21, noPause, pressWins: v.getAttribute('state') };
  });
  check(`holes: exactly 20% is low, 21% is not (${h.warn20}, ${h.warn21})`, h.warn20 && !h.warn21);
  check(`holes: without pause in controls, cleaning shows no pause button (${JSON.stringify(h.noPause)})`, h.noPause[0] === 'cleaning' && h.noPause[1] === '充電台に戻す');
  check(`holes: a press while paused beats the state waiting (${h.pressWins})`, h.pressWins === 'cleaning');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const full = await read(page, '#living'), docked = await read(page, '#narrow');
  check(`full: the robot turns while cleaning, not on the dock (${full.turn}, ${docked.turn})`, full.turn === 'turn' && docked.turn === 'none');
  const fp = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#living'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=robot]')).animationName; });
  check(`full but paused: the robot stops (${fp})`, fp === 'none');
  const turns = await page.evaluate(async () => { const s = document.querySelector('#board'); s.resume(); await s.updateComplete; const e = document.querySelector('#narrow'), out = []; for (const st of ['returning', 'paused']) { e.now = { state: st }; await e.updateComplete; out.push(getComputedStyle(e.shadowRoot.querySelector('[part=robot]')).animationName); } return out; });
  check(`holes: full: returning turns, paused does not (${turns})`, turns.join() === 'turn,none');

  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  const lab = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-text-dim)'; document.body.append(d); const want = getComputedStyle(d).color; d.remove(); return [getComputedStyle(document.querySelector('#living').shadowRoot.querySelector('[part=label]')).color, want]; });
  check(`game: the name is in the dim text colour, not the dark colour meant for the label tag (${lab})`, lab[0] === lab[1]);
  const g = await page.evaluate(() => getComputedStyle(document.querySelector('#living').shadowRoot.querySelector('[part=start]')).transform);
  check(`game: buttons are slanted (${g})`, g.startsWith('matrix(') && Math.abs(+g.slice(7, -1).split(',')[2]) > 0.1);
  const words = await page.evaluate(async () => { const e = document.querySelector('#none'), out = []; for (const st of ['idle', 'returning', 'paused', 'mopping']) { e.now = { state: st }; await e.updateComplete; out.push(e.shadowRoot.querySelector('[part=state]').textContent.trim()); } return out; });
  check(`idle, returning, paused, and an unknown word as it is (${words})`, words.join() === '待機,戻り中,一時停止,mopping');
}
