using HIS.Application.DTOs.Payment;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap25 IV — Chi hộ hoàn tiền thừa qua tài khoản Vietcombank của BV.
/// MockMode (mặc định true) mô phỏng lệnh chi thành công; API giải ngân thật của VCB
/// yêu cầu merchant contract — wire tại ExecuteAsync khi có (config PaymentGateway:Disbursement).
/// </summary>
public class RefundDisbursementService : IRefundDisbursementService
{
    private readonly HISDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<RefundDisbursementService> _logger;

    public RefundDisbursementService(
        HISDbContext db,
        IConfiguration config,
        ILogger<RefundDisbursementService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<RefundDisbursementDto> CreateAsync(CreateRefundDisbursementDto dto, Guid userId)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Id == dto.PatientId)
            ?? throw new InvalidOperationException("Bệnh nhân không tồn tại");

        if (dto.PaymentTransactionId.HasValue)
        {
            var txn = await _db.PaymentTransactions
                .FirstOrDefaultAsync(t => t.Id == dto.PaymentTransactionId.Value)
                ?? throw new InvalidOperationException("Giao dịch thanh toán gốc không tồn tại");
            if (txn.Status != 1 && txn.Status != 3)
                throw new InvalidOperationException("Chỉ chi hộ từ giao dịch đã thanh toán thành công");
            if (dto.Amount > txn.Amount)
                throw new InvalidOperationException("Số tiền chi hộ vượt quá giao dịch gốc");
        }

        var todayPrefix = $"CH-{DateTime.Now:yyyyMMdd}";
        var todayCount = await _db.RefundDisbursements
            .CountAsync(d => d.DisbursementCode.StartsWith(todayPrefix));

        var entity = new RefundDisbursement
        {
            Id = Guid.NewGuid(),
            DisbursementCode = $"{todayPrefix}-{(todayCount + 1):D4}",
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            PaymentTransactionId = dto.PaymentTransactionId,
            Amount = dto.Amount,
            BankBin = dto.BankBin.Trim(),
            BankName = dto.BankName.Trim(),
            AccountNumber = dto.AccountNumber.Trim(),
            AccountHolder = dto.AccountHolder.Trim(),
            Reason = dto.Reason,
            Status = 0, // Chờ duyệt
            RequestedBy = userId,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        _db.RefundDisbursements.Add(entity);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Refund disbursement {Code} created: {Amount}đ → {Bank}/{Account}",
            entity.DisbursementCode, entity.Amount, entity.BankName, entity.AccountNumber);

