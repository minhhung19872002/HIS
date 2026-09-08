namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Liên kết gia đình: một tài khoản được xem hồ sơ của một người thân (HSMT I.2 #7).
///
/// <para>Sống trong CSDL của app chứ không phải trong HIS, vì đây là quan hệ giữa <b>tài khoản app</b>
/// và <b>hồ sơ bệnh án</b> — HIS không biết gì về tài khoản app.</para>
///
/// <para><b>Không có bản ghi ở trạng thái <see cref="AppFamilyLinkStatus.Verified"/> thì không xem
/// được gì.</b> Đây là ranh giới giữa "chăm sóc người nhà" và "đọc trộm bệnh án người khác", nên mọi
/// đường vào dữ liệu của người thân đều phải đi qua bảng này.</para>
/// </summary>
public class AppFamilyLink
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Tài khoản đứng tên liên kết — người sẽ xem hồ sơ của người thân.</summary>
    public Guid OwnerAccountId { get; set; }
    public AppAccount? Owner { get; set; }

    /// <summary>Hồ sơ bệnh án bên HIS của người thân.</summary>
    public Guid MemberPatientId { get; set; }
    public string MemberPatientCode { get; set; } = string.Empty;

    /// <summary>Tên hiển thị trong app. Mặc định lấy từ hồ sơ HIS.</summary>
    public string MemberName { get; set; } = string.Empty;

    /// <summary>Quan hệ do người dùng tự khai: Cha, Mẹ, Con, Vợ/Chồng, Khác…</summary>
    public string Relationship { get; set; } = string.Empty;

    public string Status { get; set; } = AppFamilyLinkStatus.Pending;

    /// <summary>
    /// Cách liên kết được chấp thuận — ghi lại để về sau trả lời được câu "vì sao người này xem
    /// được hồ sơ của người kia".
    /// </summary>
    public string? VerificationMethod { get; set; }

    public DateTime? VerifiedAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    /// <summary>Xem kết quả khám chữa bệnh của người thân.</summary>
    public bool CanViewResults { get; set; } = true;

    /// <summary>Đặt lịch khám hộ.</summary>
    public bool CanBookAppointments { get; set; } = true;

    /// <summary>Lấy số thứ tự hộ.</summary>
    public bool CanTakeQueueNumber { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive => Status == AppFamilyLinkStatus.Verified;
}

public static class AppFamilyLinkStatus
{
    /// <summary>Đã tạo nhưng chưa xác minh — chưa xem được gì.</summary>
    public const string Pending = "Pending";

    public const string Verified = "Verified";

    /// <summary>Đã gỡ. Giữ lại bản ghi thay vì xoá, để nhật ký truy cập cũ còn giải thích được.</summary>
    public const string Revoked = "Revoked";
}
