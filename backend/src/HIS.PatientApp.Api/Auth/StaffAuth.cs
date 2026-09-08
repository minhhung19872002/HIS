using System.Security.Claims;

namespace HIS.PatientApp.Api.Auth;

/// <summary>
/// Xác thực nhân viên bệnh viện trên BFF.
///
/// <para>Web quản trị là một phần của SPA HIS, nên nhân viên đã có sẵn token do <b>HIS Core</b> cấp.
/// BFF chấp nhận chính token đó thay vì bắt họ đăng nhập lần thứ hai — nhân viên chỉ có một danh
/// tính, và cấp cho họ danh tính thứ hai là tự tạo thêm một chỗ để quên thu hồi.</para>
///
/// <para>Đây là lược đồ xác thực <b>thứ hai</b>, tách hẳn khỏi token của người bệnh. Trộn hai lược đồ
/// vào một khoá ký sẽ khiến token bệnh nhân dùng được ở API quản trị.</para>
/// </summary>
public static class StaffAuth
{
    /// <summary>Tên lược đồ JWT dành cho nhân viên HIS.</summary>
    public const string Scheme = "HisStaff";

    /// <summary>Chính sách cho mọi API quản trị app bệnh nhân.</summary>
    public const string AdminPolicy = "PatientAppAdmin";

    /// <summary>Chính sách cho module tra cứu của nhân viên CSKH (HSMT I.3 #2).</summary>
    public const string LookupPolicy = "PatientAppLookup";

    /// <summary>
    /// Vai trò được quản trị app bệnh nhân. Cố ý hẹp: khoá tài khoản và đặt lại mật khẩu của người
    /// bệnh là quyền lớn, không nên rơi vào tay mọi nhân viên có tài khoản HIS.
    ///
    /// Kèm cả tên tiếng Việt vì HIS cấp vai trò theo cả hai cách (xem <c>HIS.Core.Constants.RoleNames</c>):
    /// tài khoản thật trong bệnh viện mang tên "Quản trị hệ thống", còn tài khoản kỹ thuật mang tên
    /// "Admin". Bỏ sót một dạng là khoá cửa với chính người có quyền.
    /// </summary>
    public static readonly string[] AdminRoles =
    {
        "Admin", "Director", "Manager",
        "Quản trị hệ thống",
    };

    /// <summary>
    /// Vai trò được tra cứu hộ người bệnh. Rộng hơn quản trị vì đây đúng là việc hằng ngày của lễ tân
    /// và chăm sóc khách hàng — nhưng vẫn là danh sách đóng, và mọi thao tác đều ghi nhật ký.
    /// </summary>
    public static readonly string[] LookupRoles =
    {
        "Admin", "Director", "Manager",
        "Receptionist", "Nurse", "Doctor", "DepartmentHead",
        "Quản trị hệ thống", "Bác sĩ", "Điều dưỡng", "Lễ tân",
    };

    /// <summary>Id nhân viên bên HIS, lấy từ claim của token HIS.</summary>
    public static Guid GetStaffUserId(this ClaimsPrincipal user) =>
        Guid.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;

    public static string GetStaffName(this ClaimsPrincipal user) =>
        user.FindFirst("fullName")?.Value
        ?? user.FindFirst(ClaimTypes.Name)?.Value
        ?? "";
}
