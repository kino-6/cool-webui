# よく使われる Home Assistant のカード

作成: 2026-10-31（T064）。所有者の依頼を受け、次に作る部品を需要の順に決めるための調査。
印: 「調査で確認」は数字を見たもの、「推測」はそこからの判断。

## 調べ方

Home Assistant の統計（analytics）は、どのカードが使われているかを数えていない。そこで、追加のカードの配布元（GitHub）の星の数を需要の代わりに使った（2026-10-31 に GitHub の API で取得、調査で確認）。
星は「知って、良いと思った人の数」で、使っている人の数ではない。同じ種類のカードの星を足して、種類ごとの大きさを比べた（推測）。
本体に最初からあるカード（電球、温度の調節、天気、グラフなど）は星が無いので数えていない。本体にあるのに追加のカードが作られている種類は、本体の版に不満がある印として読む（推測）。

## 種類ごとの需要

| 種類 | 主なカード | 星（調査で確認） | 部品集にあるか |
|---|---|---|---|
| 押して点ける・明るさを滑らせる | Mushroom / Bubble Card / button-card | 5,235 / 4,683 / 2,519 | 無い（`<cw-panel on>` は見た目だけで押せない） |
| グラフ | mini-graph-card / apexcharts-card | 3,906 / 1,888 | ある（`<cw-chart>`） |
| 防犯の操作盤 | Alarmo（連携と操作盤） | 2,342 | 無い |
| カメラの映像 | WebRTC / advanced-camera-card | 2,199 / 1,202 | 無い |
| 掃除機の地図 | xiaomi-vacuum-map-card / vacuum-card / valetudo-map-card | 1,950 / 1,266 / 323 | 無い |
| 再生中の音楽 | mini-media-player | 1,727 | 無い |
| 予定表 | calendar-card-pro / atomic-calendar-revive | 1,236 / 677 | 無い |
| 電気の流れ | power-flow-card-plus / energy-flow-card-plus / tesla-style-solar-power-card / power-flow-card | 1,205 / 268 / 250 / 198 | ある（`<cw-flow>`） |
| 予約の操作 | scheduler-card | 1,273 | 無い |
| 天気 | clock-weather-card / weather-card / weather-radar-card | 906 / 556 / 469 | 無い |
| 温度の調節 | better-thermostat-ui-card | 383 | 無い |
| 見た目の上書き | card-mod | 1,838 | 部品ではない（配色の CSS が受け持つ） |

## 作る順番

需要の大きい順に、部品集に無い種類を 1 つずつ作る（推測）。

1. `<cw-switch>`: 押して点け消しし、明るさを滑らせる。上の表で一番大きく、星を足すと 12,437
2. `<cw-camera>`: カメラの映像（静止画を一定間隔で取り直すか、動画）に名前と時刻を重ねる。足すと 3,401
3. `<cw-media>`: 再生中の曲名・アーティスト・進み具合と、再生・一時停止・次の曲。1,727
4. `<cw-agenda>`: 今日からの予定の一覧。足すと 1,913
5. `<cw-weather>`: いまの天気と数日の予報。足すと 1,931
6. `<cw-dial>`: 円弧の目盛りで値を出し、温度の調節にも使える。383 と本体の版の置き換え

後に回すもの（推測）:

- 防犯の操作盤: Alarmo の星の多くは連携（警報の仕組み）への評価で、操作盤だけの需要は分からない。暗証番号を扱うので、部品より連携の側の話になる
- 掃除機の地図: 機種ごとの地図の形式に合わせる必要があり、部品集の部品では受け持てない
- 予約の操作: scheduler の連携が無いと使えない

## 出典

- https://github.com/piitaya/lovelace-mushroom
- https://github.com/Clooos/Bubble-Card
- https://github.com/custom-cards/button-card
- https://github.com/kalkih/mini-graph-card
- https://github.com/RomRider/apexcharts-card
- https://github.com/nielsfaber/alarmo
- https://github.com/AlexxIT/WebRTC
- https://github.com/dermotduffy/advanced-camera-card
- https://github.com/PiotrMachowski/lovelace-xiaomi-vacuum-map-card
- https://github.com/kalkih/mini-media-player
- https://github.com/alexpfau/calendar-card-pro
- https://github.com/totaldebug/atomic-calendar-revive
- https://github.com/flixlix/power-flow-card-plus
- https://github.com/nielsfaber/scheduler-card
- https://github.com/pkissling/clock-weather-card
- https://github.com/bramkragten/weather-card
- https://github.com/KartoffelToby/better-thermostat-ui-card
- https://github.com/thomasloven/lovelace-card-mod
