"""T1 (#216) — live role x endpoint enforcement matrix against the local API.

For every seeded role user: log in, read the JWT role claims and /api/me/permissions,
then call a representative slice of the static inventory (authz_inventory.json) and
compare the HTTP outcome with what the guard on that action says should happen.

  expected FORBIDDEN but the call went through  -> SECURITY finding (backend enforcement gap)
  expected ALLOWED  but got 403                 -> over-restriction finding
  401 on a valid token                          -> auth pipeline finding
  500                                           -> API-error finding (T4 territory, recorded only)

Mutations are only ever sent to roles that are EXPECTED to be refused (authorization runs
before model binding, so a 403 proves the gate without executing the action). GETs that
look heavy or side-effecting are skipped.
"""
import base64, csv, json, os, re, sys, time, urllib.error, urllib.request
from collections import Counter, defaultdict
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:5106"
ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

USERS = [  # username, password, label
    ("admin",    "Admin@123", "Quản trị hệ thống"),
    ("bsannn",   "123456",    "Bác sĩ"),
    ("ddgiang",  "123456",    "Điều dưỡng"),
    ("ktvkhanh", "123456",    "KTV XN"),
    ("ktvlam",   "123456",    "KTV CĐHA"),
    ("dsoanh",   "123456",    "Dược sĩ"),
    ("lthung",   "123456",    "Tiếp đón"),
    ("tnmai",    "123456",    "Thu ngân"),
]
SKIP_RE = re.compile(r"(dev/|seed|reset|purge|export|download|pdf|print|/health|swagger|hangfire|stream|sse|ws$|generate|send|sync|backup|restore|migrate|run-|trigger|simulate|test-)", re.I)

def http(method, path, token=None, body=None, timeout=25):
    data = json.dumps(body).encode() if body is not None else None
    hdr = {"Content-Type": "application/json"}
    if token: hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # timeout / connection
        return -1, str(e)

