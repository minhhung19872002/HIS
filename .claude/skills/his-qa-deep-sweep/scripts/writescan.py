"""Write sweep: call every POST/PUT/PATCH/DELETE route with generated bodies and list 5xx / suspicious 2xx.

usage: python writescan.py --base http://localhost:5107 [--mode empty|schema|both] [--include-risky]
Bodies: `empty` sends {} (expect 400 on required DTOs); `schema` builds a minimal body from the swagger schema
("" / 0 / false / zero-guid / today / [] / first enum). Path params get zero-guid / 0 / "x".
Output: status histogram, every 5xx (bug: unhandled exception), and every 2xx whose path params or body were
all placeholders (candidate silent-accept / orphan write — verify by hand, then clean up rows created).
Routes matching RISKY (seed/populate/reset/send/sign/…) are skipped unless --include-risky.
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
ap.add_argument("--mode", default="both", choices=["empty", "schema", "both"])
ap.add_argument("--include-risky", action="store_true")
ap.add_argument("--only", help="substring filter on path")
args = ap.parse_args()

ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger"]
RISKY = ["seed", "populate", "dev", "reset", "purge", "wipe", "truncate", "clear", "migrat", "restart", "shutdown",
         "backup", "restore", "rotate", "revoke", "password", "logout", "login", "2fa", "totp", "otp", "webauthn",
         "sign", "pkcs", "send", "email", "sms", "notify", "zalo", "webhook", "ipn", "sync", "push", "hl7", "mpps",
         "import", "upload", "print", "batch", "bulk", "delete-all", "all", "repair", "recalc", "rebuild", "reindex",
         "cache", "merge", "split", "anonymize", "erase", "gdpr", "health", "tts", "ai", "queue", "worker", "job"]

token = login(args.base)
spec = load_swagger(args.base)
schemas = spec.get("components", {}).get("schemas", {})
today = datetime.datetime.now().replace(microsecond=0).isoformat()


def resolve(s):
    while s and "$ref" in s:
        s = schemas.get(s["$ref"].split("/")[-1], {})
    return s or {}


def gen(s, depth=0):
    s = resolve(s)
    if "enum" in s and s["enum"]:
        return s["enum"][0]
    t = s.get("type")
    f = s.get("format")
    if t == "string":
        if f == "uuid":
            return ZERO
        if f == "date-time":
            return today
        if f == "date":
            return today[:10]
        return ""
    if t == "integer" or t == "number":
        return 0
    if t == "boolean":
        return False
    if t == "array":
        return []
    if t == "object" or "properties" in s:
        if depth > 2:
            return {}
        return {k: gen(v, depth + 1) for k, v in s.get("properties", {}).items()}
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
    if any(x in low for x in SKIP):
        continue
    if args.only and args.only.lower() not in low:
        continue
    for verb in ("post", "put", "patch", "delete"):
        op = ops.get(verb)
        if not op:
            continue
        segs = re.sub(r"\{[^}]+\}", "", low).replace("/api/", "/")
        if not args.include_risky and any(re.search(r"(^|[/\-_])" + re.escape(x) + r"($|[/\-_s])", segs) for x in RISKY):
            continue
        url, all_placeholder = path, True
        for p in re.findall(r"\{([^}]+)\}", path):
            sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
            v = ZERO if sch.get("format") == "uuid" else ("0" if sch.get("type") in ("integer", "number") else "x")
            url = url.replace("{" + p + "}", v)
        body_schema = (op.get("requestBody", {}).get("content", {}).get("application/json", {}) or {}).get("schema")
        modes = []
        if args.mode in ("empty", "both"):
            modes.append(("empty", {} if body_schema else None))
        if args.mode in ("schema", "both") and body_schema:
            modes.append(("schema", gen(body_schema)))
        for mname, body in modes:
            targets.append((verb.upper(), path, url, mname, body))


def run(t):
    verb, path, url, mname, body = t
    st, b = req(verb, args.base + url, body=body, token=token)
    return verb, path, mname, st, b[:220].decode("utf-8", "replace").replace("\n", " ")


with concurrent.futures.ThreadPoolExecutor(6) as ex:
    res = list(ex.map(run, targets))
print("total", len(res), collections.Counter(r[3] for r in res).most_common())
print("\n== 5xx / network ==")
for verb, path, mname, st, b in res:
    if st == -1 or st >= 500:
        print(st, verb, path, f"[{mname}]", b)
print("\n== 2xx with placeholder-only input (verify: silent accept / orphan write?) ==")
for verb, path, mname, st, b in res:
    if 200 <= st < 300:
        print(st, verb, path, f"[{mname}]", b[:120])
