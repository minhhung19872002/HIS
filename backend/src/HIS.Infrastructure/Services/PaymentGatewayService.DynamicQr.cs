using HIS.Application.DTOs.Payment;
using HIS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap25 — QR động Vietcombank gắn nguồn nghiệp vụ:
/// chỉ định CLS / đơn thuốc / bán lẻ quầy thuốc / tạm ứng nội trú / thanh toán ra viện / kiosk.
/// Số tiền LUÔN tính ở BE từ bản ghi nguồn (không tin client); khi giao dịch paid,
/// LinkReceiptAsync gọi ApplyPaidReferenceAsync để cập nhật ngược trạng thái nguồn
/// (V.1: ServiceRequest.IsPaid + Status 0→1 là gate cho LIS/PACS thực hiện dịch vụ).
/// </summary>
public partial class PaymentGatewayService
{
    private static readonly string[] BankQrProviders = { "bidv", "vcb", "vietcombank", "agribank", "vietinbank", "msb" };

    private const string RefServiceRequest = "service-request";
    private const string RefPrescription = "prescription";
    private const string RefRetailSale = "retail-sale";
    private const string RefDeposit = "deposit";
    private const string RefDischarge = "discharge";
    private const string RefKiosk = "kiosk";

    private string ResolveBankProvider(string? requested)
    {
        var p = (string.IsNullOrWhiteSpace(requested)
            ? _config["PaymentGateway:DefaultBankProvider"] ?? "vietcombank"
            : requested).ToLowerInvariant();
        if (!BankQrProviders.Contains(p))
            throw new ArgumentException($"Provider không phải ngân hàng VietQR: {p}");
        return p;
    }

