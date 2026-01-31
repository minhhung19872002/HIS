namespace HIS.Application.DTOs.Inpatient;

#region 3.1 Màn hình chờ buồng bệnh

/// <summary>
/// DTO sơ đồ buồng bệnh
/// </summary>
public class WardLayoutDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string DepartmentCode { get; set; } = string.Empty;

    public int TotalRooms { get; set; }
    public int TotalBeds { get; set; }
    public int OccupiedBeds { get; set; }
    public int AvailableBeds { get; set; }
    public int MaintenanceBeds { get; set; }

    public double OccupancyRate => TotalBeds > 0 ? (double)OccupiedBeds / TotalBeds * 100 : 0;

    public List<RoomLayoutDto> Rooms { get; set; } = new();
}

/// <summary>
/// DTO layout phòng
/// </summary>
public class RoomLayoutDto
{
    public Guid RoomId { get; set; }
    public string RoomCode { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public int RoomType { get; set; } // 1-Thường, 2-VIP, 3-ICU, 4-Cách ly
    public string RoomTypeName => RoomType switch
    {
        1 => "Phòng thường",
        2 => "Phòng VIP",
        3 => "ICU/Hồi sức",
        4 => "Phòng cách ly",
        _ => ""
    };

    public int TotalBeds { get; set; }
    public int OccupiedBeds { get; set; }
    public int AvailableBeds { get; set; }

    public string DisplayColor { get; set; } = "#FFFFFF"; // Màu hiển thị

    public List<BedLayoutDto> Beds { get; set; } = new();
}

/// <summary>
/// DTO layout giường
/// </summary>
public class BedLayoutDto
{
    public Guid BedId { get; set; }
    public string BedCode { get; set; } = string.Empty;
    public string BedName { get; set; } = string.Empty;
    public int BedType { get; set; } // 1-Thường, 2-ICU, 3-Nhi

    public int Status { get; set; } // 0-Trống, 1-Có BN, 2-Nằm ghép, 3-Bảo trì
    public string StatusName => Status switch
    {
        0 => "Trống",
        1 => "Có bệnh nhân",
        2 => "Nằm ghép",
        3 => "Bảo trì",
        _ => ""
    };

    public string DisplayColor => Status switch
    {
        0 => "#4CAF50", // Green - Available
        1 => "#F44336", // Red - Occupied
        2 => "#FF9800", // Orange - Shared
        3 => "#9E9E9E", // Gray - Maintenance
        _ => "#FFFFFF"
    };

    public int Position { get; set; } // Vị trí trong phòng

    // Thông tin BN (nếu có)
    public Guid? CurrentAdmissionId { get; set; }
    public string? PatientName { get; set; }
    public string? PatientCode { get; set; }
    public int? Gender { get; set; }
    public int? Age { get; set; }
    public bool IsInsurance { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public int? DaysOfStay { get; set; }
    public string? MainDiagnosis { get; set; }

    // Thông tin nằm ghép (nếu có)
    public List<SharedBedPatientDto>? SharedPatients { get; set; }
}

/// <summary>
/// DTO bệnh nhân nằm ghép
/// </summary>
public class SharedBedPatientDto
{
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public int? Age { get; set; }
    public bool IsInsurance { get; set; }
}

/// <summary>
/// DTO cấu hình màu hiển thị
/// </summary>
public class WardColorConfigDto
{
    public string InsurancePatientColor { get; set; } = "#2196F3";
    public string FeePatientColor { get; set; } = "#FF9800";
    public string ChronicPatientColor { get; set; } = "#9C27B0";
    public string EmergencyPatientColor { get; set; } = "#F44336";
    public string VIPPatientColor { get; set; } = "#FFD700";
    public string PediatricPatientColor { get; set; } = "#E91E63";
}

#endregion

#region 3.2 Quản lý bệnh nhân nội trú

/// <summary>
/// DTO danh sách bệnh nhân trong buồng/khoa
/// </summary>
public class InpatientListDto
{
    public Guid AdmissionId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Age { get; set; }

    public string? InsuranceNumber { get; set; }
    public bool IsInsurance { get; set; }
    public DateTime? InsuranceExpiry { get; set; }

    public string DepartmentName { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
    public string? BedName { get; set; }

    public DateTime AdmissionDate { get; set; }
    public int DaysOfStay { get; set; }

    public string? MainDiagnosis { get; set; }
    public string? AttendingDoctorName { get; set; }

    public int Status { get; set; }
    public string StatusName => Status switch
    {
        0 => "Đang điều trị",
        1 => "Chờ chuyển khoa",
        2 => "Chờ xuất viện",
        3 => "Chờ phẫu thuật",
        _ => ""
    };

    // Trạng thái y lệnh
    public bool HasPendingOrders { get; set; }
    public bool HasPendingLabResults { get; set; }
    public bool HasUnclaimedMedicine { get; set; }

    // Cảnh báo
    public bool IsDebtWarning { get; set; }
    public decimal? TotalDebt { get; set; }
    public bool IsInsuranceExpiring { get; set; }
}

/// <summary>
/// DTO tiếp nhận BN từ phòng khám
/// </summary>
public class AdmitFromOpdDto
{
    public Guid MedicalRecordId { get; set; } // Từ phòng khám

