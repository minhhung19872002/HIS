# E2E nội trú + phẫu thuật + lỗi đọc dữ liệu · 2026-06-17 (vòng cuối)

> Mục tiêu: drive lifecycle nội trú (admit→bed→order→vital→discharge) + phẫu thuật (request→approve→schedule→check-in→start→complete) thật trên prod. Kết quả: **không drive trọn được qua API** vì thiếu `medicalRecordId` lấy được + tránh tạo rác prod — NHƯNG phát hiện vài lỗi đọc dữ liệu thật.

## ⚠️ Không drive được lifecycle nội trú/PT trên prod (lý do)
- `CreateSurgeryRequestDto` + `AdmitFromOpdDto` đều cần `MedicalRecordId` (Guid bắt buộc). **Không endpoint đọc nào trả `medicalRecordId`**: RIS `orders/{id}`, LIS `orders/{id}`, Billing `invoices/{id}`, `accounting/invoices/{id}` — đều không có field này (hoặc 404).
- Prod hiện **0 ca nội trú đang ĐT** (cả 3 khoa) → không có admission để drive; tạo admission/surgery mới = ghi rác lên prod.
- → Cách đúng để verify 2 lifecycle này: **chạy script E2E b2cef09** (`test-ipd-e2e-lifecycle.ps1`, `test-surgery-e2e-lifecycle.ps1`) trên local/staging — nhưng đang kẹt vì BE local không build (WIP EInvoice/SpecimenImage).

## 🔴 Lỗi THẬT phát hiện vòng này
1. **Đọc hóa đơn theo id 404** — invoice `75834907-…` CÓ trong `GET invoices/search`, nhưng **cả `GET invoices/{id}` LẪN `GET accounting/invoices/{id}` đều 404**. → id từ danh sách (InvoiceSummary) không tra được bằng endpoint chi tiết (Invoice entity) ⇒ **mở chi tiết 1 hóa đơn từ danh sách sẽ vỡ**. (Thu tiền vẫn chạy vì payment resolve qua InvoiceSummaries.) Cần: đồng nhất id-space list↔detail hoặc sửa lookup detail nhận id từ search.
2. **`medicalRecordId` không lộ trong DTO đọc** của RIS/LIS order + invoice → không truy ngược order/hóa đơn về hồ sơ bệnh án qua API (cản trở tích hợp + test). Thêm `medicalRecordId` vào các read DTO này.

## 🟡 Nhỏ
- `SurgeryComplete/services/search` bắt buộc `keyword` (400 khi rỗng) → không browse được toàn bộ dịch vụ PT (phải gõ từ khoá, vd "cắt" → "Cắt ruột thừa nội soi"). Cân nhắc cho phép list-all khi keyword rỗng.

## ✅ Nhắc lại — đã verified xanh trước đó (không đụng)
Reception · OPD full cycle (start→vital→chẩn đoán→chỉ định→kê đơn→hoàn tất) · LIS nhập KQ · RIS nhập KQ + orders default · Dược dispense+trừ kho · Viện phí thu tiền (idempotent) · BHYT claim+XML1 · seed catalog · CRUD danh mục.

## PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-be-module-scaffold) + docs/workspace-docs/10-assessment/prod-e2e-inpatient-surgery-2026-06-17.md. KHÔNG commit/push tới khi tôi duyệt.

P0:
1. Đọc hóa đơn theo id 404: invoice id từ GET /api/BillingComplete/invoices/search KHÔNG tra được bằng GET /invoices/{id} và /accounting/invoices/{id} (cả 2 trả 404 cho invoice 75834907-eabd-4a24-b3f5-64df3fe63c26 dù search liệt kê). Điều tra id-space: search trả InvoiceSummary.Id còn detail tra Invoice.Id? Sửa để mở chi tiết hóa đơn từ danh sách KHÔNG 404 (đồng nhất id hoặc detail nhận đúng id search trả). Verify: lấy 1 id bất kỳ từ search → GET detail → 200.

P1:
2. Thêm medicalRecordId vào read DTO: RISCompleteService orders detail, LISCompleteService orders detail, Billing invoice detail — để truy ngược về HSBA + phục vụ E2E test. (Không phá field cũ.)
3. Verify lifecycle NỘI TRÚ + PHẪU THUẬT bằng cách CHẠY THẬT script b2cef09 (test-ipd-e2e-lifecycle.ps1 + test-surgery-e2e-lifecycle.ps1) trên local/staging: cần BE build xanh trước (hoàn thiện/stub WIP EInvoice thiếu DTO/service + SpecimenImage thiếu DbSet SpecimenImages, hoặc tách nhánh test không gồm WIP). Chạy 2 script, báo cáo PASS/FAIL từng bước (admit→bed→order→vital→discharge; request→approve→schedule→check-in→start→complete). Fix bước nào fail.

P2 (tùy):
4. SurgeryComplete/services/search cho phép list-all khi keyword rỗng (hiện 400 "keyword required").

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0. Báo cáo từng mục.
```
