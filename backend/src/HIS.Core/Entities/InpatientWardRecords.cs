namespace HIS.Core.Entities;

/// <summary>
/// Phiếu chăm sóc điều dưỡng NỘI TRÚ theo ca, gắn với lần nhập viện (QA0915 wave-2).
/// Trước đây CreateNursingCareSheetAsync / GetNursingCareSheetsAsync là stub in-memory: màn v2
/// NursingSection báo "Đã lưu" mà không có gì được ghi. Bảng <c>NursingCareSheets</c> sẵn có gắn
/// với <c>ExaminationId</c> (ngoại trú) và thiếu cột ca / hoạt động chăm sóc nên không dùng lại được.
/// Bảng: <c>InpatientNursingCareSheets</c> (migration đề xuất — xem scratchpad/ipd/migration_proposal.sql).
/// </summary>
public class InpatientNursingCareSheet : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid MedicalRecordId { get; set; }
    public DateTime CareDate { get; set; }
    public int Shift { get; set; }                  // 1-Sáng, 2-Chiều, 3-Đêm
    public Guid NurseId { get; set; }

    public string? PatientCondition { get; set; }
    public string? Consciousness { get; set; }
    public string? HygieneActivities { get; set; }
    public string? MedicationActivities { get; set; }
    public string? NutritionActivities { get; set; }
    public string? MovementActivities { get; set; }
    public string? SpecialMonitoring { get; set; }
    public string? IssuesAndActions { get; set; }
    public string? Notes { get; set; }
    public int? CareLevel { get; set; }             // 1-Cấp 1, 2-Cấp 2
}

/// <summary>
/// Yêu cầu tạm ứng do khoa nội trú gửi thu ngân (QA0915 wave-2). Trước đây là stub in-memory.
///
/// <para>Cố ý KHÔNG ghi vào <c>Deposits</c>: dòng ở đó là TIỀN ĐÃ THU (báo cáo billing cộng
/// <c>Amount</c> của mọi phiếu Status != 3), ghi một yêu cầu chưa thu vào đó sẽ làm sai số quỹ.
/// Trạng thái "Đã thu" được suy ra khi đọc: có phiếu <c>Deposits</c> cùng hồ sơ, không hủy, lập
/// sau thời điểm yêu cầu.</para>
/// </summary>
public class InpatientDepositRequest : BaseEntity
{
    public Guid AdmissionId { get; set; }
    public Guid MedicalRecordId { get; set; }
    public Guid PatientId { get; set; }
    public Guid DepartmentId { get; set; }
    public decimal RequestedAmount { get; set; }
    public string? Reason { get; set; }
    public Guid RequestedById { get; set; }
    public DateTime RequestDate { get; set; }
    public int Status { get; set; }                 // 0-Chờ thu, 2-Đã hủy (1-Đã thu suy ra từ Deposits)
}
