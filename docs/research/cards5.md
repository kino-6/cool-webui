# 見て楽しい部品の需要（5 回目）

作成: 2026-11-11。所有者から、今の表・ドーナツ・色の格子・状態の帯・推移・稼働の格子は「無難でつまらない」と言われた。そこで、見た目で目を引き、しかも実際の値を出す部品の需要を数字で比べ、実装の順番 42 以降を決めるための調査。
印: 「調査で確認」は数字や元の文書・コードを見たもの、「推測」はそこからの判断。

## 調べ方

数字は 2 種類を使った。どれも 2026-11-11 に取得した（調査で確認）。

- GitHub の星の数。`https://api.github.com/repos/持ち主/名前` の `stargazers_count` と `license` を、1 つの配布元につき 1 回だけ読んだ。20 件すべて取れた。保存のみ（archived）の配布元は、数字は載せるが順位には使わない
- Home Assistant の部品の有無。Web の検索で、その種類の Home Assistant のカードと掲示板の投稿があるかを見た

Home Assistant の掲示板の閲覧数は取れなかった（調査で確認）。各投稿の `https://community.home-assistant.io/t/番号.json` を 1 回ずつ 8 件読んだが、すべて Cloudflare の「Attention Required」の画面が返った。取り直しはしていない。代わりに、2025〜2026 年に掲示板へ投稿された新しいカードの数を、関心の手がかりとして数えた。

今の部品集にあるものは候補から外した（調査で確認。`src/*.js` を見た）。

- 数字が転がって変わる表示は `<cw-stat>` がすでに持つ（説明に「rolls digits in full motion」）
- 円弧の計器は `<cw-dial>`（270° の弧と真ん中の数字。針は無い）
- 文字の流れる帯は `<cw-ticker>`、新しい順の記録は `<cw-log>`
- 背景の動きは `<cw-background>` の `aura` と `streaks`

## 種類ごとの需要

| 種類 | Web の部品集（星） | Home Assistant のカード（星・投稿） | 部品集にあるか |
|---|---|---|---|
| 文字を打つように出す表示 | mattboldt/typed.js 16,274 | 専用のカードは見つからない | 近いものはある（`<cw-log>`。打つ動きは無い） |
| 波形 | katspaugh/wavesurfer.js 10,468（音のファイルの波形）、joewalnes/smoothie 2,276（流れ続ける折れ線） | 専用のカードは見つからない。「Home Assistant のオシロスコープ」を名乗る Signal Deck は試作版で、波形の部品ではない | 無い（`<cw-chart>` は履歴の折れ線） |
| 転がる数字 | barvian/number-flow 7,793、HubSpot/odometer 7,287（保存のみ） | 専用のカードは見つからない | ある（`<cw-stat>`） |
| 3D の地球儀と印 | shuding/cobe 6,055、vasturiano/globe.gl 3,225 | 地球儀のカードは見つからない。近いのは平らな地図の ha-map-card と、Geochron 風の世界時計 geo-clock-card | 無い |
| 文字の雨の背景 | Rezmason/matrix 3,864 | 専用のカードは無い。掲示板に「Matrix」テーマの話題がある | 無い |
| めくれる表示（駅や空港の案内板、めくり時計） | objectivehtml/FlipClock 2,776、pqina/flip 1,026 | RazManSource/splitflap-card 54、Thyraz/pqina-flip-clock-card 21、joshuaaaaa/flip-display-card 6。ほかに schmallaria/flipclock-card、pmongloid/flipdown-timer-card、dzaczek の Flip Clock & Flip Sensor、HTC 風のめくり時計の長い話題（6 ページ以上） | 無い |
| 針の計器（VU 計、速度計） | Mikhus/canvas-gauges 1,602、bernii/gauge.js 1,439 | benjamin-dcs/gauge-card-pro 314（針の設定あり）。2026 年の新しい投稿が 4 件（飛行機の計器風、気圧計、Analog Cards、VU 計を含む Foundry Collection） | 無い（`<cw-dial>` は弧だけ） |
| 7 セグメント・LED の文字 | keshikan/DSEG 1,214（字体、OFL-1.1） | 専用のカードは無い。字体の入れ方を聞く掲示板の質問が 2 件、LG の洗濯機のカードが 7 セグメントの字体を同梱 | 無い |
| 音の強さの棒（イコライザー） | hvianna/audioMotion-analyzer 972（AGPL-3.0） | 実際の音に合わせて動くカードは無い。掲示板で頼まれ、GIF で代用する答えが付いている | 無い |
| 距離と向きで置くレーダー | 目立つ Web の部品集は見つからない | Moe8383/radar_map_manager 75（ミリ波レーダーの人の位置）、timmaurice/lovelace-radar-card 25（家からの距離と方角）。ほかに飛行機の位置を古いブラウン管風に出す Flightradar Radar Card の投稿 | 無い |

数字はどれも調査で確認したもの。

補足:

