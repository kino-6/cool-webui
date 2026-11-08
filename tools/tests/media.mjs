// <cw-media>: what is playing, how far it has got, and buttons that send what the listener asked for.
export const demo = 'media.html';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, t = (p) => r.querySelector(`[part=${p}]`)?.textContent.trim() ?? null;
  const play = r.querySelector('[part=play]');
  return { title: t('title'), artist: t('artist'), time: t('time'), art: r.querySelector('[part=art] img')?.getAttribute('src') ?? null,
    playLabel: play?.getAttribute('aria-label'), disabled: play?.disabled, bar: !!r.querySelector('[part=progress]'),
    fill: r.querySelector('[part=progress-fill]') ? r.querySelector('[part=progress-fill]').getBoundingClientRect().width / r.querySelector('[part=progress]').getBoundingClientRect().width : null,
    volume: r.querySelector('input[type=range]') ? +r.querySelector('input[type=range]').value : null,
    eq: r.querySelector('[part=eq] i') ? getComputedStyle(r.querySelector('[part=eq] i')).animationName : null,
    titleFont: getComputedStyle(r.querySelector('[part=title]')).fontFamily, state: e.getAttribute('state'),
    role: e.getAttribute('role'), aria: e.getAttribute('aria-label') ?? '' };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(300);
  const a = await read(page, '#living');
  check(`shows the title, the artist and the cover (${a.title}, ${a.artist}, ${a.art})`, a.title === '夜の窓辺' && a.artist === 'Lumen Field' && a.art === 'img/cover.svg');
  check(`shows how far it has got (${a.time}, fill ${a.fill?.toFixed(2)})`, /^1:0[56] \/ 3:42$/.test(a.time) && Math.abs(a.fill - 65 / 222) < 0.03);
  check(`while playing the main button offers 一時停止 (${a.playLabel})`, a.playLabel === '一時停止' && a.state === 'playing');
  check(`it is a group named by what plays (${a.role}, ${a.aria})`, a.role === 'group' && a.aria.includes('夜の窓辺') && a.aria.includes('Lumen Field'));
  // compare with the time that really passed in the page, so a slow machine does not fail it
  const run = await page.evaluate(async () => {
    const e = document.querySelector('#living'), secs = () => { const [m, s] = e.shadowRoot.querySelector('[part=time]').textContent.split('/')[0].trim().split(':'); return +m * 60 + +s; };
    e.now = { position: 65 }; await e.updateComplete;
    const t0 = performance.now();
    await window.__wait(2100);
    e.requestUpdate(); await e.updateComplete;
    return { shown: secs(), expected: 65 + (performance.now() - t0) / 1000 };
  });
  const a2 = { time: `${run.shown}s` };
  check(`the position moves on by itself while playing (65 -> ${run.shown}, expected ${run.expected.toFixed(1)})`, Math.abs(run.shown - Math.floor(run.expected)) <= 1 && run.shown >= 66);

  const idle = await read(page, '#bed');
  check(`nothing playing: says 再生していない, no bar, buttons off (${idle.title}, ${idle.bar}, ${idle.disabled})`, idle.title === '再生していない' && !idle.bar && idle.disabled && idle.art === null);

  // buttons: each sends cw-media with the action; play/pause flips the face at once
  const sent = await page.evaluate(async () => {
    const e = document.querySelector('#living'), log = [];
    e.addEventListener('cw-media', (ev) => log.push(ev.detail.action));
    for (const p of ['play', 'next', 'previous']) e.shadowRoot.querySelector(`[part=${p}]`).click();
    await e.updateComplete;
    const label = e.shadowRoot.querySelector('[part=play]').getAttribute('aria-label'), state = e.getAttribute('state');
    e.shadowRoot.querySelector('[part=play]').click(); await e.updateComplete;
    return { log, label, state, back: e.getAttribute('state') };
  });
  check(`buttons send pause, next, previous, play (${sent.log})`, sent.log.join() === 'pause,next,previous,play');
  check(`pause shows at once and offers 再生 (${sent.state}, ${sent.label}; then ${sent.back})`, sent.state === 'paused' && sent.label === '再生' && sent.back === 'playing');

  // volume slider: present when the volume is known; letting go sends cw-volume
  const vol = await page.evaluate(async () => {
    const e = document.querySelector('#living'), log = [];
    e.addEventListener('cw-volume', (ev) => log.push(ev.detail.volume));
    const r = e.shadowRoot.querySelector('input[type=range]');
    r.value = '70'; r.dispatchEvent(new Event('input')); const mid = log.length; r.dispatchEvent(new Event('change'));
    return { mid, log, label: r.getAttribute('aria-label') };
  });
  check(`volume: shown at 40, letting go sends 0.7 once (${a.volume}, ${JSON.stringify(vol)})`, a.volume === 40 && vol.mid === 0 && vol.log.join() === '0.7' && vol.label === '音量');
  check(`no volume known, no slider (${idle.volume})`, idle.volume === null);

  // paused: the position stands still and a new track waits; resume shows it
  const held = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#living'), tm = () => e.shadowRoot.querySelector('[part=time]').textContent.trim();
    stage.pause(); await stage.updateComplete;
    const t0 = tm();
    e.now = { title: '次の曲', position: 0, duration: 200 };
    await window.__wait(1500); await e.updateComplete;
    const during = [tm(), e.shadowRoot.querySelector('[part=title]').textContent.trim()];
    stage.resume(); await stage.updateComplete; await e.updateComplete;
    return { t0, during, after: e.shadowRoot.querySelector('[part=title]').textContent.trim(), artist: e.shadowRoot.querySelector('[part=artist]').textContent.trim() };
  });
  check(`paused: the clock stops and a new track waits (${JSON.stringify(held)})`, held.during[0] === held.t0 && held.during[1] === '夜の窓辺' && held.after === '次の曲' && held.artist === 'Lumen Field');

  const noArt = await page.evaluate(() => { const a = document.querySelector('#loose').shadowRoot.querySelector('[part=art]'); return getComputedStyle(a).display; });
  check(`a track without a cover leaves no empty box (${noArt})`, noArt === 'none');
  // motion: bars dance only in full while playing
  const loose = await read(page, '#living'), full = await read(page, '#loose');
  check(`calm: still bars (${loose.eq}); full: dancing bars (${full.eq})`, loose.eq === 'none' && full.eq !== 'none' && full.eq !== null);
  const stop = await page.evaluate(async () => { const e = document.querySelector('#loose'); e.now = { state: 'paused' }; await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=eq] i')).animationName; });
  check(`full but paused playback: the bars rest (${stop})`, stop === 'none');

  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const g = await read(page, '#living');
  check(`game: the title uses the wide display face (${g.titleFont}; tile ${a.titleFont})`, /^Archivo/.test(g.titleFont) && !/^Archivo/.test(a.titleFont));
  // holes found by the T072 audit
  await page.goto(`${base}?theme=tile`, { waitUntil: 'load' });
  await page.wait(300);
  const secsOf = (sel) => page.evaluate(async (q) => { const e = document.querySelector(q); e.requestUpdate(); await e.updateComplete; const [m, x] = e.shadowRoot.querySelector('[part=time]').textContent.split('/')[0].trim().split(':'); return +m * 60 + +x; }, sel);
  await page.evaluate(() => { document.querySelector('#living').now = { position: 221.2 }; });
  await page.wait(2500);
  check(`holes: the position stops at the end of the track (${await secsOf('#living')})`, (await secsOf('#living')) === 222);
  const gap = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#living'), secs = async () => { e.requestUpdate(); await e.updateComplete; const [m, x] = e.shadowRoot.querySelector('[part=time]').textContent.split('/')[0].trim().split(':'); return +m * 60 + +x; };
    e.now = { position: 30 }; const before = await secs();
    stage.pause(); await stage.updateComplete;
    await window.__wait(2600);
    const during = await secs();
    stage.resume(); await stage.updateComplete;
    return { before, during, after: await secs() };
  });
  check(`holes: the clock stands still while paused and does not jump on resume (${JSON.stringify(gap)})`, gap.during - gap.before <= 1 && gap.after - gap.before <= 1);
  const quiet = await page.evaluate(async () => {
    const e = document.querySelector('#bed'), out = {};
    for (const st of ['idle', 'off', 'buffering']) {
      e.now = { state: st, title: '隠れる曲', artist: 'X', art: 'img/cover.svg', duration: 100, position: 5 }; await e.updateComplete;
      const r = e.shadowRoot;
      out[st] = { state: e.getAttribute('state'), title: r.querySelector('[part=title]').textContent.trim(), img: !!r.querySelector('[part=art] img'), art: e.hasAttribute('data-art'),
        bar: !!r.querySelector('[part=progress]'), off: r.querySelector('[part=play]').disabled, artist: r.querySelector('[part=artist]').textContent.trim() };
    }
    return out;
  });
  const hidden = (q) => q.title === '再生していない' && !q.img && !q.art && !q.bar && q.off && q.artist === '';
  check(`holes: idle hides the cover, the bar and the title (${JSON.stringify(quiet.idle)})`, quiet.idle.state === 'idle' && hidden(quiet.idle));
  check(`holes: off is not playing (${JSON.stringify(quiet.off)})`, quiet.off.state === 'off' && hidden(quiet.off));
  check(`holes: an unknown state falls back to idle (${JSON.stringify(quiet.buffering)})`, quiet.buffering.state === 'idle' && hidden(quiet.buffering));
  const bars = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#living'), eq = () => getComputedStyle(e.shadowRoot.querySelector('[part=eq] i')).animationName;
    e.now = { state: 'playing' };
    stage.setAttribute('motion', 'full'); await stage.updateComplete; await window.__wait(50); await e.updateComplete;
    const full = eq();
    stage.pause(); await stage.updateComplete; await e.updateComplete;
    const stagePaused = eq();
    stage.resume(); await stage.updateComplete;
    const own = document.querySelector('#loose'); own.pause(); await own.updateComplete;
    const ownPaused = getComputedStyle(own.shadowRoot.querySelector('[part=eq] i')).animationName;
    const [m, x] = own.shadowRoot.querySelector('[part=time]').textContent.split('/')[0].trim().split(':');
    await window.__wait(1600); own.requestUpdate(); await own.updateComplete;
    const [m2, x2] = own.shadowRoot.querySelector('[part=time]').textContent.split('/')[0].trim().split(':');
    own.resume();
    return { full, stagePaused, ownPaused, clock: (+m2 * 60 + +x2) - (+m * 60 + +x) };
  });
  check(`holes: a paused stage stops the dancing bars (${bars.full} -> ${bars.stagePaused})`, bars.full === 'dance' && bars.stagePaused === 'none');
  check(`holes: the element's own pause stops its bars and its clock (${bars.ownPaused}, +${bars.clock}s)`, bars.ownPaused === 'none' && bars.clock === 0);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const e = document.querySelector('#living'), b = e.shadowRoot.activeElement; return b ? `${b.getAttribute('part')}:${getComputedStyle(b).outlineStyle}:${parseFloat(getComputedStyle(b).outlineWidth)}` : 'none'; });
  check(`holes: a key-focused button shows its focus ring (${ring})`, /^previous:solid:[1-9]/.test(ring));
  const tilt = await page.evaluate(() => getComputedStyle(document.querySelector('#living').shadowRoot.querySelector('[part=play]')).transform);
  check(`holes: tile keeps the play button upright (${tilt})`, tilt === 'none');
  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  await page.wait(300);
  const gt = await page.evaluate(() => getComputedStyle(document.querySelector('#living').shadowRoot.querySelector('[part=play]')).transform);
  const gc = gt.startsWith('matrix(') ? +gt.slice(7, -1).split(',')[2] : 0;
  check(`holes: game slants the play button (${gt})`, Math.abs(gc) > 0.1);

  // narrow boxes: standalone 260px, and 220px inside the stage
  const narrow = await page.evaluate(async () => {
    const out = [];
    for (const [w, h, inStage] of [[260, 130, false], [220, 150, true]]) {
      const e = document.createElement('cw-media');
      Object.assign(e.style, inStage ? { width: w + 'px', height: h + 'px', display: 'grid' } : { position: 'fixed', left: '0', top: '0', width: w + 'px', height: h + 'px' });
      (inStage ? document.querySelector('.grid') : document.body).append(e);
      e.now = { title: 'とても長い曲の名前がここに入る', artist: 'Someone', art: 'img/cover.svg', state: 'playing', position: 10, duration: 200, volume: 0.5 };
      await e.updateComplete; await window.__wait(100);
      // the game look slants the play button, so measure its own box, not its slanted outline
      const host = e.getBoundingClientRect(), r = e.shadowRoot, pb = r.querySelector('[part=play]'), play = { width: pb.offsetWidth, height: pb.offsetHeight };
      const parts = [...r.querySelectorAll('button, input, [part=eq], [part=progress], [part=time]')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.getBoundingClientRect());
      out.push({ w, round: Math.abs(play.width - play.height) < 1 && play.width >= 30, right: Math.max(...parts.map((p) => p.right)) - host.right, bottom: Math.max(...parts.map((p) => p.bottom)) - host.bottom,
        bar: r.querySelector('[part=progress]').getBoundingClientRect().width });
      e.remove();
    }
    return out;
  });
  check(`narrow: the play button stays round (${narrow.map((n) => n.round)})`, narrow.every((n) => n.round));
  check(`narrow: nothing sticks out on the right or the bottom (${narrow.map((n) => `${n.w}px: ${n.right.toFixed(0)}, ${n.bottom.toFixed(0)}`)})`, narrow.every((n) => n.right <= 0.5 && n.bottom <= 0.5));
  check(`narrow: the progress bar keeps some length (${narrow.map((n) => n.bar.toFixed(0))})`, narrow.every((n) => n.bar >= 40));
}