    public Guid DepartmentId { get; set; }
    public Guid RoomId { get; set; }
    public Guid? BedId { get; set; }

    public int AdmissionType { get; set; } // 1-Thường, 2-Cấp cứu
    public string? DiagnosisOnAdmission { get; set; }
    public string? ReasonForAdmission { get; set; }

    public Guid AttendingDoctorId { get; set; }
}

/// <summary>
/// DTO tiếp nhận BN từ khoa khác
/// </summary>
public class AdmitFromDepartmentDto
{
    public Guid SourceAdmissionId { get; set; } // Admission ở khoa cũ

    public Guid TargetDepartmentId { get; set; }
    public Guid TargetRoomId { get; set; }
    public Guid? TargetBedId { get; set; }

    public string? TransferReason { get; set; }
    public string? DiagnosisOnTransfer { get; set; }

    public Guid AttendingDoctorId { get; set; }
}

/// <summary>
/// DTO chuyển khoa
/// </summary>
public class DepartmentTransferDto
{
    public Guid AdmissionId { get; set; }

    public Guid TargetDepartmentId { get; set; }
    public Guid TargetRoomId { get; set; }
    public Guid? TargetBedId { get; set; }

    public string? TransferReason { get; set; }
    public string? DiagnosisOnTransfer { get; set; }
    public string? TreatmentSummary { get; set; }

    public Guid ReceivingDoctorId { get; set; }
}

/// <summary>
/// DTO điều trị kết hợp
/// </summary>
public class CombinedTreatmentDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid ConsultingDepartmentId { get; set; }
    public string ConsultingDepartmentName { get; set; } = string.Empty;

    public DateTime RequestDate { get; set; }
    public string? RequestReason { get; set; }
    public string? ConsultingDiagnosis { get; set; }

    public Guid ConsultingDoctorId { get; set; }
    public string? ConsultingDoctorName { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đang ĐT, 2-Hoàn thành
    public string StatusName => Status switch
    {
        0 => "Chờ tiếp nhận",
        1 => "Đang điều trị",
        2 => "Hoàn thành",
        _ => ""
    };

    public DateTime? CompletedDate { get; set; }
    public string? TreatmentResult { get; set; }
}

/// <summary>
/// DTO tạo điều trị kết hợp
/// </summary>
public class CreateCombinedTreatmentDto
{
    public Guid AdmissionId { get; set; }
    public Guid ConsultingDepartmentId { get; set; }
    public string? RequestReason { get; set; }
    public string? ConsultingDiagnosis { get; set; }
}

/// <summary>
/// DTO gửi khám chuyên khoa
/// </summary>
public class SpecialtyConsultRequestDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    public Guid SpecialtyDepartmentId { get; set; }
    public string SpecialtyDepartmentName { get; set; } = string.Empty;

    public Guid RequestingDoctorId { get; set; }
    public string RequestingDoctorName { get; set; } = string.Empty;

    public DateTime RequestDate { get; set; }
    public string? RequestReason { get; set; }
    public string? ClinicalInfo { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đã khám, 2-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ khám",
        1 => "Đã khám",
        2 => "Đã hủy",
        _ => ""
    };

    public Guid? ConsultingDoctorId { get; set; }
    public string? ConsultingDoctorName { get; set; }
    public DateTime? ConsultDate { get; set; }
    public string? ConsultResult { get; set; }
    public string? Recommendations { get; set; }
}

/// <summary>
/// DTO tạo yêu cầu khám chuyên khoa
/// </summary>
public class CreateSpecialtyConsultDto
{
    public Guid AdmissionId { get; set; }
    public Guid SpecialtyDepartmentId { get; set; }
    public string? RequestReason { get; set; }
    public string? ClinicalInfo { get; set; }
}

/// <summary>
/// DTO chuyển mổ
/// </summary>
public class SurgeryTransferDto
{
    public Guid AdmissionId { get; set; }
    public int SurgeryType { get; set; } // 1-Mổ phiên, 2-Mổ cấp cứu
    public string SurgeryTypeName => SurgeryType switch
    {
        1 => "Mổ phiên",
        2 => "Mổ cấp cứu",
        _ => ""
    };

    public Guid SurgeryRoomId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public TimeSpan? ScheduledTime { get; set; }

