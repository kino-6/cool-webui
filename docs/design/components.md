# 部品の設計

作成: 2026-10-28（T006）。改訂: 2026-10-28（T013。T006 の監査で見つかった 12 点を反映）。
根拠は [usage.md](../research/usage.md)（使い方）、[market.md](../research/market.md)（市場）、[visual-direction.md](visual-direction.md)（見た目）。
方向は HTML の部品集が本体で、Home Assistant は題材の 1 つ（2026-11-04 所有者の判断、CHARTER.md。2026-10-29 は Home Assistant 向けだった）。見た目は利用者が選ぶ（2026-10-30、visual-direction.md の「決めたこと」）。部品集はタイル（`themes/tile.css`）とガラス（`themes/glass.css`）を持ち、どちらを読み込むかで見た目が変わる。部品の作りは変わらない。

前提として決めたこと:

- 部品は custom element で作る。React 19・Vue・Svelte からそのまま使え、Home Assistant のカードもこの形である（usage.md）
- 販売はしない（2026-10-29 所有者の判断）。公開するかは未定で、公開するなら MIT で無料にする（未決事項 8）
- 差を付けるのは見た目ではなく、値の流し込み・動きの量・透明背景・長時間の負荷である（CHARTER.md のリスク、market.md）

## 部品一覧

タグ名の頭は仮に `cw-` とする（製品名が決まったら変える。未決事項 1）。

