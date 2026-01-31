namespace HIS.Core.Entities;

/// <summary>
/// Người dùng hệ thống - User
/// </summary>
public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string? UserCode { get; set; } // Mã người dùng
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? EmployeeCode { get; set; } // Mã nhân viên
    public string? LicenseNumber { get; set; } // Số chứng chỉ hành nghề
    public string? Title { get; set; } // Chức danh: Bác sĩ, Điều dưỡng, Kỹ thuật viên...
    public string? Degree { get; set; } // Học vị: Thạc sĩ, Tiến sĩ...
    public string? Specialty { get; set; } // Chuyên khoa
    public string? SignaturePath { get; set; } // Đường dẫn chữ ký số
    public int UserType { get; set; } // 1-Bác sĩ, 2-Điều dưỡng, 3-Kỹ thuật viên, 4-Dược sĩ, 5-Nhân viên, 6-Admin

    public Guid? DepartmentId { get; set; } // Khoa/phòng làm việc
    public virtual Department? Department { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

/// <summary>
/// Vai trò - Role
/// </summary>
public class Role : BaseEntity
{
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

/// <summary>
/// Liên kết User-Role
/// </summary>
public class UserRole : BaseEntity
{
    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public Guid RoleId { get; set; }
    public virtual Role Role { get; set; } = null!;
}

/// <summary>
/// Quyền hạn - Permission
/// </summary>
public class Permission : BaseEntity
{
    public string PermissionCode { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string? Module { get; set; } // Module: Reception, OPD, IPD, Pharmacy...
    public string? Description { get; set; }

    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

/// <summary>
/// Liên kết Role-Permission
/// </summary>
public class RolePermission : BaseEntity
{
    public Guid RoleId { get; set; }
    public virtual Role Role { get; set; } = null!;

    public Guid PermissionId { get; set; }
    public virtual Permission Permission { get; set; } = null!;
}