    public string? PreopDiagnosis { get; set; }
    public string? PlannedProcedure { get; set; }

    public Guid SurgeonId { get; set; }
    public List<Guid> AssistantIds { get; set; } = new();
    public Guid AnesthesiologistId { get; set; }

    public string? SpecialNotes { get; set; }
}

/// <summary>
/// DTO bổ sung thẻ BHYT
/// </summary>
public class UpdateInsuranceDto
{
    public Guid AdmissionId { get; set; }
    public string InsuranceNumber { get; set; } = string.Empty;
    public DateTime InsuranceStartDate { get; set; }
    public DateTime InsuranceEndDate { get; set; }
    public string? InitialFacilityCode { get; set; }
    public string? InitialFacilityName { get; set; }
    public int BenefitLevel { get; set; } // 1-80%, 2-95%, 3-100%
}

/// <summary>
/// DTO kiểm tra thông tuyến BHYT
/// </summary>
public class InsuranceReferralCheckDto
{
    public Guid AdmissionId { get; set; }
    public string InsuranceNumber { get; set; } = string.Empty;

    public bool IsValid { get; set; }
    public bool IsCorrectRoute { get; set; }
    public bool RequiresReferral { get; set; }

    public string? InitialFacilityCode { get; set; }
    public string? InitialFacilityName { get; set; }

    public int BenefitLevel { get; set; }
    public string BenefitLevelName => BenefitLevel switch
    {
        1 => "80%",
        2 => "95%",
        3 => "100%",
        _ => ""
    };

    public List<string> Warnings { get; set; } = new();
    public string? Message { get; set; }
}

/// <summary>
/// DTO thông tin y lệnh theo ngày
/// </summary>
public class DailyOrderSummaryDto
{
    public DateTime OrderDate { get; set; }
    public Guid AdmissionId { get; set; }

    // Thuốc
    public int MedicineOrderCount { get; set; }
    public int MedicineIssuedCount { get; set; }
    public int MedicinePendingCount { get; set; }

    // Dịch vụ
    public int ServiceOrderCount { get; set; }
    public int ServiceCompletedCount { get; set; }
    public int ServicePendingCount { get; set; }

    // Kết quả CLS
    public int LabOrderCount { get; set; }
    public int LabResultCount { get; set; }
    public int LabPendingCount { get; set; }

    public List<MedicineOrderItemDto> MedicineOrders { get; set; } = new();
    public List<ServiceOrderItemDto> ServiceOrders { get; set; } = new();
    public List<LabResultItemDto> LabResults { get; set; } = new();
}

/// <summary>
/// DTO item thuốc y lệnh
/// </summary>
public class MedicineOrderItemDto
{
    public Guid Id { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? Dosage { get; set; }
    public string? Usage { get; set; }
    public int Status { get; set; } // 0-Chờ, 1-Đã phát, 2-Hủy
    public string? WarehouseName { get; set; }
}

/// <summary>
/// DTO item dịch vụ y lệnh
/// </summary>
public class ServiceOrderItemDto
{
    public Guid Id { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceGroupName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int Status { get; set; } // 0-Chờ, 1-Đang TH, 2-Hoàn thành
    public string? ExecutingRoomName { get; set; }
    public DateTime? ScheduledDate { get; set; }
}

/// <summary>
/// DTO item kết quả xét nghiệm
/// </summary>
public class LabResultItemDto
{
    public Guid Id { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }
    public bool IsAbnormal { get; set; }
    public int Status { get; set; } // 0-Chờ, 1-Có KQ
    public DateTime? ResultDate { get; set; }
}

/// <summary>
/// DTO viện phí khoa lâm sàng
/// </summary>
public class DepartmentFeeOverviewDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public int TotalPatients { get; set; }
    public int InsurancePatients { get; set; }
    public int FeePatients { get; set; }

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientPayAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal DebtAmount { get; set; }

    public List<PatientFeeItemDto> PatientFees { get; set; } = new();
}

/// <summary>
/// DTO viện phí từng BN
/// </summary>
public class PatientFeeItemDto
{
    public Guid AdmissionId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? BedName { get; set; }

    public bool IsInsurance { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientPayAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal DebtAmount { get; set; }

    public int DaysOfStay { get; set; }
}

/// <summary>
/// DTO yêu cầu tạm ứng
/// </summary>
public class DepositRequestDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;

    public decimal RequestedAmount { get; set; }
    public string? Reason { get; set; }

    public Guid RequestedBy { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đã thu, 2-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ thu",
        1 => "Đã thu",
        2 => "Đã hủy",
        _ => ""
    };

