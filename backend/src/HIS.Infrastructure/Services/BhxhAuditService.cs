using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

// K-wave5: tach Export/Import CSV sang BhxhAuditService.ExportImport.cs (~350 dong).
public partial class BhxhAuditService : IBhxhAuditService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public BhxhAuditService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Bản nháp" },
        { 1, "Đang kiểm tra" },
        { 2, "Hoàn thành" },
        { 3, "Đã gửi" }
    };

    private static readonly Dictionary<string, string> ErrorTypeNames = new()
    {
        { "OverCeiling", "Vượt trần" },
        { "WrongIcd", "Sai mã ICD" },
        { "WrongObject", "Sai đối tượng" },
        { "DuplicateClaim", "Trùng thanh toán" },
        { "WrongService", "Sai dịch vụ" },
        { "Other", "Khác" }
    };

    public async Task<BhxhAuditPagedResult> GetSessionsAsync(BhxhAuditSearchDto filter)
    {
        var query = _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(s => s.SessionCode.ToLower().Contains(kw));
        }

        if (filter.PeriodMonth.HasValue)
            query = query.Where(s => s.PeriodMonth == filter.PeriodMonth.Value);

        if (filter.PeriodYear.HasValue)
            query = query.Where(s => s.PeriodYear == filter.PeriodYear.Value);

        if (filter.Status.HasValue)
            query = query.Where(s => s.Status == filter.Status.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.PeriodYear)
            .ThenByDescending(s => s.PeriodMonth)
            .ThenByDescending(s => s.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(s => new BhxhAuditListDto
            {
                Id = s.Id,
                SessionCode = s.SessionCode,
                PeriodMonth = s.PeriodMonth,
                PeriodYear = s.PeriodYear,
                TotalRecords = s.TotalRecords,
                TotalAmount = s.TotalAmount,
                ErrorCount = s.ErrorCount,
                ErrorAmount = s.ErrorAmount,
                Status = s.Status,
                StatusName = "", // mapped below
                AuditorName = s.Auditor != null ? s.Auditor.FullName : null,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new BhxhAuditPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<BhxhAuditDetailDto> CreateSessionAsync(CreateAuditSessionDto dto)
    {
        var count = await _context.Set<BhxhAuditSession>().CountAsync() + 1;
        var code = $"BHXH-{dto.PeriodYear}-{dto.PeriodMonth:D2}-{count:D4}";

        var session = new BhxhAuditSession
        {
            Id = Guid.NewGuid(),
            SessionCode = code,
            PeriodMonth = dto.PeriodMonth,
            PeriodYear = dto.PeriodYear,
            TotalRecords = 0,
            TotalAmount = 0,
            ErrorCount = 0,
            ErrorAmount = 0,
            Status = 0, // Draft
            Notes = dto.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Set<BhxhAuditSession>().Add(session);
        await _unitOfWork.SaveChangesAsync();

        return new BhxhAuditDetailDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            PeriodMonth = session.PeriodMonth,
            PeriodYear = session.PeriodYear,
            TotalRecords = 0,
            TotalAmount = 0,
            ErrorCount = 0,
            ErrorAmount = 0,
            Status = session.Status,
            StatusName = StatusNames.GetValueOrDefault(session.Status, "Không xác định"),
            Notes = session.Notes,
            CreatedAt = session.CreatedAt,
            Errors = new List<AuditErrorDto>()
        };
    }

    public async Task<BhxhAuditDetailDto> RunAuditAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        session.Status = 1; // InProgress

        // Get medical records for the audit period with insurance claims
        var periodStart = new DateTime(session.PeriodYear, session.PeriodMonth, 1);
        var periodEnd = periodStart.AddMonths(1).AddDays(-1);

        var records = await _context.MedicalRecords
            .Include(r => r.Patient)
            .Where(r => !r.IsDeleted && r.CreatedAt >= periodStart && r.CreatedAt <= periodEnd)
            .ToListAsync();

        var claims = await _context.InsuranceClaims
            .Include(c => c.ClaimDetails)
            .Where(c => !c.IsDeleted && c.CreatedAt >= periodStart && c.CreatedAt <= periodEnd)
            .ToListAsync();

        var errors = new List<BhxhAuditError>();
        decimal totalAmount = 0;

        // Check each claim for common errors
        foreach (var claim in claims)
        {
            totalAmount += claim.TotalAmount;
            var patient = records.FirstOrDefault(r => r.PatientId == claim.PatientId)?.Patient;

            // Check 1: Duplicate claims (same patient, same date, same service)
            var duplicates = claims.Where(c =>
                c.Id != claim.Id &&
                c.PatientId == claim.PatientId &&
                c.CreatedAt.Date == claim.CreatedAt.Date).ToList();

            if (duplicates.Any())
            {
                errors.Add(new BhxhAuditError
                {
                    Id = Guid.NewGuid(),
                    AuditSessionId = sessionId,
                    RecordId = claim.MedicalRecordId,
                    PatientName = patient?.FullName,
                    InsuranceNumber = claim.InsuranceNumber,
                    ErrorType = "DuplicateClaim",
                    ErrorDescription = $"Trùng thanh toán ngày {claim.CreatedAt:dd/MM/yyyy}",
                    OriginalAmount = claim.TotalAmount,
                    AdjustedAmount = 0,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Check 2: Over ceiling (claim > 40x base salary = 7,920,000 VND for outpatient)
            var ceiling = 7_920_000m;
            if (claim.TotalAmount > ceiling)
            {
                errors.Add(new BhxhAuditError
                {
                    Id = Guid.NewGuid(),
                    AuditSessionId = sessionId,
                    RecordId = claim.MedicalRecordId,
                    PatientName = patient?.FullName,
                    InsuranceNumber = claim.InsuranceNumber,
                    ErrorType = "OverCeiling",
                    ErrorDescription = $"Chi phí {claim.TotalAmount:N0} vượt trần {ceiling:N0}",
                    OriginalAmount = claim.TotalAmount,
                    AdjustedAmount = ceiling,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Check 3: Missing or invalid ICD code
            var record = records.FirstOrDefault(r => r.Id == claim.MedicalRecordId);
            if (record != null && string.IsNullOrWhiteSpace(record.MainDiagnosis))
            {
                errors.Add(new BhxhAuditError
                {
                    Id = Guid.NewGuid(),
                    AuditSessionId = sessionId,
                    RecordId = claim.MedicalRecordId,
                    PatientName = patient?.FullName,
                    InsuranceNumber = claim.InsuranceNumber,
                    ErrorType = "WrongIcd",
                    ErrorDescription = "Thiếu mã ICD chẩn đoán chính",
                    OriginalAmount = claim.TotalAmount,
                    AdjustedAmount = 0,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        // Remove existing errors for this session
        var existingErrors = await _context.Set<BhxhAuditError>()
            .Where(e => e.AuditSessionId == sessionId)
            .ToListAsync();
        _context.Set<BhxhAuditError>().RemoveRange(existingErrors);

        // Add new errors
        if (errors.Any())
            _context.Set<BhxhAuditError>().AddRange(errors);

        // Update session summary
        session.TotalRecords = claims.Count;
        session.TotalAmount = totalAmount;
        session.ErrorCount = errors.Count;
        session.ErrorAmount = errors.Sum(e => e.OriginalAmount - e.AdjustedAmount);
        session.Status = 2; // Completed
        session.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new BhxhAuditDetailDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            PeriodMonth = session.PeriodMonth,
            PeriodYear = session.PeriodYear,
            TotalRecords = session.TotalRecords,
            TotalAmount = session.TotalAmount,
            ErrorCount = session.ErrorCount,
            ErrorAmount = session.ErrorAmount,
            Status = session.Status,
            StatusName = StatusNames.GetValueOrDefault(session.Status, "Không xác định"),
            AuditorName = session.Auditor?.FullName,
            Notes = session.Notes,
            CreatedAt = session.CreatedAt,
            Errors = errors.Select(e => MapErrorDto(e)).ToList()
        };
    }

    public async Task<List<AuditErrorDto>> GetErrorsAsync(Guid sessionId)
    {
        return await _context.Set<BhxhAuditError>()
            .Where(e => e.AuditSessionId == sessionId && !e.IsDeleted)
            .OrderBy(e => e.ErrorType)
            .ThenByDescending(e => e.OriginalAmount)
            .Select(e => MapErrorDto(e))
            .ToListAsync();
    }

    public async Task<AuditErrorDto> FixErrorAsync(Guid errorId, FixAuditErrorDto dto)
    {
        var error = await _context.Set<BhxhAuditError>()
            .FirstOrDefaultAsync(e => e.Id == errorId && !e.IsDeleted)
            ?? throw new InvalidOperationException("Audit error not found");

        error.AdjustedAmount = dto.AdjustedAmount;
        error.IsFixed = true;
        error.FixedDate = DateTime.UtcNow;
        error.Notes = dto.Notes?.Trim();
        error.UpdatedAt = DateTime.UtcNow;

        // Recalculate session error amount
        var session = await _context.Set<BhxhAuditSession>().FindAsync(error.AuditSessionId);
        if (session != null)
        {
            var allErrors = await _context.Set<BhxhAuditError>()
                .Where(e => e.AuditSessionId == session.Id && !e.IsDeleted)
                .ToListAsync();

            session.ErrorAmount = allErrors.Sum(e => e.OriginalAmount - e.AdjustedAmount);
            session.UpdatedAt = DateTime.UtcNow;
        }

        await _unitOfWork.SaveChangesAsync();
        return MapErrorDto(error);
    }

    public async Task<AuditDashboardDto> GetDashboardAsync()
    {
        var sessions = await _context.Set<BhxhAuditSession>()
            .Where(s => !s.IsDeleted)
            .ToListAsync();

        var errors = await _context.Set<BhxhAuditError>()
            .Where(e => !e.IsDeleted)
            .ToListAsync();

        var byErrorType = errors
            .GroupBy(e => e.ErrorType)
            .Select(g => new ErrorTypeBreakdownDto
            {
                ErrorType = g.Key,
                ErrorTypeName = ErrorTypeNames.GetValueOrDefault(g.Key, g.Key),
                Count = g.Count(),
                TotalAmount = g.Sum(e => e.OriginalAmount - e.AdjustedAmount)
            })
            .OrderByDescending(e => e.Count)
            .ToList();

        var monthlyTrend = sessions
            .GroupBy(s => new { s.PeriodYear, s.PeriodMonth })
            .Select(g => new MonthlyAuditDto
            {
                Year = g.Key.PeriodYear,
                Month = g.Key.PeriodMonth,
                ErrorCount = g.Sum(s => s.ErrorCount),
                ErrorAmount = g.Sum(s => s.ErrorAmount)
            })
            .OrderByDescending(m => m.Year)
            .ThenByDescending(m => m.Month)
            .Take(12)
            .ToList();

        return new AuditDashboardDto
        {
            TotalSessions = sessions.Count,
            CompletedSessions = sessions.Count(s => s.Status >= 2),
            TotalErrors = errors.Count,
            FixedErrors = errors.Count(e => e.IsFixed),
            TotalErrorAmount = errors.Sum(e => e.OriginalAmount - e.AdjustedAmount),
            FixedAmount = errors.Where(e => e.IsFixed).Sum(e => e.OriginalAmount - e.AdjustedAmount),
            ByErrorType = byErrorType,
            MonthlyTrend = monthlyTrend
        };
    }

    public async Task<BhxhAuditStatisticsDto> GetStatisticsAsync()
    {
        var thisYear = DateTime.UtcNow.Year;

        var sessions = await _context.Set<BhxhAuditSession>()
            .Where(s => !s.IsDeleted && s.PeriodYear == thisYear)
            .ToListAsync();

        var errors = await _context.Set<BhxhAuditError>()
            .Where(e => !e.IsDeleted)
            .Join(_context.Set<BhxhAuditSession>().Where(s => s.PeriodYear == thisYear),
                e => e.AuditSessionId, s => s.Id, (e, s) => e)
            .ToListAsync();

        var totalRecords = sessions.Sum(s => s.TotalRecords);
        var mostCommon = errors
            .GroupBy(e => e.ErrorType)
            .OrderByDescending(g => g.Count())
            .FirstOrDefault();

        var monthlyStats = sessions
            .GroupBy(s => s.PeriodMonth)
            .Select(g => new MonthlyAuditDto
            {
                Year = thisYear,
                Month = g.Key,
                ErrorCount = g.Sum(s => s.ErrorCount),
                ErrorAmount = g.Sum(s => s.ErrorAmount)
            })
            .OrderBy(m => m.Month)
            .ToList();

        return new BhxhAuditStatisticsDto
        {
            TotalSessionsThisYear = sessions.Count,
            TotalErrorsThisYear = errors.Count,
            TotalErrorAmountThisYear = errors.Sum(e => e.OriginalAmount - e.AdjustedAmount),
            FixRate = errors.Count > 0 ? Math.Round((double)errors.Count(e => e.IsFixed) / errors.Count * 100, 1) : 0,
            ErrorRate = totalRecords > 0 ? Math.Round((double)errors.Count / totalRecords * 100, 1) : 0,
            MostCommonErrorType = mostCommon != null ? ErrorTypeNames.GetValueOrDefault(mostCommon.Key, mostCommon.Key) : null,
            MonthlyStats = monthlyStats
        };
    }

    public async Task<BhxhAuditDetailDto> ApproveSessionAsync(Guid sessionId, Guid approvedByUserId, string? notes)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        if (session.Status < 2)
            throw new InvalidOperationException("Phiên giám định chưa hoàn thành, không thể duyệt");

        // Use new audit columns added by migration 75
        session.Status = 4; // Approved
        session.ApprovedBy = approvedByUserId;
        session.ApprovedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(notes))
            session.Notes = notes;
        session.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new BhxhAuditDetailDto
        {
            Id = session.Id,
            SessionCode = session.SessionCode,
            PeriodMonth = session.PeriodMonth,
            PeriodYear = session.PeriodYear,
            TotalRecords = session.TotalRecords,
            TotalAmount = session.TotalAmount,
            ErrorCount = session.ErrorCount,
            ErrorAmount = session.ErrorAmount,
            Status = session.Status,
            StatusName = StatusNames.GetValueOrDefault(session.Status, "Đã duyệt"),
            AuditorName = session.Auditor?.FullName,
            Notes = session.Notes,
            CreatedAt = session.CreatedAt,
            Errors = new List<AuditErrorDto>()
        };
    }

    public async Task<BhxhAuditPortalSubmitResultDto> SubmitToPortalAsync(Guid sessionId, Guid userId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        if (session.Status < 2)
            throw new InvalidOperationException("Phiên giám định chưa hoàn thành, không thể gửi cổng");

        // MockMode: update status + log, not calling real BHXH portal (gateway not integrated yet)
        var mockTxId = $"MOCK-{DateTime.UtcNow:yyyyMMddHHmmss}-{sessionId.ToString("N")[..8].ToUpper()}";
        session.Status = 3; // Submitted
        session.SubmittedAt = DateTime.UtcNow;
        session.SubmittedBy = userId;
        session.PortalTransactionId = mockTxId;
        session.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new BhxhAuditPortalSubmitResultDto
        {
            SessionId = session.Id,
            SessionCode = session.SessionCode,
            PortalStatus = "MockSubmitted",
            TransactionId = mockTxId,
            SubmittedAt = session.SubmittedAt.Value,
            Success = true,
            Message = "[MockMode] Đã cập nhật trạng thái gửi cổng. Tích hợp cổng BHXH thật sẽ được implement trong sprint tiếp theo."
        };
    }

    public async Task<BhxhAuditBatchSubmitResultDto> SubmitBatchAsync(IEnumerable<Guid> sessionIds, Guid userId)
    {
        var result = new BhxhAuditBatchSubmitResultDto();
        var ids = sessionIds.ToList();
        result.TotalRequested = ids.Count;

        foreach (var id in ids)
        {
            try
            {
                var item = await SubmitToPortalAsync(id, userId);
                result.Results.Add(item);
                if (item.Success) result.Submitted++;
                else result.Failed++;
            }
            catch (InvalidOperationException ex)
            {
                result.Skipped++;
                result.Results.Add(new BhxhAuditPortalSubmitResultDto
                {
                    SessionId = id,
                    PortalStatus = "Skipped",
                    Success = false,
                    Message = ex.Message,
                    SubmittedAt = DateTime.UtcNow
                });
            }
        }

        return result;
    }

    private static AuditErrorDto MapErrorDto(BhxhAuditError e) => new()
    {
        Id = e.Id,
        AuditSessionId = e.AuditSessionId,
        RecordId = e.RecordId,
        PatientName = e.PatientName,
        InsuranceNumber = e.InsuranceNumber,
        ErrorType = e.ErrorType,
        ErrorTypeName = ErrorTypeNames.GetValueOrDefault(e.ErrorType, e.ErrorType),
        ErrorDescription = e.ErrorDescription,
        OriginalAmount = e.OriginalAmount,
        AdjustedAmount = e.AdjustedAmount,
        IsFixed = e.IsFixed,
        FixedBy = e.FixedBy,
        FixedDate = e.FixedDate,
        Notes = e.Notes
    };
}
