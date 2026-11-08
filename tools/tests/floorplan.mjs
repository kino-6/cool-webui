// <cw-floorplan>: lit floors and glows, the focus outline, motion levels, pause and resume, room events, people.
export const demo = 'floorplan.html?motion=full';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function run(page, check) {
  const P = (fn, ...a) => page.evaluate(fn, ...a);
  await P(() => document.getElementById('plan').updateComplete);
  await wait(200);
  const look = await P(() => {
    const sr = document.getElementById('plan').shadowRoot;
    const floor = (id) => getComputedStyle(sr.querySelector(`[part=room][data-room=${id}] .floor`)).fill;
    const glow = (id) => +getComputedStyle(sr.querySelector(`.glow[data-room=${id}]`)).opacity;
    return { on: floor('living'), off: floor('study'), offB: floor('bath'), gOn: glow('living'), gOff: glow('study'), gDim: glow('bedroom'),
      focus: sr.querySelector('[part=focus]')?.getAttribute('points') ?? '', rooms: sr.querySelectorAll('[part=room]').length };
  });
  check(`lit room floor takes its light colour (${look.on} vs ${look.off})`, look.on !== look.off && look.off === look.offB);
  check(`glow shows only on lit rooms and follows level (${look.gOn}, ${look.gDim}, ${look.gOff})`, look.gOn > look.gDim && look.gDim > 0 && look.gOff === 0);
  check(`focus outline is drawn for the focused room (${look.rooms} rooms)`, look.focus.length > 10 && look.rooms === 6);
  const moved = await P(async () => {
    const p = document.getElementById('plan'); const a = p.shadowRoot.querySelector('[part=focus]').getAttribute('points');
    p.focus = 'kitchen'; await p.updateComplete; return a !== p.shadowRoot.querySelector('[part=focus]').getAttribute('points');
  });
  check('focus outline moves when focus changes', moved);

  const dash = () => P(() => document.getElementById('plan').shadowRoot.querySelector('[part=focus]').style.strokeDashoffset);
  const frames = (id = 'plan') => P((i) => +document.getElementById(i).dataset.frames, id);
  const d0 = await dash(), f0 = await frames(); await wait(500); const d1 = await dash(), f1 = await frames();
  check(`flows only in full motion: the outline (${d0} -> ${d1}, ${f1 - f0} frames)`, d0 !== d1 && f1 - f0 >= 5);
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'calm'); await s.updateComplete; });
  await wait(100);
  const c0 = await frames(); await wait(400); const c1 = await frames();
  check(`still in calm motion (${c0} -> ${c1})`, c0 === c1);
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'full'); await s.updateComplete; });
  await wait(100);

  await P(async () => { const s = document.getElementById('stage'); s.pause(); await s.updateComplete; });
  const p0 = await frames(); await wait(400); const p1 = await frames();
  const held = await P(async () => {
    const p = document.getElementById('plan'); const r = p.rooms.map((x) => ({ ...x, on: x.id === 'study' ? true : x.on }));
    p.rooms = r; await p.updateComplete; await new Promise((k) => setTimeout(k, 50));
    return getComputedStyle(p.shadowRoot.querySelector('.glow[data-room=study]')).opacity;
  });
  check(`paused stage stops the outline and holds new rooms (${p0} -> ${p1}, study glow ${held})`, p0 === p1 && +held === 0);
  const applied = await P(() => new Promise((res) => {
    const s = document.getElementById('stage'); s.addEventListener('cw-resume', (e) => res(e.detail.applied), { once: true }); s.resume();
  }));
  await wait(100);
  const after = await P(() => +document.getElementById('plan').shadowRoot.querySelector('.glow[data-room=study]').style.opacity);
  const f2 = await frames(); await wait(300);
  check(`resume applies the held rooms and restarts (applied ${applied}, glow ${after})`, applied >= 1 && after > 0 && (await frames()) > f2);

  const ev = await P(() => new Promise((res) => {
    const p = document.getElementById('plan'); p.addEventListener('cw-room', (e) => res(e.detail), { once: true });
    p.shadowRoot.querySelector('[part=room][data-room=bath] .floor').dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }));
  check(`cw-room is sent by clicking a room (${JSON.stringify(ev)})`, ev.id === 'bath' && ev.on === false);
  const kb = await P(() => new Promise((res) => {
    const p = document.getElementById('plan'); const got = [];
    p.addEventListener('cw-room', (e) => got.push(e.detail.id));
    const g = p.shadowRoot.querySelector('[part=room][data-room=entrance]'); g.focus();
    for (const key of ['Enter', ' ', 'a']) g.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
    res({ got, label: g.getAttribute('aria-label'), tab: g.getAttribute('tabindex') });
  }));
  check(`keyboard Enter and Space send cw-room, other keys do not (${kb.got}, "${kb.label}")`, kb.got.join() === 'entrance,entrance' && kb.tab === '0' && kb.label.includes('玄関') && kb.label.includes('消灯'));

  const ppl = await P(async () => {
    const p = document.getElementById('plan'); const sr = p.shadowRoot;
    const at = (i) => sr.querySelectorAll('[part=person]')[i].style.transform;
    const a0 = at(0), away = getComputedStyle(sr.querySelectorAll('[part=person]')[1]).opacity;
    p.people = [{ name: 'アオイ', color: '#9cc9ef', room: 'bedroom' }, { name: 'ハル', color: '#f2c38b', room: 'kitchen' }];
    await p.updateComplete;
    return { moved: a0 !== at(0), away, letter: sr.querySelector('[part=person] text').textContent };
  });
  check(`person moves to their room (${ppl.letter})`, ppl.moved && ppl.letter === 'ア');
  check(`away person is faded (${ppl.away})`, +ppl.away < 0.5);

  const alone = await frames('alone'); await wait(300);
  check('a floorplan outside any stage follows its own motion', (await frames('alone')) > alone);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await wait(150);
  const r0 = await frames(); await wait(400); const r1 = await frames();
  check(`reduced motion stops the outline (${r0} -> ${r1})`, r0 === r1);
  await more(page, check);
}

