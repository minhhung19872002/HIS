"""GET-that-writes sweep: read the API log of a SEQUENTIAL GET sweep and list the GET requests during which
EF executed an INSERT / UPDATE / DELETE / MERGE.

usage:
  1. run the API with request + EF command logging, e.g.
       Logging__LogLevel__Microsoft.AspNetCore.Hosting.Diagnostics=Information
       Logging__LogLevel__Microsoft.EntityFrameworkCore.Database.Command=Information
     and stdout redirected to api.log
  2. python getscan.py --base ... --threads 1          (one request at a time, so the log is ordered)
  3. python getwrite.py --log api.log [--ignore AuditLogs,PatientAccessLogs]

A GET that writes is re-run by browser prefetch, a refresh, a crawler or a load balancer health check —
a status advanced, a counter bumped, a token rotated, a row created per page view. Audit-trail inserts are
expected and ignored by default; anything else is listed with the first statement.
"""
import argparse
import collections
import re

ap = argparse.ArgumentParser()
ap.add_argument("--log", required=True)
ap.add_argument("--ignore", default="AuditLogs,PatientAccessLogs,PhiAccessLogs,LoginHistories,AccessLogs,RequestLogs,ApiCallLogs,UserSessions,RefreshTokens")
args = ap.parse_args()

ignore = [x.strip().lower() for x in args.ignore.split(",") if x.strip()]
REQ = re.compile(r"Request starting HTTP/\S+ (GET|POST|PUT|DELETE|PATCH) (\S+)")
WRITE = re.compile(r"^\s*(INSERT INTO|UPDATE|DELETE FROM|MERGE)\s+\[?([A-Za-z_]+)\]?", re.I)

cur = None
hits = collections.OrderedDict()
for line in open(args.log, encoding="utf-8", errors="replace"):
    m = REQ.search(line)
    if m:
        cur = (m.group(1), m.group(2).split("?")[0]) if m.group(1) == "GET" else None
        continue
    if not cur:
        continue
    w = WRITE.match(line) or (WRITE.search(line) if "Executed DbCommand" in line else None)
    if not w:
        # multi-line commands: statement is on the line after "Executed DbCommand"
        s = line.strip()
        w = WRITE.match(s)
    if w and w.group(2).lower() not in ignore:
        key = cur[1]
        hits.setdefault(key, []).append(f"{w.group(1).upper()} {w.group(2)}")

print("GET routes that wrote:", len(hits))
for route, stmts in hits.items():
    c = collections.Counter(stmts)
    print(f"{route}  ->  " + "; ".join(f"{s}×{n}" for s, n in c.most_common(5)))
