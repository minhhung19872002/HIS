# NangCap25 — QR động Vietcombank kết nối viện phí

> Gói thầu: **Cung cấp Phần mềm QR động kết nối với hệ thống quản lý viện phí (HIS)**
> Chủ đầu tư: **Bệnh viện Việt Nam - Thụy Điển Uông Bí** · Ngân hàng: **Vietcombank (VCB, BIN 970436)**
> Nguồn yêu cầu: `docs/requirements/20-yeu-cau-nang-cap/NangCap25.pdf` · Tracking: **Issue #358**

Hỗ trợ thanh toán không dùng tiền mặt bằng **QR động (VietQR/EMVCo)** trên toàn luồng khám chữa bệnh:
chỉ định CLS, đơn thuốc, quầy thuốc, tạm ứng nội trú, thanh toán ra viện, kiosk tự phục vụ; kèm
đối soát ngân hàng, báo cáo người tạo QR và chi hộ hoàn tiền thừa.

## Kiến trúc (tận dụng hạ tầng NangCap24 đã có)

Gói QR động **mở rộng** `PaymentGatewayService` (đã có sẵn EMVCo builder + VCB provider từ NangCap24),
**KHÔNG** dựng lại cổng thanh toán mới.

| Lớp | File | Vai trò |
|---|---|---|
| Entity | `HIS.Core/Entities/PaymentGateway.cs` | `PaymentTransaction` + cột `ReferenceType/ReferenceId/ReferenceData`; entity mới `RefundDisbursement` |
| Migration | `HIS.Infrastructure/Data/Scripts/141_nangcap25_dynamic_qr.sql` | thêm cột + bảng `RefundDisbursements` (idempotent) |
| Service | `HIS.Infrastructure/Services/PaymentGatewayService.DynamicQr.cs` | QR động theo nguồn + paid-hook + báo cáo VI.1/VI.2 |
| Service | `HIS.Infrastructure/Services/RefundDisbursementService.cs` | chi hộ hoàn tiền (IV, MockMode) |
| Controller | `HIS.API/Controllers/PaymentGatewayController.cs` | endpoints `/api/payment/qr/*`, `/kiosk/*`, `/reports/*`, `/disbursement/*` |
| FE client | `frontend/src/api/nangcap25.ts` | typed client |
| FE dùng chung | `frontend/src/components/PaymentQRModal.tsx` | modal QR (bank VietQR render local + confirm thủ công) |
| FE trang | `frontend/src/pages-v2/QrPaymentCenter.tsx` (route `/v2/qr-payment-center`, menu `[25]`) | đối soát + báo cáo + chi hộ |
| FE tích hợp | `BillingEditor.tsx`, `HospitalPharmacy.tsx`, `KioskSelfService.tsx` | nút/tab thanh toán QR |

## Đối chiếu yêu cầu (3.2) → hiện trạng

| Mục | Chức năng | Trạng thái | Ghi chú |
|---|---|---|---|
| I.1 | Sinh QR khi chỉ định CLS | ✅ | `POST /payment/qr/dynamic` (service-request) |
| I.2 | Sinh QR khi kê đơn | ✅ | (prescription) |
| I.3 | In đơn thuốc kèm QR | ✅ | `GeneratePrescriptionAsync` nhúng QR block |
| I.4 | In phiếu chỉ định kèm QR | ✅ | `PrintServiceOrderAsync` nhúng QR block |
| I.5 | Thanh toán CLS/đơn thuốc ngoại trú bằng QR | ✅ | BillingEditor v2 method VietQR |
| I.6 | Xuất hóa đơn ngay tại nơi thanh toán | ✅ | `AutoIssueElectronicInvoiceAsync` sau paid |
| I.7 | Sinh QR tại quầy thuốc | ✅ | HospitalPharmacy drawer (retail-sale) |
| I.8 | Kiosk thanh toán | ✅ | Kiosk tab "Thanh toán QR" + `/payment/kiosk/qr` |
| II.1 | Sinh QR chỉ định đóng tạm ứng | ✅ | (deposit) |
| II.2 | In phiếu tạm ứng kèm QR | ✅ | `PrintDepositByServiceAsync` nhúng QR |
| II.3 | Đóng tạm ứng bằng QR | ✅ | paid-hook tạo `Deposit` (PaymentMethod=4) |
| III.1 | Sinh QR khi ra viện | ✅ | (discharge, số tiền = còn nợ pre-discharge) |
| III.2 | In phiếu thanh toán nội trú kèm QR | ✅ | `PrintBillingStatement6556Async` nhúng QR |
| III.3 | Hoàn ứng/thanh toán nội trú bằng QR | ✅ | qua BillingEditor + discharge QR |
| III.4 | Xuất hóa đơn sau QR (tổng HĐ = tổng chi phí) | ✅ | e-invoice auto theo txn amount |
| IV.1 | Chi tiền thừa qua TK VCB đến khách hàng | ✅ (MockMode) | `RefundDisbursementService`; API giải ngân thật cần merchant contract VCB |
| IV.2 | Báo cáo chi tiền thừa | ✅ | tab "Chi hộ hoàn tiền" |
| V.1 | Liên thông HIS/LIS/PACS sau thanh toán | ✅ | paid-hook set `ServiceRequest.IsPaid`+Status 0→1 (gate thực hiện dịch vụ) |
| VI.1 | Báo cáo tài chính, ghi rõ người tạo QR | ✅ | `/payment/reports/qr-finance` |
| VI.2 | Báo cáo đối soát ngân hàng | ✅ | `/payment/reports/bank-reconciliation` |
| VI.3 | Không xung đột QR Vietinbank | ✅ | provider tách biệt trong cùng EMVCo builder |

