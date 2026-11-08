// A feed of this machine's own numbers for demo/machine.html, as <cw-source> notices over SSE.
//   node tools/machine-feed.mjs [port]   then open http://127.0.0.1:8787/demo/machine.html
// Every 2 s: load, memory, the busiest processes, this repository's commits, the last full gate, the queue's open
// rows and the Mac's battery (from pmset, when there is one). CW_GATE_LOG and CW_TASKS point at other files (tests).
//
// It is for this machine only: it listens on 127.0.0.1, answers GET only, and only to a Host of 127.0.0.1 or
// localhost (so a page on another site that points its own name here cannot read it). Besides /events it serves the
// files of demo/, dist/ and themes/ only, checked where they really are after following links.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import { cpus, freemem, loadavg, totalmem, uptime } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const ROOT = resolve('.');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8787);
const SERVED = ['demo', 'dist', 'themes'];
const GATE_LOG = process.env.CW_GATE_LOG ?? join(ROOT, '.git/cw_full_gate.log');
const TASKS = process.env.CW_TASKS ?? join(ROOT, 'Tasks.md');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const run = (cmd, args) => new Promise((ok) => execFile(cmd, args, { timeout: 5000 }, (err, out) => ok(err ? '' : out)));

/** One round of notices for one connection; seen holds the commits that connection already has. */
async function notices(seen, next) {
  const [ps, git, gate, queue, batt] = await Promise.all([
    run('ps', ['-Ao', 'pcpu=,comm=', '-r']),
    run('git', ['log', '--format=%h%x09%cI%x09%s', '-n', '12']),
    readFile(GATE_LOG, 'utf8').catch(() => ''),
    readFile(TASKS, 'utf8').catch(() => ''),
    run('pmset', ['-g', 'batt']),
  ]);
  const [l1] = loadavg(), cores = cpus().length, mem = (1 - freemem() / totalmem()) * 100;
  // the busiest processes, by the last part of their path
  const top = ps.trim().split('\n').slice(0, 5).map((line) => {
    const m = /^\s*([\d.]+)\s+(.*)$/.exec(line);
    return m && { label: m[2].split('/').pop().slice(0, 24), value: Number(m[1]) };
  }).filter(Boolean);
  // commits this connection has not had yet go to the log, oldest first
  const commits = git.trim().split('\n').filter(Boolean).map((l) => l.split('\t')).reverse();
  const fresh = commits.filter(([h]) => !seen.has(h));
  for (const [h] of commits) seen.add(h);
  // the full gate's last lines: "took 123s" and "FULL_GATE OK" / "FULL_GATE FAIL ..."
  const took = /^took (\d+)s$/m.exec(gate)?.[1], verdict = /^FULL_GATE (OK|FAIL)/m.exec(gate)?.[1];
  const open = [...queue.matchAll(/^- \[(-| )\] \*\*(T\d+) — ([^*]+)\*\*/gm)].map((m) => ({ uid: m[2], summary: `${m[2]} ${m[3]}`, status: 'needs_action' }));
  const pct = /(\d+)%;\s*([^;]+);/.exec(batt);
  const out = [
    { to: '#load', op: 'set', value: Number(l1.toFixed(2)) },
    { to: '#load-chart', op: 'push', value: { 負荷: Number(l1.toFixed(2)), コア数: cores } },
    { to: '#memory', op: 'set', value: Number(mem.toFixed(1)) },
    { to: '#top', op: 'set', value: top },
    { to: '#uptime', op: 'set', value: Number((uptime() / 3600).toFixed(1)) },
    { to: '#gate', op: 'set', value: !verdict ? 'unknown' : verdict === 'OK' ? 'online' : 'offline' },
    { to: '#gate', op: 'set', prop: 'text', value: !verdict ? '記録なし' : verdict === 'OK' ? '通過' : '失敗' },
    { to: '#queue', op: 'set', value: open },
    ...fresh.map(([h, when, subject]) => ({ to: '#commits', op: 'push', value: { time: new Date(when).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), level: 'info', type: h, text: subject } })),
  ];
  if (took) out.push({ to: '#gate-took', op: 'set', value: Number(took) });
  if (pct) out.push({ to: '#battery', op: 'set', value: [{ name: 'この Mac', level: Number(pct[1]), charging: /^charging/.test(pct[2].trim()) }] });
  return out.map((n) => ({ id: next(), ...n }));
}

/** The file a request may read, or null: under demo/, dist/ or themes/, really there after links, no dot names. */
async function servable(pathname) {
  let parts;
  try { parts = decodeURIComponent(pathname).split('/').filter(Boolean); } catch { return null; }
  if (!parts.length || !SERVED.includes(parts[0]) || parts.some((p) => p.startsWith('.') || p.includes('\\'))) return null;
  try {
    const real = await realpath(join(ROOT, ...parts)), base = await realpath(join(ROOT, parts[0]));
    return real.startsWith(base + sep) ? real : null;
  } catch { return null; }
}

let id = 0;
const server = createServer(async (req, res) => {
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  const host = (req.headers.host ?? '').replace(/:\d+$/, '');
  if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403).end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    const seen = new Set();
    const send = async () => { const body = await notices(seen, () => ++id); if (!res.writableEnded) res.write(`data: ${JSON.stringify(body)}\n\n`); };
    send();
    const timer = setInterval(send, 2000);
    req.on('close', () => clearInterval(timer));
    return;
  }
  // a broken %-escape is a bad request, not a crash
  try { decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }
  const path = await servable(url.pathname);
  if (!path) { res.writeHead(404).end(); return; }
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
server.listen(PORT, '127.0.0.1', () => {
  const a = server.address();
  console.log(`machine feed on ${a.address}: http://127.0.0.1:${a.port}/demo/machine.html`);
});
