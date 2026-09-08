namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Nhật ký truy cập hồ sơ: ai xem hồ sơ của ai, lúc nào.
///
/// Bắt buộc với dữ liệu y tế và là yêu cầu tường minh của HSMT cho module tra cứu của nhân viên CSKH
/// (I.3 #2). Ghi cả khi người bệnh xem hồ sơ thành viên gia đình — đó cũng là một người xem hồ sơ
/// của người khác.
///
/// Bảng này CHỈ THÊM, không sửa không xoá.
/// </summary>
public class AccessAuditLog
{
    public long Id { get; set; }

    /// <summary>Tài khoản app đã thực hiện (null nếu là nhân viên đăng nhập bằng tài khoản HIS).</summary>
    public Guid? ActorAccountId { get; set; }

    /// <summary>Id nhân viên bên HIS, khi hành động do CSKH thực hiện.</summary>
    public Guid? ActorHisUserId { get; set; }

    /// <summary>patient | staff — ai đang xem.</summary>
    public string ActorType { get; set; } = string.Empty;

    /// <summary>Hồ sơ bệnh nhân bị xem (id bên HIS).</summary>
    public Guid TargetPatientId { get; set; }

    /// <summary>Ví dụ: view_lab_result, view_imaging, download_pdf, take_queue_number_on_behalf.</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Loại + id của đối tượng cụ thể, ví dụ "lab_result:9f3c…".</summary>
    public string? ResourceRef { get; set; }

    public string? Ip { get; set; }
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
