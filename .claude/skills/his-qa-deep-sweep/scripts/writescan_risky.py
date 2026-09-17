"""RISKY route-segment list shared by writescan.py and writeauthz.py."""
RISKY = ["seed", "populate", "dev", "reset", "purge", "wipe", "truncate", "clear", "migrat", "restart", "shutdown",
         "backup", "restore", "rotate", "revoke", "password", "logout", "login", "2fa", "totp", "otp", "webauthn",
         "sign", "pkcs", "send", "email", "sms", "notify", "zalo", "webhook", "ipn", "sync", "push", "hl7", "mpps",
         "import", "upload", "print", "batch", "bulk", "delete-all", "all", "repair", "recalc", "rebuild", "reindex",
         "cache", "merge", "split", "anonymize", "erase", "gdpr", "health", "tts", "ai", "queue", "worker", "job",
         # round 6/7: these acted on an empty body (code blue, auto-archive, EMR close, emergency register, ...)
         "activate", "code-blue", "archive", "close", "acquire", "generate", "submit", "expire", "retry",
         "call-next", "issue", "register", "collect", "unlock"]
