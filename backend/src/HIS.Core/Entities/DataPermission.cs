namespace HIS.Core.Entities;

/// <summary>
/// NangCap26 — I.15 "Quyền dữ liệu phòng, kho": một NHÓM QUYỀN DỮ LIỆU gom phạm vi
/// khoa/phòng · kho · loại điều trị · đối tượng bệnh nhân. Khác hoàn toàn với quyền
/// CHỨC NĂNG (menu/permission) đã có — đây là row-level scope.
/// </summary>
public class DataPermissionGroup : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual ICollection<DataPermissionGroupItem> Items { get; set; } = new List<DataPermissionGroupItem>();
}

/// <summary>
/// Một dòng phạm vi trong nhóm quyền dữ liệu.
/// ScopeType: Department · Room · Warehouse · TreatmentType · PatientObject
/// ScopeId dùng cho Department/Room/Warehouse; ScopeValue dùng cho loại điều trị /
/// đối tượng BN (giá trị số hoặc mã).
/// </summary>
public class DataPermissionGroupItem : BaseEntity
{
    public Guid GroupId { get; set; }
    public string ScopeType { get; set; } = string.Empty;
    public Guid? ScopeId { get; set; }
    public string? ScopeValue { get; set; }
    public string? ScopeName { get; set; } // hiển thị nhanh, tránh join khi liệt kê

    public virtual DataPermissionGroup? Group { get; set; }
}

/// <summary>
/// Gán nhóm quyền dữ liệu cho người dùng (I.16 "Phân quyền dữ liệu người dùng").
/// Người dùng KHÔNG được gán nhóm nào = không giới hạn (fail-open) — tránh chặn nhầm
/// dữ liệu lâm sàng khi mới bật tính năng.
/// </summary>
public class UserDataPermissionGroup : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid GroupId { get; set; }

    public virtual User? User { get; set; }
    public virtual DataPermissionGroup? Group { get; set; }
}
