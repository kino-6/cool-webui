#!/usr/bin/env bash
# T029 gate: check_doc retries a URL that first answers 429, still fails a URL that answers 404,
# and reuses a URL already confirmed in the same full-gate run (CHECK_DOC_URL_CACHE).
set -u
tmp=$(mktemp -d); trap 'kill $srv 2>/dev/null; wait $srv 2>/dev/null; rm -rf "$tmp"' EXIT
cat > "$tmp/srv.py" <<'PY'
import http.server, sys
hits = {}
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        hits[self.path] = hits.get(self.path, 0) + 1
        if self.path == "/flaky":  code = 429 if hits[self.path] == 1 else 200
        elif self.path == "/once": code = 200 if hits[self.path] == 1 else 500
        elif self.path.startswith("/missing-ok"): code = 200
        elif self.path == "/busy": code = 429
        else: code = 404
        self.send_response(code); self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PY
port=$((20000 + RANDOM % 20000))
python3 "$tmp/srv.py" $port & srv=$!
sleep 1
doc() { printf '# t\n\n## 出典\n\n- %s\n' "$1" > "$tmp/d.md"; python3 tools/check_doc.py "$tmp/d.md" --check-urls | tail -1; }
fail=0
# a failure also goes to stderr, so the full gate's log shows it even when the gate keeps only the last line
chk() { if [ "$2" = 1 ]; then echo "ok   $1"; else echo "FAIL $1"; echo "FAIL $1" >&2; fail=1; fi; }
r=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/flaky");   chk "429 then 200 is retried and passes ($r)" "$([[ $r == 'DOC OK'* ]] && echo 1)"
r=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/missing"); chk "404 still fails ($r)" "$([[ $r == 'DOC FAIL'* ]] && echo 1)"
r=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/busy");    chk "429 every time is not judged and does not fail ($r)" "$([[ $r == 'DOC OK'* ]] && echo 1)"
export CHECK_DOC_URL_CACHE="$tmp/cache.txt"; : > "$CHECK_DOC_URL_CACHE"
r1=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/once"); r2=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/once")
chk "second run in the same gate reuses the confirmed URL ($r1 / $r2)" "$([[ $r1 == 'DOC OK'* && $r2 == 'DOC OK'* ]] && echo 1)"
r1=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/missing"); r2=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/missing")
chk "/missing (404) is not remembered by the cache ($r2)" "$([[ $r1 == 'DOC FAIL'* && $r2 == 'DOC FAIL'* ]] && echo 1)"
# /missing-ok answers 200 and is cached; /missing is part of that URL but must still be asked (oncex-style prefix trap)
CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/missing-ok" >/dev/null
r=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/missing");  chk "the cache matches whole URLs, not parts of them ($r)" "$([[ $r == 'DOC FAIL'* ]] && echo 1)"
unset CHECK_DOC_URL_CACHE
r=$(CHECK_DOC_RETRY_WAIT=0.2 doc "http://127.0.0.1:$port/once");    chk "without the cache the server is asked again ($r)" "$([[ $r == 'DOC FAIL'* ]] && echo 1)"
[ $fail = 0 ] && echo "SELFTEST OK" || { echo "SELFTEST FAIL"; exit 1; }
