# Home Assistant で人気の画面の見た目

作成: 2026-10-29。見た日はすべて 2026-10-29。
目的: 見た目の候補を、作りやすさや目新しさではなく需要の数字から決める。
印: 「調査で確認」はページやコードで数字・値を見たもの。「推測」はそこからの判断、または画像を見られず文から読んだもの。

## 調べ方

- 掲示板の数字は Discourse の JSON（各話題の URL の末尾に `.json` を付けたもの）の `views`（閲覧数）と `like_count`（いいね数、話題全体の合計）を読んだ（調査で確認）。
- 候補の話題は 2 通りで集めた（調査で確認）。
  1. 分類ごとの「全期間の上位」一覧（`/c/projects/frontend/34/l/top.json?period=all` など）。対象は Share your Projects の Dashboards と Themes、Third party の Floorplan、旧 HADashboard。
  2. 題名検索 `in:title order:views`。語は dashboard、floorplan、3D floorplan、wall panel、tablet dashboard、dark、glass、neon、animated、sci-fi、share your など。
- GitHub の星は github.com のページに埋め込まれた `stargazerCount` を読んだ。api.github.com は使っていない（調査で確認）。
- 見た目は README、掲示板の最初の投稿、テーマのファイル（色・角丸・ぼかしの値）、カードのソースから読んだ。画像そのものは見ていない。画像の中身に頼る記述には「推測」を付けた。
- 道具だけの部品は順位から外した。card-mod は 1,130,065 閲覧、button-card は 766,586 閲覧、ApexCharts card は 752,764 閲覧だが、見た目の系統を持たないので除いた（調査で確認: 数字。除外は判断）。
- 「share your dashboard」という題の大きな話題は見つからなかった。最も近いのは「Share your Floorplan」（190,983）と「Share your Themes」（203,620）なので、これを入れた（調査で確認）。
- sci-fi は題名検索で 0 件だった。neon・cyber は 2026 年 10 月の新しい話題だけで、閲覧数は数百だった（調査で確認）。
- TileBoard の GitHub（resoai/TileBoard）は 404 で、星は取れなかった（調査で確認）。

## 人気の画面

閲覧数の順に並べた。数字は調査で確認したもの。「地と色」以降の列で、出典の値をそのまま書いたものは調査で確認。画像を見ずに文から読んだものには（推測）を付けた。

