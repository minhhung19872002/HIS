namespace HIS.Core.Entities;

/// <summary>
/// Hồ sơ bệnh án - MedicalRecord
/// </summary>
public class MedicalRecord : BaseEntity
{
    public string MedicalRecordCode { get; set; } = string.Empty; // Số hồ sơ
    public string? InpatientCode { get; set; } // Số vào viện (nội trú)
    public string? ArchiveCode { get; set; } // Số lưu trữ

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    // Thông tin đăng ký
    public DateTime AdmissionDate { get; set; } // Ngày vào viện
    public DateTime? DischargeDate { get; set; } // Ngày ra viện
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ, 4-Khám sức khỏe
    public int TreatmentType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Cấp cứu

    // BHYT
    public string? InsuranceNumber { get; set; }
    public DateTime? InsuranceExpireDate { get; set; }
    public string? InsuranceFacilityCode { get; set; }
    public int InsuranceRightRoute { get; set; } // 1-Đúng tuyến, 2-Trái tuyến, 3-Thông tuyến
    public int? InsuranceCoverageRate { get; set; } // Tỷ lệ BHYT chi trả: 80, 95, 100 (%)
    public bool InsuranceFiveYearContinuous { get; set; } // BHYT 5 năm liên tục (tăng mức hưởng)

    // Giấy chuyển viện (referral from another facility)
    public string? ReferralFromFacilityCode { get; set; }
    public string? ReferralFromFacilityName { get; set; }
    public string? ReferralIcdCode { get; set; }
    public DateTime? ReferralDate { get; set; }

    // Chẩn đoán
    public string? InitialDiagnosis { get; set; } // Chẩn đoán ban đầu
    public string? MainDiagnosis { get; set; } // Chẩn đoán chính
    public string? MainIcdCode { get; set; } // Mã ICD chính
    public string? SubDiagnosis { get; set; } // Chẩn đoán phụ
    public string? SubIcdCodes { get; set; } // Mã ICD phụ (JSON)
    public string? ExternalCause { get; set; } // Nguyên nhân ngoài

    // Kết quả điều trị
    public int? TreatmentResult { get; set; } // 1-Khỏi, 2-Đỡ, 3-Không thay đổi, 4-Nặng hơn, 5-Tử vong
    public int? DischargeType { get; set; } // 1-Ra viện, 2-Chuyển viện, 3-Trốn viện, 4-Xin về, 5-Tử vong
    public string? DischargeNote { get; set; }

    // Khoa/Phòng
    public Guid? DepartmentId { get; set; } // Khoa điều trị
    public virtual Department? Department { get; set; }
    public Guid? RoomId { get; set; } // Phòng/Giường
    public virtual Room? Room { get; set; }
    public Guid? BedId { get; set; }
    public virtual Bed? Bed { get; set; }

    // Bác sĩ
    public Guid? DoctorId { get; set; } // Bác sĩ điều trị
    public virtual User? Doctor { get; set; }

    // Trạng thái
    public int Status { get; set; } // See MedicalRecordStatus: 0-Chờ khám, 1-Đang khám, 2-Chờ kết luận, 3-Hoàn thành, 4-Đã thanh toán, 5-Chờ CLS, 6-Hủy
    public bool IsClosed { get; set; } // Đã đóng bệnh án (⚠️ billing dùng làm khóa viện phí — KHÔNG trùng dụng cho khóa EMR)

    // TT46 (2026-06-12): khóa nội dung HSBA sau khi kết thúc — NULL = chưa khóa.
    // KHÔNG dùng Status=5 (đó là PendingCLS) và KHÔNG dùng IsClosed (billing chiếm). Mig 95.
    public DateTime? EmrFinalizedAt { get; set; }
    public Guid? EmrFinalizedBy { get; set; }

    // Navigation
    public virtual ICollection<Examination> Examinations { get; set; } = new List<Examination>();
    public virtual ICollection<ServiceRequest> ServiceRequests { get; set; } = new List<ServiceRequest>();
    public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
}

/// <summary>
/// Lượt khám - Examination
/// </summary>
public class Examination : BaseEntity
{
    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public int ExaminationType { get; set; } // 1-Khám chính, 2-Khám thêm, 3-Khám kết hợp
    public int QueueNumber { get; set; } // Số thứ tự

    /// <summary>
    /// Khám thêm CK khác: ParentExaminationId trỏ về phiên khám chính cùng ngày.
    /// Quy tắc BHYT: chỉ phiên cuối cùng (nơi bệnh nhân hoàn tất) được in bảng kê tổng hợp.
    /// </summary>
    public Guid? ParentExaminationId { get; set; }
    public virtual Examination? ParentExamination { get; set; }

