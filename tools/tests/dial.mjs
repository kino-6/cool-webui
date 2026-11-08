// <cw-dial>: a value on an arc, a thermostat when it has a target; buttons, limits, warning, pause, motion and look.
export const demo = 'dial.html';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, arc = r.querySelector('[part=arc]'), t = (p) => r.querySelector(`[part=${p}]`)?.textContent.trim() ?? null;
  const len = +arc.getAttribute('stroke-dasharray'), off = +arc.getAttribute('stroke-dashoffset');
  return { value: t('value'), unit: t('unit'), label: t('label'), target: t('target'), fill: 1 - off / len, mark: !!r.querySelector('[part=mark]'),
    up: r.querySelector('[part=up]')?.disabled, down: r.querySelector('[part=down]')?.disabled, warn: e.hasAttribute('warn'),
    arcColor: getComputedStyle(arc).stroke, valueColor: getComputedStyle(r.querySelector('[part=value]')).color, trans: getComputedStyle(arc).transitionDuration,
    aria: e.getAttribute('aria-label'), role: e.getAttribute('role'), font: getComputedStyle(r.querySelector('[part=value]')).fontFamily,
    box: (() => { const b = e.getBoundingClientRect(), s = r.querySelector('svg').getBoundingClientRect(); return [b.width, s.width]; })() };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(400);
  const h = await read(page, '#heat');
  check(`the value with its digits, unit and label (${h.value} ${h.unit} ${h.label})`, h.value === '21.4' && h.unit === '°C' && h.label === '室温');
  check(`the arc fills to where the value sits between min and max (${h.fill.toFixed(3)})`, Math.abs(h.fill - (21.4 - 10) / 20) < 0.01);
  check(`a target shows a mark and the set point (${h.target}, ${h.mark})`, h.target === '設定 22.5' && h.mark);
  check(`it reads as one group (${h.role}; ${h.aria})`, h.role === 'group' && h.aria === '室温 21.4°C 設定 22.5°C');
  const hum = await read(page, '#hum');
  check(`no target, no mark and no buttons (${hum.mark}, ${hum.target})`, !hum.mark && hum.target === null && hum.up === undefined);
  const b = await read(page, '#batt');
  check(`no value shows a dash and an empty arc (${b.value}, ${b.fill})`, b.value === '—' && b.fill === 0 && b.aria === '値なし');

  const press = await page.evaluate(async () => {
    const e = document.querySelector('#heat'), log = [];
    e.addEventListener('cw-target', (ev) => log.push(ev.detail.target));
    e.shadowRoot.querySelector('[part=up]').click(); await e.updateComplete;
    e.shadowRoot.querySelector('[part=up]').click(); await e.updateComplete;
    e.shadowRoot.querySelector('[part=down]').click(); await e.updateComplete;
    return { log, shown: e.shadowRoot.querySelector('[part=target]').textContent.trim(), target: e.target };
  });
  check(`+ + − move the set point by the step and say so each time (${JSON.stringify(press)})`, press.log.join() === '23,23.5,23' && press.shown === '設定 23.0' && press.target === 23);
  const hold = await page.evaluate(async () => {
    const e = document.querySelector('#heat'); e.target = 18; await e.updateComplete;
    const during = e.target;
    await window.__wait(1700);
    e.target = 18; await e.updateComplete;
    return [during, e.target];
  });
  check(`right after a press a target from outside does not move it; later it does (${hold})`, hold[0] === 23 && hold[1] === 18);
  const s = await read(page, '#small');
  check(`at max the + button is off (${s.up}, ${s.down})`, s.up === true && s.down === false);
  const clamp = await page.evaluate(async () => {
    const e = document.querySelector('#small'), log = [];
    e.addEventListener('cw-target', (ev) => log.push(ev.detail.target));
    e.shadowRoot.querySelector('[part=up]').click(); await e.updateComplete;
    e.value = 99; await e.updateComplete;
    const r = e.shadowRoot.querySelector('[part=arc]');
    return { log: log.length, fill: 1 - +r.getAttribute('stroke-dashoffset') / +r.getAttribute('stroke-dasharray') };
  });
  check(`nothing is sent past max, and the arc stops full (${JSON.stringify(clamp)})`, clamp.log === 0 && Math.abs(clamp.fill - 1) < 1e-6);

  const warn = await page.evaluate(async () => { const e = document.querySelector('#hum'); e.value = 75; await e.updateComplete; return [e.hasAttribute('warn'), getComputedStyle(e.shadowRoot.querySelector('[part=arc]')).stroke]; });
  check(`above warn-above the arc and number turn to the warning colour (${warn})`, warn[0] && warn[1] === 'rgb(241, 139, 130)');
  const neg = await page.evaluate(async () => { const e = document.querySelector('#hum'); e.min = -20; e.value = -3; await e.updateComplete; return e.shadowRoot.querySelector('[part=value]').textContent.trim(); });
  check(`a negative value uses the minus sign (${neg})`, neg === '−3');

  const held = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#heat');
    stage.pause(); await stage.updateComplete;
    e.value = 25; await e.updateComplete;
    const during = [e.shadowRoot.querySelector('[part=value]').textContent.trim(), e.value];
    stage.resume(); await stage.updateComplete; await e.updateComplete;
    return [...during, e.shadowRoot.querySelector('[part=value]').textContent.trim()];
  });
  check(`paused: a new value waits (${held})`, held[0] === '21.4' && held[1] === 25 && held[2] === '25.0');
  check(`the arc fits the box (${h.box.map((x) => x.toFixed(0))})`, h.box[1] <= h.box[0] + 0.5 && h.box[1] > 100);

  check(`calm: the arc eases over 200ms; full: slower (${h.trans}, ${s.trans})`, h.trans === '0.2s' && s.trans === '0.9s');
  await page.goto(`${base}?motion=off&theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const g = await read(page, '#heat');
  check(`off: no easing (${g.trans})`, g.trans === '0s');
  check(`game: the number in the wide face and the arc in amber (${g.font}, ${g.arcColor})`, /^Archivo/.test(g.font) && g.arcColor === 'rgb(255, 194, 26)');
  // holes found by the T078 audit, on fresh dials
  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await page.wait(300);
  const mk = (attrs) => page.evaluate(async (a) => {
    const e = document.createElement('cw-dial'); e.id = 'probe';
    for (const [k, v] of Object.entries(a)) e.setAttribute(k, v);
    Object.assign(e.style, { position: 'fixed', left: '0', top: '0', width: '300px', height: '300px' });
    document.querySelector('#probe')?.remove(); document.body.append(e); await e.updateComplete; await window.__wait(50); await e.updateComplete;
  }, attrs);
  const tap = (part, n = 1) => page.evaluate(async (p, k) => {
    const e = document.querySelector('#probe'), log = [];
    const f = (ev) => log.push(ev.detail.target); e.addEventListener('cw-target', f);
    for (let i = 0; i < k; i++) { e.shadowRoot.querySelector(`[part=${p}]`).click(); await e.updateComplete; }
    e.removeEventListener('cw-target', f);
    return { log, target: e.target, shown: e.shadowRoot.querySelector('[part=target]')?.textContent.trim(), up: e.shadowRoot.querySelector('[part=up]')?.disabled, down: e.shadowRoot.querySelector('[part=down]')?.disabled };
  }, part, n);
  await mk({ min: 10, max: 30, target: 10.2, value: 20 });
  let p = await tap('down', 2);
  check(`holes: − stops at min and switches off there (${JSON.stringify(p)})`, p.log.join() === '10' && p.target === 10 && p.down === true && p.up === false);
  await mk({ min: 10, max: 30, target: 22.3, value: 20 });
  p = await tap('up');
  check(`holes: a press snaps an off-step target to the step (${p.log})`, p.log.join() === '23');
  await mk({ min: 0, max: 30, target: 22.1, step: 0.1, value: 20 });
  p = await tap('up', 2);
  check(`holes: 0.1 steps carry no float noise and the set point has 1 digit (${p.log}, ${p.shown})`, p.log.join() === '22.2,22.3' && p.shown === '設定 22.3');
  await mk({ min: 10, max: 30, target: 22, step: 1, value: 20 });
  p = await tap('up');
  check(`holes: step=1 moves by 1 and shows no decimals (${p.log}, ${p.shown})`, p.log.join() === '23' && p.shown === '設定 23');
  await mk({ min: 10, max: 30, target: 22.5, value: 20 });
  const heldTarget = await page.evaluate(async () => {
    const e = document.querySelector('#probe');
    e.shadowRoot.querySelector('[part=up]').click(); await e.updateComplete;
    await window.__wait(1000); e.target = 25; await e.updateComplete;
    const at1 = e.target;
    await window.__wait(800); await e.updateComplete;
    return [at1, e.target, e.shadowRoot.querySelector('[part=target]').textContent.trim()];
  });
  check(`holes: a target sent during the hold shows when the hold ends (${heldTarget})`, heldTarget[0] === 23 && heldTarget[1] === 25 && heldTarget[2] === '設定 25.0');
  await mk({ min: 0, max: 100, value: 20, 'warn-below': 20, 'warn-above': 70 });
  const warns = await page.evaluate(async () => {
    const e = document.querySelector('#probe'), out = [];
    for (const v of [20, 19.9, 70, 70.1]) { e.value = v; await e.updateComplete; out.push(e.hasAttribute('warn')); }
    return { out, num: getComputedStyle(e.shadowRoot.querySelector('[part=value]')).color };
  });
  check(`holes: warn-below and warn-above are strict, the number turns too (${JSON.stringify(warns)})`, warns.out.join() === 'false,true,false,true' && warns.num === 'rgb(241, 139, 130)');
  await mk({ min: 10, max: 30, target: 15, value: 25 });
  const geo = await page.evaluate(() => {
    const e = document.querySelector('#probe'), r = e.shadowRoot, m = r.querySelector('[part=mark]');
    const a = Math.atan2(+m.getAttribute('cy'), +m.getAttribute('cx')) * 180 / Math.PI;
    const host = e.getBoundingClientRect(), arc = r.querySelector('[part=track]').getBoundingClientRect();
    return { angle: (a + 360) % 360, inside: arc.left >= host.left - 0.5 && arc.right <= host.right + 0.5 && arc.top >= host.top - 0.5 && arc.bottom <= host.bottom + 0.5,
      aria: [r.querySelector('[part=down]').getAttribute('aria-label'), r.querySelector('[part=up]').getAttribute('aria-label')] };
  });
  check(`holes: the mark sits at the target on a 270° arc (${geo.angle.toFixed(1)}°)`, Math.abs(geo.angle - (135 + 0.25 * 270)) < 0.5);
  check(`holes: the arc stays inside the box (${geo.inside})`, geo.inside);
  check(`holes: the buttons are named (${geo.aria})`, geo.aria.join() === '下げる,上げる');
  const again = await page.evaluate(async () => {
    const e = document.querySelector('#probe'); e.target = 20; await e.updateComplete;
    e.shadowRoot.querySelector('[part=up]').click(); await e.updateComplete;
    const parent = e.parentNode; e.remove(); parent.append(e); await e.updateComplete;
    e.target = 12; await e.updateComplete; return e.target;
  });
  check(`holes: a dial taken off and put back mid-hold takes targets again (${again})`, again === 12);
  const gone = await page.evaluate(async () => { const e = document.querySelector('#probe'); e.target = NaN; await e.updateComplete; return [!!e.shadowRoot.querySelector('[part=mark]'), !!e.shadowRoot.querySelector('[part=up]')]; });
  check(`holes: target NaN removes the mark and the buttons (${gone})`, !gone[0] && !gone[1]);

  // keys: at the limit the focus moves to the other button; focus ring shows
  await mk({ min: 10, max: 30, target: 29.5, value: 20 });
  const keys = await page.evaluate(async () => {
    const e = document.querySelector('#probe'); e.shadowRoot.querySelector('[part=up]').focus();
    return 'ok';
  });
  await page.keyboard.press('Enter');
  await page.wait(100);
  const focus = await page.evaluate(() => { const e = document.querySelector('#probe'), a = e.shadowRoot.activeElement; return { part: a?.getAttribute('part') ?? document.activeElement.localName, ring: a ? parseFloat(getComputedStyle(a).outlineWidth) : 0 }; });
  check(`keys: focus stays inside the dial at the limit (${JSON.stringify(focus)}, ${keys})`, focus.part === 'down');
  check(`holes: a key-focused button shows its focus ring (${focus.ring})`, focus.ring >= 1);

  // short boxes: the number and the buttons in one line, nothing outside
  for (const [w, h] of [[420, 100], [90, 100]]) {
    const n = await page.evaluate(async (W, H) => {
      const e = document.createElement('cw-dial'); e.setAttribute('unit', '°C'); e.setAttribute('value', '21.4'); e.setAttribute('target', '22.5'); e.setAttribute('min', '10'); e.setAttribute('max', '30');
      const box = document.createElement('div'); Object.assign(box.style, { position: 'fixed', left: '0', top: '0', width: W + 'px', height: H + 'px' });
      box.append(e); document.body.append(box); await e.updateComplete; await window.__wait(50);
      const b = box.getBoundingClientRect(), h = e.getBoundingClientRect(), parts = [...e.shadowRoot.querySelectorAll('[part=value], button')].map((x) => x.getBoundingClientRect());
      const out = { host: h.height, inside: parts.every((r) => r.bottom <= b.bottom + 0.5 && r.right <= b.right + 0.5 && r.left >= b.left - 0.5), arc: getComputedStyle(e.shadowRoot.querySelector('svg')).display,
        button: Math.min(...[...e.shadowRoot.querySelectorAll('button')].map((x) => x.offsetWidth)) };
      box.remove(); return out;
    }, w, h);
    check(`narrow: a ${w}x${h} box keeps the dial inside (${JSON.stringify(n)})`, n.host <= h + 0.5 && n.inside && n.arc === 'none');
  }
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const gm = await page.evaluate(() => { const r = document.querySelector('#heat').shadowRoot, v = getComputedStyle(r.querySelector('[part=value]')); return { w: v.fontWeight, s: v.fontStretch, b: getComputedStyle(r.querySelector('[part=up]')).transform }; });
  check(`holes: game makes the number heavy and wide and slants the buttons (${JSON.stringify(gm)})`, gm.w === '900' && gm.s === '125%' && gm.b.startsWith('matrix('));
}
