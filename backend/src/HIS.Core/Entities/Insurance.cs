namespace HIS.Core.Entities;

/// <summary>
/// Hồ sơ yêu cầu bảo hiểm - InsuranceClaim
/// </summary>
public class InsuranceClaim : BaseEntity
{
    public string ClaimCode { get; set; } = string.Empty; // Mã hồ sơ

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid? MedicalRecordId { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }

    // Thông tin BHYT
    public string? InsuranceNumber { get; set; } // Số thẻ BHYT
    public DateTime? InsuranceStartDate { get; set; } // Ngày bắt đầu
    public DateTime? InsuranceEndDate { get; set; } // Ngày hết hạn
    public string? InsuranceFacilityCode { get; set; } // Mã CSKCB ban đầu
    public int InsuranceType { get; set; } // 1-Cùng tuyến, 2-Trái tuyến có giấy chuyển, 3-Trái tuyến không giấy, 4-Đúng tuyến, 5-Thông tuyến

    // Thời gian điều trị
    public DateTime ServiceDate { get; set; } // Ngày vào viện/khám
    public DateTime? DischargeDate { get; set; } // Ngày ra viện (nếu nội trú)
    public int TreatmentType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-Cấp cứu

    // Chẩn đoán
    public string? MainDiagnosisCode { get; set; } // ICD-10
    public string? MainDiagnosisName { get; set; }
    public string? SubDiagnosisCodes { get; set; } // Chẩn đoán kèm theo (nhiều ICD)
    public string? SubDiagnosisNames { get; set; }

    // Chi phí
    public decimal TotalAmount { get; set; } // Tổng chi phí
    public decimal InsuranceAmount { get; set; } // Chi phí BHYT chi trả
    public decimal PatientAmount { get; set; } // Bệnh nhân đồng chi trả
    public decimal OutOfPocketAmount { get; set; } // Chi phí ngoài BHYT
    public decimal InsurancePaymentRate { get; set; } // Tỷ lệ thanh toán BHYT (%)

    // Khoa điều trị
    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    // Bác sĩ điều trị
    public Guid? DoctorId { get; set; }
    public virtual User? Doctor { get; set; }

    // Trạng thái
    public int ClaimStatus { get; set; } // 0-Chưa gửi, 1-Đã gửi, 2-Đã duyệt, 3-Từ chối một phần, 4-Từ chối toàn bộ, 5-Đã thanh toán
    public DateTime? SubmittedAt { get; set; } // Thời gian gửi
    public Guid? SubmittedBy { get; set; } // Người gửi
    public DateTime? ProcessedAt { get; set; } // Thời gian xử lý
    public Guid? ProcessedBy { get; set; } // Người xử lý

    public string? ProcessorName { get; set; } // Tên người xử lý (bên BHXH)
    public string? ProcessorNote { get; set; } // Ghi chú từ BHXH

    // File đính kèm
    public string? AttachmentFiles { get; set; } // Danh sách file (JSON)

    public string? Note { get; set; }

    // Navigation
    public virtual ICollection<InsuranceClaimDetail> ClaimDetails { get; set; } = new List<InsuranceClaimDetail>();
    public virtual ICollection<InsuranceRejection> Rejections { get; set; } = new List<InsuranceRejection>();
}

/// <summary>
/// Chi tiết yêu cầu bảo hiểm - InsuranceClaimDetail
/// </summary>
public class InsuranceClaimDetail : BaseEntity
{
    public Guid ClaimId { get; set; }
    public virtual InsuranceClaim Claim { get; set; } = null!;

    public int ItemType { get; set; } // 1-Dịch vụ khám/XN, 2-Thuốc, 3-Vật tư, 4-Giường bệnh, 5-Khác

    public Guid? ServiceId { get; set; } // ID dịch vụ
    public virtual Service? Service { get; set; }

    public Guid? MedicineId { get; set; } // ID thuốc
    public virtual Medicine? Medicine { get; set; }

    public Guid? MedicalSupplyId { get; set; } // ID vật tư
    public virtual MedicalSupply? MedicalSupply { get; set; }

    public string ItemCode { get; set; } = string.Empty; // Mã dịch vụ/thuốc/vật tư
    public string ItemName { get; set; } = string.Empty; // Tên
    public string? Unit { get; set; } // Đơn vị tính

    public decimal Quantity { get; set; } // Số lượng
    public decimal UnitPrice { get; set; } // Đơn giá
    public decimal Amount { get; set; } // Thành tiền

