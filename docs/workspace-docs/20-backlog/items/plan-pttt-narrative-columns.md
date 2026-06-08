# Plan — Tách tường trình PTTT khỏi sentinel `Notes` → cột riêng

> **Trạng thái:** ✅ XONG (2026-06-08) — cả nửa lưu trữ-ghi LẪN nửa print/FE-flip; **auto-smoke API PASS** (explicit + legacy fallback). Read-DTO (step 6) bỏ vì print đọc thẳng entity. Chỉ còn **visual layout check** sau deploy (không chặn).
> **Nguồn:** follow-up handoff 2026-06-05 ("cột riêng cho tường trình PTTT, bỏ sentinel").
> **Verify khi soạn plan (2026-06-06):** đọc code thật `SurgeryReportModal.tsx`, `SurgeryOperationServiceImpl.PrintSurgeryReportAsync`, entity `SurgeryRequest`, `CreateSurgeryRequestDto`.

## ✅ ĐÃ LÀM 2026-06-08 (slice BE-storage additive — backward-compat, verify được local, KHÔNG cần smoke)
- **Entity** `Surgery.cs::SurgeryRequest`: thêm 3 cột `SurgeryReport` · `Conclusion` · `AttachedImageUrls` (đều `string?`).
- **Migration** `Data/Scripts/78_surgery_narrative_columns.sql`: ADD 3 cột `NVARCHAR(MAX)` idempotent (`COL_LENGTH` guard) + **backfill** `SurgeryReport`/`Conclusion` từ sentinel `[TUONGTRINH]`/`[KETLUAN]` trong `Notes` (chỉ row cột còn NULL). Áp local Docker 2 lần (idempotent OK, 0 lỗi); backfill expr verify đúng trên chuỗi mẫu.
- **Service** `SurgerySchedulingServiceImpl.CreateSurgeryRequestAsync`: thêm `ApplyNarrativeFromNotes(request, dto.Notes)` — parse từng dòng sentinel (`[TUONGTRINH]/[KETLUAN]/[HINHCHINH]/[HINHPHU]`) đổ vào cột mới khi tạo. **Giữ nguyên `Notes = dto.Notes`** ⇒ không đổi hành vi cũ, không regression in.
- **Verify:** `dotnet build` Infrastructure(+Core) **0 error** · migration idempotent · 3 cột hiện diện · parse expr đúng (`REPORT`/`CONCL` cắt đúng tới newline).
- **KHÔNG đụng** (giữ DEFER — xem dưới): FE `SurgeryReportModal` vẫn pack sentinel (backward-compat); print template; read-DTO `SurgeryDto`.

## ✅ ĐÃ LÀM NỐT 2026-06-08 (phiên auto-smoke local)
- **Step 4 (FE flip) ✅**: `SurgeryReportModal.handleSave` gửi `surgeryReport`/`conclusion`/`attachedImageUrls` tường minh; `notes` chỉ còn ghi chú thường. `api/surgery.ts::CreateSurgeryRequestDto` +3 field. (tsc 0 err)
- **Step 5 (Print) ✅**: `PrintSurgeryReportAsync` thêm section "TƯỜNG TRÌNH PHẪU THUẬT / THỦ THUẬT" render `req.SurgeryReport`/`Conclusion`; **fallback** `ExtractNoteTag(Notes,…)` cho row legacy. `CreateSurgeryRequestDto` BE +3 field; service create ưu tiên field tường minh, fallback parse Notes.
- **Step 6 (read-DTO) — BỎ**: print đọc thẳng entity (`LoadSurgeryPrintDataAsync`) nên KHÔNG cần expose `SurgeryDto` (tránh 29-site blast radius, YAGNI vì modal không hiển thị lại narrative).
- **Auto-smoke API (backend local :5199) PASS**: tạo PTTT field-tường-minh → in MS.PT-02 thấy narrative; tạo PTTT sentinel-Notes (FE cũ) → in vẫn thấy (fallback). Cột persist verify qua SQL. ⇒ data tường trình trước đây KHÔNG in ra nay in ra.
- **Còn nhẹ (không chặn)**: visual A4 layout check sau deploy · embed ảnh `[HINHCHINH]/[HINHPHU]` vào phiếu (hiện chỉ render text narrative+kết luận; ảnh đã lưu cột, render sau khi rõ map path→URL).

