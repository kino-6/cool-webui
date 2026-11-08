// demo/machine.html: this machine's real numbers reach the parts through <cw-source> from tools/machine-feed.mjs alone.
import { spawn, execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { readFileSync, symlinkSync, unlinkSync } from 'node:fs';
import { freemem, totalmem } from 'node:os';
export const demo = 'blank.html';

export async function run(page, check) {
  const feed = spawn(process.execPath, ['tools/machine-feed.mjs', '0'], { stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    const url = await new Promise((ok, fail) => { feed.stdout.on('data', (d) => { const m = /(http:\S+)/.exec(String(d)); if (m) ok(m[1]); }); setTimeout(() => fail(new Error('no feed')), 5000); });
    const base = url.replace('/demo/machine.html', '');
    check(`the feed listens on 127.0.0.1 only (${url})`, url.startsWith('http://127.0.0.1:'));
    const answers = await Promise.all([['POST', '/events'], ['GET', '/.git/config'], ['GET', '/../../etc/passwd'], ['GET', '/%2e%2e/%2e%2e/etc/passwd']].map(([method, path]) => fetch(base + path, { method }).then((r) => r.status)));
    check(`it answers GET only and nothing under .git or outside the repository (${answers})`, answers.join() === '405,404,404,404');
    await page.goto(url, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 5200));
    const r = await page.evaluate(async () => {
      const $ = (id) => document.getElementById(id);
      await Promise.all(['load', 'memory', 'top', 'commits', 'gate', 'queue', 'battery', 'load-chart'].map((id) => $(id).updateComplete));
      return { load: $('load').value, memory: $('memory').value, top: $('top').data.length, commits: [...$('commits').shadowRoot.querySelectorAll('[part=row]')].length,
        gate: $('gate').text, queue: $('queue').items.length, battery: $('battery').items.length, chart: $('load-chart').data.length, link: document.querySelector('cw-stage').getAttribute('data-link') };
    });
    const open = [...readFileSync('Tasks.md', 'utf8').matchAll(/^- \[(-| )\] \*\*T\d+/gm)].length;
    const commits = Math.min(12, Number(execFileSync('git', ['rev-list', '--count', 'HEAD']).toString().trim()));
    const pmset = (() => { try { return /\d+%/.test(execFileSync('pmset', ['-g', 'batt']).toString()); } catch { return false; } })();
    check(`the load is a number above 0 (${r.load})`, Number.isFinite(r.load) && r.load > 0);
    check(`memory in use is a percent (${r.memory})`, r.memory > 0 && r.memory <= 100);
    check(`the busiest processes are listed (${r.top})`, r.top >= 3 && r.top <= 5);
    check(`this repository's latest commits are in the log (${r.commits} of ${commits})`, r.commits === commits);
    check(`the last full gate is read (${r.gate})`, ['通過', '失敗', '記録なし'].includes(r.gate));
    check(`the queue's open rows are the to-do items (${r.queue} of ${open})`, r.queue === open);
    check(`the Mac's battery when pmset has one (${r.battery}, ${pmset})`, r.battery === (pmset ? 1 : 0));
    check(`the load chart gets a point every round (${r.chart})`, r.chart >= 2);
    check(`the page is connected (${r.link})`, r.link !== 'down');
    // holes found by the audit of T121
    const said = await new Promise((ok) => { const f2 = spawn(process.execPath, ['tools/machine-feed.mjs', '0'], { stdio: ['ignore', 'pipe', 'inherit'] }); f2.stdout.on('data', (d) => { ok(String(d)); f2.kill(); }); });
    check(`holes: the feed reports the address it really listens on (${said.trim()})`, /on 127\.0\.0\.1:/.test(said));
    try { symlinkSync('/etc', 'demo/_outside'); } catch {}
    const get = (path, headers = {}) => fetch(base + path, { headers }).then((x) => x.status).catch(() => 'down');
    const codes = [];
    for (const p of ['/.GIT/config', '/.Git/HEAD', '/Tasks.md', '/.env', '/demo/_outside/hosts', '/..%2f..%2fetc%2fpasswd', '/demo/..%2f.git%2fconfig']) codes.push(await get(p));
    try { unlinkSync('demo/_outside'); } catch {}
    check(`holes: .git in any case, files outside demo/dist/themes, links leading out and escapes are not served (${codes})`, codes.every((c) => c === 404));
    const bad = await get('/%E0%A4%A'), after = await get('/demo/machine.html');
    check(`holes: a broken %-escape is a bad request and the feed stays up (${bad}, ${after})`, bad === 400 && after === 200);
    // fetch cannot set Host, so these go through node:http
    const asHost = (path, host) => new Promise((ok) => { const u = new URL(base + path); const rq = request({ host: '127.0.0.1', port: u.port, path, headers: { host } }, (rs) => { ok(rs.statusCode); rs.destroy(); }); rq.on('error', () => ok('down')); rq.end(); });
    const evil = [await asHost('/events', 'evil.example'), await asHost('/demo/machine.html', 'evil.example:8787'), await asHost('/demo/machine.html', 'localhost')];
    check(`holes: another host name is refused, localhost is not (${evil})`, evil.join() === '403,403,200');
    const shape = await page.evaluate(() => { const d = document.getElementById('load-chart').data, last = d.at(-1); return [Object.keys(last).sort().join(), Object.values(last).every(Number.isFinite)]; });
    check(`holes: each chart point has a number for 負荷 and コア数 (${shape})`, shape[0] === 'コア数,負荷' && shape[1]);
    const mem = await page.evaluate(() => document.getElementById('memory').value), want = (1 - freemem() / totalmem()) * 100;
    check(`holes: memory in use is used, not free, within 8 points (${mem} vs ${want.toFixed(1)})`, Math.abs(mem - want) < 8);
    const batt = await page.evaluate(() => document.getElementById('battery').items[0] ?? null);
    const pm = (() => { try { return execFileSync('pmset', ['-g', 'batt']).toString(); } catch { return ''; } })(), m = /(\d+)%;\s*([^;]+);/.exec(pm);
    check(`holes: the battery's level and charging match pmset (${JSON.stringify(batt)})`, m ? batt.level === Number(m[1]) && batt.charging === /^charging/.test(m[2].trim()) : batt === null);
    // fixed files for the full gate's log and the queue
    const fx = spawn(process.execPath, ['tools/machine-feed.mjs', '0'], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, CW_GATE_LOG: 'tools/tests/fixtures/gate_fail.log', CW_TASKS: 'tools/tests/fixtures/tasks_two.md' } });
    try {
      const fxUrl = await new Promise((ok) => fx.stdout.on('data', (d) => { const mm = /(http:\S+)/.exec(String(d)); if (mm) ok(mm[1]); }));
      await page.goto(fxUrl, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 2600));
      const f = await page.evaluate(async () => ({ text: document.getElementById('gate').text, state: document.getElementById('gate').state, took: document.getElementById('gate-took').value, queue: document.getElementById('queue').items.map((x) => x.uid).join() }));
      check(`holes: a failed full gate reads 失敗, offline, with its seconds (${JSON.stringify(f)})`, f.text === '失敗' && f.state === 'offline' && f.took === 42);
      check(`holes: the queue's open rows, not the done one (${f.queue})`, f.queue === 'T900,T901');
      // two connections at once each get the whole commit log
      const firstEvent = (u) => fetch(u).then(async (resp) => { const rd = resp.body.getReader(); let txt = ''; while (!txt.includes('\n\n')) txt += new TextDecoder().decode((await rd.read()).value); rd.cancel(); return JSON.parse(txt.slice(6, txt.indexOf('\n\n'))).filter((x) => x.to === '#commits').length; });
      const evUrl = fxUrl.replace('/demo/machine.html', '/events');
      const both = await Promise.all([firstEvent(evUrl), firstEvent(evUrl)]);
      check(`holes: two pages at once each get the commits (${both})`, both[0] === commits && both[1] === commits);
    } finally { fx.kill(); }
  } finally {
    feed.kill();
  }
}
