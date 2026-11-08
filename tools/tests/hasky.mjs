// cw-ha-card kind: sky: today's sunrise from sun.sun's next one by day, the next ones at night, the moon's phase.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ kind: 'sky', moon: 'sensor.moon_phase' }, { kind: 'sky', entity: 'sun.other' }] });
    const t = Date.now(), H = 3600e3, iso = (v) => new Date(v).toISOString();
    const day = { 'sun.sun': { state: 'above_horizon', attributes: { next_rising: iso(t + 20 * H), next_setting: iso(t + 4 * H) } }, 'sensor.moon_phase': { state: 'full_moon', attributes: {} } };
    card.hass = { states: day };
    const [a, b] = card.shadowRoot.querySelectorAll('cw-sky');
    await a.updateComplete;
    const out = { day: { rise: a.now.rise, set: a.now.set, phase: a.now.phase }, dayOn: a.hasAttribute('data-day'), want: [t + 20 * H - 24 * H, t + 4 * H] };
    card.hass = { states: { ...day, 'sun.sun': { state: 'below_horizon', attributes: { next_rising: iso(t + 8 * H), next_setting: iso(t + 18 * H) } }, 'sensor.moon_phase': { state: 'unavailable', attributes: {} } } };
    await a.updateComplete;
    out.night = { rise: a.now.rise, set: a.now.set, phase: a.now.phase, day: a.hasAttribute('data-day') };
    out.other = b.now.rise;
    out.size = card.getCardSize();
    card.remove();
    return out;
  });
  const p = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ kind: 'sky', moon: 'sensor.moon' }] });
    const t = Date.now(), D = 864e5, iso = (v) => new Date(v).toISOString();
    const e = card.shadowRoot.querySelector('cw-sky');
    const set = async (sun, moon, lat) => { card.hass = { config: { latitude: lat }, states: { 'sun.sun': sun, 'sensor.moon': { state: moon, attributes: {} } } }; await e.updateComplete; return { ...e.now, day: e.hasAttribute('data-day') }; };
    const out = {
      white: await set({ state: 'above_horizon', attributes: { next_rising: iso(t + 40 * D), next_setting: iso(t + 30 * D) } }, 'unknown', 69),
      dark: await set({ state: 'below_horizon', attributes: { next_rising: iso(t + 30 * D), next_setting: iso(t + 40 * D) } }, 'full_moon', -70),
    };
    // a daylight-saving change in New York (it ends 2026-11-01 02:00): on 10-31 the next sunrise is 11-01 06:30 EST; today's was 06:30 EDT
    const real = Date.now;
    Date.now = () => Date.parse('2026-10-31T12:00:00-04:00');
    out.dst = await set({ state: 'above_horizon', attributes: { next_rising: '2026-11-01T06:30:00-05:00', next_setting: '2026-10-31T17:50:00-04:00' } }, 'full_moon', 40);
    Date.now = real;
    out.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    card.remove();
    return out;
  });
  check(`holes: midnight sun: no sunrise or sunset a month away, and it is day (${JSON.stringify(p.white)})`, p.white.rise == null && p.white.set == null && p.white.up === true && p.white.day);
  check(`holes: polar night: none either, and it is night (${JSON.stringify(p.dark)})`, p.dark.rise == null && p.dark.up === false && !p.dark.day);
  check(`holes: an unknown moon has no phase; a southern latitude mirrors it (${p.white.phase}, ${p.dark.south}, ${p.white.south})`, p.white.phase === '' && p.dark.south === true && p.white.south === false);
  const dstWant = p.tz === 'America/New_York' ? Date.parse('2026-10-31T06:30:00-04:00') : Date.parse('2026-11-01T06:30:00-05:00') - 864e5;
  check(`holes: dst: today's sunrise is the same clock time a day earlier (${p.dst.rise} vs ${dstWant}, ${p.tz})`, p.dst.rise === dstWant);
  check(`by day, today's sunrise is the next one less a day (${r.day.rise} vs ${r.want[0]})`, r.day.rise === r.want[0] && r.day.set === r.want[1] && r.dayOn);
  check(`the moon's phase comes from the moon sensor (${r.day.phase})`, r.day.phase === 'full_moon');
  check(`at night the next sunrise and sunset are used as they are; it is not day (${JSON.stringify(r.night)})`, r.night.rise > Date.now() && r.night.set > r.night.rise && !r.night.day);
  check(`an unavailable moon has no phase (${r.night.phase})`, r.night.phase === '');
  check(`another sun entity can be named; a missing one shows nothing (${r.other})`, r.other == null);
  check(`card size counts the sky rows (${r.size})`, r.size === 9);
}
