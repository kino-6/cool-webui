# 市場の調査: 似たものと値段、空いている場所

調査日: 2026-10-28。対象は最初の試作（公開のときに外した）を部品集にしたもの。
使う人と使う場面は [usage.md](usage.md) で調べた。ここでは繰り返さず、その結果と市場を突き合わせる。
各節の主張には「調査で確認」か「推測」を付ける。調査で確認したものは末尾の出典に対応する。
GitHub の星の数は、どれも 2026-10-28 に GitHub の API と画面で見た値である。

## 競合一覧

似たものを 5 つの群に分けた。

- A. SF 風・ゲーム風の見た目を出す無料の部品集（CSS や React）
- B. 動きのある部品を売る事業（無料の部品と有料の見本ページの組み合わせ）
- C. 管理画面の部品（グラフや数値）
- D. 市場で売られる SF 風の管理画面の雛形と、絵の素材
- E. 配信の重ね画面と、既存の道具の見た目の差し替え

| 名前 | 形 | ライセンス | 値段 | 人気の手がかり（日付） | 保守 | 出典 |
|---|---|---|---|---|---|---|
| A: Arwes | React と素の JS の SF 風の部品 | MIT | 無料 | 星 7,572（2026-10-28） | README に「保守していない」とある。最後の push は 2026-07-05 | https://github.com/arwes/arwes |
| A: augmented-ui | 角を切る CSS | BSD-2-Clause | 無料。寄付を受ける | 星 1,412（2026-10-28） | v2 は 2020-08。最後の push は 2024-05 | https://github.com/propjockey/augmented-ui |
| A: NES.css | ファミコン風の CSS | MIT | 無料 | 星 21,853（2026-10-28） | 最後の push は 2024-01 | https://github.com/nostalgic-css/NES.css |
| A: 98.css | Windows 98 風の CSS | MIT | 無料 | 星 11,577（2026-10-28） | 最後の push は 2025-09 | https://github.com/jdan/98.css |
| A: XP.css | Windows XP 風の CSS | MIT | 無料 | 星 3,130（2026-10-28） | 最後の push は 2025-03 | https://github.com/botoxparty/XP.css |
| A: CYBERCORE CSS | サイバーパンク風の CSS。`prefers-reduced-motion` に対応 | MIT | 無料 | 星 79（2026-10-28） | 最後の push は 2026-04 | https://github.com/sebyx07/cybercore-css |
| A: cyberpunk-css | サイバーパンク風の CSS | MIT | 無料 | 星 85（2026-10-28） | 最後の push は 2025-01 | https://github.com/alddesign/cyberpunk-css |
| B: Magic UI / Magic UI Pro | React と Tailwind の動く部品。写して使う形。Pro は見本ページ | 無料部分は MIT。Pro は有料 | Pro は個人の買い切り $199 | 星 22,925（2026-10-28）。購入者数は不明 | 最後の push は 2026-10-17 | https://github.com/magicuidesign/magicui 、https://pro.magicui.design/ |
| B: Aceternity UI Pro | React と Tailwind の動く部品と見本ページ | 不明（ライセンスの頁は開けず） | 1 年 $169、無期限 $199、10 人まで $1,590（いずれも買い切り、割引中の値） | 不明 | 不明 | https://ui.aceternity.com/pricing |
| B: Shadcnblocks | shadcn/ui 向けの区画と雛形。Figma 版あり | 有料 | $149〜$399 買い切り | Pro の購入者 5,420、無料の利用者 22,162（2026-10-28 の自己申告） | 2023 年から | https://www.shadcnblocks.com/pricing |
| B: Tailwind Plus（旧 Tailwind UI） | Tailwind の部品と雛形 | 有料 | 買い切りで無期限。金額は公式の頁が開けず不明 | 不明 | 2025-03 に改名 | https://tailwindcss.com/blog/tailwind-plus |
| C: Tremor | React のグラフと管理画面の部品 | Apache-2.0。有料の Blocks は MIT で無料化 | 無料 | 旧版の星 16,471、新版の星 3,682（2026-10-28）。Vercel の発表では 550 万回の導入（2025-01） | 2025-01 に Vercel が買収 | https://vercel.com/blog/vercel-acquires-tremor 、https://github.com/tremorlabs/tremor |
| D: HUD（SeanTheme） | Bootstrap 5 の HUD 風の管理画面の雛形。Vue・React・Angular などの版もある | ThemeForest の Regular / Extended | Regular $39、Extended $899 | Bootstrap 版の販売 1,932、評価 4.84（63 件）（2026-10-28） | 最新は 2026-03-04 の v6.0 | https://themeforest.net/item/hud-bootstrap-5-admin-template/34000752 |
| D: SCIFI（Spruko） | Bootstrap・Next.js などの SF 風の管理画面の雛形 | ThemeForest | $79〜$99 | 販売 5〜165（版ごと、2026-10-28） | 不明 | https://themeforest.net/search/sci |
| D: Unity の SF 風 HUD 素材 | ゲームエンジン用の画像と部品 | Unity Asset Store の規約 | 例: $7.77 | お気に入り 50、評価は件数不足（2026-10-28） | 2020-07 の v1.0 のまま | https://assetstore.unity.com/packages/2d/gui/sci-fi-ui-hud-custom-sci-fi-gui-elements-175216 |
| E: OWN3D | 配信の重ね画面・通知・パネルの店と月額の会員 | 不明 | 月額（3 か月ごとの支払い）。金額は頁に出ず不明 | 会員 3K+（自己申告、2026-10-28） | 運営中 | https://www.own3d.tv/en/ |
| E: Elgato Marketplace | 配信素材の市場。Visuals by Impulse の旧 URL はここへ転送される | 出品者ごと | HUD 風の例は値段の表示なし。同じ出品者の別品は $19 | 不明 | FPS HUD の例は 2025-11-10 公開 | https://marketplace.elgato.com/product/fps-hud-obs-scene-collection-d4e0245e-6745-41e0-9b16-bffe8c8f6a89 |
| E: GETREKT Labs（Cyberpunk の品群） | 配信の重ね画面・通知・場面の素材（動画と画像） | 不明 | $2.50（通知の静止画）〜$29.99（動く重ね画面一式） | 不明 | 運営中 | https://getrektlabs.com/collections/cyberpunk |
| E: GETREKT Labs の部品集 | StreamElements 用の部品（秒読み、出来事の切り替え表示など） | 不明 | $0（無料） | 不明 | 運営中 | https://getrektlabs.com/products/essential-widget-bundle |
| E: StreamSpell の重ね画面一式 | Cyberpunk: Night City。動く画面 5、通知 12、WEBM と PNG | 個人利用 | $21（品切れ表示） | 不明 | 運営中 | https://store.streamspell.com/products/cyberpunk-night-city-stream-package |
| E: StreamSpell の部品 | 再生中の曲を出す部品 $14。チャット・出来事・目標の棒を出す部品 $12。どちらもブラウザの画面として OBS に入れる | 不明 | $12〜$14 | 不明（評価の表示なし） | 運営中 | https://store.streamspell.com/products/streamspell-spotify-widget 、https://store.streamspell.com/products/ultimate-multistyle-chat |
| E: Meld Studio の統計の重ね画面 | League of Legends の試合中の数値を出す重ね画面 | Meld Studio に付属 | 無料 | 不明 | 運営中 | https://meldstudio.co/gallery/tag/stats/ |
| E: Booth の配信背景 | VTuber 向けの動く背景 | 出品者ごと | ¥500 | 不明 | 不明 | https://booth.pm/ja/items/5301028 |
| E: Home Assistant の有料の画面一式（Gumroad） | 携帯向けの画面一式。無料版と有料版を並べる | 不明 | $5（最低額） | 評価 2 件 | 2026 年版 | https://mysmarthome.gumroad.com/l/lazcd |
| E: Home Assistant のボタンの雛形（Gumroad） | button-card の雛形 3 種 | 不明 | €3（最低額） | 評価 1 件 | 不明 | https://jlnbln.gumroad.com/l/zhpoh |
| E: Fluvy | Home Assistant の見た目とカード 39 種。GPL-3.0 | GPL-3.0 | 無料 | 掲示板の返信 5（2026-10-28） | 2026-09-28 公開 | https://community.home-assistant.io/t/fluvy-a-premium-theme-and-card-library-for-home-assistant/1026602 |
| E: ha-lcars | Home Assistant の Star Trek 風の見た目 | MIT | 無料 | 星 597（2026-10-28） | 最後の push は 2026-10-28 | https://github.com/th3jesta/ha-lcars |
| E: hass-cyberpunk-2077-theme | Home Assistant のサイバーパンク風の見た目 | 記載なし | 無料 | 星 72（2026-10-28） | 最後の push は 2026-05 | https://github.com/flejz/hass-cyberpunk-2077-theme |

