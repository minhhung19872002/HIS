"""Partial-write sweep (static): service methods that call SaveChangesAsync two or more times, or SaveChanges
plus a raw ExecuteSql, without a transaction / execution strategy around them.

usage: python txnscan.py [--min 2] [--only Billing,Pharmacy,Warehouse,...]

The second save failing (FK, unique index, timeout) leaves the first one committed: a receipt without its
ledger line, stock deducted without the dispense row, an admission without the bed assignment. Prioritise
money / stock / clinical-state services; a method that saves twice on purpose (get an id, then link it) still
needs a transaction. Output: file:line  method  saves=N  [+rawsql]  sorted by domain weight.
"""
import argparse
import os
import re

from _common import BE

ap = argparse.ArgumentParser()
ap.add_argument("--min", type=int, default=2)
ap.add_argument("--only", default="")
args = ap.parse_args()

HOT = ["billing", "receipt", "payment", "deposit", "refund", "invoice", "insurance", "pharmacy", "warehouse",
       "inventory", "dispens", "stock", "blood", "inpatient", "admission", "discharge", "surgery", "bed",
       "prescription", "reception", "registration", "examination", "lis", "ris", "lab", "radiology", "emergency"]
METHOD = re.compile(r"^\s*(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?[\w<>\[\],\s\?]+?\s+(\w+)\s*\([^;{]*\)\s*(?:where[^{]*)?\{?\s*$")
TXN = re.compile(r"BeginTransaction|ExecuteInTransaction|CreateExecutionStrategy|TransactionScope|UseTransaction|SqlAppLock|ExecuteAsync\(\s*async")
SAVE = re.compile(r"\.SaveChangesAsync\(|\.SaveChanges\(")
RAW = re.compile(r"ExecuteSqlRaw|ExecuteSqlInterpolated|ExecuteUpdate|ExecuteDelete|ExecuteSqlAsync")

root = os.path.join(BE, "HIS.Infrastructure", "Services")
only = [x.strip().lower() for x in args.only.split(",") if x.strip()]
rows = []
for dp, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith(".cs") or "DevData" in dp or "Seed" in f:
            continue
        p = os.path.join(dp, f)
        if only and not any(o in p.lower() for o in only):
            continue
        lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
        # split into methods by brace depth
        i = 0
        while i < len(lines):
            m = METHOD.match(lines[i])
            if not m:
                i += 1
                continue
            name, start, depth, j, body = m.group(1), i, 0, i, []
            opened = False
            while j < len(lines):
                body.append(lines[j])
                depth += lines[j].count("{") - lines[j].count("}")
                if "{" in lines[j]:
                    opened = True
                if opened and depth <= 0:
                    break
                j += 1
            text = "\n".join(body)
            saves = len(SAVE.findall(text))
            raw = len(RAW.findall(text))
            if (saves >= args.min or (saves >= 1 and raw >= 1)) and not TXN.search(text):
                rel = os.path.relpath(p, BE).replace("\\", "/")
                weight = sum(1 for h in HOT if h in rel.lower() or h in name.lower())
                rows.append((-weight, rel, start + 1, name, saves, raw))
            i = j + 1

rows.sort()
print("methods with multiple saves and no transaction:", len(rows))
for w, rel, ln, name, saves, raw in rows:
    print(f"{rel}:{ln}  {name}  saves={saves}" + (f"  +rawsql={raw}" if raw else "") + (f"  hot={-w}" if w else ""))
