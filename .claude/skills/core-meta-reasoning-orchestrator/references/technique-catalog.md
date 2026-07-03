# Technique catalog — short definition + skill-home

The "techniques" in the Dispatch of `core-meta-reasoning-orchestrator` are **NOT separate skills** (avoid skill-junk).
Each: a short definition + where it "lives" (an existing skill-home, if any). Apply inline when the orchestrator dispatches to it.

## Design / Open family
- **Alternative Designs** — generate ≥3 fundamentally different designs through multiple lenses. Home: `core-open-thinking`.
- **Counterargument** — actively build an argument REFUTING your own conclusion. Home: `core-critic` (artifact) / `core-sparring-partner` (the USER's idea).

## Decision family
- **Tradeoff Analysis** — a criteria × options table, stating the gains/losses of each choice, no "free lunch". Home: `core-synthesis-decision`.
- **Base-Rate Thinking** — anchor to the base rate / typical statistics ("how often does approach X win?") before trusting a particular story; counters base-rate-neglect. Home: `core-synthesis-decision`.

## Architecture / Risk family
- **Failure-Mode Analysis** — exhaustively list the failure modes + causes + impact + mitigation (lightweight FMEA). Home: `core-inversion-thinking`.
- **Second-order Effects** — "and then what?" through 2-3 levels: consequences of consequences (e.g. cache → stale → wrong-clinical-decision). Home: `core-critic` (axis 7) / `core-inversion-thinking`.
- **Risk Analysis** — risk × (likelihood, impact) → rank → mitigation/owner/trigger. Home: `core-inversion-thinking` + `core-critic`.
- **Scalability Review** — behavior when load/data grows 10×–100×: hot-path, N+1, connection pool, index, concurrency. Home: `his-be-scalability` (BE) · `his-fe-performance` (FE render/bundle).

## Planning family
- **Dependency Analysis** — build a dependency graph, find a feasible order + critical path + cycles. Home: `core-impact-analysis`.
- **Bottleneck Detection** — find the REAL bottleneck (measure first, don't guess): the slowest stage limits throughput. Home: `his-be-scalability` / `his-fe-performance`.

## Security family (no dedicated skill-home yet → inline; consider creating a skill if it recurs a lot)
- **Red-Team Thinking** — think like an attacker: "how would I break this?" (invert the defensive goal). Close to `core-inversion-thinking`.
- **Attack-Surface Analysis** — list every entry point (input/endpoint/upload/auth/dependency/secret) — where trusted meets untrusted.
- **Threat-Modeling** — light STRIDE (Spoofing/Tampering/Repudiation/Info-disclosure/DoS/Elevation) on each data flow; HIS follows `his-qa-anti-pattern` (audit/patient-safety/secret) + the built-in `security-review`.

## Troubleshooting / Research
- **Hypothesis-Elimination** — invert from symptom to the set of plausible causes, eliminate by cheapest-evidence-first. Home: `core-inversion-thinking` + `core-verify-before-assert`.
- **Source-Triangulation** — ≥2-3 independent sources confirm a claim before trusting it; counters single-source. Home: `core-critic`; deeper → the built-in `deep-research`.

> Rule: a technique here must NOT be backtick-ref'd like a `core-*`/`his-*` skill (lint would report drift). If a
> technique starts recurring across many tasks + is worth packaging → only then propose creating a skill (via `core-skill-authoring`, ask the user to approve).
