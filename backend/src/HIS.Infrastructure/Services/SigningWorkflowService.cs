using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class SigningWorkflowService : ISigningWorkflowService
{
    private readonly HISDbContext _context;

    public SigningWorkflowService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<SigningRequestDto>> GetPendingRequestsAsync(Guid assignedToId, SigningRequestSearchDto? filter = null)
    {
        var query = _context.SigningRequests
            .Where(r => r.AssignedToId == assignedToId && r.Status == 0)
            .AsQueryable();

        query = ApplyFilter(query, filter);

        var results = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return results.Select(MapToDto).ToList();
    }

    public async Task<List<SigningRequestDto>> GetSubmittedRequestsAsync(Guid submittedById, SigningRequestSearchDto? filter = null)
    {
        var query = _context.SigningRequests
            .Where(r => r.SubmittedById == submittedById)
            .AsQueryable();

        query = ApplyFilter(query, filter);

        var results = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return results.Select(MapToDto).ToList();
    }

    public async Task<List<SigningRequestDto>> GetHistoryAsync(Guid userId, SigningRequestSearchDto? filter = null)
    {
        var query = _context.SigningRequests
            .Where(r => (r.AssignedToId == userId || r.SubmittedById == userId) && r.Status != 0)
            .AsQueryable();

        query = ApplyFilter(query, filter);

        var results = await query.OrderByDescending(r => r.SignedAt ?? r.UpdatedAt ?? r.CreatedAt).ToListAsync();
        return results.Select(MapToDto).ToList();
    }

    public async Task<SigningRequestDto> SubmitRequestAsync(SubmitSigningRequestDto dto, Guid submittedById, string submittedByName)
    {
        var entity = new SigningRequest
        {
            DocumentType = dto.DocumentType,
            DocumentId = dto.DocumentId,
            DocumentTitle = dto.DocumentTitle,
            DocumentContent = dto.DocumentContent ?? string.Empty,
            SubmittedById = submittedById,
            SubmittedByName = submittedByName,
            AssignedToId = dto.AssignedToId,
            AssignedToName = dto.AssignedToName,
            Status = 0,
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            DepartmentName = dto.DepartmentName,
            CreatedBy = submittedById.ToString(),
        };

        _context.SigningRequests.Add(entity);
        await _context.SaveChangesAsync();

        return MapToDto(entity);
    }

    public async Task<SigningRequestDto> ApproveRequestAsync(Guid id, Guid userId, ApproveSigningRequestDto? dto = null)
    {
        var entity = await _context.SigningRequests.FindAsync(id);
        if (entity == null)
            throw new InvalidOperationException("Yeu cau trinh ky khong ton tai");
        if (entity.AssignedToId != userId)
            throw new InvalidOperationException("Ban khong co quyen phe duyet yeu cau nay");
        if (entity.Status != 0)
            throw new InvalidOperationException("Yeu cau nay da duoc xu ly");

        entity.Status = 1;
        entity.SignedAt = DateTime.UtcNow;
        entity.SignatureData = dto?.SignatureData;
        entity.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return MapToDto(entity);
    }

    public async Task<SigningRequestDto> RejectRequestAsync(Guid id, Guid userId, RejectSigningRequestDto dto)
    {
        var entity = await _context.SigningRequests.FindAsync(id);
        if (entity == null)
            throw new InvalidOperationException("Yeu cau trinh ky khong ton tai");
        if (entity.AssignedToId != userId)
            throw new InvalidOperationException("Ban khong co quyen tu choi yeu cau nay");
        if (entity.Status != 0)
            throw new InvalidOperationException("Yeu cau nay da duoc xu ly");

        entity.Status = 2;
        entity.RejectReason = dto.RejectReason;
        entity.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return MapToDto(entity);
    }

    public async Task CancelRequestAsync(Guid id, Guid userId)
    {
        var entity = await _context.SigningRequests.FindAsync(id);
        if (entity == null)
            throw new InvalidOperationException("Yeu cau trinh ky khong ton tai");
        if (entity.SubmittedById != userId)
            throw new InvalidOperationException("Ban khong co quyen huy yeu cau nay");
        if (entity.Status != 0)
            throw new InvalidOperationException("Chi co the huy yeu cau dang cho duyet");

        entity.Status = 3;
        entity.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
    }

    public async Task<SigningWorkflowStatsDto> GetStatsAsync(Guid userId)
    {
        var today = DateTime.UtcNow.Date;

        var allRequests = await _context.SigningRequests
            .Where(r => r.AssignedToId == userId || r.SubmittedById == userId)
            .Select(r => new { r.Status, r.CreatedAt, r.SignedAt, r.SubmittedById })
            .ToListAsync();

        return new SigningWorkflowStatsDto
        {
            PendingCount = allRequests.Count(r => r.Status == 0),
            ApprovedCount = allRequests.Count(r => r.Status == 1),
            RejectedCount = allRequests.Count(r => r.Status == 2),
            CancelledCount = allRequests.Count(r => r.Status == 3),
            TotalCount = allRequests.Count,
            TodaySubmitted = allRequests.Count(r => r.SubmittedById == userId && r.CreatedAt.Date >= today),
            TodayApproved = allRequests.Count(r => r.Status == 1 && r.SignedAt.HasValue && r.SignedAt.Value.Date >= today),
        };
    }

    private static IQueryable<SigningRequest> ApplyFilter(IQueryable<SigningRequest> query, SigningRequestSearchDto? filter)
    {
        if (filter == null) return query;

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(r =>
                r.DocumentTitle.ToLower().Contains(kw) ||
                r.SubmittedByName.ToLower().Contains(kw) ||
                r.AssignedToName.ToLower().Contains(kw) ||
                (r.PatientName != null && r.PatientName.ToLower().Contains(kw)));
        }

        if (!string.IsNullOrWhiteSpace(filter.DocumentType))
            query = query.Where(r => r.DocumentType == filter.DocumentType);

        if (filter.Status.HasValue)
            query = query.Where(r => r.Status == filter.Status.Value);

        if (filter.FromDate.HasValue)
            query = query.Where(r => r.CreatedAt >= filter.FromDate.Value);

        if (filter.ToDate.HasValue)
            query = query.Where(r => r.CreatedAt <= filter.ToDate.Value.AddDays(1));

        return query;
    }

    private static SigningRequestDto MapToDto(SigningRequest entity)
    {
        return new SigningRequestDto
        {
            Id = entity.Id,
            DocumentType = entity.DocumentType,
            DocumentId = entity.DocumentId,
            DocumentTitle = entity.DocumentTitle,
            DocumentContent = entity.DocumentContent,
            SubmittedById = entity.SubmittedById,
            SubmittedByName = entity.SubmittedByName,
            AssignedToId = entity.AssignedToId,
            AssignedToName = entity.AssignedToName,
            Status = entity.Status,
            StatusText = entity.Status switch
            {
                0 => "Cho duyet",
                1 => "Da duyet",
                2 => "Tu choi",
                3 => "Da huy",
                _ => "Khong xac dinh"
            },
            RejectReason = entity.RejectReason,
            SignedAt = entity.SignedAt,
            SignatureData = entity.SignatureData,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            DepartmentName = entity.DepartmentName,
            CreatedAt = entity.CreatedAt,
        };
    }
}
