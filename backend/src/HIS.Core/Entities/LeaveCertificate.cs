namespace HIS.Core.Entities;

/// <summary>
/// Giấy chứng nhận nghỉ việc hưởng BHXH — nghỉ ốm (mẫu C65-HD, TT 56/2017).
///
/// <para>#218/T3 (migration 177): trước đây `CreateSickLeaveAsync` là hàm rỗng — trả về một DTO với
/// `Id = Guid.NewGuid()` rồi thôi, không ghi dòng nào. Bệnh viện cấp giấy cho người bệnh mà không
/// giữ lại bản ghi nào: không tra cứu lại được đã cấp cho ai, bao nhiêu ngày, và không đối chiếu
/// được khi cơ quan BHXH hỏi.</para>
/// </summary>
public class SickLeave : BaseEntity
{
    /// <summary>Số giấy — cơ quan BHXH dùng số này để định danh tờ giấy. Duy nhất.</summary>
    public string CertificateNumber { get; set; } = string.Empty;

    public Guid ExaminationId { get; set; }
    public virtual Examination? Examination { get; set; }

    public Guid? MedicalRecordId { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    public int Days { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string? Reason { get; set; }

    /// <summary>
    /// Chẩn đoán CHỤP LẠI tại thời điểm cấp, cố ý KHÔNG đọc động từ lượt khám.
    /// Giấy đã cấp là tuyên bố đóng băng tại một thời điểm — bác sĩ sửa chẩn đoán sau đó thì tờ giấy
    /// đã phát ra tay người bệnh không được đổi theo. Đúng bài học §27/§33 của đợt #218.
    /// </summary>
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    /// <summary>Số thẻ BHYT và nơi làm việc, cũng chụp lại lúc cấp vì giấy in ra mang các thông tin này.</summary>
    public string? InsuranceNumber { get; set; }
    public string? Workplace { get; set; }

    public Guid? IssuedByDoctorId { get; set; }
    public DateTime IssuedAt { get; set; }
}

/// <summary>
/// Giấy chứng nhận nghỉ việc hưởng BHXH — nghỉ thai sản. Cùng lý do tồn tại với <see cref="SickLeave"/>,
/// thêm số tuần thai tại thời điểm cấp.
/// </summary>
public class MaternityLeave : BaseEntity
{
    public string CertificateNumber { get; set; } = string.Empty;

    public Guid ExaminationId { get; set; }
    public virtual Examination? Examination { get; set; }

    public Guid? MedicalRecordId { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient? Patient { get; set; }

    public int Days { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public int? GestationalWeeks { get; set; }
    public string? Reason { get; set; }

    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? InsuranceNumber { get; set; }
    public string? Workplace { get; set; }

    public Guid? IssuedByDoctorId { get; set; }
    public DateTime IssuedAt { get; set; }
}