補足（調査で確認）。

- Arwes は README で「保守していない」と書く一方、2026-07 にも push がある。保守の状態ははっきりしない。React 版は strict mode と Server Components で動かない。
- augmented-ui は寄付だけで有料の版はない。
- 最初の調べでは StreamSpell と GETREKT の店が開けなかった。再調査（2026-10-28）では上の個別の頁が開けた。Nerd or Die、Etsy、Ko-fi の頁は 403 が返り、値段は不明である。OWN3D の会員の月額も、公式の頁に出ず不明である。
- 配信の素材で値段が見えた品は、どれも $30 以下だった。データを出す部品は売られているが、出すのは配信の場の出来事（チャット、目標、再生中の曲）で、利用者が自分の値を渡す部品は見つからなかった。試合の数値を出す重ね画面は、Meld Studio が League of Legends 用の 1 品を無料で付けている（確認できたのはこの 1 品だけ）。
- Home Assistant 向けで有料の品は、Gumroad の $5 と €3 の雛形だけ見つかった。SF 風・ゲーム風の見た目で有料の品は見つからなかった。「premium」と名乗る Fluvy も無料である。
- Grafana の公式の追加機能の一覧には「見た目」の分類も有料の品もなかった。
- Figma の SF 風 HUD 素材は、開けた頁では Figma 対応を確かめられなかった（不明）。Design Cuts の頁は Creative Market へ転送された。DoronSupply の頁は PSD と AI だけで、値段の記載はなかった。

