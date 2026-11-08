# よく使われる Home Assistant のカード（3 回目）

作成: 2026-11-03（T108）。cards2.md の 5 つを作り終えたので、そこで後に回した種類と、まだ調べていない種類を、需要の数字と Home Assistant の本体が今出しているものの両方で見直し、実装の順番 32 以降を決めるための調査。
印: 「調査で確認」は数字や元のコードを見たもの、「推測」はそこからの判断。

## 調べ方

需要は cards.md、cards2.md と同じく、追加のカードの配布元（GitHub）の星の数で見た。2026-11-03 に GitHub の API（`https://api.github.com/repos/持ち主/名前` と星の多い順の検索）で取得した（調査で確認）。
種類ごとに「〇〇 card lovelace」「〇〇 card home assistant」で検索し、説明文を読んでその種類のカードだけを数えた。API で開けなかった配布元は数えていない。保存のみ（archived）になっている配布元も数えていない。
数えなかったもの（調査で確認）:

- home-assistant-sun-card（AitorDB、星 438）は保存のみなので、太陽と月の和に入れていない
- todoist-card（星 64）は保存のみなので、やること一覧の和に入れていない
- love-lock-card（星 153）と lovelace-pin-lock-card（星 11）は「カードを暗証番号で隠す」もので、鍵の操作ではないので外した
- Alarmo（連携、星 2,345）と homeassistant-plant（追加の植物の連携、星 877）は連携の星なので、カードの和に入れていない
- 星が 0 のカード（ha_card_keypad、ha-alarm-card など）は表に載せていない

本体の側は、home-assistant/core と home-assistant/frontend の dev の枝の元のコードを 2026-11-03 に読んだ（調査で確認）。見たのは、エンティティの状態と属性の名前、サービスの名前と引数、websocket の命令、本体のカードとタイルの操作（features）の一覧である。
「部品だけで受け持てるか」は、部品集のカード（integrations/ha-card.js）が今使っている仕組みで足りるかで決めた。今のカードは `hass.states` を読み、`callService` でサービスを呼び、予定表は `callApi`、天気の予報は `connection.subscribeMessage` で受け取っている（調査で確認）。この 3 つで足りるものを「受け持てる」とした（推測）。

## 種類ごとの需要

星の和の大きい順に並べた。和の数字は表の星を足したもの。

| 種類 | 主なカード | 星（調査で確認） | 本体にあるか / 部品集にあるか |
|---|---|---|---|
| 部屋ごとのまとめ | room-card / minimalistic-area-card / area-card-plus / hass-room-card | 320 / 145 / 106 / 51（和 622） | 本体にある（エリア） / 無い |
| 植物 | lovelace-flower-card | 525 | 本体にある（植物の状態） / 無い |
| 太陽と月 | lunar-phase-card / sun-card / sky-tonight-card | 213 / 50 / 42（和 305） | 本体に専用のカードは無い / 無い |
| 防犯の操作盤 | alarmo-card / AlarmPanel | 194 / 33（和 227） | 本体にある（防犯の操作盤、タイルの警戒の切り替え） / 無い |
| 加湿器 | mini-humidifier / humidifier-card | 163 / 2（和 165） | 本体にある（加湿器、タイルの目標の湿度） / 無い（`<cw-dial>` は温度の調節だけ） |
| やること一覧 | todo-swipe-card / home-assistant-todo-card | 55 / 51（和 106） | 本体にある（やること一覧） / 無い |
| 選択（input_select・select） | select-list-card | 58 | 本体はタイルの選択肢の操作 / 無い |
| 芝刈り機 | lovelace-lawn-mower-card / lawn-mower-card / compact-lawn-mower-card | 24 / 23 / 10（和 57） | 本体はタイルの操作ボタン / 無い |
| 扇風機 | lovelace-fan-xiaomi / xiaomi-smart-fan-card | 41 / 12（和 53） | 本体はタイルの風量・送風の型 / 無い |
| 給湯器 | water-heater-card | 8 | 本体はタイルの運転の型 / 無い |
| 鍵 | ha-smartlock-card | 2 | 本体はタイルの施錠・開ける / 状態だけある（`<cw-status>`） |
| 弁（バルブ） | 専用のカードは見つからなかった | 0 | 本体はタイルの開閉と開き具合 / 無い |
| 更新（update） | 専用のカードは見つからなかった | 0 | 本体にある（更新の一覧、タイルの更新の操作） / 無い |
| シーン・スクリプトのボタン | 専用のカードは見つからなかった | 0 | 本体はボタンとタイル / 無い（`<cw-switch>` で押せる） |
| 数え上げ（counter） | 専用のカードは見つからなかった | 0 | 本体はタイルの増やす・減らす / 無い |

