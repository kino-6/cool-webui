// <cw-switch>: tap, keys and the slider send events; values hold while paused; the on face, motion and the game look.
export const demo = 'switch.html';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const look = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s);
  await e.updateComplete;
  const r = e.shadowRoot, face = r.querySelector('[part=face]'), lamp = r.querySelector('[part=lamp]'), range = r.querySelector('input[type=range]');
  return {
    on: e.on, level: e.level, checked: face.getAttribute('aria-checked'), role: face.getAttribute('role'),
    state: r.querySelector('[part=state]').textContent.trim(), slider: range ? +range.value : null,
    bg: getComputedStyle(face).backgroundColor, color: getComputedStyle(face).color,
    lampAnim: getComputedStyle(lamp).animationName, trans: getComputedStyle(face).transitionDuration,
    fill: r.querySelector('[part=fill]') ? r.querySelector('[part=fill]').getBoundingClientRect().width : null,
    track: range ? range.getBoundingClientRect().width : 0,
  };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await wait(200);
  let a = await look(page, '#lamp');
  check(`starts from the on and level attributes (${a.checked}, ${a.slider}, ${a.state})`, a.on && a.checked === 'true' && a.role === 'switch' && a.slider === 60 && a.state === '60%');
  const fan = await look(page, '#fan');
  check(`no level means no slider and the word オフ (${fan.slider}, ${fan.state})`, fan.slider === null && fan.state === 'オフ');
  check(`text replaces the state word (${(await look(page, '#kettle')).state})`, (await look(page, '#kettle')).state === '保温');
  check(`the on face is a different colour from the off face (${a.bg} / ${fan.bg})`, a.bg !== fan.bg && a.color !== fan.color);

  // tap: flips at once and sends cw-toggle with the new state
  const tap = await page.evaluate(async () => {
    const e = document.querySelector('#lamp'), log = [];
    e.addEventListener('cw-toggle', (ev) => log.push(ev.detail.on));
    e.shadowRoot.querySelector('[part=face]').click();
    await e.updateComplete;
    return { on: e.on, log, attr: e.hasAttribute('on') };
  });
  check(`a tap turns it off and says so once (${JSON.stringify(tap)})`, tap.on === false && !tap.attr && tap.log.join() === 'false');
  a = await look(page, '#lamp');
  check(`off keeps the slider at its level and shows オフ (${a.slider}, ${a.state})`, a.slider === 60 && a.state === 'オフ');

  // keys: Space on the focused face
  await page.focus('#fan');
  await page.evaluate(() => document.querySelector('#fan').shadowRoot.querySelector('[part=face]').focus());
  const keyLog = page.evaluate(() => new Promise((r) => document.querySelector('#fan').addEventListener('cw-toggle', (ev) => r(ev.detail.on), { once: true })));
  await page.keyboard.press('Space');
  check(`Space on the focused switch turns it on (${await keyLog})`, (await keyLog) === true && (await look(page, '#fan')).on);

  // slider: dragging updates the level live; letting go sends cw-level once and turns the light on
  const drag = await page.evaluate(async () => {
    const e = document.querySelector('#stand'), log = [], toggles = [];
    e.addEventListener('cw-level', (ev) => log.push(ev.detail.level));
    e.addEventListener('cw-toggle', (ev) => toggles.push(ev.detail.on));
    const r = e.shadowRoot.querySelector('input[type=range]');
    for (const v of [40, 55, 72]) { r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); }
    await e.updateComplete;
    const mid = { level: e.level, state: e.shadowRoot.querySelector('[part=state]').textContent.trim(), sent: log.length };
    r.dispatchEvent(new Event('change', { bubbles: true }));
    await e.updateComplete;
    return { mid, log, on: e.on, toggles };
  });
  check(`dragging moves the level without sending (${JSON.stringify(drag.mid)})`, Math.abs(drag.mid.level - 0.72) < 1e-9 && drag.mid.state === '72%' && drag.mid.sent === 0);
  check(`letting go sends cw-level once and lights it (${JSON.stringify(drag)})`, drag.log.length === 1 && Math.abs(drag.log[0] - 0.72) < 1e-9 && drag.on && drag.toggles.length === 0);
  const fillW = await look(page, '#stand');
  check(`the fill follows the level (${fillW.fill?.toFixed(0)}px of ${fillW.track.toFixed(0)}px)`, Math.abs(fillW.fill / fillW.track - 0.72) < 0.06);
  const zero = await page.evaluate(async () => {
    const e = document.querySelector('#stand'), r = e.shadowRoot.querySelector('input[type=range]');
    r.value = '0'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change'));
    await e.updateComplete;
    return e.on;
  });
  check(`sliding to 0 turns it off (${zero})`, zero === false);

  // values from outside: set at once, held while the stage is paused, latest applied on resume
  const held = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#bed');
    let applied = -1; stage.addEventListener('cw-resume', (ev) => (applied = ev.detail.applied), { once: true });
    stage.pause(); await stage.updateComplete;
    e.on = false; e.level = 0.4; e.level = 0.9; await e.updateComplete;
    const during = { on: e.shadowRoot.querySelector('[part=face]').getAttribute('aria-checked'), slider: +e.shadowRoot.querySelector('input[type=range]').value, read: e.level };
    stage.resume(); await stage.updateComplete; await e.updateComplete;
    return { during, after: { on: e.on, slider: +e.shadowRoot.querySelector('input[type=range]').value }, applied };
  });
  check(`while paused the face keeps the old values (${JSON.stringify(held.during)})`, held.during.on === 'true' && held.during.slider === 15 && held.during.read === 0.9);
  check(`resume applies the latest (${JSON.stringify(held.after)}, applied ${held.applied})`, held.after.on === false && held.after.slider === 90 && held.applied >= 2);
  const tapWhilePaused = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#kettle'); const log = [];
    e.addEventListener('cw-toggle', (ev) => log.push(ev.detail.on));
    stage.pause(); await stage.updateComplete;
    e.shadowRoot.querySelector('[part=face]').click(); await e.updateComplete;
    const out = { log, checked: e.shadowRoot.querySelector('[part=face]').getAttribute('aria-checked') };
    stage.resume(); await stage.updateComplete;
    return out;
  });
  check(`a tap still works while paused (${JSON.stringify(tapWhilePaused)})`, tapWhilePaused.log.join() === 'false' && tapWhilePaused.checked === 'false');

  // motion: the lamp of a lit switch breathes in full only; off has no transitions
  const loose = await look(page, '#loose');
  const calm = await look(page, '#bed');
  await page.evaluate(() => { document.querySelector('#bed').on = true; });
  check(`full motion: a lit lamp breathes (${loose.lampAnim}); calm: still (${(await look(page, '#bed')).lampAnim})`, loose.lampAnim !== 'none' && (await look(page, '#bed')).lampAnim === 'none');
  await page.goto(`${base}?motion=off`, { waitUntil: 'load' });
  await wait(200);
  const off = await look(page, '#lamp');
  check(`motion off: no transitions on the face (${off.trans}; calm ${calm.trans})`, off.trans === '0s' && calm.trans !== '0s');

  // game look: the on face is the amber slab with dark text, and the slider thumb is slanted
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  await wait(300);
  const g = await page.evaluate(async () => {
    const e = document.querySelector('#lamp'); await e.updateComplete;
    const face = getComputedStyle(e.shadowRoot.querySelector('[part=face]'));
    return { bg: face.backgroundColor, color: face.color, lamp: getComputedStyle(e.shadowRoot.querySelector('[part=lamp]')).backgroundColor, fill: getComputedStyle(e.shadowRoot.querySelector('[part=fill]')).backgroundColor, thumb: getComputedStyle(e.shadowRoot.querySelector('[part=thumb]')).transform };
  });
  const c = g.thumb.startsWith('matrix(') ? +g.thumb.slice(7, -1).split(',')[2] : 0;
  check(`game: the on face is the amber slab (${g.bg}, ${g.color})`, g.bg === 'rgb(255, 194, 26)' && g.color === 'rgb(20, 15, 4)');
  check(`game: the lamp and the fill stand out from the amber face (${g.lamp}, ${g.fill})`, g.lamp === 'rgb(20, 15, 4)' && g.fill === 'rgb(20, 15, 4)');
  check(`game: the slider thumb is slanted (${g.thumb})`, Math.abs(c) > 0.1);
  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await wait(200);
  const t = await page.evaluate(() => getComputedStyle(document.querySelector('#lamp').shadowRoot.querySelector('[part=thumb]')).transform);
  check(`tile: the thumb is upright (${t})`, t === 'none');
  const tl = await page.evaluate(() => getComputedStyle(document.querySelector('#lamp').shadowRoot.querySelector('[part=lamp]')).backgroundColor);
  check(`tile: a lit lamp is the blue accent (${tl})`, tl === 'rgb(74, 144, 194)');
  // holes found by the T065 audit
  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await wait(200);
  const beats = await page.evaluate(async () => {
    // the kettle shows on and a waiting value says on too; the press turns it off and that must survive resume
    const stage = document.querySelector('#board'), a = document.querySelector('#kettle'), b = document.querySelector('#stand');
    stage.pause(); await stage.updateComplete;
    a.on = true; b.level = 0.9;
    a.shadowRoot.querySelector('[part=face]').click();
    const r = b.shadowRoot.querySelector('input[type=range]');
    r.value = '30'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change'));
    stage.resume(); await stage.updateComplete; await a.updateComplete; await b.updateComplete;
    return { press: a.on, slide: b.level, lit: b.on };
  });
  check(`holes: a press while paused beats the waiting value (${beats.press})`, beats.press === false);
  check(`holes: a slide while paused beats the waiting value (${beats.slide}, ${beats.lit})`, Math.abs(beats.slide - 0.3) < 1e-9 && beats.lit);
  const after = await page.evaluate(async () => {
    const e = document.querySelector('#stand'), r = e.shadowRoot.querySelector('input[type=range]'), st = () => e.shadowRoot.querySelector('[part=state]').textContent.trim();
    r.value = '45'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); await e.updateComplete;
    const lit = st();
    r.value = '0'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); await e.updateComplete;
    return [lit, st()];
  });
  check(`holes: after letting go the face shows the result (${after})`, after[0] === '45%' && after[1] === 'オフ');
  const clamp = await page.evaluate(async () => {
    const e = document.querySelector('#bed'); e.level = 5; const hi = e.level; e.level = -2; const lo = e.level; e.level = 'x'; return [hi, lo, Number.isNaN(e.level)];
  });
  check(`holes: level is clamped to 0..1 and a non-number hides the slider (${clamp})`, clamp[0] === 1 && clamp[1] === 0 && clamp[2] === true);
  const color = await page.evaluate(async () => {
    const e = document.querySelector('#lamp'); e.on = true; e.level = 0.5; e.color = 'rgb(200, 30, 90)'; await e.updateComplete; await new Promise((res) => setTimeout(res, 300));
    const r = e.shadowRoot; return [getComputedStyle(r.querySelector('[part=lamp]')).backgroundColor, getComputedStyle(r.querySelector('[part=fill]')).backgroundColor];
  });
  check(`holes: color paints the lamp and, without --cw-signal-on, the fill (${color})`, color[0] === 'rgb(200, 30, 90)' && color[1] === 'rgb(200, 30, 90)');
  const still = await page.evaluate(async () => {
    const e = document.querySelector('#loose'); const before = getComputedStyle(e.shadowRoot.querySelector('[part=lamp]')).animationName;
    e.pause(); await e.updateComplete;
    const during = getComputedStyle(e.shadowRoot.querySelector('[part=lamp]')).animationName; e.resume(); await e.updateComplete;
    return [before, during];
  });
  check(`holes: pausing stops the breathing (${still})`, still[0] === 'breathe' && still[1] === 'none');
  const names = await page.evaluate(() => {
    const e = document.querySelector('#lamp'), r = e.shadowRoot.querySelector('input[type=range]'), f = e.shadowRoot.querySelector('[part=face]');
    return { slider: r.getAttribute('aria-label'), valuetext: r.getAttribute('aria-valuetext'), faceLabel: f.getAttribute('aria-label'), faceText: f.textContent.replace(/\s+/g, ' ').trim() };
  });
  check(`holes: the slider is read as the name plus 明るさ with a percent, the face reads its state (${JSON.stringify(names)})`,
    names.slider === '天井の灯りの明るさ' && names.valuetext === '50%' && names.faceLabel === null && names.faceText === '天井の灯り 50%');
  await page.evaluate(() => document.querySelector('#lamp').shadowRoot.querySelector('input[type=range]').focus());
  // listen first, then press: a press before the listener is there would be lost
  await page.evaluate(() => { window.__levels = []; document.querySelector('#lamp').addEventListener('cw-level', (e) => window.__levels.push(e.detail.level)); });
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  const keys = page.waitForFunction(() => window.__levels.length >= 3, { timeout: 3000 }).then(() => page.evaluate(() => window.__levels), () => page.evaluate(() => window.__levels));
  check(`holes: each arrow key sends cw-level (${await keys})`, (await keys).join() === '0.51,0.52,0.53');
  const hold = await page.evaluate(async () => {
    const e = document.querySelector('#lamp'), r = e.shadowRoot.querySelector('input[type=range]');
    r.value = '70'; r.dispatchEvent(new Event('input'));
    e.level = 0.1; await e.updateComplete;
    const during = +r.value;
    r.dispatchEvent(new Event('change')); await e.updateComplete;
    return { during, after: e.level };
  });
  check(`holes: a value from outside does not move a slider being dragged (${JSON.stringify(hold)})`, hold.during === 70 && Math.abs(hold.after - 0.7) < 1e-9);
}
