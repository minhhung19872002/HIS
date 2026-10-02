"""RISKY route-segment list shared by writescan.py and writeauthz.py."""
RISKY = ["seed", "populate", "dev", "reset", "purge", "wipe", "truncate", "clear", "migrat", "restart", "shutdown",
         "backup", "restore", "rotate", "revoke", "password", "logout", "login", "2fa", "totp", "otp", "webauthn",
         "sign", "pkcs", "send", "email", "sms", "notify", "zalo", "webhook", "ipn", "sync", "push", "hl7", "mpps",
         "import", "upload", "print", "batch", "bulk", "delete-all", "all", "repair", "recalc", "rebuild", "reindex",
         "cache", "merge", "split", "anonymize", "erase", "gdpr", "health", "tts", "ai", "queue", "worker", "job",
         # round 6/7: these acted on an empty body (code blue, auto-archive, EMR close, emergency register, ...)
         "activate", "code-blue", "archive", "close", "acquire", "generate", "submit", "expire", "retry",
         "call-next", "issue", "register", "collect", "unlock"]

# Round 11: substring deny-list that NO write-capable scan may ever call, whatever the flags. The token regex
# above missed "central-signing" / "signing-roles" (sign+ing) and a scan overwrote the signature appearance config.
# User order 2026-09-25: never touch digital signature (ký số) — keep this list broad.
FORBIDDEN_SUBSTR = ["sign", "certificate", "webauthn", "biometric", "hsm", "pkcs", "vgca", "usb-token", "cert/"]


def is_forbidden(path):
    low = path.lower()
    return any(s in low for s in FORBIDDEN_SUBSTR)


# Round 13: "replace-all" child-collection routes. A PUT/POST here deletes the current children and inserts the
# body — bodyfuzz's [] baseline wiped a role's permissions and its 1000-item array replaced an analyzer's test
# mappings / a test's reference ranges. Scans skip them (and any top-level-array body) unless --include-replace.
REPLACE_ALL = ["mappings", "items", "parameters", "members", "permissions", "roles", "configs", "settings",
               "reference-ranges", "critical-values", "norms", "details", "lines", "children", "assignments"]


# Round 13: substrings a value-fuzzing scan must never write to — global switches / gateway config (one write
# changes the whole deployment: enabled-modules [] hid LIS/CDHA/BHYT; bhxh-config/dqgvn got 5000-char values) and
# outbound or alarm actions the RISKY token regex misses ("resubmit" ≠ "submit", "test-connection", "broadcast").
NO_FUZZ_SUBSTR = ["resubmit", "test-connection", "test-auth", "broadcast", "bhxh-config", "dqgvn", "de-an-06",
                  "enabled-modules", "/config", "national-prescription/", "mci/", "hie/", "fhir/",
                  "callback", "mark-expired"]


def is_no_fuzz(path):
    low = path.lower()
    return any(s in low for s in NO_FUZZ_SUBSTR) and not low.rstrip("/").endswith("/search")


def is_replace_all(path, body_schema=None):
    """True when the route's LAST static segment is a replace-all collection, or the JSON body is a top-level array."""
    last = [s for s in path.lower().rstrip("/").split("/") if s and not s.startswith("{")]
    if last and last[-1] in REPLACE_ALL:
        return True
    return bool(body_schema) and body_schema.get("type") == "array"
