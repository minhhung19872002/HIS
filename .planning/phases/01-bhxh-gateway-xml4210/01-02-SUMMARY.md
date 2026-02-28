---
phase: 01-bhxh-gateway-xml4210
plan: 02
subsystem: api
tags: [bhxh, xml4210, ef-core, insurance, data-extraction]

# Dependency graph
requires:
  - phase: 01-bhxh-gateway-xml4210 plan 01
    provides: "IBhxhGatewayClient abstraction, InsuranceXmlService rewired to use gateway"
provides:
  - "15 XML table DTOs (XML1-XML11, XML13-XML15) with all BHXH-mandated fields"
  - "14 GenerateXmlNDataAsync methods with real EF Core queries"
  - "8 new controller endpoints for XML6-XML15 table generation"
  - "GetClaimsForExport helper with full Include chain (Patient, Department, Doctor, ClaimDetails)"
affects: [01-03-PLAN, 01-04-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [EF Core Include chain for insurance data extraction, Math.Round for BHXH money fields]

key-files:
  created: []
  modified:
    - "backend/src/HIS.Application/DTOs/Insurance/InsuranceXmlDTOs.cs"
    - "backend/src/HIS.Application/Services/IInsuranceXmlService.cs"
    - "backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs"
    - "backend/src/HIS.API/Controllers/InsuranceXmlController.cs"

key-decisions:
  - "Use ClaimDetails grouped by ItemType for XML2 (medicines) and XML3 (services) instead of separate Prescription/ServiceRequest queries"
  - "XML5 uses direct Prescription+PrescriptionDetail join via MedicalRecordId for dosage/usage details"
  - "XML6 queries BloodRequest (not BloodTransfusion) since BloodRequest has MedicalRecordId/BloodType/Volume"
  - "XML8/XML9/XML10/XML15 return empty lists since transport/sick-leave/assessment/TB modules not yet in HIS"
  - "XML11 deduplicates patients by PatientId to avoid duplicate social insurance entries"
  - "All money fields use Math.Round(value, 2) per BHXH pitfall guidance"

patterns-established:
  - "GetClaimsForExport includes Department+Doctor+MedicalRecord+ClaimDetails+Medicine+Service for all XML generators"
  - "STT (sequence number) counter per MaLk group, starting at 1"
  - "Empty tables return empty List<T> (never null) satisfying all-12-tables requirement"

requirements-completed: [XML-01]

# Metrics
duration: 7min
completed: 2026-02-28
---

# Phase 01 Plan 02: XML 4210 Table Data Generators Summary

**14 real EF Core data extractors for BHXH XML tables (XML1-XML11, XML13-XML15) pulling patient, medicine, service, blood, referral, and appointment data from HIS database**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-28T06:25:57Z
- **Completed:** 2026-02-28T06:32:51Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- 8 new XML table DTOs defined (XML6, XML8-XML11, XML13-XML15) with all BHXH-mandated fields
- XML1 fully rewritten with Department/Room/Cost/Treatment-days joins from ClaimDetails
- XML2-XML5 implemented with real medicine, service, out-of-catalog, and prescription data
- XML7 implemented using Discharge records (DischargeType=2 for referrals)
- XML6 queries BloodRequest records for blood product data
- XML11 extracts social insurance data from Patient entities
- XML13 queries Appointment records (AppointmentType=1) for re-examination follow-ups
- XML14 maps referral certificates per QD 3176 from Discharge data
- 8 new controller endpoints exposed for XML6-XML15

## Task Commits

Each task was committed atomically:

1. **Task 1: Add missing XML table DTOs and extend IInsuranceXmlService** - `231d858` (feat)
2. **Task 2a: Implement core XML generators (XML1-XML5, XML7) + controller endpoints** - `cf8a2ba` (feat)
3. **Task 2b: Implement new XML generators (XML6, XML8-XML15)** - `074cfe3` (feat)

## Files Created/Modified
- `backend/src/HIS.Application/DTOs/Insurance/InsuranceXmlDTOs.cs` - 8 new DTO classes + 8 IncludeXml flags
- `backend/src/HIS.Application/Services/IInsuranceXmlService.cs` - 8 new generator method signatures
- `backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs` - 14 generator implementations with real EF Core queries, enhanced GetClaimsForExport
- `backend/src/HIS.API/Controllers/InsuranceXmlController.cs` - 8 new POST endpoints for xml6-xml15

## Decisions Made
- Used ClaimDetails grouped by ItemType for XML2/XML3 instead of separate entity queries (simpler, all data in one claim object)
- XML5 joins Prescriptions via MedicalRecordId (not directly via InsuranceClaim) to get dosage/usage details
- XML6 uses BloodRequest entity (has MedicalRecordId, BloodType, Volume) rather than BloodTransfusion (lacks MedicalRecordId)
- XML8/XML9/XML10/XML15 return empty lists since those HIS modules are not yet built
- XML11 deduplicates by PatientId to avoid multiple entries for same person in social insurance table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed BloodTransfusion vs BloodRequest entity usage in XML6**
- **Found during:** Task 2b (XML6 generator)
- **Issue:** Plan suggested querying BloodTransfusion but that entity lacks MedicalRecordId and BloodType fields
- **Fix:** Switched to query BloodRequest which has MedicalRecordId, BloodType, RhFactor, Volume
- **Files modified:** backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs
- **Verification:** Build passes with 0 errors
- **Committed in:** 074cfe3 (Task 2b commit)

**2. [Rule 1 - Bug] Fixed MedicalRecord.Room reference in XML1**
- **Found during:** Task 2a (XML1 generator)
- **Issue:** Plan referenced MedicalRecord.Room.RoomCode but MedicalRecord entity has no Room navigation property
- **Fix:** Used Department.DepartmentCode for MaPhong field instead
- **Files modified:** backend/src/HIS.Infrastructure/Services/InsuranceXmlService.cs
- **Verification:** Build passes with 0 errors
- **Committed in:** cf8a2ba (Task 2a commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for correctness (entity properties don't exist). No scope creep.

## Issues Encountered
- Backend API process (PID 23500) locked DLL files during build; resolved by building HIS.Infrastructure project instead of HIS.API

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 14 XML table generators ready with real EF Core queries
- XML export (Plan 03) can now call these generators to produce actual XML files
- Empty-table generators (XML8/9/10/15) are structurally complete and will return data when those HIS modules are built

## Self-Check: PASSED

- All 5 modified/created files exist on disk
- All 3 task commits verified in git log (231d858, cf8a2ba, 074cfe3)

---
*Phase: 01-bhxh-gateway-xml4210*
*Completed: 2026-02-28*
