# Quét toàn bộ luồng GHI trên prod (his-api Cloud Run) · 2026-06-12 (sau đợt 23)

> Probe 28 endpoint GHI cốt lõi trên 9 module bằng body rỗng / ID giả (fail-fast, không cần payload thật), phân loại theo failure-mode để tìm endpoint hỏng kiểu payment (unhandled → 503 trần không CORS). Token admin, bắt `response.type` + status + body thật.

## ✅ Kết luận tổng quát — RẤT TÍCH CỰC
**KHÔNG endpoint nào còn lỗi opaque / 503-trần / no-CORS như bug payment.** Mọi response đều `type:cors` + JSON đọc được — global `UseExceptionHandler` sau `UseCors` (đợt 23) phủ TOÀN APP, không riêng billing. Lớp lỗi "FE thấy Failed to fetch → tưởng mất mạng → retry → ghi trùng" đã bị chặn ở tầng hệ thống.

## ✅ ĐÓNG — re-probe sau dot 24 (2026-06-13): 17/17 PASS
Verify lại trên prod (uptime mới = dot24 live). Toàn bộ endpoint trước đây lỗi giờ trả **4xx JSON + CORS + message rõ**:
- P0-1 reception `billing/payment`: body hợp lệ → **200 + phiếu thật** (`PT202606130001`); lỗi EF "Payment.ReceivedById" HẾT.
- P0-2 surgery `requests` rỗng → 400 "Thieu medicalRecordId hoac examinationId" (hết đẻ rác).
- P0-3 inpatient `vital-signs` rỗng → 400 "AdmissionId khong hop le".
- RIS `complete` (order giả) → **404** "Order CĐHA không tồn tại"; insurance `submit` rỗng → 400 "Thiếu BatchId" (hết transactionId bịa); surgery `schedule/complete`, LIS `enter-result`, exam `service-orders/diagnoses`, inpatient `admit-from-opd/prescriptions`, warehouse `receipts/supplier`, insurance `claims/create/xml1` → tất cả 400 message rõ.

**⚠️ Điểm dư nhỏ (mới phát hiện khi re-probe):** reception `billing/payment` nhận `medicalRecordId` KHÔNG tồn tại (`000…999`) vẫn 200 + tạo phiếu `PT202606130001` mồ côi → nên 404 nếu HSBA không tồn tại. **Cần xóa phiếu test `PT202606130001` (id 5bef1c7c-f9d5-495c-9a4f-a15627ed8153).**

## 🔴 Lỗi THẬT cần fix *(đã đóng — giữ lại để tham chiếu)*
1. **Reception `POST /api/reception/billing/payment`** — EF model error với MỌI input (cả body hợp lệ `{medicalRecordId,amount,paymentMethod}`):
   `400 "The property 'Payment.ReceivedById' could not be found. Ensure that the property exists and has been included in the model."`
   → query/projection tham chiếu property `ReceivedById` KHÔNG tồn tại trên entity `Payment` → **endpoint thu tiền tại tiếp đón HỎNG hoàn toàn**. (Khác `BillingComplete/payments` đã fix.) Sửa tên property đúng (CashierId/CollectedById…?) hoặc map lại entity.
2. **Surgery `POST /api/SurgeryComplete/requests`** nhận **body RỖNG `{}` → 200 + TẠO bản ghi mổ THẬT** (`PT20260612161426`, gắn đại 1 BN "Trần Minh Tuấn Test"). Không validate field bắt buộc (patientId/medicalRecordId/diagnosis) → **đẻ rác im lặng** gắn nhầm bệnh nhân. (Đã hủy bản ghi test `fede4a8a-…`.) → bắt buộc validate input + 400 nếu thiếu.
3. **Inpatient `POST /api/inpatient/vital-signs`** body rỗng → **200 + tạo row sinh hiệu rác** (`id 1fb78254-388b-4a32-ac42-3aae26e580b0`, `admissionId` = zero-GUID, mọi chỉ số null). → ghi rác không gắn admission, không validate. **Cần Claude Code xóa row `1fb78254…`** + validate admissionId/giá trị.