補足:

- 植物の lovelace-flower-card は、説明文に「追加の植物の連携に合わせる」とあり、本体の植物では使えない（調査で確認）
- alarmo-card の説明書には「Alarmo の連携が作ったエンティティにしか使えない」とある（調査で確認）。AlarmPanel（33）は本体の防犯のエンティティならどれにでも使える型である
- 鍵、弁、更新、シーン、数え上げは、追加のカードがほとんど作られていない。本体のタイルの操作で足りていると読める（推測）
- 太陽と月は本体に専用のカードが無く、保存のみの sun-card（438）も含めると、関心は表の和より大きい（推測）

## 本体が出しているもの

種類ごとに、本体が出している状態・サービス・websocket と、部品だけで受け持てるかを書く。

防犯の操作盤（調査で確認）:

- 状態は disarmed、armed_home、armed_away、armed_night、armed_vacation、armed_custom_bypass、pending、arming、disarming、triggered の 10 通り
- 属性 `code_format` は `number` か `text` か無しで、`code_arm_required` は警戒するときにも暗証番号が要るかを表す。`supported_features` の数字で、家・外出・夜・休暇・任意のどの警戒ができるかが分かる
- サービスは `alarm_control_panel.alarm_arm_away`、`alarm_arm_home`、`alarm_arm_night`、`alarm_arm_vacation`、`alarm_arm_custom_bypass`、`alarm_disarm` で、どれも `code` を受け取る。暗証番号を確かめるのは本体の側である
- 本体の防犯の操作盤のカードは、`code_format` が `number` のときだけ数字の押しボタンを出し、エンティティの登録に既定の暗証番号（`default_code`）があるときは出さない。既定の暗証番号は websocket の `config/entity_registry/get` で読んでいる
- 本体の手動の防犯（manual の連携）は、補助（helpers）として誰でも作れる

判断（推測）: 押しボタンの部品は、Alarmo が無くても本体の防犯のエンティティならどれでも動かせる。Alarmo だけが持つもの（開いている窓の一覧、人ごとの暗証番号）は出せないが、警戒と解除には要らない。暗証番号はサービスに渡すだけにし、部品とカードに残さない。

やること一覧（調査で確認）:

- エンティティの状態は、終わっていない項目の数だけで、項目そのものは状態に入っていない
- 本体は websocket の命令 `todo/item/list`（1 回読む）、`todo/item/subscribe`（変わるたびに届く）、`todo/item/move`（並べ替え）を出している。本体のカードは `todo/item/subscribe` で項目を受け取っている
- 終えた印は `todo.update_item` に `item`（uid）と `status: completed` を渡す。足すのは `todo.add_item`、消すのは `todo.remove_item` と `todo.remove_completed_items`
- できることは `supported_features` で分かる（足す 1、消す 2、書き換える 4、並べ替え 8 など）

判断（推測）: cards2.md では「今の仕組みでは受け持てない」としたが、今のカードは天気の予報で `subscribeMessage` をすでに使っている。同じ形で `todo/item/subscribe` を受け、`hass.callWS({type: 'todo/item/list'})` でも読めるので、部品だけで受け持てる。

部屋ごとのまとめ（調査で確認）:

