"""Paging-stability sweep: every paged GET is read as page 1 + page 2 (small page) and once as one big page,
then the id sets are compared.

usage: python pagescan.py --base http://localhost:5107 [--swagger swagger.json] [--size 5]

A list that is paged with Skip/Take but no OrderBy is non-deterministic on SQL Server: the same row shows up
on two pages while another never shows at all — the user scrolls a list that silently loses rows. Verdicts:
  DUP      a row id appears on both page 1 and page 2
  MISSING  page1 ∪ page2 (size N each) != the first 2N rows of the one-big-page read (ordering unstable)
  TOTAL    totalCount says less than the rows actually returned (or page 2 non-empty when total <= size)
Only endpoints that declare a page/pageSize-like query parameter and answer with an items array are judged.
"""
import argparse
import collections
import concurrent.futures
import json
import re

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--size", type=int, default=5)
ap.add_argument("--only")
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/"]
PAGE_NAMES = {"page", "pageindex", "pagenumber"}
SIZE_NAMES = {"pagesize", "limit", "take", "size"}

token = login(args.base)
spec = load_swagger(args.base, args.swagger)


def unwrap(body):
    try:
        j = json.loads(body)
    except Exception:
        return None, None
    if isinstance(j, dict) and "data" in j and ("success" in j or "message" in j):
        j = j["data"]
    total = None
    if isinstance(j, dict):
        for k in ("totalCount", "total", "totalItems", "count", "totalRecords"):
            if isinstance(j.get(k), int):
                total = j[k]
                break
        for k in ("items", "data", "results", "records", "list", "rows"):
            if isinstance(j.get(k), list):
                return j[k], total
        return None, total
    if isinstance(j, list):
        return j, total
    return None, None


def row_key(r):
    if not isinstance(r, dict):
        return json.dumps(r, sort_keys=True)
    for k in ("id", "Id", "code", "key"):
        if k in r and r[k] is not None:
            return str(r[k])
    return json.dumps(r, sort_keys=True)[:300]


targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if "get" not in ops or any(s in low for s in SKIP) or (args.only and args.only not in low):
        continue
    op = ops["get"]
    params = [p for p in op.get("parameters", []) if p.get("in") == "query"]
    page = next((p["name"] for p in params if p["name"].lower() in PAGE_NAMES), None)
    size = next((p["name"] for p in params if p["name"].lower() in SIZE_NAMES), None)
    if not page or not size:
        continue
    url = path
    for p in re.findall(r"\{([^}]+)\}", path):
        sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
        url = url.replace("{" + p + "}", ZERO if sch.get("format") == "uuid"
                          else ("1" if sch.get("type") in ("integer", "number") else "x"))
    targets.append((path, url, page, size))


def run(t):
    path, url, page, size = t
    n = args.size
    sep = "&" if "?" in url else "?"
    # PageIndex is 0-based in most services but 1-based (0 clamped to 1) in others: if index 0 and 1 return the
    # same rows the endpoint is 1-based.
    first = 1
    if True:  # page/pageIndex base differs per service: detect it
        _, z0 = req("GET", f"{args.base}{url}{sep}{page}=0&{size}={n}", token=token)
        _, z1 = req("GET", f"{args.base}{url}{sep}{page}=1&{size}={n}", token=token)
        r0, r1 = unwrap(z0)[0] or [], unwrap(z1)[0] or []
        first = 1 if [row_key(r) for r in r0] == [row_key(r) for r in r1] else 0
    st1, b1 = req("GET", f"{args.base}{url}{sep}{page}={first}&{size}={n}", token=token)
    if st1 != 200:
        return path, "skip", f"status {st1}"
    p1, total = unwrap(b1)
    if p1 is None:
        return path, "skip", "no items array"
    if len(p1) < n:
        return path, "ok", f"{len(p1)} rows (single page)"
    _, b2 = req("GET", f"{args.base}{url}{sep}{page}={first + 1}&{size}={n}", token=token)
    p2, _ = unwrap(b2)
    _, bb = req("GET", f"{args.base}{url}{sep}{page}={first}&{size}={2 * n}", token=token)
    big, _ = unwrap(bb)
    p2, big = p2 or [], big or []
    k1, k2, kb = [row_key(r) for r in p1], [row_key(r) for r in p2], [row_key(r) for r in big]
    dup = set(k1) & set(k2)
    if dup:
        return path, "DUP", f"{len(dup)} ids on both pages (total={total})"
    if total is not None and total <= n and p2:
        return path, "TOTAL", f"total={total} but page 2 has {len(p2)} rows"
    if len(big) == len(k1) + len(k2) and set(k1 + k2) != set(kb):
        return path, "MISSING", f"page1∪page2 != top {2 * n}: {len(set(kb) - set(k1 + k2))} rows differ (total={total})"
    return path, "ok", f"total={total}"


with concurrent.futures.ThreadPoolExecutor(6) as ex:
    res = list(ex.map(run, targets))
print("paged endpoints", len(res), collections.Counter(r[1] for r in res).most_common())
for path, verdict, info in sorted(res, key=lambda r: r[1]):
    if verdict not in ("ok", "skip"):
        print(f"{verdict:<8} {path}  {info}")
