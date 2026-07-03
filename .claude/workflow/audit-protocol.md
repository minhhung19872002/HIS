# AUDIT PROTOCOL — anti agent/AI "overstatement" when reviewing/auditing

> **ROOT CAUSE of "overstatement"** (reproduced twice within session 2026-06-13 — even in my own `.claude/lint.sh`):
> when auditing, the harness **rewards QUANTITY + CERTAINTY, not VERIFIED-CORRECTNESS**. Specifically:
> a "minimum N findings" quota + a "ASSUME there are bugs" framing + a schema forcing a non-empty `findings[]` + **missing
> confidence/evidence fields** + **no false-positive penalty** → the agent fabricates/inflates to meet the quota, stating
> inference/assumption as fact. MANDATORY for every audit/review/red-team task.

## 6 anti-overstatement rules (MANDATORY)

1. **NO findings-count quota.** Ban "minimum N findings". State clearly: **"0 findings is a VALID result if it's clean; quality > quantity; false-positives lose points."**
2. **Every finding MUST carry REAL VERIFY EVIDENCE** — quote the **output of the command you ran** (grep/ls/cat) as proof, NOT just an assertion. Haven't run the command → you may NOT say "grep = 0" / "the file doesn't exist".
3. **Mandatory classification: Fact / Inference / Assumption / Speculation.** Only a `Fact` (with command evidence) counts as a FINDING; the rest are labeled **HYPOTHESIS (needs verification)** — do NOT mix them into findings.
4. **The audit schema MUST have 2 fields:** `evidence_command` (the command + output you ran) + `confidence` (high/med/low). Missing evidence → confidence ≤ low → push it to "needs verification", not a finding.
5. **BALANCED adversarial verify:** "assume there are bugs" goes with "but EVERY claim must be grep-verified + quote the output; if you can't verify it, it's a hypothesis, NOT a bug".
6. **Verification pass (self-critique):** before submitting, re-review each finding: *"did I actually RUN the proving command? is the command's path/assumption correct?"* (lint each false-positive from a wrong memory path / self-scanning — always check the tool's own assumptions).

## When running an audit Workflow (correct prompt + schema)
```
MANDATE: Find problems WITH EVIDENCE. 0 findings = OK if clean. NO quota. False-positives penalized.
Each finding: run a verify command (grep/ls), QUOTE the output into evidence_command. Not verified -> HYPOTHESIS.
SCHEMA findings[]: {severity, location, issue, evidence_command (real cmd+output), confidence(high|med|low), impact, fix}
+ hypotheses[] (not verified, to be checked) SEPARATE from findings[].
```

## Cross-ref
- Requirement coverage (file-level manifest): [`requirement-coverage.md`](requirement-coverage.md) — same "verify, don't trust" philosophy.
- Verify before asserting: skill `core-verify-before-assert`. Registry: [`../REGISTRY.md`](../REGISTRY.md).
