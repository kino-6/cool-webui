// Every look in themes/: the same set of values as tile, readable contrast, and the catalog and card open in it.
import { readFileSync, readdirSync } from 'node:fs';
export const demo = 'index.html';

const LOOKS = ['tile', 'glass', 'game', 'mocha', 'latte', 'dracula', 'nord'];
const tokens = (name) => Object.fromEntries([...readFileSync(`themes/${name}.css`, 'utf8').matchAll(/(--cw-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

export async function run(page, check) {
  const files = readdirSync('themes').filter((f) => f.endsWith('.css')).map((f) => f.slice(0, -4)).sort();
  check(`every theme file is a look the pages know (${files})`, files.join() === [...LOOKS].sort().join());
  const base = Object.keys(tokens('tile'));
  const missing = LOOKS.map((l) => [l, base.filter((k) => !(k in tokens(l)))]).filter(([, m]) => m.length);
  check(`every look sets every value tile sets (${missing.map(([l, m]) => `${l}: ${m}`).join('; ')})`, missing.length === 0);
  const credits = ['mocha', 'latte', 'dracula', 'nord'].filter((l) => !/MIT/.test(readFileSync(`themes/${l}.css`, 'utf8').split('\n').slice(0, 3).join(' ')));
  check(`the palette looks credit their MIT palette at the top (${credits})`, credits.length === 0);
  // every look can be picked: a button in the catalog, a name in README's look: line
  const buttons = await page.evaluate(() => [...document.querySelectorAll('button[data-theme]')].map((b) => b.dataset.theme));
  const readme = readFileSync('README.md', 'utf8').split('\n').find((l) => /^look: /.test(l.trim())) ?? '';
  const unpicked = LOOKS.filter((l) => !buttons.includes(l) || !readme.includes(l));
  check(`every look has a catalog button and a name in README's look: line (${unpicked})`, unpicked.length === 0);
  const ui = page.url().split('?')[0];
  for (const look of ['mocha', 'latte', 'dracula', 'nord']) {
    await page.goto(`${ui}?theme=${look}`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 600));
    // contrast by WCAG relative luminance, read from the page's own computed colours
    const r = await page.evaluate(() => {
      const probe = document.createElement('div'); document.body.append(probe);
      const rgb = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number); };
      const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return Math.round(((x + 0.05) / (y + 0.05)) * 10) / 10; };
      const out = { text: ratio('--cw-text', '--cw-surface'), dim: ratio('--cw-text-dim', '--cw-surface'), on: ratio('--cw-text-on', '--cw-surface-on'),
        signal: ratio('--cw-signal', '--cw-surface'), warn: ratio('--cw-warn', '--cw-surface'), ok: ratio('--cw-ok', '--cw-surface'), theme: document.documentElement.dataset.theme };
      probe.remove();
      return out;
    });
    check(`${look}: text 4.5+, dim text 4.5+, text on a lit face 4.5+, accent, warn and ok 3+ against the surface (${JSON.stringify(r)})`,
      r.theme === look && r.text >= 4.5 && r.dim >= 4.5 && r.on >= 4.5 && r.signal >= 3 && r.warn >= 3 && r.ok >= 3);
  }
  const card = await page.evaluate(async () => {
    const out = [];
    for (const look of ['mocha', 'latte', 'dracula', 'nord', 'neon']) {
      const c = document.createElement('cw-ha-card');
      try { c.setConfig({ look, entities: [{ entity: 'sensor.a', kind: 'stat' }] }); out.push('ok'); } catch (e) { out.push(e.message.slice(0, 20)); }
    }
    return out;
  });
  check(`the card takes the four new looks and refuses an unknown one (${card})`, card.slice(0, 4).every((x) => x === 'ok') && card[4] !== 'ok');
}
