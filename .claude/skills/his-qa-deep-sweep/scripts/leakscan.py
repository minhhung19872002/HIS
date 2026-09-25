"""Error-body leak sweep: call every GET with malformed path/query values and every write with a wrong-typed
body, then grep the response bodies (whatever the status) for stack traces, SQL text, file paths, connection
strings and internal type names.

usage: python leakscan.py --base http://localhost:5107 [--swagger swagger.json] [--verbs get,post]

Prod returns these to any logged-in user: a 400 that echoes `System.InvalidOperationException ... at
HIS.Infrastructure.Services.X.Y() in D:\\...` tells an attacker the code layout, a 500 with the SQL statement
tells them the schema. Anything matching MARKERS is listed once per route with the marker and a snippet.
"""
import argparse
import collections
import concurrent.futures
import re

from _common import load_swagger, login, req
from writescan_risky import RISKY, is_forbidden

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--verbs", default="get,post,put")
args = ap.parse_args()

SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/",
        "digital-signature", "webauthn", "signing", "signature"]
MARKERS = [r"\bat HIS\.", r"HIS\.(Infrastructure|Application|API|Core)\.", r"Microsoft\.Data\.SqlClient", r"\bSqlException\b",
           r"[A-Z]:\\[^\"\s]+\.cs", r"/app/[^\"\s]+\.cs", r"\bline \d+\b", r"Server=.*Password=", r"\bSELECT\b.*\bFROM\b",
           r"\bINSERT INTO\b", r"Invalid column name", r"Cannot insert", r"FOREIGN KEY constraint", r"Violation of (PRIMARY|UNIQUE) KEY",
           r"System\.\w+Exception", r"StackTrace", r"innerException", r"Npgsql", r"StackExchange\.Redis"]
MRX = [re.compile(m) for m in MARKERS]

token = login(args.base)
spec = load_swagger(args.base, args.swagger)
verbs = [v.strip() for v in args.verbs.split(",")]

targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if any(s in low for s in SKIP):
        continue
    for verb in verbs:
        if verb not in ops or (verb != "get" and (is_forbidden(low) or any(r in low for r in RISKY))):
            continue
        op = ops[verb]
        url = path
        for p in re.findall(r"\{([^}]+)\}", path):
            url = url.replace("{" + p + "}", "not-a-guid")
        qs = [f"{p['name']}=%27%3B--" for p in op.get("parameters", []) if p.get("in") == "query"][:3]
        if qs:
            url += "?" + "&".join(qs)
        bodies = [None] if verb == "get" else [{"id": "x", "amount": "abc", "date": "31/31/2020", "quantity": -1, "items": "nope"}, [1, 2], "str"]
        for b in bodies:
            targets.append((verb.upper(), path, url, b))


def run(t):
    verb, path, url, body = t
    st, b = req(verb, args.base + url, body=body, token=token)
    text = b[:4000].decode("utf-8", "replace")
    for rx in MRX:
        m = rx.search(text)
        if m:
            i = max(0, m.start() - 40)
            return verb, path, st, rx.pattern, text[i:i + 160].replace("\n", " ")
    return None


with concurrent.futures.ThreadPoolExecutor(8) as ex:
    res = [r for r in ex.map(run, targets) if r]
seen = {}
for verb, path, st, pat, snip in res:
    seen.setdefault((verb, path), (st, pat, snip))
print("calls", len(targets), "leaking routes", len(seen), collections.Counter(v[1] for v in seen.values()).most_common(6))
for (verb, path), (st, pat, snip) in sorted(seen.items()):
    print(f"{st} {verb} {path}  [{pat}]  {snip}")
