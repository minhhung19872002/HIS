"""FE interface fields vs BE response schema for typed apiClient calls (apiClient.get<Dto>('...')).

usage: python fieldscan.py --base http://localhost:5107 [--swagger swagger.json] [--ratio 0.6]
Output: ratio, verb, url, FE interface, file:line, FE fields missing in BE, BE fields not in FE.
NOISY (paged wrappers, optional fields) — confirm by calling the endpoint and reading what the page renders.
"""
import argparse
import os
import re

from _common import FE, is_v1, load_swagger, norm_route

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--ratio", type=float, default=0.6)
args = ap.parse_args()

spec = load_swagger(args.base, args.swagger)
schemas = spec.get("components", {}).get("schemas", {})


def resolve(sch, depth=0):
    if not sch or depth > 6:
        return None
    if "$ref" in sch:
        return resolve(schemas.get(sch["$ref"].split("/")[-1]), depth + 1)
    if sch.get("type") == "array":
        return resolve(sch.get("items"), depth + 1)
    if "properties" in sch:
        p = sch["properties"]
        if "items" in p and len(p) <= 6:
            return resolve(p["items"], depth + 1) or p
        return p
    return None


be = {}
for path, ops in spec["paths"].items():
    for m, op in ops.items():
        c = op.get("responses", {}).get("200", {}).get("content", {})
        props = resolve((c.get("application/json") or c.get("text/json") or c.get("text/plain") or {}).get("schema"))
        if props:
            be[(m.upper(), norm_route(path))] = set(props)

src, ifaces = {}, {}
for root, _, files in os.walk(FE):
    for f in files:
        if f.endswith((".ts", ".tsx")):
            p = os.path.join(root, f)
            s = src[p] = open(p, encoding="utf-8", errors="replace").read()
            for m in re.finditer(r"interface\s+(\w+)(?:\s+extends\s+[\w<>, ]+)?\s*\{", s):
                i = j = m.end()
                d = 1
                while j < len(s) and d > 0:
                    d += {"{": 1, "}": -1}.get(s[j], 0)
                    j += 1
                depth, fields = 0, []
                for line in s[i:j - 1].split("\n"):
                    if depth == 0:
                        mm = re.match(r"\s*(\w+)\??\s*:", line)
                        if mm:
                            fields.append(mm.group(1))
                    depth += line.count("{") - line.count("}")
                ifaces.setdefault(m.group(1), set()).update(fields)

call = re.compile(r"""apiClient\s*\.\s*(get|post|put|patch|delete)\s*<\s*(\w+)(?:\[\])?\s*(?:\|[^>]*)?>\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")""")
rows = []
for fp, s in src.items():
    if is_v1(fp):
        continue
    consts = dict(re.findall(r"""const\s+(\w+)\s*=\s*['"`](/[^'"`$]*)['"`]""", s))
    for m in call.finditer(s):
        verb, typ, raw = m.group(1).upper(), m.group(2), m.group(3)[1:-1]
        if len(ifaces.get(typ, ())) < 3:
            continue
        u = re.sub(r"\$\{(\w+)\}", lambda mm: consts.get(mm.group(1), mm.group(0)), raw)
        u = re.sub(r"\$\{[^}]*\}", "{}", u)
        if not u.startswith("/api"):
            u = "/api" + ("" if u.startswith("/") else "/") + u
        b = be.get((verb, norm_route(u)))
        if not b:
            continue
        fe = ifaces[typ]
        ratio = len(fe & b) / max(1, len(fe))
        if ratio < args.ratio:
            rows.append((round(ratio, 2), verb, raw, typ, f"{fp.replace(FE, '')}:{s[:m.start()].count(chr(10)) + 1}",
                         sorted(fe - b)[:8], sorted(b - fe)[:8]))
for r in sorted(rows):
    print("\t".join(map(str, r)))
