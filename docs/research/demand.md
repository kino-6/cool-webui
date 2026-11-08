# 需要のある場所

作成: 2026-10-29（T022）。所有者の問い「需要はどこなのか」に答えるための調査。
ここでの需要は「派手な画面で自分のデータを見たい人が、どこに、どれだけいるか」を指す。
印: 「調査で確認」はページで数字を見たもの、「推測」はそこからの判断。

## 調べ方

前の調査（usage.md、market.md）は、利用場面を仮説から 3 つ（配信、Home Assistant、開発者）に絞り、競合と値段を見ていた。今回は場所を広げ、場所ごとに一番強い例を同じ深さで探した（調査で確認の方法）。

1. PC のデスクトップと PC の状態を出す画面: Wallpaper Engine、Lively、Rainmeter、GNOME の拡張、AIDA64、小型の液晶、NZXT と Corsair の液晶
2. 趣味の常時表示: Home Assistant の壁の画面、自宅サーバーの一覧画面、Grafana、MagicMirror²、3D プリンタ、レースゲームの計器（SimHub）、フライトシム
3. 配信、ボットの運用、開発者: OBS の配布物、StreamElements、心拍や再生中の曲の表示、Discord のボット、AI の監視画面、npm の取得数

見た日はすべて 2026-10-29。Reddit、Amazon、Etsy、DeviantArt の一部、SteamSpy、KDE Store、overtake.gg は取得を拒否されたので、数字は無い。

各場所について、もう 1 つ「その場所で何を表示しているか」を見た。派手な見た目が求められる場所と、自分のデータが求められる場所が同じとは限らないからである。

## 需要のある場所

| 場所 | 一番強い例 | 需要の数字 | 出しているもの | 見た目 |
|---|---|---|---|---|
| PC のデスクトップ（Wallpaper Engine の Web 型の壁紙） | Perfect Wallpaper | 購読 9,239,248 | 音の波形、時計、曲名 | 粒子、アニメ絵 |
| PC のデスクトップ（ゲーム風の壁紙） | ペルソナ 5 の画面切り替え風の壁紙 | 購読 669,535 | 天気と時刻だけ | ゲームの UI 風 |
| PC のデスクトップ（計器風の壁紙） | Miku Monitoring / Desktop Center 2.0 | 購読 683,971 / 341,156 | Desktop Center は壁紙自身の動作時間とマウスの位置で、PC の値ではない。Miku Monitoring は不明 | アニメ絵、SF |
| PC のデスクトップ（Rainmeter） | Sonder / JARVIS 風の SF の画面 | お気に入り 6.4K・閲覧 2M / お気に入り 32・閲覧 27K。Rainmeter の星 6,121 | Sonder は CPU・メモリ・天気・予定 | Sonder は控えめ、JARVIS 風は SF |
| PC の状態（Linux） | GNOME の拡張 Vitals | 取得 3,274,188 | CPU・温度・通信量 | 小さな数字 |
| PC の状態を出す専用の画面 | AIDA64 の SensorPanel の共有スレッド / 小型 USB 液晶の道具（turing-smart-screen-python） | 返信 13.9k（2012 年から） / 星 2,333 | CPU・GPU・温度 | 利用者ごとに様々 |
| Home Assistant の壁の画面 | Mushroom カード / 暗く作り込んだ壁の画面（matt8707） | 掲示板の閲覧 1,674,604 / 761,450。統計を送る導入だけで 714,061 台 | 家の機器、天気、電力 | すっきり、暗いすりガラス |
| 自宅サーバーの一覧画面 | Glance / Homepage | 星 37,852 / 33,432。Homepage の取得 226M | サービスの状態、天気 | 暗いカード |
| 稼働状況とサーバー監視 | Uptime Kuma / Netdata | 星 93,051 / 81,207 | 稼働、応答時間 | 業務風 |
| 壁掛けの鏡・キオスク | MagicMirror² | 星 24,159、外部の部品 1,500 個 | 予定、天気、交通、ニュース | 黒地に白い文字 |
| 3D プリンタ | OctoPrint の Dashboard 追加機能 | 30 日で 8,277 台（OctoPrint 全体は 51,028 台） | 温度、進み具合 | 業務風 |
| 配信（自分のデータを出す完成品） | Tuna（再生中の曲） / Pulsoid（心拍） | OBS の配布で 410,721 / 40,386 回取得 | 曲名、心拍 | 配信ごとに様々 |
| 配信の土台 | StreamElements / OBS の Discord | 「毎日 2.6M のクリエイター」（自社の表記） / 252,589 人 | 通知、目標、チャット | 様々 |
| 配信（試合の数値） | CS2 の戦績表示 / 得点表示の道具 | 434 / 2,830 回取得 | 勝敗、得点 | 様々 |
| 見せるための状況表示（開発者） | World Monitor / eDEX-UI | 星 89,740 / 45,045 | 世界のニュース、PC の状態 | 暗い SF |
| 開発者の部品（SF 風） | arwes（`arwes` と `@arwes/react` の合計） / augmented-ui | npm で週 2,952 + 2,802 / 499 回 | — | SF |
| 開発者の部品（普通の見た目） | Tremor / Recharts | npm で週 470,501 / 54,154,042 回 | — | すっきり |
| 開発者の部品（数字を動かす） | number-flow / countup.js | npm で週 2,726,445 / 800,929 回 | 数字 | すっきり |
| ボットの運用 | Discord ボットの管理画面の雛形 | npm で週 154 回 | 設定、統計 | 業務風 |
| AI の使い方の表示（個人） | ccusage | 星 19,243 | 使った量、費用 | 端末の文字 |

