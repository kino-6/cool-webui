#!/usr/bin/env bash
# T001/T007 gate: the repository can run its own task queue.
#   PRE_PUSH=<path>     check another pre-push file (for the selftest)
#   PUSHING_SHA=<sha>   set by .githooks/pre-push to the commit being pushed. Only when it equals HEAD
#                       is "HEAD is pushed" skipped (the remote cannot have it yet); any other value is ignored
set -u
fail=0
PRE_PUSH="${PRE_PUSH:-.githooks/pre-push}"
need() { if eval "$1" >/dev/null 2>&1; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }
need 'test -s LICENSE'                                                'license kept'
need 'test -s CHARTER.md && test -s Tasks.md && test -s docs/work-rules.md && test -s Tasks-archive.md' 'queue files'
need 'python3 tools/check_tasks_lock.py'                              'lock consistent'
need '[ "$(git config core.hooksPath)" = .githooks ]'                 'hooks wired'
need 'test -x "$PRE_PUSH" && grep -q "^ *python3 tools/full_gate.py" "$PRE_PUSH"' 'pre-push runs the full gate'
need '[ "$(gh repo view --json nameWithOwner -q .nameWithOwner)" = kino-6/cool-webui ]' 'origin is this GitHub repo'
if [ -n "${PUSHING_SHA:-}" ] && [ "$PUSHING_SHA" = "$(git rev-parse HEAD)" ]; then
  echo "skip HEAD pushed (inside pre-push)"
else
  need '[ "$(git ls-remote origin refs/heads/main | cut -f1)" = "$(git rev-parse HEAD)" ]' 'HEAD pushed to origin/main'
fi
[ $fail = 0 ] && echo "SETUP OK" || { echo "SETUP FAIL"; exit 1; }
