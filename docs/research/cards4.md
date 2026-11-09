# よく使われる管理画面の部品（4 回目）

作成: 2026-11-10。部品集は Home Assistant だけでなく、ふつうの HTML の管理画面にも置けるものになった。そこで、Home Assistant のカードではなく、自分で立てる管理画面（Homepage、Glance、Dashy、Homarr、Heimdall）、Grafana、グラフの部品集で何が使われているかを数字で見て、実装の順番 36 以降を決めるための調査。
印: 「調査で確認」は数字や元の文書・コードを見たもの、「推測」はそこからの判断。

## 調べ方

数字は 4 種類を使った。どれも 2026-11-10 に取得した（調査で確認）。

- GitHub の星の数。`https://api.github.com/repos/持ち主/名前` の `stargazers_count` を読んだ。保存のみ（archived）の配布元は数えていない
- Grafana の公開ダッシュボード。`https://grafana.com/api/dashboards?orderBy=downloads&direction=desc&pageSize=50` で取り込みの多い順に 50 件を選び、各ダッシュボードの最新版の JSON を落として、パネルの種類（`type`）を数えた。古い名前は今の名前に寄せた（`graph` は時系列、`singlestat` は数値、`table-old` は表）
- Grafana の追加のパネルの取り込み数。`https://grafana.com/api/plugins/名前` の `downloads` を読んだ。本体に同じ種類が入って廃止（deprecated）になった追加のパネルも数字は残っているので、本体に入る前の需要として読んだ
- npm の取り込み数。`https://api.npmjs.org/downloads/point/2026-10-01:2026-10-31/名前` で 2026 年 10 月の 1 か月分を読んだ

自分で立てる管理画面については、使われ方の統計は公開されていない（調査で確認。Homepage、Glance、Dashy、Homarr の文書と repo のどこにも利用の集計は無い）。代わりに、5 つの管理画面がそれぞれその種類の部品を持っているかを数えた。見たのは Homepage の `docs/widgets/services`（165 件）と `docs/widgets/info`、Glance の `docs/configuration.md` の見出し、Dashy の `docs/widgets.md` の見出し、Homarr の `packages/widgets/src` の一覧である（調査で確認）。Heimdall は説明文が「An Application dashboard and launcher」で、リンクの並びと検索だけを持つ（調査で確認）。
Grafana が「よく使われるパネル」を公開した資料は、文書と検索では見つからなかった（調査で確認）。そのため上の公開ダッシュボードの数え上げで代えた。

## 種類ごとの需要

Grafana の公開ダッシュボード上位 50 件（パネルの合計 994 個）で数えた結果（調査で確認）:

| パネルの種類 | パネルの数 | 使っているダッシュボードの数（50 件中） |
|---|---|---|
| 時系列（折れ線） | 666 | 50 |
| 数値（stat） | 199 | 34 |
| 表（table） | 39 | 15 |
| 横棒の計器（bar gauge） | 19 | 6 |
| 文字（text） | 17 | 11 |
| 円グラフ（pie） | 16 | 4 |
| 円弧の計器（gauge） | 16 | 6 |
| 色の格子（heatmap） | 15 | 5 |
| ログ（logs） | 3 | 2 |
| 状態の履歴（status history） | 2 | 1 |

数値のパネル 199 個のうち 118 個は、数字の後ろに小さな推移の線（`graphMode: area`）を出していた（調査で確認）。

種類ごとにまとめた表。「管理画面」は Homepage・Glance・Dashy・Homarr・Heimdall の 5 つのうち、その種類の部品を持つ数。

