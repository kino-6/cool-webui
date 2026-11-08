// <cw-ring>: words around a circle that fill it, turning in full motion only, stopping while paused.
export const demo = 'ring.html?motion=full&theme=game';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (page, id = 'ring') => page.evaluate((id) => {
  const el = document.getElementById(id), root = el.shadowRoot;
  const tp = root.querySelector('[part=text]'), path = root.querySelector('#arc');
  const inner = root.querySelector('.inner')?.getAttribute('transform') ?? '';
  return { fit: +root.querySelector('textPath')?.getAttribute('textLength') || 0, angle: el.angle, frames: +el.dataset.frames, inner: parseFloat(inner.slice(7)) || 0,
    textLen: tp?.getComputedTextLength() ?? 0, circle: path?.getTotalLength() ?? 0, words: tp?.textContent ?? '',
    label: root.querySelector('svg').getAttribute('aria-label'), font: tp ? getComputedStyle(tp).fontFamily : '' };
}, id);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await wait(500);
  const a = await read(page);
  await wait(800);
  const b = await read(page);
  check(`full: the text ring turns (${a.angle.toFixed(2)} -> ${b.angle.toFixed(2)}, frames ${a.frames} -> ${b.frames})`, b.angle !== a.angle && b.frames > a.frames);
  check(`full: the ticks turn the other way (${b.angle.toFixed(2)}, ${b.inner.toFixed(2)})`, b.angle > 0 && b.inner < 0);
  // the words repeat to within a third of the circle, then the spacing stretches them to fit it exactly
  check(`the text repeats to fill the circle (${b.textLen.toFixed(0)} spaced to ${b.fit} of ${b.circle.toFixed(0)})`,
    b.textLen > b.circle * 0.66 && b.textLen < b.circle * 1.34 && Math.abs(b.fit - b.circle) < b.circle * 0.01 && b.words.split('Kitchen').length > 2);
  check(`read aloud once, not repeated (${b.label})`, b.label === 'Home Control · Living · Kitchen · Study · Bedroom');
  check(`game look uses the wide face (${b.font})`, /^Archivo/.test(b.font));

  await page.evaluate(() => document.getElementById('stage').pause());
  await wait(100);
  const p1 = await read(page);
  await wait(600);
  const p2 = await read(page);
  check(`paused: stays put (${p1.angle.toFixed(2)} = ${p2.angle.toFixed(2)})`, p1.angle === p2.angle && p1.frames === p2.frames);
  await page.evaluate(() => document.getElementById('stage').resume());
  await wait(500);
  const p3 = await read(page);
  check(`resumed: turns again (${p3.angle.toFixed(2)})`, p3.angle !== p2.angle);

  // ticks: over time they move the other way from the words
  const t1 = await read(page); await wait(600); const t2 = await read(page);
  const dw = t2.angle - t1.angle, dt = t2.inner - t1.inner;
  check(`ticks keep turning the other way (${dw.toFixed(2)}, ${dt.toFixed(2)})`, Math.abs(dw) > 0.5 && Math.abs(dt) > 0.5 && Math.sign(dw) === -Math.sign(dt));
  const cap = await page.evaluate(async () => { const el = document.getElementById('capped'); const a = +el.dataset.frames; await new Promise((r) => setTimeout(r, 800)); return +el.dataset.frames - a; });
  check(`fps cap: fps=15 draws at most 15 a second (${cap} in 0.8 s)`, cap >= 4 && cap <= 15.6);
  const spacing = (r) => r.fit / r.textLen;
  check(`spacing within 0.9-1.15 (game) (${spacing(t2).toFixed(3)})`, spacing(t2) >= 0.9 && spacing(t2) <= 1.15);
  const short = await page.evaluate(async () => {
    const el = document.getElementById('ring'); const before = el.shadowRoot.querySelector('[part=text]').textContent.split('Kitchen').length - 1;
    el.text = 'Home'; await el.updateComplete; await el.updateComplete; await el.updateComplete;
    const after = el.shadowRoot.querySelector('[part=text]').textContent.split('Home').length - 1;
    return { before, after };
  });
  const sr = await read(page);
  check(`short text repeats more (${short.before} -> ${short.after} copies, ${sr.textLen.toFixed(0)} of ${sr.circle.toFixed(0)})`,
    short.after > short.before * 3 && sr.textLen > sr.circle * 0.9 && sr.textLen < sr.circle * 1.1);
  const re = await page.evaluate(async () => {
    const el = document.getElementById('ring'), t = () => el.shadowRoot.querySelector('[part=text]');
    const before = getComputedStyle(t()).letterSpacing;
    el.style.setProperty('--cw-display-font', 'monospace'); el.style.setProperty('--cw-display-stretch', '100%');
    document.fonts.dispatchEvent(new Event('loadingdone'));
    await el.updateComplete; await el.updateComplete; await el.updateComplete;
    return { before, after: getComputedStyle(t()).letterSpacing };
  });
  check(`remeasures when the font changes (letter spacing ${re.before} -> ${re.after})`, re.before !== re.after);
  const small = await page.evaluate(() => {
    const c = document.getElementById('alone').shadowRoot.querySelector('[part=ticks]');
    const step = c.getAttribute('stroke-dasharray').split(' ').reduce((n, v) => n + +v, 0);
    return { step, sw: +c.getAttribute('stroke-width') };
  });
  check(`small ring ticks spaced (step ${small.step.toFixed(1)} vs width ${small.sw})`, small.step >= small.sw * 3);

  await page.goto(`${base}?motion=full&theme=tile`, { waitUntil: 'load' });
  await wait(700);
  const tile = await read(page);
  check(`spacing within 0.9-1.15 (tile) (${spacing(tile).toFixed(3)})`, spacing(tile) >= 0.9 && spacing(tile) <= 1.15);

  for (const motion of ['calm', 'off']) {
    await page.goto(`${base}?motion=${motion}`, { waitUntil: 'load' });
    await wait(700);
    const c = await read(page);
    check(`${motion}: still (${c.angle}, frames ${c.frames}) and still drawn (${c.textLen.toFixed(0)})`, c.angle === 0 && c.frames === 0 && c.textLen > 0);
  }
  const alone = await read(page, 'alone');
  check(`outside a stage: drawn and still (${alone.textLen.toFixed(0)}, ${alone.angle})`, alone.textLen > 0 && alone.angle === 0);

  const esc = await page.evaluate(async () => {
    const el = document.getElementById('ring'); el.text = '<b>x</b>'; await el.updateComplete; await el.updateComplete;
    return { b: !!el.shadowRoot.querySelector('b'), t: el.shadowRoot.querySelector('[part=text]').textContent.includes('<b>x</b>') };
  });
  check(`text is shown as text (${JSON.stringify(esc)})`, !esc.b && esc.t);
}
