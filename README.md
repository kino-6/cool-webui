# cool-webui

見本（ブラウザで開くだけ）: https://kino-6.github.io/cool-webui/ 。全部の部品のカタログと、家の管理画面の見本が動く形で見られる。

ライセンス: MIT（[LICENSE](LICENSE)）。部品の中に Lit（BSD-3-Clause）を含む。

HTML に置いて値を渡すだけで管理画面を組み立てられる部品集（custom element）。Home Assistant のカードとしても使える。
見た目はタイル・ガラス・ゲーム風、人気の配色の Mocha・Latte（明るい）・Dracula・Nord、枠や背景の動きまで変わる HUD（SF の計器）・端末（緑の画面）・ドット絵・太枠（明るい）・ネオン（80 年代）の 12 個から、動きは `calm`（既定）・`full`・`off` から、使う人が選ぶ。

- 目的と範囲: [CHARTER.md](CHARTER.md)
- 部品の設計: [docs/design/components.md](docs/design/components.md)
- 作業の一覧: [Tasks.md](Tasks.md)

## 部品

| 部品 | 役割 |
|---|---|
| `<cw-stage>` | 固定比率の舞台。拡大縮小、動きの量（`motion`）、一時停止、背景（`bg`） |
| `<cw-panel>` | 枠と名札。`on` で点いている面 |
| `<cw-stat>` `<cw-status>` `<cw-clock>` | 数値、状態のランプ、時計 |
| `<cw-bars>` `<cw-chart>` | 横棒、折れ線 |
| `<cw-log>` `<cw-feed>` `<cw-ticker>` | ログ、発言の一覧、流れる帯 |
| `<cw-floorplan>` | 間取りの立体図。点いている部屋が灯りの色で光る |
| `<cw-flow>` | 電気の流れ。電力に比例した粒が線の上を走る |
| `<cw-ring>` | 円に沿って回る文字の輪 |
| `<cw-switch>` | 押して点け消しし、明るさを滑らせる。`cw-toggle` と `cw-level` を出す |
| `<cw-camera>` | カメラの映像（一定間隔で取り直す静止画か動画）に、名前と最後の映像の時刻を重ねる |
| `<cw-media>` | 再生中の曲名・アーティスト・ジャケット・進み具合と、前・再生・次のボタン、音量 |
| `<cw-agenda>` | 今日からの予定を日ごとに並べる。進行中に「いま」、次の予定に「あと何分」 |
| `<cw-weather>` | いまの気温と空模様、最高・最低・湿度・風、数日の予報 |
| `<cw-trend>` | 数字に、前との差の矢印（良い向きは良い色、悪い向きは警告の色）と最近の推移の小さな線を添える |
| `<cw-table>` | 行と列の表。数字は右寄せ、しきい値を超えた升は警告の色、見出しを押して並べ替える |
| `<cw-uptime>` | 見張る対象ごとに最近の死活を小さな升で並べ、稼働の割合と今の状態を添える。Uptime Kuma の結果もそのまま渡せる |
| `<cw-donut>` | 項目ごとの割合を輪で出し、真ん中に合計。項目が 1 つなら進み具合の輪 |
| `<cw-heatmap>` | 日ごとの暦の升目か、曜日と時刻の升目を、値の大きさで色の濃さを変えて並べる |
| `<cw-timeline>` | 対象ごとに、どの時刻にどの状態だったかを時刻の軸に沿った帯で出す |
| `<cw-hero>` | 画面の主役。巨大な名前を光る球の上に重ね、まわりに小さな札を置く |
| `<cw-folio>` | 画面の番号を巨大に出し、横に見出しを添える |
| `<cw-verdict>` | たくさんの状態を「異常 なし」「異常 1件」のような巨大な一語で言い切り、横に一覧を添える |
| `<cw-battery>` | 電池の残りを少ない順に並べ、少ないものを警告の色で出す |
| `<cw-vacuum>` | 掃除機の状態・電池・掃除した広さと時間と、始める・止める・戻すのボタン |
| `<cw-timer>` | 残り時間を数字と減っていく帯で出す。終わると「終了」 |
| `<cw-cover>` | 窓の覆いの開き具合を絵と % で出し、開ける・止める・閉めると位置の帯で動かす |
| `<cw-person>` | 人の居場所（在宅・外出・ゾーン）と、いつからそこにいるか。在宅の人を先に |
| `<cw-area>` | 部屋 1 つの温度・湿度・点いている照明・人の動き。押すと部屋の照明をまとめて消す・点ける |
| `<cw-sky>` | 昼の弧に太陽の位置、日の出・日の入りと昼の長さ。夜は月の満ち欠け |
| `<cw-alarm>` | 防犯の状態、警戒の型のボタン、数字の押しボタン。暗証番号は画面に出さない |
| `<cw-todo>` | やることを期限の近い順に並べ、押して終えた印を付ける。期限切れは警告の色 |
| `<cw-dial>` | 円弧の目盛りと真ん中の数字。設定値があれば − ＋ で動かす（温度の調節） |
| `<cw-background>` | 灯りの色でにじむ背景（`motion="full"` で舞台が作る） |
| `<cw-screens>` `<cw-screen>` | 画面の切り替え |
| `<cw-source>` | WebSocket・SSE・一定間隔の取得・postMessage から値を流し込む（別ファイル `dist/cw-source.js`）。値を持つ部品はどれも受けられる |
| `cw-ha-card` | Home Assistant のカード |

