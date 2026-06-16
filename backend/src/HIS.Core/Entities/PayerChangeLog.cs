namespace HIS.Core.Entities;

/// <summary>
/// Audit log mỗi lần đổi đối tượng thanh toán (BHYT ↔ Dịch vụ ↔ Viện phí).
/// Chống gian lận tiền: ghi vết mọi thay đổi PatientType + chênh lệch tiền BN.
/// </summary>
public class PayerChangeLog : BaseEntity
{
    /// <summary>Hồ sơ bệnh án liên quan (null nếu đổi per-dòng không gắn trực tiếp record)</summary>
    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    /// <summary>Dòng dịch vụ CLS/PTTT (ServiceRequestDetail.Id) — null nếu đổi theo đơn thuốc</summary>
    public Guid? ServiceRequestDetailId { get; set; }

    /// <summary>Dòng thuốc/VTYT (PrescriptionDetail.Id) — null nếu đổi theo dịch vụ</summary>
    public Guid? PrescriptionDetailId { get; set; }

    /// <summary>
    /// Phạm vi thay đổi: "record" = toàn bộ hồ sơ, "service_line" = từng dòng CLS, "drug_line" = từng dòng thuốc/VTYT
    /// </summary>
    public string ChangeScope { get; set; } = "record";

    /// <summary>Đối tượng trước khi đổi (1=BHYT, 2=ViệnPhí, 3=DịchVụ, 4=KhámSK)</summary>
    public int FromObjectType { get; set; }

    /// <summary>Đối tượng sau khi đổi</summary>
    public int ToObjectType { get; set; }

    /// <summary>Lý do bắt buộc — audit trail</summary>
    public string? Reason { get; set; }

    /// <summary>User thực hiện đổi (lấy từ JWT claim)</summary>
    public Guid ChangedBy { get; set; }

    /// <summary>Tiền BN phải trả trước khi đổi</summary>
    public decimal? OldPatientAmount { get; set; }

    /// <summary>Tiền BN phải trả sau khi đổi</summary>
    public decimal? NewPatientAmount { get; set; }

    /// <summary>Số dòng bị ảnh hưởng (khi đổi theo record/batch)</summary>
    public int AffectedLineCount { get; set; }
}