数字はすべて調査で確認したもの。見た目の欄は、ページの画像と説明からの推測を含む。
Wallpaper Engine の 1 位の壁紙、ペルソナ風の壁紙、Desktop Center は、2026-10-29 の時点で Steam から削除済みと表示されていた（ペルソナ風は規約違反による。調査で確認）。
単位がそろっていない点に注意する。購読は 1 回入れた人の数、掲示板の閲覧は同じ人の再訪も数え、星は興味の数である。桁の違いを比べるのには使えるが、2〜3 倍の差は比べられない（推測）。購読数は削除前に集まった数である。ゲームの見た目をそのまま写すと消される例でもある（推測）。

## 作りとの相性

この部品集は Web の部品（custom element）なので、その場所で Web の頁を表示できるかを見た（調査で確認）。

| 場所 | Web の頁で作れるか | 自分の値を渡せるか |
|---|---|---|
| Wallpaper Engine | 作れる（Web 型の壁紙） | 渡せない。公式の Web 向け機能は音・曲名・利用者の設定だけで、CPU などの値は読めない |
| Lively Wallpaper（星 20.0k） | 作れる | 渡せる。`livelySystemInformation` で PC の状態が届く |
| Corsair iCUE と NZXT の液晶 | 作れる（HTML の部品を受け付ける） | 渡せる。ただし利用者数は公表されていない |
| 小型の USB 液晶 | 作れない（専用の Python の道具） | — |
| Home Assistant | 作れる。独自のカードは custom element で、本体も Lit を使う | 渡せる（`hass`） |
| 自宅サーバーの一覧画面 | 一部（自作の CSS と JS を受け付ける） | 一部 |
| MagicMirror² | 作れる（部品は JS と HTML） | 渡せる |
| OBS・StreamElements | 作れる（ブラウザソース、独自の部品） | 渡せる（WebSocket など） |
| SimHub | 一部（Web の頁を出す部品はあるが、作画は専用の編集ソフト） | 一部 |

- **派手な見た目が大量に求められているのは、PC のデスクトップである**（調査で確認。Web 型の壁紙で 924 万、ゲーム風の壁紙で 67 万の購読）。ただし表示しているのは音・時刻・天気で、自分のデータではない。一番大きい Wallpaper Engine は、Web の頁に PC の値を渡せない。
- **自分のデータを見る需要が大きいのは、すっきりした画面の場所である**（調査で確認。Home Assistant の導入 71 万台、Mushroom の閲覧 167 万、自宅サーバーの一覧画面の星 3 万台）。派手さを求める数字は、この中では小さい。
- **両方が重なる場所は小さい**（調査で確認）。作り込んだ暗い Home Assistant の画面（閲覧 76 万）、Rainmeter の Sonder（閲覧 2M、CPU や天気を出す）、PC の状態を出す液晶（AIDA64 の共有 13.9k 件、小型液晶の道具の星 2,333）、見せるための状況表示（World Monitor の星 9 万）である。ただし Sonder も暗い Home Assistant の画面も、見た目は控えめで、ゲーム風ではない。計器風の壁紙（Desktop Center）は、PC の値を出していなかった。
- **開発者が部品として選ぶのは普通の見た目である**（調査で確認。SF 風の部品の取得は、普通の部品の約 1%）。数字を動かす部品は普通の画面でも広く使われている。
- **配信者が使うのは、組み立てる部品ではなく、出すものが 1 つに決まった完成品である**（調査で確認。上位は曲名・心拍・カウンタ。自作向けの JS の道具は週 1,861 回）。

## 見た目の傾向

- 派手な画面が選ばれる場所（壁紙）では、ゲームの UI 風、アニメ絵、暗い SF が多い（推測。上位の壁紙の画像と題による）。ペルソナ風の壁紙が 67 万の購読を集めている（調査で確認）。
- 自分のデータを毎日見る場所（Home Assistant、自宅サーバー）では、すっきりした見た目と、暗いすりガラスが多い（調査で確認。look.md と同じ結果）。
- 自分のデータを出す画面で人気の例（Sonder、暗い Home Assistant の画面）は、どれも控えめな見た目だった。SF 風の JARVIS の画面は、Sonder の 200 分の 1 しか好まれていない（調査で確認）。
- 案A〜C との関係: 案A（SF の HUD）は、壁紙と見せるための状況表示の傾向に合う（推測）。案B（リソグラフ）と案C（工場の操作盤）にあたる見た目は、どの場所の上位にも見当たらなかった（調査で確認）。

