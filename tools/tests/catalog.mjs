// demo/index.html as a catalog: every part in the design table has a card with a live preview and a link to its demo page;
// the look and motion can be switched on the page.
import { readFileSync, existsSync } from 'node:fs';
export const demo = 'index.html';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// the parts table in docs/design/components.md, up to the next heading
const table = readFileSync('docs/design/components.md', 'utf8').split('## 部品一覧')[1].split('\n### ')[0];
const tags = [...new Set([...table.matchAll(/^\| [^|]+ \| (`<cw-[a-z]+>`(?: と `<cw-[a-z]+>`)?)/gm)].flatMap((m) => [...m[1].matchAll(/<(cw-[a-z]+)>/g)].map((x) => x[1])))];

export async function run(page, check) {
  await wait(800);
  // a card may show two tags that work together (cw-screens and cw-screen); the first one is the preview
  const cards = await page.evaluate(() => [...document.querySelectorAll('[data-tag]')].map((c) => {
    const tag = c.dataset.tag.split(' ')[0], el = c.querySelector(`.preview ${tag}`), r = el?.getBoundingClientRect();
    return { tag, all: c.dataset.tag.split(' '), link: c.querySelector('a[href$=".html"], a[href*=".html?"]')?.getAttribute('href') ?? '', text: c.querySelector('p')?.textContent.trim() ?? '',
      live: !!el && r.width > 40 && r.height > 8 && (el.shadowRoot?.childNodes.length ?? 0) > 0 };
  }));
  const by = Object.fromEntries(cards.flatMap((c) => c.all.map((t) => [t, c])));
  const missing = tags.filter((t) => !by[t]);
  check(`every part in the design table has a card (${tags.length} parts; missing ${missing.join(',') || 'none'})`, tags.length >= 17 && missing.length === 0);
  const dead = cards.filter((c) => c.tag !== 'cw-source' && !c.live).map((c) => c.tag);
  check(`every card but the connector shows the part alive (${dead.join(',') || 'all live'})`, dead.length === 0);
  const broken = cards.filter((c) => !c.link || !existsSync('demo/' + c.link.split('?')[0])).map((c) => c.tag + ':' + c.link);
  check(`every card links to a demo page that exists (${broken.join(',') || 'all ok'})`, broken.length === 0);
  check(`every card says what the part does (${cards.filter((c) => c.text.length < 8).map((c) => c.tag).join(',') || 'all'})`, cards.every((c) => c.text.length >= 8));
  check(`the Home Assistant card is in the catalog too (${!!by['cw-ha-card']?.live})`, !!by['cw-ha-card']?.live);
  const home = await page.evaluate(() => [...document.querySelectorAll('a')].some((a) => /home\.html/.test(a.getAttribute('href'))));
  check(`the home sample is linked from the top (${home})`, home);

  // motion switches in place: every preview stage takes the level
  const motion = await page.evaluate(async () => {
    [...document.querySelectorAll('.pick button')].find((b) => b.dataset.motion === 'full').click();
    await new Promise((r) => setTimeout(r, 300));
    const stages = [...document.querySelectorAll('.preview cw-stage')];
    return { n: stages.length, full: stages.filter((s) => s.dataset.motion === 'full').length, ring: document.querySelector('.preview cw-ring')?.dataset.motion };
  });
  check(`motion 多め reaches every preview (${JSON.stringify(motion)})`, motion.n >= 15 && motion.full === motion.n && motion.ring === 'full');

  // the look reloads the page with ?theme=
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }),
    page.evaluate(() => [...document.querySelectorAll('.pick button')].find((b) => b.dataset.theme === 'game').click())]);
  await wait(500);
  const g = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, pressed: [...document.querySelectorAll('.pick button[aria-pressed=true]')].map((b) => b.textContent).join(','),
    motion: document.querySelector('.preview cw-stage').dataset.motion,
    card: getComputedStyle(document.querySelector('[data-tag="cw-ha-card"] cw-ha-card').shadowRoot.querySelector('cw-panel')).getPropertyValue('--cw-signal').trim() }));
  check(`ゲーム switches the look and keeps the motion (${JSON.stringify(g)})`, g.theme === 'game' && g.pressed === 'ゲーム,多め' && g.motion === 'full' && g.card === '#FFC21A');
}
