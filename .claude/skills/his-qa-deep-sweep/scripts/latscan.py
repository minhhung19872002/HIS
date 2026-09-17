"""Latency/size sweep: time every GET once (sequentially, so timings are not queueing noise) and list slow or huge ones.
usage: python latscan.py --base http://localhost:5107 [--swagger swagger.json] [--slow 2.0] [--big 2000000]
Sequential on purpose: a parallel sweep measures the thread pool, not the endpoint. Slow (> --slow seconds) usually
means an unbounded query, N+1, or a missing index; big (> --big bytes) means a list without paging — both hurt on
the small prod RDS instance. Default query values are the same as getscan.py.
"""
import argparse
import datetime
import re
import time

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--slow", type=float, default=2.0)
ap.add_argument("--big", type=int, default=2_000_000)
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/", "health"]
token = login(args.base)
spec = load_swagger(args.base, args.swagger)
today = datetime.date.today()
defaults = {"fromdate": str(today - datetime.timedelta(days=30)), "todate": str(today),
            "startdate": str(today - datetime.timedelta(days=30)), "enddate": str(today), "date": str(today),
            "year": str(today.year), "month": str(today.month), "page": "1", "pagesize": "20", "pageindex": "1"}

rows = []
for path, ops in spec["paths"].items():
    op = ops.get("get")
    if not op or any(x in path.lower() for x in SKIP):
        continue
    url, qs = path, []
    for p in op.get("parameters", []):
        sch = p.get("schema", {})
        if p["in"] == "path":
            v = ZERO if sch.get("format") == "uuid" else ("1" if sch.get("type") in ("integer", "number") else "x")
            url = url.replace("{" + p["name"] + "}", v)
        elif p["in"] == "query" and p["name"].lower() in defaults:
            qs.append(f"{p['name']}={defaults[p['name'].lower()]}")
    full = args.base + url + ("?" + "&".join(qs) if qs else "")
    t0 = time.perf_counter()
    st, body = req("GET", full, token=token, timeout=120)
    dt = time.perf_counter() - t0
    rows.append((dt, len(body), st, url + ("?" + "&".join(qs) if qs else "")))

rows.sort(reverse=True)
print("calls", len(rows), "total s", round(sum(r[0] for r in rows), 1))
print("\n== slow ==")
for dt, n, st, u in rows:
    if dt >= args.slow:
        print(f"{dt:6.2f}s {n:>9}B {st} {u}")
print("\n== big ==")
for dt, n, st, u in sorted(rows, key=lambda r: -r[1]):
    if n >= args.big:
        print(f"{dt:6.2f}s {n:>9}B {st} {u}")