Yêu cầu phi chức năng (3.3): Unicode UTF-8, VND, XML/EMVCo, audit log (`CreatedBy`), phân quyền
(`[Authorize]` role Admin/Accountant/Cashier), Windows Server (Cloud Run/Docker) — đáp ứng bởi nền tảng sẵn có.

## API tóm tắt

| Method | Route | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/payment/qr/dynamic` | Authorize | Sinh QR động gắn nguồn (service-request/prescription/retail-sale/deposit/discharge) |
| POST | `/api/payment/kiosk/qr` | Anonymous | Kiosk: tra khoản chờ TT + QR gộp theo mã BN + ngày sinh |
| GET | `/api/payment/kiosk/qr-status/{txnId}` | Anonymous | Poll trạng thái (chỉ status) |
| POST | `/api/payment/bank/confirm` | Admin/Accountant/Cashier | Xác nhận thủ công GD ngân hàng (đã có) → kích paid-hook |
| GET | `/api/payment/reports/qr-finance` | Admin/Accountant | VI.1 báo cáo người tạo QR |
| GET | `/api/payment/reports/bank-reconciliation` | Admin/Accountant | VI.2 đối soát |
| POST/GET | `/api/payment/disbursement[...]` | Admin/Accountant | IV chi hộ hoàn tiền (create/execute/cancel/search) |

## Paid-hook (V.1) — cơ chế cập nhật ngược

`LinkReceiptAsync` (gọi từ confirm thủ công + IPN VNPay/MoMo/ZaloPay) → `ApplyPaidReferenceAsync`:
- `service-request` / `kiosk`: set `IsPaid=true`, `Status 0→1` → **mở gate LIS/PACS thực hiện dịch vụ**.
- `retail-sale`: cập nhật `PaidAmount` + `PaymentReference`.
- `deposit`: tạo `Deposit` (PaymentMethod=4, đã xác nhận) → số dư tạm ứng dùng được.
- `prescription`/`discharge`: đối chiếu qua `Receipt` (không đổi trạng thái nguồn).

Lỗi trong hook **không** chặn ghi nhận thanh toán chính (chỉ log warning).

## Cấu hình

```
PaymentGateway:DefaultBankProvider            = vietcombank
PaymentGateway:Bank:vietcombank:AccountNumber = <số TK BV, qua env - KHÔNG hardcode>
PaymentGateway:Bank:vietcombank:MerchantName  = BENH VIEN VIET NAM THUY DIEN
PaymentGateway:Bank:DynamicQrExpiryMinutes    = 1440   (QR in trên phiếu, mặc định 24h)
PaymentGateway:Disbursement:MockMode          = true   (đặt false khi có API giải ngân VCB)
```

## Kiểm thử

Smoke + regression: `scripts/test-nangcap25.ps1` — **30/30 PASS** (backend chạy localhost:5106 + docker `his-sqlserver`):
migration, QR 5 nguồn, idempotent, paid-hook (IsPaid+Status, Deposit, RetailSale.PaidAmount), kiosk +
reject sai ngày sinh, 2 báo cáo VI.1/VI.2, chi hộ create/execute-mock/search, 4 phiếu in kèm QR,
regression 3 cổng cũ (VNPay/VCB/bank-list), validation guards (400 không 500), **regression BN xóa mềm**.

## Bug phát hiện & sửa trong quá trình test (2026-07-03)

1. **Business guard trả 500 thay vì 400** — `InvalidOperationException` ("đã thanh toán", "không còn nợ"...)
   rơi xuống 500 vì `PaymentGatewayController` thiếu `[TypeFilter(DomainExceptionFilter)]` (filter KHÔNG global).
   Fix: gắn attribute → map Invalid/Argument/KeyNotFound → 400/404.
2. **★ Giao dịch có bệnh nhân xóa mềm bị "biến mất" (root-cause, bug tiềm ẩn có sẵn)** —
   `PaymentTransaction.Patient` là **required navigation**; khi Patient `IsDeleted=1`, filtered `.Include(t=>t.Patient)`
   biến EF thành INNER JOIN → **ẩn luôn giao dịch** khỏi confirm (500) / getById (404) / **báo cáo đối soát VI.2**.
   Ảnh hưởng mọi query payment dùng `.Include(Patient)` (không riêng NangCap25). Fix ROOT tại `HISDbContext`:
   `modelBuilder.Entity<PaymentTransaction>().Navigation(t => t.Patient).IsRequired(false)` → LEFT JOIN đúng,
   1 dòng sửa toàn bộ (confirm/getById/search/reports/VNPay-return). Regression check trong test script.
