# AI MEMORY — Architecture decision log (ADR-lite) + memory index

> The purpose you stated: "a place for Claude to record **architecture decisions**, so it doesn't forget old decisions next time".
> The HIS system already has **2 running memory tiers** — this file does **NOT replace** them; it: (a) **indexes** those 2 tiers so you know
> what to record where, (b) **fills the gap** = an **ADR-lite log** (Architecture Decision Record) for **long-lived
> architecture decisions** — something ephemeral memory doesn't keep.

---

## 1. What to record where (3 persistence mechanisms — don't confuse them)

| Mechanism | Location | Used for | NOT used for |
|---|---|---|---|
| **Global memory** | `C:\Users\pc\.claude\projects\…\memory\` (+ `MEMORY.md` index) | user · feedback · project · reference, **cross-session** | code/architecture derivable from the repo |
| **Per-agent memory** | [`../agent-memory/<agent>/`](../agent-memory/) | each agent's own notes (e.g. Reception DTO quirks) | project-wide decisions |
| **ADR-lite (this file)** | §3 below | **long-lived architecture decisions** + rationale + consequences | ephemeral tasks · fix recipes (already in the commit) |

Anti-duplication rule (per the agent memory spec): **do NOT write to memory** what the repo already records (code structure,
conventions, git history, CLAUDE.md). An architecture decision *why X was chosen over Y* → record an ADR here.

## 2. When to create an ADR
Create an ADR for a **technology/architecture decision with long-lived consequences**, e.g.: choosing a pattern, splitting/merging a module,
changing the migration strategy, adding/removing a library, service boundaries, an external-gateway integration strategy. A small/local
decision → no ADR needed (a clear commit message is enough). After a code change to the architecture → stage
[3]Worker-Doc (`his-docs-manager`) updates the ADR.

**One ADR template (copy when adding):**
```markdown
### ADR-NNN — <decision title>
- Date: YYYY-MM-DD · Status: Proposed | Accepted | Superseded by ADR-MMM
- Context: why a decision is needed (constraints, problem)
- Decision: what was chosen
- Options considered: A / B / C — why rejected
- Consequences: pros · cons · follow-up work · risks
- Links: Issue # · commit · related skill/memory
```

## 3. ADR LOG (newest on top)

> This is the seed. The baseline decisions below are **extracted from the running `CLAUDE.md` + SKILL-MAP** (not
> invented) to give the log a starting point; new ADRs are added above.

### ADR-000 — Baseline decision framework (in effect, extracted from the current system)
- Date: 2026-06-13 · Status: Accepted
- Context: HIS is a multi-year Production system; the priority is *not breaking what runs > theoretically pretty*.
- Baseline decisions (source: `CLAUDE.md`, `SKILL-MAP.md` §5b/§5c):
  - **Keep the stack**: Controller+Service / React+Antd+`_v2kit` / context+local+refetch. **NO** CQRS, MediatR,
    Minimal-API, Next.js, Tailwind-first, Redux/normalized-store, heavy DDD.
  - **Migration**: hand-written idempotent SQL scripts (`Data/Scripts/NN_*.sql`), NO auto `ef migrations`.
  - **FE 2-tier**: v2 (`/v2/*`, `_v2kit`, `ab-*`) is primary; v1 (Antd, MainLayout) is legacy. New feature = v2.
  - **Task board** = GitHub Issues (since 2026-06-13), replacing the workspace-docs backlog.
  - **Quality priority order**: Patient-safety+Correctness+Security → Backward-compat → Readability/Maintainability
    → Scalability (when measured) → Performance (when measured) → Delivery-speed.
- Consequences: any redesign/rewrite proposal that deviates from the stack → must create a new ADR + user approval; default to the current codebase.
- Links: `SKILL-MAP.md` §0b/§5b/§5c · `CLAUDE.md`.

<!-- new ADRs go above this line -->

---

## 4. Links
- Global memory index: `…/memory/MEMORY.md` · Per-agent: [`../agent-memory/`](../agent-memory/)
- Pipeline: [`workflow.md`](workflow.md) · Conventions: [`project-rules.md`](project-rules.md)
- The official feature doc set (different from an ADR): `docs/features/<feature>/` via skill `his-doc-feature`.
