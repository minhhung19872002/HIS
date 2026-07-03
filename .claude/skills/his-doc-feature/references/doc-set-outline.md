# Outline of the 6 files — docs/features/<feature>/

The standard heading frame (taken from nangcap23/nangcap24). Copy + fill with real content.
> NOTE: the headings below are shown in English as a structural guide. In the actual feature doc, render the headings in Vietnamese (the feature docs are written in Vietnamese, per `his-doc-feature` "Language").

## README.md
```
# <Feature> — <Package/tender name> (<gap/feature count>)
## Overview          (table: # | Gap/Feature | Route/Component | Backend)
## Production-readiness  (table: component | status)
## Architecture      (ASCII diagram: Controller → Service → Infrastructure)
## Environment config    (appsettings / env / Cloud Run)
## Files             (Backend / Frontend / Tests / Docs)
## Known risks       (table: point | level | note)   ← IMPORTANT, honest
## Prod deploy status
## Commit / Release reference
```

## analysis.md
```
# <Feature> — Source Code Analysis
> Purpose / Source / Related docs / Last updated
## 1. Upgrade scope
## 2. Changes by architecture layer   (table: layer | file | change)
## 3. Entity / Schema                 (table: entity | DB table | status field)
## 4. DTO / Request / Response
## 5. Service Interface + Implementation
## 6. Controller / API                (table: endpoint | route | auth)
## 7. New business logic
## 8. Validation rules
## 9. External Integration
## 11. Frontend — Route + UI
## 12. Implemented vs not-yet functions
## 17. TODO / FIXME / Latent risks     (table: R1..Rn | level | recommendation)
## 18. Commit references
```

## test-plan.md
```
# <Feature> — Consolidated Test Plan
> Purpose / Audience / Test runner / Special notes (e.g. 500 vs 400 errors)
## 1. Function ↔ API ↔ Test summary table
## 2. Per-function test plan
   ### 2.x <Function>
       Related module / Business description / Related API / Test conditions /
       Test data / Test cases (table TC-XXX-NNN | Case | Body | Expected) /
       Edge cases / Regression impact
## 3. Test flow in order (smoke / regression / integration / E2E)
## 4. Pre-release checklist (build / migration / env / security / permission / perf / monitoring / rollback)
## 5. Test data to prepare
```

## test-guide.md
```
# <Feature> — QA Test Guide
> Prerequisites (backend 5106 / frontend 3001 / test accounts / specifics)
## 1. Overview
## 2. Related modules list (table: menu | route)
## 3. Screens to test (each screen: checklist + "to verify" + API)
## 4. Business flows to verify
## 5. Validation cases (table: endpoint | field | rule | expected)
## 6. Permissions to test (table: endpoint | role | test case)
## 7. External gateway / infrastructure to verify
## 8. Regression impact — dependent modules
## 9. Screens with dependencies
## 10. Test commands
## 11. Production checklist
```

## workflow-test.md
```
# <Feature> — HIS Workflow Test, UI Matrix & Dependency
> Purpose / Scope / Source (read the source, no guessing)
## 1. Module + real URL
## 2. <Feature> Workflow Test
   ### 2.x <Flow>: table Step | Action | Role | Status before/after | API | side effect
## 3. Module Dependency Map (READ / WRITE / CALL / regression area)
## 4. UI Test Matrix
## 5. Critical Medical/Financial/Legal Risk Test
## 6. Integration Test
## 7. Concurrent / Multi-user / Transaction Test
## 8. Mapping UI → Component → API → Service → DB → Integration (table per page)
## 9. Role-based Access Test (endpoint × role matrix)
## 10. Regression Priority (Critical / High / Medium / Low)
```

## summary.md
```
# <Feature> — Doc Summary + Module Impact
## 1. The doc set (table: 6 files | role | audience)
## 2. Mapping function ↔ API ↔ Service ↔ Entity ↔ Test ↔ Page (large table)
## 3. Module impact ranking (new / existing affected / cross-cut / not affected)
## 4. Source files changed/added (Backend / Frontend / Test)
## 5. Comparison with the prior package (criteria table)
## 6. Quick-reference checklist for QA
## 7. Outstanding items (block / nice-to-have / external dependency / risk)
## External links + Commit reference
```

> Every file: add a "## Related documents" block linking the other 5 files + "## Commit reference".
