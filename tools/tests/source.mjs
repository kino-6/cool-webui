// <cw-source>: every rule of the notice format, plus SSE and polling against a local server.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
export const demo = 'source.html?still';
// the browser logs the server's 503 while the link is down on purpose
export const allowConsole = /Failed to load resource: (the server responded with a status of 503|net::ERR_CONNECTION_REFUSED)|WebSocket connection to 'ws:\/\/127\.0\.0\.1:\d+\/[a-z]*' failed/;

export async function run(page, check) {
  const ready = () => page.evaluate(() => Promise.all([...document.querySelectorAll('cw-stat,cw-status,cw-log,cw-chart')].map((e) => e.updateComplete)));
  await page.evaluate(() => { window.errs = []; document.addEventListener('cw-source-error', (e) => errs.push(e.detail.code)); });
  const send = async (payload) => { await page.evaluate((p) => document.querySelector('#src').handle(p), payload); await ready(); };
  const val = (sel) => page.evaluate((s) => document.querySelector(s).getAttribute('aria-label'), sel);
  const errs = () => page.evaluate(() => { const e = errs.join(','); errs.length = 0; return e; });

  await send('{"to":"#p50","op":"set","value":2.3}');
  check(`set reaches the element in the same stage only (${await val('#board #p50')} / ${await val('#other #p50')})`, (await val('#board #p50')) === '2 ms' && (await val('#other #p50')) === '5');
  await send('{"to":".lat","op":"set","value":42}');
  check('a selector that hits several sets them all', (await val('#p50')) === '42 ms' && (await val('#p95')) === '42 ms');
  await send('{"to":"#nope","op":"set","value":1}');
  check('no match: no-target', (await errs()) === 'no-target');
  await send('{"to":"#p50","op":"merge","value":1}');
  check('unknown op: bad-op', (await errs()) === 'bad-op');
  await send('{"to":"#p50","op":"set",');
  check('broken JSON: bad-json, and the source keeps working', (await errs()) === 'bad-json');
  await send('{"to":"#p50","op":"set","value":1}\n{"to":"#p50","op":"set","value":2}');
  check('newline-separated JSON is refused as bad-json', (await errs()) === 'bad-json' && (await val('#p50')) === '42 ms');
  await send('{"to":"#bot","op":"set","prop":"since","value":"2026-10-28T19:00:00+09:00"}');
  check('a named value prop is written', await page.evaluate(() => document.querySelector('#bot').since === Date.parse('2026-10-28T19:00:00+09:00')));
  for (const prop of ['innerHTML', 'textContent', 'style', 'label']) {
    await send(JSON.stringify({ to: '#p50', op: 'set', prop, value: '<b>x</b>' }));
    check(`prop ${prop} is refused: bad-prop`, (await errs()) === 'bad-prop');
  }
  check('nothing was injected', await page.evaluate(() => !document.querySelector('#p50').shadowRoot.querySelector('b') && !document.querySelector('#p50').querySelector('b')));
  await send('{"to":"#log","op":"set","value":1}');
  check('set on a push-only element: bad-op', (await errs()) === 'bad-op');
  await send('{"to":"#p50","op":"push","value":1}');
  check('push on a set-only element: bad-op', (await errs()) === 'bad-op');
  await send('[{"to":"#log","op":"push","value":{"time":"1","level":"info","type":"A","text":"one"}},{"to":"#zzz","op":"set","value":0},{"to":"#chart","op":"push","value":{"p50":7}}]');
  const arr = await page.evaluate(() => [document.querySelector('#log').shadowRoot.querySelectorAll('[part=row]').length, document.querySelector('#chart').data.length]);
  check(`an array applies in order and skips only the failed one (${arr}; ${await errs()})`, arr[0] === 1 && arr[1] === 1);
  await send('{"id":9,"to":"#p50","op":"set","value":9}');
  await send('{"id":9,"to":"#p50","op":"set","value":10}');
  check(`a repeated id is dropped (${await val('#p50')})`, (await val('#p50')) === '9 ms');
  const many = await page.evaluate(async () => { const s = document.querySelector('#src'); for (let i = 1000; i < 1600; i++) s.handle({ id: i, to: '#p95', op: 'set', value: 1 }); s.handle({ id: 1000, to: '#p95', op: 'set', value: 77 }); await document.querySelector('#p95').updateComplete; return document.querySelector('#p95').getAttribute('aria-label'); });
  check(`only the last 500 ids are remembered (${many})`, many === '77 ms');

  // postMessage: same origin accepted, other origins dropped silently
  await page.evaluate(() => postMessage('{"to":"#p50","op":"set","value":31}', '*'));
  await new Promise((r) => setTimeout(r, 100)); await ready();
  check(`postMessage from the same origin is applied (${await val('#p50')})`, (await val('#p50')) === '31 ms');
  await page.evaluate(() => { document.querySelector('#src').setAttribute('origin', 'https://example.com'); postMessage('{"to":"#p50","op":"set","value":32}', '*'); });
  await new Promise((r) => setTimeout(r, 100)); await ready();
  check(`other origins are dropped without an error (${await val('#p50')}; ${await errs()})`, (await val('#p50')) === '31 ms');

  // SSE and polling against a local server
  let polls = [], alive = true;
  const server = createServer((req, res) => {
    const h = { 'Access-Control-Allow-Origin': '*' };
    if (!alive) { res.writeHead(503, h); res.end(); return; }
    if (req.url.startsWith('/sse')) {
      res.writeHead(200, { ...h, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write('data: {"to":"#p95","op":"set","value":123}\n\n');
      setTimeout(() => res.end(), 200);
      return;
    }
    polls.push(req.url);
    res.writeHead(200, { ...h, 'Content-Type': 'application/json' });
    res.end(JSON.stringify([{ id: 50 + polls.length, to: '#chart', op: 'push', value: { p50: polls.length } }]));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await page.evaluate((u) => { const s = document.createElement('cw-source'); s.id = 'sse'; s.setAttribute('kind', 'sse'); s.setAttribute('src', u + '/sse'); document.querySelector('#board').append(s); }, base);
    const sse = await page.waitForFunction(() => document.querySelector('#p95').getAttribute('aria-label') === '123 ms', { timeout: 3000 }).then(() => true, () => false);
    check('SSE events are applied', sse);
    await page.evaluate(() => document.querySelector('#sse').remove());
    await page.evaluate((u) => { const s = document.createElement('cw-source'); s.id = 'poll'; s.setAttribute('kind', 'poll'); s.setAttribute('interval', '1'); s.setAttribute('src', u + '/poll'); document.querySelector('#board').append(s); }, base);
    await new Promise((r) => setTimeout(r, 2300));
    check(`polling repeats and sends ?after= the last id (${polls.join(' ')})`, polls.length >= 2 && polls[0] === '/poll' && /after=51/.test(polls[1]));
    alive = false;
    const down = await page.waitForFunction(() => document.querySelector('#board').getAttribute('data-link') === 'down', { timeout: 3000 }).then(() => true, () => false);
    check('a failed fetch marks the stage data-link="down"', down);
    alive = true;
    const up = await page.waitForFunction(() => !document.querySelector('#board').hasAttribute('data-link'), { timeout: 5000 }).then(() => true, () => false);
    check('it reconnects and clears the mark', up);
    await page.evaluate(() => document.querySelector('#poll').remove());
  } finally {
    server.close();
  }

  // T049: every rule in the table, origins, errors, websocket and backoff
  const warns = [];
  page.on('console', (m) => m.type() === 'warn' || m.type() === 'warning' ? warns.push(m.text()) : 0);
  await page.evaluate(() => document.querySelector('#src').removeAttribute('origin'));
  const rule = async (label, payload, probe, want) => {
    await errs();
    await send(JSON.stringify(payload));
    const got = await page.evaluate(probe);
    const e = await errs();
    check(`rule ${label} (${got}${e ? '; ' + e : ''})`, got === want);
  };
  await rule('status defaults to state', { to: '#bot', op: 'set', value: 'standby' }, () => document.querySelector('#bot').state, 'standby');
  await rule('bars defaults to data', { to: '#bars', op: 'set', value: [{ label: 'a', value: 1 }] }, () => document.querySelector('#bars').data.length, 1);
  await rule('chart set replaces data', { to: '#chart', op: 'set', value: [{ p50: 1 }, { p50: 2 }] }, () => document.querySelector('#chart').data.length, 2);
  await rule('bars refuses push', { to: '#bars', op: 'push', value: 1 }, () => document.querySelector('#bars').data.length + ':' + window.errs.join(), '1:bad-op');
  await rule('feed takes push', { to: '#feed', op: 'push', value: { who: 'a', text: 'b' } }, () => document.querySelector('#feed').shadowRoot.querySelectorAll('[part=item]').length, 1);
  await rule('ticker takes push', { to: '#tick', op: 'push', value: 'hello' }, () => document.querySelector('#tick').shadowRoot.querySelector('[part=track]').textContent.trim(), 'hello');
  await rule('push with a prop is bad-op', { to: '#log', op: 'push', prop: 'text', value: {} }, () => window.errs.join(), 'bad-op');
  await rule('an element without values is bad-prop', { to: 'cw-panel', op: 'set', value: 1 }, () => window.errs[0], 'bad-prop');
  await errs();
  await send('{"to":"#p50[","op":"set","value":1}');
  check('broken selector is no-target', (await errs()) === 'no-target');
  const ids = await page.evaluate(async () => {
    const s = document.querySelector('#src');
    for (let i = 1; i <= 499; i++) s.handle({ id: 'k' + i, to: '#p95', op: 'set', value: 1 });
    s.handle({ id: 'k1', to: '#p95', op: 'set', value: 66 });
    await document.querySelector('#p95').updateComplete;
    return document.querySelector('#p95').getAttribute('aria-label');
  });
  check(`ids within 500 are still remembered (${ids})`, ids === '1 ms');
  const detail = await page.evaluate(() => new Promise((r) => {
    const s = document.querySelector('#src');
    s.addEventListener('cw-source-error', (e) => r({ code: e.detail.code, msg: typeof e.detail.message === 'string' && e.detail.message.length > 0, raw: e.detail.raw }), { once: true });
    s.handle('{oops');
  }));
  check(`error detail has code, message and raw (${detail.code})`, detail.code === 'bad-json' && detail.msg && detail.raw === '{oops');
  await errs();
  check(`console.warn repeats each error (${warns.length})`, warns.some((w) => w.includes('bad-json')));

  // origins
  const myOrigin = await page.evaluate(() => new Promise((r) => { addEventListener('message', (e) => r(e.origin), { once: true }); postMessage('x', '*'); }));
  await errs();
  await page.evaluate((o) => { document.querySelector('#src').setAttribute('origin', 'https://x.example ' + o); postMessage('{"to":"#p50","op":"set","value":44}', '*'); }, myOrigin);
  await new Promise((r) => setTimeout(r, 100)); await ready();
  check(`origin list with several entries accepts a listed one (${await val('#p50')})`, (await val('#p50')) === '44 ms');
  await page.evaluate(() => document.querySelector('#src').removeAttribute('origin'));
  await page.evaluate(() => {
    const f = document.createElement('iframe'); f.sandbox = 'allow-scripts'; f.id = 'probe';
    f.srcdoc = '<script>parent.postMessage(JSON.stringify({to:"#p50",op:"set",value:45}), "*")<\/script>';
    document.body.append(f);
  });
  await new Promise((r) => setTimeout(r, 400)); await ready();
  check(`no origin attribute: another origin is dropped (${await val('#p50')})`, (await val('#p50')) === '44 ms' && (await errs()) === '');
  await page.evaluate(() => document.querySelector('#probe').remove());

  // websocket against a tiny local server, then the reconnect wait doubling up to 30 s
  const sockets = new Set();
  const ws = createServer();
  ws.on('upgrade', (req, sock) => {
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const body = Buffer.from('{"to":"#p95","op":"set","value":321}');
    sock.write(Buffer.concat([Buffer.from([0x81, body.length]), body]));
    sockets.add(sock);
    sock.on('error', () => {});
  });
  await new Promise((r) => ws.listen(0, '127.0.0.1', r));
  const wsUrl = `ws://127.0.0.1:${ws.address().port}/live`;
  try {
    await page.evaluate((u) => { const s = document.createElement('cw-source'); s.id = 'ws'; s.setAttribute('src', u); document.querySelector('#board').append(s); }, wsUrl);
    const got = await page.waitForFunction(() => document.querySelector('#p95').getAttribute('aria-label') === '321 ms', { timeout: 3000 }).then(() => true, () => false);
    check('websocket messages are applied (kind defaults to ws)', got);
    await page.evaluate(() => { window.__waits = []; const t = window.setTimeout; window.__t = t; window.setTimeout = (fn, ms, ...a) => { window.__waits.push(ms); return t(fn, ms >= 1000 ? 30 : ms, ...a); }; });
    // the mark comes and goes within 30 ms, so record every change instead of polling for it
    await page.evaluate(() => { const b = document.querySelector('#board'); window.__links = []; new MutationObserver(() => window.__links.push(b.getAttribute('data-link'))).observe(b, { attributeFilter: ['data-link'] }); });
    for (const s of sockets) s.destroy();
    const down = await page.waitForFunction(() => window.__links.includes('down'), { timeout: 3000 }).then(() => true, () => false);
    check('websocket close marks the stage down', down);
    const reup = await page.waitForFunction(() => !document.querySelector('#board').hasAttribute('data-link'), { timeout: 3000 }).then(() => true, () => false);
    check('websocket reconnects and clears the mark', reup);
    await page.evaluate(() => { window.__waits.length = 0; });
    ws.close(); for (const s of sockets) s.destroy();
    await page.waitForFunction(() => window.__waits.filter((w) => w >= 1000).length >= 7, { timeout: 8000 }).catch(() => {});
    const waits = await page.evaluate(() => window.__waits.filter((w) => w >= 1000).slice(0, 7));
    check(`backoff doubles from 1 s and stops at 30 s (${waits})`, waits.join(',') === '1000,2000,4000,8000,16000,30000,30000');
    await page.evaluate(() => { document.querySelector('#ws').remove(); window.setTimeout = window.__t; });
  } finally {
    ws.close();
  }

  // polling interval default and minimum; link mark on the source itself without a stage
  const http = createServer((req, res) => { res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('[]'); });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  const hu = `http://127.0.0.1:${http.address().port}/p`;
  try {
    const iv = await page.evaluate(async (u) => {
      window.__waits = []; const t = window.setTimeout; window.setTimeout = (fn, ms, ...a) => { window.__waits.push(ms); return t(fn, 1e9, ...a); };
      const mk = (attrs) => { const s = document.createElement('cw-source'); for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v); document.querySelector('#board').append(s); return s; };
      const a = mk({ kind: 'poll', src: u }); await new Promise((r) => t(r, 400)); const def = window.__waits.slice(); a.remove();
      window.__waits = [];
      const b = mk({ kind: 'poll', src: u, interval: '0.05' }); await new Promise((r) => t(r, 400)); const min = window.__waits.slice(); b.remove();
      window.setTimeout = t;
      return { def, min };
    }, hu);
    check(`interval defaults to 5 s (${iv.def})`, iv.def.includes(5000));
    check(`interval is at least 1 s (${iv.min})`, iv.min.includes(1000) && !iv.min.some((w) => w < 1000 && w > 0));
    const dead = createServer(); await new Promise((r) => dead.listen(0, '127.0.0.1', r)); const deadUrl = `http://127.0.0.1:${dead.address().port}/x`; await new Promise((r) => dead.close(r));
    const self = await page.evaluate(async (u) => {
      const s = document.createElement('cw-source'); s.setAttribute('kind', 'poll'); s.setAttribute('src', u); document.body.append(s);
      for (let i = 0; i < 30 && !s.hasAttribute('data-link'); i++) await new Promise((r) => setTimeout(r, 100));
      const r = [s.getAttribute('data-link'), document.body.hasAttribute('data-link')]; s.remove(); return r;
    }, deadUrl);
    check(`link mark on itself without a stage (${self})`, self[0] === 'down' && self[1] === false);
  } finally {
    http.close();
  }
}
