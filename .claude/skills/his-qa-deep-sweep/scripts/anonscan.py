"""Anonymous-access sweep: call every route WITHOUT a token and list anything that is not 401/403.

usage: python anonscan.py --base http://localhost:5107 [--verbs get] [--user u --password p]
With --user/--password it instead logs in as that (low-privilege) account and lists 2xx routes, so you can
diff what a nurse/receptionist can reach against what the role should see (PHI / admin / money endpoints).
Only GET is called by default (safe); other verbs are sent with {} and are listed when they are NOT 401/403/400.
"""
import argparse
import collections
import concurrent.futures
import re

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--verbs", default="get")
# Production keeps /swagger behind auth — point at a spec saved from the dev API to sweep prod.
ap.add_argument("--swagger")
ap.add_argument("--user")
ap.add_argument("--password")
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "seed", "populate"]
verbs = [v.strip().lower() for v in args.verbs.split(",")]
token = login(args.base, args.user, args.password) if args.user else None
spec = load_swagger(args.base, args.swagger)

targets = []
for path, ops in spec["paths"].items():
    if any(s in path.lower() for s in SKIP):
        continue
    for verb in verbs:
        op = ops.get(verb)
        if not op:
            continue
        url = path
        for p in re.findall(r"\{([^}]+)\}", path):
            sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
            url = url.replace("{" + p + "}", ZERO if sch.get("format") == "uuid" else ("1" if sch.get("type") in ("integer", "number") else "x"))
        targets.append((verb.upper(), path, url))


def run(t):
    verb, path, url = t
    st, b = req(verb, args.base + url, body=({} if verb != "GET" else None), token=token)
    return verb, path, st, b[:160].decode("utf-8", "replace").replace("\n", " ")


with concurrent.futures.ThreadPoolExecutor(8) as ex:
    res = list(ex.map(run, targets))
print("total", len(res), collections.Counter(r[2] for r in res).most_common())
mode = f"as {args.user}" if args.user else "anonymous"
print(f"\n== reachable {mode} (not 401/403" + ("" if token else "") + ") ==")
for verb, path, st, b in res:
    if st not in (401, 403) and not (verb != "GET" and st == 400):
        print(st, verb, path, b[:120])