見るだけなら `./show.sh` を実行する（組み立てて、全部の部品のカタログを Chrome で開く）。`./show.sh home` で家の見本、`./show.sh machine` でこの Mac の実際のデータの画面、`./show.sh plain` で舞台なしの例を開く。

全部を組み合わせた見本: `npm run build && open -a "Google Chrome" demo/home.html`。画面右上で雰囲気と動きを選ぶ。画面はホーム・エネルギー・照明（窓も）・カメラ・今日・家事の 6 枚で、下（派手とゲームでは左）のボタンか数字の 1〜6 で切り替える。

実際のデータをつないだ見本: `npm run build && npm run machine` のあと http://127.0.0.1:8787/demo/machine.html を開く。この機械の負荷・メモリ・CPU を使っている処理・この repo の記録・全体の検査の結果・キューの未完了・電池を出す。頁には部品と `<cw-source>` しか書いておらず、値はすべて `tools/machine-feed.mjs` が SSE で流す（127.0.0.1 だけで受け、宛先の名前も 127.0.0.1 か localhost だけを受ける。GET だけに答え、配るファイルは demo・dist・themes の中だけ）。自分のデータをつなぐときは、この 2 つのファイルを手本にする。

| 雰囲気 | 構成 | 見た目 |
|---|---|---|
| シンプル | 部屋ごとのタイル | タイル |
| ガラス | 部屋ごとのタイル | ガラス |
| 派手 | 間取りの立体図、7 秒ごとに移る注目の部屋、電気の流れ、24 秒ごとの画面の入れ替わり | ガラス |
| ゲーム | 派手と同じ | ゲーム（傾いた枠、斜めの見出しの帯、幅の広い太い数字、流れる斜めの帯の背景、斜めの板の画面切り替え、間取り図の後ろで回る文字の輪） |

動きは なし・控えめ・多め から選ぶ。雰囲気を選び直すと、シンプルとガラスは控えめ、派手とゲームは多めに戻る。
ほかの組み合わせ（タイルの派手版など）は、ブラウザの中で URL に `variant=bold|quiet`、`theme=tile|glass|game`、`motion=off|calm|full` を書けば選べる。

`open` に `?variant=bold` などを付けても、macOS がファイルの URL から `?` 以降を捨てるので効かない。

## 作る・見る

```sh
npm install
npm run build          # dist/ に cw.js, cw.iife.js, cw-ha-card.js, cw-source.js（と各 .iife.js）
open -a "Google Chrome" demo/index.html   # 部品のカタログ（全部品が動く見本。右上で見た目と動きを選ぶ）
npm test               # headless Chrome で全部品を検査
node tools/perf.mjs --seconds 30 --out docs/perf/$(date +%F).md   # 負荷の測定
```

初回だけ: `git config core.hooksPath .githooks`

## Home Assistant で使う

1. `dist/cw-ha-card.js` を Home Assistant の `config/www/` に置く。
2. 設定 → ダッシュボード → リソースに `/local/cw-ha-card.js` を「JavaScript モジュール」として足す。
3. カードを足す。

