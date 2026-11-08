#!/usr/bin/env bash
# T007 gate: tools/check_setup.sh (the working-tree copy) goes red for the intended reason
# in each broken setup, and green in the real repository.
set -u
repo=$(pwd); url=$(git remote get-url origin); bad=0
t=$(mktemp -d); trap 'rm -rf "$t"' EXIT
fresh() { # clone at origin/main, then install the working-tree check under test
  rm -rf "$t/c"; git clone -q "$repo" "$t/c"
  (cd "$t/c" && git remote set-url origin "$url" && git config core.hooksPath .githooks && git fetch -q origin && git reset -q --hard origin/main)
  cp "$repo/tools/check_setup.sh" "$t/c/tools/check_setup.sh"
  (cd "$t/c" && git update-index --assume-unchanged tools/check_setup.sh)
}
expect_fail() { # $1 = label, $2 = the FAIL line that must appear, rest = env assignments
  label=$1; line=$2; shift 2
  out=$(cd "$t/c" && env -u PUSHING_SHA -u PRE_PUSH_RUNNING "$@" bash tools/check_setup.sh)
  if echo "$out" | grep -qx "FAIL $line" && [ "$(echo "$out" | tail -1)" = "SETUP FAIL" ]; then
    echo "ok   $label -> FAIL $line"
  else
    echo "BAD  $label (want 'FAIL $line'):"; echo "$out" | sed 's/^/       /'; bad=1
  fi
}
fresh; rm "$t/c/.githooks/pre-push"
expect_fail 'pre-push missing'        'pre-push runs the full gate'
fresh; printf '#!/bin/sh\nexit 0\n' > "$t/c/.githooks/pre-push"; chmod +x "$t/c/.githooks/pre-push"
expect_fail 'pre-push does nothing'   'pre-push runs the full gate'
fresh; (cd "$t/c" && git -c user.name=t -c user.email=t@t commit -q --allow-empty --no-verify -m x)
expect_fail 'unpushed commit'         'HEAD pushed to origin/main'
expect_fail 'unpushed, stray marker'  'HEAD pushed to origin/main' PUSHING_SHA=1
expect_fail 'unpushed, old marker'    'HEAD pushed to origin/main' PRE_PUSH_RUNNING=1
expect_fail 'unpushed, other sha'     'HEAD pushed to origin/main' PUSHING_SHA=0000000000000000000000000000000000000000
fresh; (cd "$t/c" && git remote set-url origin https://github.com/cli/cli.git)
expect_fail 'origin is another repo'  'origin is this GitHub repo'
# the good case is judged on a clone at origin/main, so other unpushed work in the real repo does not turn it red
fresh; good=$(cd "$t/c" && env -u PUSHING_SHA -u PRE_PUSH_RUNNING bash tools/check_setup.sh | tail -1)
[ "$good" = "SETUP OK" ] && echo "ok   clean clone -> SETUP OK" || { echo "BAD  clean clone -> $good"; bad=1; }
[ $bad = 0 ] && echo "SELFTEST OK" || { echo "SELFTEST FAIL"; exit 1; }