- 星の数は興味の数で、使われている数ではない（推測。look.md と同じ読み方）。typed.js はほとんどが Web サイトの見出しの演出に使われていると見られ、管理画面での需要とは分けて読む（推測）
- wavesurfer.js は音のファイルを描く部品で、センサーの値を流し続ける用途ではない（調査で確認。説明文による）。管理画面の波形としては smoothie の 2,276 を使う（推測）
- めくれる表示は、Web の星は中くらいだが、Home Assistant では 2025〜2026 年に別々の作者が少なくとも 5 つのカードを出している（調査で確認）。今回の候補の中で、家の画面で作られている数が一番多い（推測）
- 針の計器も、2026 年に入ってから掲示板への新しいカードの投稿が 4 件ある（調査で確認）。今まさに関心が集まっている種類と読める（推測）
- 音の強さの棒は、Home Assistant の再生機器が音そのものを渡さないため、実際の値では動かせない（調査で確認。掲示板の答えが「波形は音楽に合わない」と述べている）。部品集の「実際の値を出す」という条件を満たせない
- 文字の雨は、映画『マトリックス』の画面そのものが元である（調査で確認。Rezmason/matrix の説明は「green code rain」）。CHARTER.md の「見た目は元にした作品から離す」に当たる（推測）

## 作る順番

条件は 3 つ。見て目を引くこと、家の画面の実際の値を出せること、特定の製品や作品の見た目を写さないこと。この条件を満たすものを、上の数字の大きさで並べた（推測）。どの部品も今の部品と同じく `.data` か属性で値を受け、`<cw-source>` から流し込める形にする。

42. cw-globe は、回る地球儀の上に点を置く。家族の居場所（person の緯度と経度）、昼と夜の境目、地震の情報や飛行機の位置を出す。値は `.data = [{lat, lng, label, value}]` で受ける。cobe 6,055・globe.gl 3,225 で今回の候補の中で一番大きく、Home Assistant には地球儀のカードがまだ無い。陸の形の点の並びは部品の中に持たせ、外のサーバーから地図を取らない（推測）。注意: cobe の点で描いた地球儀は GitHub や Vercel のトップページの地球儀に似ているので、点の並びと色はそれらから離す
43. cw-flap は、1 文字ずつめくれて変わる案内板。次の電車の時刻と行き先、ごみの日、今日の天気、家族への伝言を出す。値は `.rows = ['文字列', ...]` か `value` で受け、変わった文字だけめくる。FlipClock 2,776・pqina/flip 1,026 に加え、Home Assistant で少なくとも 5 つのカードが作られている。めくり時計は `<cw-clock>` の見た目の切り替えとして同じ仕組みで出せる（推測）。注意: Solari 社の案内板や Vestaboard の配色と文字の形、HTC の天気つき時計の見た目は写さない
44. cw-scope は、方眼の上を光る線が左から右へ流れ続ける波形。今の電力（W）、通信の速さ、室温のように数秒ごとに変わる値を出す。値は `push(数)` で受け、決まった秒数分だけ残す。smoothie 2,276 が流れ続ける折れ線の需要を示し、Home Assistant に専用のカードは無い。`<cw-chart>` が履歴を描くのに対し、こちらは今の動きを見せる。特定の製品には寄らない（推測）
45. cw-needle は、目盛りの上を針が振れる計器。電力の使用量（VU 計の形）、通信の速さ（速度計の形）、気圧を出す。値は `value`・`min`・`max` と、赤い範囲を示す `warn-above` で受け、針は値に向かって行き過ぎて戻る動きをする。canvas-gauges 1,602・gauge.js 1,439、Home Assistant の gauge-card-pro 314 と 2026 年の新しい投稿 4 件がある。`<cw-dial>` とは針と目盛りを持つ点が違う。注意: 特定の音響機器の会社の VU 計の文字盤や、特定の車の速度計の文字盤は写さない
46. 7 セグメントの数字は、新しい部品ではなく `<cw-stat>` と `<cw-clock>` の見た目の切り替えとして足す。台所のタイマー、電力量計、温度を電光表示の数字で出す。DSEG 1,214（OFL-1.1 なので同梱できる）。消えている線をうっすら残して本物の表示器らしく見せる。特定の製品には寄らない（推測）
47. cw-radar は、円の中心を家として、回る掃引線の下に点を距離と向きで置く。家族や車の家からの距離と方角、ミリ波レーダーが捉えた部屋の中の人の位置を出す。値は `.data = [{distance, angle, label}]` と `max`（外側の円の距離）で受ける。数字は radar_map_manager 75・lovelace-radar-card 25 と小さいが、ほかの部品では出せない「どちらの方角にいるか」を出せる。注意: 古いブラウン管の緑の画面は Flightradar Radar Card と同じ形なので、配色は部品集の色に合わせる

後に回すもの（推測）:

