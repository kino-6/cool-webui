#!/usr/bin/env bash
# T027 gate: the Home Assistant prototype renders in all four look/variant combinations,
# keeps away from the original work's look, and only the bold variant animates numbers.
set -u
f=prototype/ha-home.html
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# a profile of its own: two runs at once on the default profile hand off to each other and hang
profile=$(mktemp -d); trap 'rm -rf "$profile"' EXIT
fail=0
# a failure also goes to stderr, so it shows in the full gate's log even when the gate keeps only the last line
chk() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; echo "FAIL $1" >&2; fail=1; fi; }

chk "$f exists" "[ -s $f ]"
hit=$(grep -oiE '9fe3c9|5fcaa5|e8433a|textPath|writing-mode: *vertical|-webkit-text-stroke|skew[XY]?\\(' "$f" 2>/dev/null | sort -u | tr '\n' ' ')
chk "no original-work features ($hit)" "[ -z '$hit' ]"

for look in tile glass; do
  for variant in quiet bold; do
    dom=$("$chrome" --user-data-dir="$profile" --headless=new --disable-gpu --virtual-time-budget=4000 --dump-dom \
      "file://$PWD/$f?look=$look&variant=$variant" 2>/dev/null)
    chk "$look/$variant renders" "printf %s \"\$dom\" | grep -q 'data-ready=\"1\"'"
    chk "$look/$variant applied" "printf %s \"\$dom\" | grep -q 'data-look=\"$look\"' && printf %s \"\$dom\" | grep -q 'data-variant=\"$variant\"'"
    # count rolling digits in the rendered page, not in the script source
    rolls=$(printf %s "$dom" | sed '/<script>/,/<\/script>/d' | grep -o 'class="roll"' | wc -l | tr -d ' ')
    if [ $variant = bold ]; then chk "$look/bold rolls numbers ($rolls)" "[ $rolls -gt 0 ]"
    else chk "$look/quiet keeps numbers still ($rolls)" "[ $rolls -eq 0 ]"; fi
  done
done
attr() { printf %s "$2" | grep -o "$1=\"[0-9]*\"" | head -1 | grep -o '[0-9]*'; }
render() { "$chrome" --user-data-dir="$profile" --headless=new --disable-gpu --virtual-time-budget=4000 --dump-dom "file://$PWD/$f?$1" 2>/dev/null; }
# the bold animation loop really runs; quiet and motion=off never start it
d=$(render 'variant=bold');            chk "bold animates (data-frames=$(attr data-frames "$d"))" "[ \"$(attr data-frames "$d")\" -gt 0 ]"
chk "bold home shows security" "printf %s \"\$d\" | grep -q 'id=\"security\"'"
d=$(render 'variant=quiet');           chk "quiet never animates (data-frames=$(attr data-frames "$d"))" "[ \"$(attr data-frames "$d")\" -eq 0 ]"
d=$(render 'variant=bold&motion=off'); chk "motion=off never animates (data-frames=$(attr data-frames "$d"))" "[ \"$(attr data-frames "$d")\" -eq 0 ]"
d=$(render 'variant=bold&bg=none');    chk "bg=none draws no aura (data-aura=$(attr data-aura "$d"))" "[ \"$(attr data-aura "$d")\" -eq 0 ] && printf %s \"\$d\" | grep -q 'data-ready=\"1\"'"
d=$(render 'variant=bold&screen=energy'); chk "energy screen renders" "printf %s \"\$d\" | grep -q 'data-ready=\"1\"' && printf %s \"\$d\" | grep -q 'id=\"flow\"'"
[ $fail = 0 ] && echo "HA_PROTO OK" || { echo "HA_PROTO FAIL"; exit 1; }
