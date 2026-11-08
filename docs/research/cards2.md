# よく使われる Home Assistant のカード（続き）

作成: 2026-11-03。cards.md で挙げた種類はおおむね部品集にそろったので、そこで挙げなかった種類について、次に作る部品を需要の順に決めるための調査。
印: 「調査で確認」は数字を見たもの、「推測」はそこからの判断。

## 調べ方

cards.md と同じく、追加のカードの配布元（GitHub）の星の数を需要の代わりに使った（2026-11-03 に GitHub の API で取得、調査で確認）。
種類ごとに GitHub で「〇〇 card lovelace」などを星の多い順に検索し、上位 1〜3 件の星を取った。説明文を読んで、その種類のカードでないもの（連携だけのもの、何にでも使える滑らせる部品など）は数えていない。
見つからなかった配布元は数えていない。鍵のカードは、検索で上位に出た love-lock-card が「カードを暗証番号で隠す」ものだったので外した。鍵を操作する専用のカードは見つからなかった（調査で確認）。
星は「知って、良いと思った人の数」で、使っている人の数ではない。同じ種類のカードの星を足して、種類ごとの大きさを比べた（推測）。
本体に最初からあるカード（タイル、防犯の操作盤、メーター、やること一覧など）は星が無いので数えていない。本体にあるのに追加のカードが作られている種類は、本体の版に不満がある印として読む（推測）。

## 種類ごとの需要

星の和の大きい順に並べた。

| 種類 | 主なカード | 星（調査で確認） | 本体にあるか / 部品集にあるか |
|---|---|---|---|
| 電池の残りの一覧 | battery-state-card / lovelace-entity-progress-card | 1,284 / 287 | 本体に専用のカードは無い / 無い（`<cw-bars>` で横棒は出せるが、低い順の並べ替えと絞り込みは無い） |
| 地図なしの掃除機 | vacuum-card / lovelace-xiaomi-vacuum-card | 1,270 / 281 | 本体はタイルの操作ボタン / 無い |
| 残り時間（タイマー） | timer-bar-card / TimeFlow-Card | 607 / 216 | 本体に専用のカードは無い / 無い |
| メーター | gauge-card-pro / modern-circular-gauge / dual-gauge-card | 312 / 289 / 220 | 本体にある（メーター） / ある（`<cw-dial>`） |
| 履歴・出来事の並び | history-explorer-card / logbook-card / timeline-card | 444 / 231 / 52 | 本体にある（履歴のグラフ、ログブック） / ある（`<cw-log>` `<cw-chart>`） |
| 使用量の横棒 | bar-card / power-distribution-card | 483 / 242 | 本体に専用のカードは無い / ある（`<cw-bars>`） |
| 部屋ごとのまとめ | room-card / minimalistic-area-card / area-card-plus | 320 / 145 / 106 | 本体にある（エリア） / 無い（`<cw-panel>` に部品を並べれば近い） |
| 植物 | lovelace-flower-card | 525 | 本体にある（植物の状態） / 無い |
| 横に滑らせて切り替える | swipe-card / simple-swipe-card | 326 / 135 | 本体に無い / ある（`<cw-screens>`） |
| 窓の覆い（シャッター・ブラインド） | hass-shutter-card / enhanced-shutter-card | 279 / 131 | 本体はタイルの開閉ボタン / 無い |
| タブで切り替える | tabbed-card / home-assistant-simple-tabs | 192 / 145 | 本体に無い / ある（`<cw-screens>`） |
| 時計だけ | lovelace-digital-clock / wizard-clock-card | 141 / 107 | 本体にある（時計） / ある（`<cw-clock>`） |
| 人の居場所 | person-tracker-card | 222 | 本体は地図とタイル / 無い |
| 防犯の操作盤 | alarmo-card | 194 | 本体にある（防犯の操作盤） / 無い |
| やること一覧 | todo-swipe-card / home-assistant-todo-card | 55 / 51 | 本体にある（やること一覧） / 無い |
| 扇風機 | lovelace-fan-xiaomi | 41 | 本体はタイルの風量の操作 / 無い |

