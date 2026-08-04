using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// NangCap26 — I.15 Quyền dữ liệu phòng/kho · I.16 Phân quyền dữ liệu người dùng.
///
/// ⚠️ FAIL-OPEN có chủ đích: user chưa được gán nhóm nào ⇒ <see cref="EffectiveDataScopeDto.Unrestricted"/>
/// = true, nghĩa là thấy toàn bộ như trước khi có tính năng. Chỉ khi CSYT chủ động gán nhóm
/// thì phạm vi mới bị siết. Fail-close ở đây sẽ chặn nhầm dữ liệu lâm sàng của toàn bộ
/// người dùng hiện hữu ngay khi deploy.
/// </summary>
public class DataPermissionService : IDataPermissionService
{
    private readonly HISDbContext _context;
    public DataPermissionService(HISDbContext context) => _context = context;

    public async Task<List<DataPermissionGroupDto>> GetGroupsAsync(bool activeOnly = false)
    {
        var q = _context.DataPermissionGroups.AsNoTracking().Where(g => !g.IsDeleted);
        if (activeOnly) q = q.Where(g => g.IsActive);

        var groups = await q.OrderBy(g => g.Code).ToListAsync();
        var ids = groups.Select(g => g.Id).ToList();

        var items = await _context.DataPermissionGroupItems.AsNoTracking()
            .Where(i => ids.Contains(i.GroupId) && !i.IsDeleted)
            .ToListAsync();

        var userCounts = await _context.UserDataPermissionGroups.AsNoTracking()
            .Where(u => ids.Contains(u.GroupId) && !u.IsDeleted)
            .GroupBy(u => u.GroupId)
            .Select(g => new { GroupId = g.Key, N = g.Count() })
            .ToDictionaryAsync(x => x.GroupId, x => x.N);

        return groups.Select(g => new DataPermissionGroupDto
        {
            Id = g.Id, Code = g.Code, Name = g.Name, Description = g.Description, IsActive = g.IsActive,
            UserCount = userCounts.TryGetValue(g.Id, out var n) ? n : 0,
            Items = items.Where(i => i.GroupId == g.Id).Select(MapItem).ToList()
        }).ToList();
    }

    public async Task<DataPermissionGroupDto> SaveGroupAsync(SaveDataPermissionGroupDto dto, Guid userId)
    {
        if (string.IsNullOrWhiteSpace(dto.Code)) throw new InvalidOperationException("Thiếu mã nhóm quyền dữ liệu.");
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new InvalidOperationException("Thiếu tên nhóm quyền dữ liệu.");

        var now = DateTime.Now;
        DataPermissionGroup g;
        if (dto.Id.HasValue && dto.Id != Guid.Empty)
        {
            g = await _context.DataPermissionGroups.FirstOrDefaultAsync(x => x.Id == dto.Id && !x.IsDeleted)
                ?? throw new InvalidOperationException("Không tìm thấy nhóm quyền dữ liệu.");
            g.UpdatedAt = now; g.UpdatedBy = userId.ToString();
        }
        else
        {
            var dup = await _context.DataPermissionGroups.AnyAsync(x => x.Code == dto.Code.Trim() && !x.IsDeleted);
            if (dup) throw new InvalidOperationException($"Mã \"{dto.Code}\" đã tồn tại.");
            g = new DataPermissionGroup { Id = Guid.NewGuid(), CreatedAt = now, CreatedBy = userId.ToString() };
            _context.DataPermissionGroups.Add(g);
        }

        g.Code = dto.Code.Trim();
        g.Name = dto.Name.Trim();
        g.Description = dto.Description;
        g.IsActive = dto.IsActive;

        // Ghi đè toàn bộ danh sách phạm vi (đơn giản + đúng ý "sửa nhóm quyền").
        var old = await _context.DataPermissionGroupItems.Where(i => i.GroupId == g.Id && !i.IsDeleted).ToListAsync();
        foreach (var o in old) { o.IsDeleted = true; o.UpdatedAt = now; o.UpdatedBy = userId.ToString(); }

        foreach (var it in dto.Items ?? new List<DataPermissionItemDto>())
        {
            if (string.IsNullOrWhiteSpace(it.ScopeType)) continue;
            _context.DataPermissionGroupItems.Add(new DataPermissionGroupItem
            {
                Id = Guid.NewGuid(),
                GroupId = g.Id,
                ScopeType = it.ScopeType.Trim(),
                ScopeId = it.ScopeId,
                ScopeValue = it.ScopeValue,
                ScopeName = it.ScopeName,
                CreatedAt = now,
                CreatedBy = userId.ToString()
            });
        }

        await _context.SaveChangesAsync();
        return (await GetGroupsAsync()).First(x => x.Id == g.Id);
    }