```yaml
type: custom:cw-ha-card
title: 居間
look: tile        # tile（既定）・glass・game・mocha・latte（明るい）・dracula・nord・hud・crt・pixel・brutal（明るい）・synthwave
motion: calm      # calm（既定）・full（数字が転がる、ランプが点滅する）・off
entities:
  - { entity: sensor.living_temperature, kind: stat, label: 室温, digits: 1 }
  - { entity: lock.front_door, kind: status, label: 玄関の鍵 }
  - { entity: sensor.home_power, kind: bars, unit: W, attributes: [居間, 台所] }
  - { entity: light.living, kind: switch, label: 天井 }   # 押すと点け消し。明るさを持つ灯りには帯が出る
  - { entity: camera.garden, kind: camera, refresh: 10, height: 200 }   # カメラの映像。refresh 秒ごとに取り直す
  - { entity: media_player.living, kind: media }   # 再生中の曲。前・再生・次と音量（機器が対応するものだけ）
  - { entity: calendar.family, kind: agenda, days: 3 }   # 予定。5 分ごとに取り直す
  - { entity: weather.home, kind: weather, days: 5 }     # いまの天気と予報（日ごとの予報がなければ半日ごとか 1 時間ごとを日にまとめる）
  - { entity: climate.living, kind: dial }               # 温度の調節（sensor なら目盛りだけ）
  - { kind: battery, low: 20 }                           # 電池を少ない順に。entities: [...] を書けばそれだけ、書かなければ電池の機器を全部集める
  - { entity: vacuum.robot, kind: vacuum, battery: sensor.robot_battery, area: sensor.robot_area, duration: sensor.robot_time }   # 掃除機。ボタンは機器が対応するものだけ
  - { entity: timer.laundry, kind: timer }               # 残り時間。終わる時刻の sensor（洗濯機など）でもよい。その場合は duration: 分 で帯の長さを決める
  - { entity: cover.living, kind: cover }               # 窓の覆い。ボタンと位置の帯は機器が対応するものだけ
  - { kind: person }                                     # 人の居場所。entities: [...] を書かなければ person を全部
  - { kind: area, area: living_room }                   # 部屋のまとめ。温度と湿度は部屋の設定、照明と人感センサーは部屋に入れた機器から集める
  - { kind: sky, moon: sensor.moon_phase }               # 日の出・日の入り（sun.sun）と月の満ち欠け（moon の連携）
  - { entity: alarm_control_panel.home, kind: alarm }    # 防犯の操作盤。押しボタンと警戒の型は機器の設定から
  - { entity: todo.shopping, kind: todo }               # やること一覧。項目は購読で受け取り、押すと終えた印を付ける
```

`kind: switch` は押すと `homeassistant.toggle` を呼ぶ。明るさの帯を離すと `light.turn_on`（0 にすると `light.turn_off`）を呼ぶ。

派手版の立体図と電気の流れもカードに置ける（見本: `demo/ha-card-house.html`）。部屋は照明につなぎ、押すとその照明が `light.toggle` で切り替わる。流れの値が負なら向きが逆になる。

```yaml
type: custom:cw-ha-card
title: 家
look: glass
motion: full      # full では点線の枠が 7 秒ごとに次の点いた部屋へ移り、粒が走る
entities:
  - kind: floorplan
    height: 340
    rooms:
      - { entity: light.living, name: 居間, x: 0, y: 0, w: 6, h: 4.5, temperature: sensor.living_temperature }
      - { entity: light.kitchen, name: 台所, x: 6, y: 0, w: 3, h: 4.5 }
    people:
      - { entity: person.aoi, name: アオイ, room: light.living }   # 在宅のときこの部屋に出る
  - kind: flow
    nodes:
      - { id: solar, name: 太陽光, entity: sensor.solar_power, x: 0.5, y: 0.2 }
      - { id: home, name: 家, entity: sensor.home_power, x: 0.5, y: 0.8 }
    links:
      - { from: solar, to: home, entity: sensor.solar_to_home }
```

書体は Google Fonts から読み込む（Inter か Hanken Grotesk）。

## 素の HTML で使う

```html
<link rel="stylesheet" href="themes/tile.css">
<script src="dist/cw.iife.js"></script>
<cw-stage motion="calm">
  <cw-panel label="居間"><cw-stat id="t" unit="°C" digits="1"></cw-stat></cw-panel>
</cw-stage>
<script>document.getElementById('t').value = 22.4;</script>
```

試作（部品になる前の 1 枚の HTML）: `open -a "Google Chrome" prototype/ha-home.html`。画面の左下で切り替える
