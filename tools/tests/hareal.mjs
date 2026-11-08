// cw-ha-card against the value shapes Home Assistant really sends (checked in core and frontend, 2026-11-01):
// temperature units, wind units, weather services without a daily forecast, media players' local pictures,
// buffering and on, and buttons the player does not support.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const make = async (entities, states, config) => {
      const card = document.createElement('cw-ha-card');
      document.body.append(card);
      card.setConfig({ entities });
      const subs = [], push = [];
      card.hass = { states, config, callService: () => {}, hassUrl: (p) => 'http://ha.local' + p,
        connection: { subscribeMessage: async (cb, msg) => { subs.push(msg); push.push(cb); return () => {}; } } };
      await wait(50);
      return { card, subs, push, els: [...card.shadowRoot.querySelectorAll('.rows > *')] };
    };
    const day = (n, h) => { const d = new Date(); d.setHours(h, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); };
    const out = {};

    // a home set to °F: weather and climate say so; the climate step is 1 without target_temp_step
    const f = await make([{ entity: 'weather.home', kind: 'weather' }, { entity: 'climate.den', kind: 'dial' }], {
      'weather.home': { state: 'sunny', attributes: { temperature: 61, temperature_unit: '°F', wind_speed: 4, wind_speed_unit: 'Beaufort' } },
      'climate.den': { state: 'heat', attributes: { current_temperature: 68, temperature: 70, min_temp: 45, max_temp: 95 } },
    }, { unit_system: { temperature: '°F' } });
    await Promise.all(f.els.map((e) => e.updateComplete));
    out.fUnits = [f.els[0].unit, f.els[1].unit, f.els[1].step];
    out.beaufort = f.els[0].now.wind;
    f.card.remove();

    // the entity's own temperature_unit beats the system's; ft/s converts; an unknown wind unit shows no wind
    const g = await make([{ entity: 'weather.a', kind: 'weather' }, { entity: 'weather.b', kind: 'weather' }, { entity: 'climate.c', kind: 'dial' }], {
      'weather.a': { state: 'cloudy', attributes: { temperature: 12, temperature_unit: '°C', wind_speed: 10, wind_speed_unit: 'ft/s' } },
      'weather.b': { state: 'cloudy', attributes: { temperature: 12, wind_speed: 10, wind_speed_unit: 'furlong/fortnight' } },
      'climate.c': { state: 'cool', attributes: { current_temperature: 24, temperature: 25, temperature_unit: '°C', target_temp_step: 1 } },
    }, { unit_system: { temperature: '°F' } });
    await Promise.all(g.els.map((e) => e.updateComplete));
    out.gUnits = [g.els[0].unit, g.els[1].unit, g.els[2].unit, g.els[2].step];
    out.winds = [g.els[0].now.wind, g.els[1].now.wind];
    g.card.remove();

    // forecast kinds: daily when offered, else twice_daily, else hourly; twice-daily and hourly fold into days
    const kinds = await make(['weather.d', 'weather.t', 'weather.h', 'weather.none'].map((e) => ({ entity: e, kind: 'weather' })), {
      'weather.d': { state: 'sunny', attributes: { supported_features: 3 } },
      'weather.t': { state: 'sunny', attributes: { supported_features: 6 } },
      'weather.h': { state: 'sunny', attributes: { supported_features: 2 } },
      'weather.none': { state: 'sunny', attributes: {} },
    });
    out.kinds = kinds.subs.map((m) => m.forecast_type);
    kinds.push[1]({ type: 'twice_daily', forecast: [
      { datetime: day(1, 6), is_daytime: true, condition: 'rainy', temperature: 14, precipitation_probability: 70 },
      { datetime: day(1, 18), is_daytime: false, condition: 'clear-night', temperature: 6, precipitation_probability: 20 },
      { datetime: day(2, 6), is_daytime: true, condition: 'sunny', temperature: 17, precipitation_probability: 0 },
      { datetime: day(2, 18), is_daytime: false, condition: 'clear-night', temperature: 8, precipitation_probability: 0 },
    ] });
    kinds.push[2]({ type: 'hourly', forecast: [9, 12, 15, 21].map((h, i) => ({ datetime: day(1, h), condition: i === 0 ? 'fog' : 'cloudy', temperature: [10, 15, 13, 7][i], precipitation_probability: [5, 40, 10, 0][i] })) });
    kinds.push[0]({ type: 'daily', forecast: null });
    kinds.push[3]({ type: 'daily', forecast: [{ datetime: day(1, 12), condition: 'sunny', temperature: 20 }] });
    await Promise.all(kinds.els.map((e) => e.updateComplete));
    const short = (d) => [d.condition, d.high, d.low, d.rain];
    out.twice = kinds.els[1].forecast.map(short);
    out.hourly = kinds.els[2].forecast.map(short);
    out.nullForecast = kinds.els[0].forecast.length;
    out.noLow = short(kinds.els[3].forecast[0]);
    kinds.card.remove();

    // media: the local picture first; buffering plays; on offers play; unsupported buttons and volume are left out
    const m = await make(['media_player.a', 'media_player.b', 'media_player.c', 'media_player.d'].map((e) => ({ entity: e, kind: 'media' })), {
      'media_player.a': { state: 'buffering', attributes: { media_title: 'A', entity_picture: '/remote.jpg', entity_picture_local: '/api/media_player_proxy/a?token=x', volume_level: 0.5, supported_features: 1 | 4 | 32 | 16384 } },
      'media_player.b': { state: 'on', attributes: { media_title: 'B', volume_level: 0.5, supported_features: 16384 } },
      'media_player.c': { state: 'playing', attributes: { media_title: 'C', volume_level: 0.5 } },
      'media_player.d': { state: 'playing', attributes: { media_title: 'D', volume_level: 0.5, supported_features: 16 | 32 } },
    });
    await Promise.all(m.els.map((e) => e.updateComplete));
    const parts = (e) => [...e.shadowRoot.querySelectorAll('button')].map((b) => b.getAttribute('part')).join(',') + (e.shadowRoot.querySelector('input[type=range]') ? ',volume' : '');
    out.art = m.els[0].now.art;
    out.mstates = m.els.map((e) => e.getAttribute('state'));
    out.buttons = m.els.map(parts);
    out.bEnabled = [...m.els[1].shadowRoot.querySelectorAll('button')].every((b) => !b.disabled);
    m.card.remove();

    // holes: found by the audit of T085
    const tzHere = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const winds = [];
    for (const v of [0, 3.6, 12, 13, -1]) {
      const w = await make([{ entity: 'weather.w', kind: 'weather' }], { 'weather.w': { state: 'windy', attributes: { wind_speed: v, wind_speed_unit: 'Beaufort' } } });
      winds.push(w.els[0].now.wind);
      w.card.remove();
    }
    out.bft = winds;

    // a day from midnight (hourly, no is_daytime) and tonight only (twice-daily and hourly in the evening)
    const today = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };
    const e = await make(['weather.h', 'weather.t', 'weather.e'].map((x) => ({ entity: x, kind: 'weather' })), {
      'weather.h': { state: 'sunny', attributes: { supported_features: 2 } },
      'weather.t': { state: 'clear-night', attributes: { supported_features: 4 } },
      'weather.e': { state: 'clear-night', attributes: { supported_features: 2 } },
    }, { time_zone: tzHere });
    e.push[0]({ type: 'hourly', forecast: [0, 3, 12, 15].map((h, i) => ({ datetime: day(1, h), condition: ['clear-night', 'clear-night', 'rainy', 'cloudy'][i], temperature: [5, 4, 12, 13][i] })) });
    e.push[1]({ type: 'twice_daily', forecast: [{ datetime: today(23), is_daytime: false, condition: 'clear-night', temperature: 4 }, { datetime: day(1, 11), is_daytime: true, condition: 'sunny', temperature: 15 }, { datetime: day(1, 23), is_daytime: false, condition: 'clear-night', temperature: 6 }] });
    e.push[2]({ type: 'hourly', forecast: [21, 22, 23].map((h) => ({ datetime: today(h), condition: 'clear-night', temperature: 30 - h })) });
    await Promise.all(e.els.map((x) => x.updateComplete));
    out.midnight = e.els[0].forecast[0].condition;
    out.tonight = [e.els[1].now.high, e.els[1].now.low, e.els[2].now.high, e.els[2].now.low];
    out.lastDay = [e.els[1].forecast[1].high, e.els[1].forecast[1].low];
    e.card.remove();

    // supported_features that arrive late or change subscribe again with the right kind
    const lateSubs = [], offs = [];
    const late = document.createElement('cw-ha-card');
    document.body.append(late);
    late.setConfig({ entities: [{ entity: 'weather.late', kind: 'weather' }] });
    const conn = { subscribeMessage: async (cb, msg) => { lateSubs.push(msg.forecast_type); return () => offs.push(msg.forecast_type); } };
    late.hass = { states: {}, connection: conn };
    late.hass = { states: { 'weather.late': { state: 'sunny', attributes: { supported_features: 4 } } }, connection: conn };
    late.hass = { states: { 'weather.late': { state: 'sunny', attributes: { supported_features: 4 } } }, connection: conn };
    await wait(20);
    late.hass = { states: { 'weather.late': { state: 'sunny', attributes: { supported_features: 2 } } }, connection: conn };
    await wait(20);
    out.late = [lateSubs.join(), offs.join()];
    late.remove();

    // days are cut at midnight in Home Assistant's time zone, and each day's time is that date's local midnight
    const k = await make([{ entity: 'weather.k', kind: 'weather' }], { 'weather.k': { state: 'sunny', attributes: {} } }, { time_zone: 'Pacific/Kiritimati' });
    const noonUtc = new Date(); noonUtc.setUTCHours(12, 0, 0, 0); noonUtc.setUTCDate(noonUtc.getUTCDate() + 1);
    k.push[0]({ type: 'daily', forecast: [{ datetime: noonUtc.toISOString(), condition: 'sunny', temperature: 30, templow: 25 }] });
    await k.els[0].updateComplete;
    const kp = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Kiritimati', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(noonUtc).map((x) => [x.type, +x.value]));
    out.kiri = [k.els[0].forecast[0].time, new Date(kp.year, kp.month - 1, kp.day).getTime()];
    k.card.remove();

    // a player that can only pause: the middle button while playing, none while paused
    const pz = await make([{ entity: 'media_player.p', kind: 'media' }, { entity: 'media_player.q', kind: 'media' }], {
      'media_player.p': { state: 'playing', attributes: { media_title: 'P', supported_features: 1 } },
      'media_player.q': { state: 'paused', attributes: { media_title: 'Q', supported_features: 1 } },
    });
    await Promise.all(pz.els.map((x) => x.updateComplete));
    out.pauseOnly = pz.els.map(parts);
    pz.card.remove();

    // units: °C step, a unit-only change, a row's own unit, no unit_system at all
    const u = await make([{ entity: 'climate.u', kind: 'dial' }, { entity: 'weather.u', kind: 'weather', unit: 'K' }], {
      'climate.u': { state: 'heat', attributes: { current_temperature: 21, temperature: 22 } },
      'weather.u': { state: 'sunny', attributes: { temperature: 290, temperature_unit: '°C' } },
    });
    await Promise.all(u.els.map((x) => x.updateComplete));
    out.units = [u.els[0].step, u.els[0].unit, u.els[1].unit];
    u.card.hass = { states: { 'climate.u': { state: 'heat', attributes: { current_temperature: 21, temperature: 22, temperature_unit: '°F' } }, 'weather.u': { state: 'sunny', attributes: { temperature: 290 } } }, callService: () => {} };
    await u.els[0].updateComplete;
    out.units.push(u.els[0].unit);
    u.card.remove();

    // holes: found by the audit of T086
    const at = (n, h) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.toISOString(); };
    const hz = await make(['weather.a', 'weather.b', 'weather.c', 'weather.d', 'weather.e'].map((x) => ({ entity: x, kind: 'weather' })), {
      'weather.a': { state: 'sunny', attributes: { supported_features: 2 } },
      'weather.b': { state: 'sunny', attributes: { supported_features: 2 } },
      'weather.c': { state: 'sunny', attributes: { supported_features: 1 } },
      'weather.d': { state: 'sunny', attributes: { supported_features: 1 } },
      'weather.e': { state: 'sunny', attributes: { supported_features: 2 } },
    }, { time_zone: tzHere });
    // 5 and 18 are night, 6 and 17 are day: only 6 and 17 count for the high; the picture is the one nearest noon, the first of a tie
    hz.push[0]({ type: 'hourly', forecast: [[5, 'fog', 45], [6, 'rainy', 35], [17, 'snowy', 30], [18, 'hail', 40]].map(([h, c, t]) => ({ datetime: at(1, h), condition: c, temperature: t })) });
    hz.push[1]({ type: 'hourly', forecast: [[11, 'rainy', 9], [13, 'snowy', 10], [12.5, 'x', NaN]].slice(0, 2).map(([h, c, t]) => ({ datetime: at(1, h), condition: c, temperature: t })) });
    // a daily forecast at midnight is still the day's; one left over from yesterday does not give today's high
    hz.push[2]({ type: 'daily', forecast: [{ datetime: at(0, 0), condition: 'sunny', temperature: 21 }] });
    hz.push[3]({ type: 'daily', forecast: [{ datetime: at(-1, 0), condition: 'rainy', temperature: 99, templow: 98 }, { datetime: at(0, 0), condition: 'sunny', temperature: 22, templow: 11 }] });
    // an unparsable datetime is skipped, the rest still shows
    hz.push[4]({ type: 'hourly', forecast: [{ datetime: 'not a time', condition: 'hail', temperature: 50 }, { datetime: at(1, 12), condition: 'cloudy', temperature: 8 }] });
    await Promise.all(hz.els.map((x) => x.updateComplete));
    out.bounds = [hz.els[0].forecast[0].condition, hz.els[0].forecast[0].high, hz.els[0].forecast[0].low];
    out.tie = hz.els[1].forecast[0].condition;
    out.midnightDaily = hz.els[2].forecast[0].high;
    out.leftover = [hz.els[3].now.high, hz.els[3].now.low];
    out.unparsable = JSON.stringify(hz.els[4].forecast.map((d) => [d.condition, d.high]));
    hz.card.remove();

    // the coldest hour of an hourly day can be in the daytime
    const cold = await make([{ entity: 'weather.f', kind: 'weather' }], { 'weather.f': { state: 'snowy', attributes: { supported_features: 2 } } }, { time_zone: tzHere });
    cold.push[0]({ type: 'hourly', forecast: [[3, 2], [12, -4], [21, 1]].map(([h, t]) => ({ datetime: at(1, h), condition: 'snowy', temperature: t })) });
    await cold.els[0].updateComplete;
    out.coldLow = cold.els[0].forecast[0].low;
    cold.card.remove();

    // a stale subscription cannot overwrite the new one
    const st = document.createElement('cw-ha-card');
    document.body.append(st);
    st.setConfig({ entities: [{ entity: 'weather.s', kind: 'weather' }] });
    const cbs = {};
    const sconn = { subscribeMessage: async (cb, msg) => { cbs[msg.forecast_type] = cb; return () => {}; } };
    st.hass = { states: { 'weather.s': { state: 'sunny', attributes: { supported_features: 4 } } }, connection: sconn };
    st.hass = { states: { 'weather.s': { state: 'sunny', attributes: { supported_features: 2 } } }, connection: sconn };
    cbs.hourly({ forecast: [{ datetime: at(1, 12), condition: 'cloudy', temperature: 5 }] });
    cbs.twice_daily({ forecast: [{ datetime: at(1, 12), is_daytime: true, condition: 'hail', temperature: 40 }] });
    const sw = st.shadowRoot.querySelector('cw-weather');
    await sw.updateComplete;
    out.stale = sw.forecast.map((d) => d.condition).join();
    st.remove();

    // a bad time zone falls back to the browser's; a new time zone cuts the days again
    const noonUtc2 = new Date(); noonUtc2.setUTCHours(12, 0, 0, 0); noonUtc2.setUTCDate(noonUtc2.getUTCDate() + 2);
    const local = (tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(noonUtc2).map((x) => [x.type, +x.value])); return new Date(p.year, p.month - 1, p.day).getTime(); };
    const zc = document.createElement('cw-ha-card');
    document.body.append(zc);
    zc.setConfig({ entities: [{ entity: 'weather.z', kind: 'weather' }] });
    let zcb;
    const zconn = { subscribeMessage: async (cb) => { zcb = cb; return () => {}; } };
    const zstates = { 'weather.z': { state: 'sunny', attributes: {} } };
    zc.hass = { states: zstates, connection: zconn, config: { time_zone: 'Mars/Olympus' } };
    const zf = { forecast: [{ datetime: noonUtc2.toISOString(), condition: 'sunny', temperature: 20 }] };
    zcb(zf);
    const zw = zc.shadowRoot.querySelector('cw-weather');
    await zw.updateComplete;
    out.badTz = [zw.forecast[0]?.time, local(undefined)];
    zc.hass = { states: zstates, connection: zconn, config: { time_zone: 'Pacific/Kiritimati' } };
    zcb(zf);
    await zw.updateComplete;
    const kiriNow = zw.forecast[0]?.time;
    zc.hass = { states: zstates, connection: zconn, config: { time_zone: 'Pacific/Pago_Pago' } };
    zcb(zf);
    await zw.updateComplete;
    out.tzChange = [kiriNow, local('Pacific/Kiritimati'), zw.forecast[0]?.time, local('Pacific/Pago_Pago')];
    zc.remove();
    return out;
  });
  check(`a °F home shows °F on weather and climate (${r.fUnits})`, r.fUnits[0] === '°F' && r.fUnits[1] === '°F');
  check(`a °F climate without target_temp_step steps by 1 (${r.fUnits[2]})`, r.fUnits[2] === 1);
  check(`Beaufort 4 is shown as about 6.7 m/s (${r.beaufort})`, r.beaufort === 6.7);
  check(`the entity's temperature_unit beats the system's (${r.gUnits})`, r.gUnits[0] === '°C' && r.gUnits[2] === '°C');
  check(`a weather without temperature_unit takes the system's (${r.gUnits[1]})`, r.gUnits[1] === '°F');
  check(`target_temp_step still sets the step (${r.gUnits[3]})`, r.gUnits[3] === 1);
  check(`10 ft/s is 3.048 m/s; an unknown unit shows no wind (${r.winds})`, Math.abs(r.winds[0] - 3.048) < 1e-9 && r.winds[1] == null);
  check(`forecast kinds: daily, twice_daily, hourly, daily when unsaid (${r.kinds})`, r.kinds.join() === 'daily,twice_daily,hourly,daily');
  check(`twice-daily folds into days: day picture, day high, night low, wettest (${JSON.stringify(r.twice)})`, JSON.stringify(r.twice) === JSON.stringify([['rainy', 14, 6, 70], ['sunny', 17, 8, 0]]));
  check(`hourly folds into a day: the picture nearest noon, highest, lowest, wettest (${JSON.stringify(r.hourly)})`, JSON.stringify(r.hourly) === JSON.stringify([['cloudy', 15, 7, 40]]));
  check(`a null forecast is an empty one (${r.nullForecast})`, r.nullForecast === 0);
  check(`a daily day without templow shows no low (${JSON.stringify(r.noLow)})`, r.noLow[1] === 20 && r.noLow[2] == null);
  check(`the local picture comes first (${r.art})`, r.art === 'http://ha.local/api/media_player_proxy/a?token=x');
  check(`buffering plays and on waits to play (${r.mstates})`, r.mstates[0] === 'playing' && r.mstates[1] === 'paused');
  check(`on can be pressed to play (${r.bEnabled})`, r.bEnabled);
  check(`only supported buttons are shown (${JSON.stringify(r.buttons)})`, JSON.stringify(r.buttons) === JSON.stringify(['play,next,volume', 'play', 'previous,play,next,volume', 'previous,next']));
  check(`holes: Beaufort 0, 3.6, 12, 13 and -1 (${r.bft})`, r.bft.join() === '0,6.7,32.7,32.7,0');
  check(`holes: an hourly day from midnight shows its daytime picture (${r.midnight})`, r.midnight === 'rainy');
  check(`holes: an evening twice_daily forecast does not show tonight as today's high (${r.tonight.slice(0, 2)})`, r.tonight[0] == null && r.tonight[1] === 4);
  check(`holes: an evening hourly forecast does not show tonight as today's high (${r.tonight.slice(2)})`, r.tonight[2] == null && r.tonight[3] === 7);
  check(`holes: a twice-daily day takes its low from the night (${r.lastDay})`, r.lastDay[0] === 15 && r.lastDay[1] === 6);
  check(`holes: a weather whose supported_features arrive late subscribes as twice_daily, once (${r.late[0]})`, r.late[0].startsWith('twice_daily') && r.late[0].split(',').filter((x) => x === 'twice_daily').length === 1);
  check(`holes: a change of supported_features ends the old subscription and starts hourly (${r.late})`, r.late[0] === 'twice_daily,hourly' && r.late[1] === 'twice_daily');
  check(`holes: days are cut at midnight in the Home Assistant time zone (${r.kiri})`, r.kiri[0] === r.kiri[1]);
  check(`holes: a pause-only player shows pause while playing and nothing while paused (${JSON.stringify(r.pauseOnly)})`, JSON.stringify(r.pauseOnly) === JSON.stringify(['play', '']));
  check(`holes: a °C climate without target_temp_step steps by 0.5 (${r.units[0]})`, r.units[0] === 0.5);
  check(`holes: a climate whose unit alone changes shows the new unit (${r.units[1]} then ${r.units[3]})`, r.units[1] === '°C' && r.units[3] === '°F');
  check(`holes: a row's own unit beats the weather's (${r.units[2]})`, r.units[2] === 'K');
  check(`holes: a home with no unit_system shows °C (${r.units[1]})`, r.units[1] === '°C');
  check(`holes: hourly 5 and 18 are night, 6 and 17 day (${r.bounds})`, r.bounds.join() === 'snowy,35,30');
  check(`holes: of two hours as near noon, the first gives the picture (${r.tie})`, r.tie === 'rainy');
  check(`holes: a daily forecast dated midnight still gives the day's high (${r.midnightDaily})`, r.midnightDaily === 21);
  check(`holes: a day left over from yesterday does not give today's high and low (${r.leftover})`, r.leftover.join() === '22,11');
  check(`holes: an unparsable datetime is skipped (${r.unparsable})`, r.unparsable === JSON.stringify([['cloudy', 8]]));
  check(`holes: the coldest hour of a day can be in the daytime (${r.coldLow})`, r.coldLow === -4);
  check(`holes: a stale subscription cannot overwrite the new forecast (${r.stale})`, r.stale === 'cloudy');
  check(`holes: a bad time zone falls back to the browser's (${r.badTz})`, r.badTz[0] === r.badTz[1]);
  check(`holes: a new time zone cuts the days again (${r.tzChange})`, r.tzChange[0] === r.tzChange[1] && r.tzChange[2] === r.tzChange[3] && r.tzChange[0] !== r.tzChange[2]);
}
