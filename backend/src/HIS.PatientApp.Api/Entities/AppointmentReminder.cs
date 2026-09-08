namespace HIS.PatientApp.Api.Entities;

/// <summary>
/// Bản sao nhẹ của lịch hẹn, chỉ để biết KHI NÀO cần nhắc (HSMT I.2 #4 "nhận thông báo xác nhận /
/// nhắc lịch").
///
/// Vì sao phải có bảng này thay vì hỏi HIS mỗi lần: lịch hẹn nằm trong HIS, mà HIS không có cách tra
/// "mọi lịch hẹn sắp tới của những người dùng app". Hỏi từng tài khoản một là mỗi vòng quét lại nện
/// vào HIS đúng bằng số tài khoản. Giữ lại đây ba thông tin tối thiểu — mã lịch, thời điểm, đã nhắc
/// chưa — thì worker chỉ đọc CSDL của chính mình.
///
/// KHÔNG chứa dữ liệu y tế: không chẩn đoán, không lý do khám.
/// </summary>
public class AppointmentReminder
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AccountId { get; set; }
    public AppAccount? Account { get; set; }

    /// <summary>Mã lịch hẹn bên HIS. Dùng làm khoá đối chiếu khi đồng bộ lại.</summary>
    public string AppointmentCode { get; set; } = string.Empty;

    /// <summary>Thời điểm hẹn, lưu UTC.</summary>
    public DateTime AppointmentAt { get; set; }

    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public string? RoomName { get; set; }

    /// <summary>Trạng thái bên HIS lần đồng bộ gần nhất. ≥2 hoặc =4 thì thôi nhắc.</summary>
    public int Status { get; set; }

    public DateTime? RemindedDayBeforeAt { get; set; }
    public DateTime? RemindedHourBeforeAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SyncedAt { get; set; }

    /// <summary>Lịch đã đến khám, đã huỷ hoặc không đến thì không nhắc nữa.</summary>
    public bool IsActive => Status < 2;
}
