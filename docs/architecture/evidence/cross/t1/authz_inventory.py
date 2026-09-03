"""Static authorization inventory of every HIS API action.

Walks backend/src/HIS.API/Controllers, resolves the effective guard of each action:
class-level [Authorize]/[Authorize(Roles=...)]/[RequirePermission]/[AllowAnonymous]
combined with method-level overrides. Emits JSON rows
{controller, route, method, guard, roles[], permissions[]} — the "expected" side of
the T1 role x endpoint matrix, later checked live against a running API.
"""
import json, os, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = r"D:\Source\HIS\backend\src\HIS.API\Controllers"

# one level of nested brackets so [Route("api/[controller]")] keeps its token
ATTR_RE = re.compile(r'^\s*\[(Authorize|AllowAnonymous|RequirePermission|Route|Http(Get|Post|Put|Delete|Patch))\b((?:[^\[\]]|\[[^\]]*\])*)\]', re.M)
ROLES_RE = re.compile(r'Roles\s*=\s*(.+)')
CONST_RE = re.compile(r'RoleNames\.(\w+)')

# RoleNames constants -> literal values
rn_src = open(r"D:\Source\HIS\backend\src\HIS.Core\Constants\RoleNames.cs", encoding="utf-8").read()
RN = dict(re.findall(r'public const string (\w+)\s*=\s*"([^"]*)"', rn_src))

def parse_roles(expr):
    out = []
    for c in CONST_RE.findall(expr):
        out.append(RN.get(c, c))
    for lit in re.findall(r'"([^"]+)"', expr):
        out += [x.strip() for x in lit.split(',') if x.strip()]
    return out

def parse_perm(expr):
    m = re.search(r'\(\s*([\w\.]+)\s*\)', expr)
    return [m.group(1).replace('PermissionCatalog.', '')] if m else []

def class_blocks(src):
    # only controller classes own actions; DTO classes declared in the same file are skipped
    classes = list(re.finditer(r'^\s*public\s+(?:partial\s+)?class\s+(\w+Controller)', src, re.M))
    for ci, cm in enumerate(classes):
        cstart = cm.start(); cend = classes[ci+1].start() if ci+1 < len(classes) else len(src)
        # class attributes = the run of [..] lines directly above the declaration, skipping
        # blank lines and /// or // comments; stop at the first line of real code
        kept = []
        for line in reversed(src[:cstart].split('\n')[-80:]):
            t = line.strip()
            if not t or t.startswith('//') or t.startswith('///') or t.startswith('*') or t.startswith('/*'):
                continue
            if t.startswith('['):
                kept.append(line); continue
            break
        head = '\n'.join(reversed(kept))
        yield cm.group(1), head, src[cstart:cend]

# pass 1: class-level attributes merged across partial files (the [Route]/[Authorize] on the
# class usually live in the main file, the .PartN.cs files carry none)
CLASS = {}
files = {}
for fn in sorted(os.listdir(ROOT)):
    if not fn.endswith('.cs'): continue
    src = open(os.path.join(ROOT, fn), encoding='utf-8', errors='replace').read()
    files[fn] = src
    for cname, head, _ in class_blocks(src):
        c = CLASS.setdefault(cname, {'route': '', 'guard': 'none', 'roles': [], 'perms': []})
        for kind, _, expr in ATTR_RE.findall(head):
            if kind == 'Route':
                m = re.search(r'"([^"]*)"', expr)
                if m and not c['route']: c['route'] = m.group(1)
            elif kind == 'AllowAnonymous': c['guard'] = 'anonymous'
            elif kind == 'Authorize':
                rm = ROLES_RE.search(expr)
                if rm: c['guard'] = 'roles'; c['roles'] += parse_roles(rm.group(1))
                elif c['guard'] == 'none': c['guard'] = 'auth'
            elif kind == 'RequirePermission':
                c['guard'] = 'permission' if c['guard'] != 'roles' else c['guard']; c['perms'] += parse_perm(expr)

rows = []
for fn, src in files.items():
    for cname, _, body in class_blocks(src):
        c = CLASS[cname]
        croute, cguard, croles, cperms = c['route'], c['guard'], c['roles'], c['perms']
        croute = croute.replace('[controller]', cname.replace('Controller', ''))
        # actions: attribute blocks followed by a method signature
        for am in re.finditer(r'((?:^\s*\[[^\]\n]*\]\s*\n)+)\s*public\s+(?:async\s+)?[\w<>\[\],\.\?]+\s+(\w+)\s*\(', body, re.M):
            attrs = ATTR_RE.findall(am.group(1))
            http = None; sub = ''; guard = None; roles = []; perms = []
            for kind, verb, expr in attrs:
                if kind.startswith('Http'):
                    http = verb.upper(); m = re.search(r'"([^"]*)"', expr); sub = m.group(1) if m else ''
                elif kind == 'AllowAnonymous': guard = 'anonymous'
                elif kind == 'Authorize':
                    rm = ROLES_RE.search(expr)
                    if rm: guard = 'roles'; roles += parse_roles(rm.group(1))
                    elif guard is None: guard = 'auth'
                elif kind == 'RequirePermission':
                    perms += parse_perm(expr); guard = guard or 'permission'
            if not http: continue
            if sub.startswith('/') or sub.startswith('api/'): route = sub.lstrip('/')
            else: route = (croute.rstrip('/') + '/' + sub).strip('/') if sub else croute.strip('/')
            route = '/' + route
            # effective guard: method-level overrides class-level; class roles + method roles both apply (AND)
            eff = guard or cguard
            eff_roles = roles if roles else croles
            eff_perms = list(dict.fromkeys(cperms + perms))
            if eff == 'auth' and (croles and not roles): eff = 'roles'; eff_roles = croles
            if eff_perms and eff != 'anonymous': eff = 'permission+roles' if eff_roles else 'permission'
            rows.append({'file': fn, 'controller': cname, 'method': http, 'route': route, 'action': am.group(2),
                         'guard': eff, 'roles': eff_roles, 'permissions': eff_perms})

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'authz_inventory.json')
json.dump(rows, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print('actions:', len(rows)); print(Counter(r['guard'] for r in rows))
print('distinct roles referenced:', len({x for r in rows for x in r['roles']}))
print('written', out)