## 価格と収益の形

見えた値段の帯（調査で確認。日付はどれも 2026-10-28 に見た値）。

| 帯 | 例 | 形 |
|---|---|---|
| 無料 | Arwes、augmented-ui、NES.css、98.css、Tremor、Magic UI の無料部分 | OSS。寄付か、会社の宣伝として持つ |
| $2.50〜$5 | 配信の通知の静止画 $2.50（GETREKT）、Home Assistant の雛形 €3・$5（Gumroad）、Booth の配信背景 ¥500 | 個人の頁や Booth で買い切り。最低額を決めて上乗せを任せる |
| $5〜$30 | Unity の SF 風 HUD 素材 $7.77、配信の部品 $12〜$14（StreamSpell）、配信の重ね画面一式 $21〜$29.99（StreamSpell、GETREKT） | 素材の店で買い切り。個人利用の許諾 |
| $39〜$99 | ThemeForest の HUD $39、SCIFI $79〜$99 | 市場で買い切り。用途ごとの許諾 |
| $149〜$399 | Shadcnblocks $149〜$399、Magic UI Pro $199、Aceternity $169〜$199 | 自分の店で買い切り。無期限の更新付き |
| $899〜$1,590 | ThemeForest の Extended $899、Aceternity の 10 人用 $1,590 | 利用者に課金する製品に使う許諾と、チーム向け |
| 月額 | Envato Elements（$16.50〜/月）、OWN3D の会員 | 素材の取り放題 |

収益の形（調査で確認）。

1. **無料の部品で人を集め、有料の見本ページで稼ぐ**。Magic UI、Aceternity、Shadcnblocks がこの形である。部品そのものは無料か安く、ページ一式の見本と更新を売る。どれも月額ではなく買い切りである。Aceternity は「1 年」と「無期限」を $30 差で並べている。
2. **市場で同じ見た目を枠組みごとに売る**。SeanTheme の HUD は同じ見た目を Bootstrap・Vue・React・Angular・Laravel・Svelte・Django・Next.js の 9 版で出している。販売数は Bootstrap 版が 1,932 で最も多く、Next.js 版は 30 である。
3. **会社に買われる**。Tremor は Vercel に買われ、有料の Blocks は無料になった。
4. **寄付**。augmented-ui は寄付だけで、2020 年の v2 から大きな版は出ていない。
5. **月額の取り放題**。Envato Elements と OWN3D の会員。作る側は 1 品ずつ売れない。

