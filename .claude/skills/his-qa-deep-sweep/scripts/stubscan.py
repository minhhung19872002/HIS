"""Unfinished-feature sweep (static): list the places where a v2 page or a backend action only pretends.

usage: python stubscan.py [--fe] [--be] [--only reception,pharmacy]

FE (frontend/src/modules/**): handlers that do nothing or only toast ("Chức năng đang phát triển"), buttons
permanently disabled, tables/selects fed from a literal array instead of an api call, `TODO`/`FIXME`, literal
"Đang phát triển / Coming soon" text, Math.random / fake delays, `alert(`/`console.log` as the only effect.
BE (backend/src/**, no DevData/tests): 501 / NotImplementedException, `Task.CompletedTask` or
`return true/new List/new X()` stubs in write methods, `Random`, hard-coded person names / amounts, Mock/Fake
services registered outside Development.
Every hit is a CANDIDATE — verify it in the browser / against the API before calling it unfinished.
"""
import argparse
import os
import re

from _common import BE, FE

ap = argparse.ArgumentParser()
ap.add_argument("--fe", action="store_true")
ap.add_argument("--be", action="store_true")
ap.add_argument("--only", default="")
args = ap.parse_args()
if not args.fe and not args.be:
    args.fe = args.be = True
only = [x.strip().lower() for x in args.only.split(",") if x.strip()]

FE_RULES = [
    ("noop-handler", re.compile(r"on(?:Click|Change|Ok|Finish|Submit|Confirm)=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}")),
    ("noop-fn", re.compile(r"=>\s*\{\s*/\*[^*]*\*/\s*\}")),
    ("toast-only", re.compile(r"message\.(?:info|warning|success)\(\s*['\"`][^'\"`]*(?:đang phát triển|chưa hỗ trợ|sắp|coming soon|chưa triển khai|chưa có|demo)[^'\"`]*['\"`]", re.I)),
    ("stub-text", re.compile(r"(?:Đang phát triển|Chưa hỗ trợ|Coming soon|Sắp ra mắt|Chưa triển khai|đang được phát triển|Tính năng đang|Chức năng đang)", re.I)),
    ("todo", re.compile(r"//\s*(?:TODO|FIXME|HACK|XXX)\b|\{/\*\s*(?:TODO|FIXME)")),
    ("always-disabled", re.compile(r"<(?:Button|ActBtn|Menu\.Item|Switch)\b[^>]*\sdisabled(?:=\{true\})?(?=[\s>/])(?![^>]*disabled=\{)")),
    ("literal-rows", re.compile(r"(?:dataSource|rows|items|options)=\{\s*\[\s*\{")),
    ("const-sample", re.compile(r"const\s+(?:mock|MOCK|fake|FAKE|sample|SAMPLE|dummy|DUMMY|demo|DEMO)\w*\s*[:=]")),
    ("random", re.compile(r"Math\.random\(\)")),
    ("fake-delay", re.compile(r"new Promise\(\s*(?:r|res|resolve)\s*=>\s*setTimeout\(")),
    ("alert", re.compile(r"(?<![.\w])alert\(")),
    ("console-only", re.compile(r"=>\s*\{?\s*console\.log\([^)]*\)\s*;?\s*\}?\s*[,}\)]")),
    ("href-hash", re.compile(r"href=[\"']#[\"']")),
]
BE_RULES = [
    ("501", re.compile(r"StatusCode\(501|Status501NotImplemented|NotImplementedException")),
    ("completed-task", re.compile(r"return Task\.CompletedTask;|=>\s*Task\.CompletedTask;")),
    ("from-result-stub", re.compile(r"Task\.FromResult\(\s*(?:true|new List<[^>]+>\(\)|new \w+Dto\s*\(\)|Array\.Empty|Enumerable\.Empty|0|\"\"|string\.Empty)\s*\)")),
    ("random", re.compile(r"new Random\(|Random\.Shared")),
    ("fake-person", re.compile(r"Nguy[eễ]n V[aă]n [AB]\b|Tr[aầ]n Th[iị] B\b|\"BS\. [A-Z]")),
    ("todo", re.compile(r"//\s*(?:TODO|FIXME|STUB|HACK)\b")),
    ("hardcoded-guid", re.compile(r"Guid\.Parse\(\"[0-9a-f-]{36}\"\)")),
    ("mock-type", re.compile(r"\b(?:Mock|Fake|Stub|InMemory)\w*(?:Service|Client|Gateway|Provider)\b")),
    ("simulate", re.compile(r"(?:simulat|gi[aả] l[aậ]p|\bmô phỏng)", re.I)),
]


def scan(root, rules, exts, skip_dirs):
    out = []
    for dp, dns, fs in os.walk(root):
        dns[:] = [d for d in dns if d not in skip_dirs]
        for f in fs:
            if not f.endswith(exts) or f.endswith((".test.ts", ".test.tsx", ".spec.ts")):
                continue
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, root).replace("\\", "/")
            if only and not any(o in rel.lower() for o in only):
                continue
            try:
                lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
            except OSError:
                continue
            for i, line in enumerate(lines, 1):
                for name, rx in rules:
                    if rx.search(line):
                        out.append((rel, i, name, line.strip()[:140]))
    return out


if args.fe:
    hits = scan(os.path.join(FE, "modules"), FE_RULES, (".tsx", ".ts"), {"__tests__"})
    print(f"== FE candidates: {len(hits)} ==")
    byfile = {}
    for rel, ln, name, txt in hits:
        byfile.setdefault(rel, []).append((ln, name, txt))
    for rel in sorted(byfile, key=lambda r: -len(byfile[r])):
        print(f"\n{rel}  ({len(byfile[rel])})")
        for ln, name, txt in byfile[rel]:
            print(f"  {ln:>5}  {name:<15} {txt}")

if args.be:
    hits = scan(BE, BE_RULES, (".cs",), {"DevData", "Migrations", "obj", "bin", "exports", "Tests"})
    hits = [h for h in hits if "DatabaseSeeder" not in h[0] and "Seed" not in h[0].split("/")[-1]]
    print(f"\n== BE candidates: {len(hits)} ==")
    for rel, ln, name, txt in sorted(hits, key=lambda h: (h[2], h[0])):
        print(f"{name:<16} {rel}:{ln}  {txt}")
