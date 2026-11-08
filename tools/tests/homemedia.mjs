// The home sample's now-playing panel (bold layout) is a <cw-media>: the buttons work and the log says so.
export const demo = 'home.html?variant=bold&theme=glass&still';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await wait(400);
  const r = await page.evaluate(async () => {
    const m = document.querySelector('cw-screen[name=home] cw-media');
    if (!m) return null;
    await m.updateComplete;
    const t = () => m.shadowRoot.querySelector('[part=title]').textContent.trim(), log = () => document.querySelector('#log').shadowRoot.textContent;
    const first = { title: t(), state: m.getAttribute('state'), w: m.getBoundingClientRect().width };
    m.shadowRoot.querySelector('[part=next]').click(); await m.updateComplete;
    const next = t();
    m.shadowRoot.querySelector('[part=play]').click(); await m.updateComplete;
    const paused = m.getAttribute('state');
    const range = m.shadowRoot.querySelector('input[type=range]');
    range.value = '20'; range.dispatchEvent(new Event('change'));
    await new Promise((res) => setTimeout(res, 50));
    return { first, next, paused, logged: log().includes(next) && log().includes('一時停止'), volume: m.now.volume, ticker: !!document.querySelector('#ticker') };
  });
  check(`bold: the now-playing panel is a live player (${JSON.stringify(r?.first)})`, r?.first.title === '夜の窓辺' && r.first.state === 'playing' && r.first.w > 250);
  check(`bold: 次の曲 moves to the next track and logs it (${r?.next}, ${r?.logged})`, !!r && r.next !== '夜の窓辺' && r.next.length > 0 && r.logged);
  check(`bold: pause holds the player and the volume sticks (${r?.paused}, ${r?.volume})`, r?.paused === 'paused' && r.volume === 0.2 && r.ticker);
  await page.goto(`${base}?variant=bold&theme=game&still`, { waitUntil: 'load' });
  await wait(400);
  const g = await page.evaluate(() => { const m = document.querySelector('cw-screen[name=home] cw-media'); return m && getComputedStyle(m.shadowRoot.querySelector('[part=title]')).fontFamily; });
  check(`game: the player's title is in the wide face (${g})`, /^Archivo/.test(g ?? ''));
}