    public async Task DeleteGroupAsync(Guid id, Guid userId)
    {
        var g = await _context.DataPermissionGroups.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy nhóm quyền dữ liệu.");

        var assigned = await _context.UserDataPermissionGroups.AnyAsync(u => u.GroupId == id && !u.IsDeleted);
        if (assigned) throw new InvalidOperationException("Nhóm đang được gán cho người dùng — hãy gỡ gán trước khi xóa.");

        g.IsDeleted = true; g.UpdatedAt = DateTime.Now; g.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
    }

    public async Task<List<Guid>> GetUserGroupsAsync(Guid targetUserId)
        => await _context.UserDataPermissionGroups.AsNoTracking()
            .Where(u => u.UserId == targetUserId && !u.IsDeleted)
            .Select(u => u.GroupId)
            .ToListAsync();

    public async Task AssignUserGroupsAsync(AssignDataPermissionDto dto, Guid userId)
    {
        if (dto.UserId == Guid.Empty) throw new InvalidOperationException("Thiếu userId.");

        var now = DateTime.Now;
        var current = await _context.UserDataPermissionGroups
            .Where(u => u.UserId == dto.UserId && !u.IsDeleted)
            .ToListAsync();

        var want = (dto.GroupIds ?? new List<Guid>()).Distinct().ToList();

        foreach (var c in current.Where(c => !want.Contains(c.GroupId)))
        {
            c.IsDeleted = true; c.UpdatedAt = now; c.UpdatedBy = userId.ToString();
        }

        var have = current.Where(c => !c.IsDeleted).Select(c => c.GroupId).ToHashSet();
        foreach (var gid in want.Where(g => !have.Contains(g)))
        {
            _context.UserDataPermissionGroups.Add(new UserDataPermissionGroup
            {
                Id = Guid.NewGuid(), UserId = dto.UserId, GroupId = gid,
                CreatedAt = now, CreatedBy = userId.ToString()
            });
        }

        await _context.SaveChangesAsync();
    }

    public async Task<EffectiveDataScopeDto> GetEffectiveScopeAsync(Guid targetUserId)
    {
        var groupIds = await _context.UserDataPermissionGroups.AsNoTracking()
            .Where(u => u.UserId == targetUserId && !u.IsDeleted)
            .Select(u => u.GroupId)
            .ToListAsync();

        // Chưa gán nhóm nào → không giới hạn (fail-open, xem chú thích đầu lớp).
        if (groupIds.Count == 0)
            return new EffectiveDataScopeDto { UserId = targetUserId, Unrestricted = true };

        var activeGroupIds = await _context.DataPermissionGroups.AsNoTracking()
            .Where(g => groupIds.Contains(g.Id) && g.IsActive && !g.IsDeleted)
            .Select(g => g.Id)
            .ToListAsync();

        if (activeGroupIds.Count == 0)
            return new EffectiveDataScopeDto { UserId = targetUserId, Unrestricted = true };

        var items = await _context.DataPermissionGroupItems.AsNoTracking()
            .Where(i => activeGroupIds.Contains(i.GroupId) && !i.IsDeleted)
            .ToListAsync();

        return new EffectiveDataScopeDto
        {
            UserId = targetUserId,
            Unrestricted = false,
            DepartmentIds = ScopeGuids(items, "Department"),
            RoomIds = ScopeGuids(items, "Room"),
            WarehouseIds = ScopeGuids(items, "Warehouse"),
            TreatmentTypes = ScopeValues(items, "TreatmentType"),
            PatientObjects = ScopeValues(items, "PatientObject"),
        };
    }

    private static List<Guid> ScopeGuids(List<DataPermissionGroupItem> items, string type)
        => items.Where(i => i.ScopeType == type && i.ScopeId.HasValue).Select(i => i.ScopeId!.Value).Distinct().ToList();

    private static List<string> ScopeValues(List<DataPermissionGroupItem> items, string type)
        => items.Where(i => i.ScopeType == type && !string.IsNullOrWhiteSpace(i.ScopeValue))
                .Select(i => i.ScopeValue!).Distinct().ToList();

    private static DataPermissionItemDto MapItem(DataPermissionGroupItem i) => new()
    {
        Id = i.Id, ScopeType = i.ScopeType, ScopeId = i.ScopeId,
        ScopeValue = i.ScopeValue, ScopeName = i.ScopeName
    };
}