## 結論

- **需要は「派手な見た目」と「自分のデータ」で、別々の場所にある。** 派手さは PC のデスクトップに、自分のデータはすっきりした Home Assistant と自宅サーバーにある。両方が重なる場所は、まだ小さい（調査で確認の数字による）。
- **重なる場所の中で一番根拠が強いのは、作り込んだ暗い Home Assistant の画面である**（推測）。需要の数字（閲覧 76 万）と技術の相性（custom element、Lit）の両方が確かめられている。ただし求められているのは控えめな暗い画面で、ゲーム風の派手さを求める人は、その中の一部である。
- **PC の状態を出す画面は、次の候補にとどまる**（推測）。派手な壁紙の需要は大きいが、その数字は値を渡せない Wallpaper Engine 上のものである。値を渡せる Lively（星 2 万）と Corsair・NZXT の液晶には、需要の数字が無い。数字のある Rainmeter と AIDA64 は Web の頁ではない。
- **壁紙の需要の多くは、完成品を 1 回入れるだけの人である**（推測）。配信者と同じく、部品を組み立てる人ではない。派手な壁紙の購読数は、この部品集の需要とは直接つながらない。
- **配信は、組み立てる部品としては需要が小さい**（推測）。配信者は完成品を使う。部品集で配信に届けるなら、曲名や心拍のように出すものが 1 つに決まった完成品の形にする必要がある。
- **開発者向けの「SF 風の部品集」としての需要は小さい**（調査で確認の数字による）。
- 前の調査が「最初の利用者」に挙げた配信者と Home Assistant の利用者は、どちらも場所としては合っている。ただし需要の形が違う。配信者は完成品を求め、Home Assistant の利用者の大半はすっきりした見た目を求めている（推測）。
- 設計への影響（推測）: 固定の 16:9 の舞台だけでは、PC の液晶（2560×720 など横に長い画面）に合わない。完成した画面を場所ごとに用意する形と、PC の値を受け取る口（Lively、iCUE）を検討する。

## 出典

- https://steamcommunity.com/sharedfiles/filedetails/?id=884307090
- https://steamcommunity.com/sharedfiles/filedetails/?id=2955378002
- https://steamcommunity.com/sharedfiles/filedetails/?id=3585875739
- https://steamcommunity.com/sharedfiles/filedetails/?id=2992660460
- https://docs.wallpaperengine.io/en/web/overview.html
- https://github.com/rocksdanister/lively
- https://github.com/rocksdanister/lively/wiki/Web-Guide-V-:-System-Data
- https://extensions.gnome.org/extension/1460/vitals/
- https://forums.aida64.com/topic/13296-share-your-sensorpanels/
- https://docs.elgato.com/icue/widgets/
- https://developer.nzxt.com/docs/about/
- https://github.com/mathoudebine/turing-smart-screen-python
- https://community.home-assistant.io/t/388590
- https://community.home-assistant.io/t/162594
- https://analytics.home-assistant.io/data.json
- https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- https://github.com/glanceapp/glance
- https://github.com/gethomepage/homepage
- https://github.com/louislam/uptime-kuma
- https://github.com/netdata/netdata
- https://github.com/MagicMirrorOrg/MagicMirror
- https://data.octoprint.org/export/instance_stats_30d.json
- https://plugins.octoprint.org/plugins.json
- https://github.com/SHWotever/SimHub
- https://obsproject.com/forum/resources/tuna.843/
- https://obsproject.com/forum/resources/pulsoid-heart-rate-streaming.559/
- https://obsproject.com/forum/resources/cs2-stats-overlay-live-updates-and-twitch-activated-w-l-record.2669/
- https://obsproject.com/forum/resources/esportsdash-an-esports-overlay-scoreboard-tool.2231/
- https://streamelements.com/about
- https://obsproject.com/kb/browser-source
- https://github.com/koala73/worldmonitor
- https://github.com/GitSquared/edex-ui
- https://api.npmjs.org/downloads/point/last-week/@arwes/react
- https://api.npmjs.org/downloads/point/last-week/arwes
- https://github.com/rainmeter/rainmeter
- https://www.deviantart.com/michaelpurses/art/Sonder-Rainmeter-skin-838147223
- https://www.deviantart.com/suvrat29/art/Ironman-Jarvis-Ultimate-1-0-419119040
- https://api.npmjs.org/downloads/point/last-week/augmented-ui
- https://api.npmjs.org/downloads/point/last-week/@tremor/react
- https://api.npmjs.org/downloads/point/last-week/recharts
- https://api.npmjs.org/downloads/point/last-week/number-flow
- https://api.npmjs.org/downloads/point/last-week/countup.js
- https://api.npmjs.org/downloads/point/last-week/discord-dashboard
- https://api.npmjs.org/downloads/point/last-week/@streamerbot/client
- https://github.com/ryoppippi/ccusage