    public DateTime? CollectedDate { get; set; }
    public string? CollectedByName { get; set; }
}

/// <summary>
/// DTO tạo yêu cầu tạm ứng
/// </summary>
public class CreateDepositRequestDto
{
    public Guid AdmissionId { get; set; }
    public decimal RequestedAmount { get; set; }
    public string? Reason { get; set; }
}

/// <summary>
/// DTO cảnh báo chuyển khoa
/// </summary>
public class TransferWarningDto
{
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;

    public bool HasUnclaimedMedicine { get; set; }
    public int UnclaimedMedicineCount { get; set; }
    public List<string> UnclaimedMedicineNames { get; set; } = new();

    public bool HasPendingLabResults { get; set; }
    public int PendingLabCount { get; set; }
    public List<string> PendingLabNames { get; set; } = new();

    public bool HasPendingServices { get; set; }
    public int PendingServiceCount { get; set; }

    public bool CanTransfer { get; set; }
    public List<string> Warnings { get; set; } = new();
}

#endregion

#region 3.3 Chỉ định dịch vụ nội trú

/// <summary>
/// DTO chỉ định dịch vụ nội trú
/// </summary>
public class InpatientServiceOrderDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public DateTime OrderDate { get; set; }
    public Guid OrderingDoctorId { get; set; }
    public string OrderingDoctorName { get; set; } = string.Empty;

    // Chẩn đoán
    public string? MainDiagnosisCode { get; set; }
    public string? MainDiagnosis { get; set; }
    public string? SecondaryDiagnosisCodes { get; set; }
    public string? SecondaryDiagnoses { get; set; }

    public List<InpatientServiceItemDto> Services { get; set; } = new();