    public decimal InsuranceCoverage { get; set; } // Tỷ lệ BHYT chi trả (%)
    public decimal InsuranceAmount { get; set; } // Số tiền BHYT chi trả
    public decimal PatientAmount { get; set; } // Bệnh nhân trả

    public bool IsInsuranceCovered { get; set; } // Có thuộc danh mục BHYT
    public bool IsApproved { get; set; } // Đã được duyệt
    public string? RejectionReason { get; set; } // Lý do từ chối (nếu có)

    public DateTime ServiceDate { get; set; } // Ngày thực hiện
    public string? Note { get; set; }
}

/// <summary>
/// Từ chối bảo hiểm - InsuranceRejection
/// </summary>
public class InsuranceRejection : BaseEntity
{
    public Guid ClaimId { get; set; }
    public virtual InsuranceClaim Claim { get; set; } = null!;

    public string RejectionCode { get; set; } = string.Empty; // Mã từ chối
    public string RejectionReason { get; set; } = string.Empty; // Lý do từ chối
    public string? DetailedReason { get; set; } // Chi tiết

    public decimal RejectedAmount { get; set; } // Số tiền bị từ chối
    public DateTime RejectedAt { get; set; } // Thời gian từ chối
    public Guid? RejectedBy { get; set; } // Người xử lý từ chối
    public string? RejectorName { get; set; } // Tên người từ chối (bên BHXH)

    // Khiếu nại
    public int AppealStatus { get; set; } // 0-Chưa khiếu nại, 1-Đang khiếu nại, 2-Chấp nhận khiếu nại, 3-Từ chối khiếu nại
    public DateTime? AppealDate { get; set; } // Ngày khiếu nại
    public Guid? AppealBy { get; set; } // Người khiếu nại
    public string? AppealReason { get; set; } // Lý do khiếu nại
    public DateTime? AppealResolvedDate { get; set; } // Ngày giải quyết
    public string? AppealResult { get; set; } // Kết quả khiếu nại

    public string? Note { get; set; }
}

/// <summary>
/// Thống kê bảo hiểm - InsuranceStatistics (View)
/// </summary>
public class InsuranceStatistics : BaseEntity
{
    public DateTime StatDate { get; set; } // Ngày thống kê
    public int Period { get; set; } // 1-Ngày, 2-Tuần, 3-Tháng, 4-Quý, 5-Năm

    public Guid? DepartmentId { get; set; }
    public virtual Department? Department { get; set; }

    public int TotalClaims { get; set; } // Tổng số hồ sơ
    public int ApprovedClaims { get; set; } // Số hồ sơ được duyệt
    public int RejectedClaims { get; set; } // Số hồ sơ bị từ chối
    public int PartialRejectedClaims { get; set; } // Số hồ sơ từ chối một phần

    public decimal TotalAmount { get; set; } // Tổng chi phí
    public decimal ApprovedAmount { get; set; } // Chi phí được duyệt
    public decimal RejectedAmount { get; set; } // Chi phí bị từ chối
    public decimal PaidAmount { get; set; } // Đã thanh toán

    public decimal ApprovalRate { get; set; } // Tỷ lệ duyệt (%)
    public decimal AverageClaimAmount { get; set; } // Chi phí trung bình/hồ sơ
    public decimal AverageProcessingTime { get; set; } // Thời gian xử lý TB (ngày)
}

/// <summary>
/// Cấu hình giá BHYT - InsurancePriceConfig
/// </summary>
public class InsurancePriceConfig : BaseEntity
{
    public Guid? ServiceId { get; set; }
    public virtual Service? Service { get; set; }

    public Guid? MedicineId { get; set; }
    public virtual Medicine? Medicine { get; set; }

    public Guid? MedicalSupplyId { get; set; }
    public virtual MedicalSupply? MedicalSupply { get; set; }

    public string ItemCode { get; set; } = string.Empty; // Mã BHYT
    public string ItemName { get; set; } = string.Empty; // Tên theo BHYT
    public string? Unit { get; set; }

    public decimal InsurancePrice { get; set; } // Giá BHYT
    public decimal PaymentRate { get; set; } // Tỷ lệ thanh toán (%)
    public bool IsActive { get; set; } = true;

    public DateTime EffectiveFrom { get; set; } // Hiệu lực từ ngày
    public DateTime? EffectiveTo { get; set; } // Hiệu lực đến ngày

    public string? DecisionNumber { get; set; } // Số quyết định
    public DateTime? DecisionDate { get; set; } // Ngày quyết định
    public string? Note { get; set; }
}
