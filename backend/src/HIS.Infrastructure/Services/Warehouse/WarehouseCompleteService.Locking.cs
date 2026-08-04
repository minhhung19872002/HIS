using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 (TTYT Tịnh Biên) — V.31 Khóa lô thuốc · V.33 Khóa kho.
/// Khóa lô: lô có vấn đề (thu hồi, nghi ngờ chất lượng) → khoa/phòng không lĩnh được,
/// số lượng lô giữ nguyên cho tới khi lãnh đạo quyết định.
/// Khóa kho: chặn xuất + luân chuyển khi kiểm kê / chốt sổ.
/// </summary>
public partial class WarehouseCompleteService
{
    #region NangCap26 — Khóa lô / khóa kho

    public async Task<LockedBatchDto> LockBatchAsync(Guid inventoryItemId, string reason, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Phải nhập lý do khóa lô.");

        var item = await _context.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == inventoryItemId && !i.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy lô trong kho.");

        item.IsLocked = true;
        item.LockReason = reason.Trim();
        item.LockedBy = userId;
        item.LockedAt = DateTime.Now;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return await MapLockedBatchAsync(inventoryItemId);
    }

    public async Task<LockedBatchDto> UnlockBatchAsync(Guid inventoryItemId, string reason, Guid userId)
    {
        var item = await _context.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == inventoryItemId && !i.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy lô trong kho.");

        item.IsLocked = false;
        // Giữ lại vết: ghi lý do mở khóa nối vào LockReason cũ để không mất lịch sử.
        item.LockReason = string.IsNullOrWhiteSpace(reason)
            ? null
            : $"[Đã mở khóa {DateTime.Now:dd/MM/yyyy HH:mm}] {reason.Trim()}";
        item.LockedBy = null;
        item.LockedAt = null;
        item.UpdatedAt = DateTime.Now;
        item.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return await MapLockedBatchAsync(inventoryItemId);
    }

    public async Task<List<LockedBatchDto>> GetLockedBatchesAsync(Guid? warehouseId)
    {
        var query = _context.InventoryItems.Where(i => i.IsLocked && !i.IsDeleted);
        if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);

        var rows = await query
            .OrderByDescending(i => i.LockedAt)
            .Select(i => new
            {
                i.Id, i.WarehouseId, i.MedicineId, i.SupplyId, i.BatchNumber,
                i.ExpiryDate, i.Quantity, i.LockReason, i.LockedBy, i.LockedAt,
                WarehouseName = i.Warehouse.WarehouseName,
                ItemName = i.MedicineId != null ? i.Medicine!.MedicineName : (i.Supply != null ? i.Supply.SupplyName : string.Empty)
            })
            .ToListAsync();

        var lockerIds = rows.Where(r => r.LockedBy.HasValue).Select(r => r.LockedBy!.Value).Distinct().ToList();
        var lockers = await _context.Users.Where(u => lockerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return rows.Select(r => new LockedBatchDto
        {
            InventoryItemId = r.Id,
            WarehouseId = r.WarehouseId,
            WarehouseName = r.WarehouseName ?? string.Empty,
            MedicineId = r.MedicineId,
            SupplyId = r.SupplyId,
            ItemName = r.ItemName ?? string.Empty,
            BatchNumber = r.BatchNumber,
            ExpiryDate = r.ExpiryDate,
            Quantity = r.Quantity,
            LockReason = r.LockReason,
            LockedBy = r.LockedBy,
            LockedByName = r.LockedBy.HasValue && lockers.TryGetValue(r.LockedBy.Value, out var n) ? n : null,
            LockedAt = r.LockedAt
        }).ToList();
    }

    public async Task<WarehouseLockStatusDto> LockWarehouseAsync(Guid warehouseId, string reason, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Phải nhập lý do khóa kho.");

        var wh = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == warehouseId && !w.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy kho.");

        wh.IsLocked = true;
        wh.LockReason = reason.Trim();
        wh.LockedBy = userId;
        wh.LockedAt = DateTime.Now;
        wh.UpdatedAt = DateTime.Now;
        wh.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return await MapWarehouseLockAsync(warehouseId);
    }

    public async Task<WarehouseLockStatusDto> UnlockWarehouseAsync(Guid warehouseId, Guid userId)
    {
        var wh = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == warehouseId && !w.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy kho.");

        wh.IsLocked = false;
        wh.LockReason = null;
        wh.LockedBy = null;
        wh.LockedAt = null;
        wh.UpdatedAt = DateTime.Now;
        wh.UpdatedBy = userId.ToString();

        await _context.SaveChangesAsync();
        return await MapWarehouseLockAsync(warehouseId);
    }