| 種類 | 使われている所（例） | 数字（調査で確認） | 部品集にあるか |
|---|---|---|---|
| 推移の線つきの数値・前との差 | Grafana の数値、Glance の markets、Homepage の stocks、Tremor の SparkChart | 上位 50 件の数値 199 個のうち 118 個が推移の線つき。管理画面 4 / 5（株価・暗号資産の一覧）。react-sparklines 星 2,852・npm 1,219,990 | 無い（`<cw-stat>` は数字だけ） |
| 表 | Grafana の表、Glance の Docker Containers、Homarr の beszel-system-table、Tremor の Table | 上位 50 件で 39 個・15 件。追加の Datatable 55,408,351、Boom Table 47,618,320。@tanstack/table-core npm 110,796,008、TanStack/table 星 28,557 | 無い |
| 稼働の格子（死活の結果を小さな升で並べる） | Uptime Kuma、Upptime、Gatus、Tremor の Tracker、Homepage の uptime-kuma・gatus、Dashy の Uptime Kuma Status Page | uptime-kuma 星 93,412、upptime 星 17,197、gatus 星 12,669。Grafana の追加の Status Panel 867,782,376、Statusmap 85,417,265。管理画面 4 / 5 | 無い（`<cw-status>` は今の状態だけ） |
| 円グラフ・ドーナツ | Grafana の円グラフ、Chart.js の doughnut、shadcn の pie と radial、Tremor の DonutChart と ProgressCircle | Grafana の追加の Pie Chart 1,259,429,609（追加のパネルで一番多い）。上位 50 件では 16 個・4 件。shadcn の例 71 個のうち pie 11・radial 6 | 無い |
| 色の格子・暦の格子 | Grafana の heatmap、Cal-HeatMap、GitHub の草の形、react-activity-calendar | 上位 50 件で 15 個・5 件。追加の Heatmap 35,020,975、Cal-HeatMap 26,734,996、Carpet plot 25,825,351、Hourly heatmap 5,381,833。cal-heatmap 星 3,128 | 無い |
| 状態の帯（点いていた時間を時刻の軸に帯で出す） | Grafana の state timeline と status history | 追加の Discrete（state timeline の元）93,989,452。上位 50 件では状態の履歴 2 個・1 件 | 無い |
| 機械の負荷（CPU・メモリ・ディスク） | Homepage の resources と glances、Glance の Server Stats、Dashy の System Info など約 20 種、Homarr の system-resources | 管理画面 4 / 5。netdata 星 81,326、glances 星 33,922、beszel 星 27,040 | 部品を組めば出せる（`<cw-bars>`・`<cw-dial>`・`<cw-chart>`。`demo/machine.html` が実例） |
| 円弧の計器 | Grafana の gauge、Dashy の Speedometer | 上位 50 件で 16 個・6 件。追加の D3 Gauge 91,338,602 | ある（`<cw-dial>`） |
| 横棒・目標つきの帯 | Grafana の bar gauge、Tremor の BarList・ProgressBar・CategoryBar | 上位 50 件で 19 個・6 件 | ある（`<cw-bars>`、目標の線は無い） |
| リンクの並び | Heimdall、Homepage の bookmarks、Glance の Bookmarks、Homarr の bookmarks、Dashy の項目 | 管理画面 5 / 5。heimdall 星 9,401、homer 星 11,708、flame 星 6,667 | 無い |
| 検索の欄 | Homepage の search、Glance の Search Widget、Dashy の Custom search、Heimdall、Homarr | 管理画面 5 / 5 | 無い |
| 月の暦 | Homepage の calendar、Glance の Calendar、Dashy の Calendar、Homarr の calendar | 管理画面 4 / 5。Grafana の追加の Business Calendar 8,586,377 | 予定の一覧はある（`<cw-agenda>`）、月の格子は無い |
| 記事・ニュースの一覧 | Glance の RSS・Hacker News・Reddit、Dashy の RSS Feed、Homarr の rssFeed、Homepage の feed・freshrss | 管理画面 4 / 5 | ある（`<cw-feed>`・`<cw-log>`） |
| 地図と印 | Grafana の geomap | 追加の Worldmap Panel 239,158,724。Leaflet 星 45,897・npm 35,213,702 | 無い |
| 埋め込み（iframe） | Glance の iframe、Dashy の Iframe Widget、Homarr の iframe、Homepage の iframe | 管理画面 4 / 5 | 無い（HTML の `iframe` で置ける） |
| 通信の速さ | Homepage の speedtest-tracker・myspeed、Homarr の speedtest-tracker | 管理画面 2 / 5 | 部品を組めば出せる（`<cw-stat>`・`<cw-chart>`） |
| 日付までの残り | Homarr の countdown | 管理画面 1 / 5 | 近いものはある（`<cw-timer>`） |
| QR コード | 5 つの管理画面には無い | qrcode npm 128,001,193（多くは画面の外の用途） | 無い |
| 度数の分布（histogram） | Grafana の histogram | 上位 50 件で 0 個 | 無い |
| 時計 | Grafana の追加の Clock、5 つの管理画面すべて | 追加の Clock 910,451,089 | ある（`<cw-clock>`） |

補足:

- Grafana の追加のパネルの数字は、Grafana を立てるたびに自動で取り込まれる分を含むと見られ、人数ではない（推測）。種類どうしの大小を比べるのに使い、人数としては読まない
- 円グラフは追加のパネルの数字が飛び抜けて大きいのに、上位 50 件では 4 件にしか使われていない。上位は機械の監視のダッシュボードが多く、割合を見せる場面が少ないためと読める（推測）
- 稼働の格子は、Uptime Kuma の星 93,412 が、この調査で見た自分で立てる道具の中で一番大きい（調査で確認）。Homepage・Dashy・Homarr がどれも Uptime Kuma の部品を持っているのは、この需要の表れと読める（推測）
- リンクの並びと検索は 5 つ全部にあるが、どちらもふつうの HTML の `a` と `form` で作れて、値を受けて形を変える部品ではない（推測）
- shadcn の例は radar が 14 と一番多いが、管理画面の 5 つと Grafana の本体には radar が無い（調査で確認）。例の数は見本の多さで、使われ方ではないと読む（推測）

