# 使い方の調査: 誰が・どこで・どう組み込むか

調査日: 2026-10-28。対象は最初の試作（公開のときに外した）を部品集にしたもの。
値段や競合の比較は扱わない（[market.md](market.md) で扱う）。
各節の主張には「調査で確認」か「推測」を付ける。調査で確認したものは末尾の出典に対応する。

## 前提: 試作の現状

試作を読んで分かったこと（調査で確認、試作のコードによる）。

- 1600x900 の固定の舞台を、窓の大きさに合わせて `transform: scale()` で拡大縮小している
- 背景は WebGL で毎フレーム描いている。止める手段はない
- ログ・会話・グラフ・数値は `setInterval` で作った偽のデータで動く。外からデータを渡す口はない
- `prefers-reduced-motion` への対応はない
- 部品は `.panel`（角を切ったパネル）、`.ph`（パネル見出し）、`.stat`（大きな数値）、`.barcode`、`.chip`、回る円形の文字、横棒グラフなどに分かれている

元になった X の投稿は Chrome の実験中の機能 HTML-in-Canvas と WebGPU を使っていた（依頼者の記録による）。
HTML-in-Canvas は Chrome 148〜150 の origin trial で、実験段階で仕様が変わり得る（調査で確認）。
このため、部品集は通常の DOM と CSS を基本にし、HTML-in-Canvas に頼らない前提で考える。

## 想定利用者

使う人を 6 種に分けた。人数や市場規模の数字は今回の調査では得ていない（不明）。

1. **自宅サーバーや家の機器の画面を作る個人**。Home Assistant や Homepage、Grafana を使い、見た目を自分好みに変える人。Homepage は `custom.css` と `custom.js` を設定フォルダに置いて見た目を変えられる。Home Assistant は独自のカードを custom element として足せる（調査で確認）。
2. **Discord や Twitch のボットを作る個人開発者**。ボットの管理画面を Web で作る。React と Next.js で作られた公開の雛形がある。代表例の discord-bot-dashboard-next は MIT で、2024-05 に保守を終えている（調査で確認）。元の投稿もこの層にあたる。
3. **配信者と、配信画面を作る人**。OBS のブラウザソースに Web ページを重ねる。StreamElements などの独自部品は HTML・CSS・JS で書き、WebSocket や REST からもデータを受けられる（調査で確認）。
4. **イベントやハッカソンの運営者**。会場のテレビや投影機に順位表や進行を映す（調査で確認）。
5. **AI エージェントや社内ツールの見本画面を作る開発者**。発表やデモで目を引く画面がほしい人（推測。今回の調査で直接の事例は開いていない）。
6. **ゲームの外側の道具を作る人**。ゲームの設定画面やランチャー、制作用の道具を Web 技術で作る人（推測）。ゲームの中の UI を Web 技術で描く製品（Coherent Gameface）は、WebGL が使えず Grid も使えないなど制約が強い（調査で確認）。ゲームの中への組み込みは対象にしにくい。

見た目への需要の手がかりとして、SF 風の端末画面 eDEX-UI は GitHub で約 4.5 万の星を集めた。2021 年に保守を終えて公開保存になっている（調査で確認）。
「派手な見た目の画面を自分の机に置きたい」需要はあるが、作者が保守をやめると止まる例でもある。

## 利用場面

