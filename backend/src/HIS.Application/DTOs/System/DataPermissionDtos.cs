namespace HIS.Application.DTOs.System;

/// <summary>NangCap26 I.15 — nhóm quyền dữ liệu (row-level scope).</summary>
public class DataPermissionGroupDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int UserCount { get; set; }
    public List<DataPermissionItemDto> Items { get; set; } = new();
}

/// <summary>Một phạm vi trong nhóm quyền dữ liệu.</summary>
public class DataPermissionItemDto
{
    public Guid Id { get; set; }
    /// <summary>Department · Room · Warehouse · TreatmentType · PatientObject</summary>
    public string ScopeType { get; set; } = string.Empty;
    public Guid? ScopeId { get; set; }
    public string? ScopeValue { get; set; }
    public string? ScopeName { get; set; }
}

public class SaveDataPermissionGroupDto
{
    public Guid? Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public List<DataPermissionItemDto> Items { get; set; } = new();
}

/// <summary>NangCap26 I.16 — gán nhóm quyền dữ liệu cho người dùng.</summary>
public class AssignDataPermissionDto
{
    public Guid UserId { get; set; }
    public List<Guid> GroupIds { get; set; } = new();
}

/// <summary>
/// Phạm vi dữ liệu hiệu lực của 1 user sau khi gộp các nhóm được gán.
/// Unrestricted = true nghĩa là user chưa gán nhóm nào → KHÔNG giới hạn (fail-open).
/// </summary>
public class EffectiveDataScopeDto
{
    public Guid UserId { get; set; }
    public bool Unrestricted { get; set; }
    public List<Guid> DepartmentIds { get; set; } = new();
    public List<Guid> RoomIds { get; set; } = new();
    public List<Guid> WarehouseIds { get; set; } = new();
    public List<string> TreatmentTypes { get; set; } = new();
    public List<string> PatientObjects { get; set; } = new();
}