// T055: holes from the T050 audit
export async function more(page, check) {
  const P = (fn, ...a) => page.evaluate(fn, ...a);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(page.url().split('?')[0] + '?motion=full', { waitUntil: 'load' }); await wait(300);
  const rgb = (c) => { const m = c.match(/[\d.]+/g).map(Number); return c.startsWith('color(srgb') ? m.slice(0, 3).map((x) => x * 255) : m.slice(0, 3); };
  const set = (rooms) => P(async (r) => { const p = document.getElementById('plan'); p.rooms = r; await p.updateComplete; await new Promise((k) => setTimeout(k, 50)); }, rooms);
  const floor = (id) => P((i) => { const sr = document.getElementById('plan').shadowRoot; return getComputedStyle(sr.querySelector(`[part=room][data-room=${i}] .floor`)).fill; }, id);
  const glow = (id) => P((i) => getComputedStyle(document.getElementById('plan').shadowRoot.querySelector(`.glow[data-room=${i}]`)).fill, id);
  const one = (color, level) => [{ id: 'a', name: 'A', x: 0, y: 0, w: 3, h: 3, on: true, color, level }, { id: 'b', name: 'B', x: 3, y: 0, w: 3, h: 3 }];
  // colours change over 0.6 s outside off; read them with motion off so the value is final
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'off'); await s.updateComplete; });
  await set(one('#ff0000', 1)); const red = rgb(await floor('a')); const gRed = rgb(await glow('a'));
  await set(one('#0000ff', 1)); const blue = rgb(await floor('a'));
  check(`floor hue follows the light colour (red ${red.map(Math.round)}, blue ${blue.map(Math.round)})`, red[0] > red[2] + 60 && blue[2] > blue[0] + 60);
  await set(one('#ff0000', 0.1)); const dim = rgb(await floor('a'));
  check(`floor follows level (${Math.round(dim[0])} < ${Math.round(red[0])})`, red[0] > dim[0] + 30);
  check(`glow colour is the light colour (${gRed.map(Math.round)})`, gRed[0] > 200 && gRed[1] < 60 && gRed[2] < 60);
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'full'); await s.updateComplete; });

  await P(async () => { const p = document.getElementById('plan'); p.focus = 'a'; await p.updateComplete; });
  const out = await P(() => { const f = getComputedStyle(document.getElementById('plan').shadowRoot.querySelector('[part=focus]')); return { stroke: f.stroke, dash: f.strokeDasharray, w: f.strokeWidth }; });
  check(`focus outline is dashed and visible (${JSON.stringify(out)})`, out.stroke !== 'none' && !out.stroke.includes(', 0)') && out.dash !== 'none' && parseFloat(out.w) > 0);

  const radii = () => P(() => document.getElementById('plan').shadowRoot.querySelector('.lamp[data-on="1"]').getAttribute('r'));
  const rs = new Set(); for (let i = 0; i < 6; i++) { rs.add(await radii()); await wait(120); }
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'calm'); await s.updateComplete; });
  await wait(100); const cs = new Set(); for (let i = 0; i < 4; i++) { cs.add(await radii()); await wait(120); }
  check(`lamps breathe only in full motion (${rs.size} radii in full, ${cs.size} in calm)`, rs.size >= 3 && cs.size === 1);
  await P(async () => { const s = document.getElementById('stage'); s.setAttribute('motion', 'full'); await s.updateComplete; });

  const held = await P(async () => {
    const s = document.getElementById('stage'), p = document.getElementById('plan');
    s.pause(); await s.updateComplete; p.focus = 'b'; await p.updateComplete;
    const during = p.shadowRoot.querySelector('[part=focus]').getAttribute('points');
    s.resume(); await s.updateComplete; await p.updateComplete;
    return { same: during === p.shadowRoot.querySelector('[part=focus]').getAttribute('points') };
  });
  check(`focus set while paused waits for resume (${JSON.stringify(held)})`, held.same === false);

  await set(one('#ff0000', 0.85));
  const aria = await P(() => { const g = document.getElementById('plan').shadowRoot.querySelector('[part=room][data-room=a]'); return [g.getAttribute('aria-label'), g.getAttribute('aria-pressed')]; });
  check(`lit room label says 点灯 and its level (${aria})`, aria[0].includes('点灯') && aria[0].includes('85%') && aria[1] === 'true');

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await wait(150);
  const tr = await P(() => { const sr = document.getElementById('plan').shadowRoot; return [getComputedStyle(sr.querySelector('[part=person]')).transitionDuration, getComputedStyle(sr.querySelector('.floor')).transitionDuration]; });
  check(`reduced motion removes transitions on people and floors (${tr})`, tr.every((d) => d.split(',').every((x) => parseFloat(x) === 0)));
}