| 段 | 部品 | 役割 | 設定（属性） | 値（プロパティと関数） |
|---|---|---|---|---|
| 土台 | `<cw-stage>` | 固定比率の舞台。窓に合わせて拡大縮小し、動きの量・背景・一時停止を子に伝える | `ratio`（`16:9` 既定）、`base`（`1600x900` / `1920x1080`）、`motion`、`bg`、`fps`、`paused`、`controls`（`auto` 既定 / `none`） | `pause()`、`resume()` |
| 土台 | `<cw-background>` | canvas の背景。種類ごとに描き方を持つ。`aura` は `.lights = [{color, level}]` の色で地をにじませる（舞台の `.lights` から渡せる） | `kind`（`aura`）、`fps` | なし |
| 土台 | `<cw-panel>` | 枠と名札。中身は差し込み口（slot）に入れる | `label`、`sublabel`、`on`（点いている状態の面にする） | なし |
| 土台 | `<cw-screens>` と `<cw-screen>` | 画面の切り替えと、その演出。`keys` を付けると数字キーの 1〜9 で順に選ぶ。演出は動きの量で変わる（`full` は舞台の `lights` の一番明るい色か差し色が広がって入れ替わる、`calm` は 200ms のフェード、`off` はその場で） | `name`（`<cw-screen>`）、`transition`（`none` で演出なし）、`keys`（入力欄・contenteditable の中と修飾キー付きは無視）、`current`（書けばその画面を出す。演出なし） | `show(name)`。演出の途中でもう一度呼ぶと最後の呼び出しが勝つ。止まっている間は演出なしで切り替える。切り替えたら `cw-screen-change`（`detail` は `{from, to}`） |
| 値 | `<cw-stat>` | 大きな数値と単位。閾値を超えると警告色 | `label`、`unit`、`digits`、`warn-above` / `warn-below`、初期値 `value` | `.value`（数値か数値の文字列。それ以外は空文字・`null`・無限大も含めて `—` と表示。初期値の属性も同じ） |
| 値 | `<cw-status>` | 稼働のランプ、状態名、稼働時間の計測 | 初期値 `state`、`since` | `.state`（`online` / `standby` / `offline` / `unknown`）、`.since`（ISO 8601 の文字列か、1970 年からのミリ秒。属性ではミリ秒を数字の列で書く） |
| 値 | `<cw-clock>` | 日付と時刻。自分で進む | `timezone`、`format` | なし |
| 値 | `<cw-bars>` | 横棒の一覧 | `max`、`unit` | `.data = [{label, value}]` |
| 値 | `<cw-chart>` | 折れ線。直近 N 点を保つ | `points`（既定 120）、`series`（既定 `value`。例 `p50,p95`）、`min` / `max`（省くと値の範囲いっぱい）、`label`、`unit` | `.data =`、`push({p50, p95})` |
| 値 | `<cw-log>` | 流れるログ。新しい行が上。水準の絞り込みを持つ（大文字小文字を区別しない。`lines` で削った後の行にかける） | `lines`（既定 30）、`levels`、`live` | `push({time, level, type, text, id?})`（同じ `id` は行を置き換える）、`clear()` |
| 値 | `<cw-feed>` | 発言や出来事の一覧（話者と本文）。新しいものが上 | `items`（既定 4）、`live` | `push({who, text, time, id?})`（同じ `id` は置き換える） |
| 値 | `<cw-ticker>` | 文字の帯。`full` では右から左へ `speed` px/秒で流れ、それ以外は最新の 1 つを止めて出す。直近 20 件を保つ。`role="marquee"` で、最新の文を `aria-label` に持つ | `speed`（既定 60） | `push(text)`、`push([text, …])` |
| 値 | `<cw-floorplan>` | 家を斜め上から見た間取りの立体図。点いている部屋の床が灯りの色で光り、人の位置と注目の部屋（点線の枠）を出す。`full` では点線が流れ、灯りの点が息をするように動く。それ以外は止まった絵 | `focus`（部屋の `id`）、`label`、`fps` | `.rooms = [{id, name, x, y, w, h, on, color, level, note}]`（升目の単位）、`.people = [{name, color, room}]`（`room` が無ければ外出）、`.items = [{x, y, w, h, z}]`（家具の箱）。部屋を押すか Enter / Space で `cw-room`（`detail` は `{id, on}`）。壁と床の色は `--cw-floor`・`--cw-wall`・`--cw-wall-top` で変えられ、省くと `--cw-surface` に文字色を混ぜて作る |
| 値 | `<cw-flow>` | 電気の流れ。場所を丸で、流れを線の上を走る粒で出す。電力が大きいほど粒が多く、大きく、速く、線が太い。`full` では粒が走り、それ以外は線に沿って止まって並ぶ。端の無い流れは描かない | `unit`、`scale`（線がいっぱいになる値。省くと一番大きい流れ）、`label`、`fps` | `.nodes = [{id, label, value, unit, x, y, color, icon}]`（`x`・`y` は箱の幅と高さに対する 0〜1。`icon` は 24×24 の SVG の path）、`.links = [{from, to, value}]` |
| 飾り | `<cw-ring>` | 円に沿って回る文字と、内側で逆に回る目盛り。文字は円を埋めるまで繰り返し、字間で円の長さにぴったり合わせる。読み上げは 1 回だけ。`full` では `speed` 秒で 1 周し、それ以外は止まる | `text`、`speed`（1 周の秒数、既定 60）、`ticks`（目盛りの数、既定 72）、`fps` | なし |
| 操作 | `<cw-switch>` | 押して点け消しする面。`level` があれば明るさの帯を持つ。押すと `cw-toggle`（`detail` は `{on}`）、帯を離すと `cw-level`（`{level}`、0〜1）を出し、帯を 0 にすると消える。帯の上の矢印キーは押すたびに `cw-level` を出す（キーには離す操作が無い）。指で動かしている間は、外から来た明るさで帯を動かさない。どちらも面をすぐ変え、止まっている間でも効く。外から入れた値は止まっている間は待つ。`full` では点いている灯りの点が息をする。灯りの点は `color` の色で、点いている面の上の明るさの帯は `--cw-signal-on`（無ければ `color`、それも無ければ `--cw-signal`） | `label`、`text`（状態の言葉を置き換える）、`color`（灯りの色）、初期値 `on`・`level` | `.on`、`.level`（0〜1。`NaN` で帯を消す） |
| 値 | `<cw-camera>` | カメラの映像に名前と最後の映像の時刻を重ね、四隅に角の印を付ける。静止画は `refresh` 秒ごとに新しい住所（`?_=`）で取り直し、届いてから入れ替える。`video` では音を消した動画を流す。届かなければ「映像なし」。止まっている間は取り直さず、再開ですぐ取る。`full` では映像が届いている間だけ録画の印が点滅する | `src`、`label`、`refresh`（秒。既定 10、0 で 1 回だけ）、`video` | なし |
| 操作 | `<cw-media>` | 再生中の曲名・アーティスト・ジャケット・進み具合。再生中は位置が自分で進む。前・再生／一時停止・次のボタンで `cw-media`（`{action}`: `play` / `pause` / `next` / `previous`）を出し、再生と一時停止は面をすぐ変える。音量が分かれば帯を出し、離すと `cw-volume`（`{volume}`、0〜1）。何も再生していなければ「再生していない」。止まっている間は時計が止まり、新しい値は待つ。`full` では再生中に小さな棒が踊る。幅が 320px 以下ではジャケットと棒を、240px 以下では音量も隠す | なし | `.now = {title, artist, art, state, position, duration, volume, controls}`（足りない項目は前の値のまま。`state` は `playing` / `paused` / `idle` / `off`、位置と長さは秒。`controls` は出すボタンの並びで、既定は `['previous', 'play', 'next']`） |
| 操作 | `<cw-vacuum>` | 掃除機の状態を Home Assistant の言葉（`cleaning`、`docked`、`paused`、`idle`、`returning`、`error`）で受けて日本語で大きく出し、電池・掃除した広さ（m²）・時間（分）を添える。エラーは警告の色で、その文を下に出す。電池 20% 以下は警告の色。始める（掃除中は一時停止）・止める・戻すのボタンで `cw-vacuum`（`{action}`: `start` / `pause` / `stop` / `return`）を出し、面をすぐ変える。状態が分からない間はボタンを押せない。止まっている間は新しい値を待つ。`full` では掃除中と戻り中に丸い絵が回る。幅 240px 以下では詳しい行を隠す | `label` | `.now = {state, battery, area, duration, error, controls}`（足りない項目は前の値のまま。`controls` は出すボタンで、既定は `['start', 'pause', 'stop', 'return']`。掃除中の一時停止は `pause` があるときだけ） |
| 操作 | `<cw-cover>` | 窓の覆いを、窓の絵に下りてくる覆いで描き、状態（`open`、`closed`、`opening`、`closing` を日本語で）と開き具合（100 が全開）を出す。開ける・止める・閉めるのボタンで `cw-cover`（`{action}`: `open` / `stop` / `close`）を出し、面をすぐ変える。位置が分かれば帯を出し、離すと `cw-position`（`{position}`）。指で押さえている帯は外から動かさない。状態が分からない間はボタンを押せない。止まっている間は新しい値を待つ。`full` では動いている間に覆いの羽根が流れる。幅 220px 以下では絵を小さくし、帯を隠す | `label` | `.now = {state, position, controls}`（足りない項目は前の値のまま。`controls` の既定は `['open', 'stop', 'close', 'position']`） |
| 操作 | `<cw-alarm>` | 防犯の状態を Home Assistant の言葉で受けて日本語で大きく出す（警戒中は強調の色、発報は警告の色）。解除中は警戒の型のボタン（在宅・外出・夜間・長期不在・一部を除く）を、それ以外は「解除」を出す。暗証番号の形が `number` なら数字の押しボタン、`text` なら伏せ字の入力欄を出し、入った文字は数だけ「●」で見せる。解除には暗証が、警戒には `codeArmRequired` のときだけ暗証が要り、入るまでボタンを押せない。押すと `cw-alarm`（`{action, code}`）を出し、面を切り替え中にして暗証を消す。暗証番号は画面にも読み上げにも出さない。止まっている間は新しい値を待つ。`full` では発報の文字が点滅する | `label` | `.now = {state, codeFormat, codeArmRequired, modes}`（足りない項目は前の値のまま） |
| 操作 | `<cw-todo>` | やることを、未完了は期限の近い順（期限なしは後ろ）に並べる。期限は「今日」「明日」「昨日」か日付で、期限切れは警告の色。丸を押すと `cw-todo`（`{uid, summary, status}`）を出し、面をすぐ変える。`readonly` では押せない。終えたものは `done` のとき取り消し線で後ろに並べ、そうでなければ「完了 N 件」とだけ出す。`max` 件より多いときは「ほか N 件」。止まっている間は新しい値を待ち、期限の言葉は 1 分ごとに見直す。`full` では期限切れが明滅する。幅 200px 以下では期限を隠す | `max`（既定 8）、`done`、`readonly` | `.items = [{uid, summary, status, due}]`（status は `needs_action` / `completed`） |
| 値 | `<cw-agenda>` | 今日からの予定を、日ごとの見出し（今日・明日・日付）の下に時刻の順で並べる。終わった予定は消え、進行中の予定に「いま」、今日の次の予定に「あと何分」を出す。終わりの無い予定は 1 時間、終日の予定はその日いっぱいとみなす。日付だけの文字列（`2026-11-03`）はその土地の 0 時として読む。前日から続く予定は今日の見出しの下に「〜11:00」と出す。今日の次の予定は 60 分までは「あと N 分」、それより先は「あと N 時間 M 分」。幅 260px 以下では終わりの時刻を省き、札は切らない。時計は 30 秒ごとに見直し、止まっている間は新しい予定を待つ。`full` では「いま」の帯が明滅する | `days`（既定 7）、`max`（既定 8 行） | `.events = [{title, start, end, allDay, where, color}]`（`start`・`end` は ISO 8601 か 1970 年からのミリ秒。`start` が読めないものは捨てる）、`.now`（ミリ秒。書くと時計を止める） |
| 値 | `<cw-weather>` | いまの気温・空模様・最高と最低・湿度・風と、数日の予報。空模様は Home Assistant の言葉（`sunny`、`rainy` など）で受けて日本語にし、太陽・月・雲・降るもの・稲妻・風の組み合わせの絵を描く。知らない言葉はそのまま出し、絵は雲にする。止まっている間は新しい値を待つ。`full` では太陽が回り、雨や雪が降る（止まっている間と `calm` では止まる）。雲は地の色で塗りつぶし、ガラスでも後ろの太陽が透けない。幅 280px 以下では絵と数字を小さくし、240px 以下では予報を 3 日に絞る。数として読めない値（`unavailable`、`null`、空）は「—」か「–」 | `unit`（既定 `°C`）、`days`（予報の日数、既定 5） | `.now = {condition, temp, high, low, humidity, wind}`（風は m/s）、`.forecast = [{time, condition, high, low, rain}]`（雨は %） |
| 値 | `<cw-battery>` | 電池の残りを少ない順に、名前・横棒・% で並べる。`low` 以下は警告の色にして「少ない」と読ませる。充電中は横棒を良い色にして「充電中」と添える。値の読めないものは「—」で最後に、少ないかどうかだけ分かるもの（`low: true` は「少ない」、`low: false` は「十分」）はその手前に置く。`max` 件より多いときは「ほか N 件」。止まっている間は新しい値を待つ。`full` では少ない横棒が明滅する（止まっている間と `calm` では止まる）。幅 200px 以下では横棒を隠す | `low`（既定 20）、`max`（既定 8） | `.items = [{name, level, charging, low}]`（level は 0〜100） |
| 値 | `<cw-timer>` | 残り時間を数字（1 時間以上は h:mm:ss）と、減っていく帯で出す。動作中は終わる時刻まで 1 秒ごとに数え、一時停止と待機は渡された残りを出す。待機で残りが無ければ全体の長さを出す。動作中に終わる時刻を過ぎると「終了」に変え、`cw-done` を 1 回だけ出す。止まっている間は数字が止まり、新しい値は待つ。再開すると追いつく。`full` では終わった数字が点滅する | `label` | `.now = {state, end, remaining, duration}`（state は `active` / `paused` / `idle` / `done`、end は時刻、remaining と duration は秒） |
| 値 | `<cw-person>` | 人ごとに、写真（無ければ名前の頭文字）、名前、居場所（`home` は「在宅」、`not_home` は「外出」、ほかはゾーンの名前のまま）、いつからそこにいるか（「25分前から」）を並べる。在宅の人を先にし、輪を良い色にする。時間は 1 分ごとに見直す（止まっている間は見直さない）。止まっている間は新しい値を待つ。`full` では在宅の人の輪が呼吸する。幅 220px 以下では「いつから」を隠す | なし | `.people = [{name, place, since, picture}]`（since は時刻） |
| 値 | `<cw-area>` | 部屋 1 つの名前・温度（大きく）・湿度・点いている照明の数（「照明 2/3 点灯」）・人の動き（「動きあり」「動きなし」）。照明のボタンは 1 つでも点いていれば全部消し、無ければ全部点ける。`cw-lights`（`{on}`）を出し、面をすぐ変える。照明が無い部屋はボタンを出さない。止まっている間は新しい値を待つ。`full` では動きがある間、印が脈打つ。幅 200px 以下では湿度を隠す | `label`、`unit`（既定 `°C`） | `.now = {temperature, humidity, lightsOn, lights, motion}`（足りない項目は前の値のまま） |
| 値 | `<cw-sky>` | 地平線の上の弧に、日の出から日の入りまでのどこにいるかを太陽で描き、日の出・日の入りの時刻と昼の長さを出す。夜は弧を薄くして月の満ち欠けを描き、言葉（新月・三日月・上弦の月・満ちていく月・満月・欠けていく月・下弦の月・有明の月）を添える。時刻は 1 分ごとに見直す（止まっている間は見直さない）。止まっている間は新しい値を待つ。`full` では太陽が明滅する。幅 220px 以下では昼の長さを隠す | なし | `.now = {rise, set, phase}`（rise と set は時刻、phase は moon の連携の言葉） |
| 操作 | `<cw-dial>` | 270 度の円弧に値を描き、真ん中に数字・単位・名前を出す。`target` があれば円弧の上の印と − ＋ のボタンで `step` ずつ動かし、押すたびに `cw-target`（`{target}`）を出す。押した直後の 1.5 秒に外から来た設定値は、その間は待たせ、1.5 秒後に最後の 1 つを出す。上限・下限ではボタンが効かず、キーで押していたときはフォーカスを反対のボタンへ移す。設定値の桁は `step` の桁に合わせる。高さ 150px 以下では円弧を隠し、数字とボタンを 1 列に並べる。警告の閾値を超えると円弧と数字が警告の色。止まっている間は値を待つ。円弧は `calm` で 200ms、`full` で 900ms かけて伸び、`off` ではすぐ | `label`、`unit`、`min`・`max`（既定 0〜100）、`step`（既定 0.5）、`digits`、`warn-above`・`warn-below`、初期値 `value`・`target` | `.value`、`.target`（`NaN` で印とボタンを消す） |
| 接続 | `<cw-source>` | WebSocket・SSE・一定間隔の取得・`postMessage` から決まった形の通知を受け、舞台の中の部品に配る。本体とは別ファイル（`dist/cw-source.js`）で、使う人だけが読み込む | `src`、`kind`（`ws`（既定） / `sse` / `poll` / `message`）、`interval`、`origin` | `handle(payload)`（受け取った 1 回分を直接渡す） |

