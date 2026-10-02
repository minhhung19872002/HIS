"""Audit-trail completeness (Decree 13 / TT46): which 2xx write routes leave NO AuditLogs row naming the record.

usage: HIS_SQL_PASSWORD=... python auditscan.py --base http://localhost:5107 [--swagger swagger.json]
                            [--only substr] [--container his-sqlserver] [--db HIS] [--gap 0.15] [--out auditscan.txt]

Sequential (one request at a time). Every request carries its own User-Agent "auditscan-<run>-<n>", which
AuditLogMiddleware copies into AuditLogs.UserAgent, so its middleware row is matched exactly. Rows written
without a UA (AuditFieldDiffInterceptor "FieldDiff", service-level IAuditLogService.LogAsync) are matched by
time: the row belongs to the last request that started before it (approximate — other sessions as the same
user add noise, so run it while nobody else writes as that user).
Bodies = writescan.py's schema-minimal set ("" / 0 / false / zero-GUID / today / [] / first enum), path params
zero-GUID — so it never edits a real record. RISKY / FORBIDDEN routes (writescan_risky.py) are never called;
replace-all collection routes (REPLACE_ALL / top-level array body) are skipped unless --include-replace.
HIS_TOKEN=<jwt> reuses a session (admin is single-session).

Per 2xx write it reports: middleware row? · any row carrying an entity id? · FieldDiff/service row?
  NO-ROW        nothing at all (middleware skipped or the audit channel dropped it) — always a bug
  NO-ENTITY-ID  rows exist but none names the record (typical POST create: path has no GUID) — "who created
                patient X" cannot be answered from the audit trail
Sensitivity from the path: patient/exam/prescription/receipt/invoice/refund/user/role/permission/config/
dispense/blood/result(+ a few synonyms) = SENSITIVE.
Needs: docker + the SQL container; password from HIS_SQL_PASSWORD (never hard-code it). Rows the 2xx calls
created are listed by the scan window printed at the end — clean them up by CreatedAt within it.
"""
import argparse
import collections
import datetime
import json
import os
import re
import subprocess
import time
import uuid

from _common import load_swagger, login, req
from writescan_risky import RISKY, is_forbidden, is_no_fuzz, is_replace_all

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--only", help="substring filter on path")
ap.add_argument("--container", default="his-sqlserver")
ap.add_argument("--db", default="HIS")
ap.add_argument("--gap", type=float, default=0.15, help="seconds between requests (keeps time-matching sane)")
ap.add_argument("--settle", type=float, default=4.0, help="seconds to wait for AuditWriterWorker to drain")
ap.add_argument("--out")
ap.add_argument("--include-replace", action="store_true",
                help="also call replace-all collection routes (writescan_risky.REPLACE_ALL / top-level array body)")
args = ap.parse_args()

SQL_PW = os.environ.get("HIS_SQL_PASSWORD")
if not SQL_PW:
    raise SystemExit("set HIS_SQL_PASSWORD (sa password of the SQL container)")
ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger"]
SENSITIVE = ["patient", "exam", "prescription", "receipt", "invoice", "refund", "user", "role", "permission",
             "config", "dispense", "blood", "result", "emr", "medical-record", "admission", "discharge",
             "billing", "payment", "deposit", "insurance", "diagnos", "lab", "radiology", "surgery", "transfusion"]
RUN = uuid.uuid4().hex[:8]


def sql(q):
    """Run a query in the container; → list of rows (list of str), '|' separated, no headers."""
    cmd = ["docker", "exec", args.container, "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa",
           "-P", SQL_PW, "-C", "-d", args.db, "-W", "-h", "-1", "-s", "|", "-Q", "SET NOCOUNT ON; " + q]
    env = dict(os.environ, MSYS_NO_PATHCONV="1")
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    if out.returncode != 0:
        raise SystemExit("sqlcmd failed: " + (out.stderr or out.stdout)[:300])
    return [l.split("|") for l in out.stdout.splitlines() if l.strip()]


token = os.environ.get("HIS_TOKEN") or login(args.base)
spec = load_swagger(args.base, args.swagger)
schemas = spec.get("components", {}).get("schemas", {})
today = datetime.datetime.now().replace(microsecond=0).isoformat()


def resolve(s):
    while s and "$ref" in s:
        s = schemas.get(s["$ref"].split("/")[-1], {})
    return s or {}