    /// <summary>
    /// Đã in chi phí (bảng kê) — sau khi in không sửa được phiên khám nữa;
    /// cần gọi CancelPrintBill trước khi chỉnh sửa.
    /// </summary>
    public bool IsBillPrinted { get; set; }
    public DateTime? BillPrintedAt { get; set; }
    public Guid? BillPrintedBy { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Khoa/Phòng khám
    public Guid DepartmentId { get; set; }
    public virtual Department Department { get; set; } = null!;
    public Guid RoomId { get; set; }
    public virtual Room Room { get; set; } = null!;

    // Bác sĩ
    public Guid? DoctorId { get; set; }
    public virtual User? Doctor { get; set; }

    // Hỏi bệnh - Khám
    public string? ChiefComplaint { get; set; } // Lý do khám
    public string? PresentIllness { get; set; } // Bệnh sử
    public string? PhysicalExamination { get; set; } // Khám toàn thân
    public string? SystemsReview { get; set; } // Khám bộ phận

    // Dấu hiệu sinh tồn
    public decimal? Temperature { get; set; } // Nhiệt độ
    public int? Pulse { get; set; } // Mạch
    public int? BloodPressureSystolic { get; set; } // Huyết áp tâm thu
    public int? BloodPressureDiastolic { get; set; } // Huyết áp tâm trương
    public int? RespiratoryRate { get; set; } // Nhịp thở
    public decimal? Height { get; set; } // Chiều cao (cm)
    public decimal? Weight { get; set; } // Cân nặng (kg)
    public decimal? SpO2 { get; set; } // SpO2
    public decimal? BMI { get; set; }

    // Chẩn đoán
    public string? InitialDiagnosis { get; set; }
    public string? MainDiagnosis { get; set; }
    public string? MainIcdCode { get; set; }
    public string? SubDiagnosis { get; set; }
    public string? SubIcdCodes { get; set; }

    // Kết luận
    public int? ConclusionType { get; set; } // 1-Cho về, 2-Kê đơn, 3-Nhập viện, 4-Chuyển viện, 5-Hẹn khám, 6-Tử vong
    public string? ConclusionNote { get; set; }
    public DateTime? FollowUpDate { get; set; } // Ngày hẹn tái khám
    public string? TreatmentPlan { get; set; } // Phương hướng điều trị

    // Yêu cầu nhập viện — lưu đủ để tạo hồ sơ nội trú sau này
    public Guid? HospitalizationDepartmentId { get; set; } // Khoa nội trú BN được chuyển vào
    public bool HospitalizationIsEmergency { get; set; }   // Có phải cấp cứu không
    public string? HospitalizationDiagnosisCode { get; set; } // ICD-10 tại thời điểm yêu cầu
    public string? HospitalizationDiagnosisName { get; set; } // Tên chẩn đoán kèm theo

    // Yêu cầu chuyển viện — lưu có cấu trúc thay vì gộp vào ConclusionNote
    public string? TransferToHospital { get; set; }    // Tên cơ sở chuyển đến
    public string? TransferTransportMethod { get; set; } // Phương tiện vận chuyển
    public string? TransferDiagnosisCode { get; set; }  // ICD-10 khi chuyển
    public string? TransferDiagnosisName { get; set; }  // Tên chẩn đoán khi chuyển
    public string? TransferReason { get; set; }         // Lý do chuyển viện

    /// <summary>
    /// Lý do HỦY lượt khám. Thêm 2026-09-04 (#218/T3, migration 174).
    /// Trước đây `CancelExaminationAsync` nhét lý do hủy vào <see cref="ConclusionNote"/>, ghi đè
    /// mất kết luận khám của bác sĩ — cùng bài học với dòng "Yêu cầu chuyển viện — lưu có cấu trúc
    /// thay vì gộp vào ConclusionNote" ở trên.
    /// </summary>
    public string? CancelReason { get; set; }

    // Chú thích cũ bỏ sót giá trị 5. Từ vựng đầy đủ ở HIS.Core.Constants.ExaminationStatus.
    public int Status { get; set; } // 0-Chờ khám, 1-Đang khám, 2-Chờ CLS, 3-Chờ kết luận, 4-Hoàn thành, 5-Hủy
}

/// <summary>
/// Lưu trữ hồ sơ bệnh án - Medical Record Archive
/// </summary>
public class MedicalRecordArchive : BaseEntity
{
    public string ArchiveCode { get; set; } = string.Empty; // Mã lưu trữ
    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public string? Diagnosis { get; set; }
    public string? TreatmentResult { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }

    // Vị trí lưu trữ
    public string? StorageLocation { get; set; } // Kho lưu trữ
    public string? ShelfNumber { get; set; } // Số kệ/giá
    public string? BoxNumber { get; set; } // Số hộp/thùng

