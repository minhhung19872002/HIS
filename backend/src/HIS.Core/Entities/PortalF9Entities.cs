namespace HIS.Core.Entities;

/// <summary>
/// Yêu cầu cấp lại đơn thuốc từ Cổng bệnh nhân (F9). Trước đây RequestRefillAsync chỉ trả DTO,
/// không lưu → BN bấm "cấp lại" mà hệ thống không ghi nhận.
/// </summary>
public class RefillRequest : BaseEntity
{
    public Guid PrescriptionId { get; set; }
    public string DeliveryOption { get; set; } = "Pickup"; // Pickup, Delivery
    public string? DeliveryAddress { get; set; }
    public string? DeliveryPhone { get; set; }
    public Guid? PreferredPharmacyId { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Dispensed
    public DateTime RequestedAt { get; set; } = DateTime.Now;
}

/// <summary>
/// Phản hồi/đánh giá dịch vụ từ Cổng bệnh nhân (F9). Trước đây SubmitFeedbackAsync chỉ trả DTO rỗng.
/// </summary>
public class ServiceFeedback : BaseEntity
{
    public Guid PatientId { get; set; }
    public Guid VisitId { get; set; }
    public int OverallRating { get; set; }
    public int DoctorRating { get; set; }
    public int StaffRating { get; set; }
    public int FacilityRating { get; set; }
    public int WaitTimeRating { get; set; }
    public string? Comments { get; set; }
    public bool WouldRecommend { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.Now;
}
