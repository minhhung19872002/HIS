---
name: reference_reception-module-split
description: Reception v2 module is split into Reception.tsx (orchestrator) + reception/ subfiles; new visit-context actions belong in VisitDrawerBody, not Reception.tsx
metadata:
  type: reference
---

Reception module structure:
- `frontend/src/pages-v2/Reception.tsx` — main orchestrator, holds global state (rows, rooms, loadData), all modal open-state for top-level actions
- `frontend/src/pages-v2/reception/` — subfiles:
  - `VisitDrawerBody.tsx` — detail drawer content (info/audit/related tabs); visit-context actions live here
  - `NewVisitModal.tsx` — new registration
  - `BhytVerifyModal.tsx` — standalone BHYT lookup
  - `PatientLookupModal.tsx` — search existing patients
  - `MoveRoomModal.tsx` — change room
  - `ReceptionPayModal.tsx` — pay fee
  - `NowServingTab.tsx`, `StatsTab.tsx`, `shared.tsx`
  - `VisitActionsModals.tsx` — (added B1.7) TempInsurance, DocumentHold, Photo, ServiceOrder modals

Pattern: Reception.tsx imports all subfiles. VisitDrawerBody receives `v: RawRow` and `rows: RawRow[]`. Visit-context actions (that need patientId/medicalRecordId) are self-contained in VisitDrawerBody with local modal state.

API client: `import * as receptionApi from '../../api/reception'` — uses `api` (not `apiClient`) alias from `./client`.
