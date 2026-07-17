using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Asset;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class AssetManagementService : IAssetManagementService
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
            .ToBoundedListAsync("AssetManagementService.GetTenderItemsAsync");

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
}
