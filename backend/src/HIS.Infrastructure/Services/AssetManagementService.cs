using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Asset;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class AssetManagementService : IAssetManagementService
{
    private readonly HISDbContext _context;

    public AssetManagementService(HISDbContext context)
    {
        _context = context;
    }

    // ===== TENDERS =====

    public async Task<AssetPagedResult<TenderDto>> GetTendersAsync(TenderSearchDto filter)
    {
        var query = _context.Tenders.Where(t => !t.IsDeleted).AsQueryable();

        if (!string.IsNullOrEmpty(filter.Keyword))
        {
            var kw = filter.Keyword.ToLower();
            query = query.Where(t => t.TenderCode.ToLower().Contains(kw) || t.TenderName.ToLower().Contains(kw));
        }
        if (filter.Status.HasValue) query = query.Where(t => t.Status == filter.Status.Value);
        if (filter.TenderType.HasValue) query = query.Where(t => t.TenderType == filter.TenderType.Value);
        if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
            query = query.Where(t => t.CreatedAt >= from);
        if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
            query = query.Where(t => t.CreatedAt <= to.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(t => new TenderDto
            {
                Id = t.Id,
                TenderCode = t.TenderCode,
                TenderName = t.TenderName,
                TenderType = t.TenderType,
                PublishDate = t.PublishDate,
                ClosingDate = t.ClosingDate,
                BudgetAmount = t.BudgetAmount,
                Status = t.Status,
                WinnerSupplierId = t.WinnerSupplierId,
                ContractNumber = t.ContractNumber,
                Notes = t.Notes,
                ItemCount = t.Items.Count(i => !i.IsDeleted),
                TotalItemValue = t.Items.Where(i => !i.IsDeleted).Sum(i => i.UnitPrice * i.Quantity),
                CreatedAt = t.CreatedAt,
            })
            .ToListAsync();

        // Resolve supplier names
        var supplierIds = items.Where(i => i.WinnerSupplierId.HasValue).Select(i => i.WinnerSupplierId!.Value).Distinct().ToList();
        if (supplierIds.Any())
        {
            var suppliers = await _context.Suppliers.Where(s => supplierIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.SupplierName);
            foreach (var item in items)
            {
                if (item.WinnerSupplierId.HasValue && suppliers.TryGetValue(item.WinnerSupplierId.Value, out var name))
                    item.WinnerSupplierName = name;
            }
        }

        return new AssetPagedResult<TenderDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    public async Task<TenderDto> SaveTenderAsync(SaveTenderDto dto, string userId)
    {
        Tender entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.Tenders.FindAsync(dto.Id.Value) ?? throw new Exception("Tender not found");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new Tender { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _context.Tenders.Add(entity);
        }

        entity.TenderCode = dto.TenderCode;
        entity.TenderName = dto.TenderName;
        entity.TenderType = dto.TenderType;
        entity.PublishDate = dto.PublishDate;
        entity.ClosingDate = dto.ClosingDate;
        entity.BudgetAmount = dto.BudgetAmount;
        entity.Status = dto.Status;
        entity.ContractNumber = dto.ContractNumber;
        entity.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return new TenderDto
        {
            Id = entity.Id, TenderCode = entity.TenderCode, TenderName = entity.TenderName,
            TenderType = entity.TenderType, PublishDate = entity.PublishDate, ClosingDate = entity.ClosingDate,
            BudgetAmount = entity.BudgetAmount, Status = entity.Status, ContractNumber = entity.ContractNumber,
            Notes = entity.Notes, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<TenderDto?> GetTenderByIdAsync(Guid id)
    {
        return await _context.Tenders.Where(t => t.Id == id && !t.IsDeleted)
            .Select(t => new TenderDto
            {
                Id = t.Id, TenderCode = t.TenderCode, TenderName = t.TenderName,
                TenderType = t.TenderType, PublishDate = t.PublishDate, ClosingDate = t.ClosingDate,
                BudgetAmount = t.BudgetAmount, Status = t.Status, WinnerSupplierId = t.WinnerSupplierId,
                ContractNumber = t.ContractNumber, Notes = t.Notes,
                ItemCount = t.Items.Count(i => !i.IsDeleted),
                TotalItemValue = t.Items.Where(i => !i.IsDeleted).Sum(i => i.UnitPrice * i.Quantity),
                CreatedAt = t.CreatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<TenderItemDto>> GetTenderItemsAsync(Guid tenderId)
    {
        var items = await _context.TenderItems.Where(i => i.TenderId == tenderId && !i.IsDeleted)
            .OrderBy(i => i.CreatedAt)
            .Select(i => new TenderItemDto
            {
                Id = i.Id, TenderId = i.TenderId, ItemName = i.ItemName, ItemType = i.ItemType,
                Quantity = i.Quantity, UnitPrice = i.UnitPrice, Specification = i.Specification, SupplierId = i.SupplierId,
            })
            .ToListAsync();

        var supplierIds = items.Where(i => i.SupplierId.HasValue).Select(i => i.SupplierId!.Value).Distinct().ToList();
        if (supplierIds.Any())
        {
            var suppliers = await _context.Suppliers.Where(s => supplierIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.SupplierName);
            foreach (var item in items)
            {
                if (item.SupplierId.HasValue && suppliers.TryGetValue(item.SupplierId.Value, out var name))
                    item.SupplierName = name;
            }
        }

        return items;
    }

    public async Task<TenderItemDto> SaveTenderItemAsync(SaveTenderItemDto dto, string userId)
    {
        TenderItem entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.TenderItems.FindAsync(dto.Id.Value) ?? throw new Exception("TenderItem not found");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new TenderItem { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _context.TenderItems.Add(entity);
        }

        entity.TenderId = dto.TenderId;
        entity.ItemName = dto.ItemName;
        entity.ItemType = dto.ItemType;
        entity.Quantity = dto.Quantity;
        entity.UnitPrice = dto.UnitPrice;
        entity.Specification = dto.Specification;
        entity.SupplierId = dto.SupplierId;

        await _context.SaveChangesAsync();

        return new TenderItemDto
        {
            Id = entity.Id, TenderId = entity.TenderId, ItemName = entity.ItemName, ItemType = entity.ItemType,
            Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Specification = entity.Specification, SupplierId = entity.SupplierId,
        };
    }

    public async Task<TenderDto> AwardTenderAsync(AwardTenderDto dto, string userId)
    {
        var entity = await _context.Tenders.FindAsync(dto.TenderId) ?? throw new Exception("Tender not found");
        entity.Status = 4; // Awarded
        entity.WinnerSupplierId = dto.WinnerSupplierId;
        entity.ContractNumber = dto.ContractNumber;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _context.SaveChangesAsync();

        return (await GetTenderByIdAsync(entity.Id))!;
    }

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
        FixedAsset entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.FixedAssets.FindAsync(dto.Id.Value) ?? throw new Exception("Asset not found");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new FixedAsset { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _context.FixedAssets.Add(entity);
        }

        entity.AssetCode = dto.AssetCode;
        entity.AssetName = dto.AssetName;
        entity.AssetGroupId = dto.AssetGroupId;
        entity.OriginalValue = dto.OriginalValue;
        entity.CurrentValue = dto.CurrentValue > 0 ? dto.CurrentValue : dto.OriginalValue;
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
        var asset = await _context.FixedAssets.FindAsync(assetId) ?? throw new Exception("Asset not found");

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
        AssetHandover entity;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            entity = await _context.AssetHandovers.FindAsync(dto.Id.Value) ?? throw new Exception("Handover not found");
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
        entity.HandoverDate = dto.HandoverDate;
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
            ?? throw new Exception("Handover not found");

        entity.Status = 2; // Confirmed
        entity.ReceivedById = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        // Update asset department if Transfer type
        if (entity.HandoverType == 2 && entity.FixedAsset != null && entity.ToDepartmentId.HasValue)
        {
            entity.FixedAsset.DepartmentId = entity.ToDepartmentId;
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

    // ===== DISPOSAL =====

    public async Task<AssetPagedResult<AssetDisposalDto>> GetDisposalsAsync(DisposalSearchDto filter)
    {
        var query = _context.AssetDisposals.Where(d => !d.IsDeleted).AsQueryable();

        if (filter.Status.HasValue) query = query.Where(d => d.Status == filter.Status.Value);
        if (filter.DisposalType.HasValue) query = query.Where(d => d.DisposalType == filter.DisposalType.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.ProposalDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Include(d => d.FixedAsset)
            .Select(d => new AssetDisposalDto
            {
                Id = d.Id, FixedAssetId = d.FixedAssetId,
                AssetCode = d.FixedAsset != null ? d.FixedAsset.AssetCode : null,
                AssetName = d.FixedAsset != null ? d.FixedAsset.AssetName : null,
                OriginalValue = d.FixedAsset != null ? d.FixedAsset.OriginalValue : 0,
                DisposalType = d.DisposalType, ProposalDate = d.ProposalDate,
                ApprovalDate = d.ApprovalDate, DisposalDate = d.DisposalDate,
                ApprovedById = d.ApprovedById, DisposalValue = d.DisposalValue,
                ResidualValue = d.ResidualValue, Reason = d.Reason, Status = d.Status, CreatedAt = d.CreatedAt,
            })
            .ToListAsync();

        return new AssetPagedResult<AssetDisposalDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    public async Task<AssetDisposalDto> ProposeDisposalAsync(ProposeDisposalDto dto, string userId)
    {
        var asset = await _context.FixedAssets.FindAsync(dto.FixedAssetId) ?? throw new Exception("Asset not found");

        var entity = new AssetDisposal
        {
            Id = Guid.NewGuid(),
            FixedAssetId = dto.FixedAssetId,
            DisposalType = dto.DisposalType,
            ProposalDate = DateTime.UtcNow,
            DisposalValue = dto.DisposalValue,
            ResidualValue = dto.ResidualValue,
            Reason = dto.Reason,
            Status = 1, // Proposed
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };

        asset.Status = 4; // PendingDisposal
        asset.UpdatedAt = DateTime.UtcNow;

        _context.AssetDisposals.Add(entity);
        await _context.SaveChangesAsync();

        return new AssetDisposalDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId, AssetCode = asset.AssetCode, AssetName = asset.AssetName,
            OriginalValue = asset.OriginalValue, DisposalType = entity.DisposalType, ProposalDate = entity.ProposalDate,
            DisposalValue = entity.DisposalValue, ResidualValue = entity.ResidualValue,
            Reason = entity.Reason, Status = entity.Status, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<AssetDisposalDto> ApproveDisposalAsync(Guid disposalId, string userId)
    {
        var entity = await _context.AssetDisposals.Include(d => d.FixedAsset).FirstOrDefaultAsync(d => d.Id == disposalId)
            ?? throw new Exception("Disposal not found");

        entity.Status = 2; // Approved
        entity.ApprovalDate = DateTime.UtcNow;
        entity.ApprovedById = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return new AssetDisposalDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId,
            AssetCode = entity.FixedAsset?.AssetCode, AssetName = entity.FixedAsset?.AssetName,
            OriginalValue = entity.FixedAsset?.OriginalValue ?? 0,
            DisposalType = entity.DisposalType, ProposalDate = entity.ProposalDate,
            ApprovalDate = entity.ApprovalDate, ApprovedById = entity.ApprovedById,
            DisposalValue = entity.DisposalValue, ResidualValue = entity.ResidualValue,
            Reason = entity.Reason, Status = entity.Status, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<AssetDisposalDto> CompleteDisposalAsync(Guid disposalId, string userId)
    {
        var entity = await _context.AssetDisposals.Include(d => d.FixedAsset).FirstOrDefaultAsync(d => d.Id == disposalId)
            ?? throw new Exception("Disposal not found");

        entity.Status = 3; // Completed
        entity.DisposalDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        if (entity.FixedAsset != null)
        {
            entity.FixedAsset.Status = 5; // Disposed
            entity.FixedAsset.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new AssetDisposalDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId,
            AssetCode = entity.FixedAsset?.AssetCode, AssetName = entity.FixedAsset?.AssetName,
            OriginalValue = entity.FixedAsset?.OriginalValue ?? 0,
            DisposalType = entity.DisposalType, ProposalDate = entity.ProposalDate,
            ApprovalDate = entity.ApprovalDate, DisposalDate = entity.DisposalDate,
            ApprovedById = entity.ApprovedById, DisposalValue = entity.DisposalValue,
            ResidualValue = entity.ResidualValue, Reason = entity.Reason, Status = entity.Status,
            CreatedAt = entity.CreatedAt,
        };
    }

    // ===== DEPRECIATION =====

    public async Task<int> CalculateMonthlyDepreciationAsync(int month, int year, string userId)
    {
        // Get all active assets that need depreciation
        var assets = await _context.FixedAssets
            .Where(a => !a.IsDeleted && a.Status == 1 && a.UsefulLifeMonths > 0 && a.CurrentValue > 0)
            .ToListAsync();

        var count = 0;
        foreach (var asset in assets)
        {
            // Check if already calculated for this month
            var exists = await _context.AssetDepreciations
                .AnyAsync(d => d.FixedAssetId == asset.Id && d.Month == month && d.Year == year && !d.IsDeleted);
            if (exists) continue;

            decimal depAmount;
            if (asset.DepreciationMethod == 1) // Straight line
                depAmount = asset.OriginalValue / asset.UsefulLifeMonths;
            else // Declining balance
                depAmount = (asset.CurrentValue * 2) / asset.UsefulLifeMonths;

            // Cap at current value
            depAmount = Math.Min(depAmount, asset.CurrentValue);
            if (depAmount <= 0) continue;

            var depreciation = new AssetDepreciation
            {
                Id = Guid.NewGuid(),
                FixedAssetId = asset.Id,
                Month = month,
                Year = year,
                OpeningValue = asset.CurrentValue,
                DepreciationAmount = depAmount,
                ClosingValue = asset.CurrentValue - depAmount,
                CalculatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };

            asset.CurrentValue -= depAmount;
            asset.AccumulatedDepreciation += depAmount;
            asset.MonthlyDepreciation = depAmount;
            asset.UpdatedAt = DateTime.UtcNow;

            _context.AssetDepreciations.Add(depreciation);
            count++;
        }

        if (count > 0)
            await _context.SaveChangesAsync();

        return count;
    }

    public async Task<AssetPagedResult<DepreciationReportDto>> GetDepreciationReportAsync(DepreciationFilterDto filter)
    {
        var query = _context.AssetDepreciations.Where(d => !d.IsDeleted).AsQueryable();

        if (filter.Month.HasValue) query = query.Where(d => d.Month == filter.Month.Value);
        if (filter.Year.HasValue) query = query.Where(d => d.Year == filter.Year.Value);
        if (filter.DepartmentId.HasValue)
            query = query.Where(d => _context.FixedAssets.Any(a => a.Id == d.FixedAssetId && a.DepartmentId == filter.DepartmentId.Value));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.Year).ThenByDescending(d => d.Month)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Join(_context.FixedAssets, d => d.FixedAssetId, a => a.Id, (d, a) => new { d, a })
            .Select(x => new DepreciationReportDto
            {
                FixedAssetId = x.d.FixedAssetId,
                AssetCode = x.a.AssetCode,
                AssetName = x.a.AssetName,
                Month = x.d.Month,
                Year = x.d.Year,
                OpeningValue = x.d.OpeningValue,
                DepreciationAmount = x.d.DepreciationAmount,
                ClosingValue = x.d.ClosingValue,
                CalculatedAt = x.d.CalculatedAt,
            })
            .ToListAsync();

        return new AssetPagedResult<DepreciationReportDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    // ===== DASHBOARD =====

    public async Task<AssetDashboardDto> GetAssetDashboardAsync()
    {
        var assets = await _context.FixedAssets.Where(a => !a.IsDeleted).ToListAsync();

        var dashboard = new AssetDashboardDto
        {
            TotalAssets = assets.Count,
            TotalOriginalValue = assets.Sum(a => a.OriginalValue),
            TotalCurrentValue = assets.Sum(a => a.CurrentValue),
            InUseCount = assets.Count(a => a.Status == 1),
            BrokenCount = assets.Count(a => a.Status == 2),
            UnderRepairCount = assets.Count(a => a.Status == 3),
            PendingDisposalCount = assets.Count(a => a.Status == 4),
            DisposedCount = assets.Count(a => a.Status == 5),
            TransferredCount = assets.Count(a => a.Status == 6),
            MonthlyDepreciationTotal = assets.Where(a => a.Status == 1).Sum(a => a.MonthlyDepreciation),
        };

        dashboard.PendingHandovers = await _context.AssetHandovers.CountAsync(h => !h.IsDeleted && h.Status == 1);
        dashboard.ActiveTenders = await _context.Tenders.CountAsync(t => !t.IsDeleted && t.Status >= 1 && t.Status <= 3);

        // Status breakdown
        var statusNames = new Dictionary<int, string>
        {
            { 1, "Dang su dung" }, { 2, "Hong" }, { 3, "Dang sua chua" },
            { 4, "Cho thanh ly" }, { 5, "Da thanh ly" }, { 6, "Da dieu chuyen" },
        };
        dashboard.StatusBreakdown = assets.GroupBy(a => a.Status)
            .Select(g => new AssetStatusBreakdown
            {
                Status = g.Key,
                StatusName = statusNames.GetValueOrDefault(g.Key, "Khac"),
                Count = g.Count(),
                TotalValue = g.Sum(a => a.CurrentValue),
            }).ToList();

        // Depreciation trends (last 6 months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        dashboard.DepreciationTrends = await _context.AssetDepreciations
            .Where(d => !d.IsDeleted && d.CalculatedAt >= sixMonthsAgo)
            .GroupBy(d => new { d.Month, d.Year })
            .Select(g => new DepreciationTrend
            {
                Month = g.Key.Month,
                Year = g.Key.Year,
                Amount = g.Sum(d => d.DepreciationAmount),
            })
            .OrderBy(t => t.Year).ThenBy(t => t.Month)
            .ToListAsync();

        return dashboard;
    }
}