売り場の手数料（調査で確認）。

- Gumroad は直接の販売で 10% + $0.50、Gumroad の中の発見経由で 30%。税の処理を代わりに行う。
- Lemon Squeezy は 5% + $0.50 が基本で、米国外は +1.5%。税を代わりに処理する。
- Envato の作者の取り分は、頁が 403 で開けず不明。
- Elgato Marketplace は売上の 70% が作り手、30% が Elgato。
- Booth のサービス利用料は 5.6% + 45 円（2025-10-28 から。それまでは 5.6% + 22 円）。

何が売れているか。

- 数字が見えた中で SF 風の見た目の品が最も売れているのは、ThemeForest の HUD（Bootstrap 版で 1,932 本、$39）である（調査で確認）。単純に掛けると約 $75,000 で、販売者の頁の「$75,000 以上を販売」と合う。ただし、この表示は販売者の全商品の合計の可能性がある（推測）。
- 動く部品の分野では、Shadcnblocks が Pro の購入者 5,420 と自己申告している（調査で確認）。$149 とすると約 $80 万になるが、割引や上位の版があるので実額は不明である（推測）。
- 星の多い無料の見た目の部品集（NES.css 2.2 万、98.css 1.2 万）は、有料の品を持っていない（調査で確認）。星の数と売上は別である（推測）。

## 空いている場所

[usage.md](usage.md) で必要と分かった条件と、上の競合を突き合わせた。○ は満たす、△ は一部、× は満たさない、? は不明。

| 条件（usage.md より） | A: 見た目の CSS（Arwes など） | B: 動く部品（Magic UI など） | C: Tremor | D: ThemeForest の HUD | E: 配信素材 |
|---|---|---|---|---|---|
| ゲーム風・SF 風の見た目 | ○ | × | × | ○ | ○ |
| 値を渡すと動く数値・ログ・グラフ | × | × | ○ | △（見本の偽データ） | △（通知だけ） |
| 枠組みに縛られない（custom element） | △（CSS だけ） | ×（React） | ×（React） | ×（枠組みごとの版） | ? |
| OBS で透明な背景 | ? | ? | ? | ? | ○ |
| 動きの量の切り替え | △（CYBERCORE のみ） | ? | ? | ? | ? |
| 1 品を見た目ごと差し替え | △ | ○（写して使う） | ○ | × | × |

ここから言えること。

1. **「ゲーム風の見た目」と「値を渡すと動く部品」を両方持つものが見当たらない**（調査で確認の範囲で）。見た目の部品集はパネルやボタンの CSS で、グラフやログを持たない。Tremor はグラフを持つが見た目は事務的である。ThemeForest の HUD は見た目と画面がそろっているが、雛形を写して直す形で、部品として値を流し込む作りではない（Bootstrap と jQuery と 30 以上の外部の部品の上に組まれている）。
2. **枠組みに縛られない形がない**。動く部品の有料品はどれも React と Tailwind である。ThemeForest の HUD は 9 つの枠組みごとに別の品を売る。custom element で 1 つ作れば、この手間がいらない（推測）。usage.md で見たとおり、Home Assistant と素の HTML と OBS では React は前提にできない。
3. **配信の素材は「動画と画像」と「配信の場の出来事を出す部品」に限られる**。Elgato の HUD 風の品は 1920x1080 の動く画面とカメラ枠と切り替えである。StreamSpell はチャットや目標の棒や再生中の曲を出す部品を $12〜$14 で売るが、出すのは配信の場の出来事で、利用者が自分の値を渡す口は見当たらない（調査で確認）。配信中に任意の数値やログを出す部品は、配信者が自分で書くことになる（推測）。
4. **Home Assistant の見た目の差し替えは、配色と飾りだけ**。ha-lcars は card-mod に頼っていたが、Home Assistant の更新で card-mod が壊れ、別の仕組みに移っている（調査で確認）。見た目だけを外から当てる形は、元の道具の更新で壊れやすい。部品そのものを custom element のカードとして出せば、この問題を避けやすい（推測）。
5. **動きを止める・減らす設定は、ほとんど書かれていない**。確認できたのは CYBERCORE CSS だけである（調査で確認）。WCAG 2.2.2 に沿う停止の手段を最初から持つことは差になる（推測）。
6. **保守が止まりやすい**。Arwes は自ら保守していないと書き、augmented-ui は 2020 年から大きな更新がない。eDEX-UI も保守を終えた（usage.md）。この分野は熱心な個人が作り、続かない例が多い（調査で確認の例からの推測）。続けて保守すること自体が価値になり得る。