## 作る順番

値を受けて形を変える部品で、今の部品では出せないものを、上の数字の大きさで並べた（推測）。どの部品も今の部品と同じく `.data` か属性で値を受け、`<cw-source>` から流し込める形にする。

36. cw-trend は、数字と単位に、前の値との差（増えたら上向き、減ったら下向き）と、最近の推移の小さな線を添えて出す。値は `value` と `.data = [数の並び]`（推移）と `previous`（比べる値）で受ける。Grafana の上位 50 件で数値のパネル 199 個のうち 118 個が推移の線つきで、Glance・Homepage・Dashy・Homarr の株価の一覧も同じ形なので、今の `<cw-stat>` に一番足りないものとして最初に置く
37. cw-table は、行と列の表を出し、列ごとに数字の右寄せ、しきい値を超えた升の色、押して並べ替えができる。値は `.columns = [{key, label, unit}]` と `.data = [{列の key: 値}]` で受ける。上位 50 件で 15 件が使い、追加の Datatable 55,408,351・Boom Table 47,618,320、@tanstack/table-core が月 110,796,008 回取り込まれていて、コンテナや機械の一覧を出す手段が部品集に無いので次に置く
38. cw-uptime は、見張っている対象ごとに、最近の死活の結果を小さな升で横に並べ、稼働の割合と今の状態を添える。値は `.data = [{label, history: ['up' | 'down' | 'pending' ...], ratio}]` で受ける。uptime-kuma 星 93,412・upptime 17,197・gatus 12,669、Grafana の追加の Status Panel 867,782,376・Statusmap 85,417,265 と需要が大きく、Uptime Kuma や Gatus の API の結果をそのまま渡せる
39. cw-donut は、項目ごとの割合を輪で出し、真ん中に合計か 1 つの割合を出す。値は `<cw-bars>` と同じ `.data = [{label, value}]` で受け、項目が 1 つなら進み具合の輪として使う。Grafana の追加の Pie Chart が 1,259,429,609 で追加のパネルの中で一番多く、shadcn の例でも pie と radial で 17 個あり、Tremor も DonutChart と ProgressCircle を持つ
40. cw-heatmap は、日付ごと（暦の格子）か曜日と時刻ごとの升を、値の大きさで色の濃さを変えて並べる。値は `.data = [{date, value}]` と `layout="calendar" | "week"` で受ける。上位 50 件で 5 件が使い、追加の Heatmap 35,020,975・Cal-HeatMap 26,734,996・Carpet plot 25,825,351 を足すと 8,700 万を超え、電気の使用量や作業の記録を一目で見せる手段が部品集に無い
41. cw-timeline は、対象ごとに、どの時刻にどの状態だったかを時刻の軸に沿った帯で出す（照明が点いていた時間、機械が動いていた時間など）。値は `.data = [{label, spans: [{from, to, state}]}]` で受ける。Grafana の追加の Discrete が 93,989,452 で本体の state timeline の元になり、Home Assistant の履歴の画面も同じ形なので、家の画面と一般の画面の両方で使える。cw-uptime と違い、升ではなく実際の時刻の長さで帯を描く

後に回すもの（推測）:

- 機械の負荷（CPU・メモリ・ディスク）: 管理画面 4 / 5 にあり需要は大きいが、`<cw-bars>`（max 100）、`<cw-dial>`、`<cw-chart>` を並べれば出せて、`demo/machine.html` が実際に出している。新しい部品より、見本の組み方を文書に足す方が小さく済む
- リンクの並びと検索の欄: 5 / 5 にあるが、HTML の `a` と `form` で作れ、値を受けて形を変える部品ではない。見た目をそろえる CSS の型（tile・glass・game）で受け持てるかを先に見る
- 地図と印: 追加の Worldmap Panel 239,158,724 と需要は大きいが、地図の画像を外のサーバーから取る必要があり、部品集が外につながらない作りと合わない。間取り図の `<cw-floorplan>` で足りる家の画面も多い
- 月の暦: 4 / 5 にあるが、予定の中身は `<cw-agenda>` で出せる。月の格子は cw-heatmap の暦の並べ方ができてから、それを使って作る
- 横棒の目標の線: Tremor の BarList・ProgressBar にあるが、上位 50 件の bar gauge は 6 件で、`<cw-bars>` に目標の値を足せば済む
- 埋め込み（iframe）: 4 / 5 にあるが、HTML の `iframe` を `<cw-panel>` に入れれば今でも置ける
- 通信の速さ: 2 / 5 と少なく、`<cw-stat>` と `<cw-chart>`（36 の cw-trend ができればそれ）で出せる
- 日付までの残り: 1 / 5 しかない。`<cw-timer>` に終わりの日時を渡す形で足せる
- QR コード: 5 つの管理画面に無く、npm の数字は画面の外の用途が大半と見る
- 度数の分布（histogram）: 上位 50 件で 0 個で、家や一般の管理画面での需要が見えない
- 記事・ニュースの一覧と株価: 記事は `<cw-feed>`・`<cw-log>` で出せる。株価の一覧は cw-trend を並べれば出せる

