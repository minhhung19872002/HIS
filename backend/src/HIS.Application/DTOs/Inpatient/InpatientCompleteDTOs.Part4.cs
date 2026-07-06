namespace HIS.Application.DTOs.Inpatient;


/// <summary>Request tạo biên bản bàn giao ca trực (Issue #202 — moved from API layer).</summary>
public class CreateShiftHandoverRequest
{
    public Guid DepartmentId { get; set; }
    public string ShiftType { get; set; } = "Morning"; // Morning, Afternoon, Night
    public DateTime ShiftDate { get; set; }
    public Guid? HandoverToUserId { get; set; }
    public int NewAdmissions { get; set; }
    public int Discharges { get; set; }
    public string? PendingOrders { get; set; }
    public string? SpecialNotes { get; set; }
    public string? IncidentNotes { get; set; }
}

/// <summary>
/// DTO hoàn thành xuất viện
/// </summary>
public class CompleteDischargeDto
{
    public Guid AdmissionId { get; set; }

    public DateTime DischargeDate { get; set; }

    public int DischargeType { get; set; } // 1-Ra viện, 2-Chuyển viện, 3-Trốn viện, 4-Tử vong

    public int DischargeCondition { get; set; } // 1-Khỏi, 2-Đỡ, 3-Không đổi, 4-Nặng hơn, 5-Tử vong

    // Chẩn đoán
    public string? DischargeDiagnosisCode { get; set; }
    public string? DischargeDiagnosis { get; set; }
    public string? SecondaryDiagnosisCodes { get; set; }
    public string? SecondaryDiagnoses { get; set; }

    // Tóm tắt điều trị
    public string? TreatmentSummary { get; set; }
    public string? ProceduresSummary { get; set; }

    // Hướng dẫn ra viện
    public string? DischargeInstructions { get; set; }
    public string? MedicationInstructions { get; set; }
    public string? DietInstructions { get; set; }
    public string? ActivityInstructions { get; set; }

    // Hẹn tái khám
    public DateTime? FollowUpDate { get; set; }
    public string? FollowUpInstructions { get; set; }

    // Giấy nghỉ ốm (nếu có)
    public int? SickLeaveDays { get; set; }
    public DateTime? SickLeaveStartDate { get; set; }

    // Chuyển viện (nếu có)
    public string? TransferToHospital { get; set; }
    public string? TransferReason { get; set; }
}

/// <summary>
/// DTO kiểm tra trước xuất viện
/// </summary>
public class PreDischargeCheckDto
{
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    // Kiểm tra thông tuyến
    public bool IsInsuranceValid { get; set; }
    public string? InsuranceCheckMessage { get; set; }

    // Kiểm tra thanh toán
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public bool HasUnpaidBalance { get; set; }

    // Kiểm tra thuốc
    public bool HasUnclaimedMedicine { get; set; }
    public int UnclaimedPrescriptionCount { get; set; }

    // Kiểm tra kết quả CLS
    public bool HasPendingResults { get; set; }
    public int PendingResultCount { get; set; }

    // Kiểm tra hồ sơ
    public bool IsMedicalRecordComplete { get; set; }
    public List<string> MissingDocuments { get; set; } = new();

    public bool CanDischarge { get; set; }
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// DTO giấy ra viện
/// </summary>
public class DischargeCertificateDto
{
    public Guid AdmissionId { get; set; }

    // Thông tin BN
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Address { get; set; }

    // Thông tin điều trị
    public DateTime AdmissionDate { get; set; }
    public DateTime DischargeDate { get; set; }
    public int DaysOfStay { get; set; }

    public string? DepartmentName { get; set; }
    public string? AttendingDoctorName { get; set; }

    // Chẩn đoán
    public string? AdmissionDiagnosis { get; set; }
    public string? DischargeDiagnosis { get; set; }

    // Điều trị
    public string? TreatmentSummary { get; set; }
    public string? ProceduresSummary { get; set; }

    // Kết quả
    public string? DischargeCondition { get; set; }

    // Hướng dẫn
    public string? DischargeInstructions { get; set; }
    public DateTime? FollowUpDate { get; set; }

    // PTTT (nếu có)
    public string? SurgeryMethod { get; set; }
    public DateTime? SurgeryDate { get; set; }

