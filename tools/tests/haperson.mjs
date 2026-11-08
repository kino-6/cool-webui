// cw-ha-card kind: person: listed people or every person entity, place, since from last_changed, photos through hassUrl.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ kind: 'person' }, { kind: 'person', entities: ['person.hal', 'person.gone'] }] });
    const ago = (m) => new Date(Date.now() - m * 60e3).toISOString();
    const states = {
      'person.aoi': { state: 'home', last_changed: ago(25), attributes: { friendly_name: 'アオイ', entity_picture: '/api/image/serve/abc/512x512' } },
      'person.hal': { state: 'not_home', last_changed: ago(185), attributes: { friendly_name: 'ハル' } },
      'person.sora': { state: '学校', last_changed: ago(60), attributes: { friendly_name: 'ソラ' } },
      'person.off': { state: 'unknown', last_changed: ago(1), attributes: { friendly_name: '不明な人' } },
      'device_tracker.phone': { state: 'home', attributes: {} },
    };
    card.hass = { states, hassUrl: (p) => 'http://ha.local' + p };
    const [all, listed] = card.shadowRoot.querySelectorAll('cw-person');
    await Promise.all([all, listed].map((e) => e.updateComplete));
    const labels = (e) => [...e.shadowRoot.querySelectorAll('[part=person]')].map((x) => x.getAttribute('aria-label'));
    const out = { all: labels(all), listed: labels(listed), pic: all.people.find((p) => p.name === 'アオイ').picture };
    let sets = 0;
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(all), 'people');
    Object.defineProperty(all, 'people', { get: desc.get, set(v) { sets++; desc.set.call(this, v); }, configurable: true });
    card.hass = { states: { ...states }, hassUrl: (p) => 'http://ha.local' + p };
    out.sets = sets;
    card.hass = { states: { ...states, 'person.hal': { ...states['person.hal'], state: 'home', last_changed: ago(0) } }, hassUrl: (p) => 'http://ha.local' + p };
    await all.updateComplete;
    out.sets2 = sets;
    out.after = labels(all)[0];
    card.remove();
    return out;
  });
  check(`without entities every person, home first; since from last_changed (${JSON.stringify(r.all)})`,
    JSON.stringify(r.all) === JSON.stringify(['アオイ 在宅 25分前から', 'ハル 外出 3時間前から', 'ソラ 学校 1時間前から', '不明な人 不明']));
  const v = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    const bad = (() => { try { card.setConfig({ entities: [{ kind: 'person', entities: 'person.aoi' }] }); return 'ok'; } catch (e) { return e.message; } })();
    card.setConfig({ entities: [{ kind: 'person', entities: ['person.off'] }] });
    const size = card.getCardSize();
    card.hass = { states: { 'person.off': { state: 'unavailable', last_changed: new Date().toISOString(), attributes: { friendly_name: '切れた人' } } } };
    const e = card.shadowRoot.querySelector('cw-person'); await e.updateComplete;
    const label = e.shadowRoot.querySelector('[part=person]').getAttribute('aria-label');
    card.remove();
    return { bad, size, label };
  });
  check(`entities must be a list of ids (${v.bad})`, /list of entity ids/.test(v.bad));
  check(`card size counts a person row (${v.size})`, v.size === 5);
  check(`unavailable is unknown with no since (${v.label})`, v.label === '切れた人 不明');
  check(`the photo goes through hassUrl (${r.pic})`, r.pic === 'http://ha.local/api/image/serve/abc/512x512');
  check(`listed people only; a missing one is unknown (${JSON.stringify(r.listed)})`, JSON.stringify(r.listed) === JSON.stringify(['ハル 外出 3時間前から', 'person.gone 不明']));
  check(`the same states do not set it again; someone coming home does (${r.sets}, ${r.sets2}, ${r.after})`, r.sets === 0 && r.sets2 === 1 && r.after === 'アオイ 在宅 25分前から');
}
