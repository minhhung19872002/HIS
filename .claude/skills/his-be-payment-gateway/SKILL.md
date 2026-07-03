---
name: his-be-payment-gateway
description: Use this skill when working on HIS cashless payment — VietQR/Napas247 bank QR, VNPay/MoMo/ZaloPay, IPN/return callbacks, manual bank confirm, and linking a paid transaction to a Receipt + e-invoice. Triggers include PaymentGatewayService (VietQR partial), EMVCo TLV/CRC QR generation, /api/payment/* endpoints, BankPayments page, or the LinkReceiptAsync CashierId FK issue. Do NOT use for generic CRUD backend (his-be-module-scaffold) unrelated to payment.
metadata:
  type: project
---

# HIS Payment Gateway (VietQR / VNPay / MoMo / ZaloPay)

> TIER: **B · PROJECT/HIS** (system). Depends: `core-types-contract`, `core-validation-pattern`, `his-be-module-scaffold` (service structure), `his-qa-anti-pattern`.

A skill for HIS **cashless payment**: VietQR (Napas247, 5 banks) + VNPay/MoMo/ZaloPay + manual bank reconciliation + linking a paid transaction to a Receipt/e-invoice. It has specialized logic (EMVCo TLV, CRC-16, IPN, Receipt FK) so it's a separate skill instead of the generic backend-scaffold.

## When to use
- Editing/adding `PaymentGatewayService` (including the partial `PaymentGatewayService.VietQR.cs`).
- Generating a VietQR EMVCo QR (BIN + account + amount + CRC), adding/changing a bank.
- Handling IPN/return (VNPay/MoMo/ZaloPay), a manual bank confirm.
- The `BankPayments` page, the `/api/payment/*` endpoints.

## When NOT to use
- A normal business CRUD unrelated to payment → `his-be-module-scaffold`.
- A pure list/detail page → `his-fe-page-v2` (the BankPayments UI can still use it alongside).

## Architecture (NangCap24)
- BE: `PaymentGatewayService` + partial `PaymentGatewayService.VietQR.cs` · controller `/api/payment` · entity `PaymentTransaction` (existing) + `Receipt`.
- Main endpoints: `GET /payment/bank/list` (5 banks), `POST /payment/create-url` (VietQR when provider∈bank), `POST /payment/bank/confirm` `[Admin,Accountant,Cashier]`, IPN/return `[AllowAnonymous]`, `POST /payment/refund` `[Admin,Accountant]`.
- FE: `pages-v2/BankPayments.tsx` + `api/nangcap24.ts` object `bankPayment`.

## Standard process
1. **VietQR EMVCo** (`references/vietqr-emvco-notes.md`): build the TLV string per ID 00/01/38/53/54/58/59/60/62/63; CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF); `NormalizeAscii` strips Vietnamese diacritics. Fixed Napas BINs: BIDV 970418, VCB 970436, Agribank 970405, Vietinbank 970415, MSB 970426.
- The account number + merchant name come from `appsettings PaymentGateway:Bank:<provider>` (do NOT hardcode the real account).
2. **Confirm/IPN → Receipt**: when a transaction is paid → `LinkReceiptAsync(txn, userId)` creates a Receipt + e-invoice. Validate per `core-validation-pattern` (txn exists, correct bank provider, not yet confirmed → idempotent).
3. **FE**: BankPayments shows the transaction + QR (img.vietqr.io preview) + a confirm modal. Follow `his-fe-page-v2` for layout.
4. **Verify**: the QR string matches the regex `^00020101...6304[0-9A-F]{4}$`; confirm → status paid + a Receipt created, NO 500.

## ⚠️ Known bug already fixed (keep, don't reintroduce — commit b523579)
- `LinkReceiptAsync` once set `Receipt.CashierId = Guid.Empty` → violated the FK `FK_Receipts_Users_Cashier` (non-null) → 500. **Fix**: resolve `cashierId` to the confirming user; fall back to admin/system for an online IPN (no user context).
- This function is **shared** across VNPay/MoMo/ZaloPay/VietQR → editing it must **regression-test all 4 gateways** (see `his-test-e2e`).

## Pitfalls
- **Wrong CRC** → the bank app can't scan the QR / the patient transfers wrong. Compute the CRC on the exact string up to `6304`.
- **Hardcoding the hospital account number** → use appsettings/env (`his-qa-anti-pattern`).
- **Confirming twice** → a double Receipt. Must reject when `Status==1` (idempotent).
- **IPN AllowAnonymous** but you must verify the gateway's signature/secret (HMAC) before trusting it.
- **Audit**: every confirm/refund logs an audit + the correct user.

## Reference
- `references/vietqr-emvco-notes.md` — the EMVCo TLV structure + CRC-16 + BIN + confirm checklist

## When to update
- When adding a new bank/payment gateway, changing the Receipt schema, or wiring a real merchant API.
