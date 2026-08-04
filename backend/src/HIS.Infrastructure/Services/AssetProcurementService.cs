using HIS.Application.DTOs.Procurement;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Workflow de xuat - du tru - to trinh - duyet mua sam tai san / vat tu (#108)
/// Entity: AssetProcurementRequest / AssetProcurementRequestItem
/// Status: 0=DuThao, 1=ChoXetDuyet, 2=DaDuyet, 3=TuChoi, 4=HoanTat
/// </summary>
public class AssetProcurementService : IAssetProcurementService
{
    private readonly HISDbContext _db;

    public AssetProcurementService(HISDbContext db) => _db = db;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string GetRequestTypeName(int type) => type switch
    {
        1 => "Đề xuất",
        2 => "Dự trù",
        3 => "Mua sắm",
        4 => "Trang cấp", // NangCap26 XVII.3
        _ => $"Type {type}",
    };

    private static string GetStatusName(int status) => status switch
    {
        0 => "Dự thảo",
        1 => "Chờ xét duyệt",
        2 => "Đã duyệt",
        3 => "Từ chối",
        4 => "Hoàn tất",
        _ => $"Status {status}",
    };

    private static AssetProcurementRequestDto MapToDto(AssetProcurementRequest e) => new()
    {
        Id              = e.Id,
        RequestNo       = e.RequestNo,
        Title           = e.Title,
        RequestType     = e.RequestType,
        RequestTypeName = GetRequestTypeName(e.RequestType),
        DepartmentId    = e.DepartmentId,
        DepartmentName  = e.DepartmentName,
        RequesterId     = e.RequesterId,
        RequesterName   = e.RequesterName,
        Reason          = e.Reason,
        Status          = e.Status,
        StatusName      = GetStatusName(e.Status),
        TotalAmount     = e.TotalAmount,
        ApproverId      = e.ApproverId,
        ApproverName    = e.ApproverName,
        ApprovedAt      = e.ApprovedAt,
        Note            = e.Note,
        CreatedAt       = e.CreatedAt,
        CreatedBy       = e.CreatedBy,
        ItemCount       = e.Items.Count,
        Items           = e.Items.Select(i => new AssetProcurementItemDto
        {
            Id                        = i.Id,
            AssetProcurementRequestId = i.AssetProcurementRequestId,
            ItemName                  = i.ItemName,
            Unit                      = i.Unit,
            Quantity                  = i.Quantity,
            UnitPrice                 = i.UnitPrice,
            Amount                    = i.Amount,
            Specification             = i.Specification,
        }).ToList(),
    };

    private static string GenerateRequestNo(int requestType)
    {
        var prefix = requestType switch { 2 => "DT", 3 => "MS", _ => "DX" };
        return $"{prefix}-{DateTime.UtcNow:yyyy}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public async Task<AssetProcurementPagedResult> GetListAsync(AssetProcurementSearchDto filter)
    {
        var q = _db.AssetProcurementRequests
            .Include(r => r.Items)
            .Where(r => !r.IsDeleted);

        if (filter.Status.HasValue)
            q = q.Where(r => r.Status == filter.Status.Value);
        if (filter.RequestType.HasValue)
            q = q.Where(r => r.RequestType == filter.RequestType.Value);
        if (filter.DepartmentId.HasValue)
            q = q.Where(r => r.DepartmentId == filter.DepartmentId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim();
            q = q.Where(r => r.RequestNo.Contains(kw) || r.Title.Contains(kw)
                           || (r.RequesterName != null && r.RequesterName.Contains(kw))
                           || (r.DepartmentName != null && r.DepartmentName.Contains(kw)));
        }
        if (!string.IsNullOrWhiteSpace(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
            q = q.Where(r => r.CreatedAt >= from);
        if (!string.IsNullOrWhiteSpace(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
            q = q.Where(r => r.CreatedAt <= to.AddDays(1));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new AssetProcurementPagedResult
        {
            Items     = items.Select(MapToDto).ToList(),
            Total     = total,
            PageIndex = filter.PageIndex,
            PageSize  = filter.PageSize,
        };
    }

    public async Task<AssetProcurementRequestDto?> GetByIdAsync(Guid id)
    {
        var e = await _db.AssetProcurementRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        return e == null ? null : MapToDto(e);
    }

    public async Task<AssetProcurementRequestDto> SaveAsync(SaveAssetProcurementRequestDto dto, string? userId)
    {
        AssetProcurementRequest entity;

        if (dto.Id == null || dto.Id == Guid.Empty)
        {
            entity = new AssetProcurementRequest
            {
                RequestNo = GenerateRequestNo(dto.RequestType),
                Status    = 0, // DuThao
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };
            _db.AssetProcurementRequests.Add(entity);
        }
        else
        {
            entity = await _db.AssetProcurementRequests
                .Include(r => r.Items)
                .FirstAsync(r => r.Id == dto.Id.Value);

            if (entity.Status != 0)
                throw new InvalidOperationException("Chỉ có thể sửa phiếu ở trạng thái Dự thảo.");

            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;

            // Replace items
            _db.AssetProcurementRequestItems.RemoveRange(entity.Items);
            entity.Items.Clear();
        }

        entity.Title          = dto.Title;
        entity.RequestType    = dto.RequestType;
        entity.DepartmentId   = dto.DepartmentId;
        entity.DepartmentName = dto.DepartmentName;
        entity.RequesterName  = dto.RequesterName;
        entity.Reason         = dto.Reason;
        entity.Note           = dto.Note;

        foreach (var item in dto.Items)
        {
            var amount = item.Quantity * (item.UnitPrice ?? 0);
            entity.Items.Add(new AssetProcurementRequestItem
            {
                ItemName      = item.ItemName,
                Unit          = item.Unit,
                Quantity      = item.Quantity,
                UnitPrice     = item.UnitPrice,
                Amount        = amount > 0 ? amount : null,
                Specification = item.Specification,
                CreatedAt     = DateTime.UtcNow,
                CreatedBy     = userId,
            });
        }

        entity.TotalAmount = entity.Items.Sum(i => i.Amount ?? 0);
        if (entity.TotalAmount == 0) entity.TotalAmount = null;

        await _db.SaveChangesAsync();

        await _db.Entry(entity).Collection(e => e.Items).LoadAsync();
        return MapToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var e = await _db.AssetProcurementRequests.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        if (e == null) return false;
        if (e.Status != 0)
            throw new InvalidOperationException("Chỉ xóa được phiếu ở trạng thái Dự thảo.");
        e.IsDeleted = true;
        e.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Workflow actions ──────────────────────────────────────────────────────

    public async Task<AssetProcurementRequestDto> SubmitAsync(Guid id, string? userId)
    {
        var e = await _db.AssetProcurementRequests.Include(r => r.Items)
            .FirstAsync(r => r.Id == id && !r.IsDeleted);
        if (e.Status != 0)
            throw new InvalidOperationException("Chỉ trình duyệt phiếu ở trạng thái Dự thảo.");
        e.Status    = 1; // ChoXetDuyet
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return MapToDto(e);
    }

    public async Task<AssetProcurementRequestDto> ApproveAsync(ApproveRejectAssetProcurementDto dto, string? userId)
    {
        var e = await _db.AssetProcurementRequests.Include(r => r.Items)
            .FirstAsync(r => r.Id == dto.RequestId && !r.IsDeleted);
        if (e.Status != 1)
            throw new InvalidOperationException("Chỉ duyệt phiếu ở trạng thái Chờ xét duyệt.");
        // #156: role duyệt (Admin/Director/WarehouseManager) enforce ở controller [Authorize(Roles)] AssetProcurementController.Approve
        e.Status      = 2; // DaDuyet
        e.ApproverId  = userId != null && Guid.TryParse(userId, out var uid) ? uid : null;
        e.ApproverName = userId;
        e.ApprovedAt  = DateTime.UtcNow;
        e.Note        = dto.Note ?? e.Note;
        e.UpdatedAt   = DateTime.UtcNow;
        e.UpdatedBy   = userId;
        await _db.SaveChangesAsync();
        return MapToDto(e);
    }

    public async Task<AssetProcurementRequestDto> RejectAsync(ApproveRejectAssetProcurementDto dto, string? userId)
    {
        var e = await _db.AssetProcurementRequests.Include(r => r.Items)
            .FirstAsync(r => r.Id == dto.RequestId && !r.IsDeleted);
        if (e.Status != 1)
            throw new InvalidOperationException("Chỉ từ chối phiếu ở trạng thái Chờ xét duyệt.");
        e.Status    = 3; // TuChoi
        e.Note      = dto.Note;
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return MapToDto(e);
    }

    public async Task<AssetProcurementRequestDto> CompleteAsync(Guid id, string? userId)
    {
        var e = await _db.AssetProcurementRequests.Include(r => r.Items)
            .FirstAsync(r => r.Id == id && !r.IsDeleted);
        if (e.Status != 2)
            throw new InvalidOperationException("Chỉ hoàn tất phiếu ở trạng thái Đã duyệt.");
        e.Status    = 4; // HoanTat
        e.UpdatedAt = DateTime.UtcNow;
        e.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return MapToDto(e);
    }

    /// <summary>
    /// NangCap26 XVII.4 — cấp phát tài sản cho phiếu TRANG CẤP đã duyệt: sinh
    /// AssetHandover (điều chuyển về khoa yêu cầu) cho từng tài sản được chọn,
    /// đồng thời chốt phiếu sang Hoàn tất.
    /// </summary>
    public async Task<AssetProcurementRequestDto> IssueAssetsAsync(Guid id, List<Guid> fixedAssetIds, string? userId)
    {
        var e = await _db.AssetProcurementRequests.Include(r => r.Items)
            .FirstAsync(r => r.Id == id && !r.IsDeleted);

        if (e.RequestType != 4)
            throw new InvalidOperationException("Chỉ cấp phát được phiếu loại Trang cấp.");
        if (e.Status != 2)
            throw new InvalidOperationException("Chỉ cấp phát khi phiếu đã được duyệt.");
        if (fixedAssetIds == null || fixedAssetIds.Count == 0)
            throw new InvalidOperationException("Phải chọn ít nhất 1 tài sản để cấp phát.");
        if (e.DepartmentId == null)
            throw new InvalidOperationException("Phiếu chưa có khoa/phòng nhận — không xác định được nơi bàn giao.");

        var assets = await _db.FixedAssets
            .Where(a => fixedAssetIds.Contains(a.Id) && !a.IsDeleted)
            .ToListAsync();
        var missing = fixedAssetIds.Except(assets.Select(a => a.Id)).ToList();
        if (missing.Count > 0)
            throw new InvalidOperationException($"Không tìm thấy {missing.Count} tài sản được chọn.");

        var now = DateTime.Now;
        Guid.TryParse(userId, out var uid);

        foreach (var a in assets)
        {
            _db.AssetHandovers.Add(new AssetHandover
            {
                Id = Guid.NewGuid(),
                FixedAssetId = a.Id,
                HandoverType = 2, // Transfer — điều chuyển sang khoa nhận
                FromDepartmentId = a.DepartmentId,
                ToDepartmentId = e.DepartmentId,
                HandoverDate = now,
                HandoverById = userId,
                Notes = $"Trang cấp theo phiếu {e.RequestNo}",
                Status = 1, // Pending — chờ khoa nhận xác nhận
                CreatedAt = now,
                CreatedBy = userId
            });
        }

        e.Status = 4; // HoanTat
        e.IssuedAt = now;
        e.IssuedBy = uid == Guid.Empty ? null : uid;
        e.UpdatedAt = now;
        e.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return MapToDto(e);
    }
}
