using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Asset;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class AssetManagementService
{
    // ===== FIXED ASSETS =====

    public async Task<AssetPagedResult<FixedAssetDto>> GetAssetsAsync(AssetSearchDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted).AsQueryable();

        if (!string.IsNullOrEmpty(filter.Keyword))
        {
            var kw = filter.Keyword.ToLower();
            query = query.Where(a => a.AssetCode.ToLower().Contains(kw) || a.AssetName.ToLower().Contains(kw) || (a.SerialNumber != null && a.SerialNumber.ToLower().Contains(kw)));
        }
        if (filter.DepartmentId.HasValue) query = query.Where(a => a.DepartmentId == filter.DepartmentId.Value);
        if (filter.Status.HasValue) query = query.Where(a => a.Status == filter.Status.Value);
        if (!string.IsNullOrEmpty(filter.AssetGroupId)) query = query.Where(a => a.AssetGroupId == filter.AssetGroupId);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(a => new FixedAssetDto
            {
                Id = a.Id, AssetCode = a.AssetCode, AssetName = a.AssetName, AssetGroupId = a.AssetGroupId,
                OriginalValue = a.OriginalValue, CurrentValue = a.CurrentValue, PurchaseDate = a.PurchaseDate,
                DepreciationMethod = a.DepreciationMethod, UsefulLifeMonths = a.UsefulLifeMonths,
                MonthlyDepreciation = a.MonthlyDepreciation, AccumulatedDepreciation = a.AccumulatedDepreciation,
                DepartmentId = a.DepartmentId, LocationDescription = a.LocationDescription,
                Status = a.Status, QrCode = a.QrCode, SerialNumber = a.SerialNumber,
                TenderId = a.TenderId, Notes = a.Notes, CreatedAt = a.CreatedAt,
            })
            .ToListAsync();

        // Resolve dept names
        var deptIds = items.Where(i => i.DepartmentId.HasValue).Select(i => i.DepartmentId!.Value).Distinct().ToList();
        if (deptIds.Any())
        {
            var depts = await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName);
            foreach (var item in items)
            {
                if (item.DepartmentId.HasValue && depts.TryGetValue(item.DepartmentId.Value, out var name))
                    item.DepartmentName = name;
            }
        }

        return new AssetPagedResult<FixedAssetDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    public async Task<FixedAssetDto> SaveAssetAsync(SaveFixedAssetDto dto, string userId)
    {
        // Negative cost / useful life, unknown status codes and duplicate asset codes were all accepted.
        if (dto.OriginalValue < 0 || dto.CurrentValue < 0)
            throw new ArgumentException("Nguyên giá / giá trị còn lại không được âm.");
        if (dto.CurrentValue > dto.OriginalValue)
            throw new ArgumentException("Giá trị còn lại không được lớn hơn nguyên giá.");
        if (dto.UsefulLifeMonths < 0)
            throw new ArgumentException("Thời gian khấu hao không được âm.");
        if (dto.Status < 1 || dto.Status > 6)
            throw new ArgumentException("Trạng thái tài sản không hợp lệ (1-6).");
        if (dto.DepreciationMethod != 1 && dto.DepreciationMethod != 2)
            throw new ArgumentException("Phương pháp khấu hao không hợp lệ.");
        var isUpdate = dto.Id.HasValue && dto.Id.Value != Guid.Empty;
        var code = dto.AssetCode?.Trim() ?? string.Empty;
        if (await _context.FixedAssets.AnyAsync(a => !a.IsDeleted && a.AssetCode == code && (!isUpdate || a.Id != dto.Id!.Value)))
            throw new InvalidOperationException($"Mã tài sản {code} đã tồn tại.");

        FixedAsset entity;
        if (isUpdate)
        {
            entity = await _context.FixedAssets.FirstOrDefaultAsync(a => a.Id == dto.Id!.Value && !a.IsDeleted) ?? throw new KeyNotFoundException("Asset not found");
            // Disposed (5) is reached only through the disposal workflow and is final.
            if (entity.Status == 5 && dto.Status != 5)
                throw new InvalidOperationException("Tài sản đã thanh lý, không thể đổi trạng thái.");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new FixedAsset { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _context.FixedAssets.Add(entity);
        }
        if (dto.Status == 5 && entity.Status != 5)
            throw new InvalidOperationException("Trạng thái Đã thanh lý chỉ được ghi qua phiếu thanh lý.");

        entity.AssetCode = code;
        entity.AssetName = dto.AssetName;
        entity.AssetGroupId = dto.AssetGroupId;
        entity.OriginalValue = dto.OriginalValue;
        // Blank/0 means "same as original" only for a NEW asset: editing a fully depreciated asset
        // (CurrentValue 0) used to reset its residual value back to the original cost.
        entity.CurrentValue = dto.CurrentValue > 0 ? dto.CurrentValue : (isUpdate ? entity.CurrentValue : dto.OriginalValue);
        entity.PurchaseDate = dto.PurchaseDate;
        entity.DepreciationMethod = dto.DepreciationMethod;
        entity.UsefulLifeMonths = dto.UsefulLifeMonths;
        entity.DepartmentId = dto.DepartmentId;
        entity.LocationDescription = dto.LocationDescription;
        entity.Status = dto.Status;
        entity.SerialNumber = dto.SerialNumber;
        entity.TenderId = dto.TenderId;
        entity.Notes = dto.Notes;

        // Calculate monthly depreciation
        if (entity.UsefulLifeMonths > 0)
        {
            if (entity.DepreciationMethod == 1) // Straight line
                entity.MonthlyDepreciation = entity.OriginalValue / entity.UsefulLifeMonths;
            else // Declining balance
                entity.MonthlyDepreciation = (entity.CurrentValue * 2) / entity.UsefulLifeMonths;
            entity.MonthlyDepreciation = Math.Round(entity.MonthlyDepreciation, 0, MidpointRounding.AwayFromZero);
        }

        await _context.SaveChangesAsync();

        return new FixedAssetDto
        {
            Id = entity.Id, AssetCode = entity.AssetCode, AssetName = entity.AssetName, AssetGroupId = entity.AssetGroupId,
            OriginalValue = entity.OriginalValue, CurrentValue = entity.CurrentValue, PurchaseDate = entity.PurchaseDate,
            DepreciationMethod = entity.DepreciationMethod, UsefulLifeMonths = entity.UsefulLifeMonths,
            MonthlyDepreciation = entity.MonthlyDepreciation, AccumulatedDepreciation = entity.AccumulatedDepreciation,
            DepartmentId = entity.DepartmentId, LocationDescription = entity.LocationDescription,
            Status = entity.Status, QrCode = entity.QrCode, SerialNumber = entity.SerialNumber,
            TenderId = entity.TenderId, Notes = entity.Notes, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<FixedAssetDto?> GetAssetByIdAsync(Guid id)
    {
        return await _context.FixedAssets.Where(a => a.Id == id && !a.IsDeleted)
            .Select(a => new FixedAssetDto
            {
                Id = a.Id, AssetCode = a.AssetCode, AssetName = a.AssetName, AssetGroupId = a.AssetGroupId,
                OriginalValue = a.OriginalValue, CurrentValue = a.CurrentValue, PurchaseDate = a.PurchaseDate,
                DepreciationMethod = a.DepreciationMethod, UsefulLifeMonths = a.UsefulLifeMonths,
                MonthlyDepreciation = a.MonthlyDepreciation, AccumulatedDepreciation = a.AccumulatedDepreciation,
                DepartmentId = a.DepartmentId, LocationDescription = a.LocationDescription,
                Status = a.Status, QrCode = a.QrCode, SerialNumber = a.SerialNumber,
                TenderId = a.TenderId, Notes = a.Notes, CreatedAt = a.CreatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<string> GenerateQrCodeAsync(Guid assetId)
    {
        var asset = await _context.FixedAssets.FindAsync(assetId) ?? throw new KeyNotFoundException("Asset not found");

        // Generate QR code content as base64 (simple text-based for now)
        var qrContent = $"ASSET:{asset.AssetCode}|{asset.AssetName}|SN:{asset.SerialNumber}|DEPT:{asset.DepartmentId}";
        var qrBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(qrContent));

        asset.QrCode = qrBase64;
        asset.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return qrBase64;
    }

    public async Task<List<AssetHistoryDto>> GetAssetHistoryAsync(Guid assetId)
    {
        var history = new List<AssetHistoryDto>();

        // Handovers
        var handovers = await _context.AssetHandovers.Where(h => h.FixedAssetId == assetId && !h.IsDeleted)
            .OrderByDescending(h => h.HandoverDate)
            .Select(h => new AssetHistoryDto
            {
                EventType = "Handover",
                EventDate = h.HandoverDate,
                Description = h.HandoverType == 1 ? "Tiep nhan" : h.HandoverType == 2 ? "Dieu chuyen" : h.HandoverType == 3 ? "Muon" : "Tra",
                PerformedBy = h.HandoverById,
            }).ToListAsync();
        history.AddRange(handovers);

        // Disposals
        var disposals = await _context.AssetDisposals.Where(d => d.FixedAssetId == assetId && !d.IsDeleted)
            .OrderByDescending(d => d.ProposalDate)
            .Select(d => new AssetHistoryDto
            {
                EventType = "Disposal",
                EventDate = d.ProposalDate,
                Description = d.DisposalType == 1 ? "Thanh ly" : d.DisposalType == 2 ? "Dau gia" : "Xoa so",
                PerformedBy = d.CreatedBy,
            }).ToListAsync();
        history.AddRange(disposals);

        // Depreciation (last 12)
        var depreciations = await _context.AssetDepreciations.Where(d => d.FixedAssetId == assetId && !d.IsDeleted)
            .OrderByDescending(d => d.Year).ThenByDescending(d => d.Month)
            .Take(12)
            .Select(d => new AssetHistoryDto
            {
                EventType = "Depreciation",
                EventDate = d.CalculatedAt,
                Description = $"KH thang {d.Month}/{d.Year}: {d.DepreciationAmount:N0} VND",
            }).ToListAsync();
        history.AddRange(depreciations);

        return history.OrderByDescending(h => h.EventDate).ToList();
    }

    // ===== HANDOVER =====

    public async Task<AssetPagedResult<AssetHandoverDto>> GetHandoversAsync(AssetHandoverSearchDto filter)
    {
        var query = _context.AssetHandovers.Where(h => !h.IsDeleted).AsQueryable();

        if (filter.FixedAssetId.HasValue) query = query.Where(h => h.FixedAssetId == filter.FixedAssetId.Value);
        if (filter.DepartmentId.HasValue) query = query.Where(h => h.FromDepartmentId == filter.DepartmentId.Value || h.ToDepartmentId == filter.DepartmentId.Value);
        if (filter.Status.HasValue) query = query.Where(h => h.Status == filter.Status.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(h => h.HandoverDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Include(h => h.FixedAsset)
            .Select(h => new AssetHandoverDto
            {
                Id = h.Id, FixedAssetId = h.FixedAssetId,
                AssetCode = h.FixedAsset != null ? h.FixedAsset.AssetCode : null,
                AssetName = h.FixedAsset != null ? h.FixedAsset.AssetName : null,
                HandoverType = h.HandoverType,
                FromDepartmentId = h.FromDepartmentId, ToDepartmentId = h.ToDepartmentId,
                HandoverDate = h.HandoverDate, HandoverById = h.HandoverById, ReceivedById = h.ReceivedById,
                Notes = h.Notes, Status = h.Status, CreatedAt = h.CreatedAt,
            })
            .ToListAsync();

        // Resolve dept names
        var allDeptIds = items.Select(i => i.FromDepartmentId).Concat(items.Select(i => i.ToDepartmentId)).Where(d => d.HasValue).Select(d => d!.Value).Distinct().ToList();
        if (allDeptIds.Any())
        {
            var depts = await _context.Departments.Where(d => allDeptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName);
            foreach (var item in items)
            {
                if (item.FromDepartmentId.HasValue && depts.TryGetValue(item.FromDepartmentId.Value, out var fromName))
                    item.FromDepartmentName = fromName;
                if (item.ToDepartmentId.HasValue && depts.TryGetValue(item.ToDepartmentId.Value, out var toName))
                    item.ToDepartmentName = toName;
            }
        }

        return new AssetPagedResult<AssetHandoverDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    public async Task<AssetHandoverDto> SaveHandoverAsync(SaveHandoverDto dto, string userId)
    {
        // Unknown asset → FK violation 500; a disposed / pending-disposal asset could be handed over and
        // its confirmation flipped it back to InUse.
        var asset = await _context.FixedAssets.FirstOrDefaultAsync(a => a.Id == dto.FixedAssetId && !a.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy tài sản");
        if (asset.Status == 4 || asset.Status == 5)
            throw new InvalidOperationException("Tài sản đang chờ thanh lý hoặc đã thanh lý, không thể bàn giao.");
        if (dto.HandoverType < 1 || dto.HandoverType > 4)
            throw new ArgumentException("Loại bàn giao không hợp lệ (1-4).");

        AssetHandover entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.AssetHandovers.FindAsync(dto.Id.Value) ?? throw new KeyNotFoundException("Handover not found");
            if (entity.Status == 2)
                throw new InvalidOperationException("Phiếu bàn giao đã xác nhận, không thể sửa.");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new AssetHandover { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _context.AssetHandovers.Add(entity);
        }

        entity.FixedAssetId = dto.FixedAssetId;
        entity.HandoverType = dto.HandoverType;
        entity.FromDepartmentId = dto.FromDepartmentId;
        entity.ToDepartmentId = dto.ToDepartmentId;
        // v2 form may omit the date → it was stored as 0001-01-01.
        entity.HandoverDate = dto.HandoverDate == default ? DateTime.Now : dto.HandoverDate;
        entity.HandoverById = dto.HandoverById ?? userId;
        entity.ReceivedById = dto.ReceivedById;
        entity.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return new AssetHandoverDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId, HandoverType = entity.HandoverType,
            FromDepartmentId = entity.FromDepartmentId, ToDepartmentId = entity.ToDepartmentId,
            HandoverDate = entity.HandoverDate, HandoverById = entity.HandoverById, ReceivedById = entity.ReceivedById,
            Notes = entity.Notes, Status = entity.Status, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<AssetHandoverDto> ConfirmHandoverAsync(Guid handoverId, string userId)
    {
        var entity = await _context.AssetHandovers.Include(h => h.FixedAsset).FirstOrDefaultAsync(h => h.Id == handoverId)
            ?? throw new KeyNotFoundException("Handover not found");

        if (entity.Status != 1)
            throw new InvalidOperationException("Phiếu bàn giao đã được xác nhận.");
        if (entity.FixedAsset != null && (entity.FixedAsset.Status == 4 || entity.FixedAsset.Status == 5))
            throw new InvalidOperationException("Tài sản đang chờ thanh lý hoặc đã thanh lý, không thể xác nhận bàn giao.");

        entity.Status = 2; // Confirmed
        entity.ReceivedById = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        // Update asset department if Transfer type
        if (entity.HandoverType == 2 && entity.FixedAsset != null && entity.ToDepartmentId.HasValue)
        {
            entity.FixedAsset.DepartmentId = entity.ToDepartmentId;
            // Only a "Transferred" (6) asset becomes InUse again; Broken/UnderRepair must keep their status.
            if (entity.FixedAsset.Status == 6)
                entity.FixedAsset.Status = 1; // InUse
            entity.FixedAsset.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new AssetHandoverDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId, HandoverType = entity.HandoverType,
            FromDepartmentId = entity.FromDepartmentId, ToDepartmentId = entity.ToDepartmentId,
            HandoverDate = entity.HandoverDate, HandoverById = entity.HandoverById, ReceivedById = entity.ReceivedById,
            Notes = entity.Notes, Status = entity.Status, CreatedAt = entity.CreatedAt,
        };
    }
}
