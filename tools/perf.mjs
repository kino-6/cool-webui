// Measure the cost of demo/home.html in four scenes: main-thread CPU share and the 95th percentile of frame intervals.
//   node tools/perf.mjs --seconds 30 --out docs/perf/2026-10-30.md
// No pass/fail lines yet (components.md); it only checks that calm and off cost less than full.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const seconds = Number(arg('seconds', 30));
const out = arg('out', '/dev/null');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const scenes = [['full', 'motion=full'], ['calm', 'motion=calm'], ['off', 'motion=off'], ['bg=none', 'motion=full&bg=none']];
const base = pathToFileURL(resolve('demo/home.html')).href + '?theme=tile&';

// each scene in a Chrome of its own, all at once: a page behind another tab would stop drawing, and
// TaskDuration is counted per page, so each keeps its own share
const rows = await Promise.all(scenes.map(async ([name, query]) => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto(base + query, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    window.__gaps = [];
    let last = performance.now();
    const loop = (t) => { window.__gaps.push(t - last); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const m0 = await page.metrics();
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const m1 = await page.metrics();
  const wall = (Date.now() - t0) / 1000;
  const r = await page.evaluate(() => {
    const g = window.__gaps.slice(1).sort((a, b) => a - b);
    const bg = document.querySelector('cw-stage').shadowRoot.querySelector('cw-background');
    return { p95: g[Math.floor(g.length * 0.95)] ?? 0, aura: bg ? +bg.dataset.frames : 0 };
  });
  await browser.close();
  return { name, cpu: ((m1.TaskDuration - m0.TaskDuration) / wall) * 100, p95: r.p95, aura: r.aura };
}));

const date = new Date().toLocaleDateString('sv-SE');
const md = `# 負荷の測定 ${date}

demo/home.html（タイル）を headless Chrome、1600×900 で、場面ごとに別の Chrome で同時に ${seconds} 秒開いた。
CPU はメインスレッドの作業時間の割合（Chrome DevTools Protocol の TaskDuration の差 ÷ 経過時間）。
1 コマの時間は requestAnimationFrame の間隔の 95 パーセンタイル。背景の描画数は aura が描いた回数。
headless なので GPU の負荷は入っていない。合否の線はまだ置かない（components.md の「負荷を測る手順」）。

| 場面 | CPU % | 1 コマ p95 ms | 背景の描画数 |
|---|---|---|---|
${rows.map((r) => `| ${r.name} | ${r.cpu.toFixed(1)} | ${r.p95.toFixed(1)} | ${r.aura} |`).join('\n')}
`;
writeFileSync(out, md);
for (const r of rows) console.log(`${r.name.padEnd(8)} cpu ${r.cpu.toFixed(1)}%  frame p95 ${r.p95.toFixed(1)} ms  aura ${r.aura}`);
const by = Object.fromEntries(rows.map((r) => [r.name, r]));
const ok = by.calm.cpu < by.full.cpu && by.off.cpu < by.full.cpu && by['bg=none'].aura === 0 && by.calm.aura === 0 && by.full.aura > 0;
console.log(ok ? 'PERF OK' : 'PERF FAIL (calm/off must cost less than full; aura only in full with a ground)');
process.exit(ok ? 0 : 1);
