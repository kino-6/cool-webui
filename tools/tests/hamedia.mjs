// cw-ha-card kind: media: a media_player's track, position and volume map onto <cw-media>; buttons call its services.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noEntity = tryCfg({ entities: [{ kind: 'media' }] });
    card.setConfig({ entities: [{ entity: 'media_player.living', kind: 'media' }, { entity: 'media_player.bed', kind: 'media' }, { entity: 'media_player.gone', kind: 'media' }] });
    const calls = [];
    const at = new Date(Date.now() - 5000).toISOString();
    const states = {
      'media_player.living': { state: 'playing', attributes: { media_title: '夜の窓辺', media_artist: 'Lumen Field', entity_picture: '/api/media_player_proxy/media_player.living?token=t1',
        media_duration: 222, media_position: 60, media_position_updated_at: at, volume_level: 0.4 } },
      'media_player.bed': { state: 'standby', attributes: {} },
      'media_player.gone': { state: 'unavailable', attributes: {} },
    };
    card.hass = { states, callService: (d, s, data) => calls.push([d, s, data]), hassUrl: (p) => 'http://ha.local:8123' + p };
    const [a, b, c] = card.shadowRoot.querySelectorAll('cw-media');
    await Promise.all([a, b, c].map((e) => e.updateComplete));
    const now = a.now;
    const words = [b, c].map((e) => [e.getAttribute('state'), e.shadowRoot.querySelector('[part=title]').textContent.trim()]);
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(a), 'now');
    Object.defineProperty(a, 'now', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states, callService: (d, s, data) => calls.push([d, s, data]), hassUrl: (p) => 'http://ha.local:8123' + p };
    for (const p of ['play', 'next', 'previous', 'play']) a.shadowRoot.querySelector(`[part=${p}]`).click();
    const range = a.shadowRoot.querySelector('input[type=range]');
    range.value = '65'; range.dispatchEvent(new Event('change'));
    const size = card.getCardSize();
    card.remove();
    return { noEntity, now, words, sets, calls, size };
  });
  check(`a media row needs an entity (${r.noEntity})`, /entity/.test(r.noEntity));
  check(`title, artist and the cover through hassUrl (${r.now.title}, ${r.now.artist}, ${r.now.art})`, r.now.title === '夜の窓辺' && r.now.artist === 'Lumen Field' && r.now.art === 'http://ha.local:8123/api/media_player_proxy/media_player.living?token=t1');
  check(`the position counts from when HA last measured it (${r.now.position.toFixed(1)} of ${r.now.duration})`, r.now.position >= 64.5 && r.now.position <= 66 && r.now.duration === 222 && r.now.state === 'playing' && r.now.volume === 0.4);
  check(`standby is idle and unavailable is off (${JSON.stringify(r.words)})`, r.words[0][0] === 'idle' && r.words[1][0] === 'off' && r.words.every((w) => w[1] === '再生していない'));
  check(`the same state again does not set the player (${r.sets})`, r.sets === 0);
  const c = JSON.stringify(r.calls);
  check(`buttons call media_pause, media_next_track, media_previous_track, media_play (${c})`,
    c === JSON.stringify([['media_player', 'media_pause', { entity_id: 'media_player.living' }], ['media_player', 'media_next_track', { entity_id: 'media_player.living' }],
      ['media_player', 'media_previous_track', { entity_id: 'media_player.living' }], ['media_player', 'media_play', { entity_id: 'media_player.living' }],
      ['media_player', 'volume_set', { entity_id: 'media_player.living', volume_level: 0.65 }]]));
  check(`card size counts the media rows (${r.size})`, r.size >= 7 && r.size <= 10);

  // holes2 (T106): a pressed play/pause goes back when Home Assistant still says otherwise 3 s later
  const back = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'media_player.stuck', kind: 'media' }] });
    const hass = () => ({ states: { 'media_player.stuck': { state: 'paused', attributes: { media_title: 'X', supported_features: 1 | 16384 } } }, callService: () => {} });
    card.hass = hass();
    const e = card.shadowRoot.querySelector('cw-media'); await e.updateComplete;
    e.shadowRoot.querySelector('[part=play]').click(); await e.updateComplete;
    const pressed = e.getAttribute('state');
    card.hass = hass();
    await new Promise((r) => setTimeout(r, 3200)); await e.updateComplete;
    const after = e.getAttribute('state');
    card.remove();
    return { pressed, after };
  });
  check(`holes2: a player Home Assistant leaves paused goes back to paused (${back.pressed} -> ${back.after})`, back.pressed === 'playing' && back.after === 'paused');
}
