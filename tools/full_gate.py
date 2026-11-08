#!/usr/bin/env python3
"""Full gate: run before every push (from .githooks/pre-push).

Checks Tasks.lock.json, then re-runs the gate command of every row whose `passes`
is true, so a later change cannot silently break an earlier finished row.
A gate is the first `backticked` command in the row's `gate` field; its exit code
is the verdict.

The tree does not change during the run, so the build and each component suite run once per
clock and time zone and are replayed for later rows (CW_GATE_CACHE, see tools/test_components.mjs).
Rows run four at a time, except the ones that time things (SOLO), which run alone at the end.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

# one URL cache per run, so rows that cite the same pages do not hammer the same hosts
os.environ["CHECK_DOC_URL_CACHE"] = tempfile.mkstemp(prefix="check_doc_urls_")[1]
os.environ["CW_GATE_CACHE"] = tempfile.mkdtemp(prefix="cw_gate_")
# rows whose gate repeats a suite on purpose, to catch a result that changes from run to run
FRESH = {"T077"}

# FULL_GATE_LOCK lets tools/test_parallel.sh run the full gate on a small lock of its own
LOCK = os.environ.get("FULL_GATE_LOCK", "Tasks.lock.json")
lock = subprocess.run([sys.executable, "tools/check_tasks_lock.py"])
failed = ["Tasks.lock.json"] if lock.returncode else []

rows = {rid: row for rid, row in json.load(open(LOCK, encoding="utf-8"))["rows"].items() if row.get("passes")}
gates = {rid: re.search(r"`([^`]+)`", row["gate"]).group(1) for rid, row in rows.items()}

# A row whose files are as they were when it last passed is skipped. Its files are the paths its gate names, the
# paths named inside the tools it runs, and, for a gate that builds or runs component suites, everything a page loads.
# The setup check (push state) always runs; FULL_GATE_ALL=1 runs every row. The record is per clone (.git).
STATE = os.environ.get("FULL_GATE_STATE", ".git/cw_full_gate.json")
# everything printed also goes to a log beside the record, to see afterwards which rows took the time
_log = open(STATE.rsplit(".", 1)[0] + ".log", "w", encoding="utf-8")
_print = print


def print(*a, **k):  # noqa: A001
    _print(*a, **k, flush=True)
    _print(*a, **k, file=_log, flush=True)


PATH = re.compile(r"(?<![\w./-])((?:docs|tools|src|demo|themes|integrations|prototype)/[\w./-]*[\w-]|[A-Z][\w-]*\.(?:md|json))")
BROAD = re.compile(r"test_components\.mjs|npm run build|perf\.mjs|check_theme_tokens")
BROAD_FILES = ["src", "demo", "themes", "integrations", "tools/tests", "tools/test_components.mjs", "tools/build.mjs", "package.json"]
ALWAYS = re.compile(r"tools/check_setup\.sh")


# the queue files change with every commit: they count only when the gate itself names them
QUEUE = {"Tasks.md", "Tasks.lock.json", "Tasks-archive.md"}


def files_of(cmd):
    """The paths the gate names, and the paths named inside the tools it names (two steps, not further)."""
    found, step = set(), [(cmd, 0)] + [(d, 1) for d in (BROAD_FILES if BROAD.search(cmd) else [])]
    while step:
        text, depth = step.pop()
        for p in [text] if text in BROAD_FILES else PATH.findall(text):
            if depth > 0 and p in QUEUE:
                continue
            paths = [os.path.join(d, f) for d, _, fs in os.walk(p) for f in fs] if os.path.isdir(p) else [p]
            for f in paths:
                if os.path.isfile(f) and f not in found:
                    found.add(f)
                    if depth == 0 and f.startswith("tools/") and not f.startswith("tools/tests/"):
                        step.append((open(f, encoding="utf-8", errors="replace").read(), 1))
    return found


def fingerprint(cmd):
    h = hashlib.sha1(cmd.encode())
    for f in sorted(files_of(cmd)):
        h.update(f.encode() + b"\0" + open(f, "rb").read())
    return h.hexdigest()


try:
    passed = json.load(open(STATE, encoding="utf-8"))
except (OSError, ValueError):
    passed = {}
prints = {rid: fingerprint(cmd) for rid, cmd in gates.items()}
skipped = [] if os.environ.get("FULL_GATE_ALL") else [
    rid for rid, cmd in gates.items() if not ALWAYS.search(cmd) and passed.get(rid) == prints[rid]]
for rid in skipped:
    del gates[rid]

# build once and run, side by side, every suite a row names with the default clock, so the rows mostly replay
start = time.time()
# a run with its own TZ or CW_FAKE_TIME is a different cache entry, so it is left to its row
named = sorted({n for rid, cmd in gates.items() if rid not in FRESH
                for m in re.finditer(r"(?:^|[;&|(])([^;&|(]*?)node tools/test_components\.mjs ((?:[\w-]+ ?)+)", cmd)
                if not re.search(r"\b(TZ|CW_FAKE_TIME)=", m.group(1)) for n in m.group(2).split()})
print("     start: " + " ".join(named))
if named:
    subprocess.run("npm run build >/dev/null && CW_JOBS=8 CW_CACHE_PASS_ONLY=1 node tools/test_components.mjs " + " ".join(named) + " >/dev/null", shell=True)
print(f"     start took {time.time() - start:5.1f}s")

# rows that time things, rebuild dist or add files to demo/ run alone, after the others; the others run four at a time.
# They are told by what their gate runs, so a new row of that kind is not missed.
# check_doc_selftest.sh opens real sites: run one at a time, so the shared URL record spares them repeat visits (429)
ALONE = re.compile(r"test_gate_cache\.sh|test_parallel\.sh|test_virtual_time\.sh|perf\.mjs|rm -rf dist|date \+%s|xargs -P|check_doc_selftest\.sh")
SOLO = {"T047", "T077"} | {rid for rid, cmd in gates.items() if ALONE.search(cmd)}


def run(rid):
    env = {k: v for k, v in os.environ.items() if not (rid in FRESH and k == "CW_GATE_CACHE")}
    t = time.time()
    r = subprocess.run(gates[rid], shell=True, capture_output=True, text=True, env=env)
    return rid, r, time.time() - t


with ThreadPoolExecutor(4) as pool:
    done = dict(pool.map(lambda rid: (rid, run(rid)), [rid for rid in gates if rid not in SOLO]))
done.update({rid: run(rid) for rid in gates if rid in SOLO})
for rid in rows:
    if rid in skipped:
        print(f"skip {rid}  (its files are as they were when it last passed)")
        continue
    _, r, took = done[rid]
    print(f"{'ok  ' if r.returncode == 0 else 'FAIL'} {rid} {took:5.1f}s  {gates[rid]}")
    if r.returncode:
        print((r.stdout + r.stderr).strip())
        failed.append(rid)
        passed.pop(rid, None)
    else:
        passed[rid] = prints[rid]
json.dump(passed, open(STATE, "w", encoding="utf-8"), indent=0, sort_keys=True)

os.unlink(os.environ["CHECK_DOC_URL_CACHE"])
shutil.rmtree(os.environ["CW_GATE_CACHE"])
print(f"took {time.time() - start:.0f}s")
print(f"FULL_GATE {'FAIL ' + ','.join(failed) if failed else 'OK'}")
sys.exit(1 if failed else 0)