| 順位 | 画面 | 需要の数字 | 地と色 | カードの形 | 文字 | 動き | 出所 |
|---|---|---|---|---|---|---|---|
| 1 | Mushroom（カード集） | 閲覧 1,674,621・いいね 12,199（Part 1）、Part 2 は閲覧 158,895。星 5,232 | HA のテーマに従う。明暗の両方に対応。色は Material の色を使う | アイコンは丸（50%、36px）。チップは角丸 19px。操作部は角丸 12px。カード本体は HA 標準の角丸に従う（推測: 12px） | 本文 14px・太さ 500、副文 12px・400、見出し 24px | 扇風機のアイコンを回す設定だけ。既定は止まっている | t/388590、t/693055、github piitaya/lovelace-mushroom |
| 2 | matt8707「A different take on designing a Lovelace UI」 | 閲覧 761,451・いいね 3,093。星 5,208。後継の ha-fusion は星 3,022 | 暗い背景画像。押していないボタンは rgba(115,115,115,0.25)、押したボタンは白 rgba(255,255,255,0.85) に反転する。差し色は 1 色 #3182b7 | 角丸 10%。カードの影なし。ポップアップは角丸 1em で、後ろを blur(2em) でぼかす | SF Pro Text、太さ 500。左の時計は 5.2vw と大きい | アイコンの動き 21 種（@keyframes）。押すと縮んで戻る。読み込み中の動き。タップ音 | t/162594、github matt8707/hass-config |
| 3 | UI Lovelace Minimalist | 閲覧 535,832・いいね 2,566。星 2,081 | 暗い版は地 #121212、カード #1D1D1D。明るい版は地 #EFEFEF。状態色は淡い赤 241,139,130、緑 128,201,148、黄 252,214,99、青 137,179,248 | 角丸 20px。暗い版は影なし、明るい版は薄い影 | 指定なし（HA 既定。推測） | 記載なし（推測: ほぼ無し） | t/322687、github UI-Lovelace-Minimalist/UI |
| 4 | TileBoard（独立した画面） | 閲覧 529,325・いいね 1,204（2018 年） | 記載なし。暗い四角のタイル（推測） | 四角いタイル（推測） | 記載なし | 記載なし | t/57173 |
| 5 | Bubble Card | 閲覧 440,630・いいね 2,063。星 4,674 | HA のテーマに従う。ポップアップの後ろをぼかす | 丸い棒の形。角丸は行の高さの半分（56px なら 28px）。ポップアップは角丸 42px | 指定なし | ポップアップが下から出る（0.35s）。読み込み時に浮き上がる動きがあり、切ることもできる | t/609678、github Clooos/Bubble-Card |
| 6 | Dwains Dashboard（自動で組む画面） | 閲覧 366,222・いいね 1,836。星 2,079 | 記載なし | 記載なし | 記載なし | 記載なし | t/168593 |
| 7 | ha-floorplan（SVG の間取り図に状態を出す） | カード版は閲覧 318,693、元の話題は閲覧 292,102・いいね 1,009、「Share your Floorplan」は閲覧 190,983・いいね 1,211。星 1,632 | 間取り図の絵が主役。部屋や機器を状態で塗り分ける | 図そのもの | 図による | CSS で付けられる（扉の回転などの質問あり） | t/115489、t/17394、t/21315 |
| 8 | Floorplan UI with Color synced lights（lukevink、3D の間取り絵） | 閲覧 266,314・いいね 440。星 1,406 | 3D で描いた家の絵。照明ごとに描いた絵を重ね、実際の電球の色と明るさに合わせて色を変える（hue-rotate、opacity） | 図そのもの。周りに小さなボタン | 画面幅に合わせて大きさが変わる（vw） | 照明の色と明るさが絵に出る。太陽の高さで明るさが変わる | t/169417、github lukevink/hass-config-lajv |
| 9 | HomeKit Infused（HKI） | 閲覧 246,059・いいね 678。星 889 | Apple の Home アプリに寄せた見た目（推測） | 記載なし | 記載なし | 動画の冒頭に輪の形のメニューが出る | t/117086 |
| 10 | Share your Themes（テーマを見せ合う話題） | 閲覧 203,620・いいね 366 | 初期の投稿は「暗い版がほしい」という要望が中心 | — | — | — | t/22018 |
| 11 | Midnight Theme（暗いテーマ） | 閲覧 192,073・いいね 103 | 暗い色のテーマ | HA 標準 | HA 標準 | 無し | t/28598 |
| 12 | Rounded（スマホ向けの画面の作り方） | 閲覧 168,700・いいね 706 | 記載なし | 名前どおり丸い形（推測） | 記載なし | 記載なし | t/543043 |
| 13 | HaCasa | 閲覧 158,364・いいね 141。星 485 | 大きな写真を背景にする。カードはすりガラス | すりガラスのカード。丸い棒の形のメニュー | Hanken Grotesk | 記載なし | t/744334、github damianeickhoff/Hacasa |
| 14 | ha-fusion | 閲覧 147,047・いいね 112。星 3,022 | 背景画像。押していないボタンは rgba(0,0,0,0.3)、押したボタンは白 | 角丸 0.4rem | Inter。左の時計は 3.4rem | 記載なし | t/662071、github matt8707/ha-fusion |
| 15 | iOS Dark Mode Theme / lovelace-ios-themes | 閲覧 90,912。星 882 | 暗い地に iOS の色。背景画像を差し替えられる | HA 標準 | HA 標準 | 無し | t/149136、github basnijholt/lovelace-ios-themes |
| 16 | Star Trek LCARS Theme | 閲覧 81,364・いいね 90。星 598 | 黒い地に淡い色の帯（almond creme、african violet、red） | 帯と丸い端 | Antonio または Tungsten（縦長の字） | 効果音と質感の表示を切り替えられる | t/511391、github th3jesta/ha-lcars |
| 17 | Metrology（Metro と Fluent のテーマ） | 閲覧 35,297。テーマの星 688、作者の画面設定の星 1,175 | Metro 版は真っ黒の地に強い色。Fluent 版は抑えた色 | Metro 版は角が尖る。Fluent 版は角丸 | Segoe UI | タイルが立方体のように回る。作者は「動きは控えめにした」と書いている | t/419530、github Madelena/Metrology-for-Hass、github Madelena/hass-config-public |
| 18 | Frosted Glass Theme | 閲覧 31,650（2025-07 開始）。星 1,053（テーマの中で最多） | 暗い版は地 rgb(2,6,11) に背景画像。差し色 rgb(122,162,190) | カードは透明で blur(10px) saturate(1.25)。角丸 18px。縁は 0.5px rgba(234,235,238,0.22) | 指定なし | 記載なし。ぼかし無しの軽い版もある | t/914431、github wessamlauf/homeassistant-frosted-glass-themes |
| 参考 | 派手な系統の新しい話題 | Floorplan 3D カード 12,785、NeonPlan 3D 5,335、Fluid Level（動く背景のカード）9,479、Cyber & Neon テーマ 283、NEON（光って動く画面。有料）133 | 暗い地に光る色（題名から。推測） | — | — | 光る・動く | t/902878、t/1027224、t/769364、t/1027512、t/1029807 |

