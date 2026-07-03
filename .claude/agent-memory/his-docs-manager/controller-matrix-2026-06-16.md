---
name: controller-matrix-2026-06-16
description: Full controller/API/security matrix for 130 HIS backend controllers — baseline for audits, refactor planning, and API docs
metadata:
  type: project
---

## Controller Matrix Scan (2026-06-16)

**Scan Result:** All 130 backend controllers in `backend/src/HIS.API/Controllers/*.cs` fully cataloged.

**Output Document:** `docs/workspace-docs/10-assessment/ma-tran-controller-api-quyen.md`

### Key Findings

**Scale:**
- 130 controller files → 146 class definitions (nested controllers in 16 files)
- ~2,900 total endpoints (GET/POST/PUT/DELETE/PATCH)
- 22.3 avg endpoints per controller
- Range: 1–219 endpoints (RISCompleteController dominates)

**Security Posture:**
- ✅ 0 controllers with class-level `[Authorize]` → all anonymous mode (rely on per-endpoint guards)
- ✅ 0 anonymous POST/PUT/DELETE endpoints (safe)
- ✅ 14 controllers with method-level `[AllowAnonymous]` — all read-only or intentional (auth portal, webhook callbacks)
- ✅ 36 controllers (27.7%) have role guards `[Authorize(Roles=...)]` on sensitive domains (Billing, Insurance, Radiology, IPD, Surgery)
- ⚠️ 94 controllers (~73%) rely only on `[Authorize]` without explicit role (need audit)

**God-Files (Refactor Candidates):**
1. RISCompleteController — 219 endpoints (Radiology)
2. TelemedicineController — 214 endpoints (Special/Training)
3. SystemCompleteController — 196 endpoints (System/Admin)
4. ExaminationCompleteController — 162 endpoints (OPD)

**Domains with Highest Endpoint Density:**
1. Utility/Integration (27 controllers, 275 endpoints)
2. System/Admin (13 controllers, 326 endpoints)
3. Laboratory (10 controllers, 186 endpoints)
4. Radiology (6 controllers, 261 endpoints)

**Critical Recommendations:**
1. Verify global auth middleware in Startup/Program.cs (no class-level guards = 100% dependent on filter)
2. Audit PaymentGatewayController webhook callbacks for signature validation
3. Add explicit role guards to 94 controllers lacking them (at least for sensitive domains)
4. Plan tech-debt refactor for ExtendedWorkflow + NangCap god-files (split into domain-specific sub-controllers)
5. Review public-facing endpoints (PublicEmrLookup, RISSharedResult, KioskDisplay) for input validation + rate limiting

### How to Use This Memory

- When planning security audits: refer to the 14 method-level anonymous endpoints and 36 role-guarded controllers
- When refactoring: use the "Top 10 Largest" list as priority targets
- When adding new endpoints: compare role-guard strategy with existing domain controllers
- When onboarding: point new devs to the domain organization breakdown (18 categories)
- When planning API documentation: the endpoint count per controller helps prioritize doc effort
