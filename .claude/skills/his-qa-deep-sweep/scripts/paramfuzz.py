"""Query-parameter fuzz: call every GET again with hostile values for its declared query parameters.

usage: python paramfuzz.py --base http://localhost:5107 [--swagger swagger.json]

The GET sweep only ever sends sensible values, so it never reaches the code that trusts them. This sends
a negative page, a page size of 100000, a page number past any data, a reversed date range, a very long
string, and text where a number is expected. Anything that answers 5xx is unhandled; a page size that is
honoured instead of clamped is a resource-exhaustion path worth reporting even at 200.
"""
import argparse
import collections
import urllib.parse
import concurrent.futures
import re

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/"]

# name fragment → hostile values for that parameter
HOSTILE = {
    "page": ["-1", "0", "999999999"],
    "pagesize": ["-5", "0", "100000"],
    "pageindex": ["-1", "999999999"],
    "limit": ["-1", "100000"],
    "top": ["-1", "100000"],
    "skip": ["-1"],
    "year": ["0", "99999", "abc"],
    "month": ["0", "13", "abc"],
    "keyword": ["%" * 300, "' OR 1=1--", "<script>x</script>"],
    "search": ["%" * 300, "' OR 1=1--"],
    "code": ["%" * 300],
    "fromdate": ["2099-01-01", "not-a-date"],
    "todate": ["1900-01-01", "not-a-date"],
    "startdate": ["2099-01-01"],
    "enddate": ["1900-01-01"],
}

token = login(args.base)
spec = load_swagger(args.base, args.swagger)

targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if "get" not in ops or any(s in low for s in SKIP):
        continue
    op = ops["get"]
    url = path
    for p in re.findall(r"\{([^}]+)\}", path):
        sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
        url = url.replace("{" + p + "}", ZERO if sch.get("format") == "uuid"
                          else ("1" if sch.get("type") in ("integer", "number") else "x"))
    for prm in op.get("parameters", []):
        if prm.get("in") != "query":
            continue
        name = prm["name"]
        for frag, values in HOSTILE.items():
            if frag != name.lower() and frag not in name.lower():
                continue
            for v in values:
                targets.append((path, f"{url}?{name}={urllib.parse.quote(v, safe='')}", name, v))
            break


def run(t):
    path, url, name, value = t
    st, b = req("GET", args.base + url, token=token)
    return path, name, value, st, b[:200].decode("utf-8", "replace").replace("\n", " ")


with concurrent.futures.ThreadPoolExecutor(8) as ex:
    res = list(ex.map(run, targets))

print("total", len(res), collections.Counter(r[3] for r in res).most_common())
print("\n== 5xx / network (unhandled) ==")
for path, name, value, st, body in res:
    if st == -1 or st >= 500:
        print(f"{st} GET {path} [{name}={value[:30]}] {body[:160]}")