値の段の部品と `<cw-background>` は、どれも `paused` 属性と `pause()` / `resume()` を持つ（共通の約束の「一時停止」）。

### 飾りの描き方

タイルとガラスは飾りを使わない（ha-look.md の候補1・候補2）。そのため飾りの part（`screw`、`hazard`、`ghost`）は作らない（2026-10-30 改訂。それまでは案C のために置いていた）。
飾りが要る見た目を足すときは、部品の影の DOM に空の要素を置き、`::part` の名前で外に出す。部品の数は増やさない（market.md の危険 5）。

## 共通の約束

### 形と大きさ

- どの部品も影の DOM（shadow DOM）に閉じる。外から直せる所は `::part()` の名前で出す（`frame`、`label`、`sublabel`、`value`、`unit`、`row`、横棒の `fill`、折れ線の `line`（系列ごとに `line-0`、`line-1`…）、状態の `lamp`・`since`、時計の `date`、ログの `time`・`level`・`type`・`text`、発言の `item`・`who`、帯の `track`、舞台の一時停止のボタン `pause`）
- どの部品も親の箱いっぱいに描く（`:host { display:block }`、中は親の大きさに合わせる）。`<cw-stage>` の中でなくても使える。ボットの管理画面に 1 つだけ置く使い方があるため（usage.md 設計への示唆 3）
- 設定は属性で受け、表示する値はプロパティと関数で受ける。初期値だけは属性でも受ける（`<cw-stat value="2.3">`）。HTML だけで見本を作れるようにするため。読み込んだ後に属性を変えても値は変わらない
- 出来事は `cw-` で始まる CustomEvent で知らせる（`bubbles: true, composed: true`）。例: `cw-screen-change`、`cw-pause`、`cw-source-error`
- 登録は `customElements.get(name)` で確かめてから行う。npm 版と CDN 版が同じ頁に 2 回読み込まれても例外にしない