    // Nghỉ ốm (nếu có)
    public int? SickLeaveDays { get; set; }
    public DateTime? SickLeaveStartDate { get; set; }
    public DateTime? SickLeaveEndDate { get; set; }
}

/// <summary>
/// DTO phiếu chuyển tuyến
/// </summary>
public class ReferralCertificateDto
{
    public Guid AdmissionId { get; set; }

    // Thông tin BN
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Address { get; set; }
    public string? InsuranceNumber { get; set; }

    // Cơ sở chuyển đi
    public string FromHospitalName { get; set; } = string.Empty;
    public string FromHospitalCode { get; set; } = string.Empty;

    // Cơ sở nhận
    public string ToHospitalName { get; set; } = string.Empty;
    public string ToHospitalCode { get; set; } = string.Empty;

    // Lý do chuyển
    public string? TransferReason { get; set; }

    // Thông tin điều trị
    public string? Diagnosis { get; set; }
    public string? TreatmentSummary { get; set; }
    public string? CurrentCondition { get; set; }

    // Yêu cầu
    public string? RequestedServices { get; set; }

    public DateTime TransferDate { get; set; }
    public string? DoctorName { get; set; }
}

/// <summary>
/// DTO bảng kê thanh toán 6556
/// </summary>
public class BillingStatement6556Dto
{
    public Guid AdmissionId { get; set; }

    // Thông tin BN
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string? InsuranceNumber { get; set; }
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Address { get; set; }

    // Thời gian điều trị
    public DateTime AdmissionDate { get; set; }
    public DateTime DischargeDate { get; set; }
    public int DaysOfStay { get; set; }

    // Chẩn đoán
    public string? Diagnosis { get; set; }
    public string? DiagnosisCode { get; set; }

    // Chi tiết chi phí
    public List<BillingItemDto> Items { get; set; } = new();

    // Tổng hợp
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientCoPayAmount { get; set; }
    public decimal OutOfPocketAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal AmountDue { get; set; }
}

/// <summary>
/// DTO item bảng kê
/// </summary>
public class BillingItemDto
{
    public int OrderNo { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public decimal InsuranceRatio { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    public string ItemType { get; set; } = string.Empty; // XN, CĐHA, PTTT, Thuốc, VT, Giường...
}

/// <summary>
/// DTO phiếu công khai dịch vụ
/// </summary>
public class ServiceDisclosureDto
{
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<ServiceDisclosureItemDto> Services { get; set; } = new();

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

/// <summary>
/// DTO item công khai dịch vụ
/// </summary>
public class ServiceDisclosureItemDto
{
    public DateTime ServiceDate { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string PaymentSourceName { get; set; } = string.Empty;
}

/// <summary>
/// DTO phiếu công khai thuốc (11D/BV-01/TT23)
/// </summary>
public class MedicineDisclosureDto
{
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<MedicineDisclosureItemDto> Medicines { get; set; } = new();

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

/// <summary>
/// DTO item công khai thuốc
/// </summary>
public class MedicineDisclosureItemDto
{
    public DateTime PrescriptionDate { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string PaymentSourceName { get; set; } = string.Empty;
}



/// <summary>
/// DTO báo cáo hoạt động điều trị
/// </summary>
public class TreatmentActivityReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    // Thống kê nhập viện
    public int TotalAdmissions { get; set; }
    public int EmergencyAdmissions { get; set; }
    public int ElectiveAdmissions { get; set; }
    public int TransferInAdmissions { get; set; }

    // Thống kê xuất viện
    public int TotalDischarges { get; set; }
    public int RecoveredCount { get; set; }
    public int ImprovedCount { get; set; }
    public int UnchangedCount { get; set; }
    public int WorsenedCount { get; set; }
    public int DeathCount { get; set; }
    public int TransferOutCount { get; set; }

    // Thống kê giường
    public int TotalBeds { get; set; }
    public decimal AverageOccupancyRate { get; set; }
    public decimal AverageLengthOfStay { get; set; }

    // Thống kê chi phí
    public decimal TotalRevenue { get; set; }
    public decimal InsuranceRevenue { get; set; }
    public decimal FeeRevenue { get; set; }
}

/// <summary>
/// DTO báo cáo doanh thu khoa
/// </summary>
public class DepartmentRevenueReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<DepartmentRevenueItemDto> Departments { get; set; } = new();

    public decimal TotalRevenue { get; set; }
    public decimal TotalInsuranceRevenue { get; set; }
    public decimal TotalFeeRevenue { get; set; }
}

/// <summary>
/// DTO item doanh thu khoa
/// </summary>
public class DepartmentRevenueItemDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;

    public int PatientCount { get; set; }
    public int TotalBedDays { get; set; }

    public decimal MedicineRevenue { get; set; }
    public decimal SupplyRevenue { get; set; }
    public decimal ServiceRevenue { get; set; }
    public decimal BedRevenue { get; set; }
    public decimal TotalRevenue { get; set; }

    public decimal InsuranceRevenue { get; set; }
    public decimal FeeRevenue { get; set; }
}

/// <summary>
/// DTO báo cáo thuốc vật tư sử dụng
/// </summary>
public class MedicineSupplyUsageReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }

    public List<MedicineUsageItemDto> Medicines { get; set; } = new();
    public List<SupplyUsageItemDto> Supplies { get; set; } = new();

    public decimal TotalMedicineAmount { get; set; }
    public decimal TotalSupplyAmount { get; set; }
}

/// <summary>
/// DTO item thuốc sử dụng
/// </summary>
public class MedicineUsageItemDto
{
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public decimal TotalAmount { get; set; }
    public int PatientCount { get; set; }
}

/// <summary>
/// DTO item vật tư sử dụng
/// </summary>
public class SupplyUsageItemDto
{
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public decimal TotalAmount { get; set; }
    public int PatientCount { get; set; }
}

/// <summary>
/// DTO sổ theo QĐ 4069
/// </summary>
public class Register4069Dto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<Register4069ItemDto> Items { get; set; } = new();

