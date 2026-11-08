// <cw-stage>: scaling, motion levels, pause and its events, bg values, and the two theme files.
export const demo = 'stage.html';
export async function run(page, check) {
  const box = await page.evaluate(() => {
    const m = document.querySelector('#main');
    const r = m.shadowRoot.querySelector('.box').getBoundingClientRect();
    return { w: r.width, h: r.height, vw: m.clientWidth, vh: m.clientHeight };
  });
  check(`scales 1600x900 into its box (${Math.round(box.w)}x${Math.round(box.h)} in ${box.vw}x${box.vh})`,
    box.w <= box.vw + 1 && box.h <= box.vh + 1 && (Math.abs(box.w - box.vw) < 2 || Math.abs(box.h - box.vh) < 2)
    && Math.abs(box.w / box.h - 16 / 9) < 0.01);

  const motion = await page.evaluate(() => [...document.querySelectorAll('cw-stage')].map((s) => s.id + '=' + s.dataset.motion).join(' '));
  check(`motion resolves (${motion})`, motion.includes('main=calm') && motion.includes('full=full') && motion.includes('still=off'));
  const settle = () => page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(r));
    await Promise.all([...document.querySelectorAll('cw-stage')].map((s) => s.updateComplete));
  });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => document.querySelector('#main').dataset.motion === 'off', { timeout: 2000 }).catch(() => {});
  await settle();
  check('auto becomes off under reduced motion', await page.evaluate(() => document.querySelector('#main').dataset.motion === 'off'));
  check('reduced motion wins over motion="full"', await page.evaluate(() => document.querySelector('#full').dataset.motion === 'off'));
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.waitForFunction(() => document.querySelector('#main').dataset.motion === 'calm', { timeout: 2000 }).catch(() => {});
  await settle();
  check('auto returns to calm', await page.evaluate(() => document.querySelector('#main').dataset.motion === 'calm'));

  const ev = await page.evaluate(async () => {
    const s = document.querySelector('#main'); const log = [];
    s.addEventListener('cw-pause', () => log.push('pause'));
    s.addEventListener('cw-resume', (e) => log.push('resume:' + e.detail.applied));
    s.pause(); s.pause(); await s.updateComplete;
    const attr = s.hasAttribute('paused');
    s.resume(); await s.updateComplete;
    s.setAttribute('paused', ''); await s.updateComplete;
    s.removeAttribute('paused'); await s.updateComplete;
    return { log: log.join(','), attr, after: s.hasAttribute('paused') };
  });
  check(`pause/resume fire once each (${ev.log})`, ev.log === 'pause,resume:0,pause,resume:0' && ev.attr && !ev.after);

  const btn = await page.evaluate(async () => {
    const s = document.querySelector('#main');
    const b = s.shadowRoot.querySelector('[part=pause]');
    const before = b.getAttribute('aria-label');
    b.click(); await s.updateComplete;
    const paused = s.paused, label = b.getAttribute('aria-label');
    b.click(); await s.updateComplete;
    const hidden = document.querySelector('#full').shadowRoot.querySelector('[part=pause]');
    return { before, paused, label, resumed: !s.paused, after: b.getAttribute('aria-label'), hidden: !hidden || getComputedStyle(hidden).display === 'none' };
  });
  check(`pause button toggles (${btn.before} -> ${btn.label} -> ${btn.after})`, btn.before === '一時停止' && btn.paused && btn.label === '再開' && btn.resumed && btn.after === '一時停止');
  check('a stage that starts paused says so once', await page.evaluate(() => pauseLog.filter((id) => id === 'held').length === 1 && document.querySelector('#held').paused));
  check('controls="none" hides the button', btn.hidden);

  const bg = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('cw-stage')].map((s) => {
    const cs = getComputedStyle(s); return [s.id, cs.backgroundColor + '|' + cs.backgroundImage];
  })));
  check(`bg=none is transparent (${bg.still})`, bg.still.startsWith('rgba(0, 0, 0, 0)|none'));
  const inner = await page.evaluate(() => getComputedStyle(document.querySelector('#still .fill')).backgroundColor);
  check(`bg=none also clears --cw-ground for children (${inner})`, inner === 'rgba(0, 0, 0, 0)');
  check(`tile ground is #121212 (${bg.main})`, bg.main.startsWith('rgb(18, 18, 18)'));

  const base = await page.evaluate(() => document.querySelector('#plain').shadowRoot.querySelector('.box').offsetWidth + 'x' + document.querySelector('#plain').shadowRoot.querySelector('.box').offsetHeight);
  check(`base="1920x1080" sets the board size (${base})`, base === '1920x1080');

  await page.setViewport({ width: 700, height: 900 });
  const refit = await page.waitForFunction(() => {
    const r = document.querySelector('#main').shadowRoot.querySelector('.box').getBoundingClientRect();
    return Math.abs(r.width - 700) < 2 && r.height < 400;
  }, { timeout: 2000 }).then(() => true, () => false);
  check('refits after resize (700 wide)', refit);
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(page.url().split('?')[0] + '?theme=glass', { waitUntil: 'load' });
  const plain = await page.evaluate(async () => { const s = document.querySelector('#plain'); await s.updateComplete; const cs = getComputedStyle(s); return cs.backgroundColor + '|' + cs.backgroundImage; });
  check(`glass bg=plain is the solid ground (${plain})`, plain === 'rgb(2, 6, 11)|none');
  await page.evaluate(() => document.querySelector('#main').updateComplete);
  const glass = await page.evaluate(() => getComputedStyle(document.querySelector('#main')).backgroundImage);
  check(`glass ground is a gradient (${glass.slice(0, 40)})`, glass.startsWith('linear-gradient'));
}
