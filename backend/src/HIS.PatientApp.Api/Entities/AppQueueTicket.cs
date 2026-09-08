namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Vé xếp hàng mà app đã xin hộ một tài khoản (HSMT I.2 #3).
///
/// Hai lý do phải giữ lại bên này, chứ không chỉ gọi HIS rồi quên:
/// <list type="number">
/// <item><b>Chặn xin trùng.</b> Người dùng app chưa liên kết hồ sơ bệnh án thì bên HIS là một khách
///       vô danh — HIS không có cách nào biết hai lần xin số là cùng một người. Danh tính duy nhất
///       tồn tại là tài khoản app, nên phép chống trùng phải nằm ở đây.</item>
/// <item><b>Chặn dòm vé người khác.</b> Mã vé là GUID nhưng "khó đoán" không phải là quyền. Có bảng
///       này thì hỏi trạng thái vé mới kiểm được vé đó có phải của người đang đăng nhập không.</item>
/// </list>
///
/// KHÔNG chứa dữ liệu y tế — chỉ mã vé, phòng, ngày.
/// </summary>
public class AppQueueTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AccountId { get; set; }
    public AppAccount? Account { get; set; }

    /// <summary>Id vé bên HIS — khoá để hỏi lại trạng thái.</summary>
    public Guid HisTicketId { get; set; }

    public string TicketCode { get; set; } = string.Empty;
    public int QueueNumber { get; set; }

    public Guid RoomId { get; set; }
    public string? RoomName { get; set; }
    public int QueueType { get; set; }

    /// <summary>Ngày xin số theo lịch Việt Nam (không giờ) — khoá chống trùng trong ngày.</summary>
    public DateOnly QueueDate { get; set; }

    public int Priority { get; set; }
    public bool PriorityVerified { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