### 配色と書体

配色と書体は、配色の CSS ファイル 1 枚で決める。値は ha-look.md の候補1・候補2 のもの。

| 変数 | 意味 | タイル（`themes/tile.css`） | ガラス（`themes/glass.css`） |
|---|---|---|---|
| `--cw-ground` | 舞台の地 | `#121212` | `linear-gradient(180deg, #02060B 0%, #0E1A24 100%)` |
| `--cw-ground-solid` | `bg="plain"` のときの地の単色 | `#121212` | `#02060B` |
| `--cw-surface` | パネルの面 | `#1D1D1D` | `rgba(255,255,255,0.06)` |
| `--cw-surface-on` | 点いている状態の面 | `rgba(255,255,255,0.85)` | `rgba(122,162,190,0.22)` |
| `--cw-text-on` | 点いている面の文字 | `#121212` | `#EAEBEE` |
| `--cw-border` | パネルの縁 | `1px solid rgba(255,255,255,0.06)` | `0.5px solid rgba(234,235,238,0.22)` |
| `--cw-radius` | パネルの角丸 | `16px` | `20px` |
| `--cw-blur` | パネルの後ろのぼかし | `none` | `blur(12px) saturate(1.2)` |
| `--cw-well` | 表示窓（グラフの下地） | `#171717` | `rgba(0,0,0,0.25)` |
| `--cw-text` | 文字 | `#EDEDED` | `#EAEBEE` |
| `--cw-text-dim` | 薄い文字 | `#9A9A9A` | `#9AA6B2` |
| `--cw-signal` | 差し色 | `#4A90C2` | `#7AA2BE` |
| `--cw-ok` | 正常 | `#80C994` | `#80C994` |
| `--cw-warn` | 警告 | `#F18B82` | `#F0B45A` |
| `--cw-font` | 文字（日本語は後ろの Noto Sans JP） | Inter | Hanken Grotesk |
| `--cw-background-kind` | `bg="auto"` のときに舞台が作る背景の種類 | `plain` | `plain` |

`--cw-text-dim`、`--cw-well` と、タイルの `--cw-text` は ha-look.md に無いので、推測で決めた値である。
派手な動き（`motion="full"`）では、舞台が `aura` の背景を作る（下の「動きの量」）。

書体は部品集に同梱しない。配色の CSS が Google Fonts を読む。OBS で外に出られない環境のために、手元の書体を使う書き方を説明に載せる。

### ゲームの見た目

3 つ目の見た目（`themes/game.css`、2026-10-31 追加）。最初の試作の面白さ（傾いた枠、巨大な文字、流れる背景、切り替えの演出）を、元の作品と違う配色と書体で部品集に戻す（visual-direction.md の「決めたこと」）。
上の表の変数に加えて、枠の傾きと見出しの帯の変数を持つ。タイルとガラスはこの変数を持たないので、どの部品も既定の値（傾き・影・帯なし）で描く。

| 変数 | 意味 | ゲーム（`themes/game.css`） |
|---|---|---|
| `--cw-ground` | 舞台の地 | `radial-gradient(120% 90% at 30% 20%, #1E1830 0%, #0B0912 70%)` |
| `--cw-ground-solid` | `bg="plain"` のときの地の単色 | `#0B0912` |
| `--cw-surface` | パネルの面 | `#16121F` |
| `--cw-surface-on` | 点いている状態の面 | `#FFC21A` |
| `--cw-text-on` | 点いている面の文字 | `#140F04` |
| `--cw-border` | パネルの縁 | `2px solid rgba(255, 194, 26, 0.28)` |
| `--cw-radius` | パネルの角丸 | `2px` |
| `--cw-blur` | パネルの後ろのぼかし | `none` |
| `--cw-well` | 表示窓 | `#0E0B15` |
| `--cw-text` | 文字 | `#F4F1FF` |
| `--cw-text-dim` | 薄い文字 | `#8E87A6` |
| `--cw-signal` | 差し色 | `#FFC21A` |
| `--cw-ok` | 正常 | `#8BEA4E` |
| `--cw-warn` | 警告 | `#FF4FD8` |
| `--cw-font` | 文字（日本語は M PLUS 1） | Archivo |
| `--cw-background-kind` | 舞台が作る背景の種類（斜めの光の帯が横へ流れる。`full` 以外では止まった 1 枚） | `streaks` |
| `--cw-wipe` | `full` の画面切り替えの演出（斜めの板が左から右へ横切る。無ければ丸く広がる光） | `slash` |
| `--cw-tilt` | 枠の傾き（パネルごとに `style="--cw-tilt:1deg"` で変えられる） | `-0.8deg` |
| `--cw-shadow` | 枠のぼかさない影 | `8px 8px 0 rgba(255, 194, 26, 0.16)` |
| `--cw-label-bg` | 見出しの帯の色 | `#FFC21A` |
| `--cw-label-color` | 見出しの帯の文字 | `#140F04` |
| `--cw-label-on-bg` | 点いている枠の見出しの帯の色（帯が枠に溶けないように入れ替える） | `#140F04` |
| `--cw-label-on-color` | 同じく帯の文字 | `#FFC21A` |
| `--cw-signal-on` | 点いている面の上の差し色（`<cw-switch>` の灯りの点と明るさの帯。差し色と点いている面が同じ色なので分ける） | `#140F04` |
| `--cw-label-skew` | 見出しの帯の傾き | `skewX(-12deg)` |
| `--cw-label-pad` | 見出しの帯の余白 | `3px 12px` |
| `--cw-display-font` | 大きな数字と見出しの書体 | Archivo |
| `--cw-display-weight` | 同じく太さ | `900` |
| `--cw-display-stretch` | 同じく幅 | `125%` |

