"""FE↔BE route diff: FE apiClient calls with no matching swagger route/verb, and whether a v2 page calls them.

usage: python fecontract.py --base http://localhost:5107 [--swagger swagger.json] [--all]
Prints MISSING/VERB rows; by default only functions called from non-v1 .tsx (v2 pages/components).
Name matching is heuristic (same function name in several api files) — verify live before fixing.
"""
import argparse
import os
import re

from _common import FE, is_v1, load_swagger, norm_route

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--all", action="store_true")
args = ap.parse_args()

spec = load_swagger(args.base, args.swagger)
be = {}
for path, ops in spec["paths"].items():
    be.setdefault(norm_route(path), set()).update(m.upper() for m in ops)

src = {}
for root, _, files in os.walk(FE):
    for f in files:
        if f.endswith((".ts", ".tsx")):
            p = os.path.join(root, f)
            src[p] = open(p, encoding="utf-8", errors="replace").read()
ui = {p: s for p, s in src.items() if p.endswith(".tsx") and not is_v1(p)}

call = re.compile(r"""(?:apiClient|client|api|axiosInstance|http)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^()]*?>)?\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")""", re.S)
for fp, s in src.items():
    if is_v1(fp):
        continue
    consts = dict(re.findall(r"""const\s+(\w+)\s*=\s*['"`](/[^'"`$]*)['"`]""", s))
    for m in call.finditer(s):
        verb, raw = m.group(1).upper(), m.group(2)[1:-1]
        if raw.startswith("http"):
            continue
        u = re.sub(r"\$\{(\w+)\}", lambda mm: consts.get(mm.group(1), mm.group(0)), raw)
        u = re.sub(r"\$\{[^}]*\}", "{}", u)
        if u.startswith("{}"):
            continue
        if not u.startswith("/api"):
            u = "/api" + ("" if u.startswith("/") else "/") + u
        n = norm_route(u)
        if n in be and verb in be[n]:
            continue
        if re.sub(r"\{\}$", "", n).rstrip("/") in be:
            continue
        kind = "VERB" if n in be else "MISSING"
        line = s[:m.start()].count("\n") + 1
        lines = s.split("\n")
        name = None
        for i in range(line - 1, max(-1, line - 10), -1):
            mm = re.search(r"export\s+(?:const|async function|function)\s+(\w+)|^\s*(\w+)\s*[:=]\s*(?:async\s*)?\(", lines[i])
            if mm:
                name = mm.group(1) or mm.group(2)
                break
        users = []
        if fp.endswith(".tsx"):
            users = ["(inline)"]
        elif name:
            pat = re.compile(r"(?<![\w$])" + re.escape(name) + r"\s*\(")
            users = [p.replace(FE, "") for p, t in ui.items() if pat.search(t)]
        if users or args.all:
            print(f"{kind}\t{verb}\t{raw}\t{fp.replace(FE, '')}:{line}\tfn={name}\tused={users[:3]}")