def gen(s, depth=0):  # identical to writescan.gen
    s = resolve(s)
    if "enum" in s and s["enum"]:
        return s["enum"][0]
    t, f = s.get("type"), s.get("format")
    if t == "string":
        return ZERO if f == "uuid" else today if f == "date-time" else today[:10] if f == "date" else ""
    if t in ("integer", "number"):
        return 0
    if t == "boolean":
        return False
    if t == "array":
        return []
    if t == "object" or "properties" in s:
        return {} if depth > 2 else {k: gen(v, depth + 1) for k, v in s.get("properties", {}).items()}
    if "allOf" in s:
        out = {}
        for part in s["allOf"]:
            g = gen(part, depth)
            if isinstance(g, dict):
                out.update(g)
        return out
    return None


targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if any(x in low for x in SKIP) or is_forbidden(low) or is_no_fuzz(low) or not low.startswith("/api/"):
        continue
    if args.only and args.only.lower() not in low:
        continue
    segs = re.sub(r"\{[^}]+\}", "", low).replace("/api/", "/")
    if any(re.search(r"(^|[/\-_])" + re.escape(x) + r"($|[/\-_s])", segs) for x in RISKY):
        continue
    for verb in ("post", "put", "patch", "delete"):
        op = ops.get(verb)
        if not op:
            continue
        content = op.get("requestBody", {}).get("content", {}) or {}
        if "multipart/form-data" in content:
            continue
        url = path
        for p in re.findall(r"\{([^}]+)\}", path):
            sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
            url = url.replace("{" + p + "}", ZERO if sch.get("format") == "uuid"
                              else ("0" if sch.get("type") in ("integer", "number") else "x"))
        js = (content.get("application/json") or {}).get("schema")
        if not args.include_replace and verb != "delete" and is_replace_all(path, resolve(js) if js else None):
            continue  # [] on a replace-all route without a path id wipes a global list
        targets.append((verb.upper(), path, url, gen(js) if js else None))

me = sql("SELECT CAST(Id AS NVARCHAR(36)) FROM Users WHERE Username = '%s'"
         % os.environ.get("HIS_USER", "admin").replace("'", "''"))
my_id = me[0][0].lower() if me else ""
before = sql("SELECT COUNT(*) FROM AuditLogs")[0][0]
start = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
print(f"run {RUN}: {len(targets)} write calls, AuditLogs before = {before}")

calls = []
for n, (verb, path, url, body) in enumerate(targets):
    t0 = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    st, b = req(verb, args.base + url, body=body, token=token, headers={"User-Agent": f"auditscan-{RUN}-{n}"})
    rid = None
    if 200 <= st < 300:
        m = re.search(rb'"id"\s*:\s*"([0-9a-fA-F-]{36})"', b[:600])
        rid = m.group(1).decode().lower() if m else None
    calls.append(dict(n=n, verb=verb, path=path, status=st, t0=t0, rid=rid))
    if st == 401:  # admin is single-session: another tool logged in → stop instead of scanning with no auth
        print("401 — session was taken over; re-run with a fresh HIS_TOKEN")
        break
    time.sleep(args.gap)
time.sleep(args.settle)
end = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
after = sql("SELECT COUNT(*) FROM AuditLogs")[0][0]

fmt = "%Y-%m-%d %H:%M:%S.%f"
rows = sql("SELECT ISNULL(UserAgent,''), ISNULL(Module,''), ISNULL(Action,''), ISNULL(EntityId,''), "
           "CAST(RecordId AS NVARCHAR(36)), CONVERT(VARCHAR(30), CreatedAt, 121), ISNULL(CAST(UserId AS NVARCHAR(36)),'') "
           f"FROM AuditLogs WHERE CreatedAt >= '{start:%Y-%m-%d %H:%M:%S}' ORDER BY CreatedAt")
by_call = collections.defaultdict(list)
t0s = [c["t0"] for c in calls]
for ua, module, action, eid, recid, created, uid in rows:
    m = re.match(rf"auditscan-{RUN}-(\d+)$", ua)
    if m:
        by_call[int(m.group(1))].append(("mw", module, action, eid, recid))
        continue
    if ua.startswith("auditscan-") or (my_id and uid.lower() != my_id):
        continue  # another run, or another user's activity
    ts = datetime.datetime.strptime(created[:26].ljust(26, "0"), fmt)
    idx = max((i for i, t in enumerate(t0s) if t <= ts), default=None)
    if idx is not None:
        by_call[calls[idx]["n"]].append(("svc", module, action, eid, recid))