## 反証の検討

「ゲーム風の見た目で、値を渡すと動く部品を売る競合が見当たらない」は、空いている場所とも、需要がない印とも読める。

需要がないと読む根拠（調査で確認した事実から）。

- 配信者が払っている値段は低い。見えた品は $2.50〜$29.99 で、データを出す部品も $12〜$14 だった。
- 試合の数値の重ね画面は、Meld Studio が League of Legends 用の 1 品を無料で付けている。配信ソフトが数値の表示を無料で付ける例はこの 1 品しか確認できておらず、広がっているかは不明である。
- Home Assistant で見た目を変える品は、SF 風のものは無料（ha-lcars、hass-cyberpunk、Fluvy）で、有料は $5 と €3 だけで評価も 1〜2 件だった。
- 見た目の部品集は星を多く集めても（NES.css 2.2 万）、有料の版を出していない。出しても売れないと判断した可能性がある（推測）。
- 作る力のある開発者は AI や既存の CSS で自分で組める（CHARTER.md のリスク）。

空いている場所と読む根拠。

- 配信の部品は、出来事を出すだけでも $12〜$14 で売れている。自分の値を出せる部品は、出来事を出すだけの部品より求められる範囲が広い可能性がある（推測）。
- ThemeForest の HUD は、部品として作られていない雛形でも 1,932 本売れている。見た目への需要はある（調査で確認）。

どちらかを分ける証拠。

| 見るもの | 空いている場所なら | 需要がないなら |
|---|---|---|
| 配信者の掲示板で「自分の数値を出したい」という質問 | 繰り返し出てくる | ほとんど出ない |
| 無料で出した部品の利用 | npm の取得や星が伸び、配信や Home Assistant での使用例の報告が来る | 星だけ付いて、使った報告が来ない |
| 配信の店の品ぞろえ | 似た部品が後から出てくる | 出てこない |

安く確かめる方法（推測。費用は作業時間だけ）。

1. 部品 2〜3 個を MIT で公開し、OBS と Home Assistant での使い方の例を付ける。30 日の npm の取得数、星、問い合わせの数を見る。
2. 判定の数値の線（何件なら続けるか）は、公開前に決めて記録する。後から線を動かさない。

この方法は公開すると決めた場合だけ使う。販売はしない（2026-10-29 所有者の判断）。

## 集客の比較

| 売り場・集客 | 届く相手 | 手数料（2026-10-28 に見た値） | コードの部品との相性 |
|---|---|---|---|
| ThemeForest / Envato | 管理画面の雛形を探す開発者。HUD は 1,932 本売れた | 不明（作者の手数料の頁は 403） | 低い。枠組みごとの版が求められやすい（HUD は 9 版） |
| Gumroad の自分の頁 | 自分で連れてくる人。Gumroad の中の発見経由もある | 直接 10% + $0.50、発見経由 30% | 高い。zip も npm への案内も置ける。Home Assistant の雛形の売り手もここ |
| Lemon Squeezy の自分の頁 | 自分で連れてくる人だけ | 5% + $0.50、米国外 +1.5% | 高い。許諾の鍵も出せる |
| Elgato Marketplace | Stream Deck と Wave Link の利用者 | 30%（作り手 70%） | 不明。公開の分類にブラウザの画面やコードの部品はなく、相談はメールで受ける |
| 配信素材の店（StreamSpell、GETREKT） | 配信者 | 不明（自社の店で、外部の出品は確認できず） | 自社の店なので出品先にはならない。値段の目安として使う |
| GitHub の OSS + X / Reddit | 開発者、自宅サーバーや Home Assistant の利用者 | 無料 | 高い。利用者は集まるが、売上には直結しない（星の多い無料の部品集に有料の版がない） |
| Booth | 日本の買い手。VTuber の配信素材が多い | 5.6% + 45 円 | 中。配信背景は ¥500 の例。コードの部品の例は今回は見ていない |

