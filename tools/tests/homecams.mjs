// The home sample's camera screen: three <cw-camera> in both layouts; the automatic turns leave it alone.
export const demo = 'home.html?theme=tile&still';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;

export async function run(page, check) {
  const base = page.url().split('?')[0];
  for (const [tag, query] of [['quiet', 'theme=tile&still'], ['bold', 'variant=bold&theme=game&still']]) {
    await page.goto(`${base}?${query}`, { waitUntil: 'load' });
    await page.wait(300);
    const s = await page.evaluate(async () => {
      [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'cams').click();
      await window.__wait(900);
      const cams = [...document.querySelectorAll('cw-screen[name=cams] cw-camera')];
      return { current: document.querySelector('cw-screens').current, labels: cams.map((c) => c.label).join(','),
        online: cams.filter((c) => c.getAttribute('state') === 'online' && c.getBoundingClientRect().width > 200).length };
    });
    check(`${tag}: the カメラ button opens three live cameras (${JSON.stringify(s)})`, s.current === 'cams' && s.labels === '庭,玄関,車庫' && s.online === 3);
  }
  await page.goto(`${base}?variant=bold&theme=glass&motion=full&swapms=300`, { waitUntil: 'load' });
  await page.wait(300);
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.dataset.to === 'cams').click());
  await page.wait(1200);
  const stay = await page.evaluate(() => document.querySelector('cw-screens').current);
  check(`bold: the automatic turns leave the camera screen alone (${stay})`, stay === 'cams');
}
