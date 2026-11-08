// demo/home.html?variant=bold: the prototype's bold layout from parts — floor plan, moving focus, flow, screens taking turns.
export const demo = 'home.html?variant=bold';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
export async function run(page, check) {
  const base = page.url().split('?')[0];
  const open = async (query, ms = 1200) => { await page.goto(`${base}?${query}`, { waitUntil: 'load' }); await page.wait(ms); };
  for (const [theme, motion] of [['tile', 'full'], ['glass', 'full'], ['tile', 'calm']]) {
    await open(`variant=bold&theme=${theme}${motion === 'calm' ? '&motion=calm' : ''}`);
    const r = await page.evaluate(() => {
      const stage = document.querySelector('cw-stage'), plan = document.getElementById('plan');
      const litRooms = plan.shadowRoot.querySelectorAll('[part=room][aria-pressed=true]').length;
      return { motion: stage.dataset.motion, theme: document.documentElement.dataset.theme, plan: !!plan, flow: !!document.getElementById('flow'),
        lit: litRooms, chipsOn: document.querySelectorAll('#chips button[aria-pressed=true]').length, lights: stage.lights.length,
        aura: !!stage.shadowRoot.querySelector('cw-background'), roll: !!document.getElementById('power-now').shadowRoot.querySelector('.roll'),
        focus: plan.focus, tiles: !!document.getElementById('rooms') };
    });
    const tag = `${theme}/${motion}`;
    check(`${tag}: bold layout with the floor plan and the flow, no room tiles (${r.theme}, ${r.motion})`, r.theme === theme && r.motion === motion && r.plan && r.flow && !r.tiles);
    check(`${tag}: the plan, the chips and the stage lights agree on lit rooms (${r.lit}, ${r.chipsOn}, ${r.lights})`, r.lit >= 1 && r.lit === r.chipsOn && r.lit === r.lights);
    check(`${tag}: aura and rolling digits only in full (${r.aura}, ${r.roll})`, r.aura === (motion === 'full') && r.roll === (motion === 'full'));
    check(`${tag}: a lit room has the focus (${r.focus})`, ['living', 'kitchen', 'bedroom'].includes(r.focus));
  }

  await open('variant=bold&focusms=500&swapms=100000', 300);
  const seen = new Set();
  for (let i = 0; i < 8; i++) { seen.add(await page.evaluate(() => document.getElementById('plan').focus)); await page.wait(250); }
  check(`focus moves through the lit rooms (${[...seen]})`, seen.size >= 2);
  const fp = await page.evaluate(() => {
    const plan = document.getElementById('plan'); const name = document.getElementById('fc-name').textContent;
    return { name, room: plan.rooms.find((r) => r.id === plan.focus)?.name };
  });
  check(`focus panel names the outlined room (${fp.name} = ${fp.room})`, fp.name && fp.name === fp.room);

  const click = await page.evaluate(async () => {
    const plan = document.getElementById('plan');
    plan.shadowRoot.querySelector('[part=room][data-room=study] .floor').dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await plan.updateComplete;
    const log = document.getElementById('log').shadowRoot.textContent;
    return { plan: plan.shadowRoot.querySelector('[part=room][data-room=study]').getAttribute('aria-pressed'),
      chip: [...document.querySelectorAll('#chips button')].find((b) => b.textContent === '書斎').getAttribute('aria-pressed'), log: log.includes('書斎') };
  });
  check(`room click on the plan lights it, its chip and the log (${JSON.stringify(click)})`, click.plan === 'true' && click.chip === 'true' && click.log);

  await page.evaluate(async () => { const s = document.querySelector('cw-screens'); s.show('energy'); await window.__wait(1200); });
  const dots = await page.evaluate(() => document.getElementById('flow').shadowRoot.querySelectorAll('[part=dot]').length);
  const nodes = await page.evaluate(() => [...document.getElementById('flow').shadowRoot.querySelectorAll('[part=node]')].map((n) => n.dataset.node).join());
  check(`flow dots run on the energy screen (${dots} dots, nodes ${nodes})`, dots > 0 && nodes === 'solar,grid,batt,home');

  await open('variant=bold&focusms=100000&swapms=1500', 200);
  const s0 = await page.evaluate(() => document.querySelector('cw-screens').current); await page.wait(2600);
  const s1 = await page.evaluate(() => document.querySelector('cw-screens').current);
  check(`auto switch takes turns in full motion (${s0} -> ${s1})`, s0 === 'home' && s1 === 'energy');
  // count what happens while paused: an even number of swaps would land back on the same screen
  await open('variant=bold&focusms=300&swapms=600', 200);
  const held = await page.evaluate(async () => {
    const s = document.querySelector('cw-stage'), sc = document.querySelector('cw-screens'), plan = document.getElementById('plan');
    s.pause(); await s.updateComplete;
    let swaps = 0; const foci = new Set([plan.focus]);
    sc.addEventListener('cw-screen-change', () => swaps++);
    const t = setInterval(() => foci.add(plan.focus), 50);
    await window.__wait(2000); clearInterval(t);
    return { swaps, foci: foci.size };
  });
  check(`paused stage stops the auto switch and the focus (${held.swaps} swaps, ${held.foci} foci)`, held.swaps === 0 && held.foci === 1);

  await open('variant=bold&motion=calm&focusms=400&swapms=800', 200);
  const q0 = await page.evaluate(() => [document.getElementById('plan').focus, document.querySelector('cw-screens').current]); await page.wait(1800);
  const q1 = await page.evaluate(() => [document.getElementById('plan').focus, document.querySelector('cw-screens').current]);
  check(`no auto switch and no moving focus in calm (${q0} -> ${q1})`, q0.join() === q1.join());

  await open('theme=tile&motion=full', 600);
  const quiet = await page.evaluate(() => ({ plan: !!document.querySelector('cw-floorplan'), tiles: document.querySelectorAll('#rooms cw-panel').length, v: document.documentElement.dataset.variant }));
  check(`quiet stays the tile layout without the floor plan (${JSON.stringify(quiet)})`, !quiet.plan && quiet.tiles === 6 && quiet.v === 'quiet');
}
