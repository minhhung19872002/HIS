"""Implicitly-required [FromBody] DTO properties (<Nullable>enable, no SuppressImplicitRequired...).

A non-nullable `string` / `List<>` / `*Dto` property WITHOUT an initializer is [Required] for MVC model
validation: when the FE omits the key or sends null the API answers 400 "The X field is required.".
usage: python reqscan.py            → prints DTOs used as [FromBody] with such properties (most first)
Only a hint: fix a property (make it `string?`) after checking the FE payload and that service/entity accept null.
"""
import collections
import os
import re

from _common import BE

classes = {}
for root, _, files in os.walk(BE):
    if f"{os.sep}bin" in root or f"{os.sep}obj" in root:
        continue
    for f in files:
        if not f.endswith(".cs"):
            continue
        s = open(os.path.join(root, f), encoding="utf-8", errors="replace").read()
        if "#nullable disable" in s:
            continue
        for m in re.finditer(r"public\s+(?:sealed\s+)?(?:partial\s+)?class\s+(\w+)[^{]*\{", s):
            start = m.end()
            nxt = re.search(r"\n\s*(?:public|internal)\s+(?:sealed\s+)?(?:partial\s+)?(?:class|record|enum|interface)\s", s[start:])
            body = s[start:start + (nxt.start() if nxt else len(s) - start)]
            req = re.findall(r"public\s+(string|List<[^>]+>|[A-Z]\w*Dto)\s+(\w+)\s*\{\s*get;\s*set;\s*\}\s*(?!=)", body)
            classes[m.group(1)] = [n for _, n in req]

uses = collections.defaultdict(set)
ctrl = os.path.join(BE, "HIS.API", "Controllers")
for root, _, files in os.walk(ctrl):
    for f in files:
        s = open(os.path.join(root, f), encoding="utf-8", errors="replace").read()
        for m in re.finditer(r"\[FromBody\]\s*(\w+)\??\s+\w+", s):
            uses[m.group(1)].add(f)

rows = sorted(((len(classes[c]), c, sorted(fs)[:2], classes[c][:6]) for c, fs in uses.items() if classes.get(c)), reverse=True)
print(f"FromBody DTOs with implicitly-required props: {len(rows)} of {len(uses)}")
for r in rows:
    print(*r)
