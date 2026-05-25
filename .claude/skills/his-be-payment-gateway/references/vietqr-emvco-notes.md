# VietQR EMVCo TLV — cheatsheet (HIS, theo PaymentGatewayService.VietQR.cs)

## Chuỗi EMVCo TLV (mỗi field: `<ID><len 2 chữ số><value>`)
| ID | Ý nghĩa | Value |
|---|---|---|
| 00 | Payload Format Indicator | `01` |
| 01 | Point of Initiation | `12` (dynamic, có amount) / `11` (static) |
| 38 | Merchant Account Info (VietQR) | GUID Napas `A000000727` + beneficiary(`00`=BIN, `01`=account) + `02`=`QRIBFTTA` |
| 53 | Currency | `704` (VND) |
| 54 | Amount | chỉ khi dynamic (amount>0), số nguyên |
| 58 | Country | `VN` |
| 59 | Merchant Name | ≤25 ASCII (NormalizeAscii bỏ dấu) |
| 60 | Merchant City | ≤15 ASCII |
| 62 | Additional Data | `08`=reference (≤25), nhúng `HIS <txnRef[-10:]>` để đối soát |
| 63 | CRC | `6304` + CRC-16/CCITT-FALSE(toàn chuỗi tính tới `6304`) |

## CRC-16/CCITT-FALSE
poly `0x1021`, init `0xFFFF`, không reflect, xor-out `0x0000`. Output 4 hex hoa.
Tính trên chuỗi đã gồm `6304` (4 ký tự) rồi append kết quả.

## BIN Napas (cố định, không đổi)
BIDV `970418` · VCB `970436` · Agribank `970405` · Vietinbank `970415` · MSB `970426`.

## NormalizeAscii (cho ID 59/60/62)
NFD → bỏ NonSpacingMark → `đ→d`, `Đ→D` → giữ ASCII printable 32..126 → trim.

## Cấu hình (KHÔNG hardcode TK thật)
`appsettings PaymentGateway:Bank:<provider>`: `AccountNumber`, `MerchantName`, `MerchantCity`, `QrTemplate`.
`PaymentGateway:Bank:QrImageBase` (default `https://img.vietqr.io/image`) — chỉ để preview QR.

## Verify QR
Regex sơ bộ: `^000201010212.*5303704.*5802VN.*6304[0-9A-F]{4}$` (dynamic). Quét thử bằng app NH thật.

## Bank confirm → Receipt (checklist)
- [ ] txn tồn tại, `Provider` ∈ {bidv,vcb,vietcombank,agribank,vietinbank,msb}, `Status != 1` (chưa confirm)
- [ ] set `Status=1`, `PayDate`, `GatewayTxnRef`, `IpnRaw`
- [ ] `LinkReceiptAsync(txn, userId)` — `CashierId` = user xác nhận (KHÔNG Guid.Empty), fallback admin nếu IPN
- [ ] tạo Receipt + HĐĐT; ghi audit
- [ ] ⚠️ regression VNPay/MoMo/ZaloPay (dùng chung LinkReceiptAsync)
