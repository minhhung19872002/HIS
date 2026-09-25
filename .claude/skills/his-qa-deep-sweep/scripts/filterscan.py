"""Ignored-filter sweep: for every list GET, each query parameter whose name matches a field of the returned
rows is exercised with a real value and every returned row is checked against it.

usage: python filterscan.py --base http://localhost:5107 [--swagger swagger.json]

A status tab that shows every record, a department filter the backend never applies, a patientId filter that
returns other patients' rows — the page looks fine to the developer (some rows appear) and is wrong for the
user. Method: read the list unfiltered (page size 100), pick a field with >= 2 distinct values whose name equals
a declared query parameter (case-insensitive; `xxxId` also matches `xxx`), request with `param=<value1>`, and
report the rows whose field != value1 (IGNORED) or an empty result while the unfiltered list had matches
(EMPTY — usually an enum-name vs number mismatch or a wrong column).
"""
import argparse
import collections
import concurrent.futures
import json
import re
import urllib.parse

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--only")
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/", "search"]
NOT_FILTERS = {"page", "pagesize", "pageindex", "pagenumber", "limit", "take", "skip", "size", "sort", "sortby",
               "orderby", "keyword", "search", "q", "term", "fromdate", "todate", "startdate", "enddate", "date"}

token = login(args.base)
spec = load_swagger(args.base, args.swagger)


def unwrap(body):
    try:
        j = json.loads(body)
    except Exception:
        return None
    if isinstance(j, dict) and "data" in j and ("success" in j or "message" in j):
        j = j["data"]
    if isinstance(j, dict):
        for k in ("items", "data", "results", "records", "list", "rows"):
            if isinstance(j.get(k), list):
                return j[k]
        return None
    return j if isinstance(j, list) else None


def field_for(param, row):
    low = param.lower()
    for k in row:
        kl = k.lower()
        if kl == low or (low.endswith("id") and kl == low) or kl + "id" == low or kl == low + "id":
            return k
    return None


targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if "get" not in ops or any(s in low for s in SKIP) or (args.only and args.only not in low):
        continue
    op = ops["get"]
    params = [p for p in op.get("parameters", []) if p.get("in") == "query" and p["name"].lower() not in NOT_FILTERS]
    if not params:
        continue
    url = path
    for p in re.findall(r"\{([^}]+)\}", path):
        sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
        url = url.replace("{" + p + "}", ZERO if sch.get("format") == "uuid"
                          else ("1" if sch.get("type") in ("integer", "number") else "x"))
    size = next((p["name"] for p in op.get("parameters", []) if p["name"].lower() in ("pagesize", "limit", "take", "size")), None)
    targets.append((path, url, params, size))


def run(t):
    path, url, params, size = t
    sep = "&" if "?" in url else "?"
    base_url = f"{args.base}{url}" + (f"{sep}{size}=100" if size else "")
    st, b = req("GET", base_url, token=token)
    if st != 200:
        return []
    rows = unwrap(b)
    if not rows or not isinstance(rows[0], dict):
        return []
    out = []
    for prm in params:
        f = field_for(prm["name"], rows[0])
        if not f:
            continue
        vals = [r.get(f) for r in rows if r.get(f) not in (None, "", [])]
        distinct = [v for v in collections.Counter(json.dumps(v) for v in vals).most_common() if v[1] >= 1]
        if len(distinct) < 2:
            continue
        v = json.loads(distinct[0][0])
        if isinstance(v, (dict, list)):
            continue
        qv = urllib.parse.quote(str(v).lower() if isinstance(v, bool) else str(v), safe="")
        sep2 = "&" if "?" in base_url else "?"
        st2, b2 = req("GET", f"{base_url}{sep2}{prm['name']}={qv}", token=token)
        if st2 != 200:
            out.append((path, prm["name"], "ERROR", f"{st2} when filtering by {f}={v!r}"))
            continue
        frows = unwrap(b2) or []
        if not frows:
            out.append((path, prm["name"], "EMPTY", f"{f}={v!r} matched {distinct[0][1]} rows unfiltered, 0 filtered"))
            continue
        wrong = [r for r in frows if isinstance(r, dict) and r.get(f) != v]
        if wrong:
            out.append((path, prm["name"], "IGNORED", f"{len(wrong)}/{len(frows)} rows have {f} != {v!r} (e.g. {wrong[0].get(f)!r})"))
    return out


with concurrent.futures.ThreadPoolExecutor(6) as ex:
    res = [x for r in ex.map(run, targets) for x in r]
print("list endpoints", len(targets), "findings", collections.Counter(r[2] for r in res).most_common())
for path, prm, verdict, info in sorted(res, key=lambda r: (r[2], r[0])):
    print(f"{verdict:<8} GET {path} ?{prm}  {info}")
