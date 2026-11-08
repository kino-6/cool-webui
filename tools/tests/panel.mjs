// <cw-panel>: label and sublabel as text, slotted content, the on state, theme values, parts.
export const demo = 'panel.html';
export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const p = document.querySelector('#plain'), on = document.querySelector('#on'), x = document.querySelector('#xss');
    await Promise.all([p, on, x].map((e) => e.updateComplete));
    const frame = (e) => e.shadowRoot.querySelector('[part=frame]');
    const label = (e) => e.shadowRoot.querySelector('[part=label]');
    const fs = getComputedStyle(frame(p)), fo = getComputedStyle(frame(on));
    const box = p.getBoundingClientRect(), fb = frame(p).getBoundingClientRect();
    return {
      label: label(p).textContent.trim(), sub: p.shadowRoot.querySelector('[part=sublabel]')?.textContent.trim(),
      slotted: p.querySelector('.content').assignedSlot !== null,
      bgPlain: fs.backgroundColor, bgOn: fo.backgroundColor, colorOn: fo.color, radius: fs.borderTopLeftRadius,
      fills: Math.abs(box.width - fb.width) < 1 && Math.abs(box.height - fb.height) < 1,
      xssText: label(x).textContent.trim(), xssEl: !!x.shadowRoot.querySelector('img'),
      noLabel: !document.querySelector('#bare').shadowRoot.querySelector('[part=label]'),
    };
  });
  check(`label shown (${r.label} / ${r.sub})`, r.label === '居間' && r.sub === '22.4 °C');
  check('content goes into the slot', r.slotted);
  check(`tile surface #1D1D1D (${r.bgPlain})`, r.bgPlain === 'rgb(29, 29, 29)');
  check(`on state inverts the face (${r.bgOn}, ${r.colorOn})`, r.bgOn === 'rgba(255, 255, 255, 0.85)' && r.colorOn === 'rgb(18, 18, 18)');
  check(`tile radius 16px (${r.radius})`, r.radius === '16px');
  check('frame fills the host box', r.fills);
  check('label is text, never HTML', r.xssText.includes('<img') && !r.xssEl);
  check('no label row when label is empty', r.noLabel);

  const more = await page.evaluate(async () => {
    const q = (id) => document.getElementById(id);
    await Promise.all(['subx', 'subonly', 'inblock'].map((id) => q(id).updateComplete));
    const sub = q('subx').shadowRoot.querySelector('[part=sublabel]');
    const ib = { height: q('inblock').offsetHeight }, fr = { height: q('inblock').shadowRoot.querySelector('[part=frame]').offsetHeight };
    return {
      subText: sub.textContent.trim(), subEl: !!sub.querySelector('b'),
      onlyRow: !!q('subonly').shadowRoot.querySelector('header [part=sublabel]'),
      block: [Math.round(ib.height), Math.round(fr.height)],
      border: getComputedStyle(q('plain').shadowRoot.querySelector('[part=frame]')).borderTop,
    };
  });
  check('sublabel is text, never HTML', more.subText === '<b>bold</b>' && !more.subEl);
  check('sublabel alone shows the row', more.onlyRow);
  check(`fills a plain block parent (${more.block})`, more.block[0] === 150 && more.block[1] === 150);
  check(`tile border (${more.border})`, more.border === '1px solid rgba(255, 255, 255, 0.06)');

  await page.goto(page.url().split('?')[0] + '?theme=glass', { waitUntil: 'load' });
  const gb = await page.evaluate(async () => {
    const p = document.querySelector('#plain'), on = document.querySelector('#on'); await p.updateComplete; await on.updateComplete;
    return { border: getComputedStyle(p.shadowRoot.querySelector('[part=frame]')).borderTop, on: getComputedStyle(on.shadowRoot.querySelector('[part=frame]')).backgroundColor };
  });
  // Chrome rounds the 0.5px border up to 1px at device pixel ratio 1
  check(`glass border (${gb.border})`, /^(0\.5|1)px solid rgba\(234, 235, 238, 0\.22\)$/.test(gb.border));
  check(`glass on state (${gb.on})`, gb.on === 'rgba(122, 162, 190, 0.22)');
  const g = await page.evaluate(async () => {
    const p = document.querySelector('#plain'); await p.updateComplete;
    const cs = getComputedStyle(p.shadowRoot.querySelector('[part=frame]'));
    return { blur: cs.backdropFilter, radius: cs.borderTopLeftRadius };
  });
  check(`glass frame is frosted (${g.blur}, ${g.radius})`, g.blur.includes('blur(12px)') && g.radius === '20px');
}