    public int Status { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientPayAmount { get; set; }
}

/// <summary>
/// DTO item dịch vụ nội trú
/// </summary>
public class InpatientServiceItemDto
{
    public Guid Id { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceGroupName { get; set; } = string.Empty;

    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public int PaymentSource { get; set; } // 1-BHYT, 2-Viện phí, 3-Khác
    public decimal InsuranceRatio { get; set; }

    public Guid? ExecutingRoomId { get; set; }
    public string? ExecutingRoomName { get; set; }

    public DateTime? ScheduledDate { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsEmergency { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đang TH, 2-Hoàn thành, 3-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang thực hiện",
        2 => "Hoàn thành",
        3 => "Đã hủy",
        _ => ""
    };

    public string? Note { get; set; }
}

/// <summary>
/// DTO tạo chỉ định dịch vụ nội trú
/// </summary>
public class CreateInpatientServiceOrderDto
{
    public Guid AdmissionId { get; set; }

    public string? MainDiagnosisCode { get; set; }
    public string? MainDiagnosis { get; set; }
    public string? SecondaryDiagnosisCodes { get; set; }
    public string? SecondaryDiagnoses { get; set; }

    public List<CreateInpatientServiceItemDto> Services { get; set; } = new();
}

/// <summary>
/// DTO tạo item dịch vụ
/// </summary>
public class CreateInpatientServiceItemDto
{
    public Guid ServiceId { get; set; }
    public int Quantity { get; set; } = 1;
    public int PaymentSource { get; set; } = 1;
    public Guid? ExecutingRoomId { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public bool IsUrgent { get; set; }
    public bool IsEmergency { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// DTO nhóm dịch vụ
/// </summary>
public class ServiceGroupTemplateDto
{
    public Guid Id { get; set; }
    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid? DepartmentId { get; set; }
    public Guid? CreatedBy { get; set; }
    public bool IsShared { get; set; }

    public List<ServiceTemplateItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO item trong nhóm dịch vụ
/// </summary>
public class ServiceTemplateItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int DefaultQuantity { get; set; } = 1;
}

/// <summary>
/// DTO cảnh báo chỉ định
/// </summary>
public class ServiceOrderWarningDto
{
    public bool HasDuplicateToday { get; set; }
    public List<string> DuplicateServices { get; set; } = new();

    public bool ExceedsDeposit { get; set; }
    public decimal DepositRemaining { get; set; }
    public decimal OrderAmount { get; set; }

    public bool HasTT35Warnings { get; set; }
    public List<string> TT35Warnings { get; set; } = new();

    public bool ExceedsPackageLimit { get; set; }
    public string? PackageLimitMessage { get; set; }

    public bool IsOutsideProtocol { get; set; }
    public string? ProtocolWarning { get; set; }

    public List<string> GeneralWarnings { get; set; } = new();
}

#endregion

#region 3.4 Kê đơn thuốc nội trú

/// <summary>
/// DTO đơn thuốc nội trú
/// </summary>
public class InpatientPrescriptionDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public DateTime PrescriptionDate { get; set; }
    public Guid PrescribingDoctorId { get; set; }
    public string PrescribingDoctorName { get; set; } = string.Empty;

    public string? MainDiagnosisCode { get; set; }
    public string? MainDiagnosis { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public List<InpatientMedicineItemDto> Items { get; set; } = new();

    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đã phát, 3-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đã phát",
        3 => "Đã hủy",
        _ => ""
    };

    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientPayAmount { get; set; }
}

/// <summary>
/// DTO item thuốc nội trú
/// </summary>
public class InpatientMedicineItemDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public string? Dosage { get; set; }
    public string? Morning { get; set; }
    public string? Noon { get; set; }
    public string? Afternoon { get; set; }
    public string? Evening { get; set; }
    public string? UsageInstructions { get; set; }

    public int PaymentSource { get; set; }
    public decimal InsuranceRatio { get; set; }

    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đã phát
}

/// <summary>
/// DTO tạo đơn thuốc nội trú
/// </summary>
public class CreateInpatientPrescriptionDto
{
    public Guid AdmissionId { get; set; }
    public DateTime PrescriptionDate { get; set; }

    public string? MainDiagnosisCode { get; set; }
    public string? MainDiagnosis { get; set; }

    public Guid WarehouseId { get; set; }

    public List<CreateInpatientMedicineItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO tạo item thuốc
/// </summary>
public class CreateInpatientMedicineItemDto
{
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public string? Dosage { get; set; }
    public string? Morning { get; set; }
    public string? Noon { get; set; }
    public string? Afternoon { get; set; }
    public string? Evening { get; set; }
    public string? UsageInstructions { get; set; }
    public int PaymentSource { get; set; } = 1;
    public string? Note { get; set; }
}

/// <summary>
/// DTO đơn thuốc tủ trực
/// </summary>
public class EmergencyCabinetPrescriptionDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid CabinetId { get; set; }
    public string CabinetName { get; set; } = string.Empty;

    public DateTime PrescriptionDate { get; set; }
    public List<InpatientMedicineItemDto> Items { get; set; } = new();

    public int Status { get; set; }
}

/// <summary>
/// DTO phiếu tổng hợp y lệnh thuốc
/// </summary>
public class MedicineOrderSummaryDto
{
    public Guid Id { get; set; }
    public DateTime SummaryDate { get; set; }

    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public List<MedicineOrderSummaryItemDto> Items { get; set; } = new();

    public int Status { get; set; } // 0-Chờ, 1-Đã xuất
    public string StatusName => Status switch
    {
        0 => "Chờ xuất kho",
        1 => "Đã xuất",
        _ => ""
    };

    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedDate { get; set; }
}

/// <summary>
/// DTO item tổng hợp thuốc
/// </summary>
public class MedicineOrderSummaryItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }
    public decimal IssuedQuantity { get; set; }
    public decimal RemainingQuantity => TotalQuantity - IssuedQuantity;

    public int PatientCount { get; set; }

    // Chi tiết theo BN
    public List<MedicinePatientDetailDto> PatientDetails { get; set; } = new();
}

/// <summary>
/// DTO chi tiết thuốc theo BN
/// </summary>
public class MedicinePatientDetailDto
{
    public Guid AdmissionId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? BedName { get; set; }
    public decimal Quantity { get; set; }
    public string? Dosage { get; set; }
}

/// <summary>
/// DTO phiếu tổng hợp vật tư
/// </summary>
public class SupplyOrderSummaryDto
{
    public Guid Id { get; set; }
    public DateTime SummaryDate { get; set; }

    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public List<SupplyOrderSummaryItemDto> Items { get; set; } = new();

    public int Status { get; set; }
}

/// <summary>
/// DTO item tổng hợp vật tư
/// </summary>
public class SupplyOrderSummaryItemDto
{
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal TotalQuantity { get; set; }
    public int PatientCount { get; set; }
}

/// <summary>
/// DTO cảnh báo kê đơn
/// </summary>
public class PrescriptionWarningDto
{
    public bool HasDuplicateToday { get; set; }
    public List<string> DuplicateMedicines { get; set; } = new();

    public bool HasDrugInteraction { get; set; }
    public List<DrugInteractionDto> Interactions { get; set; } = new();

    public bool HasAntibioticDuplicate { get; set; }
    public List<string> DuplicateAntibiotics { get; set; } = new();

    public bool ExceedsInsuranceCeiling { get; set; }
    public decimal InsuranceCeiling { get; set; }
    public decimal PrescriptionAmount { get; set; }

    public bool IsInsuranceExpiring { get; set; }
    public int DaysRemaining { get; set; }

    public bool IsOutsideProtocol { get; set; }
    public List<string> ProtocolWarnings { get; set; } = new();