        return await MapAsync(entity);
    }

    public async Task<RefundDisbursementDto> ExecuteAsync(Guid id, Guid userId)
    {
        var entity = await _db.RefundDisbursements.FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new InvalidOperationException("Lệnh chi hộ không tồn tại");
        if (entity.Status is 2 or 4)
            throw new InvalidOperationException("Lệnh chi hộ đã hoàn tất hoặc đã hủy");

        var mockMode = !string.Equals(
            _config["PaymentGateway:Disbursement:MockMode"], "false", StringComparison.OrdinalIgnoreCase);

        if (mockMode)
        {
            entity.Status = 2; // Đã chi
            entity.TransferRef = $"MOCK-{DateTime.UtcNow:yyyyMMddHHmmss}";
            entity.TransferredAt = DateTime.UtcNow;
            entity.ResponseRaw = "{\"mock\":true,\"result\":\"success\"}";
        }
        else
        {
            // API giải ngân VCB thật cần merchant contract + đặc tả thông điệp từ ngân hàng.
            var endpoint = _config["PaymentGateway:Disbursement:Endpoint"];
            if (string.IsNullOrWhiteSpace(endpoint))
                throw new InvalidOperationException(
                    "Chưa cấu hình API chi hộ Vietcombank (PaymentGateway:Disbursement:Endpoint) — bật MockMode hoặc bổ sung cấu hình");
            throw new InvalidOperationException(
                "Kết nối API giải ngân VCB chưa được kích hoạt — liên hệ quản trị hệ thống");
        }

        entity.ApprovedBy = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();

        _logger.LogInformation("Refund disbursement {Code} executed (mock={Mock}) by {UserId}",
            entity.DisbursementCode, mockMode, userId);

        return await MapAsync(entity);
    }

    public async Task<RefundDisbursementDto> CancelAsync(Guid id, string? reason, Guid userId)
    {
        var entity = await _db.RefundDisbursements.FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new InvalidOperationException("Lệnh chi hộ không tồn tại");
        if (entity.Status == 2)
            throw new InvalidOperationException("Lệnh đã chi — không thể hủy");
        if (entity.Status == 4)
            throw new InvalidOperationException("Lệnh đã hủy trước đó");

        entity.Status = 4;
        entity.FailureReason = string.IsNullOrWhiteSpace(reason) ? "Hủy bởi kế toán" : reason;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();

        return await MapAsync(entity);
    }

    public async Task<RefundDisbursementDto?> GetByIdAsync(Guid id)
    {
        var entity = await _db.RefundDisbursements.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id);
        return entity == null ? null : await MapAsync(entity);
    }

    public async Task<RefundDisbursementSearchResultDto> SearchAsync(RefundDisbursementSearchDto dto)
    {
        var q = _db.RefundDisbursements.AsNoTracking()
            .Include(d => d.Patient)
            .Where(d => !d.IsDeleted);

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            q = q.Where(d =>
                d.DisbursementCode.Contains(kw) ||
                d.AccountNumber.Contains(kw) ||
                d.AccountHolder.Contains(kw) ||
                (d.Patient != null && d.Patient.FullName!.Contains(kw)));
        }
        if (dto.Status.HasValue)
            q = q.Where(d => d.Status == dto.Status.Value);
        if (dto.FromDate.HasValue)
            q = q.Where(d => d.CreatedAt >= dto.FromDate.Value.Date);
        if (dto.ToDate.HasValue)
            q = q.Where(d => d.CreatedAt < dto.ToDate.Value.Date.AddDays(1));

        var total = await q.CountAsync();
        var totalAmount = await q.SumAsync(d => (decimal?)d.Amount) ?? 0;
        var transferredAmount = await q.Where(d => d.Status == 2).SumAsync(d => (decimal?)d.Amount) ?? 0;

        var entities = await q
            .OrderByDescending(d => d.CreatedAt)
            .Skip((dto.PageIndex - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        var userIds = entities
            .SelectMany(d => new[] { d.RequestedBy, d.ApprovedBy ?? Guid.Empty })
            .Where(g => g != Guid.Empty)
            .Distinct()
            .ToList();
        var users = await _db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.Username })
            .ToDictionaryAsync(u => u.Id, u => string.IsNullOrEmpty(u.FullName) ? u.Username : u.FullName);

        return new RefundDisbursementSearchResultDto
        {
            Items = entities.Select(d => Map(d, d.Patient, users)).ToList(),
            TotalCount = total,
            PageIndex = dto.PageIndex,
            PageSize = dto.PageSize,
            TotalAmount = totalAmount,
            TransferredAmount = transferredAmount
        };
    }

    private async Task<RefundDisbursementDto> MapAsync(RefundDisbursement d)
    {
        var patient = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == d.PatientId);
        var userIds = new[] { d.RequestedBy, d.ApprovedBy ?? Guid.Empty }.Where(g => g != Guid.Empty).ToList();
        var users = await _db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.Username })
            .ToDictionaryAsync(u => u.Id, u => string.IsNullOrEmpty(u.FullName) ? u.Username : u.FullName);
        return Map(d, patient, users);
    }

    private static RefundDisbursementDto Map(
        RefundDisbursement d, Patient? patient, IReadOnlyDictionary<Guid, string> users) => new()
    {
        Id = d.Id,
        DisbursementCode = d.DisbursementCode,
        PatientId = d.PatientId,
        PatientName = patient?.FullName,
        PatientCode = patient?.PatientCode,
        MedicalRecordId = d.MedicalRecordId,
        PaymentTransactionId = d.PaymentTransactionId,
        Amount = d.Amount,
        BankBin = d.BankBin,
        BankName = d.BankName,
        AccountNumber = d.AccountNumber,
        AccountHolder = d.AccountHolder,
        Reason = d.Reason,
        Status = d.Status,
        StatusText = d.Status switch
        {
            0 => "Chờ duyệt",
            1 => "Đã duyệt",
            2 => "Đã chi",
            3 => "Thất bại",
            4 => "Đã hủy",
            _ => "Không xác định"
        },
        TransferRef = d.TransferRef,
        TransferredAt = d.TransferredAt,
        FailureReason = d.FailureReason,
        RequestedByName = users.TryGetValue(d.RequestedBy, out var rq) ? rq : null,
        ApprovedByName = d.ApprovedBy.HasValue && users.TryGetValue(d.ApprovedBy.Value, out var ap) ? ap : null,
        CreatedAt = d.CreatedAt
    };
}
