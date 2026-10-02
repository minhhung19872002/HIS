"""Typed hostile-body fuzz: every POST/PUT/PATCH route gets its schema-minimal body with ONE property at a time
replaced by a hostile value of the property's own type, and `{id}` path params point at REAL records.

usage: python bodyfuzz.py --base http://localhost:5107 [--swagger swagger.json] [--only substr]
                          [--max-per-route 60] [--threads 4] [--out bodyfuzz.txt] [--json bodyfuzz.json]
                          [--log api.log]

writescan.py only ever sent {} / "" / 0 / zero-GUIDs, so it never reached the code that trusts a value's SIZE.
Per property: string → 'A'*5000 / only spaces / emoji; integer|number → -1 / 0 / 1e15 / 0.001;
date(-time) → 0001-01-01 / 9999-12-31 / not-a-date; boolean → "yes"; enum or *status/*type int → 99;
uuid → a REAL id of the WRONG entity (patientId := departmentId, doctorId := patientId, …) + zero GUID;
array → 1000 items. RISKY / FORBIDDEN routes (writescan_risky.py) and file uploads are never called.
Output: class A = 5xx (unhandled — grouped by root cause, with the exception line from --log when given),
class B = 2xx on a hostile value (silent accept — triage by querying the row the response id points at).
Replace-all collection routes (writescan_risky.REPLACE_ALL: …/mappings, /permissions, /items, /reference-ranges…,
or a top-level array body) are skipped unless --include-replace: their [] / 1000-item bodies delete real children.
A "baseline" request (the untouched valid-looking body) runs per route; a mutation answering exactly like a
failing baseline is "masked" and not reported. Real ids go ONLY to plain update routes (`PUT …/{id}`) — and
those records ARE overwritten with hostile values, so run it on a dev DB. Action sub-routes get the zero GUID
unless --real-actions. Threads > 1 fire the mutations of one route concurrently (that is how R13 found a
triple-cancel race), so expect repeated transitions to show up as class B.
Rows it creates carry "QA-R13"/"QAR13nnnnn" or no marker: clean up by CreatedAt within the scan window
(printed at the end). HIS_TOKEN=<jwt> reuses a session (admin is single-session).
"""
import argparse
import collections
import concurrent.futures
import datetime
import json
import os
import re
import time

from _common import load_swagger, login, req
from _realids import ZERO, PathIdResolver, seed_ids
from writescan_risky import RISKY, is_forbidden, is_no_fuzz, is_replace_all

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--only", help="substring filter on path")
ap.add_argument("--max-per-route", type=int, default=60, help="cap on mutated requests per route")
ap.add_argument("--threads", type=int, default=4)
ap.add_argument("--out", help="write the report here as well as stdout")
ap.add_argument("--json", help="dump every result as JSON (for triage scripts)")
ap.add_argument("--log", help="API console log: attaches the 'Unhandled exception in <path>' line to each 5xx")
ap.add_argument("--include-replace", action="store_true",
                help="also fuzz replace-all collection routes (writescan_risky.REPLACE_ALL / top-level array body) — "
                     "they DELETE the current children; dev DB only")
ap.add_argument("--real-actions", action="store_true",
                help="also send REAL ids to action sub-routes (/{id}/cancel|lock|approve…) — moves real records; "
                     "only on a disposable DB, and restore what it touched")
args = ap.parse_args()

SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger"]
LONG = "A" * 5000
SPACES = "   "
EMOJI = "\U0001F600" * 10
WRONG_ID_FOR = [  # property-name fragment → which real id of ANOTHER entity to send
    ("patient", "department"), ("department", "patient"), ("doctor", "patient"), ("user", "patient"),
    ("nurse", "patient"), ("staff", "patient"), ("employee", "patient"), ("medicine", "department"),
    ("drug", "department"), ("warehouse", "medicine"), ("room", "patient"), ("bed", "patient"),
    ("service", "patient"), ("visit", "department"), ("examination", "department"), ("admission", "department"),
]

