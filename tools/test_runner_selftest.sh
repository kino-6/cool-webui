#!/usr/bin/env bash
# The component test runner must fail for the right reason on pages that throw or log console errors.
set -u
fail=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
out=$(node tools/test_components.mjs selftest-broken); rc=$?
chk "a thrown error fails the run" "[ $rc -ne 0 ]"
chk "  ...because of the page error" "printf %s \"\$out\" | grep -q 'FAIL selftest-broken: no page or console errors (pageerror: '"
out=$(node tools/test_components.mjs selftest-console); rc=$?
chk "a console error fails the run" "[ $rc -ne 0 ]"
chk "  ...because of the console error" "printf %s \"\$out\" | grep -q 'FAIL selftest-console: no page or console errors (console: selftest console error'"
out=$(node tools/test_components.mjs selftest-allow); rc=$?
chk "an error outside allowConsole fails the run" "[ $rc -ne 0 ] && printf %s \"\$out\" | grep -q 'console: other error' && ! printf %s \"\$out\" | grep -q 'console: ALLOWED'"
out=$(node tools/test_components.mjs selftest-allow-only); rc=$?
chk "only allowed errors pass" "[ $rc -eq 0 ]"
out=$(node tools/test_components.mjs base); rc=$?
chk "a clean page passes" "[ $rc -eq 0 ] && printf %s \"\$out\" | tail -1 | grep -qx 'COMPONENTS OK'"
[ $fail = 0 ] && echo "RUNNER OK" || { echo "RUNNER FAIL"; exit 1; }
