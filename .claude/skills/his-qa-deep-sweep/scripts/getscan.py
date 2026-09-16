"""GET sweep: call every GET route (placeholder ids, or real ids via --ids JSON) and list 5xx/network errors.

usage: python getscan.py --base http://localhost:5107 [--ids ids.json] [--min-status 500]
ids.json maps path-parameter names to real values, e.g. {"patientId": "...", "admissionId": "..."};
with --ids only routes that use at least one mapped parameter are called.
"""
import argparse
import collections
import concurrent.futures
import datetime
import json
import re

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
# Production keeps /swagger behind auth, so point at a spec saved from the dev API to sweep prod read-only.
ap.add_argument("--swagger")
ap.add_argument("--ids")
ap.add_argument("--min-status", type=int, default=500)
args = ap.parse_args()

token = login(args.base)
spec = load_swagger(args.base, args.swagger)
real = json.load(open(args.ids)) if args.ids else {}
today = datetime.date.today()
defaults = {"fromdate": str(today - datetime.timedelta(days=30)), "todate": str(today),
            "startdate": str(today - datetime.timedelta(days=30)), "enddate": str(today), "date": str(today),
            "year": str(today.year), "month": str(today.month), "page": "1", "pagesize": "20", "pageindex": "1"}
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub"]

targets = []
for path, ops in spec["paths"].items():
    if "get" not in ops or any(s in path.lower() for s in SKIP):
        continue
    op, url, hit = ops["get"], path, False
    for p in re.findall(r"\{([^}]+)\}", path):
        sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
        if p in real:
            v, hit = real[p], True
        else:
            v = "00000000-0000-0000-0000-000000000000" if sch.get("format") == "uuid" else ("1" if sch.get("type") in ("integer", "number") else "x")
        url = url.replace("{" + p + "}", v)
    q = [f"{x['name']}={defaults[x['name'].lower()]}" for x in op.get("parameters", [])
         if x.get("in") == "query" and x["name"].lower() in defaults]
    if q:
        url += "?" + "&".join(q)
    if real and not hit:
        continue
    targets.append((path, url))


def run(t):
    st, b = req("GET", args.base + t[1], token=token)
    return t[0], st, b[:300].decode("utf-8", "replace")


with concurrent.futures.ThreadPoolExecutor(8) as ex:
    res = list(ex.map(run, targets))
print("total", len(res), collections.Counter(r[1] for r in res).most_common())
for p, st, b in res:
    if st == -1 or st >= args.min_status:
        print(st, p, b[:200])
