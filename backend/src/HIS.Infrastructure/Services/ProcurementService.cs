using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public class ProcurementService : IProcurementService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public ProcurementService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    private static readonly Dictionary<int, string> StatusNames = new()
    {
        { 0, "Nháp" }, { 1, "Chờ duyệt" }, { 2, "Đã duyệt" }, { 3, "Từ chối" }, { 4, "Hoàn thành" }
    };

    public async Task<ProcurementPagedResult> GetRequestsAsync(ProcurementSearchDto filter)
    {
        var query = _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .Include(p => p.ApprovedBy)
            .Include(p => p.Items)
            .Where(p => !p.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(p =>
                p.RequestCode.ToLower().Contains(kw) ||
                (p.Notes != null && p.Notes.ToLower().Contains(kw)));
        }

        if (filter.Status.HasValue)
            query = query.Where(p => p.Status == filter.Status.Value);

        if (filter.DepartmentId.HasValue)
            query = query.Where(p => p.DepartmentId == filter.DepartmentId.Value);

        if (!string.IsNullOrWhiteSpace(filter.DateFrom) && DateTime.TryParse(filter.DateFrom, out var dateFrom))
            query = query.Where(p => p.RequestDate >= dateFrom);

        if (!string.IsNullOrWhiteSpace(filter.DateTo) && DateTime.TryParse(filter.DateTo, out var dateTo))
            query = query.Where(p => p.RequestDate <= dateTo.AddDays(1));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.RequestDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Select(p => new ProcurementListDto
            {
                Id = p.Id,
                RequestCode = p.RequestCode,
                RequestDate = p.RequestDate,
                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department != null ? p.Department.DepartmentName : null,
                RequestedByName = p.RequestedBy != null ? p.RequestedBy.FullName : null,
                Status = p.Status,
                StatusName = "", // mapped below
                TotalAmount = p.TotalAmount,
                Notes = p.Notes,
                ApprovedByName = p.ApprovedBy != null ? p.ApprovedBy.FullName : null,
                ApprovedDate = p.ApprovedDate,
                ItemCount = p.Items.Count(i => !i.IsDeleted),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
            item.StatusName = StatusNames.GetValueOrDefault(item.Status, "Không xác định");

        return new ProcurementPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize
        };
    }

    public async Task<ProcurementDetailDto?> GetByIdAsync(Guid id)
    {
        var p = await _context.ProcurementRequests
            .Include(x => x.Department)
            .Include(x => x.RequestedBy)
            .Include(x => x.ApprovedBy)
            .Include(x => x.Items.Where(i => !i.IsDeleted))
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (p == null) return null;

        return new ProcurementDetailDto
        {
            Id = p.Id,
            RequestCode = p.RequestCode,
            RequestDate = p.RequestDate,
            DepartmentId = p.DepartmentId,
            DepartmentName = p.Department?.DepartmentName,
            RequestedByName = p.RequestedBy?.FullName,
            Status = p.Status,
            StatusName = StatusNames.GetValueOrDefault(p.Status, "Không xác định"),
            TotalAmount = p.TotalAmount,
            Notes = p.Notes,
            ApprovedByName = p.ApprovedBy?.FullName,
            ApprovedDate = p.ApprovedDate,
            ItemCount = p.Items.Count,
            CreatedAt = p.CreatedAt,
            RejectReason = p.RejectReason,
            Items = p.Items.Select(i => new ProcurementRequestItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId,
                ItemName = i.ItemName,
                ItemCode = i.ItemCode,
                Unit = i.Unit,
                RequestedQuantity = i.RequestedQuantity,
                CurrentStock = i.CurrentStock,
                MinimumStock = i.MinimumStock,
                EstimatedPrice = i.EstimatedPrice,
                Notes = i.Notes,
                Specification = i.Specification
            }).ToList()
        };
    }

    public async Task<ProcurementDetailDto> CreateAsync(CreateProcurementDto dto)
    {
        var code = $"DT{DateTime.Now:yyyyMMdd}{new Random().Next(1000, 9999)}";

        var entity = new ProcurementRequest
        {
            Id = Guid.NewGuid(),
            RequestCode = code,
            RequestDate = DateTime.UtcNow,
            DepartmentId = dto.DepartmentId,
            Status = 1, // Pending
            Notes = dto.Notes,
            TotalAmount = dto.Items.Sum(i => i.RequestedQuantity * i.EstimatedPrice),
            CreatedAt = DateTime.UtcNow
        };

        // #195: 1 query tra tồn cho cả phiếu thay vì 1 sum/dòng.
        var requestedItemIds = dto.Items
            .Where(i => i.ItemId.HasValue)
            .Select(i => i.ItemId!.Value)
            .Distinct()
            .ToList();
        var stockRows = requestedItemIds.Count == 0
            ? new List<(Guid? MedicineId, Guid? SupplyId, decimal Quantity)>()
            : (await _context.InventoryItems
                    .Where(x => !x.IsDeleted
                        && ((x.MedicineId != null && requestedItemIds.Contains(x.MedicineId.Value))
                         || (x.SupplyId != null && requestedItemIds.Contains(x.SupplyId.Value))))
                    .Select(x => new { x.MedicineId, x.SupplyId, x.Quantity })
                    .ToListAsync())
                .Select(x => (x.MedicineId, x.SupplyId, x.Quantity))
                .ToList();

        foreach (var itemDto in dto.Items)
        {
            // Look up current stock from InventoryItems if ItemId provided
            int currentStock = 0;
            if (itemDto.ItemId.HasValue)
            {
                var itemId = itemDto.ItemId.Value;
                var totalQty = stockRows
                    .Where(x => x.MedicineId == itemId || x.SupplyId == itemId)
                    .Sum(x => x.Quantity);
                currentStock = (int)totalQty;
            }

            entity.Items.Add(new ProcurementRequestItem
            {
                Id = Guid.NewGuid(),
                ProcurementRequestId = entity.Id,
                ItemId = itemDto.ItemId,
                ItemName = itemDto.ItemName,
                ItemCode = itemDto.ItemCode,
                Unit = itemDto.Unit,
                RequestedQuantity = itemDto.RequestedQuantity,
                CurrentStock = currentStock,
                MinimumStock = 0,
                EstimatedPrice = itemDto.EstimatedPrice,
                Notes = itemDto.Notes,
                Specification = itemDto.Specification,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.ProcurementRequests.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return (await GetByIdAsync(entity.Id))!;
    }

    public async Task<ProcurementListDto> ApproveAsync(Guid id)
    {
        var entity = await _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu dự trù");

        if (entity.Status != 1)
            throw new InvalidOperationException("Chỉ có thể duyệt phiếu đang chờ duyệt");

        entity.Status = 2; // Approved
        entity.ApprovedDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new ProcurementListDto
        {
            Id = entity.Id,
            RequestCode = entity.RequestCode,
            RequestDate = entity.RequestDate,
            DepartmentName = entity.Department?.DepartmentName,
            RequestedByName = entity.RequestedBy?.FullName,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status),
            TotalAmount = entity.TotalAmount,
            ApprovedDate = entity.ApprovedDate,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<ProcurementListDto> RejectAsync(Guid id, string? reason)
    {
        var entity = await _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu dự trù");

        if (entity.Status != 1)
            throw new InvalidOperationException("Chỉ có thể từ chối phiếu đang chờ duyệt");

        entity.Status = 3; // Rejected
        entity.RejectReason = reason;
        entity.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return new ProcurementListDto
        {
            Id = entity.Id,
            RequestCode = entity.RequestCode,
            RequestDate = entity.RequestDate,
            DepartmentName = entity.Department?.DepartmentName,
            RequestedByName = entity.RequestedBy?.FullName,
            Status = entity.Status,
            StatusName = StatusNames.GetValueOrDefault(entity.Status),
            TotalAmount = entity.TotalAmount,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<AutoSuggestionDto>> GetAutoSuggestionsAsync()
    {
        // Aggregate inventory by medicine, find items with low stock
        var medicineStock = await _context.InventoryItems
            .Include(i => i.Medicine)
            .Where(i => !i.IsDeleted && i.MedicineId.HasValue && i.Medicine != null)
            .GroupBy(i => new { i.MedicineId, i.Medicine!.MedicineName, i.Medicine.MedicineCode, i.Medicine.Unit })
            .Select(g => new
            {
                MedicineId = g.Key.MedicineId!.Value,
                Name = g.Key.MedicineName,
                Code = g.Key.MedicineCode,
                Unit = g.Key.Unit,
                TotalQty = g.Sum(x => x.Quantity),
                LastPrice = g.Max(x => x.UnitPrice)
            })
            .Where(x => x.TotalQty < 10) // Items with less than 10 units in stock
            .OrderBy(x => x.TotalQty)
            .Take(50)
            .ToListAsync();

        return medicineStock.Select(m => new AutoSuggestionDto
        {
            ItemId = m.MedicineId,
            ItemName = m.Name,
            ItemCode = m.Code,
            Unit = m.Unit,
            CurrentStock = (int)m.TotalQty,
            MinimumStock = 10,
            SuggestedQuantity = 10 - (int)m.TotalQty + 5, // Buffer of 5
            LastPrice = m.LastPrice
        }).ToList();
    }

    public async Task<ProcurementStatisticsDto> GetStatisticsAsync()
    {
        var query = _context.ProcurementRequests.Where(p => !p.IsDeleted);

        return new ProcurementStatisticsDto
        {
            TotalRequests = await query.CountAsync(),
            DraftCount = await query.CountAsync(p => p.Status == 0),
            PendingCount = await query.CountAsync(p => p.Status == 1),
            ApprovedCount = await query.CountAsync(p => p.Status == 2),
            RejectedCount = await query.CountAsync(p => p.Status == 3),
            TotalApprovedAmount = await query.Where(p => p.Status == 2).SumAsync(p => p.TotalAmount),
            TotalPendingAmount = await query.Where(p => p.Status == 1).SumAsync(p => p.TotalAmount)
        };
    }
}
