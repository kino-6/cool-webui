// cw-ha-card kind: agenda (calendar API), weather (state + forecast subscription), dial (climate or a sensor).
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    const tryCfg = (cfg) => { try { card.setConfig(cfg); return 'ok'; } catch (e) { return e.message; } };
    const noEntity = ['agenda', 'weather', 'dial'].map((k) => tryCfg({ entities: [{ kind: k }] }));
    card.setConfig({ entities: [
      { entity: 'calendar.family', kind: 'agenda', days: 3, max: 5 },
      { entity: 'weather.home', kind: 'weather', days: 4 },
      { entity: 'climate.living', kind: 'dial', label: '居間' },
      { entity: 'sensor.humidity', kind: 'dial', min: 0, max: 100 },
    ] });
    const day = (n, h) => { const d = new Date(); d.setHours(h, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
    const api = [], subs = [], calls = [];
    let push;
    const states = {
      'weather.home': { state: 'rainy', attributes: { temperature: 12.4, humidity: 81, wind_speed: 18, wind_speed_unit: 'km/h', friendly_name: '家' } },
      'climate.living': { state: 'heat', attributes: { current_temperature: 21.4, temperature: 22.5, min_temp: 7, max_temp: 35, target_temp_step: 0.5, friendly_name: 'エアコン' } },
      'sensor.humidity': { state: '48', attributes: { unit_of_measurement: '%', friendly_name: '湿度' } },
    };
    const hass = {
      states,
      callService: (d, s, data) => calls.push([d, s, data]),
      callApi: async (method, path) => {
        api.push([method, path]);
        return [
          { summary: '歯医者', start: { dateTime: day(0, 23).toISOString() }, end: { dateTime: day(0, 23).toISOString().replace(/T23/, 'T23') }, location: '駅前' },
          { summary: '燃えるごみ', start: { date: day(1, 0).toLocaleDateString('sv') }, end: { date: day(2, 0).toLocaleDateString('sv') } },
        ];
      },
      connection: { subscribeMessage: async (cb, msg) => { subs.push(msg); push = cb; return () => subs.push('unsub'); } },
    };
    card.hass = hass;
    await new Promise((res) => setTimeout(res, 100));
    // a daily forecast starts today, as Home Assistant sends it
    push({ type: 'daily', forecast: [1, 2, 3, 4, 5].map((n) => ({ datetime: day(n - 1, 9).toISOString(), condition: 'sunny', temperature: 15 + n, templow: 5 + n, precipitation_probability: n * 10 })) });
    const [agenda, weather, dial, hum] = ['cw-agenda', 'cw-weather', 'cw-dial', 'cw-dial'].map((t, i) => card.shadowRoot.querySelectorAll(t)[i === 3 ? 1 : 0]);
    await Promise.all([agenda, weather, dial, hum].map((e) => e.updateComplete));
    const out = {
      noEntity, api: JSON.stringify(api), subs: JSON.stringify(subs),
      events: agenda.events.map((e) => [e.title, e.where ?? '', !!e.allDay]),
      agendaLimits: [agenda.days, agenda.max],
      wnow: weather.now, wdays: weather.forecast.length, wfirst: weather.forecast[0], wdaysAttr: weather.days,
      dial: { value: dial.value, target: dial.target, min: dial.min, max: dial.max, step: dial.step, label: dial.label, unit: dial.unit },
      hum: { value: hum.value, target: hum.target, unit: hum.unit, label: hum.label },
    };
    dial.shadowRoot.querySelector('[part=up]').click();
    out.calls = JSON.stringify(calls);
    // the same states again do not refetch the calendar; removing the card ends the subscription
    card.hass = hass;
    await new Promise((res) => setTimeout(res, 50));
    out.apiAgain = api.length;
    card.remove();
    await new Promise((res) => setTimeout(res, 0));
    out.after = JSON.stringify(subs);
    return out;
  });
  check(`agenda, weather and dial rows need an entity (${r.noEntity})`, r.noEntity.every((m) => /entity/.test(m)));
  check(`the calendar is asked for the days shown (${r.api})`, /^\[\["GET","calendars\/calendar\.family\?start=[^&]+&end=[^"]+"\]\]$/.test(r.api));
  check(`calendar events become agenda events, all-day ones too (${JSON.stringify(r.events)})`, JSON.stringify(r.events) === JSON.stringify([['歯医者', '駅前', false], ['燃えるごみ', '', true]]));
  check(`days and max pass to the agenda (${r.agendaLimits})`, r.agendaLimits.join() === '3,5');
  check(`the weather subscribes to the daily forecast (${r.subs})`, r.subs.includes('"type":"weather/subscribe_forecast"') && r.subs.includes('"forecast_type":"daily"') && r.subs.includes('"entity_id":"weather.home"'));
  check(`weather now from the state, wind in m/s (${JSON.stringify(r.wnow)})`, r.wnow.condition === 'rainy' && r.wnow.temp === 12.4 && r.wnow.humidity === 81 && Math.abs(r.wnow.wind - 5) < 0.01);
  check(`the forecast maps high, low and rain (${JSON.stringify(r.wfirst)}, ${r.wdays}, days ${r.wdaysAttr})`, r.wfirst.high === 16 && r.wfirst.low === 6 && r.wfirst.rain === 10 && r.wfirst.condition === 'sunny' && r.wdays === 5 && r.wdaysAttr === 4);
  check(`today's high and low come from the first forecast day (${r.wnow.high}, ${r.wnow.low})`, r.wnow.high === 16 && r.wnow.low === 6);
  check(`a climate entity is a thermostat dial (${JSON.stringify(r.dial)})`, r.dial.value === 21.4 && r.dial.target === 22.5 && r.dial.min === 7 && r.dial.max === 35 && r.dial.step === 0.5 && r.dial.label === '居間' && r.dial.unit === '°C');
  check(`a sensor is a plain dial with its unit and name (${JSON.stringify(r.hum)})`, r.hum.value === 48 && Number.isNaN(r.hum.target ?? NaN) && r.hum.unit === '%' && r.hum.label === '湿度');
  check(`+ calls climate.set_temperature (${r.calls})`, r.calls === JSON.stringify([['climate', 'set_temperature', { entity_id: 'climate.living', temperature: 23 }]]));
  check(`the same states do not ask the calendar again (${r.apiAgain})`, r.apiAgain === 1);
  check(`removing the card ends the forecast subscription (${r.after})`, r.after.endsWith('"unsub"]'));
}
