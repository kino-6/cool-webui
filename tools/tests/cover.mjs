// <cw-cover>: a window with its shade, state and position, buttons and slider, held slider, pause, motion, narrow, look.
export const demo = 'cover.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}]`)?.textContent.trim() ?? null;
  const win = r.querySelector('[part=window]'), shade = r.querySelector('[part=shade]'), range = r.querySelector('input[type=range]');
  return { state: t('state'), position: t('position'), label: t('label'), host: e.getAttribute('state'), aria: e.getAttribute('aria-label'),
    shade: shade ? Math.round(shade.offsetHeight / win.clientHeight * 100) : null, dim: win.hasAttribute('data-unknown'),
    buttons: [...r.querySelectorAll('button')].map((b) => b.getAttribute('part') + (b.disabled ? ':off' : '')).join(),
    range: range ? `${range.value}${getComputedStyle(range).display === 'none' ? ':hidden' : ''}` : null,
    slats: shade ? getComputedStyle(shade).animationName : null };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(500);
  const a = await read(page, '#living');
  check(`open at 60%: words, percent and a shade over 40% of the window (${a.state}, ${a.position}, ${a.shade})`, a.state === '開いている' && a.position === '60% 開' && Math.abs(a.shade - 40) <= 3);
  check(`open, stop, close and the position slider (${a.buttons}, ${a.range})`, a.buttons === 'open,stop,close' && a.range === '60');
  check(`it is a group read as name, state and percent (${a.aria})`, a.aria === '南の窓 開いている 60% 開');
  const b = await read(page, '#bed');
  check(`closed at 0%: the shade covers the window (${b.state}, ${b.shade})`, b.state === '閉まっている' && b.shade >= 97);
  const s = await read(page, '#simple');
  check(`no position: open shows the shade up; controls leave out stop and the slider (${s.shade}, ${s.buttons}, ${s.range})`, s.shade <= 3 && s.buttons === 'open,close' && s.range === null && s.position === null);
  const n = await read(page, '#none');
  check(`no state: a dash, no shade on a dim window, buttons off (${n.state}, ${n.shade}, ${n.buttons})`, n.state === '—' && n.shade === null && n.dim && n.buttons === 'open:off,stop:off,close:off' && n.aria === '窓の覆い');
  const mv = await read(page, '#moving');
  check(`closing reads 閉めている; calm keeps the slats still (${mv.state}, ${mv.slats})`, mv.state === '閉めている' && mv.slats === 'none');

  const sent = await page.evaluate(async () => {
    const e = document.querySelector('#living'), log = [], states = [];
    e.addEventListener('cw-cover', (ev) => log.push(ev.detail.action));
    e.addEventListener('cw-position', (ev) => log.push('pos ' + ev.detail.position));
    for (const p of ['close', 'stop', 'open']) { e.shadowRoot.querySelector(`[part=${p}]`).click(); await e.updateComplete; states.push(e.getAttribute('state')); }
    const r = e.shadowRoot.querySelector('input[type=range]');
    r.value = '25'; r.dispatchEvent(new Event('input'));
    e.now = { position: 80 }; await e.updateComplete;
    const held = r.value;
    r.dispatchEvent(new Event('change')); await e.updateComplete;
    return { log, states, held, after: e.now.position };
  });
  check(`buttons send close, stop, open and change the face at once (${sent.log.slice(0, 3)}; ${sent.states})`, sent.log.slice(0, 3).join() === 'close,stop,open' && sent.states.join() === 'closing,open,opening');
  check(`a held slider is not moved from outside; letting go sends its value (${sent.held}, ${sent.log[3]}, ${sent.after})`, sent.held === '25' && sent.log[3] === 'pos 25' && sent.after === 25);
  const stopClosed = await page.evaluate(async () => { const e = document.querySelector('#bed'); e.shadowRoot.querySelector('[part=stop]').click(); await e.updateComplete; return e.getAttribute('state'); });
  check(`stop at 0% reads closed (${stopClosed})`, stopClosed === 'closed');

  const held = await page.evaluate(async () => {
    const st = document.querySelector('#board'), e = document.querySelector('#bed');
    st.pause(); await st.updateComplete;
    e.now = { state: 'opening', position: 10 }; await e.updateComplete;
    const during = [e.getAttribute('state'), e.now.state];
    st.resume(); await st.updateComplete; await e.updateComplete;
    return { during, after: e.getAttribute('state'), pos: e.shadowRoot.querySelector('[part=position]').textContent };
  });
  check(`paused: new values wait, resume shows them (${JSON.stringify(held)})`, held.during.join() === 'closed,opening' && held.after === 'opening' && held.pos === '10% 開');

  // holes found by the audit of T100
  const h = await page.evaluate(async () => {
    // motion off: the shade moves to its height at once instead of over 400 ms
    const e = document.createElement('cw-cover'); e.setAttribute('motion', 'off'); document.body.append(e);
    const shade = async (v) => { e.now = v; await e.updateComplete; const sh = e.shadowRoot.querySelector('[part=shade]'); return sh ? Math.round(sh.offsetHeight / e.shadowRoot.querySelector('[part=window]').clientHeight * 100) : null; };
    const out = { closedNoPos: await shade({ state: 'closed', position: NaN }), movingNoPos: await shade({ state: 'opening' }) };
    e.now = { state: 'open', position: 70, controls: ['open', 'close'] }; await e.updateComplete;
    out.noPositionControl = !!e.shadowRoot.querySelector('input[type=range]');
    e.now = { controls: ['open', 'stop', 'close', 'position'] }; await e.updateComplete;
    const r = e.shadowRoot.querySelector('input[type=range]');
    r.value = '50'; r.dispatchEvent(new Event('input')); r.value = '70'; r.dispatchEvent(new Event('input'));
    r.dispatchEvent(new Event('pointerup'));
    e.now = { position: 40 }; await e.updateComplete;
    out.afterRelease = e.shadowRoot.querySelector('input[type=range]').value;
    e.remove();
    const s = document.querySelector('#board'), c = document.querySelector('#bed');
    s.pause(); await s.updateComplete;
    c.now = { state: 'closing', position: 20 };
    c.shadowRoot.querySelector('[part=open]').click(); await c.updateComplete;
    const cr = c.shadowRoot.querySelector('input[type=range]');
    cr.value = '30'; cr.dispatchEvent(new Event('input')); cr.dispatchEvent(new Event('change'));
    s.resume(); await s.updateComplete; await c.updateComplete;
    out.pressWins = [c.getAttribute('state'), c.now.position];
    return out;
  });
  check(`holes2: closed without a position draws the shade down, moving halfway (${h.closedNoPos}, ${h.movingNoPos})`, h.closedNoPos >= 97 && Math.abs(h.movingNoPos - 50) <= 3);
  check(`holes2: without position in controls there is no slider (${h.noPositionControl})`, h.noPositionControl === false);
  check(`holes2: let go where it was taken, the slider follows outside values again (${h.afterRelease})`, h.afterRelease === '40');
  check(`holes2: a press and a slide while paused beat the waiting state and position (${h.pressWins})`, h.pressWins.join() === 'opening,30');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#moving'), still = await read(page, '#living');
  check(`full: the slats run while it moves, not when it stands (${f.slats}, ${still.slats})`, f.slats === 'slats' && still.slats === 'none');
  const ps = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#moving'); await e.updateComplete; const v = getComputedStyle(e.shadowRoot.querySelector('[part=shade]')).animationName; s.resume(); await s.updateComplete; return v; });
  check(`holes2: paused, the slats stand still (${ps})`, ps === 'none');
  await page.evaluate(() => { const g = document.querySelector('.grid'); g.style.gridTemplateColumns = '200px 1fr 1fr'; });
  await page.wait(100);
  const nr = await read(page, '#living');
  check(`a 200px box hides the slider (${nr.range})`, nr.range === '60:hidden');
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  const lab = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--cw-text-dim)'; document.body.append(d); const want = getComputedStyle(d).color; d.remove(); return [getComputedStyle(document.querySelector('#living').shadowRoot.querySelector('[part=label]')).color, want]; });
  check(`game: the name is in the dim text colour (${lab})`, lab[0] === lab[1]);
}