- 画面の側の `hass` は、`hass.areas`（エリアの登録）、`hass.entities`（エンティティの登録と `area_id`）、`hass.devices`（機器の登録と `area_id`）を持っている
- エリアの登録には `temperature_entity_id` と `humidity_entity_id` があり、そのエリアの温度と湿度をどのセンサーで見るかを本体の側で決められる
- 本体のエリアのカードは、センサーの温度・湿度、二値センサーの動き（motion）と水濡れ（moisture）を集め、電力などは足し合わせて出す。タイルにはエリアの点け消しの操作（area-controls）もある

判断（推測）: cards2.md では「部品を並べれば足りる」としたが、エリアの名前を 1 つ渡せば、本体の登録から温度・湿度・点いている電球の数・動きの有無を集められる。並べ方ではなく集める仕組みが要るので、部品にする意味がある。

植物（調査で確認）:

- 本体の plant は設定ファイル（YAML）でしか作れず、設定画面から足す手順（config flow）が無い
- 状態は ok か problem で、属性に moisture、battery、temperature、conductivity、brightness と問題の中身を持つ。本体の植物の状態のカードはこの属性を読む

判断（推測）: 星の 525 は追加の植物の連携に合わせたカードへの評価で、本体の plant を使っている人は少ないと見る。部品を作っても、需要の元になっている人の植物は読めない。

太陽と月（調査で確認）:

- `sun.sun` の状態は above_horizon か below_horizon で、属性に next_rising、next_setting、next_dawn、next_dusk、elevation、azimuth、rising を持つ
- moon の連携は月の満ち欠けのセンサーを 1 つ作り、状態は new_moon、waxing_crescent、first_quarter、waxing_gibbous、full_moon、waning_gibbous、last_quarter、waning_crescent の 8 通り

判断（推測）: 状態を読むだけで作れ、押して何かを動かすことが無いので、壁の画面に置いても危なくない。

そのほかの種類（調査で確認）:

- 鍵: 状態は locked、unlocked、open、opening、locking、unlocking、jammed。サービスは `lock.lock`、`lock.unlock`、`lock.open` で `code` を受け取る。`code_format` は数字か文字かではなく、正規表現の文字列である
- 扇風機: 属性 percentage、percentage_step、preset_mode、preset_modes、oscillating、direction。サービスは `fan.set_percentage`、`fan.set_preset_mode`、`fan.oscillate`、`fan.set_direction`
- 加湿器: 属性 humidity（目標）、current_humidity、mode、available_modes、min_humidity、max_humidity、action。サービスは `humidifier.set_humidity`、`humidifier.set_mode`
- 給湯器: サービスは `water_heater.set_temperature`、`set_operation_mode`、`set_away_mode`
- 弁: サービスは `valve.open_valve`、`close_valve`、`set_valve_position`、`stop_valve`、`toggle`
- 芝刈り機: 状態は mowing、docked、paused、returning、error など。サービスは `lawn_mower.start_mowing`、`pause`、`dock`、`stop`
- 更新: 属性 installed_version、latest_version、in_progress、update_percentage、release_url。サービスは `update.install`、`skip`、`clear_skipped`
- 選択: 属性 options。サービスは `select.select_option`（input_select も同じ名前）と、次・前・最初・最後
- シーンとスクリプト: `scene.turn_on`、`script.turn_on` を呼ぶだけ
- 数え上げ: `counter.increment`、`decrement`、`reset`、`set_value`
- 本体のタイルの操作の一覧には、警戒の切り替え、数え上げの増減、扇風機の風量と型、加湿器の型と目標の湿度、芝刈り機の操作、鍵の操作と「開ける」、選択肢、更新の操作、弁の開閉と開き具合、給湯器の運転の型がそろっている

判断（推測）: これらはどれも状態を読んでサービスを呼ぶだけで作れる。ただ追加のカードの星が小さく、本体のタイルで足りているので、新しい部品より、今の部品が受け持つ種類を増やす方が合う。

## 作る順番

カードの今の仕組み（状態を読む、サービスを呼ぶ、websocket を受ける）だけで受け持てる種類から、星の和の大きい順に選んだ（推測）。

