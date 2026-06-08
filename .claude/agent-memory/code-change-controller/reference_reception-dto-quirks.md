---
name: reference_reception-dto-quirks
description: Reception API DTO quirks — DocumentHoldSearchDto has no medicalRecordId, RawRow.id is the medicalRecordId/admissionId, TermIcon has no style prop
metadata:
  type: reference
---

Key reception DTO/component quirks (verified in code, 2026-06-03):

1. **`DocumentHoldSearchDto`** (reception.ts:561) has fields: `keyword, patientId, documentType, status, fromDate, toDate, page, pageSize`. NO `medicalRecordId`. Filter held docs by `patientId` only.

2. **`RawRow.id`** = the AdmissionDto `id` which is the medicalRecordId context in the drawer. Used as `medicalRecordId` when calling `orderServicesAtReception(v.id, ...)`.

3. **`TermIcon`** (layouts/terminal/Icon.tsx) Props: `name, size?, stroke?, className?` — does NOT accept `style`. Do not pass `style` to TermIcon.

4. **`ServiceDto`** (examination.ts:819) fields: `id, code, name, serviceType, unitPrice, insurancePrice, isActive`.

5. **`searchServices`** in `examination.ts` (line 1140): `(keyword, limit=20) => request.get<ServiceDto[]>('/examination/services/search', ...)`. Uses `request` from `@/utils/request`, not `apiClient`. Import: `import { searchServices } from '../../api/examination'`.

6. **`receptionApi.orderServicesAtReception`** signature: `(medicalRecordId: string, dto: Omit<ReceptionServiceOrderDto, 'medicalRecordId'>)`. The `medicalRecordId` is the first arg, not inside dto.
