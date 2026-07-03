# VietQR EMVCo TLV — cheatsheet (HIS, per PaymentGatewayService.VietQR.cs)

## The EMVCo TLV string (each field: `<ID><len 2 digits><value>`)
| ID | Meaning | Value |
|---|---|---|
| 00 | Payload Format Indicator | `01` |
| 01 | Point of Initiation | `12` (dynamic, has amount) / `11` (static) |
| 38 | Merchant Account Info (VietQR) | Napas GUID `A000000727` + beneficiary(`00`=BIN, `01`=account) + `02`=`QRIBFTTA` |
| 53 | Currency | `704` (VND) |
| 54 | Amount | only when dynamic (amount>0), integer |
| 58 | Country | `VN` |
| 59 | Merchant Name | ≤25 ASCII (NormalizeAscii strips diacritics) |
| 60 | Merchant City | ≤15 ASCII |
| 62 | Additional Data | `08`=reference (≤25), embed `HIS <txnRef[-10:]>` for reconciliation |
| 63 | CRC | `6304` + CRC-16/CCITT-FALSE(the whole string up to `6304`) |

## CRC-16/CCITT-FALSE
poly `0x1021`, init `0xFFFF`, no reflect, xor-out `0x0000`. Output 4 uppercase hex.
Compute over the string already including `6304` (4 chars) then append the result.

## Napas BINs (fixed, don't change)
BIDV `970418` · VCB `970436` · Agribank `970405` · Vietinbank `970415` · MSB `970426`.

## NormalizeAscii (for ID 59/60/62)
NFD → strip NonSpacingMark → `đ→d`, `Đ→D` → keep ASCII printable 32..126 → trim.

## Config (do NOT hardcode the real account)
`appsettings PaymentGateway:Bank:<provider>`: `AccountNumber`, `MerchantName`, `MerchantCity`, `QrTemplate`.
`PaymentGateway:Bank:QrImageBase` (default `https://img.vietqr.io/image`) — only for QR preview.

## Verify the QR
Rough regex: `^000201010212.*5303704.*5802VN.*6304[0-9A-F]{4}$` (dynamic). Scan-test with a real bank app.

## Bank confirm → Receipt (checklist)
- [ ] txn exists, `Provider` ∈ {bidv,vcb,vietcombank,agribank,vietinbank,msb}, `Status != 1` (not yet confirmed)
- [ ] set `Status=1`, `PayDate`, `GatewayTxnRef`, `IpnRaw`
- [ ] `LinkReceiptAsync(txn, userId)` — `CashierId` = the confirming user (NOT Guid.Empty), fall back to admin for an IPN
- [ ] create a Receipt + e-invoice; write an audit
- [ ] ⚠️ regression VNPay/MoMo/ZaloPay (shared LinkReceiptAsync)