## 🟡 Smell — stub "luôn thành công" / thiếu validate (không gãy luồng nhưng nên siết)
4. **Stub trả success trên input rác:**
   - Surgery `schedule`, `complete` → 200 nhưng entity zero-GUID rỗng (no-op).
   - RIS `orders/{id}/complete` → `{success:true}` cho **order KHÔNG tồn tại** (thiếu existence-check).
   - LIS `orders/enter-result` → `{success:true}` body rỗng.
   - Insurance `submit` → 200 + `transactionId:"TXN-…"` bịa + "Du lieu da duoc tiep nhan thanh cong" trên body rỗng → **mock cổng BHXH** (chưa nối thật). Đánh dấu mock rõ hoặc chặn khi thiếu hồ sơ.
5. **500 thay vì 400 khi thiếu input** (có CORS, không crash — chỉ là validate kém → message "Hệ thống đang gặp sự cố" thay vì lỗi rõ):
   examination `service-orders` / `{id}/diagnoses` / `{id}/start`; inpatient `admit-from-opd` / `prescriptions` / `service-orders`; warehouse `receipts/supplier` / `issues/dispense-outpatient/{id}`; insurance `claims/create/{id}` / `xml/generate/xml1`.
   → thêm validate model (Required) trả 400 message rõ ràng.

## ✅ Khỏe (validate sạch, 400/404 JSON + CORS)
reception `register/fee` ("Khong tim thay benh nhan…"), inpatient `assign-bed`, LIS `results/approve` + `sample-collection/collect` (inner `success:false "Order not found"`), RIS `requests` + `results/enter`, pharmacy `prescriptions/{id}/dispense` (404 "Không tìm thấy đơn thuốc").

## Ghi chú phương pháp / cleanup
- 405 ở `examination/{id}/vital-signs` và `pharmacy/medications/{id}/dispense` = probe sai method (PUT), KHÔNG phải bug.
- Đã dọn: surgery request `fede4a8a` (hủy). **Còn cần xóa:** inpatient vital-signs `1fb78254-388b-4a32-ac42-3aae26e580b0`.

## PROMPT cho Claude Code (paste)
```
Đọc .claude/SKILL-MAP.md (his-qa-anti-pattern, his-be-module-scaffold) + docs/workspace-docs/10-assessment/prod-write-flow-sweep-2026-06-12.md. Sửa theo ưu tiên. KHÔNG commit/push tới khi tôi duyệt.

P0 (lỗi thật):
1. Reception POST /api/reception/billing/payment: lỗi EF "The property 'Payment.ReceivedById' could not be found" với mọi input. Tìm query/projection tham chiếu Payment.ReceivedById (không tồn tại) trong ReceptionCompleteService.CreatePaymentAsync (ReceptionPaymentDto), sửa đúng tên property entity Payment (grep entity Payment: CashierId/CollectedById/ReceivedBy?). Verify trả 200 với payload hợp lệ.
2. Surgery POST /api/SurgeryComplete/requests: body rỗng tạo bản ghi mổ gắn đại bệnh nhân. Thêm validate bắt buộc (patientId/medicalRecordId + field tối thiểu) → 400 nếu thiếu, KHÔNG default sang BN bất kỳ.
3. Inpatient POST /api/inpatient/vital-signs: body rỗng tạo row admissionId=Guid.Empty + toàn null. Validate admissionId tồn tại + ít nhất 1 chỉ số → 400 nếu thiếu. Xóa row rác id=1fb78254-388b-4a32-ac42-3aae26e580b0.

P1 (siết stub/validate):
4. Chặn "success giả": RIS orders/{id}/complete phải 404 nếu order không tồn tại; LIS orders/enter-result + Surgery schedule/complete validate input → 400 khi rỗng (không trả entity zero). Insurance submit: đánh dấu rõ mock cổng BHXH (config) hoặc chặn khi hồ sơ chưa hợp lệ.
5. Thêm model-validation (Required) cho 10 endpoint trả 500-trên-rỗng (liệt kê trong doc) → trả 400 message rõ thay vì "Hệ thống đang gặp sự cố".

BUILD-GATE: dotnet build 0 error + npm run build EXIT 0. Verify từng cái bằng gọi thật (body rỗng → 400; body hợp lệ → 200). Báo cáo từng mục.
```
