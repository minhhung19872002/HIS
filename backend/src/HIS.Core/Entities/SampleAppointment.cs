namespace HIS.Core.Entities;

/// <summary>
/// Hẹn lấy mẫu / tái xét nghiệm định kỳ — Prompt 7 Đợt 2.
/// Cho phép đặt lịch hẹn lấy mẫu theo ngày / tuần / tháng.
/// </summary>
public class SampleAppointment : BaseEntity
{
    public Guid PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    /// <summary>ServiceRequestDetail liên quan (nullable — có thể tạo hẹn trước khi có phiếu chỉ định)</summary>
    public Guid? ServiceRequestDetailId { get; set; }
    public virtual ServiceRequestDetail? ServiceRequestDetail { get; set; }

    /// <summary>Ngày giờ hẹn</summary>
    public DateTime AppointmentAt { get; set; }

    /// <summary>Loại lặp: None / Daily / Weekly / Monthly</summary>
    public string RecurrenceType { get; set; } = "None";

    /// <summary>Số lần lặp (0 = không giới hạn, áp dụng khi RecurrenceType != None)</summary>
    public int RecurrenceCount { get; set; } = 0;

    /// <summary>Loại xét nghiệm / ghi chú</summary>
    public string? ServiceName { get; set; }
    public string? Note { get; set; }

    /// <summary>Trạng thái: Scheduled / Completed / Cancelled</summary>
    public string Status { get; set; } = "Scheduled";

    public Guid? CreatedByUserId { get; set; }
}