褒め言葉（調査で確認。短く引用）:
- matt8707: 「looks super clean」（https://community.home-assistant.io/t/162594/2 ）、「looks very similar to Apples 'Home' interface」（/t/162594/6）、「Apple can not compete here」（/t/162594/7）、「super neat and modern」（/t/162594/19）
- Mushroom: 「absolutely beautiful」（/t/388590/5）、「way easier for non-yaml people」（/t/388590/19）
- Minimalist: 「very slick」（/t/322687/3）、「really eye candy」（/t/322687/7）
- Bubble Card: 「the claim to fame is going to be the pop-up」（/t/609678/10）
- Dwains: 「Love the clean look」「wife friendly」（/t/168593/14）
- Floorplan UI: 「This is insanely nice」（/t/169417/7）
- TileBoard: 「I like the Win10 start menu feel」（/t/57173/6）
- LCARS: 「Even the font is good」（/t/511391/2）
- HaCasa: 「very nice and clean」（/t/744334/3）
- Rounded: 「one of the most beautiful layouts」（/t/543043/8）
- Frosted Glass: 「Best theme out there!」（/t/914431/2）

## 共通する特徴

対象は閲覧数の上位 12 件（表の 1〜9 と 12〜14。2 つの「見せ合う」話題とテーマ 1 件は除いた）。閲覧数の合計は 5,613,258。
「重み付き」は、その特徴があると確かめられた例の閲覧数を合計し、全体の合計で割ったもの。確かめられなかった例は「無し」として数えたので、実際より低めに出る（推測）。

| 特徴 | 件数（12 件中） | 重み付き | 該当する例 | 印 |
|---|---|---|---|---|
| 角丸 10px 以上、または丸い棒の形 | 5 | 64% | Mushroom、matt8707、Minimalist、Bubble、HaCasa | 調査で確認 |
| ダーク版があるか、暗い地が前提 | 3 | 53% | Mushroom、matt8707、Minimalist | 調査で確認 |
| アイコンが状態で動く | 2 | 43% | matt8707（21 種）、Mushroom（扇風機だけ。既定は止まる） | 調査で確認 |
| 背景に画像か間取りの絵 | 5 | 29% | matt8707、lukevink、ha-floorplan、HaCasa、ha-fusion | 調査で確認 |
| ぼかし（すりガラス） | 3 | 24% | matt8707（ポップアップの後ろ）、Bubble（ポップアップの後ろ）、HaCasa（カード） | 調査で確認 |
| ポップアップや開閉に動きがある | 2 | 21% | matt8707、Bubble | 調査で確認 |
| 大きな時計の数字 | 2 | 16% | matt8707（5.2vw）、ha-fusion（3.4rem） | 調査で確認 |
| 間取り図 | 2 | 10% | ha-floorplan、lukevink | 調査で確認 |
| 光る・ネオン・グロー | 0 | 0% | 無し | 調査で確認 |

