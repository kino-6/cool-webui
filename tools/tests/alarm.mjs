// <cw-alarm>: state words, arming buttons, the keypad and a hidden code, what a press sends, pause, motion, look.
export const demo = 'alarm.html';
export const virtualTime = true;
const read = (page, sel) => page.evaluate(async (s) => {
  const e = document.querySelector(s); await e.updateComplete;
  const r = e.shadowRoot;
  return { state: r.querySelector('[part=state]').textContent.trim(), keys: r.querySelectorAll('[part=keys] button').length, input: !!r.querySelector('input[type=password]'),
    actions: [...r.querySelectorAll('[part=actions] button')].map((b) => b.textContent.trim() + (b.disabled ? ':off' : '')).join(),
    color: getComputedStyle(r.querySelector('[part=state]')).color, blink: getComputedStyle(r.querySelector('[part=state]')).animationName, aria: e.getAttribute('aria-label') };
}, sel);

export async function run(page, check) {
  const base = page.url().split('?')[0];
  const color = (v) => page.evaluate((x) => { const d = document.createElement('div'); d.style.color = `var(${x})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
  const h = await read(page, '#home');
  check(`disarmed reads 解除中 and offers the arming ways it has (${h.state}, ${h.actions})`, h.state === '解除中' && h.actions === '在宅,外出,夜間,長期不在');
  check(`arming without a code when codeArmRequired is false: no keypad, buttons ready (${h.keys})`, h.keys === 0);
  const a = await read(page, '#away');
  check(`armed away: the keypad and 解除, off until a code is typed (${a.state}, ${a.keys}, ${a.actions})`, a.state === '外出警戒' && a.keys === 11 && a.actions === '解除:off');
  check(`armed is in the accent colour, triggered in the warning colour (${a.color})`, a.color === await color('--cw-signal') && (await read(page, '#fire')).color === await color('--cw-warn'));
  const o = await read(page, '#open');
  check(`no code: no keypad, arming buttons ready (${o.keys}, ${o.actions})`, o.keys === 0 && o.actions === '在宅,外出');
  const t = await read(page, '#text');
  check(`a text code is a password field (${t.input}, ${t.keys})`, t.input && t.keys === 0 && t.state === '夜間警戒');
  const n = await read(page, '#none');
  check(`no state: a dash and no buttons (${n.state}, ${n.actions}, ${n.aria})`, n.state === '—' && n.actions === '' && n.aria === '防犯');
  const typed = await page.evaluate(async () => {
    const e = document.querySelector('#away'), r = e.shadowRoot, sent = [];
    e.addEventListener('cw-alarm', (ev) => sent.push(ev.detail));
    for (const k of ['1', '2', '3', '4']) [...r.querySelectorAll('[part=keys] button')].find((b) => b.textContent.trim() === k).click();
    await e.updateComplete;
    const shown = r.querySelector('[part=code]').textContent.trim(), label = r.querySelector('[part=code]').getAttribute('aria-label'), html = r.innerHTML;
    const ready = !r.querySelector('[part=disarm]').disabled;
    r.querySelector('[part=disarm]').click(); await e.updateComplete;
    return { shown, label, leaked: html.includes('1234') || e.getAttribute('aria-label').includes('1234'), ready, sent, state: e.getAttribute('state'), after: r.querySelector('[part=code]')?.textContent.trim() ?? '' };
  });
  check(`typed digits show as dots and are read only as a count (${typed.shown}, ${typed.label})`, typed.shown === '●●●●' && typed.label === '暗証番号 4 文字');
  check(`the code is nowhere in the page (${typed.leaked})`, typed.leaked === false);
  check(`with a code 解除 can be pressed and sends disarm with it (${typed.ready}, ${JSON.stringify(typed.sent)})`, typed.ready && JSON.stringify(typed.sent) === JSON.stringify([{ action: 'disarm', code: '1234' }]));
  check(`after a press: 解除に切り替え中 and the code is gone (${typed.state}, '${typed.after}')`, typed.state === 'disarming' && typed.after === '');
  const arm = await page.evaluate(async () => {
    const e = document.querySelector('#open'), sent = [];
    e.addEventListener('cw-alarm', (ev) => sent.push(ev.detail));
    e.shadowRoot.querySelector('[part=arm_away]').click(); await e.updateComplete;
    const n = document.querySelector('#narrow'); n.shadowRoot.querySelector('[part=keys] button').click(); n.shadowRoot.querySelector('[part=clear]').click(); await n.updateComplete;
    return { sent, state: e.getAttribute('state'), cleared: n.shadowRoot.querySelector('[part=code]').textContent.trim(), off: n.shadowRoot.querySelector('[part=disarm]').disabled };
  });
  check(`arming without a code sends no code (${JSON.stringify(arm.sent)}, ${arm.state})`, JSON.stringify(arm.sent) === JSON.stringify([{ action: 'arm_away' }]) && arm.state === 'arming');
  check(`消す clears the code and 解除 is off again (${arm.cleared}, ${arm.off})`, arm.cleared === '' && arm.off);
  const held = await page.evaluate(async () => {
    const s = document.querySelector('#board'), e = document.querySelector('#fire');
    s.pause(); await s.updateComplete;
    e.now = { state: 'disarmed' }; await e.updateComplete;
    const during = e.shadowRoot.querySelector('[part=state]').textContent;
    s.resume(); await s.updateComplete; await e.updateComplete;
    return [during, e.shadowRoot.querySelector('[part=state]').textContent];
  });
  check(`paused: a new state waits (${held})`, held.join() === '発報,解除中');
  // holes found by the audit of T112
  const hh = await page.evaluate(async () => {
    const logs = [], orig = {};
    for (const k of ['log', 'info', 'warn', 'error', 'debug']) { orig[k] = console[k]; console[k] = (...a) => { logs.push(a.join(' ')); orig[k](...a); }; }
    const events = [];
    const e = document.createElement('cw-alarm'); e.label = '試し'; document.body.append(e);
    for (const t of ['click', 'input', 'change', 'cw-alarm', 'keydown']) e.addEventListener(t, (ev) => { if (t === 'cw-alarm') events.push(ev.detail); });
    const press = (k) => [...e.shadowRoot.querySelectorAll('[part=keys] button')].find((b) => b.textContent.trim() === k).click();
    const out = {};
    // arming that needs the code: keypad shown, buttons off until typed
    e.now = { state: 'disarmed', codeFormat: 'number', codeArmRequired: true, modes: ['home', 'away', 'custom_bypass'] }; await e.updateComplete;
    out.armNeeds = [e.shadowRoot.querySelectorAll('[part=keys] button').length, [...e.shadowRoot.querySelectorAll('[part=actions] button')].every((b) => b.disabled)];
    press('7'); press('3'); await e.updateComplete;
    out.typed = e.shadowRoot.querySelector('[part=code]').textContent.trim();
    // every attribute in the part and on the host, and every log, without the code
    const attrs = [...e.attributes].map((a) => a.value).concat([...e.shadowRoot.querySelectorAll('*')].flatMap((x) => [...x.attributes].map((a) => a.value)));
    out.leak = attrs.some((v) => v.includes('73')) || logs.some((l) => l.includes('73'));
    e.shadowRoot.querySelector('[part=clear]').click(); await e.updateComplete;
    out.cleared = e.shadowRoot.querySelector('[part=code]').textContent.trim();
    // a half-typed code is dropped when Home Assistant changes the state or the rule
    e.now = { state: 'armed_home', codeArmRequired: false }; await e.updateComplete;
    press('1'); press('2'); await e.updateComplete;
    e.now = { state: 'disarmed' }; await e.updateComplete;
    e.shadowRoot.querySelector('[part=arm_home]').click(); await e.updateComplete;
    out.dropped = JSON.stringify(events.at(-1));
    // the keyboard: digits, Backspace and Enter
    e.now = { state: 'armed_away' }; await e.updateComplete;
    e.focus();
    for (const k of ['1', '2', '3', '9', 'Backspace', '4', 'Enter']) e.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));
    await e.updateComplete;
    out.keyboard = JSON.stringify(events.at(-1));
    // triggered and arming offer 解除; outside full a trigger does not blink
    const words = [];
    for (const st of ['triggered', 'arming', 'pending']) { e.now = { state: st }; await e.updateComplete; words.push([...e.shadowRoot.querySelectorAll('[part=actions] button')].map((b) => b.textContent.trim()).join()); }
    out.words = words;
    out.calmBlink = getComputedStyle(e.shadowRoot.querySelector('[part=state]')).animationName;
    out.logLeak = logs.some((l) => /1234|12|73/.test(l));
    for (const k of Object.keys(orig)) console[k] = orig[k];
    e.remove();
    return out;
  });
  check(`holes: arming that needs the code shows the keypad and waits for it (${hh.armNeeds})`, hh.armNeeds[0] === 11 && hh.armNeeds[1] === true);
  check(`holes: the code is in no attribute and no log (${hh.leak}, ${hh.logLeak})`, hh.leak === false && hh.logLeak === false);
  check(`holes: 消す clears two typed digits (${hh.typed} -> '${hh.cleared}')`, hh.typed === '●●' && hh.cleared === '');
  check(`holes: a state change from Home Assistant drops a half-typed code (${hh.dropped})`, hh.dropped === JSON.stringify({ action: 'arm_home' }));
  check(`holes: digits, Backspace and Enter on the keyboard (${hh.keyboard})`, hh.keyboard === JSON.stringify({ action: 'disarm', code: '1234' }));
  check(`holes: triggered, arming and pending offer 解除 (${hh.words})`, hh.words.every((w) => w === '解除'));
  check(`holes: outside full a triggered alarm does not blink (${hh.calmBlink})`, hh.calmBlink === 'none');
  await page.goto(`${base}?motion=full`, { waitUntil: 'load' });
  const f = await read(page, '#fire'), fa = await read(page, '#away');
  check(`full: triggered blinks, armed does not (${f.blink}, ${fa.blink})`, f.blink === 'blink' && fa.blink === 'none');
  const fp = await page.evaluate(async () => { const s = document.querySelector('#board'); s.pause(); await s.updateComplete; const e = document.querySelector('#fire'); await e.updateComplete; return getComputedStyle(e.shadowRoot.querySelector('[part=state]')).animationName; });
  check(`full but paused: it stops blinking (${fp})`, fp === 'none');
  const nr = await page.evaluate(() => { const e = document.querySelector('#narrow'); return [...e.shadowRoot.querySelectorAll('[part=keys] button')].every((b) => b.scrollHeight <= b.clientHeight + 1 && b.getBoundingClientRect().height < 40); });
  check(`a narrow keypad keeps each key on one line (${nr})`, nr);
}
