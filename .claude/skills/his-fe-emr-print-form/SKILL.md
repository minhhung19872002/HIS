---
name: his-fe-emr-print-form
description: Use this skill when adding or editing a Vietnamese medical print form in HIS (biểu mẫu in MS xx/BV, DD xx, phiếu CLS, bệnh án chuyên khoa). Triggers include "thêm biểu mẫu/phiếu in [X]", a new *Print React component, registering a printType in PrintTemplateRenderer, the PrintHeader/SignatureBlock/Field layout, A4 print CSS, digital signature stamp, hoặc iText7 PDF export. Do NOT use for normal list/detail screens (his-fe-page-v2) or DICOM image viewing (his-fe-dicom-viewer).
metadata:
  type: project
---

# HIS EMR Print Form (biểu mẫu in y tế VN)

Chuẩn hoá thêm 1 **biểu mẫu in** theo mẫu Bộ Y Tế (MS xx/BV, DD xx). Đã có 38+ form; mỗi gói thầu
thường thêm biểu mẫu chuyên khoa. Form là React component `forwardRef`, render HTML A4 + print CSS,
nạp động qua `PrintTemplateRenderer`.

## Khi nào dùng
- Thêm phiếu/biểu mẫu in: tóm tắt BA, tờ điều trị, hội chẩn, ra viện, chuyển viện, phiếu CLS
  (X-quang/CT/MRI/SA/ECG/XN), phiếu điều dưỡng (DD xx), bệnh án chuyên khoa (TT 32).

## Khi nào KHÔNG dùng
- Trang nhập liệu/list → `his-fe-page-v2`. Xem ảnh DICOM → `his-fe-dicom-viewer`.

## Vị trí code mẫu (đọc trước khi viết)
- `frontend/src/components/PrintTemplateRenderer.tsx` — **bộ nạp trung tâm**: `switch(printType)` → dynamic import.
  THÊM form mới = thêm 1 `case 'key': return (await import('./File')).XxxPrint;`
- Template files: `EMRPrintTemplates.tsx` (BS), `EMRNursingPrintTemplates.tsx` (DD), `ClinicalFormPrintTemplates.tsx`
  (CLS), `SpecialtyEMRForms1.tsx`/`SpecialtyEMRForms2.tsx`/`SpecialtyMedicalRecordPrintTemplates.tsx` (TT 32),
  `BirthCertificatePrint.tsx`
- Shared: `constants/hospital.ts` (`HOSPITAL_NAME/ADDRESS/PHONE`), `constants/printStyles.ts`
  (`PRINT_STYLES_BASE` + `PRINT_STYLES_DIGITAL_SIG`)

## Pattern chuẩn (bám `EMRPrintTemplates.tsx`)
- Component `forwardRef`, props là DTO (`MedicalRecordFullDto`, `TreatmentSheetDto`…), export tên `XxxPrint`.
- **`PrintHeader`**: `BỘ Y TẾ` + `{HOSPITAL_NAME}` (từ `constants/hospital` — **KHÔNG hardcode tên BV**, xem
  `his-qa-anti-pattern`) + `{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}` + `formNumber` = `"Mẫu số: MS xx/BV"`.
- Body: `<div className="...">` dùng class trong `PRINT_STYLES_BASE`; layout A4, Times New Roman, có `Field`,
  bảng, chữ ký 2 cột.
- **Chữ ký số**: `DigitalSignatureStamp` + `toSignatureStamp(sig?: DocumentSignatureDto)` (parse `O=`/`MST`
  từ certificateSubject) → tem "Signature Valid" xanh. Style từ `PRINT_STYLES_DIGITAL_SIG`.
- Đăng ký vào `PrintTemplateRenderer` với 1 `printType` key + dropdown/menu nơi gọi in (vd `EMR.tsx`).

## Xuất PDF + ký số (tùy chọn, backend)
- HTML → PDF: `PdfGenerationService` + `PdfTemplateHelper` (iText7). Ký số: `PdfSignatureService`
  (`SignPdfWithPfxAsync`, fallback self-signed; prod set cert BV qua env). Mẫu: `AiReportService.GenerateAiReportSignedPdfAsync`.
- ⚠️ Linux container cần font (`fonts-dejavu`, `fonts-liberation` trong Dockerfile) để render tiếng Việt.

## Checklist
- [ ] Component `forwardRef` export `XxxPrint`, dùng `PrintHeader` + `formNumber` "MS xx/BV"
- [ ] Tên BV qua `HOSPITAL_NAME` constant (KHÔNG hardcode)
- [ ] Style từ `PRINT_STYLES_BASE` (+ DIGITAL_SIG nếu có ký số)
- [ ] Thêm `case` vào `PrintTemplateRenderer.tsx` + nút/menu in
- [ ] `npm run build` 0 error; in thử (preview drawer) đúng A4

## Dependency
`core-reusable-code` (tái dùng PrintHeader/SignatureBlock/Field, đừng tạo lại) → `his-fe-emr-print-form`
→ `his-qa-anti-pattern` (không hardcode tên BV).

## When to update
- Khi `EMRPrintTemplates.tsx`/`PrintTemplateRenderer` đổi cấu trúc, hoặc thêm loại biểu mẫu mới.
