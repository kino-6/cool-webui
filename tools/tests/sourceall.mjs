// <cw-source> reaches every value part: each takes its default value and its named ones; others are refused.
import { readFileSync } from 'node:fs';
export const demo = 'blank.html';

export async function run(page, check) {
  await page.addScriptTag({ path: 'dist/cw.iife.js' });
  await page.addScriptTag({ path: 'dist/cw-source.iife.js' });
  const r = await page.evaluate(async () => {
    const stage = document.createElement('cw-stage'); document.body.append(stage);
    const tags = ['switch', 'camera', 'media', 'agenda', 'weather', 'dial', 'battery', 'vacuum', 'timer', 'cover', 'person', 'area', 'sky', 'alarm', 'todo', 'floorplan', 'flow', 'ring'];
    for (const t of tags) { const e = document.createElement('cw-' + t); e.id = t; stage.append(e); }
    const src = document.createElement('cw-source'); src.setAttribute('kind', 'message'); stage.append(src);
    const errors = []; src.addEventListener('cw-source-error', (e) => errors.push(e.detail.code));
    const t = Date.now();
    src.handle([
      { to: '#switch', op: 'set', value: true }, { to: '#switch', op: 'set', prop: 'level', value: 0.4 },
      { to: '#camera', op: 'set', value: 'img/garden.svg' },
      { to: '#media', op: 'set', value: { title: '曲', state: 'playing' } },
      { to: '#agenda', op: 'set', value: [{ title: '会議', start: t + 3600e3 }] },
      { to: '#weather', op: 'set', value: { condition: 'sunny', temp: 20 } }, { to: '#weather', op: 'set', prop: 'forecast', value: [{ time: t, condition: 'rainy', high: 10 }] },
      { to: '#dial', op: 'set', value: 21.5 }, { to: '#dial', op: 'set', prop: 'target', value: 22 },
      { to: '#battery', op: 'set', value: [{ name: '電池', level: 30 }] },
      { to: '#vacuum', op: 'set', value: { state: 'cleaning' } },
      { to: '#timer', op: 'set', value: { state: 'paused', remaining: 90 } },
      { to: '#cover', op: 'set', value: { state: 'open', position: 40 } },
      { to: '#person', op: 'set', value: [{ name: 'A', place: 'home' }] },
      { to: '#area', op: 'set', value: { temperature: 21 } },
      { to: '#sky', op: 'set', value: { phase: 'full_moon' } },
      { to: '#alarm', op: 'set', value: { state: 'disarmed' } },
      { to: '#todo', op: 'set', value: [{ uid: '1', summary: '牛乳', status: 'needs_action' }] },
      { to: '#floorplan', op: 'set', value: [{ id: 'a', name: '居間', x: 0, y: 0, w: 4, h: 3, on: true }] }, { to: '#floorplan', op: 'set', prop: 'focus', value: 'a' },
      { to: '#flow', op: 'set', prop: 'nodes', value: [{ id: 'a' }, { id: 'b' }] }, { to: '#flow', op: 'set', value: [{ from: 'a', to: 'b', value: 100 }] },
      { to: '#ring', op: 'set', value: 'ようこそ' },
    ]);
    const $ = (id) => document.getElementById(id);
    await Promise.all(tags.map((x) => $(x).updateComplete));
    const got = {
      switch: [$('switch').on, $('switch').level], camera: $('camera').src, media: $('media').now.title, agenda: $('agenda').events.length,
      weather: [$('weather').now.temp, $('weather').forecast.length], dial: [$('dial').value, $('dial').target], battery: $('battery').items.length,
      vacuum: $('vacuum').now.state, timer: $('timer').now.remaining, cover: $('cover').now.position, person: $('person').people.length, area: $('area').now.temperature,
      sky: $('sky').now.phase, alarm: $('alarm').now.state, todo: $('todo').items.length, floorplan: [$('floorplan').rooms.length, $('floorplan').focus],
      flow: [$('flow').nodes.length, $('flow').links.length], ring: $('ring').text,
    };
    const before = errors.length;
    src.handle([{ to: '#alarm', op: 'set', prop: 'innerHTML', value: 'x' }, { to: '#battery', op: 'push', value: {} }, { to: '#switch', op: 'set', prop: 'label', value: 'x' }]);
    return { got, errors: errors.slice(0, before), refused: errors.slice(before) };
  });
  const g = r.got;
  check(`no errors while reaching every part (${r.errors})`, r.errors.length === 0);
  check(`switch on and level, camera src, media now (${g.switch}, ${g.camera}, ${g.media})`, g.switch.join() === 'true,0.4' && g.camera === 'img/garden.svg' && g.media === '曲');
  check(`agenda events, weather now and forecast, dial value and target (${g.agenda}, ${g.weather}, ${g.dial})`, g.agenda === 1 && g.weather.join() === '20,1' && g.dial.join() === '21.5,22');
  check(`battery, vacuum, timer, cover, person, area (${g.battery}, ${g.vacuum}, ${g.timer}, ${g.cover}, ${g.person}, ${g.area})`, g.battery === 1 && g.vacuum === 'cleaning' && g.timer === 90 && g.cover === 40 && g.person === 1 && g.area === 21);
  check(`sky, alarm, todo, floor plan rooms and focus, flow nodes and links, ring text (${g.sky}, ${g.alarm}, ${g.todo}, ${g.floorplan}, ${g.flow}, ${g.ring})`,
    g.sky === 'full_moon' && g.alarm === 'disarmed' && g.todo === 1 && g.floorplan.join() === '1,a' && g.flow.join() === '2,1' && g.ring === 'ようこそ');
  check(`innerHTML, push to a set-only part and a prop outside the list are refused (${r.refused})`, r.refused.join() === 'bad-prop,bad-op,bad-prop');
  // every rule in src/source.js: each value it allows can be set, and innerHTML is refused, on every part
  const rules = [...readFileSync('src/source.js', 'utf8').matchAll(/'(cw-[a-z]+)': \{ set: \[([^\]]*)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'(\w+)'/g)].map((x) => x[1])]);
  const all = await page.evaluate(async (list) => {
    const sample = { now: {}, items: [], people: [], events: [], forecast: [], rooms: [], nodes: [], links: [], data: [], value: 1, state: 'online', since: Date.now(), text: 'x', on: true, level: 0.5, color: '#ffffff', src: '', target: 20, focus: '' };
    const stage = document.createElement('cw-stage'); document.body.append(stage);
    const src = document.createElement('cw-source'); src.setAttribute('kind', 'message'); stage.append(src);
    const errors = []; src.addEventListener('cw-source-error', (e) => errors.push(e.detail.code));
    const out = { failed: [], refused: 0, parts: list.length, props: 0 };
    for (const [tag, props] of list) {
      const el = document.createElement(tag); el.id = 'x-' + tag; stage.append(el);
      for (const prop of props) {
        const n = errors.length;
        src.handle({ to: '#' + el.id, op: 'set', prop, value: sample[prop] });
        out.props++;
        if (errors.length > n) out.failed.push(`${tag}.${prop}`);
      }
      const n = errors.length;
      src.handle({ to: '#' + el.id, op: 'set', prop: 'innerHTML', value: '<b>x</b>' });
      // refused as a value the part does not have (bad-prop), or, for parts that take push only, as a set at all (bad-op)
      if ((errors[n] === 'bad-prop' || (props.length === 0 && errors[n] === 'bad-op')) && !el.innerHTML.includes('<b>')) out.refused++;
    }
    return out;
  }, rules);
  check(`every value in every rule can be set (${all.props} values on ${all.parts} parts; failed ${all.failed})`, all.parts >= 25 && all.failed.length === 0);
  check(`innerHTML is refused on every part (${all.refused} of ${all.parts})`, all.refused === all.parts);
}