32. cw-area は、エリアを 1 つ渡すと、その部屋の温度と湿度、点いている電球の数、動きの有無を 1 枚にまとめて出す。星の和が 622 で一番大きく、本体の `hass.areas`（`temperature_entity_id`、`humidity_entity_id`）と `hass.entities` の `area_id` から中身を集められるので次に置く
33. cw-sky は、日の出・日の入りの時刻と太陽の高さ、今日の月の満ち欠けを絵で出す。星の和が 305 で、`sun.sun` の属性（next_rising、next_setting、elevation）と moon の連携の満ち欠けのセンサーを読むだけで作れる
34. cw-alarm は、防犯の状態を色で出し、警戒の型のボタンと数字の押しボタンで警戒と解除をする。星の和は 227 で、本体の `alarm_control_panel` の `code_format` と `code_arm_required` で押しボタンを出すかを決め、`alarm_control_panel.alarm_arm_*` と `alarm_disarm` に `code` を渡すだけなので Alarmo が無くても動く
35. cw-todo は、やること一覧の項目を並べ、押すと終えた印を付ける。星の和は 106 と小さいが、家事の画面に置けるもので、websocket の `todo/item/subscribe` で項目を受け、`todo.update_item` に `status: completed` を渡せば作れる

後に回すもの（推測）:

- 植物: 星 525 の需要は追加の植物の連携が前提で、本体の plant は設定ファイルでしか作れない。部品を作っても需要の元の人の植物は読めないので、追加の連携の形を確かめてから決める
- 加湿器: 星の和は 165 あるが、目標の湿度を円弧で回す形は `<cw-dial>` の温度の調節と同じである。新しい部品にせず、`<cw-dial>` が humidifier を受け持つ形で足す方が小さく済む
- 選択: 星 58 と小さい。選択肢を並べて押すだけなので、必要になったら `<cw-switch>` か `<cw-screens>` の切り替えの見た目を使う
- 芝刈り機: 星の和 57 と小さい。状態とボタンの形は `<cw-vacuum>` と同じなので、`<cw-vacuum>` が lawn_mower を受け持つ形で足せる
- 扇風機: 星の和 53 と小さい。cards2.md と同じく `<cw-switch>` の滑りを風量に当てれば足りる見込み
- 鍵: 専用のカードの星は 2 しかない。`code_format` が正規表現で、壁の画面から開けられるようにするなら確認の手順を先に決める必要がある
- 給湯器、弁、更新、シーン・スクリプト、数え上げ: 追加のカードの需要がほとんど無く、本体のタイルで足りている。シーンとスクリプトは `<cw-switch>` を押して `turn_on` を呼べば今でも置ける

## 出典