## 出典

- [gethomepage/homepage](https://github.com/gethomepage/homepage)
- [Homepage: サービスの部品の一覧](https://github.com/gethomepage/homepage/tree/dev/docs/widgets/services)
- [Homepage: resources の部品](https://github.com/gethomepage/homepage/blob/dev/docs/widgets/info/resources.md)
- [glanceapp/glance](https://github.com/glanceapp/glance)
- [Glance: 部品の設定（markets・monitor・server stats ほか）](https://github.com/glanceapp/glance/blob/main/docs/configuration.md)
- [Lissy93/dashy](https://github.com/Lissy93/dashy)
- [Dashy: 部品の一覧](https://github.com/Lissy93/dashy/blob/master/docs/widgets.md)
- [homarr-labs/homarr](https://github.com/homarr-labs/homarr)
- [Homarr: 部品の一覧](https://github.com/homarr-labs/homarr/tree/dev/packages/widgets/src)
- [linuxserver/Heimdall](https://github.com/linuxserver/Heimdall)
- [bastienwirtz/homer](https://github.com/bastienwirtz/homer)
- [pawelmalak/flame](https://github.com/pawelmalak/flame)
- [grafana/grafana](https://github.com/grafana/grafana)
- [Grafana: パネルの種類](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/)
- [Grafana: 公開ダッシュボードの一覧（API）](https://grafana.com/api/dashboards?orderBy=downloads&direction=desc&pageSize=50)
- [Grafana: Node Exporter Full（上位 1 件目）](https://grafana.com/grafana/dashboards/1860-node-exporter-full/)
- [Grafana: 追加のパネル Pie Chart](https://grafana.com/grafana/plugins/grafana-piechart-panel/)
- [Grafana: 追加のパネル Worldmap Panel](https://grafana.com/grafana/plugins/grafana-worldmap-panel/)
- [Grafana: 追加のパネル Discrete](https://grafana.com/grafana/plugins/natel-discrete-panel/)
- [Grafana: 追加のパネル Statusmap](https://grafana.com/grafana/plugins/flant-statusmap-panel/)
- [Grafana: 追加のパネル Status Panel](https://grafana.com/grafana/plugins/vonage-status-panel/)
- [Grafana: 追加のパネル Datatable Panel](https://grafana.com/grafana/plugins/briangann-datatable-panel/)
- [Grafana: 追加のパネル Cal-HeatMap](https://grafana.com/grafana/plugins/neocat-cal-heatmap-panel/)
- [Grafana: 追加のパネル Clock](https://grafana.com/grafana/plugins/grafana-clock-panel/)
- [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma)
- [upptime/upptime](https://github.com/upptime/upptime)
- [TwiN/gatus](https://github.com/TwiN/gatus)
- [tremorlabs/tremor](https://github.com/tremorlabs/tremor)
- [shadcn-ui/ui: グラフの例](https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/charts)
- [chartjs/Chart.js](https://github.com/chartjs/Chart.js)
- [recharts/recharts](https://github.com/recharts/recharts)
- [apache/echarts](https://github.com/apache/echarts)
- [TanStack/table](https://github.com/TanStack/table)
- [wa0x6e/cal-heatmap](https://github.com/wa0x6e/cal-heatmap)
- [grubersjoe/react-activity-calendar](https://github.com/grubersjoe/react-activity-calendar)
- [borisyankov/react-sparklines](https://github.com/borisyankov/react-sparklines)
- [Leaflet/Leaflet](https://github.com/Leaflet/Leaflet)
- [netdata/netdata](https://github.com/netdata/netdata)
- [nicolargo/glances](https://github.com/nicolargo/glances)
- [henrygd/beszel](https://github.com/henrygd/beszel)
- [npm の取り込み数の API](https://github.com/npm/registry/blob/main/docs/download-counts.md)