元の作品の配色（白・ミント・赤）と書体（Anton、Dela Gothic One、Playfair Display）は使わない。`tools/check_theme_tokens.mjs game` が表と CSS を突き合わせる。

### 背景と透明

`<cw-stage bg>` の取り得る値と、`<cw-background>` との役割分担は次のとおり。

| `bg` の値 | 舞台の地 | 背景の部品（canvas） | 使う場面 |
|---|---|---|---|
| `auto`（既定） | `--cw-ground` | 配色の CSS が決めた `kind`。それが `plain` なら、`motion` が `full` のときだけ `aura`、それ以外は作らない | 普通の表示 |
| `aura` などの名前 | `--cw-ground` | その `kind` の `<cw-background>` を舞台が中に作る | 配色と違う背景にしたいとき |
| `plain` | `--cw-ground-solid` の単色 | 作らない | 負荷を下げたいとき |
| `none` | 透明 | 作らない | OBS に重ねるとき |

`bg="none"` のときは舞台の `--cw-ground` を透明にし（舞台の中で `var(--cw-ground)` を読む要素も透明になる）、背景の部品も作らず、描画の繰り返しも回さない。パネルの面（`--cw-surface`）は残るので、重ねても数値は読める。T004 の監査で、案C の見本が透明にしても描画を回し続けていた点を、ここで部品の約束にする。
`<cw-background>` は舞台の外でも単独で置ける。そのときは自分の `fps` と `motion` 属性に従う（OS の「動きを減らす」が優先）。`aura` 以外の名前を `bg` や `--cw-background-kind` に書いた場合も、いまは `aura` として描く（種類は `aura` だけ）。

### 一時停止（WCAG 2.2.2）

自動で流れ・更新されるもの（ログ、発言、帯、グラフ、数値、背景）を止める手段を、次の 3 つ用意する（usage.md 求められる条件）。

1. `<cw-stage paused>` 属性、または `stage.pause()` / `stage.resume()`。舞台の中の部品が一斉に止まる
2. 舞台が右下に小さな一時停止のボタン（`::part(pause)`）を出す。`controls="none"` で隠せる（OBS に重ねるとき）
3. 舞台の外に置いた部品は、それぞれの `paused` 属性と `pause()` / `resume()` で止める

伝え方と優先: 舞台は止まると子孫の部品に `paused` を直接付けず、自分の `paused` 属性だけを持つ。部品は「自分の `paused` 属性がある」か「最も近い舞台が `paused`」のどちらかで止まる。舞台の中の部品は、つながったときに舞台の `members` に自分を登録する。舞台は `paused` が変わると `members` の各部品に知らせ、再開のときは各部品が反映した件数を足して `cw-resume` の `detail.applied` にする（2026-10-30 改訂。それまでは部品が舞台の属性の変化を見張る形（MutationObserver）だった。件数を数えるには舞台が部品を知っている必要があるため変えた）。部品が自分で止まっているときに舞台を再開しても、その部品は止まったままになる。

止まっている間に届いた値は捨てない。数値は最新の 1 つだけを、ログと発言は上限の行数までを溜めておき、再開したときに 1 コマで反映する。

出来事: 止めた要素（舞台か部品）が、止まったときに `cw-pause` を 1 回、再開したときに `cw-resume` を 1 回出す。`cw-resume` の `detail.applied` は、再開で反映した値の数である（状態の部品で `state` と `since` が溜まっていれば 2）。舞台が止まっている間に部品が自分で再開したときも `cw-resume` を出す。このときは溜めた値をまだ反映しないので `applied` は 0 で、舞台の再開で反映する。

部品ごとの止まり方:

| 部品 | 止まっている間 |
|---|---|
| `<cw-clock>` | 表示を止める。再開したら今の時刻に戻る（遅れた時刻は出さない） |
| `<cw-status>` | ランプの点滅と稼働時間の表示を止める。`.state` の変化は溜めて、再開で反映する |
| `<cw-stat>` | 最新の値だけを溜める |
| `<cw-bars>` | 最新の `.data` だけを溜める |
| `<cw-chart>` | `push` された点は上限（`points`）まで溜め、再開で一度に足す。止まっている間の `<cw-chart>` の `.data =` による置き換えは、それまでに溜めた `push` を捨てて置き換えだけを溜め、再開で反映する（反映した件数は置き換えの 1 と、その後の `push` の数） |
| `<cw-log>`、`<cw-feed>` | 上限の行数まで溜める。超えた分は古い順に捨てる |
| `<cw-ticker>` | 流れを止める。`push` された文字は溜める |
| `<cw-background>` | 描画の繰り返しを止め、最後の 1 枚を残す |

### 読み上げと操作

- `<cw-stat>` と `<cw-status>` は、値を含む `aria-label` を持つ。`<cw-bars>` は `role="list"` で、行ごとに名前と値の `aria-label` を持つ。`<cw-chart>` は `role="img"` で、最新の値の `aria-label` を持つ
- `<cw-log>` と `<cw-feed>` は、既定で読み上げに流さない（`aria-live="off"`）。毎秒の更新を読み上げると使えなくなるため。`live="polite"` 属性で `polite` にできる
- 切り替えのキー操作は `<cw-screens keys>` を付けたときだけ有効にする。埋め込み先のキー操作を奪わないため
- 受け取った文字列は `textContent` でしか表示しない。どの部品も、値を HTML として差し込まない

## データの渡し方

### 2 つの渡し方

| 種類 | 使う部品 | 書き方 | 部品の中で起きること |
|---|---|---|---|
| 置き換え | stat、status、bars、chart（まとめて） | `el.value = 2.3`、`el.data = [...]` | 前の値を捨て、変わった所だけ描き直す |
| 追加 | log、feed、ticker、chart（1 点ずつ） | `el.push(item)`、`el.push([a, b])` | 末尾に足し、上限を超えた分を捨てる |

### 決まった形の通知（`<cw-source>`）