補足（調査で確認）:

- history-explorer-card は元の配布元（alexarch21）が保存のみになり、SpangleLabs が引き継いでいる（星 200）。表には元の 444 だけを入れ、引き継ぎ先は足していない
- 植物の主なカード lovelace-flower-card は、追加の植物の連携 homeassistant-plant（星 877）に合わせて作られている
- 何にでも使える滑らせる部品 my-cards（174）と lovelace-big-slider-card（104）は、扇風機や覆いにも使えるが、種類を決められないので表に入れていない
- todoist-card（64）は保存のみになっているので、やること一覧の和に入れていない

## 作る順番

メーター、履歴、横棒、滑らせる・タブ、時計は部品集にすでにある。残りの種類から、カードの今の仕組み（エンティティの状態を読み、ボタンでサービスを呼ぶ）だけで受け持てるものを、星の和の大きい順に選んだ（推測）。

1. 電池の残りの一覧 cw-battery: 電池の残りを低い順に並べ、決めた値より低いものだけを色を変えて出す。星の和が 1,571 で一番大きく、センサーの数値を読むだけで作れる
2. 地図なしの掃除機 cw-vacuum: 掃除機の状態と電池の残りを出し、開始・一時停止・充電台に戻すのボタンを押せる。星の和が 1,551 で、本体のタイルにボタンがあるのに追加のカードが多いので、本体の版への不満が大きいと読める
3. 残り時間 cw-timer: タイマーの残り時間を減っていく帯か円で出し、開始・一時停止・取り消しを押せる。星の和が 823 で、本体に専用のカードが無い
4. 窓の覆い cw-cover: シャッターやブラインドの開き具合を絵で出し、滑らせて開き具合を決め、開く・止める・閉じるを押せる。星の和は 410 で、開き具合の数値と開閉のサービスだけで作れる
5. 人の居場所 cw-person: 家族ごとに顔写真と「在宅」「外出」などの状態を並べる。星は 222 と小さいが、状態と写真を読むだけで作れ、壁の画面でよく見る情報なので次に置く

後に回すもの（推測）:

- 部屋ごとのまとめ: 中身は数値や点け消しの寄せ集めで、`<cw-panel>` に今の部品を並べれば足りる。部品ではなく並べ方の話になる
- 植物: 主なカードは追加の植物の連携が前提で、本体の植物だけでは同じ値がそろわない
- 防犯の操作盤: cards.md と同じ理由で後に回す。暗証番号を扱い、alarmo-card は Alarmo の連携に合わせて作られている
- やること一覧: 項目は状態に入っておらず、サービスを呼んで返事を読む必要がある。今の仕組みでは受け持てず、星も 106 と小さい
- 扇風機: 星が 41 と小さく、`<cw-switch>` の明るさの滑りを風量に当てれば足りる見込み
- 鍵: 専用のカードが見つからなかった。壁の画面から押して開けられるようにするなら、確認の手順を先に決める必要がある

## 出典