ここから言えること（推測）。売る場合の比較として残すが、販売はしない（2026-10-29 所有者の判断）。

- 売るなら Lemon Squeezy か Gumroad の自分の頁が手数料が低い。ただし人は自分で連れてくる必要がある。
- 人を連れてくる道は GitHub の OSS と、配信者・Home Assistant の掲示板になる。どの掲示板が何人に届くかは、Reddit の購読者数を取得できず不明である。
- Elgato は 30% と高く、コードの部品の分類もない。ThemeForest は枠組みごとの版を求められやすい。どちらも売り場としては向かない。
- Booth は日本の VTuber に届くが、値段の帯が低い（¥500 の例）。コードの部品の出品例は今回は見ていない。

## 結論

### 調査で確認したこと

- SF 風・ゲーム風の見た目の部品は、無料の OSS が多数ある。星の多いもの（NES.css 2.2 万）にも有料の版は見つからなかった。
- 値段の帯は群ごとに違う。B 群（React と Tailwind の動く部品の見本）は $149〜$399、D 群（ThemeForest の管理画面の雛形）は $39〜$99、E 群（配信素材）は $2.50〜$29.99 である。
- 「無料の部品 + 有料の見本」の形で売れている例は、どれも React と Tailwind を使う開発者向けである。配信者向けにこの形で売る例は見つからなかった。
- 配信者向けには、データを出す部品も売られている。StreamSpell は再生中の曲の部品を $14、チャットと目標の部品を $12 で売る。出すのは配信の場の出来事で、利用者が自分の値を渡す部品は見つからなかった。
- Home Assistant の SF 風の見た目は ha-lcars、hass-cyberpunk、Fluvy とも無料だった。有料は Gumroad の $5 と €3 の雛形だけで、評価は 1〜2 件だった。
- 手数料は Lemon Squeezy 5% + $0.50、Gumroad 10% + $0.50、Booth 5.6% + 45 円、Elgato 30% である。Envato は不明。

### 推測

2026-10-29 に所有者が「販売はしない」と決めた。以前の版にあった、値段を付けて小さく売ってみる案（値段・売り場・判定の線）は外した。調査の事実は上と各節に残す。

- **売上を目当てにしない形が、この市場に合っている**。SF 風・ゲーム風の見た目の部品は無料が普通で、星の多い部品集にも有料の版がない。Home Assistant の SF 風の見た目で有料の例は見つからなかった。
- **資産としての価値は、自分で使えることと、差のある作りにある**。見た目の CSS は無料で多数あるが、「ゲーム風の見た目」と「値を渡すと動く部品」を両方持つものは見当たらない（空いている場所の 1）。自分の管理画面・配信画面・自宅の常時表示に使い回せる部品として作る。
- **使う場面の優先**は Home Assistant と自宅サーバーの画面、次に配信の重ね画面とする。どちらも React を前提にできず、custom element が直接効く（usage.md）。
- **公開（MIT で無料）するかは未定**。公開すれば使用例と不具合の報告が集まるが、保守の手間が増える。決めるのは所有者で、最初の版ができた後でよい。
- **主な危険**
  1. AI で似たものが作れる。値の流し込み、動きの量、透明背景、長時間の負荷で差を付ける必要がある。
  2. 保守が続かない。この分野の OSS は止まりやすい。部品の数を絞る。
  3. 元にした作品に寄せない。CHARTER.md の制約どおり、見た目は別の方向にする。

## 出典

実際に開いた URL だけを挙げる。