usage.md の示唆 2 は「接続そのものは部品集に入れない」としていた。この設計はそれを変える。
変える理由は、market.md で「JavaScript を書かない利用者が自分の値を流し込める部品」が見つからず、それがこの部品集の差になるからである。使う場面に挙げた配信者は、JavaScript を書かない。
示唆 2 の狙いは守る。`<cw-source>` は本体とは別のファイルで、読み込まなければ部品は接続を一切持たない。認証や接続先の管理は、これまでどおり使う側の道具が持つ。

通知は JSON 1 個で 1 つの操作を表す。

```json
{ "id": 1042, "to": "#p50", "op": "set", "value": 2.3 }
{ "id": 1043, "to": "#log", "op": "push", "value": { "time": "19:01:17", "level": "info", "type": "SPEAK", "text": "chars=35" } }
{ "id": 1044, "to": "cw-status", "op": "set", "prop": "since", "value": "2026-10-28T19:00:00+09:00" }
```

決まり:

- **探す範囲**: `to` は CSS セレクタで、`<cw-source>` を含む最も近い `<cw-stage>` の中を探す。舞台が無ければ文書全体を探す
- **複数に当たったとき**: 当たったものすべてに同じ操作をする（同じ値を 2 か所に出す使い方のため）
- **一致しないとき**: 何もせず、`cw-source-error` を出す（`detail.code = "no-target"`）。セレクタとして壊れているときも同じ
- **値を持たない部品に当たったとき**: `cw-panel` など、下の表に無い部品は `"bad-prop"`。`push` に `prop` を付けたときは `"bad-op"`
- **不明な op**: `op` は `set` と `push` だけ。それ以外は何もせず `cw-source-error`（`"bad-op"`）
- **壊れた JSON**: その 1 件を捨てて `cw-source-error`（`"bad-json"`）。接続は切らない
- **既定の prop**: `prop` を省いたときの書き込み先は部品ごとに決める。stat は `value`、status は `state`、bars は `data`、chart は `set` なら `data`。後から足した部品は、`.now` を持つもの（media・weather・vacuum・timer・cover・area・sky・alarm）は `now`、一覧を持つもの（battery・todo は `items`、person は `people`、agenda は `events`）はその一覧、switch は `on`、camera は `src`、dial は `value`、floorplan は `rooms`、flow は `links`、ring は `text`（2026-11-04、T120）。log・feed・ticker は `push` だけを受け、`set` は `"bad-op"` にする。逆に、stat・status・bars は `set` だけを受け、`push` が来たら `"bad-op"` にする
- **1 回に受け取る形**: WebSocket の 1 メッセージ、SSE の 1 イベント、一定間隔の取得の 1 応答、`postMessage` の 1 回は、どれも「JSON の通知 1 個」か「通知の配列」のどちらか。改行で区切った複数の JSON は受けず、`"bad-json"` にする
- **配列の途中で失敗したとき**: 失敗した 1 件だけ `cw-source-error` を出して飛ばし、残りは続ける
- **`id` は任意**: 付いていれば重複の除去に使う。無ければ毎回適用する。部品の項目（log・feed の `id?`）とは別物で、通知の `id` は `<cw-source>` だけが見る
- **一定間隔の取得**: `kind="poll"` は `interval` 秒ごと（既定 5 秒、最短 1 秒）に `src` を GET し、応答の本文を上の「1 回に受け取る形」として扱う。前の取得が終わるまで次は出さない
- **書き換えてよい prop**: 各部品が値として公開しているプロパティ（上の部品一覧の「値」の列）だけ。`innerHTML`、`textContent`、`style`、属性、関数など、それ以外は拒んで `cw-source-error`（`"bad-prop"`）
- **配列で届いたとき**: 1 つの通知に配列が来たら、順に適用し、描き直しは 1 コマにまとめる（部品の描き直しは Lit が次のマイクロタスクにまとめるので、`<cw-source>` は何もしない。検査はしていない）
- **重複**: `id` が付いていれば、直近 500 件の `id` を覚え、同じ `id` は捨てる。一定間隔の取得では、前回の最後の `id` を `?after=` で付けて取りに行く。続きだけを返すかはサーバー次第で、重複が来ても `id` で落とす
- **繋ぎ直し**: 切れたら間隔を倍にしながら繋ぎ直す（上限 30 秒）。切れている間は最も近い舞台に `data-link="down"` を付ける。舞台が無ければ `<cw-source>` 自身に付ける。取りこぼしは、SSE ならブラウザが `Last-Event-ID` を送るのでサーバー次第で埋まる。WebSocket では埋めない
- **送り元（origin）**: `kind="message"` で `postMessage` を受けるときは、`origin` 属性に書いた送り元だけを受ける。空白で区切って複数書ける。属性が無ければ同じ origin だけを受ける。合わない送り元からの通知は黙って捨てる（エラーも出さない。外からの探りに答えないため）
- **エラーの知らせ方**: `cw-source-error` は `<cw-source>` から出る。`detail` は `{ code, message, raw }`。開発中に見えるよう、同じ内容を `console.warn` にも出す

## 動きと負荷

### 動きの量

| 段階 | 背景 | 続く動き（帯・ランプの点滅など） | 画面切り替え | 値の更新 |
|---|---|---|---|---|
| `full` | 動く（上限 `fps`、既定 30） | あり | 演出あり | 数字が桁ごとに転がる |
| `calm` | 1 枚だけ描いて止める | なし | 短い演出（フェードのみ） | あり |
| `off` | 1 枚だけ描いて止める | なし | 演出なし | あり（その場で数字が変わるだけ） |

- 既定は `auto` で、`calm` として動く（Home Assistant 向けの方向、CHARTER.md）。`full` は `motion="full"` と書いたときだけ。2026-10-29 までは「reduced-motion でなければ full」だった
- 続く動きは `transform` と `opacity` だけで作る。`backdrop-filter` は使わない
- 画面外の部品は `IntersectionObserver` で描き直しを止める（未実装。実装の順番 12 の負荷の測定で要るかを決める）
- 一時停止（共通の約束）は動きの量とは別の操作で、どの段階でも使える

### 負荷を測る手順

何時間も点けたときの負荷の数字は、調査では得られなかった（usage.md）。そこで `tools/perf.mjs` を作り、次を測る（2026-10-30、T047。見本は `demo/home.html`）。

