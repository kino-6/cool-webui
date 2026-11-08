// cw-ha-card kind: camera: the entity's picture address (with its token) becomes the camera's src.
export const demo = 'ha-card.html?still';
// the page's clock is Chrome's virtual one: waits pass at once
export const virtualTime = true;
export const allowConsole = /Failed to load resource|ERR_FILE_NOT_FOUND/;

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noEntity = tryCfg({ entities: [{ kind: 'camera' }] });
    card.setConfig({ entities: [{ entity: 'camera.garden', kind: 'camera', refresh: 3, height: 240 }, { entity: 'camera.gone', kind: 'camera', label: '車庫' }] });
    const states = (tok) => ({
      'camera.garden': { state: 'idle', attributes: { friendly_name: '庭', entity_picture: `img/garden.svg?token=${tok}` } },
      'camera.gone': { state: 'unavailable', attributes: {} },
    });
    card.hass = { states: states('a1'), hassUrl: (p) => p };
    const [g, x] = card.shadowRoot.querySelectorAll('cw-camera');
    await window.__wait(400);
    await g.updateComplete;
    const first = { src: g.src, label: g.label, refresh: g.refresh, h: g.getBoundingClientRect().height, state: g.getAttribute('state'), shown: g.shadowRoot.querySelector('img')?.getAttribute('src') ?? '',
      gone: x.getAttribute('state'), goneLabel: x.label, size: card.getCardSize() };
    const frames = +g.dataset.frames;
    card.hass = { states: states('a1'), hassUrl: (p) => p };
    await window.__wait(200);
    const same = +g.dataset.frames;
    card.hass = { states: states('b2'), hassUrl: (p) => p };
    await g.updateComplete;
    await window.__wait(300);
    const rotated = { src: g.src, frames: +g.dataset.frames };
    card.setConfig({ entities: [{ entity: 'camera.garden', kind: 'camera' }] });
    card.hass = { states: states('c3'), hassUrl: (p) => 'http://ha.local:8123' + p };
    const abs = card.shadowRoot.querySelector('cw-camera').src;
    card.remove();
    return { noEntity, first, frames, same, rotated, abs };
  });
  check(`a camera row needs an entity (${r.noEntity})`, /entity/.test(r.noEntity));
  check(`the picture address with its token becomes the src (${r.first.src}; shown ${r.first.shown})`, r.first.src === 'img/garden.svg?token=a1' && r.first.state === 'online' && /^img\/garden\.svg\?token=a1&_=/.test(r.first.shown));
  check(`the name comes from HA, refresh and height from the config (${r.first.label}, ${r.first.refresh}, ${r.first.h}px)`, r.first.label === '庭' && r.first.refresh === 3 && Math.abs(r.first.h - 240) < 1);
  check(`an unavailable camera says 映像なし with the configured name (${r.first.gone}, ${r.first.goneLabel})`, r.first.gone === 'offline' && r.first.goneLabel === '車庫');
  check(`the same state again does not fetch again (${r.frames} -> ${r.same})`, r.same === r.frames);
  check(`a new token fetches at the new address (${JSON.stringify(r.rotated)})`, r.rotated.src === 'img/garden.svg?token=b2' && r.rotated.frames === r.frames + 1);
  check(`a relative address goes through hass.hassUrl (${r.abs})`, r.abs === 'http://ha.local:8123img/garden.svg?token=c3');
  check(`card size counts the camera height (${r.first.size})`, r.first.size >= 1 + 240 / 50 + 200 / 50 && r.first.size <= 1 + 240 / 50 + 200 / 50 + 1);
}