- 文字を打つように出す表示: typed.js 16,274 は一番大きいが、多くは Web サイトの見出しの演出である。出す値は `<cw-log>` がすでに持つので、新しい行を 1 文字ずつ出す設定を `<cw-log>` に足せば済む
- 転がる数字: number-flow 7,793 と需要は大きいが、`<cw-stat>` がすでに持つ。機械の数え車のような見た目にするなら、`<cw-stat>` の見た目の切り替えで足す
- 文字の雨の背景: Rezmason/matrix 3,864 があるが、映画『マトリックス』の画面を写すことになるので作らない。実際の値を降らせる背景が欲しいなら、緑のカタカナではなく、部品集の色で数字を降らせる形を別に考える
- 音の強さの棒: Home Assistant から実際の音の値が取れず、飾りの動きにしかならない。audioMotion-analyzer は AGPL-3.0 で、部品集に取り込めない

## 出典

- [mattboldt/typed.js](https://github.com/mattboldt/typed.js)
- [katspaugh/wavesurfer.js](https://github.com/katspaugh/wavesurfer.js)
- [joewalnes/smoothie](https://github.com/joewalnes/smoothie)
- [barvian/number-flow](https://github.com/barvian/number-flow)
- [HubSpot/odometer](https://github.com/HubSpot/odometer)
- [shuding/cobe](https://github.com/shuding/cobe)
- [vasturiano/globe.gl](https://github.com/vasturiano/globe.gl)
- [Rezmason/matrix](https://github.com/Rezmason/matrix)
- [objectivehtml/FlipClock](https://github.com/objectivehtml/FlipClock)
- [pqina/flip](https://github.com/pqina/flip)
- [Mikhus/canvas-gauges](https://github.com/Mikhus/canvas-gauges)
- [bernii/gauge.js](https://github.com/bernii/gauge.js)
- [keshikan/DSEG](https://github.com/keshikan/DSEG)
- [hvianna/audioMotion-analyzer](https://github.com/hvianna/audioMotion-analyzer)
- [RazManSource/splitflap-card](https://github.com/RazManSource/splitflap-card)
- [Thyraz/pqina-flip-clock-card](https://github.com/Thyraz/pqina-flip-clock-card)
- [joshuaaaaa/flip-display-card](https://github.com/joshuaaaaa/flip-display-card)
- [schmallaria/flipclock-card](https://github.com/schmallaria/flipclock-card)
- [pmongloid/flipdown-timer-card](https://github.com/pmongloid/flipdown-timer-card)
- [benjamin-dcs/gauge-card-pro](https://github.com/benjamin-dcs/gauge-card-pro)
- [Moe8383/radar_map_manager](https://github.com/Moe8383/radar_map_manager)
- [timmaurice/lovelace-radar-card](https://github.com/timmaurice/lovelace-radar-card)
- [nathan-gs/ha-map-card](https://github.com/nathan-gs/ha-map-card)
- [jpettitt/geo-clock-card](https://github.com/jpettitt/geo-clock-card)
- [benblb/lg-washer-dryer-card](https://github.com/benblb/lg-washer-dryer-card)
- [掲示板: I made a retro Flip Clock & Flip Sensor card](https://community.home-assistant.io/t/i-made-a-retro-flip-clock-flip-sensor-card/956058)
- [掲示板: flip-display-card](https://community.home-assistant.io/t/github-joshuaaaaa-flip-display-card/950568)
- [掲示板: PQINA Flip Clock card](https://community.home-assistant.io/t/pqina-flip-clock-card/826303)
- [掲示板: HTC Flip Clock with weather](https://community.home-assistant.io/t/htc-flip-clock-with-weather/184541)
- [掲示板: Sharing my analog gauge - aircraft style](https://community.home-assistant.io/t/sharing-my-analog-gauge-aircraft-style/1018768)
- [掲示板: Analog Barometer Card](https://community.home-assistant.io/t/analog-barometer-card-a-simple-svg-gauge-for-home-assistant/1015990)
- [掲示板: Analog Cards](https://community.home-assistant.io/t/analog-cards-a-family-of-analogue-style-lovelace-cards-for-home-assistant/1017363)
- [掲示板: Foundry Collection（Vintage Analog Meters & Digital VU Cards）](https://community.home-assistant.io/t/new-foundry-collection-vintage-analog-meters-digital-vu-cards-for-home-assistant/1003790)
- [掲示板: Lovelace: Radar Card](https://community.home-assistant.io/t/lovelace-radar-card/923093)
- [掲示板: Flightradar Radar Card](https://community.home-assistant.io/t/flightradar-radar-card-a-retro-crt-radar-scope-for-your-flight-data/1017325)
- [掲示板: Any Equalizer/Wave for Frontend](https://community.home-assistant.io/t/any-equalizer-wave-for-frontend/950484)
- [掲示板: 7 セグメントの字体の質問](https://community.home-assistant.io/t/my-custom-font-is-not-working/408249)
- [掲示板: Matrix テーマの話題](https://community.home-assistant.io/t/manifest-theme-color-issue-based-on-matrix-theme/162208)
- [Signal Deck](https://rsr5.github.io/signal-deck)
