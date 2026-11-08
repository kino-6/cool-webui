#!/bin/bash
# Self-test for tools/check_theme_tokens.mjs: broken copies of the table or the CSS must FAIL, the real ones must pass.
# Runs the checker inside a scratch copy so the repository is never touched.
set -u
root=$(cd "$(dirname "$0")/.." && pwd)
bad=0
run() { # name, expected (OK|FAIL), checker args, then a sed edit as "file|expression" or "-"
  local name=$1 want=$2 args=$3 edit=$4 tmp
  tmp=$(mktemp -d)
  mkdir -p "$tmp/docs/design" "$tmp/themes" "$tmp/tools"
  cp "$root/docs/design/components.md" "$tmp/docs/design/"
  cp "$root"/themes/*.css "$tmp/themes/"
  cp "$root/tools/check_theme_tokens.mjs" "$tmp/tools/"
  if [ "$edit" != "-" ]; then sed -i '' -e "${edit#*|}" "$tmp/${edit%%|*}"; fi
  local got
  got=$(cd "$tmp" && node tools/check_theme_tokens.mjs $args | tail -1 | grep -oE '^TOKENS (OK|FAIL)' | cut -d' ' -f2)
  rm -rf "$tmp"
  if [ "$got" = "$want" ]; then echo "ok   $name"; else echo "FAIL $name (want $want, got ${got:-nothing})"; bad=$((bad + 1)); fi
}
run 'real files pass (tile/glass)' OK '' -
run 'real files pass (game)' OK game -
run 'a game value off from the table' FAIL game 'themes/game.css|s/--cw-label-pad: 3px 12px/--cw-label-pad: 30px/'
run 'a game variable missing from the table' FAIL game 'themes/game.css|s/--cw-tilt: -0.8deg;/--cw-tilt: -0.8deg; --cw-extra: 1px;/'
run 'a game font off from the table' FAIL game 'themes/game.css|s/--cw-display-font: Archivo/--cw-display-font: Inter/'
run 'the game argument reads the game table' OK '' 'themes/game.css|s/--cw-label-pad: 3px 12px/--cw-label-pad: 30px/'
run 'a tile value off from the table' FAIL '' 'themes/tile.css|s/--cw-radius: 16px/--cw-radius: 17px/'
run 'a tile variable missing from the table' FAIL '' 'themes/tile.css|s/--cw-blur: none;/--cw-blur: none; --cw-extra: 1px;/'
if [ $bad -eq 0 ]; then echo 'SELFTEST OK'; else echo "SELFTEST FAIL ($bad)"; exit 1; fi
