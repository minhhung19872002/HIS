# Impact-analysis checklist (inspect before editing)

## "What hangs off it" to Grep/Read
- [ ] **Callers** that directly use the symbol/function/component.
- [ ] **Consumers in another layer** (FE calls BE / BE depended on by FE) — a cross-tier contract.
- [ ] **Tests** referencing it (unit/e2e/api) — they'll go red if changed.
- [ ] **Migration / seed / schema** if touching the DB.
- [ ] **DI registration** if adding/changing a service (forget = 500).
- [ ] **Config / env / feature flag** related.
- [ ] **Doc / work-log** describing the old behavior (update if needed).

## Change classification
- **Additive / backward-compatible** → safe, preferred.
- **Breaking** (rename/remove/change-type/change-signature) → must update ALL dependents SIMULTANEOUSLY in the same change.

## Typical commands
```
Grep "<symbolName>"            # call sites across the repo
Grep "<route|endpoint>"        # API consumers
Grep "<fieldName>"             # where the DTO/field is mapped (both FE + BE)
Glob "**/*.test.*|**/*.cy.ts"  # related tests
```

## Raise-caution gate
Touching **patient-safety / audit / money / schema / delete-overwrite** → consider asking (`core-requirement-clarify`) before editing.
