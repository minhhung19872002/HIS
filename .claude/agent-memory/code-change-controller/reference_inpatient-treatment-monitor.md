---
name: inpatient-treatment-monitor
description: B1.5 first slice — TreatmentMonitorSection location, chart DTO shape, and deferred items for inpatient treatment monitoring feature
metadata:
  type: reference
---

B1.5 "Theo doi dieu tri" first slice is implemented in `frontend/src/pages-v2/inpatient/TreatmentMonitorSection.tsx`.

It is rendered inside the patient detail `DrawerShell` in `Inpatient.tsx` (after the warnings section), passing `patient: InpatientListDto` and `onRefresh: loadData`.

**Chart DTO** (`VitalSignsChartDto`, api/inpatient.ts ~line 781):
- `temperatureData: VitalSignsPointDto[]` — each `{ time: string; value?: number }`
- `pulseData: VitalSignsPointDto[]`
- `bpData: VitalSignsPointDto[]` — `value` = systolic, `value2` = diastolic
- `spO2Data: VitalSignsPointDto[]`

**APIs used (verified line refs):**
- `createVitalSigns` (line 1501) — dto fields: admissionId, recordTime, temperature, pulse, respiratoryRate, systolicBP, diastolicBP, spO2, weight, height, notes
- `getVitalSignsChart` (line 1507) — params: admissionId, fromDate, toDate; default last 7 days
- `transferDepartment` (line 1244) — dto fields: admissionId, targetDepartmentId, targetRoomId, targetBedId?, transferReason?, diagnosisOnTransfer?, treatmentSummary?, receivingDoctorId
- `createNutritionOrder` (line 1470) — dto fields: admissionId, orderDate, mealType, nutritionLevel, menuCode?, specialRequirements?

**Deferred (B1.5 next slices):**
- `createInfusionRecord` — infusion / truyen dich
- `createBloodTransfusion` — blood transfusion
- `getBillingStatement6556` — billing statement form 6556

**Pattern note:** `pages-v2/inpatient/` subdirectory created following reception/ pattern. `IpFld` helper is defined locally (not exported from _v2kit); intentionally duplicated per YAGNI (only 2 file uses).