    public List<string> GeneralWarnings { get; set; } = new();
}

/// <summary>
/// DTO tương tác thuốc
/// </summary>
public class DrugInteractionDto
{
    public string Drug1Name { get; set; } = string.Empty;
    public string Drug2Name { get; set; } = string.Empty;
    public int Severity { get; set; } // 1-Nhẹ, 2-Trung bình, 3-Nặng
    public string SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Trung bình",
        3 => "Nặng",
        _ => ""
    };
    public string SeverityColor => Severity switch
    {
        1 => "#FFC107",
        2 => "#FF9800",
        3 => "#F44336",
        _ => "#9E9E9E"
    };
    public string Description { get; set; } = string.Empty;
    public string? Recommendation { get; set; }
}

/// <summary>
/// DTO đơn thuốc mẫu
/// </summary>
public class PrescriptionTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid? DepartmentId { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public bool IsShared { get; set; }

    public List<PrescriptionTemplateItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO item đơn thuốc mẫu
/// </summary>
public class PrescriptionTemplateItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public decimal DefaultQuantity { get; set; }
    public string? DefaultDosage { get; set; }
    public string? DefaultUsage { get; set; }
}

#endregion

#region 3.5 Chỉ định dinh dưỡng

/// <summary>
/// DTO chỉ định suất ăn
/// </summary>
public class NutritionOrderDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? BedName { get; set; }

    public DateTime OrderDate { get; set; }
    public int MealType { get; set; } // 1-Sáng, 2-Trưa, 3-Chiều, 4-Tối
    public string MealTypeName => MealType switch
    {
        1 => "Bữa sáng",
        2 => "Bữa trưa",
        3 => "Bữa chiều",
        4 => "Bữa tối",
        _ => ""
    };

    public int NutritionLevel { get; set; } // 1-Bình thường, 2-Kiêng, 3-Đặc biệt
    public string NutritionLevelName => NutritionLevel switch
    {
        1 => "Bình thường",
        2 => "Kiêng",
        3 => "Đặc biệt",
        _ => ""
    };

    public string? MenuCode { get; set; }
    public string? MenuName { get; set; }
    public string? SpecialRequirements { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đã chuẩn bị, 2-Đã phát
}

/// <summary>
/// DTO tạo chỉ định suất ăn
/// </summary>
public class CreateNutritionOrderDto
{
    public Guid AdmissionId { get; set; }
    public DateTime OrderDate { get; set; }
    public int MealType { get; set; }
    public int NutritionLevel { get; set; }
    public string? MenuCode { get; set; }
    public string? SpecialRequirements { get; set; }
}

/// <summary>
/// DTO tổng hợp suất ăn
/// </summary>
public class NutritionSummaryDto
{
    public DateTime SummaryDate { get; set; }
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public int TotalBreakfast { get; set; }
    public int TotalLunch { get; set; }
    public int TotalDinner { get; set; }
    public int TotalSnack { get; set; }

    public int NormalCount { get; set; }
    public int DietCount { get; set; }
    public int SpecialCount { get; set; }

    public List<NutritionOrderDto> Details { get; set; } = new();
}

#endregion

#region 3.6 Thông tin điều trị

/// <summary>
/// DTO tờ điều trị
/// </summary>
public class TreatmentSheetDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime TreatmentDate { get; set; }

    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;

    // Diễn biến bệnh
    public string? ProgressNotes { get; set; }

    // Y lệnh điều trị
    public string? TreatmentOrders { get; set; }

    // Chăm sóc
    public string? NursingOrders { get; set; }

