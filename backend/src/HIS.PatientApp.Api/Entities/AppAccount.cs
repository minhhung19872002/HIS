namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Tài khoản app của người bệnh. Sống trong CSDL RIÊNG của app (PostgreSQL), không phải trong HIS —
/// vì HSMT đòi những thứ mà <c>PortalAccount</c> của HIS không có: buộc đổi mật khẩu lần đầu, mã PIN,
/// sinh trắc học, quản lý thiết bị đăng nhập.
///
/// Liên kết sang HIS chỉ bằng <see cref="HisPatientId"/>. Mọi dữ liệu y tế nằm lại HIS và được lấy
/// qua <c>IHisConnector</c>; bảng này KHÔNG bao giờ chứa thông tin khám chữa bệnh.
/// </summary>
public class AppAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Số điện thoại — định danh đăng nhập, đã chuẩn hoá về dạng +84xxxxxxxxx.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Id bệnh nhân bên HIS. Null khi tài khoản vừa đăng ký mà chưa liên kết hồ sơ.</summary>
    public Guid? HisPatientId { get; set; }

    /// <summary>Mã bệnh nhân bên HIS — giữ lại để hiển thị và để nhân viên CSKH tra cứu.</summary>
    public string? HisPatientCode { get; set; }

    public string FullName { get; set; } = string.Empty;

    /// <summary>Active | Suspended | Locked. Quản trị viên khoá tài khoản qua web quản trị.</summary>
    public string Status { get; set; } = AppAccountStatus.Active;

    /// <summary>
    /// Buộc đổi mật khẩu (HSMT I.2 #9). Bật khi tài khoản do quầy cấp hoặc admin reset — tức mật khẩu
    /// hiện tại là thứ người khác biết. Tắt khi chính người bệnh đổi xong.
    /// </summary>
    public bool MustChangePassword { get; set; }

    public DateTime? PasswordChangedAt { get; set; }

    /// <summary>
    /// Con dấu thu hồi phiên. Mọi access token mang giá trị này; đổi mật khẩu / đăng xuất từ xa /
    /// phát hiện refresh-token bị dùng lại đều xoay nó, khiến token cũ chết NGAY chứ không đợi hết hạn.
    /// Đây là cơ chế đứng sau "đăng xuất từ xa thiết bị" của HSMT.
    /// </summary>
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>Mã PIN 6 số (HSMT I.2 #9), băm bằng BCrypt như mật khẩu. Null = chưa đặt.</summary>
    public string? PinHash { get; set; }

    public int PinFailedCount { get; set; }
    public DateTime? PinLockedUntil { get; set; }

    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEndAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<AppDevice> Devices { get; set; } = new List<AppDevice>();

    public bool IsLockedOut(DateTime now) => LockoutEndAt.HasValue && LockoutEndAt > now;
    public bool IsPinLocked(DateTime now) => PinLockedUntil.HasValue && PinLockedUntil > now;
}

public static class AppAccountStatus
{
    public const string Active = "Active";
    public const string Suspended = "Suspended";
    public const string Locked = "Locked";
}
