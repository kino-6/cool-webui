// <cw-camera>: a refreshed still or a video with its name and the time of the last frame; offline when nothing arrives.
export const demo = 'camera.html';
// the missing image and video are on purpose
export const allowConsole = /Failed to load resource|ERR_FILE_NOT_FOUND/;
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot, img = r.querySelector('img'), media = r.querySelector('img, video');
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  return { state: e.getAttribute('state'), frames: +e.dataset.frames, src: media?.getAttribute('src') ?? '', natural: img?.naturalWidth ?? 0,
    mediaShown: vis(media), fit: media ? getComputedStyle(media).objectFit : '', label: r.querySelector('[part=label]')?.textContent.trim(),
    time: r.querySelector('[part=time]')?.textContent.trim() ?? '', empty: vis(r.querySelector('[part=empty]')) ? r.querySelector('[part=empty]').textContent.trim() : '',
    rec: getComputedStyle(r.querySelector('[part=rec]')).animationName, corners: [...r.querySelectorAll('[part=corner]')].map((c) => getComputedStyle(c).borderTopColor),
    role: e.getAttribute('role'), aria: e.getAttribute('aria-label') ?? '', tag: media?.localName,
    video: media?.localName === 'video' ? { muted: media.muted, autoplay: media.autoplay, inline: media.playsInline } : null };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  await page.wait(500);
  const g = await read(page, '#garden');
  check(`a still loads and fills the box (${g.state}, ${g.natural}px, ${g.fit})`, g.state === 'online' && g.natural > 0 && g.mediaShown && g.fit === 'cover');
  check(`the name and the time of the last frame sit on the picture (${g.label}, ${g.time})`, g.label === '庭' && /^\d{2}:\d{2}:\d{2}$/.test(g.time));
  check(`it is read as one picture with its name and time (${g.role}, ${g.aria})`, g.role === 'img' && g.aria.startsWith('庭') && g.aria.includes(g.time));
  await page.wait(1600);
  const g2 = await read(page, '#garden');
  check(`refresh=1 fetches again with a new address each time (${g.frames} -> ${g2.frames}; ${g2.src})`, g2.frames >= g.frames + 1 && g2.src !== g.src && g2.src.startsWith('img/garden.svg?'));
  const d = await read(page, '#door');
  check(`refresh=0 loads once (${d.frames})`, d.state === 'online' && d.frames === 1);
  const x = await read(page, '#gone');
  check(`a picture that does not arrive says 映像なし and hides the broken image (${x.state}, ${x.empty}, ${x.mediaShown})`, x.state === 'offline' && x.empty === '映像なし' && !x.mediaShown && x.time === '');
  const v = await read(page, '#clip');
  check(`video plays muted, inline, on its own (${JSON.stringify(v.video)})`, v.tag === 'video' && v.video?.muted && v.video?.autoplay && v.video?.inline);
  check(`a video that does not arrive is offline too (${v.state})`, v.state === 'offline' && v.empty === '映像なし');

  // a new src loads at once
  const swap = await page.evaluate(async () => {
    const e = document.querySelector('#gone'); e.src = 'img/entrance.svg';
    await window.__wait(400); await e.updateComplete;
    return e.getAttribute('state');
  });
  check(`changing src loads the new picture (${swap})`, swap === 'online');

  // paused: no fetching; resume fetches at once
  const held = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#garden');
    stage.pause(); await stage.updateComplete;
    const a = +e.dataset.frames;
    await window.__wait(1600);
    const b = +e.dataset.frames;
    stage.resume(); await stage.updateComplete;
    await window.__wait(300);
    return [a, b, +e.dataset.frames];
  });
  check(`paused: no fetching; resume fetches at once (${held})`, held[0] === held[1] && held[2] === held[1] + 1);

  // motion: the recording dot blinks only in full
  check(`four corner marks in the accent (${g.corners})`, g.corners.length === 4 && g.corners.every((c) => c === 'rgb(74, 144, 194)'));
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  await page.wait(500);
  const f = await read(page, '#garden'), fx = await read(page, '#gone');
  check(`calm: the recording dot is still (${g.rec}); full: it blinks while pictures arrive (${f.rec}), not when offline (${fx.rec})`, g.rec === 'none' && f.rec === 'blink' && fx.rec === 'none');

  await page.goto(`${base}?theme=game`, { waitUntil: 'load' });
  await page.wait(500);
  const gm = await page.evaluate(() => {
    const r = document.querySelector('#garden').shadowRoot;
    return { corner: getComputedStyle(r.querySelector('[part=corner]')).borderTopColor, label: getComputedStyle(r.querySelector('[part=label]')).transform, bg: getComputedStyle(r.querySelector('[part=label]')).backgroundColor };
  });
  check(`game: amber corners and a slanted name slab (${JSON.stringify(gm)})`, gm.corner === 'rgb(255, 194, 26)' && gm.label.startsWith('matrix(') && gm.bg === 'rgb(255, 194, 26)');
  // holes found by the T070 audit
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  await page.wait(500);
  const dark = await page.evaluate(async () => {
    // the same address stops answering: the next fetch fails (a stand-in Image fails it), the src stays
    const e = document.querySelector('#garden'), Real = window.Image, stage = document.querySelector('#board');
    window.Image = class { set src(v) { setTimeout(() => this.onerror(), 0); } };
    stage.pause(); await stage.updateComplete; stage.resume(); await stage.updateComplete;
    await window.__wait(50); await e.updateComplete;
    window.Image = Real;
    const img = e.shadowRoot.querySelector('img');
    return { state: e.getAttribute('state'), img: img ? getComputedStyle(img).display : 'gone', time: e.shadowRoot.querySelector('[part=time]').textContent.trim(), aria: e.getAttribute('aria-label') };
  });
  check(`holes: a camera that goes dark after a frame hides the old picture and its time (${JSON.stringify(dark)})`, dark.state === 'offline' && dark.img === 'none' && dark.time === '' && dark.aria === '庭 映像なし');
  const vid = await read(page, '#clip');
  check(`holes: a video that does not arrive shows no time (${JSON.stringify(vid.time)})`, vid.state === 'offline' && vid.time === '');

  // a stand-in Image whose loads the check finishes by hand, in any order
  const order = await page.evaluate(async () => {
    const pending = [], Real = window.Image;
    window.Image = class { set src(v) { this._src = v; pending.push(this); } get src() { return this._src; } };
    const e = document.querySelector('#door'), shown = () => e.shadowRoot.querySelector('img')?.getAttribute('src') ?? '';
    const before = shown();
    e.src = 'img/garden.svg'; await e.updateComplete;
    e.src = 'img/entrance.svg?token=demo'; await e.updateComplete;
    const keep = shown();
    const [oldOne, newOne] = pending;
    newOne.onload(); await e.updateComplete;
    oldOne.onload(); await e.updateComplete;
    const after = shown();
    window.Image = Real;
    return { before, keep, after, n: pending.length };
  });
  check(`holes: the old frame stays until the new one has arrived (${order.keep})`, order.keep === order.before && order.before !== '');
  check(`holes: a late picture from the old src is dropped (${order.after})`, /^img\/entrance\.svg\?token=demo&_=/.test(order.after) && order.n === 2);
  check(`holes: an address that already has ?token= keeps it and adds &_= (${order.after})`, order.after.includes('?token=demo&_='));

  const still = await page.evaluate(async () => {
    const stage = document.querySelector('#board'), e = document.querySelector('#gone');
    e.src = 'img/garden.svg'; await window.__wait(400);
    const before = getComputedStyle(e.shadowRoot.querySelector('[part=rec]')).animationName;
    stage.pause(); await stage.updateComplete;
    const during = getComputedStyle(e.shadowRoot.querySelector('[part=rec]')).animationName;
    stage.resume(); await stage.updateComplete;
    return [before, during];
  });
  check(`holes: paused in full the dot is still (${still})`, still[0] === 'blink' && still[1] === 'none');

  const gone = await page.evaluate(async () => {
    const e = document.querySelector('#gone'); e.refresh = 0.3; e.src = 'img/entrance.svg';
    await window.__wait(700);
    e.remove();
    const a = +e.dataset.frames;
    await window.__wait(1200);
    return [a, +e.dataset.frames];
  });
  check(`holes: a removed camera stops fetching (${gone})`, gone[1] <= gone[0] + 1 && gone[0] >= 2);

  const narrow = await page.evaluate(async () => {
    const e = document.createElement('cw-camera');
    Object.assign(e.style, { position: 'fixed', left: '0', top: '0', width: '200px', height: '120px' });
    e.label = 'とても長い名前のカメラ・北側の庭の奥'; e.src = 'img/garden.svg'; e.refresh = 0;
    document.body.append(e);
    await window.__wait(400); await e.updateComplete;
    const t = e.shadowRoot.querySelector('[part=time]'), hr = e.getBoundingClientRect(), tr = t.getBoundingClientRect();
    const out = { text: t.textContent.trim(), sw: t.scrollWidth, cw: t.clientWidth, inside: tr.right <= hr.right + 0.5 };
    e.remove();
    return out;
  });
  check(`holes: in a 200x120 box the time is whole (${JSON.stringify(narrow)})`, /^\d{2}:\d{2}:\d{2}$/.test(narrow.text) && narrow.sw <= narrow.cw && narrow.inside);

  const overlap = await page.evaluate(() => {
    const c = document.querySelector('#clip').getBoundingClientRect();
    const hit = (r) => !(r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom);
    const pause = document.querySelector('#board').shadowRoot.querySelector('[part=pause]')?.getBoundingClientRect();
    return [...document.querySelectorAll('cw-panel')].filter((p) => hit(p.getBoundingClientRect())).length + (pause && hit(pause) ? 1 : 0);
  });
  check(`holes: the demo video box overlaps no panel and not the pause button (${overlap})`, overlap === 0);
}
