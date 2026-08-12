> Read TOGETHER WITH `SKILL-MAP.md` (this file is the `biz` tier sub-map only).

# Skill Routes — BIZ (Business Domain Knowledge)

**Tier:** `biz` — nghiệp vụ HIS review, clinical workflow validation, business rule audit TRƯỚC khi code.

**Entry point:** `his-biz-reviewer` (protocol) + `his-biz-<module>` (domain knowledge)

---

## When to invoke BIZ skills

**BẮT BUỘC** khi code task chạm bất kỳ file nào trong:
- `frontend/src/modules/opd/` → `his-biz-opd`
- `frontend/src/modules/billing/` → `his-biz-billing`
- `frontend/src/modules/emr/` → `his-biz-emr`
- `frontend/src/modules/laboratory/` → `his-biz-laboratory`
- `frontend/src/modules/inpatient/` → `his-biz-inpatient`
- `frontend/src/modules/mci/` → (xem his-biz-reviewer + biz-emergency khi có)
- `frontend/src/modules/public-health/` → (xem his-biz-reviewer + biz-public-health khi có)
- Backend services tương ứng (OpdService, BillingService, EmrService, v.v.)

**KHÔNG invoke** khi:
- Pure UI tweak (color, spacing, label) với zero business logic change
- Pure rename/refactor không đổi behavior
- Administration catalogs thông thường (cấu hình danh mục không có rule phức tạp)

---

## Module → Skill Mapping

| File/Module | Domain Skill | Protocol Skill |
|---|---|---|
| `modules/opd/pages/Consultation.tsx` | `his-biz-opd` | `his-biz-reviewer` |
| `modules/opd/pages/DoctorPortal.tsx` | `his-biz-opd` | `his-biz-reviewer` |
| `modules/opd/pages/PrescriptionEditor.tsx` | `his-biz-opd` | `his-biz-reviewer` |
| `modules/billing/pages/Billing.tsx` | `his-biz-billing` | `his-biz-reviewer` |
| `modules/billing/pages/BillingEditor.tsx` | `his-biz-billing` | `his-biz-reviewer` |
| `modules/billing/pages/BillingGuarantors.tsx` | `his-biz-billing` | `his-biz-reviewer` |
| `modules/billing/pages/EInvoices.tsx` | `his-biz-billing` | `his-biz-reviewer` |
| `modules/billing/pages/QrPaymentCenter.tsx` | `his-biz-billing` | `his-biz-reviewer` |
| `modules/billing/pages/RefundApproval.tsx` | `his-biz-billing` | `his-biz-reviewer` |
| `modules/emr/pages/EmrEditor.tsx` | `his-biz-emr` | `his-biz-reviewer` |
| `modules/emr/pages/CentralSigning.tsx` | `his-biz-emr` | `his-biz-reviewer` |
| `modules/laboratory/pages/*.tsx` | `his-biz-laboratory` | `his-biz-reviewer` |
| `modules/inpatient/pages/*.tsx` | `his-biz-inpatient` | `his-biz-reviewer` |

**Cross-module task** (vd: OPD → Billing integration): đọc cả 2 domain skills liên quan.

---

## How to use (step-by-step)

```
1. Đọc his-biz-reviewer   → load Protocol (Phase 3-5 + Self-Critic + Gate)
2. Đọc his-biz-<module>   → load Domain Knowledge (workflow + rules + state machine)
3. Chạy Phase 3           → xác định module, map request vào workflow
4. Output Phase 4         → structured assessment với confidence %
5. Self-Critic pass       → 6 vai trò phản biện
6. Gate check             → ≥ 80%: proceed; < 80%: STOP + ask
7. Proceed to code chain  → core-code-change-workflow → his-fe/be skills
```

---

## Skill Chain by Task Type

| Task type | BIZ chain | Code chain |
|---|---|---|
| Fix bug trong HIS module | `his-biz-reviewer` + `his-biz-<X>` → scan proactive findings | `core-code-change-workflow` → `his-fe-*`/`his-be-*` |
| Thêm tính năng OPD | `his-biz-reviewer` + `his-biz-opd` → Phase 4 assessment | `his-fe-page-v2` → `his-be-module-scaffold` |
| Thêm tính năng Billing | `his-biz-reviewer` + `his-biz-billing` | `his-fe-page-v2` → `his-be-module-scaffold` → `his-be-payment-gateway` |
| Fix BHYT calculation | `his-biz-reviewer` + `his-biz-billing` (check R1-R6) | `core-code-change-workflow` |
| EMR signing issue | `his-biz-reviewer` + `his-biz-emr` | `his-fe-webauthn-biometric` nếu liên quan |
| Lab result flow issue | `his-biz-reviewer` + `his-biz-laboratory` | `core-code-change-workflow` |
| Discharge workflow | `his-biz-reviewer` + `his-biz-inpatient` | `core-code-change-workflow` |

---

## Planned skills (chưa tạo — tạo khi cần)

| Module | Skill | Trigger |
|---|---|---|
| MCI/Emergency | `his-biz-mci` | `modules/mci/` |
| Public Health | `his-biz-public-health` | `modules/public-health/` |
| Pharmacy | `his-biz-pharmacy` | Prescription dispensing workflow |
| Radiology | `his-biz-radiology` | RIS/PACS imaging workflow |
| Administration | `his-biz-administration` | Complex catalog rules |