- 測るもの: CPU 時間、1 コマにかかった時間の 95 パーセンタイル（Chrome DevTools Protocol）、GPU 使用率（macOS は `powermetrics` の GPU の稼働率、Raspberry Pi は `vcgencmd` などの OS の道具）
- 測る場面: `full`、`calm`、`off`、`bg="none"` の 4 通り
- 測る環境: 机の Chrome、OBS のブラウザソース、Raspberry Pi 5 の全画面 Chromium（壁の常時表示）
- つなぎ方: Chrome と Raspberry Pi の Chromium は `--remote-debugging-port=9222` で起動して CDP でつなぐ。OBS は起動の引数 `--remote-debugging-port=9222` でブラウザソースの中の頁に CDP でつなげる（OBS の版ごとに実装の 12 番で確かめる）
- 回す時: 1 場面 6 秒の短い版を、行の検査と push 前のフル検査に入れる（2026-10-30 改訂。30 秒の版を push ごとに回すと 2 分かかるうえ、いま確かめるのは大小関係だけなので 6 秒で足りる）。短い版は机の Chrome だけで、CPU 時間とコマの時間だけを測る。記録用の 30 秒の版は手で回す（`node tools/perf.mjs --seconds 30 --out docs/perf/<日付>.md`）。`powermetrics` は root（`sudo`）が要るので、GPU は push 前には測らない。1 場面 10 分の長い版は、版を出す前に 3 つの環境すべてで回し、GPU も測る。どちらも行の検査（2 分）には入れない
- 残し方: 結果を `docs/perf/<日付>.md` に残す

合否の線は、最初の測定の後に決める。いまは数字を置かない（根拠のない数字は書かない）。いま確かめるのは、`calm` と `off` が `full` より軽いこと、背景が `full` で地のあるときだけ描かれることの 2 つである。

### 部品の検査の作り

T004 の監査で、見本が「空でないか」しか見ていなかった。部品ではこれを最初から強くする。

- 部品ごとに見本の頁を 1 枚置く（`demo/<部品>.html`）
- 検査は headless Chrome で見本を開き、JS のエラーが 0 件、期待する文字や要素が DOM にある、値を入れたら表示が変わる、の 3 つを見る
- `<cw-source>` は、決まりの節の各項目（一致しない・不明な op・壊れた JSON・拒む prop・重複）ごとに、`cw-source-error` の `code` と表示の変化を確かめる
- 見た目は撮影して目で確かめる。headless の合格を見た目の合格に読み替えない

## 配布の形

| 形 | 中身 | 使う人 | 理由 |
|---|---|---|---|
| npm の ES モジュール | 部品ごとに読み込める | React・Vue・Svelte の開発者 | 普通の入り方 |
| CDN の 1 ファイル（ES モジュール） | 全部品をまとめたもの | 素の HTML、Homepage の `custom.js` | `<script type="module">` 1 行で動く |
| 1 ファイルの古い形式（IIFE） | 全部品をまとめたもの | OBS でローカルのファイルを開く人 | 下の注を参照 |
| `<cw-source>` の別ファイル | 接続の部品だけ | 値を流し込みたい人 | 読み込まなければ接続を持たない |
| 配色の CSS | `themes/*.css` | 全員 | 見た目の差し替えは CSS だけで済ませる |
| Home Assistant のカード | `integrations/ha-card.js` | Home Assistant の利用者 | 最初の利用者（market.md） |