def http_multipart(method, path, token=None):
    """Gửi lại bằng multipart/form-data.

    Endpoint upload từ chối body JSON ngay ở tầng routing (ConsumesMatcherPolicy) và trả 415
    TRƯỚC khi middleware authorize chạy, nên 415 KHÔNG nói được gì về cổng quyền. Phải hỏi lại
    đúng content-type thì mới đọc được 401/403/200 thật."""
    b = "----t1probe"
    body = ("--" + b + "\r\n"
            "Content-Disposition: form-data; name=\"file\"; filename=\"probe.csv\"\r\n"
            "Content-Type: text/csv\r\n\r\n\r\n"
            "--" + b + "--\r\n").encode()
    hdr = {"Content-Type": "multipart/form-data; boundary=" + b}
    if token: hdr["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=hdr)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)


def login(u, p):
    for attempt in range(8):
        s, b = http("POST", "/api/auth/login", body={"username": u, "password": p})
        if s == 200:
            d = json.loads(b); d = d.get("data", d)
            return d["token"], d.get("user", {})
        if s == 429 or s == -1 or not b:
            time.sleep(12); continue
        return None, {"status": s, "body": b[:200]}
    return None, {"status": "rate-limited"}

def jwt_roles(token):
    payload = token.split(".")[1]; payload += "=" * (-len(payload) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    r = claims.get(ROLE_CLAIM) or claims.get("role") or []
    return [r] if isinstance(r, str) else list(r)

def expected(guard, ep_roles, ep_perms, my_roles, my_perms):
    if guard in ("anonymous", "auth", "none"): return "allow"
    if guard == "roles":
        return "allow" if set(ep_roles) & set(my_roles) else "forbid"
    if guard == "permission":
        return "allow" if set(ep_perms) <= set(my_perms) else "forbid"
    if guard == "permission+roles":
        return "allow" if (set(ep_roles) & set(my_roles)) and set(ep_perms) <= set(my_perms) else "forbid"
    return "allow"

def classify(status):
    if status == 401: return "unauth"
    if status == 403: return "forbid"
    if status == 404: return "notfound"   # route never matched — inventory gap, not a verdict on the gate
    if status == -1: return "timeout"
    if status >= 500: return "error500"
    if status == 415: return "media415"   # vẫn chưa tới authorize — không phải phán quyết về cổng
    return "allow"

def main():
    inv = json.load(open(os.path.join(HERE, "authz_inventory.json"), encoding="utf-8"))
    # representative slice: GETs without route params, <=4 per controller (role/permission-guarded first)
    per_ctrl = defaultdict(list)
    for r in inv:
        if "{" in r["route"] or SKIP_RE.search(r["route"]): continue
        per_ctrl[r["controller"]].append(r)
    gets, negs = [], []
    for c, rows in per_ctrl.items():
        g = [r for r in rows if r["method"] == "GET"]
        g.sort(key=lambda r: (r["guard"] not in ("roles", "permission", "permission+roles"), r["route"]))
        gets += g[:4]
        m = [r for r in rows if r["method"] in ("POST", "PUT", "DELETE") and r["guard"] in ("roles", "permission", "permission+roles")]
        m.sort(key=lambda r: r["route"]); negs += m[:2]
    print(f"slice: {len(gets)} GET probes + {len(negs)} mutation gates (negative-only) across {len(per_ctrl)} controllers")

    sessions = []
    for u, p, label in USERS:
        tok, info = login(u, p)
        if not tok:
            print(f"LOGIN FAILED {u}: {info}"); continue
        s, b = http("GET", "/api/me/permissions", tok)
        perms = []
        if s == 200:
            d = json.loads(b); perms = d.get("data", d) if isinstance(d, dict) else d
        roles = jwt_roles(tok)
        sessions.append((u, label, tok, roles, perms or []))
        print(f"  {u:9s} roles={roles} perms={len(perms or [])}")

    results = []
    t0 = time.time()
    for u, label, tok, roles, perms in sessions:
        for r in gets:
            exp = expected(r["guard"], r["roles"], r["permissions"], roles, perms)
            s, b = http("GET", "/api" + r["route"] if not r["route"].startswith("/api") else r["route"], tok)
            results.append({"user": u, "role": label, "method": "GET", "route": r["route"], "guard": r["guard"],
                            "ep_roles": "|".join(r["roles"]), "ep_perms": "|".join(r["permissions"]),
                            "expected": exp, "status": s, "actual": classify(s), "body": b[:160].replace("\n", " ")})
        for r in negs:
            exp = expected(r["guard"], r["roles"], r["permissions"], roles, perms)
            if exp != "forbid": continue  # never execute a mutation the role is allowed to run
            path = "/api" + r["route"] if not r["route"].startswith("/api") else r["route"]
            s, b = http(r["method"], path, tok, body={})
            if s == 415:  # routing chặn JSON trước authorize — hỏi lại đúng content-type
                s, b = http_multipart(r["method"], path, tok)
            results.append({"user": u, "role": label, "method": r["method"], "route": r["route"], "guard": r["guard"],
                            "ep_roles": "|".join(r["roles"]), "ep_perms": "|".join(r["permissions"]),
                            "expected": exp, "status": s, "actual": classify(s), "body": b[:160].replace("\n", " ")})
        print(f"  done {u} ({time.time()-t0:.0f}s)")

    # unauthenticated + garbage token sweep over 40 protected GETs
    prot = [r for r in gets if r["guard"] != "anonymous"][:40]
    for r in prot:
        path = "/api" + r["route"] if not r["route"].startswith("/api") else r["route"]
        for label, tok in (("<no token>", None), ("<garbage token>", "eyJhbGciOiJIUzI1NiJ9.e30.zzzz")):
            s, b = http("GET", path, tok)
            results.append({"user": label, "role": label, "method": "GET", "route": r["route"], "guard": r["guard"],
                            "ep_roles": "|".join(r["roles"]), "ep_perms": "", "expected": "unauth", "status": s,
                            "actual": classify(s), "body": b[:160].replace("\n", " ")})

    # verdicts
    def verdict(x):
        e, a = x["expected"], x["actual"]
        if a == "timeout": return "TIMEOUT"
        if a == "error500": return "ERROR500"
        if a == "notfound": return "ROUTE-404"
        if a == "media415": return "MEDIA-415"
        if e == "unauth": return "OK" if a == "unauth" else "SEC-NOAUTH"
        if e == "forbid" and a == "allow": return "SEC-BYPASS"
        if e == "allow" and a == "forbid": return "OVER-RESTRICT"
        if a == "unauth": return "AUTH-401"
        return "OK"
    for x in results: x["verdict"] = verdict(x)

    with open(os.path.join(HERE, "t1_results.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(results[0].keys())); w.writeheader(); w.writerows(results)
    findings = [x for x in results if x["verdict"] != "OK"]
    json.dump(findings, open(os.path.join(HERE, "t1_findings.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\n== per-user summary ==")
    for u, label, *_ in sessions:
        c = Counter(x["verdict"] for x in results if x["user"] == u)
        print(f"  {u:9s} {label:18s} {dict(c)}")
    c = Counter(x["verdict"] for x in results if x["user"].startswith("<"))
    print(f"  {'anon/garbage':28s} {dict(c)}")
    print("\n== findings by verdict ==")
    for v, n in Counter(x["verdict"] for x in findings).most_common(): print(f"  {v}: {n}")
    print("\nSEC-BYPASS / SEC-NOAUTH detail:")
    for x in findings:
        if x["verdict"].startswith("SEC"):
            print(f"  [{x['verdict']}] {x['user']} {x['method']} {x['route']} guard={x['guard']} roles={x['ep_roles']} -> {x['status']}")
    print(f"\ntotal calls={len(results)}  findings={len(findings)}  csv=t1_results.csv")

if __name__ == "__main__":
    main()