    public async Task<PaymentUrlResponseDto> CreateDynamicQrAsync(DynamicQrRequestDto dto, string ipAddress, Guid userId)
    {
        var provider = ResolveBankProvider(dto.Provider);
        var refType = dto.ReferenceType.Trim().ToLowerInvariant();

        Guid patientId;
        Guid? medicalRecordId = null;
        decimal amount;
        string orderType, orderInfo;

        switch (refType)
        {
            case RefServiceRequest:
            {
                var sr = await _db.ServiceRequests
                    .Include(s => s.MedicalRecord)
                    .FirstOrDefaultAsync(s => s.Id == dto.ReferenceId)
                    ?? throw new InvalidOperationException("Phiếu chỉ định không tồn tại");
                if (sr.IsPaid)
                    throw new InvalidOperationException("Phiếu chỉ định đã thanh toán");
                if (sr.Status == 4)
                    throw new InvalidOperationException("Phiếu chỉ định đã hủy");
                amount = sr.PatientAmount > 0 ? sr.PatientAmount
                    : (sr.TotalAmount > 0 ? sr.TotalAmount : sr.TotalPrice);
                if (amount <= 0)
                    throw new InvalidOperationException("Phiếu chỉ định không có khoản bệnh nhân phải trả");
                patientId = sr.MedicalRecord.PatientId;
                medicalRecordId = sr.MedicalRecordId;
                orderType = "service";
                orderInfo = $"TT chi dinh {sr.RequestCode}";
                break;
            }
            case RefPrescription:
            {
                var p = await _db.Prescriptions
                    .Include(x => x.MedicalRecord)
                    .FirstOrDefaultAsync(x => x.Id == dto.ReferenceId)
                    ?? throw new InvalidOperationException("Đơn thuốc không tồn tại");
                if (p.Status == 4)
                    throw new InvalidOperationException("Đơn thuốc đã hủy");
                await EnsureNoPaidTxnAsync(refType, dto.ReferenceId, "Đơn thuốc đã có giao dịch QR thanh toán thành công");
                amount = p.PatientAmount > 0 ? p.PatientAmount : p.TotalAmount;
                if (amount <= 0)
                    throw new InvalidOperationException("Đơn thuốc không có khoản bệnh nhân phải trả");
                patientId = p.MedicalRecord.PatientId;
                medicalRecordId = p.MedicalRecordId;
                orderType = "prescription";
                orderInfo = $"TT don thuoc {p.PrescriptionCode}";
                break;
            }
            case RefRetailSale:
            {
                var sale = await _db.RetailSales.FirstOrDefaultAsync(s => s.Id == dto.ReferenceId)
                    ?? throw new InvalidOperationException("Phiếu bán lẻ không tồn tại");
                if (sale.Status == "Cancelled")
                    throw new InvalidOperationException("Phiếu bán lẻ đã hủy");
                if (sale.PatientId == null)
                    throw new InvalidOperationException("Bán lẻ khách vãng lai chưa gắn bệnh nhân — chọn bệnh nhân để sinh QR động");
                await EnsureNoPaidTxnAsync(refType, dto.ReferenceId, "Phiếu bán lẻ đã có giao dịch QR thanh toán thành công");
                amount = sale.TotalAmount - sale.DiscountAmount;
                if (amount <= 0)
                    throw new InvalidOperationException("Phiếu bán lẻ không có số tiền phải thu");
                patientId = sale.PatientId.Value;
                orderType = "pharmacy";
                orderInfo = $"TT quay thuoc {sale.SaleCode}";
                break;
            }
            case RefDeposit:
            {
                // ReferenceId = MedicalRecordId (hồ sơ nội trú được chỉ định đóng tạm ứng)
                var mr = await _db.MedicalRecords.FirstOrDefaultAsync(m => m.Id == dto.ReferenceId)
                    ?? throw new InvalidOperationException("Hồ sơ bệnh án không tồn tại");
                amount = dto.Amount ?? 0;
                if (amount <= 0)
                    throw new ArgumentException("Số tiền tạm ứng phải lớn hơn 0");
                patientId = mr.PatientId;
                medicalRecordId = mr.Id;
                orderType = "deposit";
                orderInfo = "Tam ung noi tru";
                break;
            }
            case RefDischarge:
            {
                // ReferenceId = AdmissionId; công thức còn-nợ đồng bộ CheckPreDischargeAsync
                // (InpatientCompleteService.Discharge.cs) để QR khớp số pre-discharge check.
                var admission = await _db.Set<Admission>()
                    .FirstOrDefaultAsync(a => a.Id == dto.ReferenceId)
                    ?? throw new InvalidOperationException("Đợt điều trị nội trú không tồn tại");
                var totalService = await _db.ServiceRequests
                    .Where(s => s.MedicalRecordId == admission.MedicalRecordId && s.Status != 4)
                    .SumAsync(s => (decimal?)s.PatientAmount) ?? 0;
                var totalPaid = await _db.Receipts
                    .Where(r => r.PatientId == admission.PatientId && r.ReceiptType == 2 && r.Status == 1)
                    .SumAsync(r => (decimal?)r.FinalAmount) ?? 0;
                amount = totalService - totalPaid;
                if (amount <= 0)
                    throw new InvalidOperationException("Bệnh nhân không còn nợ viện phí");
                patientId = admission.PatientId;
                medicalRecordId = admission.MedicalRecordId;
                orderType = "discharge";
                orderInfo = "TT vien phi ra vien";
                break;
            }
            default:
                throw new ArgumentException($"ReferenceType không hỗ trợ: {dto.ReferenceType}");
        }

        // Idempotent: tái dùng QR pending chưa hết hạn cùng nguồn + số tiền + provider
        // (in lại phiếu / mở lại modal không sinh giao dịch rác)
        var now = DateTime.UtcNow;
        var existing = await _db.PaymentTransactions.FirstOrDefaultAsync(t =>
            t.ReferenceType == refType && t.ReferenceId == dto.ReferenceId &&
            t.Status == 0 && t.ExpiresAt > now && t.Amount == amount && t.Provider == provider);
        if (existing != null)
            return BuildQrResponse(existing);

        var createDto = new CreatePaymentUrlDto
        {
            Provider = provider,
            PatientId = patientId,
            MedicalRecordId = medicalRecordId,
            Amount = amount,
            OrderType = orderType,
            OrderInfo = string.IsNullOrWhiteSpace(dto.OrderInfo) ? orderInfo : dto.OrderInfo
        };
        var resp = await CreatePaymentUrlAsync(createDto, ipAddress, userId);

        var txn = await _db.PaymentTransactions.FirstAsync(t => t.Id == resp.TransactionId);
        txn.ReferenceType = refType;
        txn.ReferenceId = dto.ReferenceId;
        // QR động in trên phiếu cần hạn dài hơn 15' mặc định (BN cầm phiếu đi thanh toán)
        txn.ExpiresAt = DateTime.UtcNow.AddMinutes(GetDynamicQrExpiryMinutes());
        await _db.SaveChangesAsync();

        resp.QrCodeContent = txn.QrCodeData;
        resp.ExpiresAt = txn.ExpiresAt;
        return resp;
    }

    private int GetDynamicQrExpiryMinutes()
    {
        return int.TryParse(_config["PaymentGateway:Bank:DynamicQrExpiryMinutes"], out var m) && m > 0
            ? m
            : 1440; // 24h
    }