    // Trạng thái: 0-Chờ lưu, 1-Đã lưu, 2-Đang mượn, 3-Đã hủy
    public int Status { get; set; }
    public DateTime? ArchivedDate { get; set; }
    public Guid? ArchivedById { get; set; }
    public virtual User? ArchivedBy { get; set; }

    public int ArchiveYear { get; set; } // Năm lưu trữ

    // Mượn/trả nhanh (K5)
    public bool IsOnLoan { get; set; }
    public Guid? BorrowedByUserId { get; set; }
    public DateTime? BorrowedAt { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public string? BorrowReason { get; set; }

    // ── Bàn giao hồ sơ về kho lưu trữ ───────────────────────────────────────────────────────
    // #218/T3: màn bàn giao (MedicalRecordPlanningService) trước đây đọc chung cột `Status` ở
    // trên, nhưng theo một bộ nghĩa KHÁC hẳn kho lưu trữ:
    //
    //     giá trị │ kho lưu trữ (cột Status ở trên) │ màn bàn giao
    //     ────────┼─────────────────────────────────┼──────────────
    //        2    │ ĐANG MƯỢN                       │ ĐÃ DUYỆT
    //
    // nên hồ sơ đang cho người khác mượn hiện trên màn bàn giao thành "đã duyệt", và bị đếm vào
    // `completedHandovers`. Bàn giao nay có cột riêng. Migration 178.

    /// <summary>0 nháp · 1 đã gửi · 2 đã duyệt · 3 từ chối. NULL = chưa vào luồng bàn giao.</summary>
    public int? HandoverStatus { get; set; }
    public DateTime? HandoverSubmittedAt { get; set; }
    public Guid? HandoverSubmittedById { get; set; }
    public DateTime? HandoverApprovedAt { get; set; }
    public Guid? HandoverApprovedById { get; set; }
    public string? HandoverNote { get; set; }
    public string? HandoverRejectReason { get; set; }

    public virtual ICollection<MedicalRecordBorrowRequest> BorrowRequests { get; set; } = new List<MedicalRecordBorrowRequest>();
}

/// <summary>
/// Yêu cầu SAO CHỤP hồ sơ bệnh án — người bệnh/thân nhân/cơ quan xin bản sao.
///
/// <para>#218/T3: `CreateRecordCopyAsync` trước đây là hàm rỗng (sinh mã bằng `new Random()`,
/// `await Task.CompletedTask`, trả DTO như thể đã lưu) và **chưa có bảng nào để lưu**. Sao chụp hồ
/// sơ là việc phải lưu vết theo TT 46/2018: ai xin, mục đích gì, bao nhiêu bản, ai duyệt.</para>
/// </summary>
public class RecordCopyRequest : BaseEntity
{
    public string CopyCode { get; set; } = string.Empty;

    public Guid MedicalRecordId { get; set; }
    public virtual MedicalRecord MedicalRecord { get; set; } = null!;

    public string? Requester { get; set; } // Người/cơ quan xin sao chụp
    public string? Purpose { get; set; }   // Mục đích: giám định BHXH, pháp lý, chuyển viện...
    public int CopyCount { get; set; } = 1;

    public DateTime RequestDate { get; set; }
    public Guid? RequestedById { get; set; }

    /// <summary>0 chờ xử lý · 1 đã duyệt · 2 đã giao bản sao · 3 từ chối.</summary>
    public int Status { get; set; }
    public string? RejectReason { get; set; }
    public DateTime? HandedOverAt { get; set; }
}

/// <summary>
/// Mượn/trả hồ sơ bệnh án - Medical Record Borrow Request
/// </summary>
public class MedicalRecordBorrowRequest : BaseEntity
{
    public string RequestCode { get; set; } = string.Empty; // Mã phiếu mượn

    public Guid MedicalRecordArchiveId { get; set; }
    public virtual MedicalRecordArchive MedicalRecordArchive { get; set; } = null!;

    public Guid RequestedById { get; set; }
    public virtual User RequestedBy { get; set; } = null!;

    public DateTime RequestDate { get; set; }
    public string? Purpose { get; set; } // Mục đích mượn
    public DateTime? ExpectedReturnDate { get; set; }

    // Trạng thái: 0-Chờ duyệt, 1-Đã duyệt, 2-Từ chối, 3-Đang mượn, 4-Đã trả
    public int Status { get; set; }

    public Guid? ApprovedById { get; set; }
    public virtual User? ApprovedBy { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public string? RejectReason { get; set; }

    public DateTime? BorrowedDate { get; set; }
    public DateTime? ReturnedDate { get; set; }
    public string? Note { get; set; }
}