| 場面 | 誰が | 画面の条件 | 根拠/出典 |
|---|---|---|---|
| 配信画面の重ね表示 | 配信者・配信画面の制作者 | 背景が透明。大きさはブラウザソースの幅と高さで決まる（初期値 800x600）。描画の頻度は既定 30fps に下げられる。マウス操作はない | OBS の公式説明、StreamElements の説明 |
| 配信用の独自部品 | 配信者 | 寄付・フォローなどの出来事を受けて表示を変える。データは WebSocket や REST から | StreamElements の説明 |
| 自宅サーバーの一覧画面 | 自宅サーバーを持つ個人 | 既存の道具の中に足す。CSS と JS を差し込むか、custom element を登録する | Homepage、Home Assistant の開発者向け説明 |
| 壁や机の常時表示 | 自宅サーバーの個人、小さな事務所 | 何時間も点けっぱなし。画面の省電力を切って全画面で表示する。マウスもキーボードもない | Raspberry Pi で全画面表示する手順、Grafana の全画面表示 |
| ボットや AI の管理画面 | 個人開発者 | ログイン付きの Web アプリの中の 1 画面。React や Next.js が多い。表や設定の操作が主で、派手な部分は一部 | discord-bot-dashboard-next |
| イベントの順位表・進行表示 | 運営者 | 会場のテレビに映す。上位だけ表示、自動で流す、検索欄を隠す、などの設定がある。部門ごとに別の画面に分ける | Leaderboarded のハッカソン向け記事 |
| 発表・デモの見せ場 | 開発者・登壇者 | 16:9 で全画面。短時間だけ動く。見た目が主で、データは偽物でもよい | 推測 |
| ゲーム外の道具・ランチャー | ゲーム関連の開発者 | Electron や Tauri の窓の中。窓を透明にすることもある | eDEX-UI（Electron）、Tauri の設定説明 |

## 組み込み方

| 組み込み方 | 代表的な使い手 | 部品集に求めること | 根拠 |
|---|---|---|---|
| 素の HTML に CDN から読み込む | イベント運営、デモ、Homepage の `custom.js` | ビルドなしで 1 つの `<script>` で動くこと。部品は HTML のタグとして書けること | Homepage の説明（調査で確認）、ビルドなしの部分は推測 |
| custom element（Web Components） | Home Assistant のカード、どの枠組みからも使いたい人 | `setConfig` のような設定の受け取りと、状態が変わるたびの値の受け取りを分けること。変わった所だけ描き直すこと | Home Assistant の custom card 説明（調査で確認） |
| React / Vue / Svelte | ボットの管理画面、AI の見本画面 | custom element は React 19・Vue・Svelte で問題なく使える。React 18 以前では薄い包み（`@lit/react` など）があると楽 | custom-elements-everywhere、AgnosticUI の振り返り（調査で確認） |
| コードを自分の project に写して使う | 見た目を大きく変えたい人 | 部品の元のコードが読めて、直して使えること。版の更新で上書きが壊れない | shadcn/ui の説明、AgnosticUI の振り返り（調査で確認） |
| OBS のブラウザソース | 配信者 | 背景を透明にできる。固定の大きさで正しく並ぶ。ローカルのファイルでも動く | OBS の公式説明（調査で確認） |
| Raspberry Pi などの全画面ブラウザ | 常時表示の利用者 | 低い性能の機械でも何時間も動く。マウス・キーボードなしで成り立つ | Raspberry Pi の手順（調査で確認）、性能の部分は推測 |
| Electron / Tauri | ゲーム外の道具 | 透明な窓に置けること。Node や Rust 側から値を流し込めること | Tauri の設定説明（透明背景の API）、eDEX-UI（調査で確認） |
| Grafana の文字パネルに HTML を書く | Grafana 利用者 | 既定では HTML が無害化されるため、スクリプトは動かない。管理者が設定を変えないと使えない | Grafana の説明（調査で確認）。この道は狭い（推測） |

## 求められる条件

### 動きの量と負荷
- OBS のブラウザソースでは、動きの多いページが Chrome より重くなるという報告が多い。描画の頻度を 30fps にしたら滑らかになったという報告もある（調査で確認）。
- 隠れたタブでは `requestAnimationFrame` が止まり、タイマーも間引かれる（調査で確認）。ただし壁の常時表示や OBS では画面が常に見えているので、この仕組みでは負荷は下がらない（推測）。
- 描き直しが安いのは、配置も塗りもやり直さずに済む変化である。大きさや位置を変えると配置の計算からやり直しになる（調査で確認）。試作の `backdrop-filter`・毎フレームの WebGL・影は重い側にある（推測）。
- 何時間点けたときの GPU 使用率や電池の減りの数字は、今回は得ていない（不明）。部品集を作る段階で測る必要がある。

