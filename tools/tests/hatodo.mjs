// cw-ha-card kind: todo: items by the todo/item/subscribe websocket, ticking by todo.update_item, readonly by features.
export const demo = 'ha-card.html?still';

export async function run(page, check) {
  const r = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card');
    document.body.append(card);
    card.setConfig({ entities: [{ entity: 'todo.shop', kind: 'todo', done: true, max: 4 }, { entity: 'todo.ro', kind: 'todo' }] });
    const subs = [], cbs = {}, calls = [], offs = [];
    const connection = { subscribeMessage: async (cb, msg) => { subs.push(msg); cbs[msg.entity_id] = cb; return () => offs.push(msg.entity_id); } };
    const states = { 'todo.shop': { state: '2', attributes: { supported_features: 1 | 2 | 4 } }, 'todo.ro': { state: '1', attributes: { supported_features: 1 } } };
    card.hass = { states, connection, callService: (d, s, data) => calls.push([d, s, data]) };
    await new Promise((res) => setTimeout(res, 20));
    cbs['todo.shop']({ items: [{ uid: 'u1', summary: '牛乳', status: 'needs_action' }, { uid: null, summary: '卵', status: 'needs_action' }, { uid: 'u3', summary: 'パン', status: 'completed' }] });
    cbs['todo.ro']({ items: [{ uid: 'r1', summary: '見るだけ', status: 'needs_action' }] });
    const [shop, ro] = card.shadowRoot.querySelectorAll('cw-todo');
    await Promise.all([shop, ro].map((e) => e.updateComplete));
    const out = { subs: JSON.stringify(subs), rows: [...shop.shadowRoot.querySelectorAll('[part=summary]')].map((x) => x.textContent).join(), done: shop.done, max: shop.max,
      ro: ro.readonly, shopRo: shop.readonly };
    shop.shadowRoot.querySelectorAll('[part=check]')[0].click();
    shop.shadowRoot.querySelectorAll('[part=check]')[1].click();
    out.calls = JSON.stringify(calls);
    card.hass = { states: { ...states }, connection, callService: () => {} };
    out.subsAgain = subs.length;
    card.remove();
    await new Promise((res) => setTimeout(res, 0));
    out.offs = offs.join();
    return out;
  });
  check(`each row subscribes to its list's items (${r.subs})`, r.subs === JSON.stringify([{ type: 'todo/item/subscribe', entity_id: 'todo.shop' }, { type: 'todo/item/subscribe', entity_id: 'todo.ro' }]));
  check(`items from the subscription; done and max pass to the part (${r.rows}, ${r.done}, ${r.max})`, r.rows === '牛乳,卵,パン' && r.done === true && r.max === 4);
  check(`a list without UPDATE_TODO_ITEM is readonly; one with it is not (${r.ro}, ${r.shopRo})`, r.ro === true && r.shopRo === false);
  check(`ticking calls todo.update_item by uid, or by the words when there is no uid (${r.calls})`, r.calls === JSON.stringify([
    ['todo', 'update_item', { entity_id: 'todo.shop', item: 'u1', status: 'completed' }], ['todo', 'update_item', { entity_id: 'todo.shop', item: '卵', status: 'completed' }]]));
  check(`new states do not subscribe again; removing the card ends both (${r.subsAgain}, ${r.offs})`, r.subsAgain === 2 && r.offs === 'todo.shop,todo.ro');
  // holes found by the audit of T113
  const h = await page.evaluate(async () => {
    const card = document.createElement('cw-ha-card'); document.body.append(card);
    card.setConfig({ entities: [{ entity: 'todo.three', kind: 'todo', done: true }, { entity: 'todo.gone', kind: 'todo' }] });
    const cbs = {}, calls = [];
    const connection = { subscribeMessage: async (cb, msg) => { (cbs[msg.entity_id] ??= []).push(cb); return () => {}; } };
    const hass = () => ({ config: { time_zone: 'Asia/Tokyo' }, states: { 'todo.three': { state: '1', attributes: { supported_features: 1 | 2 } } }, connection, callService: (d, s, data) => calls.push([s, data.status]) });
    card.hass = hass();
    await new Promise((r) => setTimeout(r, 20));
    const [three, gone] = card.shadowRoot.querySelectorAll('cw-todo');
    cbs['todo.three'][0]({ items: [{ uid: 'd', summary: '済んだ', status: 'completed' }] });
    await three.updateComplete;
    const out = { ro: [three.readonly, gone.readonly], tz: three.timeZone };
    three.readonly = false; await three.updateComplete;
    three.shadowRoot.querySelector('[part=check]').click();
    out.calls = JSON.stringify(calls);
    // the card moved: the old subscription's late event is dropped
    card.remove(); await new Promise((r) => setTimeout(r, 0));
    document.body.append(card); card.hass = hass(); await new Promise((r) => setTimeout(r, 20));
    const fresh = card.shadowRoot.querySelectorAll('cw-todo')[0];
    cbs['todo.three'][1]({ items: [{ uid: 'n', summary: '新しい', status: 'needs_action' }] });
    cbs['todo.three'][0]({ items: [{ uid: 'o', summary: '古い', status: 'needs_action' }] });
    await fresh.updateComplete;
    out.after = fresh.items.map((x) => x.summary).join();
    card.remove();
    return out;
  });
  check(`holes: without UPDATE_TODO_ITEM (features 1|2) and without an entity, the list is readonly (${h.ro})`, h.ro.join() === 'true,true');
  check(`holes: the card passes Home Assistant's time zone (${h.tz})`, h.tz === 'Asia/Tokyo');
  check(`holes: unticking a done item calls update_item with needs_action (${h.calls})`, h.calls === JSON.stringify([['update_item', 'needs_action']]));
  check(`holes: after the card moves, the old subscription's events are dropped (${h.after})`, h.after === '新しい');
}
