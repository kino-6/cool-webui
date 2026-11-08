#!/usr/bin/env bash
# T008 gate: check_doc.py's URL and label checks each catch their own failure, and pass the real usage.md.
# Nothing here leaves this machine: URLs are a test server on 127.0.0.1, and a local stand-in proxy proves that an
# outside URL is not opened unless CHECK_DOC_ONLINE=1 asks for it (2026-11-07, owner: no automatic visits to other sites).
set -u
unset CHECK_DOC_ONLINE CHECK_DOC_URL_CACHE
t=$(mktemp -d); bad=0
cat > "$t/srv.py" <<'PY'
import http.server, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response({"/ok": 200, "/forbid": 403}.get(self.path, 404)); self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY
# a stand-in proxy: it counts the connections it is asked for and answers 502, so nothing goes further
cat > "$t/proxy.py" <<'PY'
import socketserver, sys
class P(socketserver.StreamRequestHandler):
    def handle(self):
        with open(sys.argv[2], "a") as f: f.write("x\n")
        self.request.recv(4096); self.request.sendall(b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n")
socketserver.TCPServer(("127.0.0.1", int(sys.argv[1])), P).serve_forever()
PY
port=$((20000 + RANDOM % 20000)); pport=$((port + 1))
python3 "$t/srv.py" $port & srv=$!
python3 "$t/proxy.py" $pport "$t/asked" & prx=$!
trap 'kill $srv $prx 2>/dev/null; wait $srv $prx 2>/dev/null; rm -rf "$t"' EXIT
sleep 1
u=docs/research/usage.md
local=http://127.0.0.1:$port
doc() { printf '# t\n\n## 出典\n\n- %s\n' "$@" > "$t/d.md"; }
want() { # $1 = file, $2 = problem text that must appear, $3... = more options
  local f=$1 w=$2; shift 2
  out=$(python3 tools/check_doc.py "$f" --check-urls "$@")
  if echo "$out" | tail -1 | grep -q '^DOC FAIL' && echo "$out" | grep -q -- "$w"; then echo "ok   $(basename "$f") -> FAIL ($w)"
  else echo "BAD  $(basename "$f") (want '$w')"; echo "$out" | sed 's/^/       /'; echo "BAD  $(basename "$f") (want '$w'): $out" >&2; bad=1; fi
}
pass() { # $1 = label, $2 = file, $3... = more options
  local l=$1 f=$2; shift 2
  r=$(python3 tools/check_doc.py "$f" --check-urls "$@" | tail -1)
  case "$r" in "DOC OK"*) echo "ok   $l -> OK";; *) echo "BAD  $l -> $r"; echo "BAD  $l -> $r" >&2; bad=1;; esac
}
doc "$local/gone"; cp "$t/d.md" "$t/gone.md"; want "$t/gone.md" 'url 404'
doc "$local/forbid"; cp "$t/d.md" "$t/forbid.md"; want "$t/forbid.md" 'url 403'
pass "a refusing host on the blocked list" "$t/forbid.md" --blocked-ok 127.0.0.1
doc "$local/ok"; pass "a page that answers" "$t/d.md"
# labels kept only in the preamble legend
awk '/^## /{s=1} s{gsub(/調査で確認|推測/,"")} {print}' $u > "$t/legend-only.md"
sed 's/推測//g' $u > "$t/no-guess-label.md"
sed 's/調査で確認//g' $u > "$t/no-fact-label.md"
want "$t/legend-only.md"    'label not used in any section: 調査で確認' --require-labels 調査で確認,推測
want "$t/no-guess-label.md" 'label not used in any section: 推測' --require-labels 調査で確認,推測
want "$t/no-fact-label.md"  'label not used in any section: 調査で確認' --require-labels 調査で確認,推測
pass "usage.md, its outside links not opened" $u --min-links 6 --require-labels 調査で確認,推測
# outside URLs: not opened by default, opened only when asked (the stand-in proxy is the only thing reached)
doc "https://example.com/a" "https://example.org/b"
: > "$t/asked"
out=$(HTTPS_PROXY=http://127.0.0.1:$pport HTTP_PROXY=http://127.0.0.1:$pport python3 tools/check_doc.py "$t/d.md" --check-urls)
n=$(wc -l < "$t/asked" | tr -d ' ')
if [ "$n" = 0 ] && echo "$out" | grep -q 'not opened' && echo "$out" | tail -1 | grep -q '^DOC OK'; then echo "ok   outside URLs are not opened by default ($n asked)"
else echo "BAD  outside URLs were opened by default ($n asked)"; echo "BAD  outside URLs were opened ($n)" >&2; bad=1; fi
: > "$t/asked"
CHECK_DOC_ONLINE=1 CHECK_DOC_RETRY_WAIT=0.05 HTTPS_PROXY=http://127.0.0.1:$pport HTTP_PROXY=http://127.0.0.1:$pport python3 tools/check_doc.py "$t/d.md" --check-urls >/dev/null
n=$(wc -l < "$t/asked" | tr -d ' ')
if [ "$n" -ge 1 ]; then echo "ok   CHECK_DOC_ONLINE=1 opens them ($n asked of the stand-in)"; else echo "BAD  CHECK_DOC_ONLINE=1 did not open them"; echo "BAD  online did not open" >&2; bad=1; fi
[ $bad = 0 ] && echo "SELFTEST OK" || { echo "SELFTEST FAIL"; exit 1; }
