#!/usr/bin/env bash
# T016 gate: the tool follow-ups from the T007 and T010 audits.
set -u
bad=0; t=$(mktemp -d); trap 'rm -rf "$t"' EXIT
ok() { echo "ok   $1"; }; ng() { echo "BAD  $1"; bad=1; }
# 1. an unpushed commit in the repo does not turn the setup selftest red.
#    Simulated in a throwaway clone (with the working-tree tools), so the real HEAD never moves.
git clone -q . "$t/r" && cp tools/check_setup.sh tools/check_setup_selftest.sh "$t/r/tools/"
(cd "$t/r" && git remote set-url origin "$(cd "$OLDPWD" && git remote get-url origin)" && git config core.hooksPath .githooks \
  && git -c user.name=t -c user.email=t@t commit -q --allow-empty --no-verify -m probe \
  && [ -n "$(git log origin/main..HEAD --oneline 2>/dev/null || git log --oneline -1)" ] \
  && bash tools/check_setup_selftest.sh >/dev/null); r=$?
[ $r = 0 ] && ok 'setup selftest green with an unpushed commit' || ng 'setup selftest red with an unpushed commit'
# 2. an empty promise in a section fails
awk '/^## 結論/{print; print "結論はまだ出ていない。調査を続けてから、この節に推奨案と理由と次の手を書く予定である。"; s=1; next} /^## /{s=0} !s' docs/research/market.md > "$t/promise.md"
python3 tools/check_doc.py "$t/promise.md" --sections 結論 | grep -q 'unfinished-work phrase' && ok 'empty promise -> FAIL' || ng 'empty promise passed'
python3 tools/check_doc.py docs/research/market.md --sections 競合一覧,価格と収益の形,空いている場所,結論,反証の検討,集客の比較,出典 >/dev/null && ok 'market.md still OK' || ng 'market.md now fails'
# 3. one URL pattern
[ "$(grep -c 'https?://\[' tools/check_doc.py)" = 1 ] && ok 'one URL pattern' || ng 'URL pattern duplicated'
# 4. the T010 selftest still passes
bash tools/test_check_doc.sh >/dev/null && ok 'test_check_doc.sh OK' || ng 'test_check_doc.sh FAIL'
[ $bad = 0 ] && echo "SELFTEST OK" || { echo "SELFTEST FAIL"; exit 1; }
