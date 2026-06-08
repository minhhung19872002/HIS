namespace HIS.Core.Entities;

/// <summary>
/// Dấu hiệu sinh tồn nội trú (theo dõi chức năng sống tại giường), gắn theo lần nhập viện.
/// Trước đây CreateVitalSignsAsync là stub in-memory → dữ liệu nhập bị mất
/// (audit luồng nghiệp vụ 2026-06-06 #3).
/// </summary>
public class InpatientVitalSign : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public DateTime RecordTime { get; set; }

    public decimal? Temperature { get; set; }   // Nhiệt độ (°C)
    public int? Pulse { get; set; }              // Mạch (lần/phút)
    public int? RespiratoryRate { get; set; }    // Nhịp thở (lần/phút)
    public int? SystolicBP { get; set; }         // HA tâm thu
    public int? DiastolicBP { get; set; }        // HA tâm trương
    public decimal? SpO2 { get; set; }           // SpO2 (%)
    public decimal? Weight { get; set; }         // Cân nặng (kg)
    public decimal? Height { get; set; }         // Chiều cao (cm)

    public string? Notes { get; set; }
    public Guid RecordedBy { get; set; }         // Người ghi (User)
}
