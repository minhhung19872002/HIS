using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class InterHospitalService : IInterHospitalService
{
    private readonly HISDbContext _context;
    private readonly ILogger<InterHospitalService> _logger;

    public InterHospitalService(HISDbContext context, ILogger<InterHospitalService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<InterHospitalRequestDto>> SearchRequestsAsync(InterHospitalRequestSearchDto? filter = null)
    {
        try
        {
            var query = _context.InterHospitalRequests.Where(r => !r.IsDeleted).AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.Keyword))
                {
                    var kw = filter.Keyword.ToLower();
                    query = query.Where(r =>
                        r.RequestCode.ToLower().Contains(kw) ||
                        (r.PatientName != null && r.PatientName.ToLower().Contains(kw)) ||
                        (r.RequestingFacility != null && r.RequestingFacility.ToLower().Contains(kw)) ||
                        (r.ReceivingFacility != null && r.ReceivingFacility.ToLower().Contains(kw)));
                }
                if (!string.IsNullOrEmpty(filter.RequestType))
                    query = query.Where(r => r.RequestType == filter.RequestType);
                if (filter.Status.HasValue)
                    query = query.Where(r => r.Status == filter.Status.Value);
                if (!string.IsNullOrEmpty(filter.Urgency))
                    query = query.Where(r => r.Urgency == filter.Urgency);
                if (NormalizeDirection(filter.Direction) is { } dir && !string.IsNullOrEmpty(filter.Direction))
                    query = query.Where(r => r.Direction == dir);
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(r => r.RequestDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(r => r.RequestDate < to.Date.AddDays(1));
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(200)
                .Select(r => MapToDto(r))
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "InterHospitalService thao tác thất bại, trả giá trị mặc định"); return new List<InterHospitalRequestDto>(); }
    }

    public async Task<InterHospitalRequestDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var r = await _context.InterHospitalRequests.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (r == null) return null;
            return MapToDto(r);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "InterHospitalService thao tác thất bại, trả giá trị mặc định"); return null; }
    }

    public async Task<InterHospitalRequestDto> CreateRequestAsync(CreateInterHospitalRequestDto dto)
    {
        // QA-R3: direction was not stored, so every request looked outgoing and incoming ones could never be answered.
        var direction = NormalizeDirection(dto.Direction);
        if (direction == null)
            throw new ArgumentException("Chiều yêu cầu không hợp lệ (outgoing / incoming)", nameof(dto.Direction));
        // A request without a destination facility cannot be routed (was saved silently with nulls).
        // An incoming request is addressed to us — then the sending facility is what must be known.
        if (direction == "outgoing" && string.IsNullOrWhiteSpace(dto.ReceivingFacility))
            throw new ArgumentException("Bệnh viện nhận là bắt buộc", nameof(dto.ReceivingFacility));
        if (direction == "incoming" && string.IsNullOrWhiteSpace(dto.RequestingFacility))
            throw new ArgumentException("Bệnh viện gửi yêu cầu là bắt buộc", nameof(dto.RequestingFacility));
        var requestType = dto.RequestType ?? "consultation";
        // Duplicate referral: same patient → same facility → same request type while one is still open.
        if (dto.PatientId.HasValue && await _context.InterHospitalRequests.AnyAsync(r => !r.IsDeleted
                && r.PatientId == dto.PatientId && r.ReceivingFacility == dto.ReceivingFacility
                && r.RequestType == requestType && (r.Status == 0 || r.Status == 1 || r.Status == 2)))
            throw new InvalidOperationException("Người bệnh đã có yêu cầu liên viện cùng loại tới bệnh viện này đang xử lý.");

        var entity = new InterHospitalRequest
        {
            Id = Guid.NewGuid(),
            // QA-R3: was Count()+1 → concurrent creates (and any deleted row) produced duplicate codes.
            RequestCode = await RecordCodeGenerator.NextInterHospitalCodeAsync(_context),
            RequestType = requestType,
            Direction = direction,
            RequestingFacility = dto.RequestingFacility,
            ReceivingFacility = dto.ReceivingFacility,
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            Urgency = dto.Urgency ?? "routine",
            // Local VN time like the seeded rows: the DTO serialises it without offset, so UTC showed 7h early.
            RequestDate = DateTime.Now,
            Status = 0,
            RequestDetails = dto.RequestDetails,
            RequestedBy = dto.RequestedBy,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.InterHospitalRequests.Add(entity);
        for (var attempt = 1; ; attempt++)
        {
            try { await _context.SaveChangesAsync(); break; }
            catch (DbUpdateException ex) when (NangCap23ServiceHelpers.IsUniqueViolation(ex) && attempt < RecordCodeGenerator.MaxAttempts)
            {
                entity.RequestCode = await RecordCodeGenerator.NextInterHospitalCodeAsync(_context);
            }
        }

        return MapToDto(entity);
    }

    public async Task<InterHospitalRequestDto> RespondToRequestAsync(Guid id, RespondInterHospitalRequestDto dto)
    {
        var entity = await _context.InterHospitalRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu liên viện");

        // Status: 0=pending, 1=accepted, 2=in progress, 3=completed, 4=rejected (v2 page scheme).
        // Previously any int was stored (e.g. 99) and a completed/rejected request could be re-opened.
        if (entity.Status == 3 || entity.Status == 4)
            throw new InvalidOperationException("Yêu cầu liên viện đã hoàn thành hoặc đã bị từ chối, không phản hồi lại được.");
        if (dto.Status.HasValue && (dto.Status.Value < 1 || dto.Status.Value > 4))
            throw new ArgumentException("Trạng thái phản hồi không hợp lệ", nameof(dto.Status));

        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.ResponseDetails != null) entity.ResponseDetails = dto.ResponseDetails;
        if (dto.RespondedBy != null) entity.RespondedBy = dto.RespondedBy;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.ResponseDate = DateTime.Now;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<List<InterHospitalRequestDto>> GetActiveRequestsAsync()
    {
        try
        {
            return await _context.InterHospitalRequests
                .Where(r => !r.IsDeleted && (r.Status == 0 || r.Status == 1 || r.Status == 2))
                .OrderByDescending(r => r.RequestDate)
                .Take(100)
                .Select(r => MapToDto(r))
                .ToListAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "InterHospitalService thao tác thất bại, trả giá trị mặc định"); return new List<InterHospitalRequestDto>(); }
    }

    public async Task<InterHospitalStatsDto> GetStatsAsync()
    {
        try
        {
            var requests = await _context.InterHospitalRequests.Where(r => !r.IsDeleted).ToListAsync();
            return new InterHospitalStatsDto
            {
                TotalRequests = requests.Count,
                PendingCount = requests.Count(r => r.Status == 0),
                AcceptedCount = requests.Count(r => r.Status == 1),
                CompletedCount = requests.Count(r => r.Status == 3),
                // 4 = rejected (the v2 page sends 4; counting 2 always reported 0 rejections).
                RejectedCount = requests.Count(r => r.Status == 4),
                InProgressCount = requests.Count(r => r.Status == 2),
                CompletedToday = requests.Count(r => r.Status == 3 && r.ResponseDate.HasValue && r.ResponseDate.Value.Date == DateTime.Today),
                AvgResponseTimeMinutes = requests.Where(r => r.RequestDate.HasValue && r.ResponseDate.HasValue && r.ResponseDate >= r.RequestDate)
                    .Select(r => (r.ResponseDate!.Value - r.RequestDate!.Value).TotalMinutes)
                    .DefaultIfEmpty(0).Average(),
                RequestTypeBreakdown = requests.GroupBy(r => r.RequestType)
                    .Select(g => new InterHospitalRequestTypeBreakdownDto { RequestType = g.Key, Count = g.Count() })
                    .ToList(),
                UrgencyBreakdown = requests.GroupBy(r => r.Urgency)
                    .Select(g => new InterHospitalUrgencyBreakdownDto { Urgency = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch (Exception ex) { _logger.LogWarning(ex, "InterHospitalService thao tác thất bại, trả giá trị mặc định"); return new InterHospitalStatsDto(); }
    }

    /// <summary>null/empty → "outgoing"; "incoming"/"outgoing" (any case) → itself; anything else → null (invalid).</summary>
    private static string? NormalizeDirection(string? direction)
    {
        var d = direction?.Trim().ToLowerInvariant();
        return string.IsNullOrEmpty(d) ? "outgoing" : d is "incoming" or "outgoing" ? d : null;
    }

    private static InterHospitalRequestDto MapToDto(InterHospitalRequest r) => new()
    {
        Id = r.Id,
        RequestCode = r.RequestCode,
        RequestType = r.RequestType,
        Direction = r.Direction,
        RequestingFacility = r.RequestingFacility,
        ReceivingFacility = r.ReceivingFacility,
        PatientId = r.PatientId,
        PatientName = r.PatientName,
        Urgency = r.Urgency,
        RequestDate = r.RequestDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
        ResponseDate = r.ResponseDate?.ToString("yyyy-MM-ddTHH:mm:ss"),
        Status = r.Status,
        RequestDetails = r.RequestDetails,
        ResponseDetails = r.ResponseDetails,
        RequestedBy = r.RequestedBy,
        RespondedBy = r.RespondedBy,
        Notes = r.Notes,
    };
}
