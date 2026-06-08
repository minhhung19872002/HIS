---
name: project_b16-inpatient-lab-backend-gap
description: B1.6 (bedside lab entry/approve for inpatient) cannot be implemented FE-only — inpatient.ts has no endpoint returning LISComplete order IDs
metadata:
  type: project
---

B1.6 goal: enter + approve lab results bedside for an inpatient using `api/laboratory.ts` (saveTestResults, finalApprove by orderId).

**Why blocked:** `api/inpatient.ts` only has `getLabResults(admissionId)` returning `LabResultItemDto[]` — individual result items with their own `id`, but NOT a LISComplete `orderId` that `laboratory.ts` functions require. The LISComplete endpoints (`/LISComplete/orders/{orderId}`) need the order-level ID, not the result-item ID.

**What's missing in backend:** An endpoint on the inpatient module (or a bridge endpoint) that lists the patient's lab ORDERS by `admissionId` and returns their LISComplete `orderId`. Something like `GET /inpatient/admissions/{admissionId}/lab-orders` → `[{ orderId, orderCode, tests: [...], status }]`.

**How to apply:** If user asks again about B1.6, confirm this backend endpoint is still missing before implementing. Do not fake an implementation using `LabResultItemDto.id` as an orderId — they are different entity types.
