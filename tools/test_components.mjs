// Open each component's demo page in headless Chrome and run its checks.
//   node tools/test_components.mjs base stat     run named suites (tools/tests/<name>.mjs)
//   node tools/test_components.mjs all           run every suite except self-tests
//   CW_FAKE_TIME=23:50 node tools/test_components.mjs agenda   run with the page clock moved to 23:50 today
//   CW_GATE_CACHE=<dir>   (set by tools/full_gate.py) a suite already run in this full gate with the same file, clock
//                         and time zone, on the same bundles and pages, prints its saved lines instead of running again
//   CW_JOBS=4             how many suites run at once (default 4)
// A suite exports demo (the page), run(page, check), and optionally allowConsole (a RegExp of console errors to
// let through) and virtualTime (true: the page's clock moves only by page.wait(ms) / window.__wait(ms), at once;
// a page timer awaited any other way, even setTimeout(f, 0), waits for ever).
// A suite fails on any failed check, any uncaught page error, or any console error.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let names = process.argv.slice(2);
if (names.length === 0 || names.includes('all')) {
  names = readdirSync('tools/tests').filter((f) => f.endsWith('.mjs') && !f.startsWith('selftest')).map((f) => f.slice(0, -4));
}

// the cache key covers the suite, the clock, the time zone and everything a page loads (bundles, pages, themes, images)
const tree = process.env.CW_GATE_CACHE && (() => {
  const h = createHash('sha1');
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).forEach((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p); else h.update(p).update(readFileSync(p));
  });
  ['dist', 'demo', 'themes'].forEach(walk);
  return h.digest('hex');
})();
const saved = (name) => tree && resolve(process.env.CW_GATE_CACHE, createHash('sha1')
  .update([name, readFileSync(resolve('tools/tests', name + '.mjs')), process.env.TZ ?? '', process.env.CW_FAKE_TIME ?? '', tree].join('\0')).digest('hex'));

// suites run side by side, each in its own browser context; their lines are printed in the order they were named
const JOBS = Math.max(1, Number(process.env.CW_JOBS) || 4);
let browser;
const launch = () => (browser ??= puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] }));

async function runSuite(name) {
  const file = saved(name);
  try { if (file) return readFileSync(file, 'utf8').split('\n').filter(Boolean); } catch {}
  const lines = [];
  const check = (label, ok) => lines.push(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${label}`);
  const suite = await import(pathToFileURL(resolve('tools/tests', name + '.mjs')));
  const context = await (await launch()).createBrowserContext();
  const page = await context.newPage();
  // CW_FAKE_TIME=23:50 moves the page's clock to that local time today, to try the edges of the day
  if (process.env.CW_FAKE_TIME) {
    const [h, m] = process.env.CW_FAKE_TIME.split(':').map(Number);
    const at = new Date(); at.setHours(h, m, 0, 0);
    await page.evaluateOnNewDocument((shift) => {
      const Real = Date;
      // eslint-disable-next-line no-global-assign
      Date = class extends Real {
        constructor(...a) { super(...(a.length ? a : [Real.now() + shift])); }
        static now() { return Real.now() + shift; }
      };
    }, at.getTime() - Date.now());
  }
  await page.setViewport({ width: 1280, height: 800 });
  // suites run side by side, and only one page can hold the focus: each page acts as if it had it
  await (await page.createCDPSession()).send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !suite.allowConsole?.test(m.text()) && errors.push('console: ' + m.text()));
  try {
    const [demo, query] = suite.demo.split('?');
    await page.goto(pathToFileURL(resolve('demo', demo)).href + (query ? '?' + query : ''), { waitUntil: 'load' });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    // a suite that exports virtualTime runs on Chrome's virtual clock: the page's timers, Date, performance.now and
    // animations stand still until page.wait(ms) (or window.__wait(ms) in the page) moves them on, at once
    if (suite.virtualTime) {
      const cdp = await page.createCDPSession();
      page.wait = async (ms) => {
        const done = new Promise((r) => cdp.once('Emulation.virtualTimeBudgetExpired', r));
        await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: ms });
        await done;
      };
      await page.exposeFunction('__wait', page.wait);
      await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
      // a page loads with its clock moved on 1 ms at a time, so loading takes no more page time than real time
      const settle = async (work) => {
        let done = false;
        const p = work.finally(() => { done = true; });
        while (!done) await page.wait(1);
        return p;
      };
      const go = page.goto.bind(page);
      page.goto = async (...a) => {
        const res = await settle(go(...a));
        await settle(page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
        return res;
      };
    } else {
      page.wait = (ms) => new Promise((r) => setTimeout(r, ms));
    }
    await suite.run(page, check);
  } catch (e) {
    check('suite threw: ' + e.message, false);
  }
  check('no page or console errors' + (errors.length ? ' (' + errors.join(' | ') + ')' : ''), errors.length === 0);
  await context.close();
  // CW_CACHE_PASS_ONLY (the full gate's warm-up): a failed suite is not kept, so the row that names it runs it itself
  if (file && !(process.env.CW_CACHE_PASS_ONLY && lines.some((l) => l.startsWith('FAIL')))) { writeFileSync(file + '.tmp', lines.join('\n') + '\n'); renameSync(file + '.tmp', file); }
  return lines;
}

const results = names.map(() => null);
let next = 0, shown = 0, failed = 0;
const show = () => {
  for (; shown < names.length && results[shown]; shown++) {
    for (const line of results[shown]) console.log(line);
    failed += results[shown].filter((l) => l.startsWith('FAIL')).length;
  }
};
await Promise.all(Array.from({ length: Math.min(JOBS, names.length) }, async () => {
  while (next < names.length) {
    const i = next++;
    results[i] = await runSuite(names[i]);
    show();
  }
}));
await (await browser)?.close();
console.log(failed ? `COMPONENTS FAIL (${failed})` : 'COMPONENTS OK');
process.exit(failed ? 1 : 0);
