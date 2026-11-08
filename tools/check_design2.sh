#!/usr/bin/env bash
# T014 gate: the design leaves no guess for the implementer on the 6 points found by the T013 audit.
set -u
f=docs/design/components.md; fail=0
sec() { awk -v h="$1" 'index($0,h)==1{p=1;next} p&&/^##/{p=0} p' "$f"; }
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
chk 'HA: unavailable and bars mapping'   "sec '### Home Assistant' | grep -q unavailable && sec '### Home Assistant' | grep 'set hass' | grep -qE 'bars|kind'"
chk 'pause: controls, part, clock'       "grep '<cw-stage>' $f | grep -q controls && grep -q '\`pause\`' $f && sec '### 一時停止' | grep -q 'cw-clock'"
chk 'source: push to set-only, interval' "sec '### 決まった形' | grep -qE 'stat.*push.*bad-op|push.*stat.*bad-op' && grep -qE 'interval.*既定' $f"
chk 'theme passes background kind'       "sec '### 配色と書体' | grep -q 'kind'"
chk 'perf: root and remote-debugging'    "sec '### 負荷を測る手順' | grep -qE 'sudo|root' && sec '### 負荷を測る手順' | grep -qE 'remote-debugging'"
chk 'initial-value attributes listed'    "grep '<cw-stat>' $f | grep -q '\`value\`' && ! grep '<cw-status>' $f | grep -q '| なし |'"
bash tools/check_design.sh >/dev/null || { echo "FAIL T013 checks regressed"; fail=1; }
[ $fail = 0 ] && echo "DESIGN2 OK" || { echo "DESIGN2 FAIL"; exit 1; }
