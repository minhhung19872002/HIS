using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using System.Text;

namespace HIS.Infrastructure.Services;

public class BhxhAuditService : IBhxhAuditService
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

    public async Task<byte[]> ExportSessionAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        // Generate CSV export
        var sb = new StringBuilder();
        sb.AppendLine("STT,Họ tên BN,Số thẻ BHYT,Loại lỗi,Mô tả,Số tiền gốc,Số tiền điều chỉnh,Đã sửa");

        var i = 1;
        foreach (var error in session.Errors.Where(e => !e.IsDeleted).OrderBy(e => e.ErrorType))
        {
            sb.AppendLine($"{i++}," +
                $"\"{error.PatientName}\"," +
                $"\"{error.InsuranceNumber}\"," +
                $"\"{ErrorTypeNames.GetValueOrDefault(error.ErrorType, error.ErrorType)}\"," +
                $"\"{error.ErrorDescription}\"," +
                $"{error.OriginalAmount}," +
                $"{error.AdjustedAmount}," +
                $"{(error.IsFixed ? "Có" : "Không")}");
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
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

    public async Task<byte[]> ExportXmlAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        // XML130-like format (simplified — real XML130 schema needs BHXH specification)
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<GiamDinhBHXH xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">");
        sb.AppendLine($"  <PhienGiamDinh ma=\"{session.SessionCode}\" thang=\"{session.PeriodMonth}\" nam=\"{session.PeriodYear}\"/>");
        sb.AppendLine($"  <TongHop soHoSo=\"{session.TotalRecords}\" tongTien=\"{session.TotalAmount}\" soLoi=\"{session.ErrorCount}\" tienLoi=\"{session.ErrorAmount}\"/>");
        sb.AppendLine("  <DanhSachLoi>");
        int idx = 1;
        foreach (var err in session.Errors.Where(e => !e.IsDeleted))
        {
            sb.AppendLine($"    <Loi stt=\"{idx++}\">");
            sb.AppendLine($"      <HoTenBN>{System.Security.SecurityElement.Escape(err.PatientName ?? "")}</HoTenBN>");
            sb.AppendLine($"      <SoTheBHYT>{System.Security.SecurityElement.Escape(err.InsuranceNumber ?? "")}</SoTheBHYT>");
            sb.AppendLine($"      <LoaiLoi>{System.Security.SecurityElement.Escape(err.ErrorType)}</LoaiLoi>");
            sb.AppendLine($"      <MoTa>{System.Security.SecurityElement.Escape(err.ErrorDescription ?? "")}</MoTa>");
            sb.AppendLine($"      <TienGoc>{err.OriginalAmount}</TienGoc>");
            sb.AppendLine($"      <TienDieuChinh>{err.AdjustedAmount}</TienDieuChinh>");
            sb.AppendLine($"      <DaSua>{(err.IsFixed ? "1" : "0")}</DaSua>");
            sb.AppendLine("    </Loi>");
        }
        sb.AppendLine("  </DanhSachLoi>");
        sb.AppendLine("</GiamDinhBHXH>");

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    public async Task<byte[]> ExportBatchXmlAsync(IEnumerable<Guid> sessionIds)
    {
        var idList = sessionIds?.ToList() ?? new List<Guid>();
        if (idList.Count == 0)
            throw new ArgumentException("Cần ít nhất 1 phiên giám định");

        using var zipStream = new System.IO.MemoryStream();
        using (var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var sessionId in idList)
            {
                var session = await _context.Set<BhxhAuditSession>()
                    .Include(s => s.Errors)
                    .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted);

                if (session == null) continue; // bỏ qua session không tồn tại

                var xmlBytes = await ExportXmlAsync(sessionId);
                var entryName = $"{session.SessionCode}.xml";
                var entry = archive.CreateEntry(entryName, System.IO.Compression.CompressionLevel.Optimal);
                using var entryStream = entry.Open();
                await entryStream.WriteAsync(xmlBytes);
            }
        }

        return zipStream.ToArray();
    }

    public async Task<byte[]> PrintAuditFormAsync(Guid sessionId)
    {
        var session = await _context.Set<BhxhAuditSession>()
            .Include(s => s.Auditor)
            .Include(s => s.Errors)
            .FirstOrDefaultAsync(s => s.Id == sessionId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Audit session not found");

        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/>");
        sb.AppendLine("<style>");
        sb.AppendLine("body{font-family:Times New Roman,serif;font-size:12pt;margin:20px;}");
        sb.AppendLine("table{width:100%;border-collapse:collapse;margin:8px 0;}");
        sb.AppendLine("th,td{border:1px solid #333;padding:4px 6px;font-size:11pt;}");
        sb.AppendLine("th{background:#f0f0f0;font-weight:bold;text-align:center;}");
        sb.AppendLine(".title{text-align:center;font-weight:bold;font-size:14pt;margin-bottom:4px;}");
        sb.AppendLine(".subtitle{text-align:center;margin-bottom:12px;}");
        sb.AppendLine("@media print{body{margin:10mm;}}");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<div class='title'>PHIẾU GIÁM ĐỊNH BHXH</div>");
        sb.AppendLine($"<div class='subtitle'>Kỳ: Tháng {session.PeriodMonth}/{session.PeriodYear} &nbsp;|&nbsp; Mã phiên: {System.Web.HttpUtility.HtmlEncode(session.SessionCode)}</div>");
        sb.AppendLine("<table>");
        sb.AppendLine("<tr><th colspan='2'>THÔNG TIN PHIÊN GIÁM ĐỊNH</th></tr>");
        sb.AppendLine($"<tr><td>Mã phiên</td><td>{System.Web.HttpUtility.HtmlEncode(session.SessionCode)}</td></tr>");
        sb.AppendLine($"<tr><td>Kỳ giám định</td><td>Tháng {session.PeriodMonth}/{session.PeriodYear}</td></tr>");
        sb.AppendLine($"<tr><td>Tổng hồ sơ</td><td>{session.TotalRecords:N0}</td></tr>");
        sb.AppendLine($"<tr><td>Tổng tiền</td><td>{session.TotalAmount:N0} VND</td></tr>");
        sb.AppendLine($"<tr><td>Số lỗi</td><td>{session.ErrorCount}</td></tr>");
        sb.AppendLine($"<tr><td>Tiền lỗi</td><td>{session.ErrorAmount:N0} VND</td></tr>");
        sb.AppendLine($"<tr><td>Kiểm toán viên</td><td>{System.Web.HttpUtility.HtmlEncode(session.Auditor?.FullName ?? "")}</td></tr>");
        sb.AppendLine($"<tr><td>Ngày lập</td><td>{session.CreatedAt:dd/MM/yyyy HH:mm}</td></tr>");
        sb.AppendLine("</table>");

        if (session.Errors.Any(e => !e.IsDeleted))
        {
            sb.AppendLine("<table>");
            sb.AppendLine("<tr><th>STT</th><th>Họ tên BN</th><th>Số thẻ BHYT</th><th>Loại lỗi</th><th>Mô tả</th><th>Tiền gốc</th><th>Tiền điều chỉnh</th><th>Đã sửa</th></tr>");
            int i = 1;
            foreach (var err in session.Errors.Where(e => !e.IsDeleted).OrderBy(e => e.ErrorType))
            {
                sb.AppendLine($"<tr><td>{i++}</td><td>{System.Web.HttpUtility.HtmlEncode(err.PatientName ?? "")}</td><td>{System.Web.HttpUtility.HtmlEncode(err.InsuranceNumber ?? "")}</td><td>{System.Web.HttpUtility.HtmlEncode(ErrorTypeNames.GetValueOrDefault(err.ErrorType, err.ErrorType))}</td><td>{System.Web.HttpUtility.HtmlEncode(err.ErrorDescription ?? "")}</td><td style='text-align:right'>{err.OriginalAmount:N0}</td><td style='text-align:right'>{err.AdjustedAmount:N0}</td><td style='text-align:center'>{(err.IsFixed ? "✓" : "")}</td></tr>");
            }
            sb.AppendLine("</table>");
        }

        sb.AppendLine("<script>window.onload=function(){window.print();}</script>");
        sb.AppendLine("</body></html>");

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
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

    // ============================================================
    // Import danh sach giam dinh BHXH tu CSV (Issue #97/#121/#122)
    // NOTE: Excel can them thu vien ClosedXML/EPPlus; hien tai chi ho tro CSV.
    // ============================================================

    private static readonly string[] TrangThaiNames = { "Chua duyet", "Da duyet", "Tu choi" };

    /// <summary>
    /// Import CSV giam dinh BHXH — moi dong 1 ho so.
    /// Header bat buoc: MaHoSo,MaBenhNhan,HoTen,SoTheBHYT,NgayVao,NgayRa,MaKhoa,TenKhoa,MaChanDoan,TienVienPhi,TienBHYT,TienBenhNhan,TrangThaiGiamDinh,GhiChu
    /// </summary>
    public async Task<BhxhAuditImportResultDto> ImportAuditListAsync(byte[] csvContent, string? fileName, Guid importedByUserId)
    {
        var batchCode = $"IMPORT-{DateTime.UtcNow:yyyyMMdd-HHmmss}";
        var result = new BhxhAuditImportResultDto
        {
            ImportBatchCode = batchCode,
            FileName = fileName
        };

        var lines = Encoding.UTF8.GetString(csvContent)
            .Split('\n', StringSplitOptions.RemoveEmptyEntries);

        if (lines.Length < 2)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto
            {
                RowNumber = 0, MaHoSo = "",
                ErrorMessage = "File CSV rong hoac thieu header."
            });
            return result;
        }

        // Header index mapping (case-insensitive)
        var headerCols = lines[0].Trim().Split(',');
        var hdr = headerCols.Select(h => h.Trim().ToLowerInvariant()).ToArray();

        int col(string name) => Array.IndexOf(hdr, name);
        string val(string[] cols, int idx) => idx >= 0 && idx < cols.Length ? cols[idx].Trim() : "";

        int iMaHoSo   = col("mahoSo");   if (iMaHoSo < 0)   iMaHoSo   = col("mahoso");
        int iMaBN      = col("mabenhNhan"); if (iMaBN < 0)    iMaBN     = col("mabenhnhan");
        int iHoTen     = col("hoten");
        int iSoThe     = col("sothebhyt");
        int iNgayVao   = col("ngayvao");
        int iNgayRa    = col("ngayra");
        int iMaKhoa    = col("makhoa");
        int iTenKhoa   = col("tenkhoa");
        int iMaCD      = col("machandoan");
        int iTienVP    = col("tienvienPhi");    if (iTienVP < 0) iTienVP = col("tienvienphi");
        int iTienBHYT  = col("tienbhyt");
        int iTienBN    = col("tienbenhNhan");   if (iTienBN < 0) iTienBN = col("tienbenhnhan");
        int iTrangThai = col("trangthaigiamdinhh"); if (iTrangThai < 0) iTrangThai = col("trangthaigiamdinh");
        int iGhiChu    = col("ghichu");

        if (iMaHoSo < 0)
        {
            result.Errors.Add(new BhxhAuditImportRowErrorDto
            {
                RowNumber = 1, MaHoSo = "",
                ErrorMessage = $"Thieu cot 'MaHoSo'. Header hien tai: {lines[0].Trim()}"
            });
            return result;
        }

        result.TotalRows = lines.Length - 1;
        var rows = new List<BhxhAuditImport>();

        for (int i = 1; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (string.IsNullOrWhiteSpace(line)) { result.TotalRows--; continue; }

            var cols = line.Split(',');
            int rowNum = i + 1;
            var maHoSo = val(cols, iMaHoSo);

            if (string.IsNullOrWhiteSpace(maHoSo))
            {
                result.SkippedRows++;
                result.Errors.Add(new BhxhAuditImportRowErrorDto
                {
                    RowNumber = rowNum, MaHoSo = maHoSo,
                    ErrorMessage = "MaHoSo trong"
                });
                continue;
            }

            // Parse so tien
            decimal ParseMoney(string s) =>
                decimal.TryParse(s.Replace(".", "").Replace(",", ""), out var v) ? v : 0;

            // Parse trang thai: 0/1/2 hoac text
            int trangThai = 0;
            var ttStr = val(cols, iTrangThai);
            if (!int.TryParse(ttStr, out trangThai))
                trangThai = ttStr.Contains("duyet", StringComparison.OrdinalIgnoreCase) ? 1 :
                            ttStr.Contains("choi", StringComparison.OrdinalIgnoreCase)   ? 2 : 0;

            // Parse ngay
            DateTime? ParseDate(string s) =>
                DateTime.TryParse(s, out var d) ? (DateTime?)d : null;

            rows.Add(new BhxhAuditImport
            {
                ImportBatchCode    = batchCode,
                ImportedAt         = DateTime.UtcNow,
                ImportedByUserId   = importedByUserId == Guid.Empty ? null : importedByUserId,
                FileName           = fileName,
                RowNumber          = rowNum,
                MaHoSo             = maHoSo,
                MaBenhNhan         = val(cols, iMaBN),
                HoTen              = val(cols, iHoTen),
                SoTheBHYT         = val(cols, iSoThe),
                NgayVao            = ParseDate(val(cols, iNgayVao)),
                NgayRa             = ParseDate(val(cols, iNgayRa)),
                MaKhoa             = val(cols, iMaKhoa),
                TenKhoa            = val(cols, iTenKhoa),
                MaChanDoan         = val(cols, iMaCD),
                TienVienPhi        = ParseMoney(val(cols, iTienVP)),
                TienBHYT           = ParseMoney(val(cols, iTienBHYT)),
                TienBenhNhan       = ParseMoney(val(cols, iTienBN)),
                TrangThaiGiamDinh  = trangThai,
                GhiChu             = val(cols, iGhiChu),
                IsValid            = true,
            });

            result.ImportedRows++;
        }

        if (rows.Any())
        {
            _context.BhxhAuditImports.AddRange(rows);
            await _context.SaveChangesAsync();
        }

        return result;
    }

    public async Task<BhxhAuditImportPagedResult> GetImportedRowsAsync(BhxhAuditImportSearchDto filter)
    {
        var q = _context.BhxhAuditImports.Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.ImportBatchCode))
            q = q.Where(x => x.ImportBatchCode == filter.ImportBatchCode);

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim();
            q = q.Where(x => x.MaHoSo.Contains(kw)
                           || (x.HoTen != null && x.HoTen.Contains(kw))
                           || (x.SoTheBHYT != null && x.SoTheBHYT.Contains(kw)));
        }

        if (filter.TrangThai.HasValue)
            q = q.Where(x => x.TrangThaiGiamDinh == filter.TrangThai.Value);

        var total        = await q.CountAsync();
        var chuaDuyet    = await q.CountAsync(x => x.TrangThaiGiamDinh == 0);
        var daDuyet      = await q.CountAsync(x => x.TrangThaiGiamDinh == 1);
        var tuChoi       = await q.CountAsync(x => x.TrangThaiGiamDinh == 2);

        var items = await q
            .OrderByDescending(x => x.ImportedAt)
            .ThenBy(x => x.RowNumber)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new BhxhAuditImportRowDto
            {
                Id                = x.Id,
                ImportBatchCode   = x.ImportBatchCode,
                ImportedAt        = x.ImportedAt,
                FileName          = x.FileName,
                RowNumber         = x.RowNumber,
                MaHoSo            = x.MaHoSo,
                MaBenhNhan        = x.MaBenhNhan,
                HoTen             = x.HoTen,
                SoTheBHYT        = x.SoTheBHYT,
                NgayVao           = x.NgayVao,
                NgayRa            = x.NgayRa,
                MaKhoa            = x.MaKhoa,
                TenKhoa           = x.TenKhoa,
                MaChanDoan        = x.MaChanDoan,
                TienVienPhi       = x.TienVienPhi,
                TienBHYT          = x.TienBHYT,
                TienBenhNhan      = x.TienBenhNhan,
                TrangThaiGiamDinh = x.TrangThaiGiamDinh,
                TrangThaiName     = x.TrangThaiGiamDinh == 1 ? "Da duyet"
                                  : x.TrangThaiGiamDinh == 2 ? "Tu choi" : "Chua duyet",
                GhiChu            = x.GhiChu,
                IsValid           = x.IsValid,
                ValidationError   = x.ValidationError,
            })
            .ToListAsync();

        return new BhxhAuditImportPagedResult
        {
            Items         = items,
            TotalCount    = total,
            PageIndex     = filter.PageIndex,
            PageSize      = filter.PageSize,
            CountChuaDuyet = chuaDuyet,
            CountDaDuyet  = daDuyet,
            CountTuChoi   = tuChoi,
        };
    }
}
