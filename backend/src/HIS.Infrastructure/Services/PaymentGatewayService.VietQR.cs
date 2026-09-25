using System.Globalization;
using System.Text;
using HIS.Application.DTOs.Payment;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// VietQR (Napas247) generators cho 5 ngân hàng VN: BIDV, VCB, Agribank, Vietinbank, MSB.
/// Theo chuẩn EMVCo TLV - chuẩn QR thống nhất của Napas Vietnam.
/// Mỗi NH có BIN code riêng + số tài khoản merchant cấu hình trong appsettings.
/// QR sinh ra mọi banking app VN scan được, không cần merchant contract.
/// </summary>
public partial class PaymentGatewayService
{
    // BIN code chính thức Napas - không đổi
    private const string BIN_BIDV = "970418";
    private const string BIN_VCB = "970436";
    private const string BIN_AGRIBANK = "970405";
    private const string BIN_VIETINBANK = "970415";
    private const string BIN_MSB = "970426";

    private string BuildBankVietQrUrl(PaymentTransaction txn, CreatePaymentUrlDto dto, string provider)
    {
        var (bin, defaultAccount, defaultMerchant) = provider switch
        {
            "bidv" => (BIN_BIDV, "31410000123456", "BENH VIEN HIS - BIDV"),
            "vcb" or "vietcombank" => (BIN_VCB, "0011004567890", "BENH VIEN HIS - VCB"),
            "agribank" => (BIN_AGRIBANK, "1500201234567", "BENH VIEN HIS - AGRIBANK"),
            "vietinbank" => (BIN_VIETINBANK, "108001234567", "BENH VIEN HIS - VIETINBANK"),
            "msb" => (BIN_MSB, "0301012345678", "BENH VIEN HIS - MSB"),
            _ => throw new ArgumentException($"Bank không hỗ trợ: {provider}")
        };

        var cfg = _config.GetSection($"PaymentGateway:Bank:{provider}");
        var account = cfg["AccountNumber"] ?? defaultAccount;
        var merchantName = cfg["MerchantName"] ?? defaultMerchant;
        var merchantCity = cfg["MerchantCity"] ?? "HANOI";

        // Reference content: bao gồm TxnRef để hospital matcher đối soát thanh toán
        var refContent = $"HIS {txn.TxnRef[^10..]}";

        var qrData = BuildVietQrEmvcoString(
            bin: bin,
            accountNumber: account,
            amount: txn.Amount,
            refContent: refContent,
            merchantName: merchantName,
            merchantCity: merchantCity);

        // Public render URL từ vietqr.io (mọi NH support) - dùng cho preview
        // Production: BV cấu hình proxy nội bộ render QR qua endpoint riêng
        var imageBase = _config["PaymentGateway:Bank:QrImageBase"] ?? "https://img.vietqr.io/image";
        var template = cfg["QrTemplate"] ?? "compact2";
        var encodedAddInfo = Uri.EscapeDataString(refContent);
        var imageUrl = $"{imageBase}/{provider}-{account}-{template}.png?amount={(long)txn.Amount}&addInfo={encodedAddInfo}&accountName={Uri.EscapeDataString(merchantName)}";

        // Lưu QR data + image link
        txn.QrCodeData = qrData;
        txn.BankCode = bin;
        txn.RequestRaw = $"vietqr:{provider};bin={bin};acc={account};amount={txn.Amount};ref={refContent}";

        return imageUrl;
    }