token = os.environ.get("HIS_TOKEN") or login(args.base)  # admin is single-session: reuse a token when given
spec = load_swagger(args.base, args.swagger)
schemas = spec.get("components", {}).get("schemas", {})
today = datetime.datetime.now().replace(microsecond=0).isoformat()
ids = seed_ids(args.base, token)
resolver = PathIdResolver(args.base, token, spec)
print("real ids:", ids)


def resolve(s):
    while s and "$ref" in s:
        s = schemas.get(s["$ref"].split("/")[-1], {})
    if s and "allOf" in s and "type" not in s:  # nullable $ref wrapped in allOf
        merged = {}
        for part in s["allOf"]:
            merged.update(resolve(part))
        return merged
    return s or {}


RIGHT_ID_FOR = [  # property-name fragment → the real id of the entity the name suggests (valid-looking base body)
    ("patient", "patient"), ("department", "department"), ("medicine", "medicine"), ("drug", "medicine"),
    ("user", "user"), ("doctor", "user"), ("nurse", "user"), ("staff", "user"), ("employee", "user"),
    ("approver", "user"), ("cashier", "user"), ("technician", "user"), ("pharmacist", "user"),
]
seq = [0]
RUN = format(int(time.time()) % 46656, "03x")  # per-run prefix: codes from an earlier run never collide


def valid_string(name):
    """A plausible value so required-field / format validation does not mask the hostile property under test."""
    low = name.lower()
    if "email" in low:
        return "qa-r13@example.com"
    if "phone" in low or "mobile" in low or "tel" in low:
        return "0912000013"
    if low in ("code",) or low.endswith("code") or low.endswith("number") or low.endswith("no"):
        seq[0] += 1
        return f"QAR13{RUN}{seq[0]:05d}"
    if "password" in low:
        return "Qa-R13@12345"
    if low.endswith("time") and not low.endswith("datetime"):
        return "08:00"
    return "QA-R13"


def gen(s, depth=0, name=""):
    """Schema-minimal but VALID-LOOKING body (writescan.gen sends "" / 0 / zero-GUID, which 400s on required
    fields before the hostile property is ever looked at)."""
    s = resolve(s)
    if "enum" in s and s["enum"]:
        return s["enum"][0]
    t, f = s.get("type"), s.get("format")
    if t == "string":
        if f == "uuid":
            low = name.lower()
            return next((ids[kind] for frag, kind in RIGHT_ID_FOR if frag in low), ZERO)
        if f == "date-time":
            return today
        if f == "date":
            return today[:10]
        return valid_string(name)
    if t in ("integer", "number"):
        return 1
    if t == "boolean":
        return False
    if t == "array":
        return []
    if t == "object" or "properties" in s:
        if depth > 2:
            return {}
        return {k: gen(v, depth + 1, k) for k, v in s.get("properties", {}).items()}
    return None


def wrong_id(name):
    low = name.lower()
    for frag, kind in WRONG_ID_FOR:
        if frag in low:
            return ids[kind]
    return ids["patient"]


def mutations(name, ps):
    """→ [(class_label, hostile_value)] for one property schema."""
    ps = resolve(ps)
    t, f, low = ps.get("type"), ps.get("format"), name.lower()
    out = []
    if "enum" in ps and ps["enum"]:
        return [("enum-99", 99)]
    if t == "string":
        if f == "uuid":
            return [("uuid-wrong-entity", wrong_id(name)), ("uuid-zero", ZERO)]
        if f in ("date-time", "date"):
            return [("date-min", "0001-01-01T00:00:00Z"), ("date-max", "9999-12-31T00:00:00Z"), ("date-bad", "not-a-date")]
        return [("str-5000", LONG), ("str-spaces", SPACES), ("str-emoji", EMOJI)]
    if t in ("integer", "number"):
        out = [("num-neg", -1), ("num-zero", 0), ("num-1e15", 10 ** 15), ("num-frac", 0.001)]
        if any(k in low for k in ("status", "type", "level", "priority", "state", "kind", "mode")):
            out.append(("enum-99", 99))
        return out
    if t == "boolean":
        return [("bool-str", "yes")]
    if t == "array":
        item = gen(ps.get("items", {}), 1)
        return [("array-1000", [item] * 1000)]
    return out


