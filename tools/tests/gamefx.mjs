// Game look effects: diagonal streaks drifting behind the stage, and a slanted slab sweeping across on a screen switch.
export const demo = 'background.html?theme=game';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// sample a coarse grid of the background canvas: [r,g,b] per point
const sample = (page, id) => page.evaluate((id) => {
  const bg = document.getElementById(id).shadowRoot.querySelector('cw-background');
  const c = bg?.shadowRoot.querySelector('canvas');
  if (!c) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, out = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) {
    const i = (Math.floor((y + 0.5) * c.height / 8) * c.width + Math.floor((x + 0.5) * c.width / 16)) * 4;
    out.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
  }
  return { kind: bg.kind, frames: +bg.dataset.frames, px: out };
}, id);
const diff = (a, b) => a.px.reduce((n, p, i) => n + Math.abs(p[3] - b.px[i][3]) + Math.abs(p[0] - b.px[i][0]), 0);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await wait(600);
  const f1 = await sample(page, 'full');
  const c1 = await sample(page, 'calm');
  check(`game full: the stage makes streaks (${f1?.kind})`, f1?.kind === 'streaks');
  check(`game calm: the theme's streaks too (${c1?.kind})`, c1?.kind === 'streaks');
  // streaks are bands: along a row the alpha rises and falls, and the colour is the amber accent
  // the bands drift, so one fixed row can fall between two of them: use the row with the widest swing
  const rows = [...Array(8)].map((_, y) => f1.px.slice(y * 16, y * 16 + 16).map((p) => p[3]));
  const alphas = rows.reduce((best, r) => (Math.max(...r) - Math.min(...r) > Math.max(...best) - Math.min(...best) ? r : best));
  const lit = f1.px.filter((p) => p[3] > 8);
  const amber = lit.length && lit.every((p) => p[0] >= p[1] && p[1] >= p[2]);
  check(`streaks: bands, not a flat wash (row alpha ${Math.min(...alphas)}..${Math.max(...alphas)})`, Math.max(...alphas) - Math.min(...alphas) >= 10 && Math.min(...alphas) < 40);
  check(`streaks: in the accent colour (${lit.length} lit points, amber ${amber})`, lit.length >= 8 && amber);
  await wait(900);
  const f2 = await sample(page, 'full');
  check(`streaks drift in full (${diff(f1, f2)} change, frames ${f1.frames} -> ${f2.frames})`, diff(f1, f2) > 30 && f2.frames > f1.frames);
  const c2 = await sample(page, 'calm');
  check(`streaks still in calm (${diff(c1, c2)} change, frames ${c1.frames} -> ${c2.frames})`, diff(c1, c2) === 0 && c2.frames === c1.frames && c1.frames >= 1);
  await page.evaluate(async () => { const s = document.getElementById('full'); s.pause(); await s.updateComplete; });
  const p1 = await sample(page, 'full'); await wait(400); const p2 = await sample(page, 'full');
  check(`streaks stop while paused (${p1.frames} -> ${p2.frames})`, p1.frames === p2.frames && diff(p1, p2) === 0);

  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await wait(400);
  check(`tile full keeps the aura (${(await sample(page, 'full'))?.kind})`, (await sample(page, 'full'))?.kind === 'aura');

  const sweep = async (theme) => {
    await page.goto(base.replace('background.html', 'screens.html') + `?theme=${theme}&motion=full`, { waitUntil: 'load' });
    await wait(400);
    return page.evaluate(async () => {
      const sc = document.querySelector('#sc'); await sc.updateComplete;
      const changes = [];
      sc.addEventListener('cw-screen-change', (e) => changes.push([e.detail.to, Math.round(performance.now() - t0)]));
      const t0 = performance.now();
      sc.show('energy');
      const a = sc.shadowRoot.querySelector('.wipe').getAnimations()[0];
      const frames = a?.effect.getKeyframes().map((k) => k.transform).join(' | ') ?? '';
      await new Promise((r) => setTimeout(r, 900));
      return { frames, changes, current: sc.current };
    });
  };
  const g = await sweep('game');
  check(`game: the switch is a slanted slab sweeping across (${g.frames})`, /skewX/.test(g.frames) && /translateX\(-/.test(g.frames) && !/scale/.test(g.frames));
  check(`game: screens swap under the slab (${JSON.stringify(g.changes)})`, g.current === 'energy' && g.changes.length === 1 && g.changes[0][1] >= 250);
  const t = await sweep('tile');
  check(`tile keeps the round wipe (${t.frames})`, /scale/.test(t.frames) && !/skewX/.test(t.frames));
}