### 動きを止められること
- `prefers-reduced-motion: reduce` は前庭障害のある人などのための設定で、動きを消すか、色の変化など穏やかな動きに替えることが勧められている（調査で確認）。
- WCAG 2.2 の達成基準 2.2.2 は、5 秒以上自動で動く・流れる内容と、自動で更新される内容について、止める・隠す・更新の頻度を変える手段を求める（調査で確認）。流れる帯、回る文字、ログの自動更新がこれにあたる。

### 読みやすさ
- 大きな縁取り数字や縦書きの漢字は飾りとしては目立つが、数値を読む場面では普通の数字の表示も要る（推測）。
- custom element では影の DOM をまたいで `label` と入力欄を結べない。読み上げのための情報は部品の中に持たせる必要がある（調査で確認）。
- 順位表のように遠くから見る画面では、表示する件数を絞る設定が使われている（調査で確認）。

### 見た目の変更
- CSS 変数で配色を変えられるのは広く使われている。ただし変数は作者が用意した所にしか効かない。部品の一部を外から直すには `::part` を出す（調査で確認）。
- 依頼者の方針として、見た目は元の作品から離す（CHARTER.md）。配色や飾り文字を差し替えられることは前提になる。

### データの渡し方
- 配信の部品は出来事（寄付・フォローなど）を受けて動く。WebSocket と REST の両方が使われる（調査で確認）。
- Home Assistant は状態が変わるたびにまとめて新しい値を渡し、部品は変わった所だけ描き直す（調査で確認）。
- Grafana は既定では自動更新せず、更新の間隔を選ぶ（調査で確認）。一定間隔で取りにいく形も一般的である（推測）。

### ライセンス
- 雛形の例は MIT が多い（discord-bot-dashboard-next）。eDEX-UI は GPL-3.0 で、組み込む側に条件が付く（調査で確認）。
- 販売はしない（2026-10-29 所有者の判断）。公開するかは未定で、公開するなら使う人の製品に組み込めるライセンスであることが採用の条件になる（推測）。

## 設計への示唆

1. **部品の形は custom element を基本にする**（調査で確認と推測）。Home Assistant のカードがそのまま custom element であり、React 19・Vue・Svelte からも問題なく使える。素の HTML でも書ける。React 18 以前向けの薄い包みは後回しでよい（推測）。
2. **設定と値を分けて受け取る**（調査で確認をもとにした推測）。見た目や構成は属性や設定で 1 回渡す。表示する値は `element.data = {...}` のような代入か、`push(item)` のような追加で渡す。ログや会話は追加、数値やグラフは置き換え、と部品ごとに決める。WebSocket・SSE・一定間隔の取得の接続そのものは部品集に入れず、使う側が値を代入する形にする（推測。配信の部品も Home Assistant も、データの取り方は外側が持っている）。
3. **舞台は固定の 16:9 を標準にし、伸び縮みする配置は部品の単位で対応する**（推測）。配信・イベント・デモ・常時表示はどれも決まった大きさの画面に映す。試作の「1600x900 を拡大縮小する」作りはこれに合う。ただしボットの管理画面に部品だけ置く使い方もあるので、個々の部品は舞台なしでも親の大きさに合わせて描ける必要がある。舞台の基準の大きさは OBS でよく使う 1920x1080 も選べるようにする（1920x1080 が多いことは今回の調査では確認していない）。
4. **背景を透明にする設定を最初から持つ**（調査で確認）。OBS のブラウザソースは背景が透明である前提で重ねる。WebGL の背景は外せる部品にし、背景なしでもパネルだけで成り立つようにする。
5. **動きの量を 3 段階で切り替えられるようにする**（調査で確認をもとにした推測）。「すべて動く」「穏やか」「止める」。`prefers-reduced-motion` を見て初期値を決め、利用者が上書きできる。流れる帯・回る文字・ログの自動更新には止める手段を付ける（WCAG 2.2.2）。描画の頻度の上限も設定にする（OBS で 30fps が効いた報告による）。
6. **動きは transform と opacity に寄せ、`backdrop-filter` と毎フレームの WebGL は外せるようにする**（推測）。何時間も点ける場面が多いので、長時間の負荷を測る手順を設計の段階で決める。
7. **最初に作る部品**（推測）。次の順を勧める。
   1. 舞台（固定の比率・拡大縮小・透明背景・動きの量の設定）
   2. パネル（角を切った枠と見出し）
   3. 大きな数値の表示（値の代入で数字が変わる）
   4. 流れるログ（追加で 1 行ずつ増える）
   5. 横棒・折れ線のグラフ
   6. 画面切り替えの演出
   7. 飾りの部品（バーコード・回る文字・縦書き・流れる帯）

   飾りより先に「データを渡すと動く」部品を作る。CHARTER.md のリスクの節にあるとおり、見た目だけなら AI で数分で似たものが作れる。差が出るのは組み込みやすさとデータの渡しやすさである。