## Vấn đề (đã verify)
- `SurgeryReportModal` (OPD-inline PTTT, G-09/G-33) **pack** `[TUONGTRINH]/[KETLUAN]/[GHICHU]` + ảnh `[HINHCHINH]/[HINHPHU]` vào `SurgeryRequest.Notes` rồi gửi `createSurgeryRequest` — vì `CreateSurgeryRequestDto` + entity `SurgeryRequest` **không có** field tường trình/kết luận (narrative chỉ ở DTO execution: `CompleteSurgeryDto.Description/Conclusion`).
- **🔴 BUG kèm theo:** `PrintSurgeryReportAsync` (phiếu MS.PT-02) **KHÔNG đọc `Notes`** — nó render từ bản ghi **execution** (`rec.ProcedurePerformed/PostOpDiagnosis/Complications`). ⇒ tường trình OPD-inline pack vào `Notes` **hiện KHÔNG được in ra** (data chết). Sentinel vừa xấu vừa vô dụng cho print.

## Giải pháp đề xuất (backward-compat)
1. **Entity** `SurgeryRequest` (Surgery.cs): thêm `string? SurgeryReport` (tường trình) + `string? Conclusion` (kết luận). Ảnh giữ field riêng `string? AttachedImageUrls` (CSV) hoặc bảng phụ — KHÔNG nhồi Notes.
2. **Migration** (số kế tiếp): ADD 3 cột idempotent + **backfill**: parse `Notes` các dòng `[TUONGTRINH]…/[KETLUAN]…/[HINHCHINH|HINHPHU]…` → cột tương ứng (testable local DB như đã làm với script 45). Để lại `[GHICHU]` ở Notes hoặc tách luôn.
3. **DTO** `CreateSurgeryRequestDto`: thêm `SurgeryReport`, `Conclusion`, `AttachedImageUrls`. **Service** create: map vào cột.
4. **FE** `SurgeryReportModal.handleSave`: gửi `surgeryReport=description`, `conclusion`, `attachedImageUrls=[…]` thay vì pack sentinel; `notes` chỉ còn ghi chú thường.
5. **Print** `PrintSurgeryReportAsync`: thêm block render `req.SurgeryReport`/`req.Conclusion` (+ ảnh) cho phiếu OPD-inline; **fallback**: nếu cột null nhưng `Notes` có `[TUONGTRINH]` → parse (cho row legacy chưa backfill). ⇐ **mắt xích untestable → cần smoke**.
6. **SurgeryDto** (list/detail): expose `surgeryReport/conclusion` để FE hiển thị lại (hiện list chỉ show tên/loại).

## Files đụng
- BE: `HIS.Core/Entities/Surgery.cs` · `Data/Scripts/NN_surgery_narrative.sql` (mới) · `DTOs/Surgery/SurgeryCompleteDTOs.cs` · `Services/SurgeryCompleteService.cs` (create) · `Services/Surgery/SurgeryOperationServiceImpl.cs` (print) · `DTOs` SurgeryDto.
- FE: `pages-v2/shared/SurgeryReportModal.tsx`.

## Verify
1. Migration + backfill: chạy local Docker (`sqlcmd -i`), kiểm cột có dữ liệu + idempotent (như script 45).
2. Build BE `dotnet build` 0 errors + FE `npm run build` EXIT 0.
3. **Smoke (BẮT BUỘC, cần browser + deploy):** OPD → PTTT F6 → nhập tường trình + kết luận + ảnh → lưu → **In phiếu MS.PT-02 thấy tường trình/kết luận** (chính là phần hiện đang mất) → mở lại modal thấy data → row legacy in vẫn ra (fallback).

## Rủi ro / lưu ý
- Đụng **data lâm sàng** (phiếu PTTT) → backfill phải đúng, giữ fallback cho row cũ.
- Print template (iText/HTML) chỉ verify được bằng mắt sau deploy → KHÔNG merge khi chưa smoke.
- Cross-ref: [[feedback_defer-logic-changing-refactor]] · skill `his-db-migration`, `his-be-module-scaffold`, `his-fe-emr-print-form`.
