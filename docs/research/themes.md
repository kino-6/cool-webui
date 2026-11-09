# 次に足す配色（テーマ）

作成: 2026-11-10。部品集の配色は今 tile・glass・game の 3 つで、どれも暗い。次に足す配色を需要の順に決めるための調査。
印: 「調査で確認」は数字や記述を見たもの、「推測」はそこからの判断。

## 調べ方

Home Assistant の統計（analytics）は、どの配色が使われているかを数えていない。そこで docs/research/cards.md と同じく、配色の配布元（GitHub）の星の数を需要の代わりに使った。数字は 2026-11-10 に `https://api.github.com/repos/OWNER/REPO` を 1 件ずつ取得して確かめた（調査で確認）。
数えたものは 2 種類ある。1 つは Home Assistant 向けの配色そのもの、もう 1 つは元になった色見本（catppuccin、nord、dracula など）の本体である。本体の星はエディタや端末の利用者も含むので、Home Assistant での需要より大きく出る（推測）。
名前で探して見つからなかった配布元は表から外した。`7ahang/themes-lovelace-noctis`、`tgcowell/HA-Google-Home-Theme`、`mikosoft83/hass-metrology-theme`、`home-assistant-community-themes/synthwave` は API が 404 を返した（調査で確認）。代わりに GitHub の検索で星の多い同名の配布元を探し、見つかったもの（Noctis、Synthwave、Metrology）を載せた。
明るい版があるかは、各配布元の README に明るい版の記述や画面写真があるかで判断した（調査で確認）。README に記述が無いものは「記述なし」とした。

## テーマごとの需要

Home Assistant 向けの配色:

| テーマ | 主な配布元 | 星（調査で確認） | 明るい版があるか |
|---|---|---|---|
| UI Lovelace Minimalist | UI-Lovelace-Minimalist/UI | 2,083 | 配色だけの配布ではない（カード集）。明るさは確認していない |
| Mobile First | Clooos/Home-Assistant-Mobile-First | 1,390 | 確認していない |
| Frosted Glass | wessamlauf/homeassistant-frosted-glass-themes | 1,067 | ある（Light と Dark） |
| iOS Themes | basnijholt/lovelace-ios-themes | 885 | ある（`ios-light-mode-*`） |
| Metrology | Madelena/Metrology-for-Hass | 688 | ある（Light と Dark） |
| catppuccin | catppuccin/home-assistant | 517 | ある（Latte） |
| iOS Dark Mode | basnijholt/lovelace-ios-dark-mode-theme | 493 | 無い（暗い版だけ） |
| Material You | Nerwyn/material-you-theme | 484 | ある（`light.css` と `dark.css`） |
| Graphite | TilmanGriesel/graphite | 471 | ある（light mode） |
| caule themes pack 1 | ricardoquecria/caule-themes-pack-1 | 341 | ある（Light の組） |
| Mushroom Themes | piitaya/lovelace-mushroom-themes | 310 | ある（`modes:` に light と dark） |
| Noctis | aFFekopp/noctis | 309 | 記述なし |
| Synthwave | bbbenji/synthwave-hass | 207 | 記述なし |
| Google Dark / Google Light | JuanMTech/google_dark_theme / JuanMTech/google_light_theme | 144 / 54 | ある（別の配布元） |
| Nord | coltondick/nordic-theme-main / home-assistant-community-themes/nord | 44 / 14 | 記述なし |
| Dracula | malcolmturnbull/draculaish-ha-theme | 15 | 記述なし |
| Rosé Pine | rose-pine/home-assistant | 15 | 記述なし |

元になった色見本の本体:

| テーマ | 主な配布元 | 星（調査で確認） | 明るい版があるか | 使用許諾（調査で確認） |
|---|---|---|---|---|
| Dracula | dracula/dracula-theme | 23,607 | ある（Alucard） | MIT |
| catppuccin | catppuccin/catppuccin | 19,929 | ある（Latte） | MIT |
| Solarized | altercation/solarized | 16,021 | ある（Solarized Light） | MIT |
| gruvbox | morhetz/gruvbox | 15,831 | ある（light） | 記載なし（API の license が null） |
| Tokyo Night | folke/tokyonight.nvim / tokyo-night/tokyo-night-vscode-theme | 8,244 / 2,436 | ある（Day） | Apache-2.0 / MIT |
| Nord | nordtheme/nord | 6,911 | 本体は暗い色が基本で、明るい面にも使える色（Snow Storm）を含む | MIT |
| Rosé Pine | rose-pine/rose-pine-theme | 1,634 | ある（Dawn） | MIT |

