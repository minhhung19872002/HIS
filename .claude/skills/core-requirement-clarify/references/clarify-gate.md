# The ASK vs DECIDE decision gate + question templates

## Decision gate (run for each unknown that affects the result)

```
This unknown…
├─ Can I verify it myself via Read/Grep?  → do NOT ask the user; verify (core-verify-before-assert).
├─ Has an obvious default + verifiable?   → DECIDE, record "Assumption: ...".
└─ Meets ≥1 of the following → ASK THE USER:
     • changes important behavior/result
     • hard to reverse (delete/overwrite/breaking migration)
     • ≥2 interpretations lead to different results
     • touches patient-safety / legal / money
```

## Batched-question template (1–2 questions, each 2–4 options + a recommendation)

> I need to settle a few points before doing [X]:
> 1. [Unknown A]? — (a) … *(recommended)* / (b) … / (c) …
> 2. [Unknown B]? — (a) … / (b) …

Prefer the `AskUserQuestion` tool (options + recommended first). Batch as much as possible, do NOT ask piecemeal.

## "Settled assumptions" template (when proceeding)

> Settled assumptions (correct me if wrong):
> - [Unknown A] → chose … because … (verified at `path`).
> - [Unknown B] → follows precedent … .
> Proceeding: …