- [marcokreeft87/room-card](https://github.com/marcokreeft87/room-card)
- [junalmeida/homeassistant-minimalistic-area-card](https://github.com/junalmeida/homeassistant-minimalistic-area-card)
- [xBourner/area-card-plus](https://github.com/xBourner/area-card-plus)
- [patrickfnielsen/hass-room-card](https://github.com/patrickfnielsen/hass-room-card)
- [Olen/lovelace-flower-card](https://github.com/Olen/lovelace-flower-card)
- [Olen/homeassistant-plant](https://github.com/Olen/homeassistant-plant)
- [ngocjohn/lunar-phase-card](https://github.com/ngocjohn/lunar-phase-card)
- [mishaaq/sun-card](https://github.com/mishaaq/sun-card)
- [wwwescape/sky-tonight-card](https://github.com/wwwescape/sky-tonight-card)
- [AitorDB/home-assistant-sun-card](https://github.com/AitorDB/home-assistant-sun-card)
- [nielsfaber/alarmo-card](https://github.com/nielsfaber/alarmo-card)
- [nielsfaber/alarmo](https://github.com/nielsfaber/alarmo)
- [jcooper-korg/AlarmPanel](https://github.com/jcooper-korg/AlarmPanel)
- [artem-sedykh/mini-humidifier](https://github.com/artem-sedykh/mini-humidifier)
- [1vanchik/humidifier-card](https://github.com/1vanchik/humidifier-card)
- [nutteloost/todo-swipe-card](https://github.com/nutteloost/todo-swipe-card)
- [agoberg85/home-assistant-todo-card](https://github.com/agoberg85/home-assistant-todo-card)
- [grinstantin/todoist-card](https://github.com/grinstantin/todoist-card)
- [mattieha/select-list-card](https://github.com/mattieha/select-list-card)
- [EvotecIT/lovelace-lawn-mower-card](https://github.com/EvotecIT/lovelace-lawn-mower-card)
- [cociweb/lawn-mower-card](https://github.com/cociweb/lawn-mower-card)
- [Tra1n84/compact-lawn-mower-card](https://github.com/Tra1n84/compact-lawn-mower-card)
- [fineemb/lovelace-fan-xiaomi](https://github.com/fineemb/lovelace-fan-xiaomi)
- [mrwogu/xiaomi-smart-fan-card](https://github.com/mrwogu/xiaomi-smart-fan-card)
- [homeassistant-projects/water-heater-card](https://github.com/homeassistant-projects/water-heater-card)
- [juju35/ha-smartlock-card](https://github.com/juju35/ha-smartlock-card)
- [CyrisXD/love-lock-card](https://github.com/CyrisXD/love-lock-card)
- [qlerup/lovelace-pin-lock-card](https://github.com/qlerup/lovelace-pin-lock-card)
- [本体: alarm_control_panel の定数（状態・属性・supported_features）](https://github.com/home-assistant/core/blob/dev/homeassistant/components/alarm_control_panel/const.py)
- [本体: alarm_control_panel のサービス](https://github.com/home-assistant/core/blob/dev/homeassistant/components/alarm_control_panel/services.yaml)
- [本体: todo の websocket の命令](https://github.com/home-assistant/core/blob/dev/homeassistant/components/todo/__init__.py)
- [本体: todo のサービス](https://github.com/home-assistant/core/blob/dev/homeassistant/components/todo/services.yaml)
- [本体: plant](https://github.com/home-assistant/core/blob/dev/homeassistant/components/plant/__init__.py)
- [本体: lock の定数](https://github.com/home-assistant/core/blob/dev/homeassistant/components/lock/const.py)
- [本体: fan の定数](https://github.com/home-assistant/core/blob/dev/homeassistant/components/fan/const.py)
- [本体: humidifier の定数](https://github.com/home-assistant/core/blob/dev/homeassistant/components/humidifier/const.py)
- [本体: lawn_mower の定数](https://github.com/home-assistant/core/blob/dev/homeassistant/components/lawn_mower/const.py)
- [本体: update の定数](https://github.com/home-assistant/core/blob/dev/homeassistant/components/update/const.py)
- [本体: valve のサービス](https://github.com/home-assistant/core/blob/dev/homeassistant/components/valve/services.yaml)
- [本体: sun の定数](https://github.com/home-assistant/core/blob/dev/homeassistant/components/sun/const.py)
- [本体: moon の満ち欠け](https://github.com/home-assistant/core/blob/dev/homeassistant/components/moon/helpers.py)
- [画面: 防犯の操作盤のカード](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/cards/hui-alarm-panel-card.ts)
- [画面: 防犯の値と既定の暗証番号の扱い](https://github.com/home-assistant/frontend/blob/dev/src/data/alarm_control_panel.ts)
- [画面: やること一覧の読み書き](https://github.com/home-assistant/frontend/blob/dev/src/data/todo.ts)
- [画面: やること一覧のカード](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/cards/hui-todo-list-card.ts)
- [画面: エリアのカード](https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/cards/hui-area-card.ts)
- [画面: hass の型（areas・entities・devices）](https://github.com/home-assistant/frontend/blob/dev/src/types.ts)
- [画面: タイルの操作の一覧](https://github.com/home-assistant/frontend/tree/dev/src/panels/lovelace/card-features)
- [Home Assistant: 手動の防犯（manual）](https://www.home-assistant.io/integrations/manual/)
- [Home Assistant: 防犯の操作盤](https://www.home-assistant.io/dashboards/alarm-panel/)
- [Home Assistant: やること一覧](https://www.home-assistant.io/dashboards/todo-list/)
- [Home Assistant: エリア](https://www.home-assistant.io/dashboards/area/)
