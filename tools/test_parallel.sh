#!/usr/bin/env bash
# Suites run side by side (CW_JOBS), print in the order named, and the full gate really replays them.
set -u
unset CW_GATE_CACHE
# the pages need the bundles, and the cache key reads them
npm run build >/dev/null
fail=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
dir=$(mktemp -d)
trap 'rm -rf "$dir" tools/tests/selftest-par-*.mjs demo/_par.html dist/_par.js themes/_par.css' EXIT
# throwaway suites: two that wait 1 and 1.2 s (the first named finishes last) and one that fails;
# each writes when it starts and ends to $PAR_LOG, so running at once is seen as overlap, whatever else loads the machine
mk() { cat > tools/tests/selftest-par-$1.mjs <<JS
import { appendFileSync } from 'node:fs';
const log = (w) => process.env.PAR_LOG && appendFileSync(process.env.PAR_LOG, '$1 ' + w + ' ' + Date.now() + '\\n');
export const demo = 'blank.html';
export async function run(page, check) { log('start'); await new Promise((r) => setTimeout(r, $2)); log('end'); check('$1', $3); }
JS
}
mk slow 1200 true; mk fast 1000 true; mk bad 100 false

# overlap: each started before the other ended
at() { awk -v k="$2 $3" '$1" "$2==k{print $3}' "$1"; }
overlap() { [ "$(at "$1" slow start)" -lt "$(at "$1" fast end)" ] && [ "$(at "$1" fast start)" -lt "$(at "$1" slow end)" ]; }
out=$(PAR_LOG=$dir/two CW_JOBS=2 node tools/test_components.mjs selftest-par-slow selftest-par-fast); rc=$?
chk "lines come in the order named" "[ \"\$(printf %s \"\$out\" | grep -o 'selftest-par-[a-z]*' | uniq | paste -sd, -)\" = selftest-par-slow,selftest-par-fast ]"
PAR_LOG=$dir/one CW_JOBS=1 node tools/test_components.mjs selftest-par-slow selftest-par-fast >/dev/null
chk "two jobs overlap the two suites ($(tr '\n' ' ' < $dir/two))" "[ $rc -eq 0 ] && overlap $dir/two"
chk "one job runs them one after the other ($(tr '\n' ' ' < $dir/one))" "[ -s $dir/one ] && ! overlap $dir/one"
out=$(CW_JOBS=2 node tools/test_components.mjs selftest-par-bad selftest-par-fast); rc=$?
chk "a failing suite fails a parallel run" "[ $rc -ne 0 ] && printf %s \"\$out\" | tail -1 | grep -qx 'COMPONENTS FAIL (1)'"

# the cache follows the pages: a changed demo page, theme or bundle is run again
CW_GATE_CACHE=$dir node tools/test_components.mjs base >/dev/null
echo '<!-- changed -->' > demo/_par.html
chk "a changed demo file is run again" "! CW_GATE_CACHE=$dir CHROME=/nonexistent node tools/test_components.mjs base"
rm demo/_par.html
chk "  ...and the same files replay" "CW_GATE_CACHE=$dir CHROME=/nonexistent node tools/test_components.mjs base"
echo '// changed' > dist/_par.js
chk "a changed bundle is run again" "! CW_GATE_CACHE=$dir CHROME=/nonexistent node tools/test_components.mjs base"
rm dist/_par.js
echo '/* changed */' > themes/_par.css
chk "a changed theme is run again" "! CW_GATE_CACHE=$dir CHROME=/nonexistent node tools/test_components.mjs base"
rm themes/_par.css

# the full gate on a small lock: rows get one fresh cache, T077 gets none, and the cache is gone afterwards
cat > "$dir/lock.json" <<'J'
{"rows": {
  "R1": {"passes": true, "gate": "`echo \"$CW_GATE_CACHE\" > $PAR_OUT/r1 && CHROME=/nonexistent node tools/test_components.mjs base`"},
  "T077": {"passes": true, "gate": "`echo \"x${CW_GATE_CACHE}x\" > $PAR_OUT/t077`"}
}}
J
PAR_OUT=$dir FULL_GATE_LOCK=$dir/lock.json FULL_GATE_STATE=$dir/state.json python3 tools/full_gate.py >"$dir/gate.txt" 2>&1; rc=$?
chk "the full gate replays suites it ran at the start" "[ $rc -eq 0 ] && grep -q '^ok   R1' $dir/gate.txt"
chk "T077 runs without the cache" "[ \"\$(cat $dir/t077)\" = xx ]"
chk "the cache is new for each run and removed after" "[ -s $dir/r1 ] && [ ! -e \"\$(cat $dir/r1)\" ]"

# a clock for the rows below (date would mark them as rows that time things, which run alone)
printf '#!/bin/sh\nexec python3 -c "import time; print(time.time_ns())"\n' > "$dir/now"; chmod +x "$dir/now"
# the full gate on rows that log when they start and end: R2 and R3 overlap, T047 overlaps neither
log() { echo "\"\`echo $1 start \$(\$PAR_OUT/now) >> \$PAR_OUT/log; sleep 0.6; echo $1 end \$(\$PAR_OUT/now) >> \$PAR_OUT/log\`\""; }
cat > "$dir/lock2.json" <<J
{"rows": {
  "T047": {"passes": true, "gate": $(log T047)},
  "R2": {"passes": true, "gate": $(log R2)},
  "R3": {"passes": true, "gate": "\`echo R3 start \$(\$PAR_OUT/now) >> \$PAR_OUT/log; sleep 0.6; echo R3 end \$(\$PAR_OUT/now) >> \$PAR_OUT/log; node tools/test_components.mjs selftest-par-fast\`"},
  "R4": {"passes": true, "gate": "\`npm run build >/dev/null && node tools/test_components.mjs base charts | tail -1\`"},
  "R5": {"passes": false, "gate": "\`node tools/test_components.mjs values\`"}
}}
J
rm -f "$dir/log"
PAR_OUT=$dir FULL_GATE_LOCK=$dir/lock2.json FULL_GATE_STATE=$dir/state2.json python3 tools/full_gate.py >"$dir/gate2.txt" 2>&1; rc=$?
at() { awk -v k="$1 $2" '$1" "$2==k{print $3}' "$dir/log"; }
chk "the start runs only the suites passing rows name ($(grep 'start:' $dir/gate2.txt | xargs))" "[ $rc -eq 0 ] && grep -qx '     start: base charts selftest-par-fast' $dir/gate2.txt"
chk "rows run side by side" "[ \$(at R2 start) -lt \$(at R3 end) ] && [ \$(at R3 start) -lt \$(at R2 end) ]"
chk "solo rows run alone" "[ \$(at T047 start) -gt \$(at R2 end) ] && [ \$(at T047 start) -gt \$(at R3 end) ]"
chk "rows are reported in lock order" "[ \"\$(grep -oE '^(ok  |FAIL) (T047|R[0-9])' $dir/gate2.txt | awk '{print \$2}' | paste -sd, -)\" = T047,R2,R3,R4 ]"

[ $fail = 0 ] && echo "PARALLEL OK" || { echo "PARALLEL FAIL"; exit 1; }
