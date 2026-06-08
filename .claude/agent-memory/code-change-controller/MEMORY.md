# Code-Change-Controller Memory Index

- [Reception module split structure](reference_reception-module-split.md) — Reception split into Reception.tsx + reception/ subfiles; actions go in VisitDrawerBody, not Reception.tsx
- [B1.6 inpatient lab entry needs backend](project_b16-inpatient-lab-backend-gap.md) — B1.6 (bedside lab enter/approve for inpatient) blocked: inpatient.ts getLabResults returns LabResultItemDto[] with no LISComplete orderId
- [DocumentHoldSearchDto has no medicalRecordId](reference_reception-dto-quirks.md) — DocumentHoldSearchDto in reception.ts has no medicalRecordId field; filter by patientId only; medicalRecordId not in search shape
- [B1.5 inpatient treatment monitor section](reference_inpatient-treatment-monitor.md) — B1.5 first slice done: TreatmentMonitorSection in pages-v2/inpatient/; VitalSigns chart uses VitalSignsChartDto (temperatureData/pulseData/bpData/spO2Data arrays of {time,value,value2})