- [maxwroc/battery-state-card](https://github.com/maxwroc/battery-state-card)
- [francois-le-ko4la/lovelace-entity-progress-card](https://github.com/francois-le-ko4la/lovelace-entity-progress-card)
- [denysdovhan/vacuum-card](https://github.com/denysdovhan/vacuum-card)
- [benct/lovelace-xiaomi-vacuum-card](https://github.com/benct/lovelace-xiaomi-vacuum-card)
- [rianadon/timer-bar-card](https://github.com/rianadon/timer-bar-card)
- [Rishi8078/TimeFlow-Card](https://github.com/Rishi8078/TimeFlow-Card)
- [benjamin-dcs/gauge-card-pro](https://github.com/benjamin-dcs/gauge-card-pro)
- [selvalt7/modern-circular-gauge](https://github.com/selvalt7/modern-circular-gauge)
- [custom-cards/dual-gauge-card](https://github.com/custom-cards/dual-gauge-card)
- [alexarch21/history-explorer-card](https://github.com/alexarch21/history-explorer-card)
- [SpangleLabs/history-explorer-card](https://github.com/SpangleLabs/history-explorer-card)
- [royto/logbook-card](https://github.com/royto/logbook-card)
- [weedpump/timeline-card](https://github.com/weedpump/timeline-card)
- [custom-cards/bar-card](https://github.com/custom-cards/bar-card)
- [JonahKr/power-distribution-card](https://github.com/JonahKr/power-distribution-card)
- [marcokreeft87/room-card](https://github.com/marcokreeft87/room-card)
- [junalmeida/homeassistant-minimalistic-area-card](https://github.com/junalmeida/homeassistant-minimalistic-area-card)
- [xBourner/area-card-plus](https://github.com/xBourner/area-card-plus)
- [Olen/lovelace-flower-card](https://github.com/Olen/lovelace-flower-card)
- [Olen/homeassistant-plant](https://github.com/Olen/homeassistant-plant)
- [bramkragten/swipe-card](https://github.com/bramkragten/swipe-card)
- [nutteloost/simple-swipe-card](https://github.com/nutteloost/simple-swipe-card)
- [Deejayfool/hass-shutter-card](https://github.com/Deejayfool/hass-shutter-card)
- [marcelhoogantink/enhanced-shutter-card](https://github.com/marcelhoogantink/enhanced-shutter-card)
- [kinghat/tabbed-card](https://github.com/kinghat/tabbed-card)
- [agoberg85/home-assistant-simple-tabs](https://github.com/agoberg85/home-assistant-simple-tabs)
- [wassy92x/lovelace-digital-clock](https://github.com/wassy92x/lovelace-digital-clock)
- [malcolmrigg/wizard-clock-card](https://github.com/malcolmrigg/wizard-clock-card)
- [djdevil/person-tracker-card](https://github.com/djdevil/person-tracker-card)
- [nielsfaber/alarmo-card](https://github.com/nielsfaber/alarmo-card)
- [nutteloost/todo-swipe-card](https://github.com/nutteloost/todo-swipe-card)
- [agoberg85/home-assistant-todo-card](https://github.com/agoberg85/home-assistant-todo-card)
- [grinstantin/todoist-card](https://github.com/grinstantin/todoist-card)
- [fineemb/lovelace-fan-xiaomi](https://github.com/fineemb/lovelace-fan-xiaomi)
- [AnthonMS/my-cards](https://github.com/AnthonMS/my-cards)
- [nicufarmache/lovelace-big-slider-card](https://github.com/nicufarmache/lovelace-big-slider-card)
- [CyrisXD/love-lock-card](https://github.com/CyrisXD/love-lock-card)
- [Home Assistant: タイル](https://www.home-assistant.io/dashboards/tile/)
- [Home Assistant: タイルの操作（features）](https://www.home-assistant.io/dashboards/features/)
- [Home Assistant: メーター](https://www.home-assistant.io/dashboards/gauge/)
- [Home Assistant: 履歴のグラフ](https://www.home-assistant.io/dashboards/history-graph/)
- [Home Assistant: ログブック](https://www.home-assistant.io/dashboards/logbook/)
- [Home Assistant: エリア](https://www.home-assistant.io/dashboards/area/)
- [Home Assistant: 植物の状態](https://www.home-assistant.io/dashboards/plant-status/)
- [Home Assistant: 時計](https://www.home-assistant.io/dashboards/clock/)
- [Home Assistant: 防犯の操作盤](https://www.home-assistant.io/dashboards/alarm-panel/)
- [Home Assistant: やること一覧](https://www.home-assistant.io/dashboards/todo-list/)
