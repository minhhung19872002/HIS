# Execution output — 3 modes + triggers + safety checklist

## The 3-mode table
| Mode | When | Shows |
|---|---|---|
| **CONCISE** (default) | a normal task | a summary of action groups, high-level progress; NO raw logs / temp paths / probe dumps / per-command traces / background-task poll |
| **AUTO-EXPAND** | auto on when a failure trigger occurs | the exact failing command + the stderr/stdout relevant to the root cause + an action summary |
| **DEBUG** | user explicitly enables / needs deep troubleshooting / user asks for raw logs | full command trace + full shell output + background-task log + probe log |

## Triggers that auto-switch to AUTO-EXPAND
- build failed
- test failed
- command exit ≠ 0
- migration failed
- git conflict
- timeout
- runtime error
- security-sensitive op
- user explicitly asks for detail

When expanding: only log relevant to the root cause, avoid irrelevant logs, include an actionable summary.

## Reporting code changes — collapse the diff by default
By default ONLY summarize: which files · what changed (high level) · why. Do NOT print the full diff per file.
Expand the full diff only when: the user asks · a large/risky refactor · security/auth · migration/schema ·
a destructive op · debug/review · build/test fail.

## "ALWAYS SURFACE even when CONCISE" checklist (safety override)
- [ ] Deleting a file / folder (`rm`, mass delete)
- [ ] `git reset --hard`, force-push, rebase, revert, delete branch
- [ ] Migration / drop / truncate / seed DB; schema change
- [ ] Install / uninstall a package (npm, nuget, pip…)
- [ ] Change an env var / secret / sensitive config
- [ ] Permission / security warning
- [ ] Any hard-to-reverse / destructive op

## Safety invariants (never violate)
1. Do not hide critical errors.
2. Do not fake progress.
3. Do not claim success without verifying (exit code / real result).
4. Always show dangerous ops + security warnings.
