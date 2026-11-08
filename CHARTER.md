# CHARTER.md — cool-webui の憲章

> 作業のブレークダウンは [Tasks.md](Tasks.md)。完了記録は [Tasks-archive.md](Tasks-archive.md)。
> **Tasks.md の毎周の入口でこのファイルも読む。**

## 目的

ゲーム画面のように派手で凝った管理画面（流れる背景・傾いたパネル・大きな文字・画面切り替えの演出）を、
自分のデータをつなぐだけで組み立てられる部品集にし、繰り返し使える資産にする。
標準の見た目は暗く控えめにし、派手な動きは利用者が切り替えで足す（下の「方向」）。

## 問い / ゴール（2026-10-28 更新）

「誰が・どんな場面で・どの形で使うか」と「部品の一覧と使い方の約束」が、調査を根拠に決まっていて、
最初の部品の実装にすぐ取りかかれる状態になっている。

方向: HTML の部品集が本体（2026-11-04 所有者の判断。Home Assistant は題材の 1 つ）。
部品は HTML に置いて値を渡せば単体で動く。Home Assistant は題材の 1 つで、そのカード（`integrations/ha-card.js`）は届け先の 1 つとして持ち続ける。本物の Home Assistant での確かめは見送る。
暗く控えめな見た目を標準にし、派手な動きは切り替えで足す。
（2026-10-29 の判断は「Home Assistant 向け。最初の形は Home Assistant のカード。自分用の道具は後で」。根拠は [docs/research/demand.md](docs/research/demand.md)。）

2026-10-30 から実装の段階に入る（所有者の判断「自走して作って欲しい」）。見た目は利用者が選ぶ（タイルとガラスの両方を持つ。[visual-direction.md](docs/design/visual-direction.md) の「決めたこと」）。
実装のゴール: [components.md](docs/design/components.md) の実装の順番 1〜6 ができ、Home Assistant のカードが見本の設定で、タイルとガラスの両方で描ける。

## アプローチ

- 1 枚の HTML で作った最初の試作を出発点に、使い方と市場を調べてから設計する（その試作は元にした作品に寄せていたので、公開のときに外した）
- 見た目は元にした作品から離す。方向は複数案を作り、所有者が選ぶ
- 選ばなかった道: 調査より先に実装を始める（作ってから使い道を探すことになる）

## 範囲

入る: 使い方の調査、市場調査、見た目の方向決め、部品の設計、部品の実装（2026-10-30 から）
入る（2026-11-08 から）: 公開（MIT、GitHub Pages）
入らない（常に）: 販売。販売はしない（2026-10-29 所有者の判断。手続きの手間に見合わない）

## 成果物

1. [docs/research/usage.md](docs/research/usage.md) — 誰がどこでどう使うか
2. [docs/research/market.md](docs/research/market.md) — 似たものと値段、空いている場所
3. [docs/design/visual-direction.md](docs/design/visual-direction.md) — 見た目の案と、選んだ案
4. [docs/design/components.md](docs/design/components.md) — 部品の一覧と共通の約束
5. `src/`（部品）、`themes/`（見た目の CSS）、`demo/`（部品ごとの見本）、`integrations/ha-card.js`（Home Assistant のカード）

## 完了の判断

調査と設計の段階: 上の 4 文書が、それぞれの行の Gate を通り、見た目の決め方が記録されている。
実装の段階: 実装の順番 1〜6 の行が Gate を通り、カードの見本がタイルとガラスで描けることを撮影して確かめている。

## 制約と規則

- 元にした作品（X の @MatchaChoco010 氏の動画, 2026-10-26）の配色・構成・飾り文字に寄せない。
  試作はそれに近いので、試作の見た目をそのまま成果物に持ち込まない
- リポジトリは公開（2026-11-08 所有者の判断。MIT ライセンス、見本は GitHub Pages）
- 作業の規則（キューの運用・Gate・完了の 4 条件）は [docs/work-rules.md](docs/work-rules.md)

## リスク

- 見た目だけなら AI で数分で似たものが作れる。部品集としての価値（組み込みやすさ・データの渡しやすさ・軽さ）で差が付かなければ資産にならない
