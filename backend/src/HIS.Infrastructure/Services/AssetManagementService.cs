using System.Text;
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

    // ===== REPORTS =====

    public Task<List<AssetReportTypeDto>> GetAssetReportTypesAsync()
    {
        var types = new List<AssetReportTypeDto>
        {
            new() { Code = 1, Name = "So TSCD", Description = "So tai san co dinh - liet ke toan bo tai san", Category = "So sach" },
            new() { Code = 2, Name = "The TSCD", Description = "The tai san co dinh - chi tiet tung tai san", Category = "So sach" },
            new() { Code = 3, Name = "So theo doi TSCD tai noi su dung", Description = "Theo doi tai san theo khoa/phong su dung", Category = "So sach" },
            new() { Code = 4, Name = "Bien ban giao nhan TSCD", Description = "Bien ban ban giao tai san co dinh", Category = "Bien ban" },
            new() { Code = 5, Name = "Bien ban thanh ly TSCD", Description = "Bien ban thanh ly tai san co dinh", Category = "Bien ban" },
            new() { Code = 6, Name = "Bien ban danh gia lai TSCD", Description = "Bien ban danh gia lai gia tri tai san", Category = "Bien ban" },
            new() { Code = 7, Name = "Bien ban kiem ke TSCD", Description = "Bien ban kiem ke tai san co dinh", Category = "Bien ban" },
            new() { Code = 8, Name = "Bien ban giao nhan TSCD sau nang cap", Description = "Bien ban giao nhan sau sua chua, nang cap", Category = "Bien ban" },
            new() { Code = 9, Name = "Bang tinh hao mon TSCD", Description = "Bang tinh khau hao tai san co dinh", Category = "Khau hao" },
            new() { Code = 10, Name = "Bang tinh va phan bo khau hao TSCD", Description = "Phan bo khau hao theo khoa/phong", Category = "Khau hao" },
            new() { Code = 11, Name = "BC ke khai 04A - TSCD la nha", Description = "Bao cao ke khai tai san la nha, cong trinh", Category = "Ke khai" },
            new() { Code = 12, Name = "BC ke khai 04C - O to", Description = "Bao cao ke khai tai san la o to", Category = "Ke khai" },
            new() { Code = 13, Name = "BC ke khai 04D - Phuong tien khac", Description = "Bao cao ke khai phuong tien van tai khac", Category = "Ke khai" },
            new() { Code = 14, Name = "BC ke khai 04DD - Tai san khac > 500tr", Description = "Bao cao tai san khac co gia tri tren 500 trieu", Category = "Ke khai" },
            new() { Code = 15, Name = "BC ke khai 04E - TSCD vo hinh", Description = "Bao cao ke khai tai san co dinh vo hinh", Category = "Ke khai" },
            new() { Code = 16, Name = "BC ke khai 04G - TSCD dac biet", Description = "Bao cao ke khai tai san co dinh dac biet", Category = "Ke khai" },
            new() { Code = 17, Name = "BC ke khai 04H - Khai thac khac", Description = "Bao cao ke khai hinh thuc khai thac khac", Category = "Ke khai" },
            new() { Code = 18, Name = "BC ke khai 04I - Doanh thu khai thac", Description = "Bao cao doanh thu tu khai thac tai san", Category = "Ke khai" },
            new() { Code = 19, Name = "BC ke khai xoa thong tin (07)", Description = "Bao cao xoa thong tin tai san trong co so du lieu", Category = "Ke khai" },
            new() { Code = 20, Name = "BC tong hop hien trang 08a (I-III)", Description = "Bao cao tong hop hien trang su dung tai san", Category = "Tong hop" },
            new() { Code = 21, Name = "BC tang giam 08b (I-III)", Description = "Bao cao tang giam tai san trong ky", Category = "Tong hop" },
            new() { Code = 22, Name = "BC cong khai 09a", Description = "Bao cao cong khai tinh hinh quan ly tai san", Category = "Cong khai" },
            new() { Code = 23, Name = "BC cong khai 09b", Description = "Bao cao cong khai tinh hinh xu ly tai san", Category = "Cong khai" },
            new() { Code = 24, Name = "BC cong khai 09c", Description = "Bao cao cong khai tinh hinh dau tu, mua sam tai san", Category = "Cong khai" },
        };
        return Task.FromResult(types);
    }

    public async Task<AssetQrCodeDto> GetAssetQrCodeDataAsync(Guid assetId)
    {
        var asset = await _context.FixedAssets.Where(a => a.Id == assetId && !a.IsDeleted).FirstOrDefaultAsync()
            ?? throw new Exception("Asset not found");

        string? deptName = null;
        if (asset.DepartmentId.HasValue)
        {
            deptName = await _context.Departments.Where(d => d.Id == asset.DepartmentId.Value).Select(d => d.DepartmentName).FirstOrDefaultAsync();
        }

        var qrContent = $"ASSET:{asset.AssetCode}|{asset.AssetName}|{deptName ?? ""}|{asset.OriginalValue:N0}|SN:{asset.SerialNumber ?? ""}";

        return new AssetQrCodeDto
        {
            AssetId = asset.Id,
            AssetCode = asset.AssetCode,
            AssetName = asset.AssetName,
            DepartmentName = deptName,
            OriginalValue = asset.OriginalValue,
            SerialNumber = asset.SerialNumber,
            LocationDescription = asset.LocationDescription,
            QrContent = qrContent,
        };
    }

    public async Task<byte[]> PrintAssetReportAsync(int reportType, AssetReportFilterDto filter)
    {
        var html = reportType switch
        {
            1 => await BuildReport01_SoTSCD(filter),
            2 => await BuildReport02_TheTSCD(filter),
            3 => await BuildReport03_TheoDoiNoiSuDung(filter),
            4 => await BuildReport04_BienBanGiaoNhan(filter),
            5 => await BuildReport05_BienBanThanhLy(filter),
            6 => await BuildReport06_DanhGiaLai(filter),
            7 => await BuildReport07_KiemKe(filter),
            8 => await BuildReport08_GiaoNhanSauNangCap(filter),
            9 => await BuildReport09_BangTinhHaoMon(filter),
            10 => await BuildReport10_PhanBoKhauHao(filter),
            >= 11 and <= 24 => await BuildReportGovernment(reportType, filter),
            _ => throw new Exception($"Invalid report type: {reportType}"),
        };
        return Encoding.UTF8.GetBytes(html);
    }

    private static string ReportHeader(string title, string subtitle = "")
    {
        return $@"<html><head><meta charset='utf-8'/>
<style>
body {{ font-family: 'Times New Roman', serif; font-size: 13px; margin: 20px; }}
h2 {{ text-align: center; margin-bottom: 4px; }}
h3 {{ text-align: center; margin-top: 0; font-weight: normal; font-style: italic; }}
table {{ border-collapse: collapse; width: 100%; margin-top: 12px; }}
th, td {{ border: 1px solid #333; padding: 4px 6px; font-size: 12px; }}
th {{ background: #f0f0f0; text-align: center; font-weight: bold; }}
td.num {{ text-align: right; }}
td.center {{ text-align: center; }}
.header-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; }}
.header-left {{ text-align: left; }}
.header-right {{ text-align: right; }}
.sign-block {{ display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }}
.sign-block div {{ width: 30%; }}
.sign-block p {{ margin: 2px 0; }}
.no-border {{ border: none !important; }}
@media print {{ body {{ margin: 10mm; }} @page {{ size: A4 landscape; }} }}
</style></head><body>
<div class='header-row'>
  <div class='header-left'><strong>DON VI: BENH VIEN</strong></div>
  <div class='header-right'>Ngay in: {DateTime.Now:dd/MM/yyyy HH:mm}</div>
</div>
<h2>{title}</h2>
{(string.IsNullOrEmpty(subtitle) ? "" : $"<h3>{subtitle}</h3>")}";
    }

    private static string SignatureBlock()
    {
        return @"<div class='sign-block'>
<div><p><strong>Nguoi lap bieu</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Ke toan truong</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Giam doc</strong></p><p><em>(Ky, ho ten, dong dau)</em></p><br/><br/><br/></div>
</div></body></html>";
    }

    private async Task<string> BuildReport01_SoTSCD(AssetReportFilterDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted);
        if (filter.AssetGroupCode != null) query = query.Where(a => a.AssetGroupId == filter.AssetGroupCode);
        if (filter.FromDate.HasValue) query = query.Where(a => a.PurchaseDate >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) query = query.Where(a => a.PurchaseDate <= filter.ToDate.Value);

        var assets = await query.OrderBy(a => a.AssetCode).ToListAsync();

        var deptIds = assets.Where(a => a.DepartmentId.HasValue).Select(a => a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("SO TAI SAN CO DINH", filter.Year.HasValue ? $"Nam {filter.Year}" : $"Tinh den ngay {DateTime.Now:dd/MM/yyyy}"));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>So serial</th><th>Khoa/Phong</th><th>Ngay mua</th><th>Nguyen gia</th><th>KH luy ke</th><th>Gia tri con lai</th><th>Trang thai</th></tr>");

        var statusNames = new Dictionary<int, string> { {1,"Dang dung"},{2,"Hong"},{3,"Dang sua"},{4,"Cho TL"},{5,"Da TL"},{6,"Da chuyen"} };
        int stt = 0;
        decimal totalOriginal = 0, totalAccum = 0, totalCurrent = 0;
        foreach (var a in assets)
        {
            stt++;
            totalOriginal += a.OriginalValue;
            totalAccum += a.AccumulatedDepreciation;
            totalCurrent += a.CurrentValue;
            var dept = a.DepartmentId.HasValue && depts.TryGetValue(a.DepartmentId.Value, out var dn) ? dn : "";
            sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td>{a.SerialNumber}</td><td>{dept}</td><td class='center'>{a.PurchaseDate:dd/MM/yyyy}</td><td class='num'>{a.OriginalValue:N0}</td><td class='num'>{a.AccumulatedDepreciation:N0}</td><td class='num'>{a.CurrentValue:N0}</td><td class='center'>{statusNames.GetValueOrDefault(a.Status, "")}</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='6' class='center'>TONG CONG</td><td class='num'>{totalOriginal:N0}</td><td class='num'>{totalAccum:N0}</td><td class='num'>{totalCurrent:N0}</td><td></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport02_TheTSCD(AssetReportFilterDto filter)
    {
        if (!filter.AssetId.HasValue) return ReportHeader("THE TAI SAN CO DINH", "Vui long chon tai san") + "</body></html>";

        var asset = await _context.FixedAssets.FirstOrDefaultAsync(a => a.Id == filter.AssetId.Value && !a.IsDeleted);
        if (asset == null) return ReportHeader("THE TAI SAN CO DINH", "Khong tim thay tai san") + "</body></html>";

        string? deptName = null;
        if (asset.DepartmentId.HasValue)
            deptName = await _context.Departments.Where(d => d.Id == asset.DepartmentId.Value).Select(d => d.DepartmentName).FirstOrDefaultAsync();

        var depreciations = await _context.AssetDepreciations.Where(d => d.FixedAssetId == asset.Id && !d.IsDeleted)
            .OrderBy(d => d.Year).ThenBy(d => d.Month).ToListAsync();

        var sb = new StringBuilder(ReportHeader("THE TAI SAN CO DINH"));
        sb.Append($"<table class='no-border' style='margin-bottom:12px'>");
        sb.Append($"<tr><td class='no-border' style='width:30%'><strong>Ma tai san:</strong> {asset.AssetCode}</td><td class='no-border'><strong>Ten tai san:</strong> {asset.AssetName}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>So serial:</strong> {asset.SerialNumber}</td><td class='no-border'><strong>Nhom TS:</strong> {asset.AssetGroupId}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>Khoa/Phong:</strong> {deptName}</td><td class='no-border'><strong>Vi tri:</strong> {asset.LocationDescription}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>Ngay mua:</strong> {asset.PurchaseDate:dd/MM/yyyy}</td><td class='no-border'><strong>PP khau hao:</strong> {(asset.DepreciationMethod == 1 ? "Duong thang" : "Giam dan")}</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>Nguyen gia:</strong> {asset.OriginalValue:N0} VND</td><td class='no-border'><strong>Thoi gian SD:</strong> {asset.UsefulLifeMonths} thang</td></tr>");
        sb.Append($"<tr><td class='no-border'><strong>KH luy ke:</strong> {asset.AccumulatedDepreciation:N0} VND</td><td class='no-border'><strong>Gia tri con lai:</strong> {asset.CurrentValue:N0} VND</td></tr>");
        sb.Append("</table>");

        if (depreciations.Any())
        {
            sb.Append("<h3 style='text-align:left;font-style:normal;font-weight:bold'>Lich su khau hao</h3>");
            sb.Append("<table><tr><th>Ky</th><th>Gia tri dau ky</th><th>Khau hao</th><th>Gia tri cuoi ky</th><th>Ngay tinh</th></tr>");
            foreach (var d in depreciations)
            {
                sb.Append($"<tr><td class='center'>{d.Month:00}/{d.Year}</td><td class='num'>{d.OpeningValue:N0}</td><td class='num'>{d.DepreciationAmount:N0}</td><td class='num'>{d.ClosingValue:N0}</td><td class='center'>{d.CalculatedAt:dd/MM/yyyy}</td></tr>");
            }
            sb.Append("</table>");
        }
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport03_TheoDoiNoiSuDung(AssetReportFilterDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted && a.DepartmentId.HasValue);
        if (filter.FromDate.HasValue) query = query.Where(a => a.PurchaseDate >= filter.FromDate.Value);
        if (filter.ToDate.HasValue) query = query.Where(a => a.PurchaseDate <= filter.ToDate.Value);

        var assets = await query.OrderBy(a => a.DepartmentId).ThenBy(a => a.AssetCode).ToListAsync();
        var deptIds = assets.Select(a => a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("SO THEO DOI TAI SAN CO DINH TAI NOI SU DUNG"));
        var grouped = assets.GroupBy(a => a.DepartmentId!.Value);

        foreach (var group in grouped)
        {
            var deptName = depts.TryGetValue(group.Key, out var dn) ? dn : group.Key.ToString();
            sb.Append($"<h3 style='text-align:left;font-style:normal;font-weight:bold;margin-top:16px'>Khoa/Phong: {deptName}</h3>");
            sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>So serial</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Trang thai</th></tr>");
            int stt = 0;
            decimal subtotalOrig = 0, subtotalCur = 0;
            foreach (var a in group)
            {
                stt++;
                subtotalOrig += a.OriginalValue;
                subtotalCur += a.CurrentValue;
                var statusNames = new Dictionary<int, string> { {1,"Dang dung"},{2,"Hong"},{3,"Dang sua"},{4,"Cho TL"},{5,"Da TL"},{6,"Da chuyen"} };
                sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td>{a.SerialNumber}</td><td class='num'>{a.OriginalValue:N0}</td><td class='num'>{a.CurrentValue:N0}</td><td class='center'>{statusNames.GetValueOrDefault(a.Status, "")}</td></tr>");
            }
            sb.Append($"<tr style='font-weight:bold'><td colspan='4' class='center'>Cong</td><td class='num'>{subtotalOrig:N0}</td><td class='num'>{subtotalCur:N0}</td><td></td></tr>");
            sb.Append("</table>");
        }
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport04_BienBanGiaoNhan(AssetReportFilterDto filter)
    {
        var handovers = await _context.AssetHandovers.Include(h => h.FixedAsset).Where(h => !h.IsDeleted)
            .Where(h => !filter.FromDate.HasValue || h.HandoverDate >= filter.FromDate.Value)
            .Where(h => !filter.ToDate.HasValue || h.HandoverDate <= filter.ToDate.Value)
            .OrderByDescending(h => h.HandoverDate).Take(100).ToListAsync();

        var deptIds = handovers.SelectMany(h => new[] { h.FromDepartmentId, h.ToDepartmentId }).Where(d => d.HasValue).Select(d => d!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("BIEN BAN GIAO NHAN TAI SAN CO DINH"));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia</th><th>Ben giao</th><th>Ben nhan</th><th>Ngay BG</th><th>Loai</th><th>Trang thai</th></tr>");
        var handoverTypes = new Dictionary<int, string> { {1,"Tiep nhan"},{2,"Dieu chuyen"},{3,"Muon"},{4,"Tra"} };
        int stt = 0;
        foreach (var h in handovers)
        {
            stt++;
            var fromDept = h.FromDepartmentId.HasValue && depts.TryGetValue(h.FromDepartmentId.Value, out var fn) ? fn : "";
            var toDept = h.ToDepartmentId.HasValue && depts.TryGetValue(h.ToDepartmentId.Value, out var tn) ? tn : "";
            sb.Append($"<tr><td class='center'>{stt}</td><td>{h.FixedAsset?.AssetCode}</td><td>{h.FixedAsset?.AssetName}</td><td class='num'>{h.FixedAsset?.OriginalValue:N0}</td><td>{fromDept}</td><td>{toDept}</td><td class='center'>{h.HandoverDate:dd/MM/yyyy}</td><td class='center'>{handoverTypes.GetValueOrDefault(h.HandoverType, "")}</td><td class='center'>{(h.Status == 2 ? "Xac nhan" : "Cho")}</td></tr>");
        }
        sb.Append("</table>");
        sb.Append(@"<div class='sign-block'>
<div><p><strong>Ben giao</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Ben nhan</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Giam doc</strong></p><p><em>(Ky, ho ten, dong dau)</em></p><br/><br/><br/></div>
</div></body></html>");
        return sb.ToString();
    }

    private async Task<string> BuildReport05_BienBanThanhLy(AssetReportFilterDto filter)
    {
        var disposals = await _context.AssetDisposals.Include(d => d.FixedAsset).Where(d => !d.IsDeleted)
            .Where(d => !filter.FromDate.HasValue || d.ProposalDate >= filter.FromDate.Value)
            .Where(d => !filter.ToDate.HasValue || d.ProposalDate <= filter.ToDate.Value)
            .OrderByDescending(d => d.ProposalDate).Take(100).ToListAsync();

        var disposalTypes = new Dictionary<int, string> { {1,"Thanh ly"},{2,"Dau gia"},{3,"Xoa so"} };
        var disposalStatus = new Dictionary<int, string> { {1,"De xuat"},{2,"Da duyet"},{3,"Hoan thanh"},{4,"Tu choi"} };

        var sb = new StringBuilder(ReportHeader("BIEN BAN THANH LY TAI SAN CO DINH"));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Gia thanh ly</th><th>Loai</th><th>Ngay de xuat</th><th>Trang thai</th><th>Ly do</th></tr>");
        int stt = 0;
        decimal totalOrig = 0, totalDisp = 0, totalResid = 0;
        foreach (var d in disposals)
        {
            stt++;
            totalOrig += d.FixedAsset?.OriginalValue ?? 0;
            totalDisp += d.DisposalValue;
            totalResid += d.ResidualValue;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{d.FixedAsset?.AssetCode}</td><td>{d.FixedAsset?.AssetName}</td><td class='num'>{d.FixedAsset?.OriginalValue:N0}</td><td class='num'>{d.ResidualValue:N0}</td><td class='num'>{d.DisposalValue:N0}</td><td class='center'>{disposalTypes.GetValueOrDefault(d.DisposalType, "")}</td><td class='center'>{d.ProposalDate:dd/MM/yyyy}</td><td class='center'>{disposalStatus.GetValueOrDefault(d.Status, "")}</td><td>{d.Reason}</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='3' class='center'>TONG CONG</td><td class='num'>{totalOrig:N0}</td><td class='num'>{totalResid:N0}</td><td class='num'>{totalDisp:N0}</td><td colspan='4'></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport06_DanhGiaLai(AssetReportFilterDto filter)
    {
        var assets = await _context.FixedAssets.Where(a => !a.IsDeleted)
            .Where(a => !filter.AssetId.HasValue || a.Id == filter.AssetId.Value)
            .OrderBy(a => a.AssetCode).Take(200).ToListAsync();

        var sb = new StringBuilder(ReportHeader("BIEN BAN DANH GIA LAI TAI SAN CO DINH", $"Ngay {DateTime.Now:dd/MM/yyyy}"));
        sb.Append("<p>Can cu vao Quyet dinh so ......./QD-BV ngay ...../...../........ cua Giam doc benh vien ve viec danh gia lai tai san co dinh.</p>");
        sb.Append("<p>Hoi dong danh gia gom co:</p><ul><li>Chu tich: .................................</li><li>Uy vien: .................................</li><li>Thu ky: .................................</li></ul>");
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia cu</th><th>KH luy ke</th><th>GTCL cu</th><th>Nguyen gia moi</th><th>GTCL moi</th><th>Chenh lech</th></tr>");
        int stt = 0;
        foreach (var a in assets)
        {
            stt++;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td class='num'>{a.OriginalValue:N0}</td><td class='num'>{a.AccumulatedDepreciation:N0}</td><td class='num'>{a.CurrentValue:N0}</td><td class='num'></td><td class='num'></td><td class='num'></td></tr>");
        }
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport07_KiemKe(AssetReportFilterDto filter)
    {
        var query = _context.FixedAssets.Where(a => !a.IsDeleted);
        if (filter.AssetGroupCode != null) query = query.Where(a => a.AssetGroupId == filter.AssetGroupCode);

        var assets = await query.OrderBy(a => a.DepartmentId).ThenBy(a => a.AssetCode).ToListAsync();
        var deptIds = assets.Where(a => a.DepartmentId.HasValue).Select(a => a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("BIEN BAN KIEM KE TAI SAN CO DINH", $"Thoi diem: {DateTime.Now:dd/MM/yyyy}"));
        sb.Append("<p>Hoi dong kiem ke gom co:</p><ul><li>Truong ban: .................................</li><li>Uy vien: .................................</li></ul>");
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Khoa/Phong</th><th>So serial</th><th>Nguyen gia</th><th>So sach</th><th>Thuc te</th><th>Chenh lech</th><th>Ghi chu</th></tr>");
        var statusNames = new Dictionary<int, string> { {1,"Tot"},{2,"Hong"},{3,"Dang sua"},{4,"Cho TL"},{5,"Da TL"},{6,"Chuyen"} };
        int stt = 0;
        foreach (var a in assets)
        {
            stt++;
            var dept = a.DepartmentId.HasValue && depts.TryGetValue(a.DepartmentId.Value, out var dn) ? dn : "";
            sb.Append($"<tr><td class='center'>{stt}</td><td>{a.AssetCode}</td><td>{a.AssetName}</td><td>{dept}</td><td>{a.SerialNumber}</td><td class='num'>{a.OriginalValue:N0}</td><td class='center'>1</td><td class='center'></td><td class='center'></td><td>{statusNames.GetValueOrDefault(a.Status, "")}</td></tr>");
        }
        sb.Append("</table>");
        sb.Append(@"<div class='sign-block'>
<div><p><strong>Truong ban kiem ke</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Ke toan</strong></p><p><em>(Ky, ho ten)</em></p><br/><br/><br/></div>
<div><p><strong>Giam doc</strong></p><p><em>(Ky, ho ten, dong dau)</em></p><br/><br/><br/></div>
</div></body></html>");
        return sb.ToString();
    }

    private async Task<string> BuildReport08_GiaoNhanSauNangCap(AssetReportFilterDto filter)
    {
        var handovers = await _context.AssetHandovers.Include(h => h.FixedAsset).Where(h => !h.IsDeleted && h.HandoverType == 4) // Type 4 = Tra (return after upgrade)
            .Where(h => !filter.FromDate.HasValue || h.HandoverDate >= filter.FromDate.Value)
            .Where(h => !filter.ToDate.HasValue || h.HandoverDate <= filter.ToDate.Value)
            .OrderByDescending(h => h.HandoverDate).Take(50).ToListAsync();

        var sb = new StringBuilder(ReportHeader("BIEN BAN GIAO NHAN TAI SAN CO DINH SAU SUA CHUA, NANG CAP"));
        sb.Append("<p>Can cu Quyet dinh so ........./QD-BV ngay ..../..../......... ve viec sua chua, nang cap tai san co dinh.</p>");
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia truoc NC</th><th>Chi phi nang cap</th><th>Nguyen gia sau NC</th><th>Ngay hoan thanh</th><th>Ghi chu</th></tr>");
        int stt = 0;
        foreach (var h in handovers)
        {
            stt++;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{h.FixedAsset?.AssetCode}</td><td>{h.FixedAsset?.AssetName}</td><td class='num'>{h.FixedAsset?.OriginalValue:N0}</td><td class='num'></td><td class='num'></td><td class='center'>{h.HandoverDate:dd/MM/yyyy}</td><td>{h.Notes}</td></tr>");
        }
        if (!handovers.Any())
            sb.Append("<tr><td colspan='8' class='center'><em>Khong co du lieu</em></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport09_BangTinhHaoMon(AssetReportFilterDto filter)
    {
        var query = _context.AssetDepreciations.Where(d => !d.IsDeleted);
        if (filter.Month.HasValue) query = query.Where(d => d.Month == filter.Month.Value);
        if (filter.Year.HasValue) query = query.Where(d => d.Year == filter.Year.Value);

        var depreciations = await query.OrderBy(d => d.Year).ThenBy(d => d.Month)
            .Join(_context.FixedAssets, d => d.FixedAssetId, a => a.Id, (d, a) => new { d, a })
            .ToListAsync();

        var sb = new StringBuilder(ReportHeader("BANG TINH HAO MON TAI SAN CO DINH",
            filter.Year.HasValue ? $"Nam {filter.Year}{(filter.Month.HasValue ? $" - Thang {filter.Month}" : "")}" : ""));
        sb.Append("<table><tr><th>STT</th><th>Ma TS</th><th>Ten tai san</th><th>Nguyen gia</th><th>Ti le KH (%/thang)</th><th>So KH trong ky</th><th>KH luy ke</th><th>Gia tri con lai</th></tr>");
        int stt = 0;
        decimal totalDep = 0;
        foreach (var x in depreciations)
        {
            stt++;
            totalDep += x.d.DepreciationAmount;
            var rate = x.a.UsefulLifeMonths > 0 ? (100m / x.a.UsefulLifeMonths) : 0;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{x.a.AssetCode}</td><td>{x.a.AssetName}</td><td class='num'>{x.a.OriginalValue:N0}</td><td class='center'>{rate:N2}</td><td class='num'>{x.d.DepreciationAmount:N0}</td><td class='num'>{x.a.AccumulatedDepreciation:N0}</td><td class='num'>{x.d.ClosingValue:N0}</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='5' class='center'>TONG CONG</td><td class='num'>{totalDep:N0}</td><td colspan='2'></td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private async Task<string> BuildReport10_PhanBoKhauHao(AssetReportFilterDto filter)
    {
        var month = filter.Month ?? DateTime.Now.Month;
        var year = filter.Year ?? DateTime.Now.Year;

        var depreciations = await _context.AssetDepreciations
            .Where(d => !d.IsDeleted && d.Month == month && d.Year == year)
            .Join(_context.FixedAssets, d => d.FixedAssetId, a => a.Id, (d, a) => new { d, a })
            .ToListAsync();

        var deptIds = depreciations.Where(x => x.a.DepartmentId.HasValue).Select(x => x.a.DepartmentId!.Value).Distinct().ToList();
        var depts = deptIds.Any() ? await _context.Departments.Where(d => deptIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.DepartmentName) : new Dictionary<Guid, string>();

        var sb = new StringBuilder(ReportHeader("BANG TINH VA PHAN BO KHAU HAO TAI SAN CO DINH", $"Thang {month}/{year}"));
        sb.Append("<table><tr><th>STT</th><th>Khoa/Phong</th><th>So luong TS</th><th>Tong nguyen gia</th><th>KH trong ky</th><th>Ti le (%)</th></tr>");

        var grouped = depreciations.GroupBy(x => x.a.DepartmentId ?? Guid.Empty);
        int stt = 0;
        decimal grandTotal = depreciations.Sum(x => x.d.DepreciationAmount);
        foreach (var g in grouped.OrderByDescending(g => g.Sum(x => x.d.DepreciationAmount)))
        {
            stt++;
            var deptName = g.Key != Guid.Empty && depts.TryGetValue(g.Key, out var dn) ? dn : "Chua phan bo";
            var deptDep = g.Sum(x => x.d.DepreciationAmount);
            var deptOrig = g.Sum(x => x.a.OriginalValue);
            var pct = grandTotal > 0 ? (deptDep / grandTotal * 100) : 0;
            sb.Append($"<tr><td class='center'>{stt}</td><td>{deptName}</td><td class='center'>{g.Count()}</td><td class='num'>{deptOrig:N0}</td><td class='num'>{deptDep:N0}</td><td class='center'>{pct:N1}%</td></tr>");
        }
        sb.Append($"<tr style='font-weight:bold'><td colspan='2' class='center'>TONG CONG</td><td class='center'>{depreciations.Count}</td><td class='num'>{depreciations.Sum(x => x.a.OriginalValue):N0}</td><td class='num'>{grandTotal:N0}</td><td class='center'>100%</td></tr>");
        sb.Append("</table>");
        sb.Append(SignatureBlock());
        return sb.ToString();
    }

    private Task<string> BuildReportGovernment(int reportType, AssetReportFilterDto filter)
    {
        var reportNames = new Dictionary<int, (string code, string title)>
        {
            { 11, ("04A", "BAO CAO KE KHAI TAI SAN LA NHA, CONG TRINH XAY DUNG") },
            { 12, ("04C", "BAO CAO KE KHAI TAI SAN LA O TO") },
            { 13, ("04D", "BAO CAO KE KHAI TAI SAN LA PHUONG TIEN VAN TAI KHAC") },
            { 14, ("04DD", "BAO CAO KE KHAI TAI SAN KHAC CO GIA TRI TREN 500 TRIEU DONG") },
            { 15, ("04E", "BAO CAO KE KHAI TAI SAN CO DINH VO HINH") },
            { 16, ("04G", "BAO CAO KE KHAI TAI SAN CO DINH DAC BIET") },
            { 17, ("04H", "BAO CAO KE KHAI HINH THUC KHAI THAC KHAC") },
            { 18, ("04I", "BAO CAO DOANH THU TU KHAI THAC TAI SAN") },
            { 19, ("07", "BAO CAO XOA THONG TIN TAI SAN TRONG CO SO DU LIEU") },
            { 20, ("08a", "BAO CAO TONG HOP HIEN TRANG SU DUNG TAI SAN (I-III)") },
            { 21, ("08b", "BAO CAO TANG GIAM TAI SAN TRONG KY (I-III)") },
            { 22, ("09a", "BAO CAO CONG KHAI TINH HINH QUAN LY TAI SAN") },
            { 23, ("09b", "BAO CAO CONG KHAI TINH HINH XU LY TAI SAN") },
            { 24, ("09c", "BAO CAO CONG KHAI TINH HINH DAU TU, MUA SAM TAI SAN") },
        };

        var (code, title) = reportNames.GetValueOrDefault(reportType, ("", "BAO CAO"));
        var year = filter.Year ?? DateTime.Now.Year;

        var sb = new StringBuilder(ReportHeader($"Mau so {code}", title));
        sb.Append($"<p style='text-align:center'>Nam bao cao: <strong>{year}</strong></p>");
        sb.Append("<p style='text-align:center'>Don vi bao cao: <strong>BENH VIEN</strong></p>");
        sb.Append("<p style='text-align:center;font-style:italic'>(Ban in tu phan mem quan ly tai san co dinh)</p>");

        // Generate appropriate table structure based on report type category
        if (reportType >= 11 && reportType <= 16) // Ke khai 04A-04G
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Dia chi/Vi tri</th><th>Dien tich (m2)</th><th>Nam dua vao SD</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Hien trang SD</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td class='center'>1</td><td></td><td></td><td class='num'></td><td class='center'></td><td class='num'></td><td class='num'></td><td></td><td></td></tr>");
            sb.Append("<tr><td colspan='9' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 17) // 04H - Khai thac khac
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Hinh thuc khai thac</th><th>Doi tac</th><th>Thoi han</th><th>Gia tri hop dong</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='7' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 18) // 04I - Doanh thu
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Hinh thuc khai thac</th><th>Doanh thu</th><th>Chi phi</th><th>Loi nhuan</th><th>Nop NSNN</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='8' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 19) // 07 - Xoa thong tin
        {
            sb.Append("<table><tr><th>STT</th><th>Ten tai san</th><th>Ma TS</th><th>Nguyen gia</th><th>Ly do xoa</th><th>Ngay xoa</th><th>So quyet dinh</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='8' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else if (reportType == 20 || reportType == 21) // 08a, 08b
        {
            var label = reportType == 20 ? "Hien trang" : "Tang giam";
            sb.Append($"<table><tr><th>STT</th><th>Chi tieu</th><th>So luong</th><th>Nguyen gia</th><th>Gia tri con lai</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td class='center'>I</td><td><strong>Tong tai san dau ky</strong></td><td class='num'></td><td class='num'></td><td class='num'></td><td></td></tr>");
            sb.Append($"<tr><td class='center'>II</td><td><strong>{label} trong ky</strong></td><td class='num'></td><td class='num'></td><td class='num'></td><td></td></tr>");
            sb.Append("<tr><td class='center'>III</td><td><strong>Tong tai san cuoi ky</strong></td><td class='num'></td><td class='num'></td><td class='num'></td><td></td></tr>");
            sb.Append("<tr><td colspan='6' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }
        else // 09a, 09b, 09c - Cong khai
        {
            sb.Append("<table><tr><th>STT</th><th>Noi dung</th><th>So luong</th><th>Gia tri</th><th>Ghi chu</th></tr>");
            sb.Append("<tr><td colspan='5' class='center'><em>(Du lieu se duoc dien tu he thong quan ly TSCD)</em></td></tr>");
            sb.Append("</table>");
        }

        sb.Append(SignatureBlock());
        return Task.FromResult(sb.ToString());
    }
}
