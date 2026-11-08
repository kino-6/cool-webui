#!/usr/bin/env python3
"""Check that a research / design document has the shape its Tasks.md row promised.

  python3 tools/check_doc.py docs/research/usage.md --sections 想定利用者,利用場面 --min-links 6

Exit 0 and print `DOC OK ...` when every check holds, else print each problem and exit 1.

  --sections A,B,C     each name must appear as a `## ` heading (prefix match), with
                       at least 40 characters of body under it, made of at least 8 distinct
                       characters (so a run of one repeated character is not a body), and
                       without unfinished-work phrases (TODO, TBD, 後で書く, 書く予定, 予定である)
  --min-links N        at least N distinct http(s) URLs in the file
  --min-table-rows N   at least N table body rows (header and |---| lines excluded)
  --check-urls         every URL must answer 2xx/3xx; anything else fails. Only URLs on this machine (127.0.0.1,
                       localhost) are opened unless CHECK_DOC_ONLINE=1: other sites are not visited on their own
  --blocked-ok H1,H2   with --check-urls: 401/403/429 from these hosts only are reported as
                       "blocked" and not judged (sites that refuse scripts, e.g. themeforest.net)
                       A 429 that lasts through the retries, from any host, is also reported and not judged:
                       a site refusing how often it is asked says nothing of the page.
  --require-labels A,B each label must appear in the body of at least one `## ` section
                       (a legend above the first section does not count)
  --section-min-table-rows NAME=N,...  table body rows counted inside that section only
  --section-min-links NAME=N,...       distinct URLs counted inside that section only
"""

from __future__ import annotations

import argparse
import os
import re
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

URL = re.compile(r"https?://[^\s)\]>|]+")
# phrases an agent writes when it leaves a section unfinished
PLACEHOLDER = re.compile(r"TODO|TBD|後で書く|書く予定|予定である")