def has_entity(r):
    _, _, _, eid, recid = r
    return bool(re.match(r"^[0-9a-fA-F-]{36}$", eid or "")) and eid != ZERO or (recid and recid.lower() != ZERO)


result = []
for c in calls:
    if not (200 <= c["status"] < 300):
        continue
    rs = by_call.get(c["n"], [])
    mw = [r for r in rs if r[0] == "mw"]
    svc = [r for r in rs if r[0] == "svc"]
    ent = [r for r in rs if has_entity(r)]
    names_new = c["rid"] and any(c["rid"] in (r[3] or "").lower() or c["rid"] == (r[4] or "").lower() for r in rs)
    verdict = "NO-ROW" if not rs else ("OK" if ent or names_new else "NO-ENTITY-ID")
    if verdict == "NO-ENTITY-ID" and "{" in c["path"] and not c["rid"]:
        # the path id was the zero GUID: the middleware row does carry it — the 2xx on a non-existent id is
        # writescan.py's class (silent accept), not an audit gap
        verdict = "ZERO-ID-PATH"
    sens = "SENSITIVE" if any(k in c["path"].lower() for k in SENSITIVE) else "other"
    result.append(dict(c, mw=len(mw), svc=len(svc), verdict=verdict, sens=sens,
                       svc_modules=sorted({r[1] for r in svc})))

out = []
P = out.append
P(f"auditscan run {RUN}  {start:%Y-%m-%d %H:%M:%S}Z → {end:%H:%M:%S}Z  base={args.base}")
P(f"write calls: {len(calls)}  status: {collections.Counter(c['status'] for c in calls).most_common()}")
P(f"AuditLogs rows: before={before} after={after}  (+{int(after) - int(before)}; includes other sessions)")
P(f"middleware rows matched by UA: {sum(1 for c in calls if any(r[0] == 'mw' for r in by_call.get(c['n'], [])))}"
  f" of {len(calls)} calls (every /api write — 4xx included — should have one)")
P(f"2xx writes: {len(result)}   verdicts: {collections.Counter((r['verdict'], r['sens']) for r in result).most_common()}")
nomw = [c for c in calls if not any(r[0] == "mw" for r in by_call.get(c["n"], []))]
if nomw:
    P("\n== calls with NO middleware row (any status) — middleware skipped / channel dropped ==")
    for c in nomw:
        P(f"{c['status']} {c['verb']} {c['path']}")
for verdict in ("NO-ROW", "NO-ENTITY-ID"):
    for sens in ("SENSITIVE", "other"):
        rs = [r for r in result if r["verdict"] == verdict and r["sens"] == sens]
        if not rs:
            continue
        P(f"\n== {verdict} · {sens}: {len(rs)} ==")
        for r in rs:
            P(f"{r['status']} {r['verb']} {r['path']}  created_id={r['rid'] or '-'}  mw={r['mw']} svc={r['svc']} "
              f"{','.join(r['svc_modules'])}")
zp = [r for r in result if r["verdict"] == "ZERO-ID-PATH"]
P(f"\n== ZERO-ID-PATH (2xx on a zero-GUID path id — audit row names it; see writescan for the silent accept): {len(zp)} ==")
for r in zp:
    P(f"{r['status']} {r['verb']} {r['path']}")
P(f"\n== OK (some row names the record): {sum(1 for r in result if r['verdict'] == 'OK')} ==")
for r in result:
    if r["verdict"] == "OK":
        P(f"{r['status']} {r['verb']} {r['path']}  mw={r['mw']} svc={r['svc']} {','.join(r['svc_modules'])}")
P(f"\nscan window (UTC) for cleanup: {start:%Y-%m-%d %H:%M:%S} → {end:%Y-%m-%d %H:%M:%S}")
P("created ids: " + json.dumps([r["rid"] for r in result if r["rid"] and r["verb"] == "POST"]))
text = "\n".join(out)
print(text)
if args.out:
    open(args.out, "w", encoding="utf-8").write(text + "\n")