    // Chế độ dinh dưỡng
    public string? DietOrders { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// DTO tạo tờ điều trị
/// </summary>
public class CreateTreatmentSheetDto
{
    public Guid AdmissionId { get; set; }
    public DateTime TreatmentDate { get; set; }
    public string? ProgressNotes { get; set; }
    public string? TreatmentOrders { get; set; }
    public string? NursingOrders { get; set; }
    public string? DietOrders { get; set; }
}

/// <summary>
/// DTO mẫu tờ điều trị
/// </summary>
public class TreatmentSheetTemplateDto
{
    public Guid Id { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string TemplateName { get; set; } = string.Empty;
    public string? TemplateContent { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedBy { get; set; }
    public bool IsShared { get; set; }
}

/// <summary>
/// DTO dấu hiệu sinh tồn
/// </summary>
public class VitalSignsRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime RecordTime { get; set; }

    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? SpO2 { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }

    public string? Notes { get; set; }

    public Guid RecordedBy { get; set; }
    public string RecordedByName { get; set; } = string.Empty;
}

/// <summary>
/// DTO tạo dấu hiệu sinh tồn
/// </summary>
public class CreateVitalSignsDto
{
    public Guid AdmissionId { get; set; }
    public DateTime RecordTime { get; set; }

    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? SpO2 { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO biểu đồ sinh tồn
/// </summary>
public class VitalSignsChartDto
{
    public Guid AdmissionId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<VitalSignsPointDto> TemperatureData { get; set; } = new();
    public List<VitalSignsPointDto> PulseData { get; set; } = new();
    public List<VitalSignsPointDto> BPData { get; set; } = new();
    public List<VitalSignsPointDto> SpO2Data { get; set; } = new();
}

/// <summary>
/// DTO điểm dữ liệu sinh tồn
/// </summary>
public class VitalSignsPointDto
{
    public DateTime Time { get; set; }
    public decimal? Value { get; set; }
    public decimal? Value2 { get; set; } // For BP (systolic/diastolic)
}

/// <summary>
/// DTO hội chẩn
/// </summary>
public class ConsultationDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public int ConsultationType { get; set; } // 1-Hội chẩn khoa, 2-Hội chẩn BV, 3-Thuốc dấu *, 4-PTTT
    public string ConsultationTypeName => ConsultationType switch
    {
        1 => "Hội chẩn khoa",
        2 => "Hội chẩn bệnh viện",
        3 => "Hội chẩn thuốc dấu *",
        4 => "Hội chẩn PTTT",
        _ => ""
    };

    public DateTime ConsultationDate { get; set; }
    public TimeSpan? ConsultationTime { get; set; }
    public string? Location { get; set; }

    public Guid ChairmanId { get; set; }
    public string ChairmanName { get; set; } = string.Empty;

    public Guid SecretaryId { get; set; }
    public string SecretaryName { get; set; } = string.Empty;

    public List<ConsultationMemberDto> Members { get; set; } = new();

    public string? Reason { get; set; }
    public string? ClinicalFindings { get; set; }
    public string? LabResults { get; set; }
    public string? ImageResults { get; set; }

    public string? Conclusion { get; set; }
    public string? Treatment { get; set; }

    public int Status { get; set; } // 0-Chờ, 1-Đang HC, 2-Hoàn thành
}

/// <summary>
/// DTO thành viên hội chẩn
/// </summary>
public class ConsultationMemberDto
{
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Department { get; set; }
    public string? Opinion { get; set; }
}

/// <summary>
/// DTO tạo hội chẩn
/// </summary>
public class CreateConsultationDto
{
    public Guid AdmissionId { get; set; }
    public int ConsultationType { get; set; }
    public DateTime ConsultationDate { get; set; }
    public TimeSpan? ConsultationTime { get; set; }
    public string? Location { get; set; }

    public Guid ChairmanId { get; set; }
    public Guid SecretaryId { get; set; }
    public List<Guid> MemberIds { get; set; } = new();

    public string? Reason { get; set; }
    public string? ClinicalFindings { get; set; }
}

/// <summary>
/// DTO phiếu chăm sóc
/// </summary>
public class NursingCareSheetDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public DateTime CareDate { get; set; }

    public Guid NurseId { get; set; }
    public string NurseName { get; set; } = string.Empty;

    public int Shift { get; set; } // 1-Sáng, 2-Chiều, 3-Đêm
    public string ShiftName => Shift switch
    {
        1 => "Ca sáng",
        2 => "Ca chiều",
        3 => "Ca đêm",
        _ => ""
    };

    // Đánh giá BN
    public string? PatientCondition { get; set; }
    public string? Consciousness { get; set; }

    // Các hoạt động chăm sóc
    public string? HygieneActivities { get; set; }
    public string? MedicationActivities { get; set; }
    public string? NutritionActivities { get; set; }
    public string? MovementActivities { get; set; }

    // Theo dõi đặc biệt
    public string? SpecialMonitoring { get; set; }

    // Vấn đề phát sinh
    public string? IssuesAndActions { get; set; }

    // Ghi chú
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tạo phiếu chăm sóc
/// </summary>
public class CreateNursingCareSheetDto
{
    public Guid AdmissionId { get; set; }
    public DateTime CareDate { get; set; }
    public int Shift { get; set; }

    public string? PatientCondition { get; set; }
    public string? Consciousness { get; set; }
    public string? HygieneActivities { get; set; }
    public string? MedicationActivities { get; set; }
    public string? NutritionActivities { get; set; }
    public string? MovementActivities { get; set; }
    public string? SpecialMonitoring { get; set; }
    public string? IssuesAndActions { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO phiếu truyền dịch
/// </summary>
public class InfusionRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public string FluidName { get; set; } = string.Empty;
    public int Volume { get; set; } // ml
    public int DropRate { get; set; } // giọt/phút

    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }

    public string? Route { get; set; } // Đường truyền
    public string? AdditionalMedication { get; set; }

    public Guid StartedBy { get; set; }
    public string StartedByName { get; set; } = string.Empty;

    public string? Observations { get; set; }
    public string? Complications { get; set; }

    public int Status { get; set; } // 0-Đang truyền, 1-Hoàn thành, 2-Ngừng
}

/// <summary>
/// DTO tạo phiếu truyền dịch
/// </summary>
public class CreateInfusionRecordDto
{
    public Guid AdmissionId { get; set; }
    public string FluidName { get; set; } = string.Empty;
    public int Volume { get; set; }
    public int DropRate { get; set; }
    public DateTime StartTime { get; set; }
    public string? Route { get; set; }
    public string? AdditionalMedication { get; set; }
}

/// <summary>
/// DTO phiếu truyền máu
/// </summary>
public class BloodTransfusionDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public string BloodType { get; set; } = string.Empty; // Nhóm máu
    public string RhFactor { get; set; } = string.Empty;

    public string BloodProductType { get; set; } = string.Empty; // Loại chế phẩm
    public string BagNumber { get; set; } = string.Empty; // Số túi máu
    public int Volume { get; set; } // ml

    public DateTime TransfusionStart { get; set; }
    public DateTime? TransfusionEnd { get; set; }

    public Guid DoctorOrderId { get; set; }
    public string DoctorOrderName { get; set; } = string.Empty;

    public Guid? ExecutedBy { get; set; }
    public string? ExecutedByName { get; set; }

    // Theo dõi phản ứng
    public string? PreTransfusionVitals { get; set; }
    public string? DuringTransfusionVitals { get; set; }
    public string? PostTransfusionVitals { get; set; }

    public bool HasReaction { get; set; }
    public string? ReactionDetails { get; set; }

    public int Status { get; set; }
}

/// <summary>
/// DTO tạo phiếu truyền máu
/// </summary>
public class CreateBloodTransfusionDto
{
    public Guid AdmissionId { get; set; }
    public string BloodType { get; set; } = string.Empty;
    public string RhFactor { get; set; } = string.Empty;
    public string BloodProductType { get; set; } = string.Empty;
    public string BagNumber { get; set; } = string.Empty;
    public int Volume { get; set; }
    public DateTime TransfusionStart { get; set; }
}

/// <summary>
/// DTO phản ứng thuốc
/// </summary>
public class DrugReactionRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }
    public Guid? MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;

    public DateTime ReactionTime { get; set; }
    public int Severity { get; set; } // 1-Nhẹ, 2-Vừa, 3-Nặng
    public string SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Vừa",
        3 => "Nặng",
        _ => ""
    };