ほかに目立った点:
- 差し色は 1 色か、淡い色を少しだけ使う例が多い。matt8707 は状態の色をすべて #3182b7 にそろえている。Minimalist は淡い 4 色、Frosted Glass は灰みの青 1 色（調査で確認）。
- 「押したら明るく反転する」ボタンが matt8707 と ha-fusion の 2 件にある（調査で確認）。
- 大元のデザインは Behance の 7ahang の作品と Apple の Home アプリで、Minimalist、Mushroom、matt8707 がそう書いている（調査で確認）。上位の多くはこの 2 つの子孫と言える（推測）。

## 派手さの入れ方

上位の例は、地や枠を光らせていない。派手さは次の 4 か所に入っている（調査で確認、割合は上の表）。

1. アイコンの動き（重み付き 43%）。matt8707 は 19 種のアイコン部品に 21 種の動きを持たせ、点いている機器だけを動かす。Mushroom は扇風機の回転を設定で入れられるが、既定は止まっている。アイコンの動きを集めた話題は閲覧 21,190 と 6,680 で、本体ほどは伸びていない。
2. 開閉の動き（21%）。Bubble Card はポップアップを下から 0.35s で出し、後ろをぼかす。褒め言葉も「pop-up」に集まっている。matt8707 は押したときに 0.92〜0.94 倍に縮んで戻る。
3. 家の絵の灯り（10%。ただし 1 件で 266,314 閲覧）。lukevink は照明ごとに描いた 3D の絵を重ねる。電球の実際の色と明るさで絵の色を変える。光っても「実物の照明が点いている」という意味があるので、うるさくならない（推測）。
4. すりガラスと背景写真（24〜29%）。Frosted Glass はテーマの中で星が最多（1,053）。HaCasa、ha-fusion も写真の上に半透明の板を置く。

派手さの量の手がかり:
- 光る・ネオン・サイバーの話題は閲覧 283 と 133 しかない（2026 年 10 月開始。調査で確認）。新しいので比べにくいが、少なくとも需要の中心ではない（推測）。
- LCARS のような作品そのものの見た目は 81,364 閲覧で、上位の 1/20 ほど（調査で確認）。
- Metrology の作者は「動きは控えめにし、気が散らないようにした」と書いている（調査で確認）。
- 上位の例では動きは押したときと状態が変わったときに出て、止まっているときは静か。この使い方は所有者の方針（落ち着いた見た目を既定にし、派手な動きは選んだ人だけ）と合う（推測）。

## 候補

どの候補も既定は動き 0 段で、派手な動きは選んだ人だけに出す。

### 候補1 静かな暗いタイル

元にした例: Mushroom（閲覧 1,674,621・星 5,232）、matt8707（閲覧 761,451・星 5,208）、Minimalist（閲覧 535,832・星 2,081）。上位 3 件で、閲覧数の合計は 2,971,904（調査で確認）。

- 地: #121212 一色（Minimalist の暗い版と同じ値）。
- カード: #1D1D1D、角丸 16px、影なし、縁は 1px rgba(255,255,255,0.06)（推測で決めた値）。16px は Minimalist の 20px と matt8707 の 10% の間を取った（推測）。
- 点いている状態: カードを rgba(255,255,255,0.85) に反転し、文字を #121212 にする（matt8707、ha-fusion と同じ考え方）。
- 差し色: 1 色 #4A90C2。matt8707 の #3182b7 を少し明るくした（推測）。状態の色は Minimalist の淡い色を使う。赤 #F18B82、緑 #80C994、黄 #FCD663。
- アイコン: 直径 36px の丸い台に置く（Mushroom）。
- 文字: Inter（ha-fusion）。本文 14px・500。大きな数字は 500 の塗りの字で、数字の幅をそろえる。時計は最大 3.4rem。
- 動き:
  - 0 段（既定）: 色が 150ms で変わるだけ（時間は推測で決めた値）。
  - 1 段: 押すと 0.96 倍に縮む（matt8707）。
  - 2 段（選んだ人だけ）: 点いている機器のアイコンが動く。数字がなめらかに増減する。画面の切り替えにも動きを付ける。