- https://github.com/arwes/arwes — Arwes の星、MIT、「保守していない」の記載、React の制約
- https://github.com/propjockey/augmented-ui — augmented-ui の星、BSD-2-Clause、v2 の日付
- https://augmented-ui.com/docs/ — augmented-ui が寄付だけで有料の版がないこと
- https://github.com/nostalgic-css/NES.css — NES.css の星、MIT
- https://github.com/jdan/98.css — 98.css の星、MIT
- https://github.com/botoxparty/XP.css — XP.css の星、MIT
- https://github.com/sebyx07/cybercore-css — CYBERCORE CSS の星、MIT、`prefers-reduced-motion` 対応
- https://github.com/alddesign/cyberpunk-css — cyberpunk-css の星と最後の push
- https://github.com/magicuidesign/magicui — Magic UI の星、MIT
- https://pro.magicui.design/ — Magic UI Pro が個人の買い切り $199、9 以上の雛形
- https://ui.aceternity.com/pricing — Aceternity UI Pro の値段の段と買い切りであること
- https://www.shadcnblocks.com/pricing — Shadcnblocks の値段、購入者数の自己申告、Figma 版
- https://tailwindcss.com/blog/tailwind-plus — Tailwind Plus が買い切りで無期限であること（2025-03-04）
- https://github.com/tremorlabs/tremor — Tremor の新版の星、Apache-2.0
- https://github.com/tremorlabs/tremor-npm — Tremor の旧版の星
- https://vercel.com/blog/vercel-acquires-tremor — Vercel による買収、Blocks の無料化、導入回数
- https://themeforest.net/item/hud-bootstrap-5-admin-template/34000752 — HUD の値段、販売数、評価、更新日、作り
- https://themeforest.net/search/hud%20design — HUD の枠組みごとの版と販売数
- https://themeforest.net/search/sci — SCIFI の雛形の値段と販売数
- https://assetstore.unity.com/packages/2d/gui/sci-fi-ui-hud-custom-sci-fi-gui-elements-175216 — Unity の SF 風 HUD 素材の値段と評価
- https://www.own3d.tv/en/ — OWN3D の品ぞろえと会員数の自己申告
- https://marketplace.elgato.com/product/fps-hud-obs-scene-collection-d4e0245e-6745-41e0-9b16-bffe8c8f6a89 — Elgato の HUD 風の配信素材の中身と公開日
- https://github.com/th3jesta/ha-lcars — ha-lcars の星、MIT、card-mod が壊れた経緯
- https://github.com/flejz/hass-cyberpunk-2077-theme — Home Assistant のサイバーパンク風の見た目の星と最後の push
- https://grafana.com/grafana/plugins/ — Grafana の追加機能に見た目の分類と有料品がないこと
- https://elements.envato.com/pricing — Envato Elements の月額と許諾
- https://docs.lemonsqueezy.com/help/getting-started/fees — Lemon Squeezy の手数料
- https://gumroad.com/pricing — Gumroad の手数料と税の代行
- https://doronsupply.com/product/sci-fi-elements-01 — SF 風素材が PSD と AI だけであること
- https://getrektlabs.com/collections/cyberpunk — GETREKT の Cyberpunk の品の値段 $2.50〜$29.99
- https://getrektlabs.com/products/essential-widget-bundle — GETREKT の StreamElements 用の部品集が無料であること
- https://store.streamspell.com/products/cyberpunk-night-city-stream-package — StreamSpell の一式 $21 と中身、データの部品がないこと
- https://store.streamspell.com/products/streamspell-spotify-widget — 再生中の曲を出す部品 $14 と使い方
- https://store.streamspell.com/products/ultimate-multistyle-chat — チャット・出来事・目標の部品 $12
- https://meldstudio.co/gallery/tag/stats/ — 試合の数値の重ね画面が Meld Studio に無料で付くこと
- https://booth.pm/ja/items/5301028 — Booth の配信背景 ¥500
- https://mysmarthome.gumroad.com/l/lazcd — Home Assistant の有料の画面一式 $5、評価 2 件
- https://jlnbln.gumroad.com/l/zhpoh — Home Assistant のボタンの雛形 €3、評価 1 件
- https://community.home-assistant.io/t/fluvy-a-premium-theme-and-card-library-for-home-assistant/1026602 — Fluvy が無料で GPL-3.0 であること
- https://docs.elgato.com/general/become-a-maker — Elgato の 70/30 の配分と出品できる分類
- https://www.gamebusiness.jp/article/2025/07/24/24711.html — Booth のサービス利用料の改定（5.6% + 45 円、2025-10-28 から）