    public string Symptoms { get; set; } = string.Empty;
    public string? Treatment { get; set; }
    public string? Outcome { get; set; }

    public Guid ReportedBy { get; set; }
    public string ReportedByName { get; set; } = string.Empty;
}

/// <summary>
/// DTO tai nạn thương tích
/// </summary>
public class InjuryRecordDto
{
    public Guid Id { get; set; }
    public Guid AdmissionId { get; set; }

    public int InjuryType { get; set; }
    public string InjuryTypeName => InjuryType switch
    {
        1 => "Tai nạn giao thông",
        2 => "Tai nạn lao động",
        3 => "Tai nạn sinh hoạt",
        4 => "Bạo lực",
        5 => "Tự gây",
        6 => "Khác",
        _ => ""
    };

    public DateTime InjuryTime { get; set; }
    public string? InjuryLocation { get; set; }

    public string? InjuryDescription { get; set; }
    public string? AffectedParts { get; set; }

    public bool InvolvedAlcohol { get; set; }
    public bool InvolvedDrugs { get; set; }

    public string? PoliceReportNumber { get; set; }
}

/// <summary>
/// DTO hồ sơ trẻ sơ sinh
/// </summary>
public class NewbornRecordDto
{
    public Guid Id { get; set; }
    public Guid MotherAdmissionId { get; set; }

    public DateTime BirthDate { get; set; }
    public TimeSpan BirthTime { get; set; }
    public int Gender { get; set; }

    public decimal BirthWeight { get; set; } // gram
    public decimal BirthLength { get; set; } // cm
    public decimal HeadCircumference { get; set; } // cm

    public int ApgarScore1Min { get; set; }
    public int ApgarScore5Min { get; set; }
    public int? ApgarScore10Min { get; set; }

    public string? DeliveryMethod { get; set; }
    public string? Complications { get; set; }

    public string? InitialExamFindings { get; set; }
    public string? VitaminKGiven { get; set; }
    public string? HepBVaccine { get; set; }

    public Guid? NewbornAdmissionId { get; set; }
}

#endregion

#region 3.7 Kết thúc điều trị

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

#endregion

#region 3.8 Quản lý báo cáo

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

#endregion

#region Search và Filter

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

#endregion
