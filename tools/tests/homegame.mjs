// The home sample in the game look: chosen from the page's buttons, tilted panels, a turning ring behind the floor plan,
// a huge focus name, a slanted current nav item, streaks behind; and the Home Assistant card's look: game.
export const demo = 'home.html?variant=bold&theme=game';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const state = (page) => page.evaluate(() => {
  const ring = document.getElementById('ring'), rs = ring && getComputedStyle(ring);
  const tilts = [...document.querySelectorAll('cw-panel')].map((p) => getComputedStyle(p.shadowRoot.querySelector('[part=frame]')).rotate);
  const cur = document.querySelector('.rail nav button[aria-current=true]');
  return {
    theme: document.documentElement.dataset.theme,
    pressed: [...document.querySelectorAll('.pick button[aria-pressed=true]')].map((b) => b.textContent),
    ring: ring ? { shown: rs.display !== 'none' && ring.getBoundingClientRect().width > 250, text: ring.text, angle: ring.angle } : null,
    tilts, focus: parseFloat(getComputedStyle(document.getElementById('fc-name')).fontSize),
    nav: cur ? getComputedStyle(cur).transform : '',
    bg: document.querySelector('cw-stage').shadowRoot.querySelector('cw-background')?.kind,
  };
});

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await wait(1200);
  const g = await state(page);
  check(`game: the ゲーム button is pressed (${g.pressed})`, g.theme === 'game' && g.pressed.includes('ゲーム'));
  const left = g.tilts.filter((t) => parseFloat(t) < 0).length, right = g.tilts.filter((t) => parseFloat(t) > 0).length;
  check(`game: panels lean both ways (${left} left, ${right} right)`, left >= 3 && right >= 3);
  check(`game: a ring turns behind the floor plan (${JSON.stringify(g.ring)})`, g.ring?.shown && /点灯/.test(g.ring.text) && g.ring.angle > 0);
  check(`game: the focus name is huge (${g.focus}px)`, g.focus >= 56);
  const m = g.nav.startsWith('matrix(') ? g.nav.slice(7, -1).split(',').map(Number) : [1, 0, 0, 1];
  check(`game: the current screen in the rail is a slanted slab (${g.nav})`, Math.abs(m[2]) > 0.1);
  check(`game: streaks behind (${g.bg})`, g.bg === 'streaks');
  const ringText = await page.evaluate(async () => {
    const chip = [...document.querySelectorAll('#chips button')].find((b) => b.getAttribute('aria-pressed') === 'false');
    const before = document.getElementById('ring').text;
    chip.click();
    await document.getElementById('ring').updateComplete;
    return [before, document.getElementById('ring').text];
  });
  check(`game: the ring follows the house (${ringText.join(' -> ')})`, ringText[0] !== ringText[1]);

  await page.goto(`${base}?variant=bold&theme=tile`, { waitUntil: 'load' });
  await wait(800);
  const t = await state(page);
  check(`tile: no ring, flat panels, normal focus name (${JSON.stringify(t.ring)}, ${t.focus}px)`, !t.ring?.shown && t.tilts.every((x) => x === 'none') && t.focus <= 40);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }),
    page.evaluate(() => [...document.querySelectorAll('.pick button')].find((b) => b.textContent === 'ゲーム').click())]);
  await wait(800);
  const back = await state(page);
  check(`the ゲーム button switches the look and keeps the bold layout (${back.theme}, ${back.ring?.shown})`, back.theme === 'game' && back.ring?.shown);

  await page.goto(base.replace('home.html', 'ha-card-house.html'), { waitUntil: 'load' });
  await wait(800);
  const card = await page.evaluate(() => {
    const el = document.getElementById('game');
    const frame = el?.shadowRoot.querySelector('cw-panel').shadowRoot.querySelector('[part=frame]');
    let neon = '';
    try { document.createElement('cw-ha-card').setConfig({ look: 'neon', entities: [{ entity: 'a.b', kind: 'stat' }] }); } catch (e) { neon = e.message; }
    return { rotate: frame ? getComputedStyle(frame).rotate : '', accent: el ? getComputedStyle(el.shadowRoot.querySelector('cw-panel')).getPropertyValue('--cw-signal').trim() : '', neon };
  });
  check(`card look: game tilts its panel in the amber accent (${card.rotate}, ${card.accent})`, parseFloat(card.rotate) !== 0 && !Number.isNaN(parseFloat(card.rotate)) && card.accent === '#FFC21A');
  check(`card: an unknown look still throws and names game (${card.neon})`, /game/.test(card.neon));
}