targets = []
skipped_no_body = 0
skipped_replace = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if any(x in low for x in SKIP) or is_forbidden(low) or is_no_fuzz(low):
        continue
    if args.only and args.only.lower() not in low:
        continue
    segs = re.sub(r"\{[^}]+\}", "", low).replace("/api/", "/")
    if any(re.search(r"(^|[/\-_])" + re.escape(x) + r"($|[/\-_s])", segs) for x in RISKY):
        continue
    for verb in ("post", "put", "patch"):
        op = ops.get(verb)
        if not op:
            continue
        content = op.get("requestBody", {}).get("content", {}) or {}
        if "multipart/form-data" in content or "application/json" not in content:
            skipped_no_body += 1
            continue
        schema = resolve(content["application/json"].get("schema") or {})
        if not args.include_replace and is_replace_all(path, schema):
            skipped_replace.append(f"{verb.upper()} {path}")
            continue
        url, real = resolver.fill(path, op, real_actions=args.real_actions)
        muts = []
        if schema.get("type") == "array":
            base = []
            muts.append(("array-1000", [gen(schema.get("items", {}), 1)] * 1000, "<root>"))
        elif schema.get("properties"):
            base = gen(schema)
            for pname, ps in schema["properties"].items():
                for label, val in mutations(pname, ps):
                    muts.append((label, val, pname))
        else:
            skipped_no_body += 1
            continue
        targets.append((verb.upper(), path, url, real, "<baseline>", "baseline", base))
        for label, val, pname in muts[: args.max_per_route]:
            if isinstance(base, dict):
                body = gen(schema)  # fresh copy: code-like fields get a new unique value (no duplicate-key 400)
                body[pname] = val
            else:
                body = val
            targets.append((verb.upper(), path, url, real, pname, label, body))

print(f"routes with json body: {len({(t[0], t[1]) for t in targets})}  requests: {len(targets)}  "
      f"skipped (no json schema / upload): {skipped_no_body}  skipped replace-all: {len(skipped_replace)}")
scan_start = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)


def run(t):
    verb, path, url, real, pname, label, body = t
    t0 = time.time()
    st, b = req(verb, args.base + url, body=body, token=token, timeout=120)
    txt = b[:400].decode("utf-8", "replace").replace("\n", " ")
    rid = None
    if 200 <= st < 300:
        m = re.search(r'"id"\s*:\s*"([0-9a-f-]{36})"', txt)
        rid = m.group(1) if m else None
    return dict(verb=verb, path=path, url=url, real=real, prop=pname, cls=label, status=st,
                body=txt[:160], rid=rid, ms=int((time.time() - t0) * 1000))


with concurrent.futures.ThreadPoolExecutor(args.threads) as ex:
    res = list(ex.map(run, targets))
scan_end = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)

# baseline per route: a mutation that answers exactly like the untouched body was never looked at (masked)
baseline = {(r["verb"], r["path"]): r for r in res if r["cls"] == "baseline"}
for r in res:
    bl = baseline.get((r["verb"], r["path"]))
    r["masked"] = bool(bl) and r["cls"] != "baseline" and r["status"] == bl["status"] and r["status"] >= 400 \
        and r["body"][:80] == bl["body"][:80]
    r["baseline"] = bl["status"] if bl else None

# ── attach the exception line from the API console log (DomainExceptionFilter logs "Unhandled exception in <path>")
if args.log:
    blocks = collections.defaultdict(list)
    try:
        lines = open(args.log, encoding="utf-8", errors="replace").read().split("\n")
    except OSError:
        lines = []
    for i, line in enumerate(lines):
        m = re.search(r"Unhandled exception in (\S+)", line)
        if not m:
            continue
        exc = next((l.strip() for l in lines[i + 1:i + 4] if "Exception" in l or "Error" in l), "")
        frame = next((l.strip() for l in lines[i + 1:i + 60] if l.strip().startswith("at HIS.")), "")
        blocks[m.group(1).lower()].append((exc[:200], frame[:160]))
    for r in res:
        if r["status"] >= 500 and blocks.get(r["url"].lower()):
            r["exc"], r["frame"] = blocks[r["url"].lower()].pop(0)


