#!/usr/bin/env bash
# One command to see the parts: builds them and opens a page in Chrome.
#   ./show.sh            the catalog (every part)
#   ./show.sh home       the home dashboard sample
#   ./show.sh machine    this Mac's real numbers (keeps a small local server running; Ctrl-C stops it)
#   ./show.sh plain      the parts in a plain page
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --silent
npm run build --silent >/dev/null
page=${1:-catalog}
case "$page" in
  catalog) open -a "Google Chrome" demo/index.html ;;
  home) open -a "Google Chrome" demo/home.html ;;
  plain) open -a "Google Chrome" demo/plain.html ;;
  machine)
    node tools/machine-feed.mjs 8787 &
    feed=$!
    trap 'kill $feed 2>/dev/null' EXIT INT TERM
    sleep 1
    open -a "Google Chrome" "http://127.0.0.1:8787/demo/machine.html"
    echo "machine の画面を開きました。止めるときは Ctrl-C"
    wait $feed ;;
  *) echo "使い方: ./show.sh [catalog|home|machine|plain]"; exit 1 ;;
esac
