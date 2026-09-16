"""Shared helpers for the HIS QA sweep scans (stdlib only)."""
import json
import os
import re
import sys
import urllib.error
import urllib.request

# Windows console defaults to cp1252 → Vietnamese error messages crash print()
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
FE = os.path.join(REPO, "frontend", "src")
BE = os.path.join(REPO, "backend", "src")


def req(method, url, body=None, token=None, timeout=90):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # network error
        return -1, str(e).encode()


def login(base, user="admin", password="Admin@123"):
    _, b = req("POST", base + "/api/auth/login", {"username": user, "password": password})
    j = json.loads(b)
    return (j.get("data") or {}).get("token") or j.get("token")


def load_swagger(base, path=None):
    if path and os.path.exists(path):
        return json.load(open(path, encoding="utf-8"))
    _, b = req("GET", base + "/swagger/v1/swagger.json")
    return json.loads(b)


def norm_route(p):
    p = p.split("?")[0].rstrip("/").lower()
    return re.sub(r"\{[^}]+\}", "{}", p)


def is_v1(path):
    return path.startswith(os.path.join(FE, "pages") + os.sep)
