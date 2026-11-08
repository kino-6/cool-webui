#!/usr/bin/env bash
# The full gate skips a row whose files have not changed since it last passed, and runs it again when they do.
# Runs the full gate on a small lock of its own (FULL_GATE_LOCK) with its own record (FULL_GATE_STATE).
set -u
unset CW_GATE_CACHE FULL_GATE_ALL
fail=0
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
dir=$(mktemp -d)
trap 'rm -rf "$dir" docs/_gateskip tools/_gateskip.sh src/_gateskip.js' EXIT
mkdir -p docs/_gateskip
echo hello > docs/_gateskip/a.md
echo one > docs/_gateskip/b.md
printf '#!/bin/sh\n# Tasks.md is named here, as many tools do, and still is not a file D3 reads\ngrep -q one docs/_gateskip/b.md\n' > tools/_gateskip.sh
# D1 reads a.md; D3 reads b.md through a script; B1 runs component suites (it reads src, demo, themes...);
# S1 checks the setup and always runs; F1 fails
cat > "$dir/lock.json" <<'J'
{"rows": {
  "D1": {"passes": true, "gate": "`grep -q hello docs/_gateskip/a.md && echo x >> $SKIP_OUT/D1`"},
  "D3": {"passes": true, "gate": "`bash tools/_gateskip.sh && echo x >> $SKIP_OUT/D3`"},
  "B1": {"passes": true, "gate": "`echo x >> $SKIP_OUT/B1 || node tools/test_components.mjs base`"},
  "S1": {"passes": true, "gate": "`echo x >> $SKIP_OUT/S1 || bash tools/check_setup.sh`"},
  "F1": {"passes": true, "gate": "`echo x >> $SKIP_OUT/F1; false`"}
}}
J
gate() { rm -f "$dir"/D1 "$dir"/D3 "$dir"/B1 "$dir"/S1 "$dir"/F1; SKIP_OUT=$dir FULL_GATE_LOCK=$dir/lock.json FULL_GATE_STATE=$dir/state.json "$@" python3 tools/full_gate.py > "$dir/out.txt" 2>&1; }
ran() { for r in "$@"; do [ -s "$dir/$r" ] || return 1; done; }
none() { for r in "$@"; do [ ! -e "$dir/$r" ] || return 1; done; }

gate
chk "the first run runs every row" "ran D1 D3 B1 S1 F1"
gate
chk "unchanged rows are skipped the next time" "none D1 D3 B1 && grep -qE '^skip D1' $dir/out.txt"
chk "the setup check runs every time" "ran S1"
chk "a failed row is not recorded, so it runs again" "ran F1"
echo 'hello again' > docs/_gateskip/a.md
gate
chk "a changed file runs its row again, only that row" "ran D1 && none D3 B1"
echo 'one more' > docs/_gateskip/b.md
gate
chk "a file read through a script counts too" "ran D3 && none D1"
echo '# changed' >> Tasks.md
gate
chk "the queue files count only when a gate names them" "none D1 D3 B1"
sed -i '' '$d' Tasks.md
echo '// new' > src/_gateskip.js
gate
chk "a change in src runs the rows that run component suites" "ran B1 && none D1 D3"
rm src/_gateskip.js
gate env FULL_GATE_ALL=1
chk "FULL_GATE_ALL=1 runs every row" "ran D1 D3 B1 S1 F1"
chk "the record stays where FULL_GATE_STATE says" "[ -s $dir/state.json ]"

[ $fail = 0 ] && echo "GATESKIP OK" || { echo "GATESKIP FAIL"; exit 1; }
