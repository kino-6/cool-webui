// demo/home.html with no query (how `open` delivers it): one row of moods (layout + look together) and one row of motion.
export const demo = 'home.html';
const state = (page) => page.evaluate(() => ({
  variant: document.documentElement.dataset.variant, theme: document.documentElement.dataset.theme,
  motion: document.querySelector('cw-stage').getAttribute('motion'), plan: !!document.getElementById('plan'),
  pressed: [...document.querySelectorAll('.pick button[aria-pressed=true]')].map((b) => b.textContent),
  buttons: [...document.querySelectorAll('.pick button')].map((b) => b.textContent),
}));
const press = async (page, text) => {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.evaluate((t) => [...document.querySelectorAll('.pick button')].find((b) => b.textContent === t).click(), text),
  ]);
  await new Promise((r) => setTimeout(r, 400));
};
const is = (s, variant, theme, motion) => s.variant === variant && s.theme === theme && s.motion === motion;

export async function run(page, check) {
  let s = await state(page);
  check(`moods: four moods and three motions, nothing else (${s.buttons})`, s.buttons.join() === 'シンプル,ガラス,派手,ゲーム,なし,控えめ,多め');
  check(`moods: no query is シンプル with calm motion (${s.pressed})`, is(s, 'quiet', 'tile', 'calm') && s.pressed.join() === 'シンプル,控えめ');
  const box = await page.evaluate(() => { const r = document.querySelector('.pick').getBoundingClientRect(); return { w: r.width, h: r.height, z: getComputedStyle(document.querySelector('.pick')).zIndex }; });
  check(`moods: one compact bar above the stage (${box.w.toFixed(0)}x${box.h.toFixed(0)})`, box.w > 200 && box.w < 440 && box.h > 20 && box.h < 40 && +box.z > 0);

  await press(page, '派手');
  s = await state(page);
  check(`moods: 派手 is the bold layout in glass with full motion (${s.variant}, ${s.theme}, ${s.motion}, ${s.pressed})`, is(s, 'bold', 'glass', 'full') && s.plan && s.pressed.join() === '派手,多め');

  await press(page, 'ゲーム');
  s = await state(page);
  check(`moods: ゲーム is the bold layout in the game look (${s.variant}, ${s.theme}, ${s.motion})`, is(s, 'bold', 'game', 'full') && s.pressed.join() === 'ゲーム,多め');

  await press(page, 'なし');
  s = await state(page);
  check(`moods: motion changes alone and keeps the mood (${s.variant}, ${s.theme}, ${s.motion}, ${s.pressed})`, is(s, 'bold', 'game', 'off') && s.pressed.join() === 'ゲーム,なし');

  await press(page, 'ガラス');
  s = await state(page);
  check(`moods: a new mood starts at its own motion (${s.variant}, ${s.theme}, ${s.motion})`, is(s, 'quiet', 'glass', 'calm') && !s.plan && s.pressed.join() === 'ガラス,控えめ');

  await press(page, 'シンプル');
  s = await state(page);
  check(`moods: シンプル returns to tiles (${s.variant}, ${s.theme}, ${s.motion})`, is(s, 'quiet', 'tile', 'calm') && !!(await page.$('#rooms')));

  await page.goto(page.url().split('?')[0] + '?theme=game', { waitUntil: 'load' });
  s = await state(page);
  check(`moods: a URL-only mix presses no mood (${s.variant}, ${s.theme}, ${s.pressed})`, is(s, 'quiet', 'game', 'calm') && s.pressed.join() === '控えめ');
}
