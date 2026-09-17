"""FE-permission vs BE-write-gate gap: write routes a role can call that no v2 page visible to that role calls.
usage: python permgap.py --matrix writeauthz.tsv --perms perms.tsv [--swagger swagger.json]
- writeauthz.tsv: output of writeauthz.py (verb, path, one status column per user).
- perms.tsv: "user<TAB>PermissionCode" rows for the same users (from UserRoles→RolePermissions→Permissions).
Builds page → import closure → apiClient calls, maps each page to its FE route `permission`
(router/routeConfigs + router/lazy), then for every route the user reached (not 401/403) prints:
  GAP     — FE callers exist but none is on a page whose permission the user holds (backend is wider than UI)
  NOFE    — no v2 caller at all (dead or external API; review separately)
Calls made from files outside any page closure (layout, global widgets) count as visible to everyone.
Heuristic (static import walk, template URLs normalised) — verify each GAP before tightening a gate.
"""
import argparse
import collections
import os
import re

from _common import FE, is_v1, load_swagger, norm_route

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--matrix", required=True)
ap.add_argument("--perms", required=True)
args = ap.parse_args()

spec = load_swagger(args.base, args.swagger)
be_routes = {norm_route(p): p for p in spec["paths"]}

src = {}
for root, _, files in os.walk(FE):
    for f in files:
        if f.endswith((".ts", ".tsx")):
            p = os.path.normpath(os.path.join(root, f))
            src[p] = open(p, encoding="utf-8", errors="replace").read()


def resolve_import(frm, spec_):
    if spec_.startswith("@/"):
        base = os.path.join(FE, spec_[2:])
    elif spec_.startswith("."):
        base = os.path.join(os.path.dirname(frm), spec_)
    else:
        return None
    base = os.path.normpath(base)
    for cand in (base, base + ".ts", base + ".tsx", os.path.join(base, "index.ts"), os.path.join(base, "index.tsx")):
        if cand in src:
            return cand
    return None


imp_re = re.compile(r"""(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)""")
deps = {p: {d for d in (resolve_import(p, a or b) for a, b in imp_re.findall(s)) if d} for p, s in src.items()}

call_re = re.compile(r"""(?:apiClient|client|api|axiosInstance|http)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^()]*?>)?\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")""", re.S)
calls = collections.defaultdict(set)  # file -> {(VERB, normroute)}
for fp, s in src.items():
    consts = dict(re.findall(r"""const\s+(\w+)\s*=\s*['"`](/[^'"`$]*)['"`]""", s))
    for m in call_re.finditer(s):
        verb, raw = m.group(1).upper(), m.group(2)[1:-1]
        u = re.sub(r"\$\{(\w+)\}", lambda mm: consts.get(mm.group(1), mm.group(0)), raw)
        u = re.sub(r"\$\{[^}]*\}", "{}", u)
        if u.startswith("{}") or u.startswith("http"):
            continue
        if not u.startswith("/api"):
            u = "/api" + ("" if u.startswith("/") else "/") + u
        calls[fp].add((verb, norm_route(u)))

# page component -> file
lazy_dir = os.path.join(FE, "router", "lazy")
comp_file = {}
for f in os.listdir(lazy_dir):
    fp = os.path.normpath(os.path.join(lazy_dir, f))
    for name, rel in re.findall(r"export const (\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*['\"]([^'\"]+)['\"]", src.get(fp, "")):
        r = resolve_import(fp, rel)
        if r:
            comp_file[name] = r
page_perms = collections.defaultdict(set)
rc_dir = os.path.join(FE, "router", "routeConfigs")
for f in os.listdir(rc_dir):
    s = src.get(os.path.normpath(os.path.join(rc_dir, f)), "")
    for comp, meta in re.findall(r"Component:\s*(\w+)\s*,\s*meta:\s*\{([^}]*)\}", s):
        pm = re.search(r"permission:\s*['\"]([^'\"]+)['\"]", meta)
        if comp in comp_file:
            page_perms[comp_file[comp]].add(pm.group(1) if pm else "*")


def closure(p):
    seen, stack = set(), [p]
    while stack:
        x = stack.pop()
        if x in seen or is_v1(x):
            continue
        seen.add(x)
        stack.extend(deps.get(x, ()))
    return seen


call_perms = collections.defaultdict(set)  # (verb, route) -> perms of pages that reach it
in_page = set()
for page, perms in page_perms.items():
    cl = closure(page)
    in_page |= cl
    for f in cl:
        for c in calls.get(f, ()):
            call_perms[c] |= perms
for f, cs in calls.items():
    if f not in in_page and not is_v1(f) and f.endswith(".tsx"):
        for c in cs:
            call_perms[c].add("*")

user_perms = collections.defaultdict(set)
for line in open(args.perms, encoding="utf-8"):
    parts = line.strip().split("\t")
    if len(parts) == 2:
        user_perms[parts[0]].add(parts[1])

rows = [l.rstrip("\n").split("\t") for l in open(args.matrix, encoding="utf-8")]
users = rows[0][2:]
for i, u in enumerate(users):
    gaps, nofe = [], []
    for r in rows[1:]:
        st = r[2 + i]
        if st in ("401", "403"):
            continue
        key = (r[0], norm_route(r[1]))
        perms = call_perms.get(key)
        if not perms:
            nofe.append(f"{r[0]} {r[1]} {st}")
        elif "*" not in perms and not (perms & user_perms[u]):
            gaps.append(f"{r[0]} {r[1]} {st}  page-perms={sorted(perms)}")
    print(f"\n### {u}: GAP {len(gaps)} · NOFE {len(nofe)}")
    for g in gaps:
        print("GAP ", g)
    for n in nofe:
        print("NOFE", n)