IIFE 版を作る理由: Chrome は `file://` で開いた頁の `type="module"` を読み込まない（2026-10-28 に手元の Chrome の headless で確認。普通の `<script>` は動いた）。
OBS はローカルのファイルを、版によって `http://absolute/` を前に付けて開くという報告と、`file:///` で開く回避策の報告がある（[フォーラム 1](https://obsproject.com/forum/threads/browser-source-appears-to-have-incorrect-prefix-for-local-files.187002)、[フォーラム 2](https://obsproject.com/forum/threads/way-to-enable-local-file-access-for-obs-browser-source.115344)）。
どちらで開かれても動くのは古い形式なので、これを用意する。OBS の実機での確かめは実装の 12 番で行う。

内部の作りには Lit 3 を使う。属性とプロパティの対応、変わった所だけの描き直しを自前で書くより短く、custom element の部品集での使用例もある（usage.md の出典、AgnosticUI）。利用者は Lit を意識しない。

### Home Assistant のカードとの対応

Home Assistant の独自カードは、`setConfig(config)` で設定を受け、`hass` で状態の全体を受け、`getCardSize()` で高さを返す custom element である（usage.md の出典）。
`integrations/ha-card.js` は `cw-ha-card` というカードを登録し、次のように部品へ写す。

| Home Assistant の口 | 部品への写し方 |
|---|---|
| `setConfig({ title, look, motion, entities: [{ entity, kind, label, unit, digits, attributes }] })`（`attributes` は `kind: "bars"` のときだけ使う属性名の配列。`look` は `tile`（既定）、`glass`、`game`、`motion` は `calm`（既定）・`full`・`off`） | `<cw-panel label=title>` を作り、`entities` の各行を `kind`（`stat` / `status` / `bars`）の部品にする。設定の誤りは例外で返す（Home Assistant の決まり） |
| `set hass(hass)` | 各行の `kind` ごとに写す（下の表）。前回と同じ値なら入れない |
| `getCardSize()` | 見出しの 1 に、行の種類ごとの高さ（50px 単位で stat 1.7、status 0.6、bars は棒 1 本ごとに 0.5）を足して切り上げる。見本の各カードで実際の高さとの差は 1 以内（T042） |

`kind` ごとの写し方（`s = hass.states[entity]`）:

| `kind` | 写し方 | `s` が無い、または `s.state` が `unavailable` / `unknown` のとき |
|---|---|---|
| `stat` | `Number(s.state)` を `value` に入れる。単位は設定の `unit`、無ければ `s.attributes.unit_of_measurement` | `value` に `NaN` を入れる（`—` と表示） |
| `status` | `off` / `not_home` / `closed` / `idle` / `paused` は `standby`、`unlocked` / `jammed` / `problem` は `offline`（注意の色）、それ以外（`on` / `home` / `open` / `playing` / `locked` など）は `online`。表示する言葉は HA の状態を日本語にしたもの（`locked` は「施錠」、`unlocked` は「解錠」、`on` は「オン」など。表に無い言葉はランプの状態名）。`since` には `s.last_changed` を入れる | `state` を `unknown` にし、`since` を消す（古い経過時間を出さない） |
| `bars` | 設定の `attributes`（属性名の配列）に書いた順に、`s.attributes[名前]` を 1 本ずつの横棒にする（`[{label: 属性名, value: Number(値)}]`）。数値にならない属性は飛ばす。`attributes` が無い `bars` の行は、`setConfig` が例外で返す | `data` を空にする |

Home Assistant の中では舞台を使わず、カードの大きさに合わせて部品を描く（共通の約束の「親の箱いっぱいに描く」）。
見た目と動きは、カードの設定の `look` と `motion` で利用者が選ぶ（2026-10-30、T038）。どちらも決まった値以外は `setConfig` が例外で返す。カードの高さは中身に合わせる（Home Assistant のカードは列の中で縦に並ぶため。共通の約束の「親の箱いっぱい」の例外）。カードは選んだ見た目の CSS 変数を自分の影の DOM に持つので、同じ画面にタイルとガラスのカードを並べられる。書体は影の DOM の中からは読み込めないため、カードが頁の head に書体の link を 1 回だけ足す。


派手版の行（2026-10-30 追加）: `kind: floorplan` は `rooms`（照明の `entity` と升目の `x`・`y`・`w`・`h`、任意で `temperature`）と `people`（`person` の `entity` と在宅時の `room`）を取る。照明の `rgb_color`・`hs_color` が灯りの色、`brightness` が強さになる。部屋を押すと `light.toggle` を呼ぶ。`kind: flow` は `nodes`（`id`、`entity`、`x`・`y`）と `links`（`from`、`to`、`entity`）を取り、負の値は向きを逆にする。どちらも `height`（px、既定 320）で高さを決め、カードの大きさはその高さを 50px で割って数える。

## 実装の順番

Home Assistant 向けの方向（CHARTER.md）に合わせ、カードが使う部品（`stat`、`status`、`bars`）を先に作り、その直後にカードを置く。ログや画面の切り替えなど、カードが使わない部品は後に回す。自分用の管理画面は 1〜12 の後でいつでも作る。

1. 開発の土台: ビルド（ライブラリ用の Vite か esbuild）、見本の頁、headless Chrome での部品の検査
2. `<cw-stage>`（動きの量、一時停止、`bg` の 4 つの値）と、配色の CSS（`themes/tile.css`、`themes/glass.css`）
3. `<cw-panel>`
4. `<cw-stat>`（`motion="full"` で数字が転がる）、`<cw-status>`、`<cw-clock>`
5. `<cw-bars>`、`<cw-chart>`
6. Home Assistant のカード（`integrations/ha-card.js`）と、その見本の設定
7. `<cw-log>`、`<cw-feed>`、`<cw-ticker>`
8. `<cw-background>`（`aura`。点いている灯りの色で地がゆっくり染まる）
9. `<cw-screens>` と `<cw-screen>`、切り替えの演出
10. `<cw-source>`（決まった形の通知と、その決まりの検査）
11. prototype/ha-home.html の見本を、部品の組み合わせだけで作り直す（部品が揃ったことの確かめ）
12. 負荷の測定（`tools/perf.mjs`）と、IIFE 版を OBS の実機に重ねる確かめ
1〜12 で最初の版になる。

派手版の部品（2026-10-30 追加。試作の派手版を部品にするときに落としていたものを戻す）:

13. `<cw-floorplan>`（間取りの立体図）
14. `<cw-flow>`（電気の流れ。粒の数と速さが電力に比例する）
15. 家の見本の派手版（`demo/home.html?variant=bold`）
16. Home Assistant のカードで 13 と 14 を使う

ゲーム風の部品（2026-10-31 追加。所有者の判断 A で、最初の試作の面白さを戻す）:

17. 見た目「ゲーム」（`themes/game.css`、T057・T058）
18. `<cw-ring>`（回る文字の輪、T059）
19. 流れる背景（`kind="streaks"`）と、斜めに切る画面切り替え
20. 家の見本と Home Assistant のカードで「ゲーム」を選べるようにする

よく使われるカードの部品（2026-10-31 追加。所有者の依頼。順番は [cards.md](../research/cards.md) の需要の順）:

21. `<cw-switch>`（押して点け消しし、明るさを滑らせる）
22. `<cw-camera>`（カメラの映像に名前と時刻を重ねる）
23. `<cw-media>`（再生中の曲と操作）
24. `<cw-agenda>`（予定の一覧）
25. `<cw-weather>`（いまの天気と予報）
26. `<cw-dial>`（円弧の目盛り、温度の調節）

続きの部品（2026-11-03 追加。所有者の依頼。順番は [cards2.md](../research/cards2.md) の需要の順。作るまでは山かっこを付けない）:

27. `<cw-battery>`（電池の残りを低い順に並べ、少ないものを目立たせる）
28. `<cw-vacuum>`（掃除機の状態と、始める・止める・戻す）
29. `<cw-timer>`（残り時間を帯と数字で出す）
30. `<cw-cover>`（窓の覆いの開き具合と、開ける・止める・閉める）
31. `<cw-person>`（人の居場所と、いつからそこにいるか）

3 回目の部品（2026-11-03 追加。順番は [cards3.md](../research/cards3.md) の需要の順と、本体が出しているもので部品だけで受け持てるか。作るまでは山かっこを付けない）:

32. `<cw-area>`（部屋 1 つの温度・湿度・点いている照明の数・人の動き）
33. `<cw-sky>`（日の出・日の入りと月の満ち欠け）
34. `<cw-alarm>`（防犯の状態、警戒の型のボタン、数字の押しボタン）
35. `<cw-todo>`（やること一覧の項目と、押して終えた印を付ける）

どれも作った直後に Home Assistant のカードの `kind` に足し、家の見本に置く。

## 未決事項

| # | 何が決まっていないか | 決めるのは | いつまでに | 決まるまでの扱い |
|---|---|---|---|---|
| 1 | 製品名とタグ名の頭（仮に `cw-`） | 所有者 | 公開の前 | `cw-` で作る。置換で変えられる |
| 2 | 主の見た目（T005） | 利用者 | 決定済み（2026-10-30） | タイルとガラスの両方を作り、使う人が CSS で選ぶ。既定はタイル |
| 3 | 3 つ目の配色（案A〜C を足すか） | 所有者 | 公開の前 | 作らない |
| 4 | OBS の実機で IIFE 版と ES モジュール版がそれぞれ動くか | 実装 | 実装の 12 番 | IIFE 版を作る（Chrome では確認済み） |
| 5 | 負荷の合否の線 | 実装 | 最初の測定の後 | 測るだけで合否は置かない |
| 6 | React 18 以前向けの薄い包み | 実装 | 利用者から求められたら | 作らない |
| 7 | 部品のコードを写して使う配り方（shadcn/ui の形） | 所有者 | 最初の版の後 | 作らない |
| 8 | 公開するか（するなら MIT で無料） | 所有者 | 最初の版の後 | 非公開のまま作る |