読み取れること:

- Home Assistant 向けで、色見本から作られた配色の中では catppuccin が 517 で抜けて多い。Nord・Dracula・Rosé Pine は本体の星が多いのに、Home Assistant 向けは 44 以下にとどまる（調査で確認）。Home Assistant 向けの良い版が無いだけで、需要はあると読む（推測）
- 上の表で 300 を超える Home Assistant 向けの配色 12 件のうち、明るい版があると確かめられたのは 8 件（Frosted Glass、iOS Themes、Metrology、catppuccin、Material You、Graphite、caule、Mushroom Themes）。明るい版は付いていて当たり前と見られている（推測）。部品集には明るい配色が 1 つも無いので、これを埋めるのが先になる（推測）
- iOS Themes・Google Dark/Light・Material You は特定の会社の製品の見た目に寄せた配色である。部品集が同じ方向で作ると、その製品の見た目をまねることになるので避ける（推測）
- gruvbox は星が多いが、配布元に使用許諾の記載が無い。色を使うこと自体の問題は小さいと考えるが、記載のある色見本を先にする（推測）

## 作る順番

需要が大きく、使用許諾が MIT と確かめられた色見本から作る（推測）。色の値はどれも各色見本の公式の定義からそのまま取った（調査で確認）。役割（背景・面・文字など）への割り当ては部品集の決まり（`--cw-ground`、`--cw-surface`、`--cw-text`、`--cw-text-dim`、`--cw-signal`、`--cw-warn`、`--cw-ok`）に合わせた自分の判断である（推測）。

1. catppuccin Mocha（暗い版）: Home Assistant 向けの色見本の配色で星が一番多く（517）、本体も 19,929 ある。使用許諾は MIT。定義は catppuccin/palette の `palette.json`。
   - 背景 `#1e1e2e`（base）、面 `#313244`（surface0）、文字 `#cdd6f4`（text）、薄い文字 `#a6adc8`（subtext0）、目立たせる色 `#cba6f7`（mauve）、注意 `#f38ba8`（red）、正常 `#a6e3a1`（green）
2. catppuccin Latte（明るい版）: 部品集に無い明るい配色を、1 と同じ色見本でそろえて足せる。Home Assistant 向けの catppuccin にも Latte が入っている。使用許諾は MIT。定義は 1 と同じ `palette.json`。
   - 背景 `#e6e9ef`（mantle）、面 `#eff1f5`（base）、文字 `#4c4f69`（text）、薄い文字 `#6c6f85`（subtext0）、目立たせる色 `#8839ef`（mauve）、注意 `#d20f39`（red）、正常 `#40a02b`（green）
   - 明るい配色では面を背景より明るくするので、背景に mantle、面に base を当てた（推測）
3. Dracula: 色見本の本体で星が一番多い（23,607）のに、Home Assistant 向けは 15 しかなく、空いている。使用許諾は MIT。定義は dracula/dracula-theme の README の「Color Palette (OSS)」。
   - 背景 `#282a36`（Background）、面 `#44475a`（Current Line）、文字 `#f8f8f2`（Foreground）、薄い文字 `#6272a4`（Comment）、目立たせる色 `#bd93f9`（Purple）、注意 `#ff5555`（Red）、正常 `#50fa7b`（Green）
   - Comment は面の上だと文字の濃さの差が小さい。薄い文字が読みにくければ、面の上だけ別の値にする（推測）
