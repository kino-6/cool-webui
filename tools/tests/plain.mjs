// demo/plain.html: every part in a plain page with no stage fills its 300×230 cell and keeps inside it.
export const demo = 'plain.html';

export async function run(page, check) {
  for (const theme of ['tile', 'game']) {
    await page.goto(page.url().split('?')[0] + `?theme=${theme}`, { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 1200));
    const r = await page.evaluate(() => [...document.querySelectorAll('main > *')].map((e) => {
      const box = e.getBoundingClientRect();
      // text and controls only: drawings may reach past on purpose, and a ticker's strip runs past its clipped box
      const out = e.localName === 'cw-ticker' ? [] : [...e.shadowRoot.querySelectorAll('*')]
        .filter((x) => x.closest('svg') === null && !['style', 'slot'].includes(x.localName) && x.getClientRects().length && getComputedStyle(x).display !== 'none' && getComputedStyle(x).visibility !== 'hidden')
        // a slanted label or button (the game look) is measured upright: the slant reaching past is the look, not an overflow
        .map((x) => { const t = x.style.transform; x.style.transform = 'none'; const b = x.getBoundingClientRect(); x.style.transform = t; return [x.getAttribute('part') || x.localName, b]; }).filter(([, b]) => b.width > 0 && (b.right > box.right + 2 || b.bottom > box.bottom + 2 || b.left < box.left - 2 || b.top < box.top - 2))
        .map(([p]) => p);
      return { tag: e.localName, w: Math.round(box.width), h: Math.round(box.height), out };
    }));
    check(`${theme}: there are ${r.length} parts, every one sized by its cell (${r.filter((x) => !x.w || !x.h).map((x) => x.tag)})`, r.length >= 26 && r.every((x) => x.w === 300 && x.h > 0));
    check(`${theme}: nothing inside any part sticks out of it (${r.filter((x) => x.out.length).map((x) => `${x.tag}: ${x.out.slice(0, 3)}`).join('; ')})`, r.every((x) => !x.out.length));
  }
}
