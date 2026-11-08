#!/usr/bin/env bash
# The full gate's reuse of suite results (CW_GATE_CACHE) must replay only what was really run with the same inputs.
# A replay must not need Chrome, so the second runs below point CHROME at nothing: if they pass, nothing was launched.
set -u
# run inside the full gate too: start from no cache, not the full gate's own
unset CW_GATE_CACHE
fail=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
dir=$(mktemp -d)
trap 'rm -rf "$dir" tools/tests/selftest-cache-tmp.mjs' EXIT
run() { CW_GATE_CACHE="$dir" node tools/test_components.mjs "$@"; }

first=$(run base); rc1=$?
again=$(CHROME=/nonexistent run base); rc2=$?
chk "a suite run once is replayed without Chrome" "[ $rc1 -eq 0 ] && [ $rc2 -eq 0 ]"
chk "  ...with the same lines" "[ \"\$first\" = \"\$again\" ]"
chk "another clock is run again" "! CW_FAKE_TIME=23:50 CHROME=/nonexistent run base"
chk "another time zone is run again" "! TZ=Pacific/Kiritimati CHROME=/nonexistent run base"
chk "another suite is run again" "! CHROME=/nonexistent run values"
chk "without the cache nothing is replayed" "! CHROME=/nonexistent node tools/test_components.mjs base"

# a throwaway suite (selftest- names stay out of "all"), changed after its first run
tmp=tools/tests/selftest-cache-tmp.mjs
printf "export const demo = 'blank.html';\nexport async function run(page, check) { check('runs', true); }\n" > $tmp
run selftest-cache-tmp >/dev/null 2>&1
printf '// changed\n' >> $tmp
CHROME=/nonexistent run selftest-cache-tmp >/dev/null 2>&1; rc=$?
chk "a changed suite file is run again" "[ $rc -ne 0 ]"

run selftest-broken >/dev/null 2>&1
out=$(CHROME=/nonexistent run selftest-broken); rc=$?
chk "a failed suite replays as failed" "[ $rc -ne 0 ] && printf %s \"\$out\" | grep -q '^FAIL selftest-broken: no page or console errors (pageerror: '"
d2=$(mktemp -d)
CW_GATE_CACHE=$d2 CW_CACHE_PASS_ONLY=1 node tools/test_components.mjs selftest-broken base >/dev/null 2>&1
chk "the warm-up keeps passes only" "[ \$(ls $d2 | wc -l) -eq 1 ] && CW_GATE_CACHE=$d2 CHROME=/nonexistent node tools/test_components.mjs base && ! CW_GATE_CACHE=$d2 CHROME=/nonexistent node tools/test_components.mjs selftest-broken"
rm -rf "$d2"

CW_GATE_CACHE="$dir" npm run build >/dev/null && touch -t 202001010000 dist/cw.js && CW_GATE_CACHE="$dir" npm run build >/dev/null
chk "the second build in one full gate is skipped" "[ -z \"\$(find dist/cw.js -newermt 2020-01-02)\" ]"
npm run build >/dev/null
chk "a build outside the full gate always builds" "[ -n \"\$(find dist/cw.js -newermt 2020-01-02)\" ]"

chk "the full gate sets the cache" "grep -q CW_GATE_CACHE tools/full_gate.py"
chk "T077 repeats its suite without the cache" "grep -qE '^FRESH = .*T077' tools/full_gate.py"

[ $fail = 0 ] && echo "GATECACHE OK" || { echo "GATECACHE FAIL"; exit 1; }
