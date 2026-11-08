// The game look (themes/game.css): tilted frames with a hard shadow, a skewed label slab, wide heavy numbers.
// Tile and glass must stay flat.
export const demo = 'panel.html?theme=game';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
// rotation and skew from a computed transform matrix(a, b, c, d, e, f)
const matrix = (t) => (t === 'none' ? [1, 0, 0, 1] : t.slice(7, -1).split(',').map(Number));

const look = (page) => page.evaluate(async () => {
  const p = document.querySelector('#plain'), on = document.querySelector('#on'), sub = document.querySelector('#subonly');
  await Promise.all([p.updateComplete, on.updateComplete, sub.updateComplete]);
  const frame = getComputedStyle(p.shadowRoot.querySelector('[part=frame]'));
  const label = getComputedStyle(p.shadowRoot.querySelector('[part=label]'));
  const onLabel = getComputedStyle(on.shadowRoot.querySelector('[part=label]'));
  const empty = sub.shadowRoot.querySelector('[part=label]');
  return { frame: frame.transform, rotate: frame.rotate, shadow: frame.boxShadow, radius: frame.borderTopLeftRadius,
    labelBg: label.backgroundColor, labelColor: label.color, labelT: label.transform, labelFont: label.fontFamily,
    labelPad: label.padding, labelWeight: label.fontWeight,
    onBg: getComputedStyle(on.shadowRoot.querySelector('[part=frame]')).backgroundColor, onLabelBg: onLabel.backgroundColor, onLabelColor: onLabel.color,
    emptyW: empty ? empty.getBoundingClientRect().width : 0 };
});
// the numbers part of values.html
const numbers = (page) => page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('cw-stat').shadowRoot.querySelector('[part=value]'));
  const c = getComputedStyle(document.querySelector('cw-clock').shadowRoot.querySelector('[part=value]'));
  return { font: s.fontFamily, weight: +s.fontWeight, stretch: s.fontStretch, clock: c.fontFamily, clockW: +c.fontWeight, clockS: c.fontStretch };
});

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(300);
  const g = await look(page);
  const tilt = parseFloat(g.rotate) || 0;
  check(`the frame is tilted by a small angle (${tilt.toFixed(2)}°)`, Math.abs(tilt) >= 0.4 && Math.abs(tilt) <= 3);
  const len = g.shadow.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat);
  check(`shadow has no blur (${g.shadow})`, len.length >= 3 && len[0] > 0 && len[1] > 0 && len[2] === 0);
  check(`square corners (${g.radius})`, parseFloat(g.radius) <= 4);
  const [, , c] = matrix(g.labelT);
  check(`label is a skewed slab in the accent (${g.labelBg}, skew ${c.toFixed(2)})`, g.labelBg === 'rgb(255, 194, 26)' && Math.abs(c) > 0.05 && g.labelColor !== g.labelBg);
  check(`label uses the wide display face (${g.labelFont})`, /^Archivo/.test(g.labelFont));
  check(`label text colour is the dark slab text (${g.labelColor})`, g.labelColor === 'rgb(20, 15, 4)');
  check(`a lit panel is a solid accent slab (${g.onBg})`, g.onBg === 'rgb(255, 194, 26)');
  check(`lit panel label stands out from its panel (${g.onLabelBg} on ${g.onBg}, text ${g.onLabelColor})`, g.onLabelBg !== g.onBg && g.onLabelBg !== 'rgba(0, 0, 0, 0)' && g.onLabelColor !== g.onLabelBg);
  check(`empty label shows no slab (${g.emptyW}px)`, g.emptyW === 0);
  const banned = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement), probe = document.body.appendChild(document.createElement('i'));
    const hits = [];
    for (const sheet of document.styleSheets) for (const rule of sheet.cssRules ?? []) for (const name of rule.style ?? []) {
      if (!name.startsWith('--cw-')) continue;
      for (const part of css.getPropertyValue(name).match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi) ?? []) {
        probe.style.color = ''; probe.style.color = part;
        const rgb = getComputedStyle(probe).color.match(/\d+/g).slice(0, 3).join(',');
        if (['159,227,201', '95,202,165', '232,67,58'].includes(rgb)) hits.push(`${name} ${part}`);
      }
    }
    probe.remove();
    return hits;
  });
  check(`no banned colour in any token (${banned})`, banned.length === 0);

  for (const theme of ['tile', 'glass']) {
    await page.goto(`${base}?theme=${theme}`, { waitUntil: 'load' });
    await page.wait(300);
    const t = await look(page);
    const [, , tc] = matrix(t.labelT);
    check(`${theme} keeps its panel: flat, no shadow, plain label (${t.frame} ${t.rotate}, ${t.shadow}, ${t.labelBg}, ${t.labelT}, pad ${t.labelPad}, weight ${t.labelWeight}, ${t.labelFont})`,
      t.frame === 'none' && t.rotate === 'none' && t.labelT === 'none' && t.shadow === 'none' && t.labelBg === 'rgba(0, 0, 0, 0)' && tc === 0
      && t.labelPad === '0px' && t.labelWeight === '500' && !/Archivo/.test(t.labelFont));
    await page.goto(base.replace('panel.html', 'values.html') + `?theme=${theme}`, { waitUntil: 'load' });
    await page.wait(300);
    const n = await numbers(page);
    check(`${theme} numbers unchanged (${n.font} ${n.weight} ${n.stretch}; clock ${n.clockW} ${n.clockS})`,
      !/Archivo/.test(n.font) && n.weight === 500 && n.stretch === '100%' && n.clockW === 500 && n.clockS === '100%');
  }

  await page.goto(base.replace('panel.html', 'values.html') + '?theme=game', { waitUntil: 'load' });
  await page.wait(500);
  const v = await numbers(page);
  check(`numbers are wide and heavy (${v.font} ${v.weight} ${v.stretch}; clock ${v.clock} ${v.clockW})`,
    /^Archivo/.test(v.font) && v.weight >= 800 && parseFloat(v.stretch) > 100);
  check(`clock is wide and heavy too (${v.clock} ${v.clockW} ${v.clockS})`, /^Archivo/.test(v.clock) && v.clockW >= 800 && parseFloat(v.clockS) > 100);
}