def section_lines(md: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    name = None
    for line in md.splitlines():
        if line.startswith("## "):
            name = line[3:].strip()
            out[name] = []
        elif name is not None:
            out[name].append(line)
    return out


def sections(md: str) -> dict[str, str]:
    return {k: "".join(l.strip() for l in v) for k, v in section_lines(md).items()}


def find(secs: dict, want: str):
    return next((k for k in secs if k.startswith(want)), None)


def pairs(spec: str) -> list[tuple[str, int]]:
    return [(k, int(v)) for k, v in (p.split("=") for p in filter(None, spec.split(",")))]


def table_rows(md: str) -> int:
    lines = [l.strip() for l in md.splitlines() if l.strip().startswith("|")]
    body = [l for l in lines if not re.fullmatch(r"\|[\s:|-]+\|", l)]
    # each table's first line is its header
    headers = sum(1 for i, l in enumerate(md.splitlines())
                  if l.strip().startswith("|") and (i == 0 or not md.splitlines()[i - 1].strip().startswith("|")))
    return len(body) - headers


def fetch_status(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (check_doc)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return str(r.status)
    except urllib.error.HTTPError as e:
        return str(e.code)
    except urllib.error.URLError as e:
        if isinstance(e.reason, socket.gaierror):
            return "error DNS"  # the host does not exist; asking again will not help
        return f"error {type(e.reason).__name__}"
    except Exception as e:  # refused connection, timeout
        return f"error {type(e).__name__}"


# Within one full-gate run many rows re-check the same URLs, which trips rate limits.
# full_gate.py points CHECK_DOC_URL_CACHE at a file; a URL that answered 2xx/3xx once in
# that run is not asked again. Rate limits and server errors are retried with a pause.
CACHE = os.environ.get("CHECK_DOC_URL_CACHE")
# other sites are opened only when a person asks (2026-11-07, owner); this machine's own test servers always are
ONLINE = os.environ.get("CHECK_DOC_ONLINE") == "1"
LOCAL = {"127.0.0.1", "localhost", "::1"}
RETRY_WAIT = float(os.environ.get("CHECK_DOC_RETRY_WAIT", "4"))
cache_lock = threading.Lock()


def url_status(url: str) -> str:
    """Return the HTTP status of url as a string, retrying 429 / 5xx / network errors twice."""
    if CACHE and os.path.exists(CACHE) and url in open(CACHE, encoding="utf-8").read().splitlines():
        return "200"
    for attempt in range(3):
        st = fetch_status(url)
        if not (st == "429" or st.startswith("5") or (st.startswith("error") and st != "error DNS")):
            break
        time.sleep(RETRY_WAIT * (attempt + 1))
    if CACHE and st[0] in "23" and st.isdigit():
        with cache_lock, open(CACHE, "a", encoding="utf-8") as f:
            f.write(url + "\n")
    return st


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--sections", default="")
    ap.add_argument("--min-links", type=int, default=0)
    ap.add_argument("--min-table-rows", type=int, default=0)
    ap.add_argument("--check-urls", action="store_true")
    ap.add_argument("--require-labels", default="")
    ap.add_argument("--blocked-ok", default="")
    ap.add_argument("--section-min-table-rows", default="")
    ap.add_argument("--section-min-links", default="")
    a = ap.parse_args()

    try:
        md = open(a.path, encoding="utf-8").read()
    except FileNotFoundError:
        print(f"DOC FAIL {a.path}: file not found")
        return 1

    bad: list[str] = []
    secs = sections(md)
    for want in filter(None, a.sections.split(",")):
        hit = find(secs, want)
        if hit is None:
            bad.append(f"missing section: ## {want}")
        elif len(secs[hit]) < 40:
            bad.append(f"section too thin (<40 chars): ## {hit}")
        elif len(set(secs[hit].replace(" ", ""))) < 8:
            bad.append(f"section is filler (<8 distinct chars): ## {hit}")
        elif PLACEHOLDER.search(secs[hit]):
            bad.append(f"section has an unfinished-work phrase ({PLACEHOLDER.search(secs[hit]).group()}): ## {hit}")
    links = set(URL.findall(md))
    if len(links) < a.min_links:
        bad.append(f"links {len(links)} < {a.min_links}")
    rows = table_rows(md)
    if rows < a.min_table_rows:
        bad.append(f"table rows {rows} < {a.min_table_rows}")

    raw = section_lines(md)
    for want, n in pairs(a.section_min_table_rows):
        hit = find(raw, want)
        got = table_rows("\n".join(raw[hit])) if hit else 0
        if got < n:
            bad.append(f"table rows in ## {want}: {got} < {n}")
    for want, n in pairs(a.section_min_links):
        hit = find(raw, want)
        got = len(set(URL.findall("\n".join(raw[hit])))) if hit else 0
        if got < n:
            bad.append(f"links in ## {want}: {got} < {n}")
    body = "\n".join(l for v in raw.values() for l in v)
    for label in filter(None, a.require_labels.split(",")):
        if label not in body:
            bad.append(f"label not used in any section: {label}")
    if a.check_urls:
        allowed = [h for h in a.blocked_ok.split(",") if h]
        opened = sorted(u for u in links if ONLINE or (urllib.parse.urlsplit(u).hostname or "") in LOCAL)
        left = len(links) - len(opened)
        if left:
            print(f"  {left} links outside this machine not opened (CHECK_DOC_ONLINE=1 opens them)")
        with ThreadPoolExecutor(8) as ex:
            for url, st in zip(opened, ex.map(url_status, opened)):
                host = urllib.parse.urlsplit(url).hostname or ""
                if st in ("401", "403", "429") and any(host == h or host.endswith("." + h) for h in allowed):
                    print(f"  blocked ({st}), not judged: {url}")
                elif st == "429":
                    # still 429 after the retries: the site refuses how often it is asked, which says nothing of the page
                    print(f"  rate limited (429), not judged: {url}")
                elif not (st[0] in "23" and st.isdigit()):
                    bad.append(f"url {st}: {url}")

    for b in bad:
        print(f"  {b}")
    status = "FAIL" if bad else "OK"
    print(f"DOC {status} {a.path} sections={len(secs)} links={len(links)} table_rows={rows}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
