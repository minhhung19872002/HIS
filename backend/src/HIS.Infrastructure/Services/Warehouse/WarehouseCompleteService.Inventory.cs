using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Core.Constants;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K10 phien 3 (2026-05-30): tach 5.3 Tồn kho (~1045 dong) khoi WarehouseCompleteService.
public partial class WarehouseCompleteService {
    #region 5.3 Tồn kho

    public async Task<ProcurementRequestDto> CreateProcurementRequestAsync(CreateProcurementRequestDto dto, Guid userId)
    {
        var warehouse = await _context.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found");

        var user = await _context.Users.FindAsync(userId);
        var items = new List<ProcurementItemDto>();

        // perf(#195): batch-load medicine + current-stock (read-only, no writes in this loop)
        var medicineIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);
        var stockMap = await _context.InventoryItems
            .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId.HasValue && medicineIds.Contains(i.MedicineId.Value))
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Total = g.Sum(x => x.Quantity - x.ReservedQuantity) })
            .ToDictionaryAsync(x => x.MedicineId, x => x.Total);

        // QA-R2: this used to build a DTO with a fresh Guid and return it WITHOUT saving — the v2
        // "Tạo dự trù" page reported success while nothing reached ProcurementRequests.
        if (dto.Items.Count == 0)
            throw new ArgumentException("Phiếu dự trù phải có ít nhất 1 mặt hàng.");
        if (dto.Items.Any(i => i.RequestedQuantity <= 0))
            throw new ArgumentException("Số lượng dự trù phải lớn hơn 0.");
        var unknown = medicineIds.Where(id => !medicinesMap.ContainsKey(id)).ToList();
        if (unknown.Count > 0)
            throw new KeyNotFoundException("Có mặt hàng không tồn tại trong danh mục thuốc.");
        var priceMap = await _context.InventoryItems
            .Where(i => i.WarehouseId == dto.WarehouseId && i.MedicineId.HasValue && medicineIds.Contains(i.MedicineId.Value))
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Price = g.Max(x => x.UnitPrice) })
            .ToDictionaryAsync(x => x.MedicineId, x => x.Price);

        var now = DateTime.Now;
        var entity = new ProcurementRequest
        {
            Id = Guid.NewGuid(),
            // QA-R11: second stamp against UNIQUE IX_ProcurementRequests_RequestCode — two requests in one second → 500.
            RequestCode = await NextProcurementCodeAsync(),
            RequestDate = now,
            DepartmentId = warehouse.DepartmentId,
            RequestedById = userId == Guid.Empty ? null : userId,
            Status = 1, // entity: 1 = Pending (shown as "Mới" on the warehouse page)
            Notes = dto.Description,
            CreatedAt = now,
            CreatedBy = userId == Guid.Empty ? null : userId.ToString(),
        };

        foreach (var item in dto.Items)
        {
            medicinesMap.TryGetValue(item.ItemId, out var medicine);
            var currentStock = stockMap.TryGetValue(item.ItemId, out var stockTotal) ? stockTotal : 0;
            var price = priceMap.TryGetValue(item.ItemId, out var p) ? p : 0m;
            var qty = (int)Math.Ceiling(item.RequestedQuantity);

            entity.Items.Add(new ProcurementRequestItem
            {
                Id = Guid.NewGuid(),
                ProcurementRequestId = entity.Id,
                ItemId = item.ItemId,
                ItemCode = medicine?.MedicineCode,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit,
                RequestedQuantity = qty,
                CurrentStock = (int)currentStock,
                EstimatedPrice = price,
                Notes = item.Notes,
                CreatedAt = now,
                CreatedBy = entity.CreatedBy,
            });

            items.Add(new ProcurementItemDto
            {
                Id = entity.Items.Last().Id,
                ItemId = item.ItemId,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit ?? string.Empty,
                CurrentStock = currentStock,
                RequestedQuantity = qty,
                Notes = item.Notes
            });
        }
        entity.TotalAmount = entity.Items.Sum(i => i.RequestedQuantity * i.EstimatedPrice);

        _context.ProcurementRequests.Add(entity);
        await _context.SaveChangesAsync();

        return new ProcurementRequestDto
        {
            Id = entity.Id,
            RequestCode = entity.RequestCode,
            RequestDate = entity.RequestDate,
            WarehouseId = dto.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            Description = dto.Description,
            Items = items,
            Status = ToWarehouseProcurementStatus(entity.Status),
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = entity.CreatedAt
        };
    }

    /// <summary>
    /// ProcurementRequests.Status uses the entity codes (0 Draft, 1 Pending, 2 Approved, 3 Rejected, 4 Completed)
    /// shared with /api/procurement, while ProcurementRequestDto / the v2 warehouse page use
    /// 0 Mới, 1 Đã duyệt, 2 Đã mua, 3 Đã hủy. Without this mapping an approved request (2) showed as "Đã mua"
    /// and a pending one (1) as "Đã duyệt" with no approve button.
    /// </summary>
    private static int ToWarehouseProcurementStatus(int entityStatus) => entityStatus switch
    {
        0 or 1 => 0,
        2 => 1,
        4 => 2,
        3 => 3,
        _ => entityStatus,
    };

    public async Task<List<AutoProcurementSuggestionDto>> GetAutoProcurementSuggestionsAsync(Guid warehouseId)
    {
        // Suggest reorder for medicines whose summed available stock ≤
        // ReorderPoint. Average monthly usage = sum of last 30 days exports
        // from StockMovements ÷ 1.
        var thresholds = await _context.StockThresholds
            .Where(t => t.IsActive && (warehouseId == Guid.Empty || t.WarehouseId == warehouseId || t.WarehouseId == null))
            .ToListAsync();
        if (thresholds.Count == 0) return new List<AutoProcurementSuggestionDto>();

        var medIds = thresholds.Select(t => t.MedicineId).ToHashSet();
        var stocks = await _context.InventoryItems
            .Where(i => i.MedicineId.HasValue && medIds.Contains(i.MedicineId.Value)
                        && (warehouseId == Guid.Empty || i.WarehouseId == warehouseId)
                        && !i.IsDeleted)
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToListAsync();

        var since = DateTime.UtcNow.AddDays(-30);
        var usage = await _context.StockMovements
            .Where(m => m.MovementType == 2 // export
                        && (warehouseId == Guid.Empty || m.WarehouseId == warehouseId)
                        && m.MovementDate >= since
                        && medIds.Contains(m.MedicineId))
            .GroupBy(m => m.MedicineId)
            .Select(g => new { MedicineId = g.Key, Used = g.Sum(x => x.Quantity) })
            .ToListAsync();

        var medicines = await _context.Medicines
            .Where(m => medIds.Contains(m.Id))
            .ToListAsync();

        var suggestions = new List<AutoProcurementSuggestionDto>();
        foreach (var threshold in thresholds)
        {
            var stock = stocks.FirstOrDefault(s => s.MedicineId == threshold.MedicineId)?.Quantity ?? 0;
            if (stock > threshold.ReorderPoint) continue;
            var medicine = medicines.FirstOrDefault(m => m.Id == threshold.MedicineId);
            if (medicine == null) continue;
            var monthly = usage.FirstOrDefault(u => u.MedicineId == threshold.MedicineId)?.Used ?? 0;
            var suggestQty = Math.Max(threshold.ReorderQuantity, threshold.MaximumQuantity - stock);

            suggestions.Add(new AutoProcurementSuggestionDto
            {
                ItemId = medicine.Id,
                ItemCode = medicine.MedicineCode,
                ItemName = medicine.MedicineName,
                Unit = medicine.Unit ?? "",
                CurrentStock = stock,
                MinimumStock = threshold.MinimumQuantity,
                MaximumStock = threshold.MaximumQuantity,
                AverageMonthlyUsage = monthly,
                SameMonthLastYearUsage = 0,
                SuggestedQuantity = suggestQty,
                SuggestionReason = stock <= threshold.MinimumQuantity
                    ? "Tồn ≤ tồn tối thiểu"
                    : "Tồn ≤ điểm đặt lại",
            });
        }
        return suggestions.OrderByDescending(s => s.SuggestedQuantity).ToList();
    }

    /// <summary>
    /// Duyệt đề nghị mua sắm. #218/T3 — trước đây trả về một DTO bịa (`RequestCode` ghép từ Id,
    /// `Status = 1 // Đã duyệt`) mà KHÔNG ghi gì, trong khi bảng `ProcurementRequests` đã có sẵn và
    /// `GetProcurementRequestsAsync` ngay dưới vẫn truy vấn nó. Đo được ở
    /// evidence/cross/t3/t3_stub_group_a.json: bấm duyệt xong, đề nghị vẫn nguyên trạng thái cũ.
    /// </summary>
    public async Task<ProcurementRequestDto> ApproveProcurementRequestAsync(Guid id, Guid userId)
    {
        var request = await _context.ProcurementRequests
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đề nghị mua sắm");

        // 2 = Đã duyệt (xem chú thích trên entity: 0 Draft, 1 Pending, 2 Approved, 3 Rejected, 4 Completed)
        if (request.Status == 2)
            throw new InvalidOperationException("Đề nghị mua sắm này đã được duyệt trước đó.");
        if (request.Status == 3)
            throw new InvalidOperationException("Đề nghị mua sắm đã bị từ chối, không duyệt được.");
        // A Completed (4) request was moved back to Approved.
        if (request.Status != 0 && request.Status != 1)
            throw new InvalidOperationException("Chỉ duyệt được đề nghị mua sắm đang chờ duyệt.");

        request.Status = 2;
        request.ApprovedById = userId;
        request.ApprovedDate = HIS.Core.Common.VnTime.NowVn; // business timestamp = VN local (RequestDate uses local now)
        request.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);
        return new ProcurementRequestDto
        {
            Id = request.Id,
            RequestCode = request.RequestCode,
            RequestDate = request.RequestDate,
            Status = ToWarehouseProcurementStatus(request.Status),
            Items = new List<ProcurementItemDto>(),
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = request.CreatedAt
        };
    }

    public async Task<List<ProcurementRequestDto>> GetProcurementRequestsAsync(Guid? warehouseId, int? status, DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.ProcurementRequests
            .Include(p => p.Department)
            .Include(p => p.RequestedBy)
            .Include(p => p.Items)
            .Where(p => !p.IsDeleted)
            .AsQueryable();
        // status is in the warehouse-DTO code set (see ToWarehouseProcurementStatus)
        if (status.HasValue)
            query = status.Value switch
            {
                0 => query.Where(p => p.Status == 0 || p.Status == 1),
                1 => query.Where(p => p.Status == 2),
                2 => query.Where(p => p.Status == 4),
                _ => query.Where(p => p.Status == status.Value),
            };
        if (fromDate.HasValue)
            query = query.Where(p => p.RequestDate >= fromDate.Value);
        // toDate is a calendar day: include the whole day (it cut off everything after 00:00).
        if (toDate.HasValue)
            query = query.Where(p => p.RequestDate < toDate.Value.Date.AddDays(1));
        var rows = await query.OrderByDescending(p => p.RequestDate).Take(200).ToListAsync();
        return rows.Select(p => new ProcurementRequestDto
        {
            Id = p.Id,
            RequestCode = p.RequestCode,
            WarehouseId = warehouseId ?? Guid.Empty,
            WarehouseName = p.Department?.DepartmentName ?? string.Empty,
            RequestDate = p.RequestDate,
            Description = p.Notes,
            Status = ToWarehouseProcurementStatus(p.Status),
            CreatedBy = p.RequestedById ?? Guid.Empty,
            CreatedByName = p.RequestedBy?.FullName ?? string.Empty,
            CreatedAt = p.CreatedAt,
            Items = p.Items?.Select(i => new ProcurementItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId ?? Guid.Empty,
                ItemCode = i.ItemCode ?? string.Empty,
                ItemName = i.ItemName,
                Unit = i.Unit ?? string.Empty,
                CurrentStock = i.CurrentStock,
                MinimumStock = i.MinimumStock,
                RequestedQuantity = i.RequestedQuantity,
                Notes = i.Notes
            }).ToList() ?? new List<ProcurementItemDto>()
        }).ToList();
    }

    public async Task<PagedResultDto<StockDto>> GetStockAsync(StockSearchDto searchDto)
    {
        var query = _context.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Supply)
            .Where(i => i.Quantity > 0);

        if (searchDto.WarehouseId.HasValue)
            query = query.Where(i => i.WarehouseId == searchDto.WarehouseId.Value);

        // Lọc theo loại kho (5=Tủ trực) — panel Tiện ích LIS tách tủ trực / tồn kho.
        if (searchDto.WarehouseType.HasValue)
            query = query.Where(i => i.Warehouse.WarehouseType == searchDto.WarehouseType.Value);

        // QA-R11: ItemType was ignored — the medical-supply stock tab (itemType=2) listed 199/200 medicine lots.
        if (searchDto.ItemType.HasValue)
            query = searchDto.ItemType.Value == 1
                ? query.Where(i => i.MedicineId != null)
                : query.Where(i => i.SupplyId != null);

        if (!string.IsNullOrWhiteSpace(searchDto.Keyword))
        {
            var kw = searchDto.Keyword.ToLower();
            query = query.Where(i =>
                (i.Medicine != null && (i.Medicine.MedicineName.ToLower().Contains(kw) || i.Medicine.MedicineCode.ToLower().Contains(kw))) ||
                (i.Supply != null && (i.Supply.SupplyName.ToLower().Contains(kw) || i.Supply.SupplyCode.ToLower().Contains(kw))));
        }

        if (searchDto.IsExpiringSoon == true)
        {
            var threeMonths = DateTime.Now.AddMonths(3);
            query = query.Where(i => i.ExpiryDate.HasValue && i.ExpiryDate.Value <= threeMonths);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(i => i.ExpiryDate)
            .Skip(Math.Max(0, searchDto.Page - 1) * searchDto.PageSize)
            .Take(searchDto.PageSize)
            .Select(i => new StockDto
            {
                Id = i.Id,
                WarehouseId = i.WarehouseId,
                ItemId = i.MedicineId ?? i.SupplyId ?? Guid.Empty,
                ItemCode = i.Medicine != null ? i.Medicine.MedicineCode : (i.Supply != null ? i.Supply.SupplyCode : ""),
                ItemName = i.Medicine != null ? i.Medicine.MedicineName : (i.Supply != null ? i.Supply.SupplyName : ""),
                ItemType = i.MedicineId.HasValue ? 1 : 2, // 1-Thuốc, 2-Vật tư
                Unit = i.Medicine != null ? (i.Medicine.Unit ?? "") : (i.Supply != null ? (i.Supply.Unit ?? "") : ""),
                BatchNumber = i.BatchNumber,
                ExpiryDate = i.ExpiryDate,
                Quantity = i.Quantity,
                ReservedQuantity = i.ReservedQuantity,
                UnitPrice = i.UnitPrice
            })
            .ToListAsync();

        return new PagedResultDto<StockDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = searchDto.Page,
            PageSize = searchDto.PageSize
        };
    }

    public async Task<List<StockThresholdDto>> GetStockThresholdsAsync(Guid? warehouseId, Guid? medicineId)
    {
        var query = _context.StockThresholds.AsNoTracking().Where(t => !t.IsDeleted);
        if (warehouseId.HasValue && warehouseId.Value != Guid.Empty)
            query = query.Where(t => t.WarehouseId == warehouseId.Value || t.WarehouseId == null);
        if (medicineId.HasValue && medicineId.Value != Guid.Empty)
            query = query.Where(t => t.MedicineId == medicineId.Value);
        return await query
            .OrderBy(t => t.Medicine!.MedicineName)
            .Take(2000)
            .Select(t => new StockThresholdDto
            {
                Id = t.Id,
                MedicineId = t.MedicineId,
                MedicineCode = t.Medicine != null ? t.Medicine.MedicineCode : null,
                MedicineName = t.Medicine != null ? t.Medicine.MedicineName : null,
                Unit = t.Medicine != null ? t.Medicine.Unit : null,
                WarehouseId = t.WarehouseId,
                WarehouseName = t.Warehouse != null ? t.Warehouse.WarehouseName : null,
                MinimumQuantity = t.MinimumQuantity,
                MaximumQuantity = t.MaximumQuantity,
                ReorderPoint = t.ReorderPoint,
                ReorderQuantity = t.ReorderQuantity,
                IsActive = t.IsActive,
            })
            .ToListAsync();
    }

    /// <summary>
    /// QA-R11: upsert one threshold per (medicine, warehouse). StockThresholds existed and fed the "Tối thiểu" column,
    /// the stock warnings and the auto-procurement suggestions, but nothing could write it — all three were always empty.
    /// </summary>
    public async Task<StockThresholdDto> SaveStockThresholdAsync(StockThresholdDto dto, Guid userId)
    {
        if (dto.MedicineId == Guid.Empty)
            throw new InvalidOperationException("Chọn thuốc để đặt ngưỡng tồn.");
        if (dto.MinimumQuantity < 0 || dto.MaximumQuantity < 0 || dto.ReorderPoint < 0 || dto.ReorderQuantity < 0)
            throw new InvalidOperationException("Ngưỡng tồn không được âm.");
        if (dto.MaximumQuantity > 0 && dto.MaximumQuantity < dto.MinimumQuantity)
            throw new InvalidOperationException("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu.");
        if (!await _context.Medicines.AnyAsync(m => m.Id == dto.MedicineId && !m.IsDeleted))
            throw new KeyNotFoundException("Thuốc không tồn tại trong danh mục.");
        var warehouseId = dto.WarehouseId == Guid.Empty ? null : dto.WarehouseId;
        if (warehouseId.HasValue && !await _context.Warehouses.AnyAsync(w => w.Id == warehouseId.Value && !w.IsDeleted))
            throw new KeyNotFoundException("Kho không tồn tại.");

        var entity = await _context.StockThresholds
            .FirstOrDefaultAsync(t => !t.IsDeleted && t.MedicineId == dto.MedicineId && t.WarehouseId == warehouseId);
        if (entity == null)
        {
            entity = new StockThreshold
            {
                Id = Guid.NewGuid(),
                MedicineId = dto.MedicineId,
                WarehouseId = warehouseId,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId.ToString(),
            };
            _context.StockThresholds.Add(entity);
        }
        else
        {
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId.ToString();
        }
        entity.MinimumQuantity = dto.MinimumQuantity;
        entity.MaximumQuantity = dto.MaximumQuantity;
        // Reorder point defaults to the minimum — that is when the suggestion list should pick the item up.
        entity.ReorderPoint = dto.ReorderPoint > 0 ? dto.ReorderPoint : dto.MinimumQuantity;
        entity.ReorderQuantity = dto.ReorderQuantity;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        dto.Id = entity.Id;
        dto.WarehouseId = warehouseId;
        dto.ReorderPoint = entity.ReorderPoint;
        return dto;
    }

    public async Task<List<StockDto>> GetStockWarningsAsync(Guid warehouseId)
    {
        // Items where current quantity ≤ MinimumQuantity threshold
        var thresholds = await _context.StockThresholds
            .Where(t => t.IsActive && (warehouseId == Guid.Empty || t.WarehouseId == warehouseId || t.WarehouseId == null))
            .ToListAsync();
        if (thresholds.Count == 0) return new List<StockDto>();

        var medicineIds = thresholds.Select(t => t.MedicineId).ToHashSet();
        var inventory = await _context.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Warehouse)
            .Where(i => i.MedicineId.HasValue
                        && medicineIds.Contains(i.MedicineId.Value)
                        && (warehouseId == Guid.Empty || i.WarehouseId == warehouseId)
                        && !i.IsDeleted)
            .ToListAsync();

        // Aggregate per medicine+warehouse so multi-batch sums correctly
        var grouped = inventory
            .GroupBy(i => new { i.MedicineId, i.WarehouseId })
            .Select(g => new { Key = g.Key, Quantity = g.Sum(x => x.Quantity), Sample = g.First() })
            .ToList();

        var warnings = new List<StockDto>();
        foreach (var g in grouped)
        {
            var threshold = thresholds.FirstOrDefault(t => t.MedicineId == g.Key.MedicineId
                && (t.WarehouseId == null || t.WarehouseId == g.Key.WarehouseId));
            if (threshold == null) continue;
            if (g.Quantity > threshold.MinimumQuantity) continue;
            warnings.Add(new StockDto
            {
                Id = g.Sample.Id,
                WarehouseId = g.Key.WarehouseId,
                ItemId = g.Sample.MedicineId ?? Guid.Empty,
                ItemCode = g.Sample.Medicine?.MedicineCode ?? "",
                ItemName = g.Sample.Medicine?.MedicineName ?? "",
                ItemType = 1,
                Unit = g.Sample.Medicine?.Unit ?? "",
                BatchNumber = g.Sample.BatchNumber,
                ExpiryDate = g.Sample.ExpiryDate,
                Quantity = g.Quantity,
                ReservedQuantity = g.Sample.ReservedQuantity,
                UnitPrice = g.Sample.UnitPrice,
            });
        }
        return warnings.OrderBy(w => w.Quantity).ToList();
    }

    public async Task<List<ExpiryWarningDto>> GetExpiryWarningsAsync(Guid? warehouseId, int monthsAhead)
    {
        if (monthsAhead < 1) monthsAhead = 3;
        var horizon = DateTime.UtcNow.Date.AddMonths(monthsAhead);
        try
        {
            // Project explicitly to avoid pulling all Supply columns (schema drift
            // on MedicalSupplies in the demo DB). Medicine is loaded via join to
            // get code/name; Supply name resolved separately for any rows that
            // reference it.
            var query = _context.InventoryItems
                .Where(i => i.ExpiryDate.HasValue
                            && i.ExpiryDate.Value <= horizon
                            && i.Quantity > 0
                            && !i.IsDeleted);
            if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);

            var rows = await query
                .OrderBy(i => i.ExpiryDate)
                .Take(200)
                .Select(i => new {
                    i.Id,
                    i.MedicineId,
                    i.SupplyId,
                    i.WarehouseId,
                    i.BatchNumber,
                    i.ExpiryDate,
                    i.Quantity,
                    i.UnitPrice,
                    MedicineCode = i.Medicine != null ? i.Medicine.MedicineCode : null,
                    MedicineName = i.Medicine != null ? i.Medicine.MedicineName : null,
                    MedicineUnit = i.Medicine != null ? i.Medicine.Unit : null,
                    WarehouseName = i.Warehouse != null ? i.Warehouse.WarehouseName : null,
                })
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            return rows.Select(i =>
            {
                var days = i.ExpiryDate!.Value.Date.Subtract(today).Days;
                int level = days < 30 ? 1 : days < 60 ? 2 : 3;
                return new ExpiryWarningDto
                {
                    StockId = i.Id,
                    ItemId = i.MedicineId ?? i.SupplyId ?? Guid.Empty,
                    ItemCode = i.MedicineCode ?? "",
                    ItemName = i.MedicineName ?? "(Vật tư)",
                    Unit = i.MedicineUnit ?? "",
                    BatchNumber = i.BatchNumber,
                    ExpiryDate = i.ExpiryDate.Value,
                    DaysToExpiry = days,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalValue = i.Quantity * i.UnitPrice,
                    WarehouseName = i.WarehouseName ?? "",
                    WarningLevel = level,
                };
            }).ToList();
        }
        catch (Microsoft.Data.SqlClient.SqlException)
        {
            // Schema drift fallback
            return new List<ExpiryWarningDto>();
        }
    }

    public async Task<List<BatchInfoDto>> GetBatchInfoAsync(Guid? warehouseId, Guid? itemId)
    {
        // Each InventoryItem row IS a batch (BatchNumber + ExpiryDate). Sum
        // movement history per batch for received/issued totals.
        var query = _context.InventoryItems
            .Where(i => !string.IsNullOrEmpty(i.BatchNumber)
                        && i.ExpiryDate.HasValue
                        && !i.IsDeleted);
        if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);
        if (itemId.HasValue) query = query.Where(i => i.MedicineId == itemId.Value || i.SupplyId == itemId.Value);

        var batches = await query
            .Select(i => new {
                i.Id, i.MedicineId, i.SupplyId, i.WarehouseId,
                i.BatchNumber, i.ExpiryDate, i.ManufactureDate, i.Quantity,
                MedicineCode = i.Medicine != null ? i.Medicine.MedicineCode : null,
                MedicineName = i.Medicine != null ? i.Medicine.MedicineName : null,
                Manufacturer = i.Medicine != null ? i.Medicine.Manufacturer : null,
                CountryOfOrigin = i.Medicine != null ? i.Medicine.ManufacturerCountry : null,
                RegistrationNumber = i.Medicine != null ? i.Medicine.RegistrationNumber : null,
            })
            .Take(500)
            .ToListAsync();

        // Look up movement totals per batch+warehouse+medicine
        var batchKeys = batches.Where(b => b.MedicineId.HasValue).Select(b => b.BatchNumber!).Distinct().ToList();
        var movements = await _context.StockMovements
            .Where(m => batchKeys.Contains(m.BatchNumber)
                        && (warehouseId == Guid.Empty || !warehouseId.HasValue || m.WarehouseId == warehouseId.Value))
            .GroupBy(m => new { m.BatchNumber, m.WarehouseId, m.MedicineId })
            .Select(g => new {
                g.Key.BatchNumber,
                g.Key.WarehouseId,
                g.Key.MedicineId,
                Received = g.Where(x => x.MovementType == 1 || x.MovementType == 5).Sum(x => x.Quantity),
                Issued = g.Where(x => x.MovementType == 2).Sum(x => x.Quantity),
            })
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        return batches.Select(b =>
        {
            var move = movements.FirstOrDefault(m =>
                m.BatchNumber == b.BatchNumber
                && m.WarehouseId == b.WarehouseId
                && m.MedicineId == b.MedicineId);
            return new BatchInfoDto
            {
                Id = b.Id,
                ItemId = b.MedicineId ?? b.SupplyId ?? Guid.Empty,
                ItemCode = b.MedicineCode ?? "",
                ItemName = b.MedicineName ?? "",
                BatchNumber = b.BatchNumber!,
                ManufactureDate = b.ManufactureDate,
                ExpiryDate = b.ExpiryDate!.Value,
                DaysToExpiry = b.ExpiryDate.Value.Date.Subtract(today).Days,
                CountryOfOrigin = b.CountryOfOrigin,
                Manufacturer = b.Manufacturer,
                RegistrationNumber = b.RegistrationNumber,
                ReceivedQuantity = move?.Received ?? b.Quantity,
                IssuedQuantity = move?.Issued ?? 0,
                RemainingQuantity = b.Quantity,
            };
        })
        .OrderBy(b => b.ExpiryDate)
        .ToList();
    }

    public async Task<List<UnclaimedPrescriptionDto>> GetUnclaimedPrescriptionsAsync(Guid warehouseId, int daysOld)
    {
        if (daysOld < 1) daysOld = 7;
        var threshold = DateTime.UtcNow.AddDays(-daysOld);
        var prescriptions = await _context.Prescriptions
            .Include(p => p.MedicalRecord).ThenInclude(m => m!.Patient)
            .Include(p => p.Doctor)
            .Where(p => !p.IsDeleted
                        && !p.IsDispensed
                        && p.Status != 4
                        && p.PrescriptionType == 1
                        && (warehouseId == Guid.Empty || p.WarehouseId == warehouseId)
                        && p.PrescriptionDate <= threshold)
            .OrderBy(p => p.PrescriptionDate)
            .Take(200)
            .ToListAsync();

        var now = DateTime.UtcNow.Date;
        return prescriptions.Select(p => new UnclaimedPrescriptionDto
        {
            PrescriptionId = p.Id,
            PrescriptionCode = p.PrescriptionCode,
            PrescriptionDate = p.PrescriptionDate,
            PatientCode = p.MedicalRecord?.Patient?.PatientCode ?? "",
            PatientName = p.MedicalRecord?.Patient?.FullName ?? "",
            PhoneNumber = p.MedicalRecord?.Patient?.PhoneNumber,
            DoctorName = p.Doctor?.FullName,
            TotalAmount = p.TotalAmount,
            DaysSincePrescription = now.Subtract(p.PrescriptionDate.Date).Days,
            Status = p.Status == 4 ? 1 : 0,
        }).ToList();
    }

    public async Task<bool> CancelUnclaimedPrescriptionAsync(Guid prescriptionId, Guid userId)
    {
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription == null)
            throw new KeyNotFoundException("Prescription not found");
        if (prescription.IsDispensed)
            throw new InvalidOperationException("Đơn thuốc đã được phát, không thể hủy");

        // #218/T3: chỗ này từng ghi 5. Với ĐƠN THUỐC, 5 không phải là một trạng thái nào cả —
        // "Hủy" là 4 (5 là Cancelled của ExaminationStatus/LabRequestStatus, lẫn sang đây). Hệ quả:
        // đơn hủy quá hạn lấy thuốc mang trạng thái lạ, mọi màn lọc theo Status==4 đều không thấy nó.
        PrescriptionStatus.EnsureCanTransition(prescription.Status, PrescriptionStatus.Cancelled);
        prescription.Status = PrescriptionStatus.Cancelled;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<StockTakeDto> CreateStockTakeAsync(Guid warehouseId, DateTime periodFrom, DateTime periodTo, Guid userId)
    {
        var warehouse = await _context.Warehouses.FindAsync(warehouseId);
        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found");

        // QA-R7: a warehouse could have several open stock-takes at once (each snapshotting the same book
        // quantities) — adjusting both applied the same difference twice. One open count per warehouse.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.Warehouse.StockTake.{warehouseId:N}",
            "Đang có người mở phiếu kiểm kê cho kho này, vui lòng thử lại.");
        var openCode = await _context.StockTakes.AsNoTracking()
            // Pre-push review: v2 has no cancel button for stock-takes yet, so a forgotten legacy count must not
            // lock the warehouse forever — only a count opened in the last 30 days blocks a new one.
            .Where(s => s.WarehouseId == warehouseId && (s.Status == 0 || s.Status == 1)
                        && s.CreatedAt >= DateTime.UtcNow.AddDays(-30))
            .Select(s => s.StockTakeCode)
            .FirstOrDefaultAsync();
        if (openCode != null)
            throw new InvalidOperationException(
                $"Kho đang có phiếu kiểm kê {openCode} chưa hoàn thành — hoàn thành hoặc hủy phiếu đó trước khi mở phiếu mới.");

        // Get current stock for the warehouse
        var stocks = await _context.InventoryItems
            .Where(i => i.WarehouseId == warehouseId && i.Quantity > 0)
            .ToListAsync();

        var items = new List<StockTakeItemDto>();

        // perf(#195): batch-load medicines instead of FindAsync per stock row (N+1)
        var medicineIds = stocks.Where(s => s.MedicineId.HasValue).Select(s => s.MedicineId!.Value).Distinct().ToList();
        var medicinesMap = await _context.Medicines
            .Where(m => medicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        foreach (var stock in stocks)
        {
            Medicine? medicine = stock.MedicineId.HasValue && medicinesMap.TryGetValue(stock.MedicineId.Value, out var m)
                ? m
                : null;

            items.Add(new StockTakeItemDto
            {
                Id = Guid.NewGuid(),
                StockId = stock.Id,
                ItemId = stock.MedicineId ?? stock.SupplyId ?? Guid.Empty,
                ItemCode = medicine?.MedicineCode ?? string.Empty,
                ItemName = medicine?.MedicineName ?? string.Empty,
                Unit = medicine?.Unit ?? string.Empty,
                BatchNumber = stock.BatchNumber,
                ExpiryDate = stock.ExpiryDate,
                BookQuantity = stock.Quantity,
                ActualQuantity = stock.Quantity, // Default to book qty
                UnitPrice = stock.UnitPrice
            });
        }

        // QA0915: phiếu kiểm kê trước đây KHÔNG được ghi (trả Id ngẫu nhiên) → mọi bước sau
        // (lưu kết quả / hoàn thành) đều 404 "Không tìm thấy phiếu kiểm kê". Ghi phiếu + dòng sổ sách.
        var stockTake = new StockTake
        {
            Id = Guid.NewGuid(),
            StockTakeCode = await NextVoucherCodeAsync("KK", c => _context.StockTakes.IgnoreQueryFilters().AnyAsync(s => s.StockTakeCode == c)),
            StockTakeDate = DateTime.Now,
            WarehouseId = warehouseId,
            PeriodFrom = periodFrom,
            PeriodTo = periodTo,
            Status = 0,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };
        _context.StockTakes.Add(stockTake);
        foreach (var it in items)
        {
            it.StockTakeId = stockTake.Id;
            _context.StockTakeItems.Add(new StockTakeItem
            {
                Id = it.Id,
                StockTakeId = stockTake.Id,
                InventoryItemId = it.StockId,
                ItemId = it.ItemId,
                ItemCode = it.ItemCode,
                ItemName = it.ItemName,
                Unit = it.Unit,
                BatchNumber = it.BatchNumber,
                ExpiryDate = it.ExpiryDate,
                BookQuantity = it.BookQuantity,
                ActualQuantity = it.ActualQuantity,
                UnitPrice = it.UnitPrice,
                CreatedAt = DateTime.UtcNow,
            });
        }
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var user = await _context.Users.FindAsync(userId);

        return new StockTakeDto
        {
            Id = stockTake.Id,
            StockTakeCode = stockTake.StockTakeCode,
            StockTakeDate = stockTake.StockTakeDate,
            WarehouseId = warehouseId,
            WarehouseName = warehouse.WarehouseName,
            PeriodFrom = periodFrom,
            PeriodTo = periodTo,
            Items = items,
            Status = 0,
            CreatedBy = userId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = DateTime.Now
        };
    }

    /// <summary>
    /// Ghi kết quả kiểm kê kho. #218/T3 — trước đây chỉ gán `item.StockTakeId` lên DTO **trong bộ
    /// nhớ** rồi trả về, không ghi dòng nào. Bảng `StockTakes`/`StockTakeItems` đã có sẵn.
    /// </summary>
    public async Task<StockTakeDto> UpdateStockTakeResultsAsync(Guid stockTakeId, List<StockTakeItemDto> items, Guid userId)
    {
        var stockTake = await _context.StockTakes
            .FirstOrDefaultAsync(s => s.Id == stockTakeId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu kiểm kê");
        if (stockTake.Status >= 2)
            throw new InvalidOperationException(
                "Phiếu kiểm kê đã hoàn thành, không ghi thêm kết quả được.");

        // QA-R4: the old version REPLACED every count row with whatever the client sent — BookQuantity,
        // UnitPrice and even the lot (StockId) came from the request, and rows not sent vanished (measured:
        // 1557 sheet rows → 1 row with BookQuantity 0 / UnitPrice 999999 on a 10-unit lot; the following
        // "Điều chỉnh tồn" would then have booked +4 phantom units). The sheet (lots, book qty, price) was
        // snapshotted at creation and is the server's; the client only reports the physical count + a note.
        var sheet = await _context.StockTakeItems
            .Where(i => i.StockTakeId == stockTakeId && !i.IsDeleted)
            .ToListAsync();
        var byLot = sheet.GroupBy(i => i.InventoryItemId).ToDictionary(g => g.Key, g => g.First());
        var byId = sheet.ToDictionary(i => i.Id);

        var now = DateTime.UtcNow;
        foreach (var item in items ?? new List<StockTakeItemDto>())
        {
            if (!byId.TryGetValue(item.Id, out var row) && !byLot.TryGetValue(item.StockId, out row))
                throw new InvalidOperationException(
                    $"Lô {item.BatchNumber ?? "(không số lô)"} của {item.ItemName} không thuộc phiếu kiểm kê này.");
            if (item.ActualQuantity < 0)
                throw new InvalidOperationException($"Số thực đếm của {row.ItemName} không được âm.");
            row.ActualQuantity = item.ActualQuantity;
            row.Notes = item.Notes;
            row.UpdatedAt = now;
        }

        stockTake.Status = 1; // Đang kiểm
        stockTake.UpdatedAt = now;
        stockTake.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return await MapStockTakeAsync(stockTake, sheet, userId);
    }

    /// <summary>StockTake + sheet rows → DTO (the page re-seeds its state from this after every save).</summary>
    private async Task<StockTakeDto> MapStockTakeAsync(StockTake stockTake, List<StockTakeItem> sheet, Guid userId)
    {
        var warehouseName = await _context.Warehouses.AsNoTracking()
            .Where(w => w.Id == stockTake.WarehouseId).Select(w => w.WarehouseName).FirstOrDefaultAsync();
        // QA-R8: the sheet's creator, not whoever happens to save/reopen it.
        var creatorId = Guid.TryParse(stockTake.CreatedBy, out var createdBy) ? createdBy : userId;
        var user = await _context.Users.FindAsync(creatorId);
        return new StockTakeDto
        {
            Id = stockTake.Id,
            StockTakeCode = stockTake.StockTakeCode,
            StockTakeDate = stockTake.StockTakeDate,
            WarehouseId = stockTake.WarehouseId,
            WarehouseName = warehouseName ?? string.Empty,
            PeriodFrom = stockTake.PeriodFrom,
            PeriodTo = stockTake.PeriodTo,
            Items = sheet.Select(i => new StockTakeItemDto
            {
                Id = i.Id,
                StockTakeId = i.StockTakeId,
                StockId = i.InventoryItemId,
                ItemId = i.ItemId,
                ItemCode = i.ItemCode,
                ItemName = i.ItemName,
                Unit = i.Unit ?? string.Empty,
                BatchNumber = i.BatchNumber,
                ExpiryDate = i.ExpiryDate,
                BookQuantity = i.BookQuantity,
                ActualQuantity = i.ActualQuantity,
                UnitPrice = i.UnitPrice,
                Notes = i.Notes,
            }).ToList(),
            Status = stockTake.Status,
            Notes = stockTake.Notes,
            CreatedBy = creatorId,
            CreatedByName = user?.FullName ?? string.Empty,
            CreatedAt = stockTake.CreatedAt
        };
    }

    /// <summary>
    /// Hoàn thành phiếu kiểm kê.
    ///
    /// <para>#218/T3 — chú thích cũ ở đây viết <c>// Stock take is handled in-memory (no StockTake
    /// table yet)</c>. Chú thích đó **đã lỗi thời**: bảng `StockTakes` tồn tại, 14 cột, EF đã map.
    /// Bảng được thêm sau mà code không ai quay lại nối vào — nợ đã trả nhưng code không biết, và
    /// chú thích còn trấn an người đọc rằng đây là chuyện đã biết và có lý do.</para>
    /// </summary>
    public async Task<StockTakeDto> CompleteStockTakeAsync(Guid stockTakeId, Guid userId)
    {
        var stockTake = await _context.StockTakes
            .FirstOrDefaultAsync(s => s.Id == stockTakeId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu kiểm kê");
        if (stockTake.Status >= 2)
            throw new InvalidOperationException("Phiếu kiểm kê đã hoàn thành trước đó.");

        stockTake.Status = 2; // Hoàn thành
        stockTake.UpdatedAt = DateTime.UtcNow;
        stockTake.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        // QA-R8: returned a header-only DTO (no items / warehouse / period) — the v2 page re-seeds from it,
        // so the counted sheet vanished from screen right after "Hoàn tất" and the adjust step showed nothing.
        var sheet = await _context.StockTakeItems.AsNoTracking()
            .Where(i => i.StockTakeId == stockTakeId && !i.IsDeleted)
            .ToListAsync();
        return await MapStockTakeAsync(stockTake, sheet, userId);
    }

    public async Task<PagedResultDto<StockTakeDto>> GetStockTakesAsync(Guid? warehouseId, int? status, int page, int pageSize)
    {
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

        var query = _context.StockTakes.AsNoTracking().Where(s => !s.IsDeleted);
        if (warehouseId.HasValue)
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        if (status.HasValue)
            query = query.Where(s => s.Status == status.Value);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new
            {
                s.Id, s.StockTakeCode, s.StockTakeDate, s.WarehouseId, WarehouseName = s.Warehouse!.WarehouseName,
                s.PeriodFrom, s.PeriodTo, s.Status, s.Notes, s.CancelReason, s.CreatedBy, s.CreatedAt,
            })
            .ToListAsync();

        // Creator names in one round-trip (CreatedBy is a string column holding the user Guid).
        var creatorIds = rows.Select(r => Guid.TryParse(r.CreatedBy, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty).Distinct().ToList();
        var creators = await _context.Users.AsNoTracking()
            .Where(u => creatorIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return new PagedResultDto<StockTakeDto>
        {
            Items = rows.Select(r =>
            {
                var creatorId = Guid.TryParse(r.CreatedBy, out var g) ? g : Guid.Empty;
                return new StockTakeDto
                {
                    Id = r.Id,
                    StockTakeCode = r.StockTakeCode,
                    StockTakeDate = r.StockTakeDate,
                    WarehouseId = r.WarehouseId,
                    WarehouseName = r.WarehouseName ?? string.Empty,
                    PeriodFrom = r.PeriodFrom,
                    PeriodTo = r.PeriodTo,
                    Status = r.Status,
                    Notes = r.Status == 4 && !string.IsNullOrWhiteSpace(r.CancelReason) ? $"Hủy: {r.CancelReason}" : r.Notes,
                    CreatedBy = creatorId,
                    CreatedByName = creators.TryGetValue(creatorId, out var name) ? name ?? string.Empty : string.Empty,
                    CreatedAt = r.CreatedAt,
                };
            }).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<StockTakeDto?> GetStockTakeByIdAsync(Guid stockTakeId)
    {
        var stockTake = await _context.StockTakes.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == stockTakeId && !s.IsDeleted);
        if (stockTake == null) return null;
        var sheet = await _context.StockTakeItems.AsNoTracking()
            .Where(i => i.StockTakeId == stockTakeId && !i.IsDeleted)
            .OrderBy(i => i.ItemName).ThenBy(i => i.BatchNumber)
            .ToListAsync();
        return await MapStockTakeAsync(stockTake, sheet, Guid.Empty);
    }

    /// <summary>
    /// Điều chỉnh tồn theo kết quả kiểm kê. QA0915: trước đây là vỏ rỗng trả <c>true</c> — nút "Điều chỉnh
    /// tồn" báo thành công mà tồn không đổi. Áp CHÊNH LỆCH (thực đếm − sổ sách lúc tạo phiếu) lên tồn
    /// hiện tại của đúng lô, không ghi đè bằng số thực đếm (hàng có thể đã nhập/xuất sau lúc đếm).
    /// Mỗi phía chênh lệch sinh một phiếu đã duyệt (nhập kiểm kê KT / xuất kiểm kê KG) để sổ kho khớp.
    /// </summary>
    // QA-R7: the adjustment vouchers are recognised by these note prefixes (no FK column to the stock-take).
    private const string StockTakeIncreaseNote = "Điều chỉnh tăng theo phiếu kiểm kê";
    private const string StockTakeDecreaseNote = "Điều chỉnh giảm theo phiếu kiểm kê";

    /// <summary>True for the receipt (ImportType 6) / issue (ExportType 9) that AdjustStockAfterTakeAsync booked.</summary>
    private static bool IsStockTakeAdjustment(int voucherType, int adjustmentType, string? note)
        => voucherType == adjustmentType && note != null
           && note.StartsWith(adjustmentType == 6 ? StockTakeIncreaseNote : StockTakeDecreaseNote);

    public async Task<bool> AdjustStockAfterTakeAsync(Guid stockTakeId, Guid userId)
    {
        var stockTake = await _context.StockTakes
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == stockTakeId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy phiếu kiểm kê");
        if (stockTake.Status == 3)
            throw new InvalidOperationException("Phiếu kiểm kê đã được điều chỉnh tồn trước đó.");
        if (stockTake.Status != 2)
            throw new InvalidOperationException("Phải hoàn thành phiếu kiểm kê trước khi điều chỉnh tồn.");

        await EnsureWarehouseNotLockedAsync(stockTake.WarehouseId);

        // QA-R7: the status check above is read-then-write — claim the stock-take (2 → 3) atomically so a
        // double click cannot apply the differences twice.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        if (tx != null)
        {
            var claimed = await _context.StockTakes
                .Where(s => s.Id == stockTakeId && s.Status == 2)
                .ExecuteUpdateAsync(u => u.SetProperty(s => s.Status, 3));
            if (claimed == 0)
                throw new InvalidOperationException("Phiếu kiểm kê đã được điều chỉnh tồn trước đó.");
        }

        var lines = stockTake.Items.Where(i => !i.IsDeleted && i.ActualQuantity != i.BookQuantity).ToList();
        var lotIds = lines.Select(i => i.InventoryItemId).Distinct().ToList();
        var lots = await _context.InventoryItems
            .Where(i => lotIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var now = DateTime.Now;
        ImportReceipt? increase = null;
        ExportReceipt? decrease = null;

        foreach (var line in lines)
        {
            if (line.ActualQuantity < 0)
                throw new InvalidOperationException($"Số thực đếm của {line.ItemName} không được âm.");
            if (!lots.TryGetValue(line.InventoryItemId, out var lot) || lot.WarehouseId != stockTake.WarehouseId)
                throw new InvalidOperationException($"Lô {line.BatchNumber} của {line.ItemName} không còn trong kho kiểm kê.");

            var delta = line.ActualQuantity - line.BookQuantity;
            if (lot.Quantity + delta < 0)
                throw new InvalidOperationException(
                    $"Điều chỉnh làm lô {line.BatchNumber} của {line.ItemName} âm tồn (hiện {lot.Quantity:0.##}, chênh lệch {delta:0.##}).");
            lot.Quantity += delta;
            lot.UpdatedAt = now;

            if (delta > 0)
            {
                increase ??= new ImportReceipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = await NextImportCodeAsync("KT"),
                    ReceiptDate = now,
                    WarehouseId = stockTake.WarehouseId,
                    ImportType = 6, // Nhập kiểm kê
                    Status = 1,
                    ApprovedBy = userId,
                    ApprovedAt = now,
                    Note = $"{StockTakeIncreaseNote} {stockTake.StockTakeCode}",
                    CreatedAt = now,
                    CreatedBy = userId.ToString()
                };
                _context.ImportReceiptDetails.Add(new ImportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ImportReceiptId = increase.Id,
                    MedicineId = lot.MedicineId,
                    SupplyId = lot.SupplyId,
                    BatchNumber = lot.BatchNumber,
                    ExpiryDate = lot.ExpiryDate,
                    ManufactureDate = lot.ManufactureDate,
                    Quantity = delta,
                    Unit = line.Unit,
                    UnitPrice = lot.UnitPrice,
                    Amount = delta * lot.UnitPrice,
                    CreatedAt = now,
                    CreatedBy = userId.ToString()
                });
                increase.TotalAmount += delta * lot.UnitPrice;
                increase.FinalAmount = increase.TotalAmount;
            }
            else
            {
                decrease ??= new ExportReceipt
                {
                    Id = Guid.NewGuid(),
                    ReceiptCode = await NextExportCodeAsync("KG"),
                    ReceiptDate = now,
                    WarehouseId = stockTake.WarehouseId,
                    ExportType = 9, // Xuất kiểm kê
                    Status = 1,
                    Note = $"{StockTakeDecreaseNote} {stockTake.StockTakeCode}",
                    CreatedAt = now,
                    CreatedBy = userId.ToString()
                };
                _context.ExportReceiptDetails.Add(new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = decrease.Id,
                    MedicineId = lot.MedicineId,
                    SupplyId = lot.SupplyId,
                    InventoryItemId = lot.Id,
                    BatchNumber = lot.BatchNumber,
                    ExpiryDate = lot.ExpiryDate,
                    Quantity = -delta,
                    Unit = line.Unit,
                    UnitPrice = lot.UnitPrice,
                    Amount = -delta * lot.UnitPrice,
                    CreatedAt = now,
                    CreatedBy = userId.ToString()
                });
                decrease.TotalAmount += -delta * lot.UnitPrice;
            }
        }

        if (increase != null) _context.ImportReceipts.Add(increase);
        if (decrease != null) _context.ExportReceipts.Add(decrease);

        stockTake.Status = 3; // Đã điều chỉnh
        stockTake.UpdatedAt = DateTime.UtcNow;
        stockTake.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return true;
    }

    public async Task<bool> CancelStockTakeAsync(Guid stockTakeId, string reason, Guid userId)
    {
        // QA-R7: was a stub returning true (the StockTakes table exists). Only an open count can be cancelled —
        // it never touched stock; a completed/adjusted one is history. Needed now that a warehouse may have
        // only one open stock-take (an abandoned one must be closable).
        var cancelled = await _context.StockTakes
            .Where(s => s.Id == stockTakeId && (s.Status == 0 || s.Status == 1))
            .ExecuteUpdateAsync(u => u
                .SetProperty(s => s.Status, 4)
                .SetProperty(s => s.CancelReason, reason)
                .SetProperty(s => s.UpdatedAt, DateTime.UtcNow)
                .SetProperty(s => s.UpdatedBy, userId.ToString()));
        if (cancelled == 0)
        {
            if (!await _context.StockTakes.AnyAsync(s => s.Id == stockTakeId))
                throw new KeyNotFoundException("Không tìm thấy phiếu kiểm kê");
            throw new InvalidOperationException("Chỉ hủy được phiếu kiểm kê chưa hoàn thành.");
        }
        return true;
    }

    public async Task<byte[]> PrintProcurementRequestAsync(Guid id)
    {
        try
        {
            var imports = await _context.ImportReceipts
                .Include(r => r.Warehouse)
                .Include(r => r.Details).ThenInclude(d => d.Medicine)
                .Include(r => r.Details).ThenInclude(d => d.Supply)
                .Where(r => r.Id == id)
                .FirstOrDefaultAsync();

            if (imports == null) return Array.Empty<byte>();

            var createdByUser = await _context.Users.FindAsync(Guid.TryParse(imports.CreatedBy, out var uid) ? uid : Guid.Empty);

            var metaLabels = new[] { "Kho yeu cau", "Mo ta", "Ghi chu" };
            var metaValues = new[]
            {
                imports.Warehouse?.WarehouseName ?? "",
                $"Du tru mua sam vat tu thuoc",
                imports.Note ?? ""
            };

            var items = imports.Details.Select(d => new ReportItemRow
            {
                Name = d.Medicine?.MedicineName ?? d.Supply?.SupplyName ?? "",
                Unit = d.Unit ?? "",
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice,
                Amount = d.Amount,
                Note = ""
            }).ToList();

            var html = BuildItemizedReport(
                "PHIEU DU TRU MUA SAM",
                imports.ReceiptCode,
                imports.ReceiptDate,
                metaLabels, metaValues,
                items,
                createdByUser?.FullName);

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    public async Task<byte[]> PrintStockTakeReportAsync(Guid stockTakeId)
    {
        try
        {
            // QA-R4: ignored stockTakeId — printed the first 200 CURRENT inventory rows of whichever active
            // warehouse sorted first, with actual = book (difference always 0). Print the sheet that was counted.
            var stockTake = await _context.StockTakes.AsNoTracking()
                .Include(s => s.Warehouse)
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == stockTakeId && !s.IsDeleted);
            if (stockTake == null) return Array.Empty<byte>();

            var warehouseName = stockTake.Warehouse?.WarehouseName ?? "";

            var headers = new[] { "Ten hang", "DVT", "SL so sach", "SL thuc te", "Chenh lech", "Don gia", "Gia tri CL", "Ghi chu" };
            var rows = stockTake.Items.Where(i => !i.IsDeleted)
                .OrderBy(i => i.ItemName).ThenBy(i => i.BatchNumber)
                .Select(i =>
            {
                var diff = i.ActualQuantity - i.BookQuantity;
                return new[]
                {
                    i.ItemName, i.Unit ?? "",
                    i.BookQuantity.ToString("#,##0.##"),
                    i.ActualQuantity.ToString("#,##0.##"),
                    diff.ToString("#,##0.##"),
                    i.UnitPrice.ToString("#,##0"),
                    (diff * i.UnitPrice).ToString("#,##0"),
                    string.Join(" ", new[] { i.BatchNumber != null ? $"Lo: {i.BatchNumber}" : null, i.Notes }.Where(s => !string.IsNullOrEmpty(s)))
                };
            }).ToList();

            var html = BuildTableReport(
                "BIEN BAN KIEM KE",
                $"Kho: {warehouseName} - Phieu {stockTake.StockTakeCode} - Ky {stockTake.PeriodFrom:dd/MM/yyyy} den {stockTake.PeriodTo:dd/MM/yyyy}",
                stockTake.StockTakeDate,
                headers, rows,
                null, "Truong ban kiem ke");

            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    #endregion
}
