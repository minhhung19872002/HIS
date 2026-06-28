using System.Text.Json;
using System.Text;
using HIS.Application.DTOs.NangCap23;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;
// ============================================================================
// Batch 3.1: Linen Management
// ============================================================================

public class LinenManagementService : ILinenManagementService
{
    private readonly HISDbContext _db;
    public LinenManagementService(HISDbContext db) { _db = db; }

    private static string LinenStatusName(int s) => s switch
    {
        0 => "Nháp", 1 => "Đã gửi đi", 2 => "Đã nhận về", 3 => "Đã đối chiếu", 4 => "Đã hủy", _ => "Khác"
    };

    private static string SterStatusName(int s) => s switch
    {
        0 => "Đã lên lịch", 1 => "Đang thực hiện", 2 => "Hoàn thành", 3 => "Thất bại", 4 => "Đã hủy", _ => "Khác"
    };

    public async Task<List<LinenItemDto>> ListLinenItemsAsync(string? keyword, string? category, bool? isActive)
    {
        var q = _db.LinenItems.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var k = keyword.Trim();
            q = q.Where(x => x.ItemCode.Contains(k) || x.ItemName.Contains(k));
        }
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (isActive.HasValue) q = q.Where(x => x.IsActive == isActive.Value);

        return await q.OrderBy(x => x.Category).ThenBy(x => x.ItemCode)
            .Select(x => new LinenItemDto
            {
                Id = x.Id,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Category = x.Category,
                Unit = x.Unit,
                StandardWeightKg = x.StandardWeightKg,
                MaxReuseCount = x.MaxReuseCount,
                CurrentStock = x.CurrentStock,
                InCleaning = x.InCleaning,
                InRepair = x.InRepair,
                Damaged = x.Damaged,
                MinStockAlert = x.MinStockAlert,
                IsActive = x.IsActive,
                Notes = x.Notes
            })
            .Take(500)
            .ToListAsync();
    }

    public async Task<LinenItemDto?> GetLinenItemAsync(Guid id)
    {
        var x = await _db.LinenItems.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        if (x == null) return null;
        return new LinenItemDto
        {
            Id = x.Id,
            ItemCode = x.ItemCode,
            ItemName = x.ItemName,
            Category = x.Category,
            Unit = x.Unit,
            StandardWeightKg = x.StandardWeightKg,
            MaxReuseCount = x.MaxReuseCount,
            CurrentStock = x.CurrentStock,
            InCleaning = x.InCleaning,
            InRepair = x.InRepair,
            Damaged = x.Damaged,
            MinStockAlert = x.MinStockAlert,
            IsActive = x.IsActive,
            Notes = x.Notes
        };
    }

    public async Task<LinenItemDto> SaveLinenItemAsync(LinenItemDto dto, string? userId)
    {
        LinenItem entity;
        if (dto.Id != Guid.Empty)
        {
            entity = await _db.LinenItems.FirstOrDefaultAsync(x => x.Id == dto.Id) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new LinenItem { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, CreatedBy = userId };
            _db.LinenItems.Add(entity);
        }
        entity.ItemCode = dto.ItemCode;
        entity.ItemName = dto.ItemName;
        entity.Category = dto.Category;
        entity.Unit = dto.Unit;
        entity.StandardWeightKg = dto.StandardWeightKg;
        entity.MaxReuseCount = dto.MaxReuseCount;
        entity.CurrentStock = dto.CurrentStock;
        entity.InCleaning = dto.InCleaning;
        entity.InRepair = dto.InRepair;
        entity.Damaged = dto.Damaged;
        entity.MinStockAlert = dto.MinStockAlert;
        entity.IsActive = dto.IsActive;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return (await GetLinenItemAsync(entity.Id))!;
    }

    public async Task<bool> DeleteLinenItemAsync(Guid id, string? userId)
    {
        var entity = await _db.LinenItems.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return false;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<LinenTransactionDto>> SearchTransactionsAsync(string? transactionType, int? status, DateTime? from, DateTime? to, int pageIndex = 0, int pageSize = 50)
    {
        var q = _db.LinenTransactions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(transactionType)) q = q.Where(x => x.TransactionType == transactionType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.TransactionDate >= from.Value);
        if (to.HasValue) q = q.Where(x => x.TransactionDate <= to.Value);

        var rows = await q.OrderByDescending(x => x.TransactionDate)
            .Skip(pageIndex * pageSize).Take(pageSize)
            .ToListAsync();

        var deptIds = rows.SelectMany(r => new[] { r.FromDepartmentId, r.ToDepartmentId }).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
        var deptMap = await _db.Departments.AsNoTracking().Where(d => deptIds.Contains(d.Id)).Select(d => new { d.Id, Name = d.DepartmentName }).ToListAsync();

        return rows.Select(r => new LinenTransactionDto
        {
            Id = r.Id,
            TransactionCode = r.TransactionCode,
            TransactionType = r.TransactionType,
            TransactionDate = r.TransactionDate,
            FromDepartmentId = r.FromDepartmentId,
            FromDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.FromDepartmentId)?.Name,
            ToDepartmentId = r.ToDepartmentId,
            ToDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.ToDepartmentId)?.Name,
            DispatcherName = r.DispatcherName,
            ReceiverName = r.ReceiverName,
            TotalItems = r.TotalItems,
            TotalWeightKg = r.TotalWeightKg,
            VendorName = r.VendorName,
            Status = r.Status,
            StatusName = LinenStatusName(r.Status),
            Notes = r.Notes,
            DetailsJson = r.DetailsJson,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<LinenTransactionDto?> GetTransactionAsync(Guid id)
    {
        var r = await _db.LinenTransactions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var deptMap = await _db.Departments.AsNoTracking()
            .Where(d => d.Id == r.FromDepartmentId || d.Id == r.ToDepartmentId)
            .Select(d => new { d.Id, Name = d.DepartmentName }).ToListAsync();
        return new LinenTransactionDto
        {
            Id = r.Id,
            TransactionCode = r.TransactionCode,
            TransactionType = r.TransactionType,
            TransactionDate = r.TransactionDate,
            FromDepartmentId = r.FromDepartmentId,
            FromDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.FromDepartmentId)?.Name,
            ToDepartmentId = r.ToDepartmentId,
            ToDepartmentName = deptMap.FirstOrDefault(d => d.Id == r.ToDepartmentId)?.Name,
            DispatcherName = r.DispatcherName,
            ReceiverName = r.ReceiverName,
            TotalItems = r.TotalItems,
            TotalWeightKg = r.TotalWeightKg,
            VendorName = r.VendorName,
            Status = r.Status,
            StatusName = LinenStatusName(r.Status),
            Notes = r.Notes,
            DetailsJson = r.DetailsJson,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<LinenTransactionDto> SaveTransactionAsync(SaveLinenTransactionDto dto, string? userId)
    {
        LinenTransaction entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.LinenTransactions.FirstOrDefaultAsync(x => x.Id == dto.Id.Value) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new LinenTransaction
            {
                Id = Guid.NewGuid(),
                TransactionCode = $"LIN-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _db.LinenTransactions.Add(entity);
        }
        entity.TransactionType = dto.TransactionType;
        entity.TransactionDate = dto.TransactionDate;
        entity.FromDepartmentId = dto.FromDepartmentId;
        entity.ToDepartmentId = dto.ToDepartmentId;
        entity.DispatcherName = dto.DispatcherName;
        entity.ReceiverName = dto.ReceiverName;
        entity.VendorName = dto.VendorName;
        entity.Notes = dto.Notes;
        entity.DetailsJson = dto.DetailsJson ?? "[]";

        // Compute totals from DetailsJson
        try
        {
            var arr = JsonSerializer.Deserialize<List<JsonElement>>(entity.DetailsJson) ?? new();
            entity.TotalItems = arr.Sum(e => e.TryGetProperty("quantity", out var q) ? q.GetInt32() : 0);
            entity.TotalWeightKg = (decimal)arr.Sum(e => e.TryGetProperty("weight", out var w) ? w.GetDouble() : 0);
        }
        catch { /* tolerate bad JSON */ }

        await _db.SaveChangesAsync();
        return (await GetTransactionAsync(entity.Id))!;
    }

    public async Task<LinenTransactionDto?> UpdateTransactionStatusAsync(Guid id, int newStatus, string? userId)
    {
        var entity = await _db.LinenTransactions.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        // STATE GUARD (High-New-1): chặn nhảy bất hợp lệ như 0→3 (Reconciled không qua Receive)
        Nangcap23StateMachine.EnsureValidLinenTransition(entity.Status, newStatus);
        entity.Status = newStatus;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetTransactionAsync(id);
    }

    public async Task<List<SterilizationScheduleDto>> SearchSchedulesAsync(string? areaType, int? status, DateTime? from, DateTime? to)
    {
        var q = _db.SterilizationSchedules.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(areaType)) q = q.Where(x => x.AreaType == areaType);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);
        if (from.HasValue) q = q.Where(x => x.ScheduledAt >= from.Value);
        if (to.HasValue) q = q.Where(x => x.ScheduledAt <= to.Value);

        var rows = await q.OrderByDescending(x => x.ScheduledAt).Take(500).ToListAsync();
        var deptIds = rows.Where(r => r.DepartmentId.HasValue).Select(r => r.DepartmentId!.Value).Distinct().ToList();
        var roomIds = rows.Where(r => r.RoomId.HasValue).Select(r => r.RoomId!.Value).Distinct().ToList();
        var deptMap = await _db.Departments.AsNoTracking().Where(d => deptIds.Contains(d.Id)).Select(d => new { d.Id, Name = d.DepartmentName }).ToListAsync();
        var roomMap = await _db.Rooms.AsNoTracking().Where(r => roomIds.Contains(r.Id)).Select(r => new { r.Id, Name = r.RoomName }).ToListAsync();

        return rows.Select(r => new SterilizationScheduleDto
        {
            Id = r.Id,
            ScheduleCode = r.ScheduleCode,
            ScheduledAt = r.ScheduledAt,
            AreaType = r.AreaType,
            RoomId = r.RoomId,
            RoomName = roomMap.FirstOrDefault(x => x.Id == r.RoomId)?.Name,
            DepartmentId = r.DepartmentId,
            DepartmentName = deptMap.FirstOrDefault(x => x.Id == r.DepartmentId)?.Name,
            AreaCode = r.AreaCode,
            SterilizationMethod = r.SterilizationMethod,
            Agent = r.Agent,
            DurationMinutes = r.DurationMinutes,
            AssignedStaff = r.AssignedStaff,
            StartedAt = r.StartedAt,
            CompletedAt = r.CompletedAt,
            Status = r.Status,
            StatusName = SterStatusName(r.Status),
            CultureSampleCode = r.CultureSampleCode,
            CultureResult = r.CultureResult,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<SterilizationScheduleDto?> GetScheduleAsync(Guid id)
    {
        var r = await _db.SterilizationSchedules.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return null;
        var deptName = r.DepartmentId.HasValue ? await _db.Departments.AsNoTracking().Where(d => d.Id == r.DepartmentId).Select(d => d.DepartmentName).FirstOrDefaultAsync() : null;
        var roomName = r.RoomId.HasValue ? await _db.Rooms.AsNoTracking().Where(d => d.Id == r.RoomId).Select(d => d.RoomName).FirstOrDefaultAsync() : null;
        return new SterilizationScheduleDto
        {
            Id = r.Id,
            ScheduleCode = r.ScheduleCode,
            ScheduledAt = r.ScheduledAt,
            AreaType = r.AreaType,
            RoomId = r.RoomId,
            RoomName = roomName,
            DepartmentId = r.DepartmentId,
            DepartmentName = deptName,
            AreaCode = r.AreaCode,
            SterilizationMethod = r.SterilizationMethod,
            Agent = r.Agent,
            DurationMinutes = r.DurationMinutes,
            AssignedStaff = r.AssignedStaff,
            StartedAt = r.StartedAt,
            CompletedAt = r.CompletedAt,
            Status = r.Status,
            StatusName = SterStatusName(r.Status),
            CultureSampleCode = r.CultureSampleCode,
            CultureResult = r.CultureResult,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt
        };
    }

    public async Task<SterilizationScheduleDto> SaveScheduleAsync(SaveSterilizationScheduleDto dto, string? userId)
    {
        SterilizationSchedule entity;
        if (dto.Id.HasValue)
        {
            entity = await _db.SterilizationSchedules.FirstOrDefaultAsync(x => x.Id == dto.Id.Value) ?? throw new KeyNotFoundException();
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = userId;
        }
        else
        {
            entity = new SterilizationSchedule
            {
                Id = Guid.NewGuid(),
                ScheduleCode = $"STR-{DateTime.Now:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };
            _db.SterilizationSchedules.Add(entity);
        }
        entity.ScheduledAt = dto.ScheduledAt;
        entity.AreaType = dto.AreaType;
        entity.RoomId = dto.RoomId;
        entity.DepartmentId = dto.DepartmentId;
        entity.AreaCode = dto.AreaCode;
        entity.SterilizationMethod = dto.SterilizationMethod;
        entity.Agent = dto.Agent;
        entity.DurationMinutes = dto.DurationMinutes;
        entity.AssignedStaff = dto.AssignedStaff;
        entity.StartedAt = dto.StartedAt;
        entity.CompletedAt = dto.CompletedAt;
        entity.CultureSampleCode = dto.CultureSampleCode;
        entity.CultureResult = dto.CultureResult;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return (await GetScheduleAsync(entity.Id))!;
    }

    public async Task<SterilizationScheduleDto?> UpdateScheduleStatusAsync(Guid id, int newStatus, string? cultureResult, string? userId)
    {
        var entity = await _db.SterilizationSchedules.FirstOrDefaultAsync(x => x.Id == id);
        if (entity == null) return null;
        // STATE GUARD: chỉ cho phép transition hợp lệ (0→1→2, 1→3, 0→4, 1→4)
        Nangcap23StateMachine.EnsureValidSterilizationTransition(entity.Status, newStatus);
        entity.Status = newStatus;
        if (newStatus == 1) entity.StartedAt = DateTime.UtcNow;
        if (newStatus == 2) entity.CompletedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(cultureResult)) entity.CultureResult = cultureResult;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;
        await _db.SaveChangesAsync();
        return await GetScheduleAsync(id);
    }
}