    public async Task<List<WarehouseLockStatusDto>> GetWarehouseLockStatusAsync(bool lockedOnly)
    {
        var query = _context.Warehouses.Where(w => !w.IsDeleted);
        if (lockedOnly) query = query.Where(w => w.IsLocked);

        var rows = await query
            .OrderBy(w => w.WarehouseName)
            .Select(w => new { w.Id, w.WarehouseCode, w.WarehouseName, w.IsLocked, w.LockReason, w.LockedBy, w.LockedAt })
            .ToListAsync();

        var lockerIds = rows.Where(r => r.LockedBy.HasValue).Select(r => r.LockedBy!.Value).Distinct().ToList();
        var lockers = await _context.Users.Where(u => lockerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName);

        return rows.Select(r => new WarehouseLockStatusDto
        {
            WarehouseId = r.Id,
            WarehouseCode = r.WarehouseCode,
            WarehouseName = r.WarehouseName,
            IsLocked = r.IsLocked,
            LockReason = r.LockReason,
            LockedBy = r.LockedBy,
            LockedByName = r.LockedBy.HasValue && lockers.TryGetValue(r.LockedBy.Value, out var n) ? n : null,
            LockedAt = r.LockedAt
        }).ToList();
    }

    #endregion

    #region Guards — gọi từ các luồng xuất / luân chuyển

    /// <summary>
    /// Chặn mọi thao tác xuất/luân chuyển trên kho đang khóa (V.33).
    /// Ném InvalidOperationException → controller trả 400 với thông báo nghiệp vụ, KHÔNG 500.
    /// </summary>
    internal async Task EnsureWarehouseNotLockedAsync(Guid warehouseId)
    {
        var wh = await _context.Warehouses.AsNoTracking()
            .Where(w => w.Id == warehouseId)
            .Select(w => new { w.WarehouseName, w.IsLocked, w.LockReason })
            .FirstOrDefaultAsync();

        if (wh is { IsLocked: true })
            throw new InvalidOperationException(
                $"Kho \"{wh.WarehouseName}\" đang bị khóa nên không thể xuất/luân chuyển. Lý do: {wh.LockReason ?? "(không ghi)"}.");
    }

    /// <summary>
    /// Chặn xuất một lô đã khóa kể cả khi người dùng chọn đích danh lô đó (V.31).
    /// </summary>
    internal static void EnsureBatchNotLocked(HIS.Core.Entities.InventoryItem stock)
    {
        if (stock.IsLocked)
            throw new InvalidOperationException(
                $"Lô \"{stock.BatchNumber ?? "(không số lô)"}\" đang bị khóa nên không được cấp phát. Lý do: {stock.LockReason ?? "(không ghi)"}.");
    }

    #endregion

    private async Task<LockedBatchDto> MapLockedBatchAsync(Guid inventoryItemId)
    {
        var r = await _context.InventoryItems.AsNoTracking()
            .Where(i => i.Id == inventoryItemId)
            .Select(i => new
            {
                i.Id, i.WarehouseId, i.MedicineId, i.SupplyId, i.BatchNumber,
                i.ExpiryDate, i.Quantity, i.LockReason, i.LockedBy, i.LockedAt,
                WarehouseName = i.Warehouse.WarehouseName,
                ItemName = i.MedicineId != null ? i.Medicine!.MedicineName : (i.Supply != null ? i.Supply.SupplyName : string.Empty)
            })
            .FirstAsync();

        string? lockerName = null;
        if (r.LockedBy.HasValue)
            lockerName = await _context.Users.Where(u => u.Id == r.LockedBy.Value).Select(u => u.FullName).FirstOrDefaultAsync();

        return new LockedBatchDto
        {
            InventoryItemId = r.Id,
            WarehouseId = r.WarehouseId,
            WarehouseName = r.WarehouseName ?? string.Empty,
            MedicineId = r.MedicineId,
            SupplyId = r.SupplyId,
            ItemName = r.ItemName ?? string.Empty,
            BatchNumber = r.BatchNumber,
            ExpiryDate = r.ExpiryDate,
            Quantity = r.Quantity,
            LockReason = r.LockReason,
            LockedBy = r.LockedBy,
            LockedByName = lockerName,
            LockedAt = r.LockedAt
        };
    }

    private async Task<WarehouseLockStatusDto> MapWarehouseLockAsync(Guid warehouseId)
    {
        var r = await _context.Warehouses.AsNoTracking()
            .Where(w => w.Id == warehouseId)
            .Select(w => new { w.Id, w.WarehouseCode, w.WarehouseName, w.IsLocked, w.LockReason, w.LockedBy, w.LockedAt })
            .FirstAsync();

        string? lockerName = null;
        if (r.LockedBy.HasValue)
            lockerName = await _context.Users.Where(u => u.Id == r.LockedBy.Value).Select(u => u.FullName).FirstOrDefaultAsync();

        return new WarehouseLockStatusDto
        {
            WarehouseId = r.Id,
            WarehouseCode = r.WarehouseCode,
            WarehouseName = r.WarehouseName,
            IsLocked = r.IsLocked,
            LockReason = r.LockReason,
            LockedBy = r.LockedBy,
            LockedByName = lockerName,
            LockedAt = r.LockedAt
        };
    }
}
