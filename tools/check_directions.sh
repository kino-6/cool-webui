#!/usr/bin/env bash
# T004 gate: three visual directions exist, are documented, and stay away from the prototype's look.
set -u
fail=0
python3 tools/check_doc.py docs/design/visual-direction.md --sections 元作品と避ける点,案A,案B,案C,推奨 || fail=1
for x in a b c; do
  f=prototype/direction-$x.html
  if [ ! -s "$f" ]; then echo "FAIL $f missing"; fail=1; continue; fi
  hit=$(grep -oiE '9fe3c9|5fcaa5|e8433a|textPath|writing-mode: *vertical|-webkit-text-stroke' "$f" | sort -u | tr '\n' ' ')
  if [ -n "$hit" ]; then echo "FAIL $f uses the prototype's look: $hit"; fail=1; else echo "ok   $f"; fi
done
[ $fail = 0 ] && echo "DIRECTIONS OK" || { echo "DIRECTIONS FAIL"; exit 1; }