    /// <summary>
    /// Build VietQR EMVCo TLV string. Support cả static (amount=0) và dynamic QR.
    /// </summary>
    public static string BuildVietQrEmvcoString(
        string bin,
        string accountNumber,
        decimal amount,
        string refContent,
        string merchantName,
        string merchantCity)
    {
        var sb = new StringBuilder();

        // ID 00: Payload Format Indicator
        sb.Append(EmvTlv("00", "01"));

        // ID 01: Point of Initiation - dynamic (12) vì có amount cụ thể
        sb.Append(EmvTlv("01", amount > 0 ? "12" : "11"));

        // ID 38: Merchant Account Info (mandatory for VietQR)
        var beneficiaryOrg = EmvTlv("00", bin) + EmvTlv("01", accountNumber);
        var merchantAccount =
            EmvTlv("00", "A000000727") +              // GUID NAPAS
            EmvTlv("01", beneficiaryOrg) +            // Beneficiary
            EmvTlv("02", "QRIBFTTA");                 // Service code: tài khoản
        sb.Append(EmvTlv("38", merchantAccount));

        // ID 53: Transaction Currency = VND (704)
        sb.Append(EmvTlv("53", "704"));

        // ID 54: Amount (chỉ khi dynamic)
        if (amount > 0)
        {
            var amountStr = ((long)amount).ToString(CultureInfo.InvariantCulture);
            sb.Append(EmvTlv("54", amountStr));
        }

        // ID 58: Country = VN
        sb.Append(EmvTlv("58", "VN"));

        // ID 59: Merchant Name (max 25 chars)
        var nameClean = NormalizeAscii(merchantName);
        if (nameClean.Length > 25) nameClean = nameClean[..25];
        sb.Append(EmvTlv("59", nameClean));

        // ID 60: Merchant City (max 15)
        var cityClean = NormalizeAscii(merchantCity);
        if (cityClean.Length > 15) cityClean = cityClean[..15];
        sb.Append(EmvTlv("60", cityClean));

        // ID 62: Additional Data - 08 = Reference
        if (!string.IsNullOrWhiteSpace(refContent))
        {
            var refClean = NormalizeAscii(refContent);
            if (refClean.Length > 25) refClean = refClean[..25];
            var additional = EmvTlv("08", refClean);
            sb.Append(EmvTlv("62", additional));
        }

        // ID 63: CRC-16/CCITT-FALSE
        sb.Append("6304");
        var crc = Crc16CcittFalse(sb.ToString());
        sb.Append(crc);

        return sb.ToString();
    }

    private static string EmvTlv(string id, string value)
    {
        return $"{id}{value.Length:D2}{value}";
    }

    private static string Crc16CcittFalse(string input)
    {
        const ushort poly = 0x1021;
        ushort crc = 0xFFFF;
        var bytes = Encoding.UTF8.GetBytes(input);
        foreach (var b in bytes)
        {
            crc ^= (ushort)(b << 8);
            for (int i = 0; i < 8; i++)
            {
                if ((crc & 0x8000) != 0)
                    crc = (ushort)((crc << 1) ^ poly);
                else
                    crc <<= 1;
            }
        }
        return crc.ToString("X4");
    }

    public async Task<PaymentTransactionDto> ConfirmBankTransferAsync(BankConfirmDto dto, Guid userId)
    {
        // QA-R11: two confirmations of the same QR (double click, two cashiers) both read Status 0 and each wrote a
        // payment receipt. Serialize per transaction and read the status only after holding the lock.
        await using var tx = await SqlAppLock.BeginAsync(_db);
        await SqlAppLock.AcquireAsync(_db, $"HIS.Payment.Confirm.{dto.TransactionId:N}",
            "Giao dịch này đang được xác nhận ở quầy khác, vui lòng tải lại.");
        var txn = await _db.PaymentTransactions
            .Include(t => t.Patient)
            .FirstOrDefaultAsync(t => t.Id == dto.TransactionId);

        if (txn == null) throw new KeyNotFoundException("Giao dịch không tồn tại");
        var supportedBanks = new[] { "bidv", "vcb", "vietcombank", "agribank", "vietinbank", "msb" };
        if (!supportedBanks.Contains(txn.Provider))
            throw new InvalidOperationException("Chỉ có thể xác nhận thủ công cho giao dịch ngân hàng");
        if (txn.Status == 1) throw new InvalidOperationException("Giao dịch đã được xác nhận");
        // QA-R11: a refunded transaction (3) could be "confirmed" again — money collected a second time.
        if (txn.Status == 3) throw new InvalidOperationException("Giao dịch đã hoàn tiền — không xác nhận lại được");
        // QA-R4: the QR's source was collected at the cashier while the QR stayed pending; confirming it wrote a
        // second payment receipt on an already-paid order (measured: 80.000đ order paid twice). A manual
        // confirmation has a human in the loop, so refuse and point at the refund path instead.
        await EnsureReferenceStillOwedAsync(txn);

        txn.Status = 1;
        // QA-R4 time: CompletedAt/PayDate are business timestamps (BankPayments "Hoàn tất"/"Ngày TT") → VN wall
        // clock; dto.PaidAt already arrives as VN wall clock (VnLocalDateTimeJsonConverter). ExpiresAt stays UTC.
        txn.CompletedAt = HIS.Core.Common.VnTime.NowVn;
        txn.PayDate = dto.PaidAt ?? HIS.Core.Common.VnTime.NowVn;
        txn.GatewayTxnRef = dto.BankReference ?? $"MANUAL-{DateTime.UtcNow:yyyyMMddHHmmss}";
        txn.ResponseCode = 0;
        txn.ResponseMessage = "Đối soát thủ công (kế toán BV)";
        txn.IpnRaw = System.Text.Json.JsonSerializer.Serialize(new
        {
            confirmType = "manual",
            confirmedBy = userId,
            bankRef = dto.BankReference,
            note = dto.Note,
            confirmedAt = DateTime.UtcNow
        });
        txn.UpdatedAt = DateTime.UtcNow;
        txn.UpdatedBy = userId.ToString();

        await LinkReceiptAsync(txn, userId);
        await _db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return MapToDto(txn);
    }

