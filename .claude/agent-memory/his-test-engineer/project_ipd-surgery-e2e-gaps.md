---
name: ipd-surgery-e2e-gaps
description: IPD và Surgery E2E lifecycle gaps trên prod (2026-06-17) + scripts đã tạo để phủ
metadata:
  type: project
---

Prod (2026-06-17) có 0 ca nội trú đang điều trị và 0 dịch vụ PTTT/ca lên lịch → không drive được E2E.
Scripts đã viết để phủ bằng cách tự tạo data:

- `C:\Source\HIS\test-ipd-e2e-lifecycle.ps1` — IPD full lifecycle
- `C:\Source\HIS\test-surgery-e2e-lifecycle.ps1` — Surgery full lifecycle

**Why:** Đây là "P1" của prod-e2e-remaining-flows-2026-06-17.md — hai luồng prod không drive được vì thiếu data, cần test LOCAL self-contained.

**How to apply:** Chạy sau khi `dotnet build` xanh trên local. KHÔNG chạy trên prod (anti-pattern #14/#22).

### IPD — contract đã verify
- `POST /api/reception/register/fee` → tạo patient + OPD admission (AdmissionDto: id, patientId, examinationId)
- `GET /api/examination/emr-records?keyword=` → lấy medicalRecordId (EmrRecordDto.medicalRecordId)
- `GET /api/inpatient/bed-status?departmentId=` → lấy bedId có status=0
- `POST /api/inpatient/admit-from-opd` (AdmitFromOpdDto) → admissionId
- `POST /api/inpatient/assign-bed` (CreateBedAssignmentDto: admissionId, bedId, note)
- `POST /api/inpatient/service-orders` (CreateInpatientServiceOrderDto)
- `POST /api/inpatient/vital-signs` (CreateVitalSignsDto)
- `GET /api/inpatient/pre-discharge-check/{id}`
- `POST /api/inpatient/discharge` (CompleteDischargeDto: admissionId, dischargeDate, dischargeType, dischargeCondition)

### Surgery — contract đã verify
- `GET /api/SurgeryComplete/operating-rooms` → roomId
- `GET /api/SurgeryComplete/services/search?keyword=` → surgeryServiceId (PHẢI có trong catalog — thoát sớm nếu rỗng)
- `POST /api/reception/register/fee` + `GET /api/examination/emr-records` → medicalRecordId
- `POST /api/SurgeryComplete` (CreateSurgeryRequestDto) → surgeryId, status=1
- `POST /api/SurgeryComplete/approve` (ApproveSurgeryDto) → status=2
- `POST /api/SurgeryComplete/schedule` (ScheduleSurgeryDto: surgeryId, scheduledDate, operatingRoomId, estimatedDurationMinutes)
- `POST /api/SurgeryComplete/check-in` (SurgeryCheckInDto)
- `POST /api/SurgeryComplete/start` (StartSurgeryDto: surgeryId, startTime)
- `POST /api/SurgeryComplete/complete` (CompleteSurgeryDto: surgeryId, endTime) → status=4
- `GET /api/SurgeryComplete/{id}` — verify final state

### Seed IDs đã dùng (local)
- OPD Room: `bf6b00e9-578b-47fb-aff8-af25fb35a794`
- IPD Dept: `7EEEFE81-095D-49B2-959F-2F2B69D0C39B`
- IPD Room: `54344D93-42DA-4937-AF86-048124E0CCDC`
- IPD Bed:  `638D1C53-ABC0-4E06-AF93-E9186CA42E26` (fallback nếu query không tìm thấy bed trống)
- Admin:    `9e5309dc-ecf9-4d48-9a09-224cd15347b1`

### Known gotcha
- AdmissionDto (reception) KHÔNG có medicalRecordId → phải query emr-records sau khi tạo patient
- Surgery catalog có thể rỗng trên DB mới → script exit sớm với hướng dẫn seed SQL
- IPD discharge có thể bị guard (unpaid/unclaimed medicine) — script ghi rõ lý do khi fail
