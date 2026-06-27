using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

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

        var results = await query.OrderByDescending(r => r.CreatedAt).ToBoundedListAsync("SigningWorkflow.GetPendingRequests");
        return results.Select(MapToDto).ToList();
    }

    public async Task<List<SigningRequestDto>> GetSubmittedRequestsAsync(Guid submittedById, SigningRequestSearchDto? filter = null)
    {
        var query = _context.SigningRequests
            .Where(r => r.SubmittedById == submittedById)
            .AsQueryable();

        query = ApplyFilter(query, filter);

        var results = await query.OrderByDescending(r => r.CreatedAt).ToBoundedListAsync("SigningWorkflow.GetSubmittedRequests");
        return results.Select(MapToDto).ToList();
    }

    public async Task<List<SigningRequestDto>> GetHistoryAsync(Guid userId, SigningRequestSearchDto? filter = null)
    {
        // Status 4 = WaitingTurn (chưa tới lượt trong chuỗi ký) — không phải lịch sử đã xử lý
        var query = _context.SigningRequests
            .Where(r => (r.AssignedToId == userId || r.SubmittedById == userId) && r.Status != 0 && r.Status != 4)
            .AsQueryable();

        query = ApplyFilter(query, filter);

        var results = await query.OrderByDescending(r => r.SignedAt ?? r.UpdatedAt ?? r.CreatedAt).ToBoundedListAsync("SigningWorkflow.GetHistory");
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
            SignerRole = dto.SignerRole,
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

        // Chuỗi ký nhiều cấp: kích hoạt cấp kế tiếp (WaitingTurn 4 → Pending 0)
        if (entity.ChainId != null)
        {
            var next = await _context.SigningRequests
                .FirstOrDefaultAsync(r => r.ChainId == entity.ChainId
                    && r.StepOrder == entity.StepOrder + 1 && r.Status == 4);
            if (next != null) next.Status = 0;
        }

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

        // Chuỗi ký nhiều cấp: từ chối 1 cấp → các cấp đang chờ lượt phía sau bị hủy
        if (entity.ChainId != null)
        {
            var waiting = await _context.SigningRequests
                .Where(r => r.ChainId == entity.ChainId && r.Status == 4)
                .ToListAsync();
            foreach (var w in waiting)
            {
                w.Status = 3;
                w.UpdatedBy = userId.ToString();
            }
        }

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

    // ===== Trình ký nhiều cấp (plan-emr-signing-chain, 2026-06-12) =====

    public async Task<DocumentChainDto> SubmitChainAsync(SubmitSigningChainDto dto, Guid submittedById, string submittedByName)
    {
        if (dto.Steps == null || dto.Steps.Count == 0)
            throw new InvalidOperationException("Chuoi ky phai co it nhat 1 cap");
        if (dto.Steps.Any(s => s.AssignedToId == Guid.Empty))
            throw new InvalidOperationException("Moi cap ky phai chon nguoi ky");

        // Chặn trình trùng: tài liệu còn yêu cầu đang mở (chờ ký 0 / chờ lượt 4)
        var hasActive = await _context.SigningRequests.AnyAsync(r =>
            r.DocumentType == dto.DocumentType && r.DocumentId == dto.DocumentId
            && (r.Status == 0 || r.Status == 4));
        if (hasActive)
            throw new InvalidOperationException("Tai lieu nay dang co yeu cau trinh ky chua xu ly xong — huy yeu cau cu truoc khi trinh lai");

        var chainId = Guid.NewGuid();
        var total = dto.Steps.Count;
        for (var i = 0; i < total; i++)
        {
            var s = dto.Steps[i];
            _context.SigningRequests.Add(new SigningRequest
            {
                DocumentType = dto.DocumentType,
                DocumentId = dto.DocumentId,
                DocumentTitle = dto.DocumentTitle,
                DocumentContent = dto.DocumentContent ?? string.Empty,
                SubmittedById = submittedById,
                SubmittedByName = submittedByName,
                AssignedToId = s.AssignedToId,
                AssignedToName = s.AssignedToName,
                SignerRole = s.SignerRole,
                Status = i == 0 ? 0 : 4, // chỉ cấp 1 vào "Chờ tôi ký"; cấp sau chờ lượt
                PatientId = dto.PatientId,
                PatientName = dto.PatientName,
                DepartmentName = dto.DepartmentName,
                ChainId = chainId,
                StepOrder = i + 1,
                TotalSteps = total,
                MedicalRecordId = dto.MedicalRecordId,
                CreatedBy = submittedById.ToString(),
            });
        }
        await _context.SaveChangesAsync();
        return (await BuildChainDtoAsync(chainId))!;
    }

    public async Task<DocumentChainDto?> GetDocumentChainAsync(string documentType, Guid documentId)
    {
        var latestChainId = await _context.SigningRequests
            .Where(r => r.DocumentType == documentType && r.DocumentId == documentId && r.ChainId != null)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => r.ChainId)
            .FirstOrDefaultAsync();
        return latestChainId == null ? null : await BuildChainDtoAsync(latestChainId.Value);
    }

    public async Task<List<ChainTemplateStepDto>> GetChainTemplateAsync(string documentType)
    {
        var ops = await _context.Set<EmrSigningOperation>().AsNoTracking()
            .Where(o => o.DocumentType == documentType && o.IsActive && !o.IsDeleted)
            .OrderBy(o => o.SortOrder)
            .ToListAsync();
        if (ops.Count == 0) return new List<ChainTemplateStepDto>();

        var roleIds = ops.Where(o => o.RoleId.HasValue).Select(o => o.RoleId!.Value).Distinct().ToList();
        var roleCodes = await _context.Set<EmrSigningRole>().AsNoTracking()
            .Where(r => roleIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.Code);

        return ops.Select(o => new ChainTemplateStepDto
        {
            RoleCode = o.RoleId.HasValue && roleCodes.TryGetValue(o.RoleId.Value, out var code) ? code : null,
            RoleName = o.RoleName,
            OperationName = o.Name,
            IsRequired = o.IsRequired,
            SortOrder = o.SortOrder,
        }).ToList();
    }

    public async Task CancelChainAsync(Guid chainId, Guid userId)
    {
        var steps = await _context.SigningRequests.Where(r => r.ChainId == chainId).ToListAsync();
        if (steps.Count == 0)
            throw new InvalidOperationException("Chuoi trinh ky khong ton tai");
        if (steps[0].SubmittedById != userId)
            throw new InvalidOperationException("Ban khong co quyen huy chuoi trinh ky nay");

        var open = steps.Where(s => s.Status == 0 || s.Status == 4).ToList();
        if (open.Count == 0)
            throw new InvalidOperationException("Chuoi trinh ky da ket thuc — khong the huy");

        foreach (var s in open)
        {
            s.Status = 3;
            s.UpdatedBy = userId.ToString();
        }
        await _context.SaveChangesAsync();
    }

    private async Task<DocumentChainDto?> BuildChainDtoAsync(Guid chainId)
    {
        var steps = await _context.SigningRequests.AsNoTracking()
            .Where(r => r.ChainId == chainId)
            .OrderBy(r => r.StepOrder)
            .ToListAsync();
        if (steps.Count == 0) return null;

        string chainStatus;
        int? currentStep = null;
        if (steps.Any(s => s.Status == 2)) chainStatus = "Rejected";
        else if (steps.All(s => s.Status == 1)) chainStatus = "Completed";
        else if (steps.Any(s => s.Status == 3) && !steps.Any(s => s.Status == 0 || s.Status == 4)) chainStatus = "Cancelled";
        else
        {
            chainStatus = steps.Any(s => s.Status == 1) ? "InProgress" : "Pending";
            currentStep = steps.FirstOrDefault(s => s.Status == 0)?.StepOrder;
        }

        var first = steps[0];
        return new DocumentChainDto
        {
            ChainId = chainId,
            DocumentType = first.DocumentType,
            DocumentId = first.DocumentId,
            DocumentTitle = first.DocumentTitle,
            SubmittedById = first.SubmittedById,
            SubmittedByName = first.SubmittedByName,
            CreatedAt = first.CreatedAt,
            ChainStatus = chainStatus,
            CurrentStep = currentStep,
            TotalSteps = first.TotalSteps,
            Steps = steps.Select(MapToDto).ToList(),
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

        if (!string.IsNullOrWhiteSpace(filter.SignerRole))
            query = query.Where(r => r.SignerRole == filter.SignerRole);

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
                4 => "Cho toi luot",
                _ => "Khong xac dinh"
            },
            RejectReason = entity.RejectReason,
            SignedAt = entity.SignedAt,
            SignatureData = entity.SignatureData,
            PatientId = entity.PatientId,
            PatientName = entity.PatientName,
            DepartmentName = entity.DepartmentName,
            SignerRole = entity.SignerRole,
            CreatedAt = entity.CreatedAt,
            ChainId = entity.ChainId,
            StepOrder = entity.StepOrder,
            TotalSteps = entity.TotalSteps,
            MedicalRecordId = entity.MedicalRecordId,
        };
    }
}