4. Nord: 本体は 6,911 で、Home Assistant 向けは 44 と 14 と小さい。部品集の 3 つと違い、青みの灰で落ち着いた色になる。使用許諾は MIT。定義は nordtheme/nord の `src/nord.css`。
   - 背景 `#2e3440`（nord0）、面 `#3b4252`（nord1）、文字 `#eceff4`（nord6）、薄い文字 `#d8dee9`（nord4）、目立たせる色 `#88c0d0`（nord8）、注意 `#bf616a`（nord11）、正常 `#a3be8c`（nord14）
   - Nord には文字に使える中間の灰が無い。nord4 と nord6 の差が小さいので、薄い文字は nord4 を少し透かして使う（推測）

使用許諾について（推測を含む）:

- MIT は、色の値を使うのに許可は要らないが、写しを配るときに著作権表示と許諾文を添える決まりである。各配色の CSS の先頭に、元の色見本の名前・著作権表示・配布元へのリンクを書く
- 色の値と名前（catppuccin、Dracula、Nord）は使うが、各プロジェクトの絵（ロゴ）や配布元の画面の作りはまねない。部品の形・角の丸み・文字の書体は部品集のものを使う
- Solarized（16,021、MIT、明るい版あり）は 5 番目の候補にする。Home Assistant 向けの配布元が見つからず、明るい版は 2 の Latte で先に埋まるため（推測）

## 出典

- [catppuccin/home-assistant](https://github.com/catppuccin/home-assistant)
- [catppuccin/catppuccin](https://github.com/catppuccin/catppuccin)
- [catppuccin/palette の palette.json（色の定義）](https://github.com/catppuccin/palette/blob/main/palette.json)
- [catppuccin の使用許諾（MIT）](https://github.com/catppuccin/catppuccin/blob/main/LICENSE)
- [dracula/dracula-theme（README に色の定義）](https://github.com/dracula/dracula-theme)
- [nordtheme/nord](https://github.com/nordtheme/nord)
- [nordtheme/nord の src/nord.css（色の定義）](https://github.com/nordtheme/nord/blob/develop/src/nord.css)
- [altercation/solarized](https://github.com/altercation/solarized)
- [morhetz/gruvbox](https://github.com/morhetz/gruvbox)
- [rose-pine/rose-pine-theme](https://github.com/rose-pine/rose-pine-theme)
- [rose-pine/home-assistant](https://github.com/rose-pine/home-assistant)
- [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim)
- [tokyo-night/tokyo-night-vscode-theme](https://github.com/tokyo-night/tokyo-night-vscode-theme)
- [basnijholt/lovelace-ios-themes](https://github.com/basnijholt/lovelace-ios-themes)
- [basnijholt/lovelace-ios-dark-mode-theme](https://github.com/basnijholt/lovelace-ios-dark-mode-theme)
- [TilmanGriesel/graphite](https://github.com/TilmanGriesel/graphite)
- [Nerwyn/material-you-theme](https://github.com/Nerwyn/material-you-theme)
- [UI-Lovelace-Minimalist/UI](https://github.com/UI-Lovelace-Minimalist/UI)
- [piitaya/lovelace-mushroom-themes](https://github.com/piitaya/lovelace-mushroom-themes)
- [Madelena/Metrology-for-Hass](https://github.com/Madelena/Metrology-for-Hass)
- [aFFekopp/noctis](https://github.com/aFFekopp/noctis)
- [bbbenji/synthwave-hass](https://github.com/bbbenji/synthwave-hass)
- [JuanMTech/google_dark_theme](https://github.com/JuanMTech/google_dark_theme)
- [JuanMTech/google_light_theme](https://github.com/JuanMTech/google_light_theme)
- [wessamlauf/homeassistant-frosted-glass-themes](https://github.com/wessamlauf/homeassistant-frosted-glass-themes)
- [Clooos/Home-Assistant-Mobile-First](https://github.com/Clooos/Home-Assistant-Mobile-First)
- [ricardoquecria/caule-themes-pack-1](https://github.com/ricardoquecria/caule-themes-pack-1)
- [coltondick/nordic-theme-main](https://github.com/coltondick/nordic-theme-main)
- [home-assistant-community-themes/nord](https://github.com/home-assistant-community-themes/nord)
- [malcolmturnbull/draculaish-ha-theme](https://github.com/malcolmturnbull/draculaish-ha-theme)
- [GitHub REST API: リポジトリの取得](https://docs.github.com/rest/repos/repos#get-a-repository)
