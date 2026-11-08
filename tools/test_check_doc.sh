#!/usr/bin/env bash
# T010 gate: per-section counts and filler detection catch three mutations of market.md.
set -u
t=$(mktemp -d); trap 'rm -rf "$t"' EXIT; bad=0
m=docs/research/market.md
grep -v -E '^\| [A-E]:' $m > "$t/no-competitors.md"
awk '/^## 出典/{print; print "後で URL を足す。出典はまだ整理していない段階で、ここには URL を置いていない。"; skip=1; next} /^## /{skip=0} !skip' $m > "$t/no-sources.md"
awk '/^## 結論/{print; print "ああああああああああああああああああああああああああああああああああああああああああ"; skip=1; next} /^## /{skip=0} !skip' $m > "$t/filler-conclusion.md"
run() { python3 tools/check_doc.py "$1" --sections 競合一覧,価格と収益の形,空いている場所,結論,出典 --section-min-table-rows 競合一覧=8 --section-min-links 出典=10 | tail -1; }
for f in no-competitors no-sources filler-conclusion; do
  r=$(run "$t/$f.md"); case "$r" in "DOC FAIL"*) echo "ok   $f -> FAIL";; *) echo "BAD  $f -> $r"; bad=1;; esac
done
r=$(run $m); case "$r" in "DOC OK"*) echo "ok   market.md -> OK";; *) echo "BAD  market.md -> $r"; bad=1;; esac
[ $bad = 0 ] && echo "SELFTEST OK" || { echo "SELFTEST FAIL"; exit 1; }