def root_cause(r):
    s = (r.get("exc", "") + " " + r["body"]).lower()
    for key, name in (("truncat", "truncation"), ("overflow", "decimal/arith overflow"), ("out of range", "range"),
                      ("foreign key", "FK"), ("reference constraint", "FK"), ("sqldatetime", "DateTime range"),
                      ("invalidcast", "cast"), ("cast", "cast"), ("nullreference", "null ref"),
                      ("formatexception", "format"), ("guid", "guid parse"), ("timeout", "timeout"),
                      ("divide", "divide by zero"), ("keynotfound", "key not found"),
                      ("argumentoutofrange", "ArgumentOutOfRange"), ("invalidoperation", "InvalidOperation")):
        if key in s:
            return name
    return "other/unknown (see API log)"


out = []
P = out.append
P(f"bodyfuzz {scan_start:%Y-%m-%d %H:%M:%S}Z → {scan_end:%H:%M:%S}Z  base={args.base}")
P(f"routes fuzzed: {len({(r['verb'], r['path']) for r in res})}   requests: {len(res)}   "
  f"status: {collections.Counter(r['status'] for r in res).most_common()}")
P(f"routes using a REAL path id: {len({r['path'] for r in res if r['real']})}")
bl_ok = [b for b in baseline.values() if 200 <= b["status"] < 300]
P(f"baseline (untouched valid-looking body): 2xx on {len(bl_ok)} routes — the fuzz is meaningful there; "
  f"{collections.Counter(b['status'] for b in baseline.values()).most_common()}")
masked = sum(1 for r in res if r["masked"])
P(f"mutations masked by the baseline error (same status+message as the untouched body): {masked}")

P("\n== class A: 5xx / network (unhandled) — grouped by root cause ==")
groups = collections.defaultdict(list)
for r in res:
    if (r["status"] == -1 or r["status"] >= 500) and not r["masked"]:
        groups[root_cause(r)].append(r)
for g, rs in sorted(groups.items(), key=lambda x: -len(x[1])):
    P(f"-- {g}: {len(rs)} requests / {len({r['path'] for r in rs})} routes")
    for r in rs:
        P(f"{r['status']} {r['verb']} {r['path']} [{r['prop']}={r['cls']}] {r.get('exc', '')[:120]} "
          f"{r.get('frame', '')[:100]} | {r['body'][:100]}")

P("\n== class B: 2xx on a hostile value (silent accept — verify the stored row) ==")
bycls = collections.defaultdict(list)
for r in res:
    if 200 <= r["status"] < 300 and r["cls"] != "baseline":
        bycls[r["cls"]].append(r)
P("per class: " + ", ".join(f"{k}={len(v)}" for k, v in sorted(bycls.items(), key=lambda x: -len(x[1]))))
for cls, rs in sorted(bycls.items(), key=lambda x: -len(x[1])):
    P(f"-- {cls}: {len(rs)}")
    for r in rs:
        P(f"{r['status']} {r['verb']} {r['path']} [{r['prop']}] id={r['rid'] or '-'} {r['ms']}ms {r['body'][:90]}")

slow = [r for r in res if r["ms"] > 5000]
if slow:
    P(f"\n== slow (>5s) — array-1000 / 5000-char that is processed unbounded ==")
    for r in slow:
        P(f"{r['status']} {r['verb']} {r['path']} [{r['prop']}={r['cls']}] {r['ms']}ms")

P(f"\nscan window (UTC) for cleanup: {scan_start:%Y-%m-%d %H:%M:%S} → {scan_end:%Y-%m-%d %H:%M:%S}")
text = "\n".join(out)
print(text)
if args.out:
    open(args.out, "w", encoding="utf-8").write(text + "\n")
if args.json:
    json.dump(res, open(args.json, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