- 原作と似ないための点:
  - 地は暗い灰の一色で、白やミントの紙と黒と赤の組み合わせも、墨流しの背景も使わない。
  - 数字は塗りの字で中くらいの大きさにする。縁取りの巨大な数字にはしない。
  - 文字はすべて横書きで、縦書きの漢字、輪に沿った文字、筆記体の飾り文字、バーコードは使わない。
  - 角はすべて丸く、角を切ったパネル、黒い見出しの帯、斜めのメニューは使わない。

### 候補2 写真とすりガラス

元にした例: Frosted Glass（テーマの中で星が最多の 1,053）、HaCasa（閲覧 158,364・星 485）、ha-fusion（閲覧 147,047・星 3,022）、Bubble Card のポップアップ（閲覧 440,630・星 4,674）、matt8707 のポップアップのぼかし（閲覧 761,451）（調査で確認）。

- 地: #02060B の上に、利用者の写真を明るさ 0.6 に落として敷く。写真が無いときは #02060B から #0E1A24 への縦のグラデーションにする（推測で決めた値）。
- カード: 地 rgba(255,255,255,0.06)、blur(12px) saturate(1.2)、角丸 20px、縁は 0.5px rgba(234,235,238,0.22)（Frosted Glass の値に近い）。ぼかしを切った軽い版も用意する（Frosted Glass Lite と同じ考え方）。
- ボタンと切り替え: 丸い棒の形で、角丸は高さの半分（Bubble、HaCasa）。
- 差し色: #7AA2BE（Frosted Glass の rgb(122,162,190)）。注意の色は #F0B45A。
- 文字: Hanken Grotesk か Inter、色は #EAEBEE。大きな数字は 300〜400 の細めの塗りの字（推測）。
- 動き:
  - 0 段（既定）: 動かない。
  - 1 段: ポップアップを下から 0.35s、cubic-bezier(0.16,1,0.3,1) で出し、後ろをぼかす（Bubble）。
  - 2 段（選んだ人だけ）: 背景がゆっくり動く。数字がなめらかに増減する。
- 原作と似ないための点:
  - 写真か暗い青のグラデーションを地にするので、紙の白やミントにも墨流しにもならない。
  - 黒と赤は組み合わせない。
  - 角は丸く、ガラスの板には見出しの帯を付けない。
  - 縁取りの数字、縦書き、輪に沿った文字、筆記体、バーコード、斜めのメニューは使わない。

### 候補3 家の絵の灯り（選んだ人だけの部品）

元にした例: Floorplan UI with Color synced lights（閲覧 266,314・星 1,406）、ha-floorplan（閲覧 318,693 と 292,102、Share your Floorplan 190,983・星 1,632）、Madelena の斜めから見た間取り図（星 1,175）（調査で確認）。

- 単独の見た目ではなく、候補1 か候補2 の上に置く部品にする。照明の色を正しく見せるため、地は暗くする必要がある（推測）。
- 絵: 利用者が用意した家の絵（3D で描いたものか SVG）。夜の絵を下に敷き、照明ごとの「点いた絵」を mix-blend-mode: lighten で重ねる。色は電球の色相（hue-rotate）、濃さは明るさ（opacity = brightness/255）に合わせる（lukevink の方法）。
- 周りの部品: 候補1 のカードを小さくして、丸い台のアイコンを絵の上に置く。
- 動き: 灯りの濃さは 400ms で変わる（時間は推測で決めた値）。扉の開閉などの動きは選んだ人だけに出す。
- 原作と似ないための点:
  - 派手さの元は実際の家の灯りで、図形や文字の飾りは足さない。
  - 縁取りの数字、縦書き、輪に沿った文字、バーコード、角を切ったパネル、斜めのメニューは出てこない。