    public async Task<KioskQrResponseDto> CreateKioskQrAsync(KioskQrRequestDto dto, string ipAddress)
    {
        var code = dto.PatientCode.Trim();
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode == code);
        // Xác thực mã BN + ngày sinh; message chung để không dò được mã BN hợp lệ
        if (patient?.DateOfBirth == null || patient.DateOfBirth.Value.Date != dto.DateOfBirth.Date)
            throw new InvalidOperationException("Mã bệnh nhân hoặc ngày sinh không đúng");

        var unpaid = await _db.ServiceRequests.AsNoTracking()
            .Where(sr => sr.MedicalRecord.PatientId == patient.Id
                && !sr.IsPaid && sr.Status != 4 && sr.PatientAmount > 0)
            .OrderBy(sr => sr.RequestDate)
            .Select(sr => new KioskPendingItemDto
            {
                ServiceRequestId = sr.Id,
                RequestCode = sr.RequestCode,
                RequestDate = sr.RequestDate,
                Amount = sr.PatientAmount
            })
            .ToListAsync();

        var result = new KioskQrResponseDto
        {
            PatientName = patient.FullName ?? string.Empty,
            PatientCode = patient.PatientCode,
            PendingCount = unpaid.Count,
            TotalAmount = unpaid.Sum(i => i.Amount),
            Items = unpaid
        };
        if (result.TotalAmount <= 0) return result;

        var provider = ResolveBankProvider(dto.Provider);
        var now = DateTime.UtcNow;
        var existing = await _db.PaymentTransactions.FirstOrDefaultAsync(t =>
            t.ReferenceType == RefKiosk && t.ReferenceId == patient.Id &&
            t.Status == 0 && t.ExpiresAt > now && t.Amount == result.TotalAmount && t.Provider == provider);
        if (existing != null)
        {
            result.Qr = BuildQrResponse(existing);
            return result;
        }

        var createDto = new CreatePaymentUrlDto
        {
            Provider = provider,
            PatientId = patient.Id,
            Amount = result.TotalAmount,
            OrderType = "kiosk",
            OrderInfo = $"Kiosk TT {unpaid.Count} chi dinh"
        };
        var resp = await CreatePaymentUrlAsync(createDto, ipAddress, Guid.Empty);

        var txn = await _db.PaymentTransactions.FirstAsync(t => t.Id == resp.TransactionId);
        txn.ReferenceType = RefKiosk;
        txn.ReferenceId = patient.Id;
        // Snapshot danh sách chỉ định gộp trong QR — paid-hook chỉ đánh dấu đúng các phiếu này
        txn.ReferenceData = System.Text.Json.JsonSerializer.Serialize(unpaid.Select(i => i.ServiceRequestId).ToList());
        txn.CreatedBy = RefKiosk;
        await _db.SaveChangesAsync();

