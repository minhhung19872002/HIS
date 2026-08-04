namespace HIS.Application.DTOs.Inpatient;


/// <summary>
/// F8.13 — aggregate thong ke qua trinh dieu tri 1 admission:
/// (1) so luong tung thuoc, (2) tan suat tung ma chan doan
/// </summary>
public class TreatmentStatAggregateDto
{
    /// <summary>So luong tung thuoc (tu PrescriptionDetail noi tru, tru huy)</summary>
    public List<DrugCountItemDto> DrugCounts { get; set; } = new();
    /// <summary>Tan suat tung ma chan doan ICD-10 (tu Prescription.DiagnosisCode)</summary>
    public List<DiagnosisFrequencyItemDto> DiagnosisFrequency { get; set; } = new();
}

/// <summary>1 dong trong bieu do so luong thuoc</summary>
public class DrugCountItemDto
{
    public string MedicineId { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    /// <summary>Tong so luong (decimal giu nguyen de hien thi chinh xac)</summary>
    public decimal TotalQuantity { get; set; }
}

/// <summary>1 dong trong bieu do tan suat chan doan</summary>
public class DiagnosisFrequencyItemDto
{
    public string DiagnosisCode { get; set; } = string.Empty;
    public string DiagnosisName { get; set; } = string.Empty;
    /// <summary>So don thuoc chua ma chan doan nay</summary>
    public int Count { get; set; }
}



/// <summary>
/// Chẩn đoán kèm theo (1 item)
/// </summary>
public class SecondaryDiagnosisItemDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// DTO lưu chẩn đoán tờ điều trị nội trú (chẩn đoán chính + kèm theo)
/// Lưu vào MedicalRecord: MainIcdCode / MainDiagnosis / SubIcdCodes (JSON) / SubDiagnosis
/// </summary>
public class SaveInpatientDiagnosisDto
{
    public string? MainDiagnosisCode { get; set; }
    public string? MainDiagnosis { get; set; }
    /// <summary>JSON list of secondary diagnoses [{Code, Name}]</summary>
    public List<SecondaryDiagnosisItemDto> SecondaryDiagnoses { get; set; } = new();
}

/// <summary>
/// Kết quả trả về sau khi lưu chẩn đoán nội trú
/// </summary>
public class InpatientDiagnosisDto
{
    public string? MainDiagnosisCode { get; set; }
    public string? MainDiagnosis { get; set; }
    public List<SecondaryDiagnosisItemDto> SecondaryDiagnoses { get; set; } = new();
}



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



/// <summary>
/// DTO danh sách bệnh nhân trong buồng/khoa
/// </summary>
public class InpatientListDto
{
    public Guid AdmissionId { get; set; }
    public Guid PatientId { get; set; }
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
/// Một mục trong worklist "chờ nhập viện": phiên khám OPD đã kết luận nhập viện
/// (ConclusionType=3) nhưng CHƯA tạo hồ sơ nội trú (chưa có Admission).
/// Khoa nội trú chọn từ list này để admit thay vì gõ tay Mã HSBA
/// (audit luồng nghiệp vụ 2026-06-06 #4).
/// </summary>
public class PendingAdmissionDto
{
    public Guid ExaminationId { get; set; }
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;

    public Guid? DepartmentId { get; set; }      // Khoa đề nghị nhập (HospitalizationDepartmentId)
    public string? DepartmentName { get; set; }
    public bool IsEmergency { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? Reason { get; set; }
    public DateTime? RequestedAt { get; set; }
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
    public List<InpatientServiceOrderItemDto> ServiceOrders { get; set; } = new();
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
public class InpatientServiceOrderItemDto
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



/// <summary>
/// NangCap26 XIX.2 #20 — tách điều trị nội trú tại khoa cấp cứu.
/// </summary>
public class SplitEmergencyToInpatientDto
{
    /// <summary>Hồ sơ cấp cứu nguồn.</summary>
    public Guid SourceMedicalRecordId { get; set; }
    /// <summary>Mốc tách (mặc định: thời điểm hiện tại).</summary>
    public DateTime? SplitAt { get; set; }

    public Guid DepartmentId { get; set; }
    public Guid RoomId { get; set; }
    public Guid? BedId { get; set; }
    public Guid AttendingDoctorId { get; set; }

    public string? DiagnosisOnAdmission { get; set; }
    public string? IcdCode { get; set; }
}

/// <summary>Kết quả tách đợt điều trị (NangCap26 XIX.2 #20).</summary>
public class SplitEmergencyResultDto
{
    public Guid SourceMedicalRecordId { get; set; }
    public string SourceMedicalRecordCode { get; set; } = string.Empty;
    public Guid TargetMedicalRecordId { get; set; }
    public string TargetMedicalRecordCode { get; set; } = string.Empty;
    public Guid AdmissionId { get; set; }
    public DateTime SplitAt { get; set; }
    public int MovedServiceRequests { get; set; }
    public int MovedPrescriptions { get; set; }
}