    public int TotalPatients { get; set; }
    public int TotalBedDays { get; set; }
}

/// <summary>
/// DTO item sổ 4069
/// </summary>
public class Register4069ItemDto
{
    public int OrderNo { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public int? Age { get; set; }
    public string? Address { get; set; }

    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public int DaysOfStay { get; set; }

    public string? AdmissionDiagnosis { get; set; }
    public string? DischargeDiagnosis { get; set; }

    public string? DischargeCondition { get; set; }
    public string? PaymentSource { get; set; }
}



/// <summary>
/// DTO tìm kiếm bệnh nhân nội trú
/// </summary>
public class InpatientSearchDto
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? RoomId { get; set; }
    public int? Status { get; set; }
    public bool? IsInsurance { get; set; }
    public string? Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; }
}

/// <summary>
/// DTO tìm kiếm tờ điều trị
/// </summary>
public class TreatmentSheetSearchDto
{
    public Guid? AdmissionId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DoctorId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// DTO tìm kiếm báo cáo
/// </summary>
public class ReportSearchDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? DoctorId { get; set; }
    public int? PaymentSource { get; set; }
    public string? GroupBy { get; set; } // Day, Week, Month
}

// G-08: Hủy nhiều chỉ định CLS một lần
public class CancelServiceRequestsDto
{
    public List<Guid> ServiceRequestIds { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
}

// G-08: Kết quả hủy chỉ định
public class CancelServiceRequestsResultDto
{
    public int CancelledCount { get; set; }
    public List<Guid> FailedIds { get; set; } = new();
}

// G-15: Cập nhật đối tượng thanh toán cho ServiceRequest
public class UpdateServiceRequestPaymentTypeDto
{
    // PatientType: 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public int PatientType { get; set; }
    public string? Reason { get; set; }
}

// Item hiển thị ServiceRequest cho BN nội trú
public class InpatientServiceRequestItemDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }
    public string? ServiceName { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public int RequestType { get; set; } // 1-XN, 2-CDHA, 3-TDCN, 4-PTTT, 5-Khac
    public string? RequestTypeName => RequestType switch
    {
        1 => "Xét nghiệm",
        2 => "CĐHA",
        3 => "TDCN",
        4 => "PTTT",
        _ => "Khác"
    };
    public int Status { get; set; } // 0-Chờ TT, 1-Đã TT, 2-Đang TH, 3-Có KQ, 4-Đã hủy
    public string? StatusName => Status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đã thanh toán",
        2 => "Đang thực hiện",
        3 => "Có kết quả",
        4 => "Đã hủy",
        _ => ""
    };
    // PatientType from Details[0] (primary detail type)
    public int PatientType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public string? PatientTypeName => PatientType switch
    {
        1 => "BHYT",
        2 => "Viện phí",
        3 => "Dịch vụ",
        _ => "Khác"
    };
    public bool IsEmergency { get; set; }
}