        resp.QrCodeContent = txn.QrCodeData;
        result.Qr = resp;
        return result;
        // (giữ hạn 15' mặc định cho kiosk — BN đứng tại chỗ quét ngay)
    }

    public async Task<string> BuildPrintQrBlockHtmlAsync(DynamicQrRequestDto dto, Guid userId)
    {
        try
        {
            var qr = await CreateDynamicQrAsync(dto, "127.0.0.1", userId);
            // PaymentUrl với bank provider = ảnh QR img.vietqr.io — browser client tải khi mở phiếu in
            var img = System.Net.WebUtility.HtmlEncode(qr.PaymentUrl);
            return $@"
<div style=""margin-top:14px;padding:10px;border:1px dashed #666;text-align:center;page-break-inside:avoid"">
  <div style=""font-weight:bold;margin-bottom:6px"">QUET MA QR DE THANH TOAN ({qr.Provider.ToUpperInvariant()})</div>
  <img src=""{img}"" alt=""VietQR"" style=""width:180px;height:180px""/>
  <div style=""font-size:12px;margin-top:4px"">So tien: <b>{qr.Amount:#,##0} VND</b> · Ma GD: {qr.TxnRef}</div>
  <div style=""font-size:11px;color:#555"">Ma QR het han: {qr.ExpiresAt.ToLocalTime():dd/MM/yyyy HH:mm}</div>
</div>";
        }
        catch (Exception ex)
        {
            // Đã thanh toán / không còn khoản phải trả / lỗi cấu hình → phiếu in không kèm QR
            _logger.LogInformation(ex, "Print QR block skipped for {RefType}/{RefId}: {Message}",
                dto.ReferenceType, dto.ReferenceId, ex.Message);
            return string.Empty;
        }
    }

    /// <summary>
    /// Khi giao dịch chuyển paid: cập nhật ngược bản ghi nguồn theo ReferenceType.
    /// Lỗi hook KHÔNG chặn flow ghi nhận thanh toán chính (Receipt/HĐĐT đã tạo) — chỉ log warning.
    /// </summary>
    private async Task ApplyPaidReferenceAsync(PaymentTransaction txn, Guid confirmUserId)
    {
        if (string.IsNullOrEmpty(txn.ReferenceType)) return;
        try
        {
            switch (txn.ReferenceType)
            {
                case RefServiceRequest:
                {
                    var sr = await _db.ServiceRequests.FirstOrDefaultAsync(s => s.Id == txn.ReferenceId);
                    if (sr != null && !sr.IsPaid)
                    {
                        sr.IsPaid = true;
                        if (sr.Status == 0) sr.Status = 1; // 0-Chờ TT → 1-Đã TT: mở gate LIS/PACS thực hiện
                        sr.UpdatedAt = DateTime.UtcNow;
                    }
                    break;
                }
                case RefRetailSale:
                {
                    var sale = await _db.RetailSales.FirstOrDefaultAsync(s => s.Id == txn.ReferenceId);
                    if (sale != null)
                    {
                        sale.PaidAmount = txn.Amount;
                        sale.PaymentMethod = "Transfer";
                        sale.PaymentReference = txn.TxnRef;
                        sale.UpdatedAt = DateTime.UtcNow;
                    }
                    break;
                }
                case RefDeposit:
                {
                    // Tạo phiếu tạm ứng đã xác nhận (đồng bộ field với BillingCompleteService.CreateDepositAsync)
                    var deposit = new Deposit
                    {
                        Id = Guid.NewGuid(),
                        ReceiptNumber = $"TU{DateTime.Now:yyyyMMddHHmmssfff}",
                        ReceiptDate = DateTime.UtcNow,
                        PatientId = txn.PatientId,
                        MedicalRecordId = txn.ReferenceId,
                        Amount = txn.Amount,
                        UsedAmount = 0,
                        RemainingAmount = txn.Amount,
                        PaymentMethod = 4, // 4-QR
                        Status = 2, // Đã xác nhận
                        ReceivedByUserId = confirmUserId,
                        Notes = $"Tạm ứng qua QR {txn.Provider.ToUpper()} — {txn.TxnRef}",
                        CreatedAt = DateTime.Now
                    };
                    _db.Deposits.Add(deposit);
                    break;
                }
                case RefKiosk:
                {
                    if (string.IsNullOrEmpty(txn.ReferenceData)) break;
                    var ids = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(txn.ReferenceData) ?? new();
                    var srs = await _db.ServiceRequests
                        .Where(s => ids.Contains(s.Id) && !s.IsPaid)
                        .ToListAsync();
                    foreach (var s in srs)
                    {
                        s.IsPaid = true;
                        if (s.Status == 0) s.Status = 1;
                        s.UpdatedAt = DateTime.UtcNow;
                    }
                    break;
                }
                // prescription / discharge: Receipt (type 2) đã ghi nhận tiền —
                // pre-discharge check + cấp phát thuốc đối chiếu qua Receipt, không đổi trạng thái nguồn.
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ApplyPaidReference failed for txn {TxnRef} ({RefType}/{RefId})",
                txn.TxnRef, txn.ReferenceType, txn.ReferenceId);
        }
    }

    private async Task EnsureNoPaidTxnAsync(string refType, Guid refId, string message)
    {
        var paidExists = await _db.PaymentTransactions
            .AnyAsync(t => t.ReferenceType == refType && t.ReferenceId == refId && t.Status == 1);
        if (paidExists) throw new InvalidOperationException(message);
    }

    private static PaymentUrlResponseDto BuildQrResponse(PaymentTransaction txn) => new()
    {
        TransactionId = txn.Id,
        TxnRef = txn.TxnRef,
        PaymentUrl = txn.PaymentUrl,
        QrCodeDataUrl = txn.PaymentUrl,
        QrCodeContent = txn.QrCodeData,
        ExpiresAt = txn.ExpiresAt,
        Provider = txn.Provider,
        Amount = txn.Amount
    };

    // ===== NangCap25 VI: Báo cáo =====

    public async Task<QrFinanceReportDto> GetQrFinanceReportAsync(DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var to = toDate.Date.AddDays(1);
        var txns = await _db.PaymentTransactions.AsNoTracking()
            .Include(t => t.Patient)
            .Where(t => BankQrProviders.Contains(t.Provider) && t.CreatedAt >= from && t.CreatedAt < to)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var creatorNames = await ResolveCreatorNamesAsync(txns);
        var items = txns.Select(t => MapFinanceItem(t, creatorNames)).ToList();

        return new QrFinanceReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalCount = items.Count,
            TotalAmount = txns.Sum(t => t.Amount),
            PaidAmount = txns.Where(t => t.Status == 1).Sum(t => t.Amount),
            ByCreator = items
                .GroupBy(i => i.CreatorName)
                .Select(g => new QrCreatorStatDto
                {
                    CreatorName = g.Key,
                    Count = g.Count(),
                    Amount = g.Sum(i => i.Amount),
                    PaidAmount = g.Where(i => i.Status == 1).Sum(i => i.Amount)
                })
                .OrderByDescending(s => s.Amount)
                .ToList(),
            Items = items
        };
    }

    public async Task<BankReconciliationReportDto> GetBankReconciliationAsync(DateTime fromDate, DateTime toDate, string? bankCode)
    {
        var from = fromDate.Date;
        var to = toDate.Date.AddDays(1);
        var q = _db.PaymentTransactions.AsNoTracking()
            .Include(t => t.Patient)
            .Where(t => BankQrProviders.Contains(t.Provider) && t.CreatedAt >= from && t.CreatedAt < to);
        if (!string.IsNullOrWhiteSpace(bankCode))
        {
            var bank = bankCode.ToLowerInvariant();
            q = q.Where(t => t.Provider == bank);
        }
        var txns = await q.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var creatorNames = await ResolveCreatorNamesAsync(txns);
        var items = txns.Select(t => MapFinanceItem(t, creatorNames)).ToList();
        var paid = txns.Where(t => t.Status == 1).ToList();

        return new BankReconciliationReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            BankCode = bankCode,
            TotalCount = txns.Count,
            TotalAmount = txns.Sum(t => t.Amount),
            PaidCount = paid.Count,
            PaidAmount = paid.Sum(t => t.Amount),
            PendingCount = txns.Count(t => t.Status == 0),
            PendingAmount = txns.Where(t => t.Status == 0).Sum(t => t.Amount),
            ExpiredCount = txns.Count(t => t.Status == 4),
            FailedCount = txns.Count(t => t.Status == 2),
            MatchedCount = paid.Count(t => !string.IsNullOrEmpty(t.GatewayTxnRef)),
            UnmatchedPaid = paid
                .Where(t => string.IsNullOrEmpty(t.GatewayTxnRef))
                .Select(t => MapFinanceItem(t, creatorNames))
                .ToList(),
            ByDay = txns
                .GroupBy(t => t.CreatedAt.Date)
                .Select(g => new DailyStatDto
                {
                    Date = g.Key,
                    Count = g.Count(),
                    Amount = g.Where(t => t.Status == 1).Sum(t => t.Amount)
                })
                .OrderBy(d => d.Date)
                .ToList(),
            Items = items
        };
    }

    private async Task<Dictionary<string, string>> ResolveCreatorNamesAsync(List<PaymentTransaction> txns)
    {
        var creatorIds = txns
            .Select(t => t.CreatedBy)
            .Where(c => !string.IsNullOrEmpty(c) && Guid.TryParse(c, out _))
            .Distinct()
            .Select(c => Guid.Parse(c!))
            .ToList();
        var users = await _db.Users.AsNoTracking()
            .Where(u => creatorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.Username })
            .ToListAsync();
        return users.ToDictionary(
            u => u.Id.ToString(),
            u => string.IsNullOrEmpty(u.FullName) ? u.Username : u.FullName);
    }

    private static QrFinanceItemDto MapFinanceItem(PaymentTransaction t, Dictionary<string, string> creatorNames)
    {
        var creator = t.CreatedBy switch
        {
            null or "" => "Hệ thống",
            RefKiosk => "Kiosk tự phục vụ",
            _ => creatorNames.TryGetValue(t.CreatedBy, out var name) ? name : t.CreatedBy
        };
        return new QrFinanceItemDto
        {
            Id = t.Id,
            TxnRef = t.TxnRef,
            Provider = t.Provider,
            ReferenceType = t.ReferenceType,
            OrderInfo = t.OrderInfo,
            PatientName = t.Patient?.FullName,
            Amount = t.Amount,
            Status = t.Status,
            StatusText = MapStatusText(t.Status),
            CreatorName = creator,
            CreatedAt = t.CreatedAt,
            PayDate = t.PayDate
        };
    }

    private static string MapStatusText(int status) => status switch
    {
        0 => "Chờ thanh toán",
        1 => "Đã thanh toán",
        2 => "Thất bại",
        3 => "Đã hoàn tiền",
        4 => "Hết hạn",
        _ => "Không xác định"
    };
}
