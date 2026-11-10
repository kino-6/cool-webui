// The bold looks: each changes more than colours. Panel frames (brackets, scan lines, pixel borders, thick outlines,
// glow), the moving background each one names, and a lit panel's name staying readable.
export const demo = 'index.html';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const LOOKS = {
  hud: { kind: 'grid', frame: (f) => /linear-gradient/.test(f.overlay) && !/repeating/.test(f.overlay) && f.glow && f.radius === '0px' },
  crt: { kind: 'scan', frame: (f) => /repeating-linear-gradient/.test(f.overlay) && f.glow && /VT323/.test(f.display) },
  pixel: { kind: 'stars', frame: (f) => f.shadows >= 5 && f.borderWidth === '0px' && f.radius === '0px' && /DotGothic16/.test(f.display) },
  brutal: { kind: '', frame: (f) => f.borderWidth === '3px' && /6px 6px 0px/.test(f.shadow) && f.light },
  synthwave: { kind: 'horizon', frame: (f) => f.glow && f.radius === '10px' },
};

export async function run(page, check) {
  const ui = page.url().split('?')[0];
  const plain = await page.evaluate(async () => {
    const p = document.querySelector('cw-panel'); await p.updateComplete;
    const f = p.shadowRoot.querySelector('[part=frame]');
    return { glow: getComputedStyle(f).textShadow, overlay: getComputedStyle(f, '::after').backgroundImage };
  });
  check(`tile: no glow and nothing over the frame (${plain.glow}, ${plain.overlay})`, plain.glow === 'none' && plain.overlay === 'none');

  for (const [look, want] of Object.entries(LOOKS)) {
    await page.goto(`${ui}?theme=${look}&motion=full`, { waitUntil: 'load' });
    await wait(500);
    const f = await page.evaluate(async () => {
      const p = document.querySelector('cw-panel'); await p.updateComplete;
      const fr = p.shadowRoot.querySelector('[part=frame]'), cs = getComputedStyle(fr);
      const ground = getComputedStyle(document.documentElement).backgroundColor.match(/[\d.]+/g).map(Number);
      return {
        overlay: getComputedStyle(fr, '::after').backgroundImage, glow: cs.textShadow !== 'none', radius: cs.borderTopLeftRadius,
        borderWidth: cs.borderTopWidth, shadow: cs.boxShadow, shadows: cs.boxShadow === 'none' ? 0 : cs.boxShadow.split(/,(?![^(]*\))/).length,
        display: getComputedStyle(document.documentElement).getPropertyValue('--cw-display-font'),
        light: ground[0] + ground[1] + ground[2] > 600,
      };
    });
    check(`${look}: the frame has its own shape (${JSON.stringify(f)})`, want.frame(f));

    // the stage makes the look's background and it keeps drawing in full motion, in the look's accent
    const bg = await page.evaluate(async () => {
      const st = document.querySelector('article[data-tag=cw-stage] cw-stage'); await st.updateComplete;
      const b = st.shadowRoot.querySelector('cw-background');
      if (!b) return { kind: '' };
      const f0 = +b.dataset.frames; await new Promise((r) => setTimeout(r, 700));
      const c = b.shadowRoot.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0, top = 0, bottom = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) { lit++; if (((i - 3) / 4) / c.width < c.height * 0.25) top++; else if (((i - 3) / 4) / c.width > c.height * 0.75) bottom++; }
      return { kind: b.kind, frames: +b.dataset.frames - f0, lit: Math.round((lit / (d.length / 4)) * 100), top, bottom };
    });
    if (want.kind) {
      check(`${look}: the stage draws a ${want.kind} background and keeps moving (${JSON.stringify(bg)})`, bg.kind === want.kind && bg.frames >= 3 && bg.lit >= 1);
    } else {
      check(`${look}: no background of its own; full motion falls back to the aura (${bg.kind})`, bg.kind === 'aura');
    }
    if (look === 'horizon' || want.kind === 'horizon') check(`${look}: the floor grid is below the horizon (top ${bg.top}, bottom ${bg.bottom})`, bg.bottom > bg.top * 3);

    // a lit panel's name: the colour against what is behind it
    const on = await page.evaluate(async () => {
      const p = [...document.querySelectorAll('cw-panel[on]')].find((x) => x.label); await p.updateComplete;
      const l = p.shadowRoot.querySelector('[part=label]'), fr = p.shadowRoot.querySelector('[part=frame]');
      const rgb = (s) => s.match(/[\d.]+/g).map(Number);
      const lum = ([r, g, b]) => { const k = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * k(r) + 0.7152 * k(g) + 0.0722 * k(b); };
      const back = rgb(getComputedStyle(l).backgroundColor);
      const behind = back.length === 4 && back[3] === 0 ? rgb(getComputedStyle(fr).backgroundColor) : back;
      const [a, b] = [lum(rgb(getComputedStyle(l).color)), lum(behind)].sort((x, y) => y - x);
      return Math.round(((a + 0.05) / (b + 0.05)) * 10) / 10;
    });
    check(`${look}: a lit panel's name stays readable (contrast ${on})`, on >= 4.5);
  }

  // calm: the moving backgrounds draw once and stop
  await page.goto(`${ui}?theme=hud&motion=calm`, { waitUntil: 'load' });
  await wait(400);
  const calm = await page.evaluate(async () => {
    const b = document.getElementById('bg'); const f0 = +b.dataset.frames; await new Promise((r) => setTimeout(r, 600));
    return [b.kind, f0, +b.dataset.frames];
  });
  check(`calm: the catalog's own background takes the look's kind, draws once and stops (${calm})`, calm[0] === 'grid' && calm[1] >= 1 && calm[2] === calm[1]);
}
