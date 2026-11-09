# Tasks.md — 作業のブレークダウン

> **READ FIRST（全エージェント / 全セッション）**
> 憲章（目的・ゴール・アプローチ・完了の判断）は [CHARTER.md](CHARTER.md)。
> 作業規律（Gate と最小検証の契約 / 完了の 4 条件 / 別視点の検証 / 並列化）は [docs/work-rules.md](docs/work-rules.md)。
> **ここは具体作業だけを書く。決まりを写さない。**
> **毎周の入口でこのファイルと CHARTER.md を読み、`[x]` を付ける前に work-rules.md を読む。**
> 題が下のどれにも無ければ、**脇道と明記してから**回す。
> **上から 1 件ずつ**処理する。詰まったら `[~]` / `[!]` に理由を書いて次へ。2 件を同時に開かない。
> このファイルは **200 行以内**に保つ。超えたら幅を広げず、履歴へ移す。**commit の粒度で整備する。**

次に起票する ID は **T128 以降**。

## 何をどこに書くか

| 何を書くか | どこに書くか |
|---|---|
| 作業規律 | [docs/work-rules.md](docs/work-rules.md) |
| 完了した作業の記録 | [Tasks-archive.md](Tasks-archive.md) |
| 最小検証と Gate の封印 | [Tasks.lock.json](Tasks.lock.json)（`tools/check_tasks_lock.py` が commit 時に確かめる） |
| 調査の結果 | `docs/research/` |
| 設計の原本・将来候補 | `docs/design/` |

## 書き方

1 行 1 作業。列は「**何を・なぜ・最小検証・Gate・状態**」。状態は `[ ]` 未着手 / `[-]` 進行中 / `[x]` 完了 / `[~]` 所有者の判断待ち。
`[x]` は直近 1 件だけ残し、以前のものは履歴へ移す。中断した `[-]` には、どこまで済んだかを書く。
**最小検証と Gate は着手前に書き、`Tasks.lock.json` に封印する。** 閉じる前の run は 2 分以内。フル（`python3 tools/full_gate.py`）は push の直前だけ。
完了の 4 条件と別視点の検証（`.claude/agents/gate-auditor.md`）は [docs/work-rules.md](docs/work-rules.md)。

---

## 本線 A — 調査と設計（2026-10-28〜）

(T005 は 2026-10-30 に閉じた。見た目は利用者が選ぶ。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 B — 部品の実装（2026-10-30〜）

順番は [docs/design/components.md](docs/design/components.md) の「実装の順番」。行は 1 つ着手するときに起票する。

(T033・T036・T049 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 C — 派手版を部品集に戻す（2026-10-30〜）

試作 `prototype/ha-home.html?variant=bold` の派手版（間取りの立体図、電気の流れの粒、注目の部屋の移動）を、部品にするときに `motion=full` へ縮めて落としていた。所有者の依頼「派手な Variant」を部品集で戻す。

(T050〜T056 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 D — ゲーム風の見た目を部品集に入れる（2026-10-31〜）

最初の試作（公開のときに外した）の面白さ（傾いたパネル、巨大な文字、回る文字、流れる背景、切り替えの演出）が、「元の作品に寄せない」を技法ごと禁じたことと、需要の数字で案 A〜C を捨てたことで、部品集から消えていた。所有者の判断 A（2026-10-31）: 避けるのは元の作品の配色と固有の飾り（墨の背景・縦書き・筆記体・バーコード）だけにし、技法は戻す。

(T057〜T062 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

(T063〜T083 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 E — よく使われるカードの部品を足す（2026-10-31〜）

所有者の依頼で、使える部品を増やす。順番は [docs/research/cards.md](docs/research/cards.md) の需要の順で、[docs/design/components.md](docs/design/components.md) の「実装の順番」21〜26。行は 1 つ着手するときに起票する。

## 本線 F — 実機で使える状態を固める（2026-11-01〜）

所有者の判断 A（2026-11-01）: 部品を増やす前に、push 前の全体の検査を速くし、カードの取り込みを Home Assistant の実際の値の形に合わせる。

(T084〜T092 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 G — 部品をさらに足す（2026-11-03〜）

所有者の依頼で、続けて部品を足す。cards.md の 6 種類は作り終えたので、残りの種類の需要を数字で調べ直し、順番を決めて 1 つずつ作る。

(T093〜T118 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 H — HTML の部品として単体で使える形を固める（2026-11-04〜）

所有者の判断 B（2026-11-04）: Home Assistant は題材の 1 つ。HTML の部品集が本体で、Home Assistant のカードは届け先の 1 つ。本物の Home Assistant での確かめは見送り、部品が単体で実際のデータとつながるかを固める。

(T119〜T125 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 本線 I — 部品とテーマを増やす（2026-11-10〜）

所有者の依頼で、部品とテーマを増やす。順番は docs/research/themes.md と docs/research/cards4.md の需要の数字で決める。

(T126〜T127 は閉じた。記録は [Tasks-archive.md](Tasks-archive.md))

## 直近完了（境界確認用に 1 件だけ）

| 状態 | ID | 何を | 証跡 |
|---|---|---|---|
| [x] | T127 | `<cw-trend>`（数字に前との差と推移の線） | 2026-11-10 |
