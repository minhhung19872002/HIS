---
name: his-be-payment-gateway
description: Use this skill when working on HIS cashless payment — VietQR/Napas247 bank QR, VNPay/MoMo/ZaloPay, IPN/return callbacks, manual bank confirm, and linking a paid transaction to a Receipt + e-invoice. Triggers include PaymentGatewayService (VietQR partial), EMVCo TLV/CRC QR generation, /api/payment/* endpoints, BankPayments page, or the LinkReceiptAsync CashierId FK issue. Do NOT use for generic CRUD backend (his-be-module-scaffold) unrelated to payment.
type: project
---

# HIS Payment Gateway (VietQR / VNPay / MoMo / ZaloPay)

> TẦNG: **B · PROJECT/HIS** (system). Depend: `core-types-contract`, `core-validation-pattern`, `his-be-module-scaffold` (cấu trúc service), `his-qa-anti-pattern`.

Skill cho **thanh toán không tiền mặt** HIS: VietQR (Napas247, 5 NH) + VNPay/MoMo/ZaloPay + đối soát thủ công ngân hàng + link giao dịch đã trả vào Receipt/HĐĐT. Có logic đặc thù (EMVCo TLV, CRC-16, IPN, FK Receipt) nên tách skill riêng thay vì backend-scaffold chung.

## Khi nào dùng
- Sửa/thêm `PaymentGatewayService` (gồm partial `PaymentGatewayService.VietQR.cs`).
- Sinh QR VietQR EMVCo (BIN + account + amount + CRC), thêm/đổi ngân hàng.
- Xử lý IPN/return (VNPay/MoMo/ZaloPay), bank confirm thủ công.
- Page `BankPayments`, endpoint `/api/payment/*`.

## Khi nào KHÔNG dùng
- CRUD nghiệp vụ thường không liên quan thanh toán → `his-be-module-scaffold`.
- Page list/detail thuần → `his-fe-page-v2` (BankPayments UI vẫn có thể dùng kèm).

## Kiến trúc (NangCap24)
- BE: `PaymentGatewayService` + partial `PaymentGatewayService.VietQR.cs` · controller `/api/payment` · entity `PaymentTransaction` (sẵn có) + `Receipt`.
- Endpoint chính: `GET /payment/bank/list` (5 NH), `POST /payment/create-url` (VietQR khi provider∈bank), `POST /payment/bank/confirm` `[Admin,Accountant,Cashier]`, IPN/return `[AllowAnonymous]`, `POST /payment/refund` `[Admin,Accountant]`.
- FE: `pages-v2/BankPayments.tsx` + `api/nangcap24.ts` object `bankPayment`.

## Quy trình chuẩn
1. **VietQR EMVCo** (`references/vietqr-emvco-notes.md`): build chuỗi TLV theo ID 00/01/38/53/54/58/59/60/62/63; CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF); `NormalizeAscii` bỏ dấu tiếng Việt. BIN cố định Napas: BIDV 970418, VCB 970436, Agribank 970405, Vietinbank 970415, MSB 970426.
- Số TK + merchant name lấy từ `appsettings PaymentGateway:Bank:<provider>` (KHÔNG hardcode TK thật).
2. **Confirm/IPN → Receipt**: khi giao dịch paid → `LinkReceiptAsync(txn, userId)` tạo Receipt + HĐĐT. Validate theo `core-validation-pattern` (txn tồn tại, đúng provider bank, chưa confirm → idempotent).
3. **FE**: BankPayments hiển thị giao dịch + QR (img.vietqr.io preview) + modal confirm. Theo `his-fe-page-v2` cho layout.
4. **Verify**: QR string khớp regex `^00020101...6304[0-9A-F]{4}$`; confirm → status paid + Receipt tạo, KHÔNG 500.

## ⚠️ Known bug đã fix (giữ, đừng tái phạm — commit b523579)
- `LinkReceiptAsync` từng set `Receipt.CashierId = Guid.Empty` → vi phạm FK `FK_Receipts_Users_Cashier` (non-null) → 500. **Fix**: resolve `cashierId` về user xác nhận; fallback admin/system khi IPN online (không có user context).
- Hàm này **dùng chung** cho VNPay/MoMo/ZaloPay/VietQR → sửa nó phải **regression cả 4 cổng** (xem `his-test-e2e`).

## Pitfalls
- **CRC sai** → app NH không scan được QR / BN chuyển nhầm. Tính CRC trên đúng chuỗi tới `6304`.
- **Hardcode số TK BV** → dùng appsettings/env (`his-qa-anti-pattern`).
- **Confirm 2 lần** → double Receipt. Phải reject khi `Status==1` (idempotent).
- **IPN AllowAnonymous** nhưng phải verify chữ ký/secret của cổng (HMAC) trước khi tin.
- **Audit**: mọi confirm/refund ghi audit + đúng user.

## Reference
- `references/vietqr-emvco-notes.md` — cấu trúc EMVCo TLV + CRC-16 + BIN + checklist confirm

## When to update
- Khi thêm ngân hàng/cổng thanh toán mới, đổi schema Receipt, hoặc wire merchant API thật.
