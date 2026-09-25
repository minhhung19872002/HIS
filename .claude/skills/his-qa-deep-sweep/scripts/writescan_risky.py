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