## 出典

すべて 2026-10-29 に見た。

- https://community.home-assistant.io/t/388590.json
- https://community.home-assistant.io/t/693055.json
- https://community.home-assistant.io/t/162594.json
- https://community.home-assistant.io/t/322687.json
- https://community.home-assistant.io/t/57173.json
- https://community.home-assistant.io/t/609678.json
- https://community.home-assistant.io/t/168593.json
- https://community.home-assistant.io/t/115489
- https://community.home-assistant.io/t/17394.json
- https://community.home-assistant.io/t/21315.json
- https://community.home-assistant.io/t/169417.json
- https://community.home-assistant.io/t/117086.json
- https://community.home-assistant.io/t/22018.json
- https://community.home-assistant.io/t/28598.json
- https://community.home-assistant.io/t/543043.json
- https://community.home-assistant.io/t/744334.json
- https://community.home-assistant.io/t/662071.json
- https://community.home-assistant.io/t/149136.json
- https://community.home-assistant.io/t/511391.json
- https://community.home-assistant.io/t/419530.json
- https://community.home-assistant.io/t/914431.json
- https://community.home-assistant.io/t/902878.json
- https://community.home-assistant.io/t/1027224.json
- https://community.home-assistant.io/t/769364.json
- https://community.home-assistant.io/t/1027512.json
- https://community.home-assistant.io/t/1029807.json
- https://community.home-assistant.io/t/678803.json
- https://community.home-assistant.io/t/650908.json
- https://community.home-assistant.io/c/projects/frontend/34/l/top.json?period=all
- https://community.home-assistant.io/c/projects/themes/29/l/top.json?period=all
- https://community.home-assistant.io/c/third-party/floorplan/28/l/top.json?period=all
- https://github.com/piitaya/lovelace-mushroom
- https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/src/utils/theme.ts
- https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/src/cards/fan-card/fan-card.ts
- https://github.com/matt8707/hass-config
- https://raw.githubusercontent.com/matt8707/hass-config/master/themes/tablet.yaml
- https://raw.githubusercontent.com/matt8707/hass-config/master/button_card_templates/base.yaml
- https://raw.githubusercontent.com/matt8707/hass-config/master/button_card_templates/icons.yaml
- https://github.com/matt8707/ha-fusion
- https://raw.githubusercontent.com/matt8707/ha-fusion/main/static/themes/godis.yaml
- https://github.com/UI-Lovelace-Minimalist/UI
- https://raw.githubusercontent.com/UI-Lovelace-Minimalist/UI/main/custom_components/ui_lovelace_minimalist/lovelace/themefiles/minimalist-desktop/minimalist-desktop.yaml
- https://github.com/Clooos/Bubble-Card
- https://raw.githubusercontent.com/Clooos/Bubble-Card/main/src/cards/button/styles.css
- https://raw.githubusercontent.com/Clooos/Bubble-Card/main/src/cards/pop-up/styles.css
- https://github.com/dwainscheeren/dwains-lovelace-dashboard
- https://github.com/ExperienceLovelace/ha-floorplan
- https://github.com/lukevink/hass-config-lajv
- https://github.com/jimz011/HomeKit-Infused
- https://github.com/damianeickhoff/Hacasa
- https://github.com/basnijholt/lovelace-ios-themes
- https://github.com/th3jesta/ha-lcars
- https://raw.githubusercontent.com/th3jesta/ha-lcars/master/themes/lcars.yaml
- https://github.com/Madelena/Metrology-for-Hass
- https://github.com/Madelena/hass-config-public
- https://github.com/wessamlauf/homeassistant-frosted-glass-themes
- https://raw.githubusercontent.com/wessamlauf/homeassistant-frosted-glass-themes/main/themes/Frosted%20Glass%20Dark.yaml
