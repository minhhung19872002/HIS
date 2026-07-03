---
name: his-fe-emr-print-form
description: Use this skill when adding or editing a Vietnamese medical print form in HIS (forms MS xx/BV, DD xx, paraclinical slips, specialty medical records). Triggers include "add a print form/slip [X]", a new *Print React component, registering a printType in PrintTemplateRenderer, the PrintHeader/SignatureBlock/Field layout, A4 print CSS, a digital signature stamp, or iText7 PDF export. Do NOT use for normal list/detail screens (his-fe-page-v2) or DICOM image viewing (his-fe-dicom-viewer).
metadata:
  type: project
---

# HIS EMR Print Form (Vietnamese medical print forms)

Standardizing adding a **print form** following the Ministry of Health template (MS xx/BV, DD xx). There are 38+ forms already; each tender package usually adds a specialty form. A form is a `forwardRef` React component, rendering A4 HTML + print CSS, loaded dynamically via `PrintTemplateRenderer`.

> NOTE: a few literal strings rendered on the printed form stay in Vietnamese (e.g. `BỘ Y TẾ` = "Ministry of Health" header, `ĐT:` = "Tel:", `Mẫu số:` = "Form no:") — these are the actual legal-form output text, not prose.

## When to use
- Adding a slip/print form: medical-record summary, treatment sheet, consultation, discharge, transfer, a paraclinical slip
  (X-ray/CT/MRI/US/ECG/lab), a nursing slip (DD xx), a specialty medical record (TT 32).

## When NOT to use
- A data-entry/list page → `his-fe-page-v2`. Viewing DICOM images → `his-fe-dicom-viewer`.

## Sample code locations (read before writing)
- `frontend/src/components/PrintTemplateRenderer.tsx` — the **central loader**: `switch(printType)` → dynamic import.
  ADD a new form = add a `case 'key': return (await import('./File')).XxxPrint;`
- Template files: `EMRPrintTemplates.tsx` (doctor), `EMRNursingPrintTemplates.tsx` (nursing), `ClinicalFormPrintTemplates.tsx`
  (paraclinical), `SpecialtyEMRForms1.tsx`/`SpecialtyEMRForms2.tsx`/`SpecialtyMedicalRecordPrintTemplates.tsx` (TT 32),
  `BirthCertificatePrint.tsx`
- Shared: `constants/hospital.ts` (`HOSPITAL_NAME/ADDRESS/PHONE`), `constants/printStyles.ts`
  (`PRINT_STYLES_BASE` + `PRINT_STYLES_DIGITAL_SIG`)

## Standard pattern (follow `EMRPrintTemplates.tsx`)
- A `forwardRef` component, props are a DTO (`MedicalRecordFullDto`, `TreatmentSheetDto`…), exported as `XxxPrint`.
- **`PrintHeader`**: `BỘ Y TẾ` + `{HOSPITAL_NAME}` (from `constants/hospital` — **do NOT hardcode the hospital name**, see
  `his-qa-anti-pattern`) + `{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}` + `formNumber` = `"Mẫu số: MS xx/BV"`.
- Body: `<div className="...">` using classes from `PRINT_STYLES_BASE`; A4 layout, Times New Roman, with `Field`,
  tables, a 2-column signature.
- **Digital signature**: `DigitalSignatureStamp` + `toSignatureStamp(sig?: DocumentSignatureDto)` (parse `O=`/`MST`
  from certificateSubject) → a green "Signature Valid" stamp. Styled from `PRINT_STYLES_DIGITAL_SIG`.
- Register in `PrintTemplateRenderer` with a `printType` key + a dropdown/menu where print is invoked (e.g. `EMR.tsx`).

## PDF export + digital sign (optional, backend)
- HTML → PDF: `PdfGenerationService` + `PdfTemplateHelper` (iText7). Digital sign: `PdfSignatureService`
  (`SignPdfWithPfxAsync`, falls back to self-signed; on prod set the hospital cert via env). Reference: `AiReportService.GenerateAiReportSignedPdfAsync`.
- ⚠️ A Linux container needs fonts (`fonts-dejavu`, `fonts-liberation` in the Dockerfile) to render Vietnamese.

## Checklist
- [ ] A `forwardRef` component exporting `XxxPrint`, using `PrintHeader` + `formNumber` "MS xx/BV"
- [ ] Hospital name via the `HOSPITAL_NAME` constant (do NOT hardcode)
- [ ] Style from `PRINT_STYLES_BASE` (+ DIGITAL_SIG if digitally signed)
- [ ] Add a `case` to `PrintTemplateRenderer.tsx` + a print button/menu
- [ ] `npm run build` 0 errors; test-print (preview drawer) renders correct A4

## Dependency
`core-reusable-code` (reuse PrintHeader/SignatureBlock/Field, don't recreate them) → `his-fe-emr-print-form`
→ `his-qa-anti-pattern` (don't hardcode the hospital name).

## When to update
- When `EMRPrintTemplates.tsx`/`PrintTemplateRenderer` changes structure, or a new form type is added.
