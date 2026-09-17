"""Write-permission matrix: send every POST/PUT/PATCH/DELETE as several low-privilege accounts.
usage: python writeauthz.py --base http://localhost:5107 --users lthung:123456,ddgiang:123456 [--out matrix.tsv]
The body is {} and path ids are zero-GUIDs, so nothing real is written. Authorization filters run BEFORE model
validation, so a 400/404/409 means the account got PAST the permission check — only 401/403 means "blocked".
Output TSV: verb, path, then one status per user. Triage: a route that a receptionist/nurse/lab tech reaches and
whose v2 page is gated by a FE route `permission` that role does not hold = the backend is missing the gate.
Routes matching writescan's RISKY list are skipped (they may act without a body).
"""
import argparse
import collections
import concurrent.futures
import re
from _common import load_swagger, login, req
from writescan_risky import RISKY as BASE_RISKY

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--users", required=True, help="user:password,user:password")
ap.add_argument("--swagger")
ap.add_argument("--out", default="writeauthz.tsv")
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/"]
# Same list as writescan.py (shared) — these may act even with an empty body.
RISKY = BASE_RISKY

users = [u.split(":", 1) for u in args.users.split(",")]
tokens = {u: login(args.base, u, p) for u, p in users}
spec = load_swagger(args.base, args.swagger)

targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if any(x in low for x in SKIP):
        continue
    segs = re.sub(r"\{[^}]+\}", "", low).replace("/api/", "/")
    if any(re.search(r"(^|[/\-_])" + re.escape(x) + r"($|[/\-_s])", segs) for x in RISKY):
        continue
    for verb in ("post", "put", "patch", "delete"):
        op = ops.get(verb)
        if not op:
            continue
        url = path
        for p in re.findall(r"\{([^}]+)\}", path):
            sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
            v = ZERO if sch.get("format") == "uuid" else ("0" if sch.get("type") in ("integer", "number") else "x")
            url = url.replace("{" + p + "}", v)
        has_body = bool(op.get("requestBody"))
        targets.append((verb.upper(), path, url, {} if has_body else None))


def run(t):
    verb, path, url, body = t
    row = [verb, path]
    for u, _ in users:
        st, _b = req(verb, args.base + url, body=body, token=tokens[u])
        row.append(str(st))
    return row


with concurrent.futures.ThreadPoolExecutor(6) as ex:
    rows = list(ex.map(run, targets))

with open(args.out, "w", encoding="utf-8", newline="\n") as f:
    f.write("verb\tpath\t" + "\t".join(u for u, _ in users) + "\n")
    for r in rows:
        f.write("\t".join(r) + "\n")

print("routes", len(rows))
for i, (u, _) in enumerate(users):
    c = collections.Counter("blocked" if r[2 + i] in ("401", "403") else ("5xx" if r[2 + i].startswith("5") and r[2 + i] != "501" else "reached")
                            for r in rows)
    print(u, dict(c))
print("5xx:", [r[:2] for r in rows if any((s.startswith("5") and s != "501") or s == "-1" for s in r[2:])][:40])