    /// <summary>QA-R4: refuse a manual bank confirmation when the money the QR was raised for was already collected.</summary>
    private async Task EnsureReferenceStillOwedAsync(PaymentTransaction txn)
    {
        const string hint = " — không xác nhận QR này; nếu tiền đã vào tài khoản, lập phiếu hoàn/tạm ứng cho bệnh nhân.";
        switch (txn.ReferenceType)
        {
            case "service-request":
                if (await _db.ServiceRequests.AnyAsync(s => s.Id == txn.ReferenceId && s.IsPaid))
                    throw new InvalidOperationException("Phiếu chỉ định của QR này đã được thu tại quầy" + hint);
                break;
            case "prescription":
                if (await _db.Prescriptions.AnyAsync(p => p.Id == txn.ReferenceId && p.IsPaid))
                    throw new InvalidOperationException("Đơn thuốc của QR này đã được thu tại quầy" + hint);
                break;
            case "discharge":
                if (txn.MedicalRecordId.HasValue)
                {
                    var owed = (await InvoiceLedger.LoadAsync(_db, txn.MedicalRecordId.Value)).PatientTotal;
                    var discount = await _db.InvoiceSummaries
                        .Where(i => i.MedicalRecordId == txn.MedicalRecordId.Value && !i.IsDeleted)
                        .SumAsync(i => (decimal?)i.DiscountAmount) ?? 0;
                    var (collected, refunded) = await InvoiceLedger.PaidOnRecordAsync(_db, txn.MedicalRecordId.Value);
                    if (owed - discount - (collected - refunded) < txn.Amount)
                        throw new InvalidOperationException("Hồ sơ của QR này không còn nợ đủ số tiền QR (đã thu tại quầy)" + hint);
                }
                break;
        }
        if (txn.InvoiceSummaryId.HasValue)
        {
            var invoice = await _db.InvoiceSummaries.AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == txn.InvoiceSummaryId.Value && !i.IsDeleted);
            if (invoice != null && invoice.Status != 2 && invoice.RemainingAmount < txn.Amount)
                throw new InvalidOperationException(
                    $"Hóa đơn của QR này chỉ còn nợ {invoice.RemainingAmount:N0}đ, QR {txn.Amount:N0}đ" + hint);
        }
    }

    private static string NormalizeAscii(string s)
    {
        if (string.IsNullOrEmpty(s)) return string.Empty;
        // Bỏ dấu tiếng Việt cho EMV compatibility
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in normalized)
        {
            var uc = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch);
            if (uc != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        var ascii = sb.ToString()
            .Replace("đ", "d").Replace("Đ", "D")
            .Replace("Đ", "D");
        // Giữ ký tự ASCII printable
        var result = new StringBuilder();
        foreach (var ch in ascii)
        {
            if (ch >= 32 && ch <= 126) result.Append(ch);
            else result.Append(' ');
        }
        return result.ToString().Trim();
    }
}
