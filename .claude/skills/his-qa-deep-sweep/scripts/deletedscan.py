"""Soft-delete leak sweep: collect the ids of every soft-deleted row in the DB, read every GET (lists at page
size 200 and {id} routes with the deleted ids themselves) and flag responses that still carry a deleted id.

usage: python deletedscan.py --base http://localhost:5107 --deleted deleted.txt [--swagger swagger.json]
deleted.txt = one line per row `<Table>\t<Id>` — produce it with the sqlcmd batch in --sql (prints T-SQL).

EF's global IsDeleted filter covers plain queries; `IgnoreQueryFilters()`, raw SQL, projections through
navigation properties on the *other* side of a relation and hand-written reports bypass it, so a cancelled
prescription or a merged patient keeps appearing in lists, pickers and printouts. Verdicts:
  BYID   GET /x/{id} with a deleted id answers 200 (should be 404)
  LIST   a list/report response contains a deleted id (only ids of tables whose name matches the route are
         reported as LIST-STRONG; others as LIST-WEAK — those are often legitimate references)
"""
import argparse
import collections
import concurrent.futures
import json
import re

from _common import load_swagger, login, req

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="http://localhost:5107")
ap.add_argument("--swagger")
ap.add_argument("--deleted")
ap.add_argument("--sql", action="store_true", help="print the T-SQL that lists deleted ids and exit")
args = ap.parse_args()

if args.sql:
    print("""SET NOCOUNT ON;
DECLARE @s nvarchar(max) = N'';
SELECT @s += N'SELECT ''' + t.name + N''' AS T, CAST(Id AS nvarchar(40)) AS Id FROM [' + t.name + N'] WHERE IsDeleted = 1 UNION ALL '
FROM sys.tables t JOIN sys.columns c ON c.object_id = t.object_id AND c.name = 'IsDeleted'
JOIN sys.columns i ON i.object_id = t.object_id AND i.name = 'Id';
SET @s = LEFT(@s, LEN(@s) - 10);
EXEC sp_executesql @s;""")
    raise SystemExit

SKIP = ["download", "stream", "wado", "dicom", "export", "pdf", "sse", "hub", "swagger", "dev/", "audit", "history",
        "deleted", "trash", "recycle", "merge", "log"]
GUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")

deleted = {}
for line in open(args.deleted, encoding="utf-8", errors="replace"):
    parts = re.split(r"\s+", line.strip())
    if len(parts) >= 2 and GUID.fullmatch(parts[-1]):
        deleted[parts[-1].lower()] = parts[0]
print("deleted ids", len(deleted), "tables", len(set(deleted.values())))


def norm(s):
    return re.sub(r"[^a-z]", "", s.lower()).rstrip("s")


by_table = collections.defaultdict(list)
for i, t in deleted.items():
    by_table[norm(t)].append(i)

token = login(args.base)
spec = load_swagger(args.base, args.swagger)

targets = []
for path, ops in spec["paths"].items():
    low = path.lower()
    if "get" not in ops or any(s in low for s in SKIP):
        continue
    op = ops["get"]
    segs = [norm(s) for s in re.split(r"[/{}]", path.replace("api/", "")) if s and not s.startswith("v")]
    match = next((s for s in segs if s in by_table), None)
    ids = re.findall(r"\{([^}]+)\}", path)
    if len(ids) == 1:
        # the deleted id must be for the thing the parameter names: {examinationId} ↔ Examinations,
        # {id} ↔ the last resource segment before it; anything else is a meaningless probe
        pname = norm(ids[0].replace("Id", "").replace("id", "")) if ids[0].lower() != "id" else None
        if pname is None:
            before = path.split("{" + ids[0] + "}")[0]
            segs_b = [norm(s) for s in before.strip("/").split("/") if s and s != "api"]
            pname = segs_b[-1] if segs_b else None
        match = pname if pname in by_table else None
        if match:
            for did in by_table[match][:2]:
                targets.append(("BYID", path, path.replace("{" + ids[0] + "}", did), match))
    elif not ids:
        q = [f"{p['name']}=200" for p in op.get("parameters", []) if p.get("in") == "query"
             and p["name"].lower() in ("pagesize", "limit", "take", "size")]
        targets.append(("LIST", path, path + ("?" + "&".join(q) if q else ""), match))


def run(t):
    kind, path, url, match = t
    st, b = req("GET", args.base + url, token=token)
    if st != 200:
        return None
    if kind == "BYID":
        # an empty sub-list / null for a deleted parent is fine; data coming back is the leak
        try:
            j = json.loads(b)
            if isinstance(j, dict) and "data" in j and ("success" in j or "message" in j):
                j = j["data"]
        except Exception:
            j = b
        if j in (None, [], {}, "", 0, False) or (isinstance(j, dict) and all(v in (None, [], {}, 0, False, "") for v in j.values())):
            return None
        return ("BYID", path, f"{match} deleted id -> 200 with data")
    hits = {g.lower() for g in GUID.findall(b.decode("utf-8", "replace"))} & set(deleted)
    if not hits:
        return None
    tables = collections.Counter(deleted[h] for h in hits)
    strong = [t for t in tables if norm(t) == match]
    return ("LIST-STRONG" if strong else "LIST-WEAK", path, ", ".join(f"{t}×{n}" for t, n in tables.most_common(4)))


with concurrent.futures.ThreadPoolExecutor(6) as ex:
    res = [r for r in ex.map(run, targets) if r]
print("checked", len(targets), collections.Counter(r[0] for r in res).most_common())
for kind, path, info in sorted(res):
    print(f"{kind:<12} GET {path}  {info}")
