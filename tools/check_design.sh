#!/usr/bin/env bash
# T013 gate: the component design closes the 12 gaps found by the T006 audit.
set -u
f=docs/design/components.md; fail=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
sec() { awk "/^#+ $1/{p=1;next} p&&/^## /{p=0} p" "$f"; }
chk 'source: why it departs from usage hint 2'  "grep -qE '示唆 2.*(変える|反する|外れる)' $f"
for k in cw-source-error 複数 一致しない 不明な 重複 '既定の prop'; do chk "protocol rule: $k" "grep -q '$k' $f"; done
chk 'security: origin + innerHTML'              "grep -q origin $f && grep -q innerHTML $f"
chk 'pause means (WCAG 2.2.2)'                  "grep -qE 'pause\(\)|paused' $f"
chk 'attribute rule vs value= example'          "! grep -q '属性は値の通り道にしない' $f || grep -q '初期値だけは属性' $f"
chk 'decoration parts'                          "grep -qE 'part.*(screw|hazard|ghost)' $f"
chk 'Home Assistant card mapping'               "grep -q setConfig $f && grep -q hass $f && grep -q getCardSize $f"
chk 'perf: GPU and OBS/Raspberry Pi, full run'  "sec '負荷を測る手順' | grep -q GPU && sec '負荷を測る手順' | grep -qE 'OBS|Raspberry' && sec '負荷を測る手順' | grep -q 'push'"
chk 'font variable in the theme table'           "grep -qE '^\| .--cw-font' $f"
chk 'bg=none makes ground transparent'          "grep -qE 'bg=\"none\".*透明' $f"
chk 'component list == implementation order'    "diff <(sec '部品一覧' | grep -oE '<cw-[a-z]+>' | sort -u) <(sec '実装の順番' | grep -oE '<cw-[a-z]+>' | sort -u)"
python3 tools/check_doc.py $f --sections 部品一覧,共通の約束,データの渡し方,動きと負荷,配布の形,実装の順番,未決事項 --min-table-rows 12 >/dev/null || { echo "FAIL doc shape"; fail=1; }
[ $fail = 0 ] && echo "DESIGN OK" || { echo "DESIGN FAIL"; exit 1; }
