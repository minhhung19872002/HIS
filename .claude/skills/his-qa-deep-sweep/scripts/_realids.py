"""Real-record id lookup shared by bodyfuzz.py / auditscan.py (stdlib only).

writescan.py only ever sends zero GUIDs, so a PUT/PATCH {id} route answers 404 before the body is looked at.
These helpers fetch a handful of REAL ids (patient / department / user / medicine) from list routes, and guess
the entity behind a `{id}` path param by GETting the list route with the same prefix (cached per prefix).
Record choice: prefer an older QA test record (text contains "QA-R1" but not the current round "QA-R13"),
otherwise the LAST item of the list — least likely to be the record another agent is driving right now.
"""
import json
import re

from _common import req

ZERO = "00000000-0000-0000-0000-000000000000"
GUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

# well-known list routes → (response field holding the id)
SEED_LISTS = {
    "patient": ("/api/reception/patients/search?keyword=a", "patientId"),
    "department": ("/api/catalog/departments", "id"),
    "user": ("/api/admin/users", "id"),
    "medicine": ("/api/catalog/medicines", "id"),
}


def _unwrap(j):
    """Envelope {success,data} → data; paged {items|data|results|list} → the list."""
    if isinstance(j, dict) and "data" in j and ("success" in j or len(j) <= 5):
        j = j["data"]
    if isinstance(j, dict):
        for k in ("items", "data", "results", "list", "value", "records", "rows"):
            if isinstance(j.get(k), list):
                return j[k]
        return []
    return j if isinstance(j, list) else []


def _pick(items):
    if not items:
        return None
    dicts = [x for x in items if isinstance(x, dict)]
    if not dicts:
        return None
    for it in dicts:
        s = json.dumps(it, ensure_ascii=False)
        if "QA-R1" in s and "QA-R13" not in s:
            return it
    return dicts[-1]


def _id_of(item, field="id"):
    if not isinstance(item, dict):
        return None
    for k in (field, "id", "Id"):
        v = item.get(k)
        if isinstance(v, str) and GUID_RE.match(v) and v != ZERO:
            return v
    for k, v in item.items():
        if k.lower().endswith("id") and isinstance(v, str) and GUID_RE.match(v) and v != ZERO:
            return v
    return None


def seed_ids(base, token):
    """{'patient': guid, 'department': guid, 'user': guid, 'medicine': guid} — ZERO when a list is empty."""
    out = {}
    for kind, (route, field) in SEED_LISTS.items():
        st, b = req("GET", base + route, token=token)
        try:
            items = _unwrap(json.loads(b)) if 200 <= st < 300 else []
        except Exception:
            items = []
        if kind == "medicine":  # earlier sweeps left blank medicines behind — prefer one with a code
            items = [x for x in items if isinstance(x, dict) and (x.get("code") or "")] or items
        out[kind] = _id_of(_pick(items), field) or ZERO
    return out


class PathIdResolver:
    """Replace `{id}`-style path params with a real id of the entity the route prefix lists."""

    def __init__(self, base, token, spec):
        self.base, self.token = base, token
        self.gets = {p.lower(): p for p, ops in spec["paths"].items() if "get" in ops and "{" not in p}
        self.cache = {}

    def list_id(self, prefix):
        """prefix = route path up to the first `{` (no trailing slash). Walks up one segment if needed."""
        prefix = prefix.rstrip("/").lower()
        candidates = [prefix, prefix.rsplit("/", 1)[0]] if prefix.count("/") > 2 else [prefix]
        for c in candidates:
            if c in self.cache:
                return self.cache[c]
            if c not in self.gets:
                continue
            st, b = req("GET", self.base + self.gets[c], token=self.token)
            rid = None
            if 200 <= st < 300:
                try:
                    rid = _id_of(_pick(_unwrap(json.loads(b))))
                except Exception:
                    rid = None
            self.cache[c] = rid
            if rid:
                return rid
        return None

    def fill(self, path, op, real_actions=False):
        """→ (url, used_real_id: bool). Non-uuid params get 1 / "x".
        A real id is only used for a plain update route (path ENDS with the param). Action sub-routes
        (`/{id}/cancel`, `/lock`, `/approve`, `/complete`, `/remove`…) get the zero GUID unless real_actions:
        round 13 showed they move real records (cancelled an e-invoice, locked a real warehouse)."""
        url, real = path, False
        plain_update = path.rstrip("/").endswith("}")
        for p in re.findall(r"\{([^}]+)\}", path):
            sch = next((x for x in op.get("parameters", []) if x["name"] == p), {}).get("schema", {})
            if sch.get("format") == "uuid" or p.lower().endswith("id"):
                if not (plain_update or real_actions):
                    url = url.replace("{" + p + "}", ZERO)
                    continue
                rid = self.list_id(path.split("{" + p + "}")[0])
                v = rid or ZERO
                real = real or bool(rid)
            elif sch.get("type") in ("integer", "number"):
                v = "1"
            else:
                v = "x"
            url = url.replace("{" + p + "}", v)
        return url, real
