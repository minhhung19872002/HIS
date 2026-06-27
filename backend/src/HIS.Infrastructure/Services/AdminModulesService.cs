using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// MVP implementation cho G-41 Payroll, G-42 HR Decisions, G-44 Official Documents.
/// </summary>
public class AdminModulesService : IAdminModulesService
{
    private readonly HISDbContext _db;
    public AdminModulesService(HISDbContext db) { _db = db; }

    // ─── G-41: Payroll ────────────────────────────────────────────────────

    public async Task<List<PayrollPeriodDto>> GetPayrollPeriodsAsync(int? year = null)
    {
        var q = _db.PayrollPeriods.AsNoTracking().Include(p => p.Items).AsQueryable();
        if (year.HasValue) q = q.Where(p => p.Year == year.Value);
        var list = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).ToListAsync();
        return list.Select(MapPeriod).ToList();
    }

    public async Task<PayrollPeriodDto?> GetPayrollPeriodAsync(Guid id)
    {
        var p = await _db.PayrollPeriods.AsNoTracking().Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id);
        return p == null ? null : MapPeriod(p);
    }

    public async Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodDto dto, Guid createdBy)
    {
        var exists = await _db.PayrollPeriods.AnyAsync(p => p.Year == dto.Year && p.Month == dto.Month);
        if (exists) throw new InvalidOperationException($"Kỳ lương {dto.Month}/{dto.Year} đã tồn tại.");

        var period = new PayrollPeriod
        {
            Id = Guid.NewGuid(),
            PeriodCode = $"{dto.Year:D4}-{dto.Month:D2}",
            Year = dto.Year,
            Month = dto.Month,
            Notes = dto.Notes,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
        };
        _db.PayrollPeriods.Add(period);
        await _db.SaveChangesAsync();
        return MapPeriod(period);
    }

    public async Task<List<PayrollItemDto>> GetPayrollItemsAsync(Guid periodId)
    {
        var items = await _db.PayrollItems.AsNoTracking()
            .Where(i => i.PeriodId == periodId)
            .OrderBy(i => i.StaffCode)
            .ToBoundedListAsync("AdminModules.PayrollItems");
        return items.Select(MapItem).ToList();
    }

    public async Task<PayrollItemDto> SavePayrollItemAsync(SavePayrollItemDto dto)
    {
        PayrollItem item;
        if (dto.Id.HasValue)
        {
            item = await _db.PayrollItems.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException("Không tìm thấy dòng lương.");
        }
        else
        {
            item = new PayrollItem { Id = Guid.NewGuid(), PeriodId = dto.PeriodId, CreatedAt = DateTime.UtcNow };
            _db.PayrollItems.Add(item);
        }
        item.StaffId = dto.StaffId;
        item.StaffCode = dto.StaffCode;
        item.StaffName = dto.StaffName;
        item.DepartmentName = dto.DepartmentName;
        item.WorkDays = dto.WorkDays;
        item.BaseSalary = dto.BaseSalary;
        item.Allowance = dto.Allowance;
        item.OtherIncome = dto.OtherIncome;
        item.BhxhDeduction = Math.Round(dto.BaseSalary * 0.105m, 0); // 10.5% mặc định
        item.OtherDeduction = dto.OtherDeduction;
        item.NetSalary = dto.BaseSalary + dto.Allowance + dto.OtherIncome
                         - item.BhxhDeduction - dto.OtherDeduction;
        item.Notes = dto.Notes;
        item.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapItem(item);
    }

    public async Task DeletePayrollItemAsync(Guid id)
    {
        var item = await _db.PayrollItems.FindAsync(id);
        if (item != null) { _db.PayrollItems.Remove(item); await _db.SaveChangesAsync(); }
    }

    public async Task<PayrollPeriodDto> ApprovePayrollPeriodAsync(Guid id, string approvedBy)
    {
        var period = await _db.PayrollPeriods.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy kỳ lương.");
        period.Status = 1;
        period.ApprovedBy = approvedBy;
        period.ApprovedAt = DateTime.UtcNow;
        period.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapPeriod(period);
    }

    /// <summary>
    /// Generate dòng lương tự động từ danh sách nhân viên có lương lịch sử (SalaryHistory).
    /// Nếu không có data salary history → tạo dòng trống để nhập tay.
    /// </summary>
    public async Task<List<PayrollItemDto>> GeneratePayrollItemsAsync(Guid periodId, Guid createdBy)
    {
        var period = await _db.PayrollPeriods.FindAsync(periodId)
            ?? throw new KeyNotFoundException("Không tìm thấy kỳ lương.");

        // Lấy attendance summary tháng đó nếu bảng tồn tại (graceful — không crash nếu chưa có data)
        // SalaryHistory ở medicalhr backend (riêng service) → query qua context trực tiếp là
        // out-of-scope cho MVP; chỉ generate dòng trống per staff để nhập tay.
        // Xóa dòng cũ (regenerate)
        var existing = _db.PayrollItems.Where(i => i.PeriodId == periodId);
        _db.PayrollItems.RemoveRange(existing);
        await _db.SaveChangesAsync();

        // Lấy danh sách nhân viên active từ Users/Staff (dùng User table làm proxy nếu HR staff chưa có)
        var users = await _db.Users
            .AsNoTracking()
            .Where(u => u.IsActive)
            .OrderBy(u => u.Username)
            .Take(200)
            .ToListAsync();

        var items = users.Select(u => new PayrollItem
        {
            Id = Guid.NewGuid(),
            PeriodId = periodId,
            StaffId = u.Id.ToString(),
            StaffCode = u.Username,
            StaffName = u.FullName,
            WorkDays = 22, // mặc định 22 ngày
            BaseSalary = 0,
            Allowance = 0,
            OtherIncome = 0,
            BhxhDeduction = 0,
            OtherDeduction = 0,
            NetSalary = 0,
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        _db.PayrollItems.AddRange(items);
        await _db.SaveChangesAsync();
        return items.Select(MapItem).ToList();
    }

    private static PayrollPeriodDto MapPeriod(PayrollPeriod p) => new()
    {
        Id = p.Id,
        PeriodCode = p.PeriodCode,
        Year = p.Year,
        Month = p.Month,
        Status = p.Status,
        ApprovedBy = p.ApprovedBy,
        ApprovedAt = p.ApprovedAt,
        Notes = p.Notes,
        ItemCount = p.Items.Count,
        TotalNetSalary = p.Items.Sum(i => i.NetSalary),
        CreatedAt = p.CreatedAt,
    };

    private static PayrollItemDto MapItem(PayrollItem i) => new()
    {
        Id = i.Id,
        PeriodId = i.PeriodId,
        StaffId = i.StaffId,
        StaffCode = i.StaffCode,
        StaffName = i.StaffName,
        DepartmentName = i.DepartmentName,
        WorkDays = i.WorkDays,
        BaseSalary = i.BaseSalary,
        Allowance = i.Allowance,
        OtherIncome = i.OtherIncome,
        BhxhDeduction = i.BhxhDeduction,
        OtherDeduction = i.OtherDeduction,
        NetSalary = i.NetSalary,
        Notes = i.Notes,
    };

    // ─── G-42: HR Decisions ───────────────────────────────────────────────

    public async Task<List<HrDecisionDto>> GetHrDecisionsAsync(int? decisionType = null, int? status = null, string? staffId = null, DateTime? from = null, DateTime? to = null, string? keyword = null)
    {
        var q = _db.HrDecisions.AsNoTracking();
        if (decisionType.HasValue) q = q.Where(d => d.DecisionType == decisionType.Value);
        if (status.HasValue) q = q.Where(d => d.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(staffId)) q = q.Where(d => d.StaffId == staffId);
        if (from.HasValue) q = q.Where(d => d.EffectiveDate >= from.Value);
        if (to.HasValue) q = q.Where(d => d.EffectiveDate <= to.Value);
        var list = await q.OrderByDescending(d => d.EffectiveDate).Take(500).ToListAsync();
        // keyword filter in-memory (tránh EF không dịch được Contains với nvarchar đặc biệt)
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            list = list.Where(d =>
                d.DecisionNumber.ToLowerInvariant().Contains(kw) ||
                (d.StaffName != null && d.StaffName.ToLowerInvariant().Contains(kw)) ||
                (d.StaffCode != null && d.StaffCode.ToLowerInvariant().Contains(kw))
            ).ToList();
        }
        return list.Select(MapDecision).ToList();
    }

    public async Task<HrDecisionDto?> GetHrDecisionAsync(Guid id)
    {
        var d = await _db.HrDecisions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return d == null ? null : MapDecision(d);
    }

    public async Task<HrDecisionDto> SaveHrDecisionAsync(SaveHrDecisionDto dto, Guid userId)
    {
        HrDecision dec;
        if (dto.Id.HasValue)
        {
            dec = await _db.HrDecisions.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException("Không tìm thấy quyết định.");
        }
        else
        {
            dec = new HrDecision { Id = Guid.NewGuid(), CreatedBy = userId, CreatedAt = DateTime.UtcNow };
            _db.HrDecisions.Add(dec);
        }
        dec.DecisionNumber = dto.DecisionNumber;
        dec.DecisionType = dto.DecisionType;
        dec.StaffId = dto.StaffId;
        dec.StaffCode = dto.StaffCode;
        dec.StaffName = dto.StaffName;
        dec.EffectiveDate = dto.EffectiveDate;
        dec.Summary = dto.Summary;
        dec.Content = dto.Content;
        dec.Status = dto.Status;
        dec.Department = dto.Department;
        dec.Position = dto.Position;
        dec.SignerName = dto.SignerName;
        dec.Notes = dto.Notes;
        dec.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapDecision(dec);
    }

    public async Task DeleteHrDecisionAsync(Guid id)
    {
        var d = await _db.HrDecisions.FindAsync(id);
        if (d != null) { _db.HrDecisions.Remove(d); await _db.SaveChangesAsync(); }
    }

    private static HrDecisionDto MapDecision(HrDecision d) => new()
    {
        Id = d.Id,
        DecisionNumber = d.DecisionNumber,
        DecisionType = d.DecisionType,
        StaffId = d.StaffId,
        StaffCode = d.StaffCode,
        StaffName = d.StaffName,
        EffectiveDate = d.EffectiveDate,
        Summary = d.Summary,
        Content = d.Content,
        Status = d.Status,
        Department = d.Department,
        Position = d.Position,
        SignerName = d.SignerName,
        Notes = d.Notes,
        CreatedAt = d.CreatedAt,
    };

    // ─── G-44: Official Documents ─────────────────────────────────────────

    public async Task<List<OfficialDocumentDto>> GetOfficialDocumentsAsync(int? documentType = null, int? status = null, string? keyword = null)
    {
        var q = _db.OfficialDocuments.AsNoTracking();
        if (documentType.HasValue) q = q.Where(d => d.DocumentType == documentType.Value);
        if (status.HasValue) q = q.Where(d => d.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(d => d.DocumentNumber.Contains(kw) || d.Summary.Contains(kw)
                || (d.Sender != null && d.Sender.Contains(kw))
                || (d.Receiver != null && d.Receiver.Contains(kw)));
        }
        var list = await q.OrderByDescending(d => d.DocumentDate).Take(500).ToListAsync();
        return list.Select(MapDoc).ToList();
    }

    public async Task<OfficialDocumentDto?> GetOfficialDocumentAsync(Guid id)
    {
        var d = await _db.OfficialDocuments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return d == null ? null : MapDoc(d);
    }

    public async Task<OfficialDocumentDto> SaveOfficialDocumentAsync(SaveOfficialDocumentDto dto, Guid userId)
    {
        OfficialDocument doc;
        if (dto.Id.HasValue)
        {
            doc = await _db.OfficialDocuments.FindAsync(dto.Id.Value)
                ?? throw new KeyNotFoundException("Không tìm thấy công văn.");
        }
        else
        {
            doc = new OfficialDocument { Id = Guid.NewGuid(), CreatedBy = userId, CreatedAt = DateTime.UtcNow };
            _db.OfficialDocuments.Add(doc);
        }
        doc.DocumentNumber = dto.DocumentNumber;
        doc.DocumentType = dto.DocumentType;
        doc.DocumentDate = dto.DocumentDate;
        doc.Sender = dto.Sender;
        doc.Receiver = dto.Receiver;
        doc.Summary = dto.Summary;
        doc.Handler = dto.Handler;
        doc.Deadline = dto.Deadline;
        doc.Status = dto.Status;
        doc.AttachmentPath = dto.AttachmentPath;
        doc.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapDoc(doc);
    }

    public async Task DeleteOfficialDocumentAsync(Guid id)
    {
        var d = await _db.OfficialDocuments.FindAsync(id);
        if (d != null) { _db.OfficialDocuments.Remove(d); await _db.SaveChangesAsync(); }
    }

    public async Task<int> GetOverdueCountAsync()
    {
        var today = DateTime.Today;
        return await _db.OfficialDocuments
            .CountAsync(d => d.Deadline.HasValue && d.Deadline < today && d.Status < 2);
    }

    private static OfficialDocumentDto MapDoc(OfficialDocument d) => new()
    {
        Id = d.Id,
        DocumentNumber = d.DocumentNumber,
        DocumentType = d.DocumentType,
        DocumentDate = d.DocumentDate,
        Sender = d.Sender,
        Receiver = d.Receiver,
        Summary = d.Summary,
        Handler = d.Handler,
        Deadline = d.Deadline,
        Status = d.Status,
        AttachmentPath = d.AttachmentPath,
        CreatedAt = d.CreatedAt,
    };
}