8. **コードを写して使う配り方も検討する**（調査で確認）。shadcn/ui や AgnosticUI は、部品の元のコードを使う人の project に写す形で配っている。見た目を大きく変えたい人には、この形が合う。npm と CDN で配る形と、どちらを主にするかは market.md の調査のあとで決める。
9. **ゲームの中への組み込みは対象外にする**（調査で確認）。Gameface は WebGL も Grid も使えないため、この部品集の作りでは動かない。

## 出典

実際に開いた URL だけを挙げる。

- https://obsproject.com/kb/browser-source — ブラウザソースの初期の大きさ 800x600、背景透明の既定 CSS、描画頻度の設定、見えない時の停止、ローカルファイルの読み込み
- https://obsproject.com/forum/threads/browser-source-very-slow-and-cpu-heavy.133655/ — 動きのある部品が OBS で重くなる報告と、30fps にして改善した報告
- https://docs.streamelements.com/overlays/getting-started — 配信の独自部品が出来事と WebSocket・REST のデータを受けること、重ね画面の大きさの決め方
- https://contributors.home-assistant.io/frontend/custom-ui/card/ — Home Assistant の独自カードが custom element であること、`setConfig` と `hass` の分担
- https://gethomepage.dev/configs/custom-css-js/ — Homepage に `custom.css` と `custom.js` を足せること
- https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/text/ — Grafana の文字パネルの HTML は既定で無害化されること
- https://grafana.com/docs/grafana/latest/dashboards/use-dashboards/ — Grafana の全画面表示と自動更新の設定
- https://reelyactive.github.io/diy/pi-kiosk — Raspberry Pi で全画面表示し、画面の省電力を切る手順
- https://leaderboarded.com/blog/posts/hackathon-leaderboard/ — ハッカソンで順位表を会場のテレビに映す使い方と表示の設定
- https://github.com/fuma-nama/discord-bot-dashboard-next — Discord ボット管理画面の雛形の技術構成、MIT、保守終了
- https://github.com/GitSquared/edex-ui — SF 風の端末画面の需要（約 4.5 万の星）、Electron、GPL-3.0、保守終了
- https://docs.veniceunleashed.net/modding/gameface-migration/ — ゲーム内 UI の Gameface で使えない HTML と CSS
- https://developer.chrome.com/blog/html-in-canvas-origin-trial — HTML-in-Canvas が Chrome 148〜150 の実験機能であること
- https://custom-elements-everywhere.com/ — React 19 を含む 15 の枠組みが custom element に完全対応していること
- https://blog.master.dev/post-mortem-rewriting-agnosticui-with-lit-web-components/ — custom element の部品集での包み、CSS 変数と `::part`、影の DOM と読み上げ、コードを写す配り方
- https://ui.shadcn.com/docs — 部品のコードを使う側に写して渡す配り方
- https://v2.tauri.app/reference/config/ — Tauri で透明な背景の API が使えること（2.12.1 以降は常に有効）
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — 動きを減らす設定の意味と勧められる対応
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html — 自動で動く・更新される内容を止める手段の要件
- https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — 隠れたタブで描画とタイマーが止まる・間引かれること
- https://web.dev/articles/rendering-performance — 配置・塗り・合成の順で描き直しの重さが変わること
