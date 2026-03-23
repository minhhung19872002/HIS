using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class InterHospitalService : IInterHospitalService
{
    private readonly HISDbContext _context;

    public InterHospitalService(HISDbContext context)
    {
        _context = context;
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
                if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                    query = query.Where(r => r.RequestDate >= from);
                if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                    query = query.Where(r => r.RequestDate <= to.AddDays(1));
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(200)
                .Select(r => MapToDto(r))
                .ToListAsync();
        }
        catch { return new List<InterHospitalRequestDto>(); }
    }

    public async Task<InterHospitalRequestDto?> GetByIdAsync(Guid id)
    {
        try
        {
            var r = await _context.InterHospitalRequests.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (r == null) return null;
            return MapToDto(r);
        }
        catch { return null; }
    }

    public async Task<InterHospitalRequestDto> CreateRequestAsync(CreateInterHospitalRequestDto dto)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _context.InterHospitalRequests.CountAsync(r => r.CreatedAt.Year == year) + 1;

        var entity = new InterHospitalRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = $"LV-{year}-{count:D4}",
            RequestType = dto.RequestType ?? "consultation",
            RequestingFacility = dto.RequestingFacility,
            ReceivingFacility = dto.ReceivingFacility,
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            Urgency = dto.Urgency ?? "routine",
            RequestDate = DateTime.UtcNow,
            Status = 0,
            RequestDetails = dto.RequestDetails,
            RequestedBy = dto.RequestedBy,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.InterHospitalRequests.Add(entity);
        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<InterHospitalRequestDto> RespondToRequestAsync(Guid id, RespondInterHospitalRequestDto dto)
    {
        var entity = await _context.InterHospitalRequests.FindAsync(id)
            ?? throw new InvalidOperationException("Inter-hospital request not found");

        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.ResponseDetails != null) entity.ResponseDetails = dto.ResponseDetails;
        if (dto.RespondedBy != null) entity.RespondedBy = dto.RespondedBy;
        if (dto.Notes != null) entity.Notes = dto.Notes;
        entity.ResponseDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<List<InterHospitalRequestDto>> GetActiveRequestsAsync()
    {
        try
        {
            return await _context.InterHospitalRequests
                .Where(r => !r.IsDeleted && (r.Status == 0 || r.Status == 1))
                .OrderByDescending(r => r.RequestDate)
                .Take(100)
                .Select(r => MapToDto(r))
                .ToListAsync();
        }
        catch { return new List<InterHospitalRequestDto>(); }
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
                RejectedCount = requests.Count(r => r.Status == 2),
                RequestTypeBreakdown = requests.GroupBy(r => r.RequestType)
                    .Select(g => new InterHospitalRequestTypeBreakdownDto { RequestType = g.Key, Count = g.Count() })
                    .ToList(),
                UrgencyBreakdown = requests.GroupBy(r => r.Urgency)
                    .Select(g => new InterHospitalUrgencyBreakdownDto { Urgency = g.Key, Count = g.Count() })
                    .ToList(),
            };
        }
        catch { return new InterHospitalStatsDto(); }
    }

    private static InterHospitalRequestDto MapToDto(InterHospitalRequest r) => new()
    {
        Id = r.Id,
        RequestCode = r.RequestCode,
        RequestType = r.RequestType,
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
