// The home sample's newer parts: rooms at a glance under the lights, the sky by the air conditioner, the alarm by the
// cameras and the shopping list on the chores screen, in both layouts.
export const demo = 'home.html?theme=tile&still';
export const virtualTime = true;

const PLACES = [['lights', ['areas']], ['day', ['sky']], ['cams', ['alarm']], ['chores', ['shopping']]];

export async function run(page, check) {
  const base = page.url().split('?')[0];
  for (const [tag, query] of [['quiet', 'theme=tile&still'], ['bold', 'variant=bold&theme=game&still']]) {
    await page.goto(`${base}?${query}`, { waitUntil: 'load' });
    await page.wait(300);
    for (const [screen, ids] of PLACES) {
      const r = await page.evaluate(async (to, list) => {
        [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === to).click();
        await window.__wait(900);
        return list.map((id) => {
          const e = document.getElementById(id), box = e.getBoundingClientRect(), panel = e.closest('cw-panel').getBoundingClientRect();
          const parts = id === 'areas' ? [...e.querySelectorAll('cw-area')] : [e];
          // every visible piece inside each part stays inside its panel
          const inside = parts.every((p) => [...p.shadowRoot.querySelectorAll('*')].filter((x) => x.getClientRects().length && getComputedStyle(x).display !== 'none')
            .every((x) => { const b = x.getBoundingClientRect(); return b.bottom <= panel.bottom + 1 && b.right <= panel.right + 1; }));
          return { id, shown: box.width > 150 && e.checkVisibility(), inside, n: parts.length };
        });
      }, screen, ids);
      check(`${tag}: ${screen} shows ${ids} inside its panel (${JSON.stringify(r)})`, r.every((x) => x.shown && x.inside));
    }
  }
  // the rooms under the lights follow the same rooms and switch them
  const rooms = await page.evaluate(async () => {
    [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'lights').click();
    await window.__wait(900);
    const a = [...document.querySelectorAll('#areas cw-area')], study = a[2];
    const before = [a.map((x) => x.label).join(), study.now.lightsOn, a[0].now.temperature];
    study.shadowRoot.querySelector('[part=lights]').click(); await window.__wait(50); await study.updateComplete;
    const sw = [...document.querySelectorAll('#switches cw-switch')].find((x) => x.label === '書斎');
    return { before, after: study.now.lightsOn, sw: sw.on, log: document.querySelector('#log').shadowRoot.textContent.includes('書斎 を点灯') };
  });
  check(`three rooms from the sample's rooms (${rooms.before})`, rooms.before[0] === '居間,寝室,書斎' && rooms.before[1] === 0 && rooms.before[2] === 22.4);
  check(`pressing the study's lights turns its light on, its switch and the log agree (${JSON.stringify(rooms)})`, rooms.after === 1 && rooms.sw === true && rooms.log);
  const alarm = await page.evaluate(async () => {
    [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'cams').click();
    await window.__wait(900);
    const e = document.getElementById('alarm');
    for (const k of ['2', '4', '6', '8']) [...e.shadowRoot.querySelectorAll('[part=keys] button')].find((b) => b.textContent.trim() === k).click();
    await e.updateComplete;
    e.shadowRoot.querySelector('[part=disarm]').click(); await e.updateComplete;
    const right = e.getAttribute('state');
    await window.__wait(1600); await e.updateComplete;
    const logText = document.querySelector('#log').shadowRoot.textContent;
    return { right, later: e.getAttribute('state'), log: logText.includes('解除した'), leaked: logText.includes('2468') };
  });
  check(`the alarm disarms with a code, the log says so and never shows the code (${JSON.stringify(alarm)})`, alarm.right === 'disarming' && alarm.later === 'disarmed' && alarm.log && !alarm.leaked);
  const todo = await page.evaluate(async () => {
    [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'chores').click();
    await window.__wait(900);
    const e = document.getElementById('shopping'), first = e.shadowRoot.querySelector('[part=summary]').textContent;
    e.shadowRoot.querySelector('[part=check]').click(); await e.updateComplete;
    return { first, log: document.querySelector('#log').shadowRoot.textContent.includes(`${first} を買った`) };
  });
  check(`the overdue item comes first; ticking it is logged (${JSON.stringify(todo)})`, todo.first === '洗剤' && todo.log);
}
