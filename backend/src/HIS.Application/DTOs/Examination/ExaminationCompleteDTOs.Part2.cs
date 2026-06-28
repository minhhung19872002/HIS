namespace HIS.Application.DTOs.Examination;


/// <summary>
/// DTO chỉ định dịch vụ đầy đủ
/// </summary>
public class ServiceOrderFullDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime OrderDate { get; set; }

    // Chẩn đoán đi kèm
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Thông tin dịch vụ
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int ServiceType { get; set; } // 1-XN, 2-CĐHA, 3-TDCN, 4-PTTT, 5-Khác
    public int Quantity { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal PatientPrice { get; set; }
    public decimal? Surcharge { get; set; }

    // Phòng thực hiện
    public Guid? RoomId { get; set; }
    public string? RoomName { get; set; }

    // Đối tượng thanh toán
    public int PaymentType { get; set; } // 1-BHYT, 2-Viện phí, 3-Dịch vụ
    public Guid? PayerSourceId { get; set; }

    // Ưu tiên
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ, 1-Đang thực hiện, 2-Có kết quả, 3-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ thực hiện",
        1 => "Đang thực hiện",
        2 => "Có kết quả",
        3 => "Đã hủy",
        _ => ""
    };

    // Ghi chú
    public string? OrderNotes { get; set; }
    public string? ServiceNotes { get; set; }

    // Người chỉ định
    public Guid OrderedById { get; set; }
    public string? OrderedByName { get; set; }
    public Guid? ConsultantId { get; set; }
    public string? ConsultantName { get; set; }

    // Kết quả (nếu có)
    public string? Result { get; set; }
    public DateTime? ResultDate { get; set; }
}

/// <summary>
/// DTO tạo chỉ định dịch vụ
/// </summary>
public class CreateServiceOrderDto
{
    public Guid ExaminationId { get; set; }

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Danh sách dịch vụ
    public List<ExaminationServiceOrderItemDto> Services { get; set; } = new();

    // Cấu hình
    public bool AutoSelectRoom { get; set; } = true;
    public bool CalculateOptimalPath { get; set; } = false;
}

public class ExaminationServiceOrderItemDto
{
    public Guid ServiceId { get; set; }
    public int Quantity { get; set; } = 1;
    public Guid? RoomId { get; set; }
    public int PaymentType { get; set; }
    public Guid? PayerSourceId { get; set; }
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }
    public string? Notes { get; set; }
    public decimal? Surcharge { get; set; }
}

/// <summary>
/// DTO nhóm dịch vụ
/// </summary>
public class ServiceGroupTemplateDto
{
    public Guid Id { get; set; }
    public string? TemplateCode { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public int GroupType { get; set; } // 1-Cá nhân, 2-Khoa, 3-Bệnh viện
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public bool IsPublic { get; set; }

    public List<Guid> ServiceIds { get; set; } = new();
    public List<ServiceGroupTemplateItemDto> Services { get; set; } = new();
    public bool IsDefault { get; set; }
}

public class ServiceGroupTemplateItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO gói dịch vụ
/// </summary>
public class ServicePackageDto
{
    public Guid Id { get; set; }
    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public decimal PackagePrice { get; set; }

    public List<ServicePackageItemDto> Services { get; set; } = new();
}

public class ServicePackageItemDto
{
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

/// <summary>
/// DTO cảnh báo chỉ định
/// </summary>
public class ServiceOrderWarningDto
{
    public int WarningType { get; set; }
    public string WarningTypeName => WarningType switch
    {
        1 => "Trùng dịch vụ trong ngày",
        2 => "Hết tiền tạm ứng",
        3 => "HBA1C chưa đủ thời gian (TT35)",
        4 => "Vượt gói dịch vụ",
        5 => "Ngoài phác đồ",
        _ => ""
    };
    public string Message { get; set; } = string.Empty;
    public bool IsBlocking { get; set; }
    public Guid? RelatedServiceId { get; set; }
    public DateTime? LastOrderDate { get; set; }
}



/// <summary>
/// DTO đơn thuốc đầy đủ
/// </summary>
public class PrescriptionFullDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public DateTime PrescriptionDate { get; set; }
    public int PrescriptionType { get; set; } // 1-Ngoại trú, 2-Nội trú, 3-YHCT, 4-Mua ngoài

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Kho xuất
    public Guid? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }

    // Số ngày đơn
    public int TotalDays { get; set; }

    // Danh sách thuốc
    public List<PrescriptionItemFullDto> Items { get; set; } = new();

    // Tổng tiền
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }

    // Đối tượng
    public int PaymentType { get; set; }

    // Lời dặn
    public string? Instructions { get; set; }

    // Trạng thái
    public int Status { get; set; } // 0-Chờ duyệt, 1-Đã duyệt, 2-Đã phát, 3-Hủy
    public string StatusName => Status switch
    {
        0 => "Chờ duyệt",
        1 => "Đã duyệt",
        2 => "Đã phát thuốc",
        3 => "Đã hủy",
        _ => ""
    };

    // Người kê
    public Guid PrescribedById { get; set; }
    public string? PrescribedByName { get; set; }
}

/// <summary>
/// DTO chi tiết thuốc trong đơn
/// </summary>
public class PrescriptionItemFullDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Manufacturer { get; set; }
    public string? Country { get; set; }

    // Số lượng
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public int Days { get; set; }

    // Liều dùng
    public string? Dosage { get; set; }
    public string? Route { get; set; } // Đường dùng
    public string? Frequency { get; set; }
    public string? UsageInstructions { get; set; }

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal InsurancePrice { get; set; }
    public decimal PatientPrice { get; set; }

    // Thông tin lô
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Đối tượng
    public int PaymentType { get; set; }

    // Trạng thái kho
    public decimal AvailableQuantity { get; set; }
    public bool IsOutOfStock { get; set; }
}

/// <summary>
/// DTO tạo đơn thuốc
/// </summary>
public class CreateExaminationPrescriptionDto
{
    public Guid ExaminationId { get; set; }
    public int PrescriptionType { get; set; }
    public int PaymentCategory { get; set; } // 1-BHYT, 2-Thu phí, 3-Thuốc ngoài (see PaymentCategory constants)

    // Chẩn đoán
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }

    // Kho xuất
    public Guid? WarehouseId { get; set; }

    // Số ngày
    public int TotalDays { get; set; }

    // Danh sách thuốc
    public List<CreatePrescriptionItemDto> Items { get; set; } = new();

    // Lời dặn
    public string? Instructions { get; set; }

    // #185/#186: lý do bác sĩ CỐ TÌNH bỏ qua cảnh báo dị-ứng/tương-tác nghiêm trọng (vẫn lưu đơn).
    // Bỏ trống + có cảnh báo nghiêm trọng → đơn bị CHẶN (400). Có lý do → lưu được + ghi audit vào Instructions.
    public string? OverrideReason { get; set; }
}

public class CreatePrescriptionItemDto
{
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public int Days { get; set; }
    public string? Dosage { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? UsageInstructions { get; set; }
    public int PaymentType { get; set; }
}

/// <summary>
/// DTO mẫu đơn thuốc
/// </summary>
public class ExaminationPrescriptionTemplateDto
{
    public Guid Id { get; set; }
    public string? TemplateCode { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TemplateType { get; set; } // 1-Cá nhân, 2-Khoa, 3-Bệnh viện
    public Guid? DepartmentId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public bool IsPublic { get; set; }

    public List<CreatePrescriptionItemDto> Items { get; set; } = new();
    public List<ExaminationPrescriptionTemplateItemDto> TemplateItems { get; set; } = new();
    public string? Instructions { get; set; }
    public bool IsShared { get; set; }
}

public class ExaminationPrescriptionTemplateItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public int Days { get; set; }
    public string? Dosage { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? UsageInstructions { get; set; }
}

/// <summary>
/// DTO tương tác thuốc
/// </summary>
public class DrugInteractionDto
{
    public Guid Medicine1Id { get; set; }
    public string Medicine1Name { get; set; } = string.Empty;
    public Guid Medicine2Id { get; set; }
    public string Medicine2Name { get; set; } = string.Empty;
    public Guid Drug1Id { get; set; }
    public string Drug1Name { get; set; } = string.Empty;
    public Guid Drug2Id { get; set; }
    public string Drug2Name { get; set; } = string.Empty;

    public string? InteractionType { get; set; }
    public int Severity { get; set; } // 1-Nhẹ, 2-Trung bình, 3-Nặng, 4-Chống chỉ định
    public string SeverityName => Severity switch
    {
        1 => "Nhẹ",
        2 => "Trung bình",
        3 => "Nặng",
        4 => "Chống chỉ định",
        _ => ""
    };
    public string SeverityColor => Severity switch
    {
        1 => "#52c41a",
        2 => "#faad14",
        3 => "#fa8c16",
        4 => "#f5222d",
        _ => ""
    };

    public string? Description { get; set; }
    public string? Recommendation { get; set; }
}

/// <summary>
/// DTO cảnh báo kê đơn
/// </summary>
public class PrescriptionWarningDto
{
    public Guid MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string WarningType { get; set; } = string.Empty;
    public int WarningTypeCode { get; set; }
    public string WarningTypeName => WarningTypeCode switch
    {
        1 => "Ngoài phác đồ",
        2 => "Trùng thuốc trong ngày",
        3 => "Tương tác thuốc",
        4 => "Trùng nhóm kháng sinh",
        5 => "Vượt số ngày BHYT",
        6 => "Vượt trần BHYT",
        7 => "Vượt chi phí gói",
        8 => "Dị ứng thuốc",
        9 => "Chống chỉ định",
        _ => ""
    };
    public string Message { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string? Recommendation { get; set; }
    public bool IsBlocking { get; set; }
    public Guid? RelatedMedicineId { get; set; }
}

/// <summary>
/// DTO thư viện lời dặn
/// </summary>
public class InstructionLibraryDto
{
    public Guid Id { get; set; }
    public string? Code { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Instruction { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsDefault { get; set; }
    public Guid? CreatedByUserId { get; set; }
}



/// <summary>
/// DTO kết luận khám bệnh
/// </summary>
public class ExaminationConclusionDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }

    public int ConclusionType { get; set; }
    // 1-Cấp đơn cho về, 2-Cho về, 3-Nhập viện, 4-Chuyển viện, 5-Tử vong
    // 6-Hẹn khám mới, 7-Hẹn khám tiếp, 8-Khác
    public string ConclusionTypeName => ConclusionType switch
    {
        1 => "Cấp đơn cho về",
        2 => "Cho về",
        3 => "Nhập viện",
        4 => "Chuyển viện",
        5 => "Tử vong",
        6 => "Hẹn khám mới",
        7 => "Hẹn khám tiếp",
        8 => "Khác",
        _ => ""
    };

    public string? ConclusionNotes { get; set; }

    // Thông tin nhập viện (nếu có)
    public Guid? AdmissionDepartmentId { get; set; }
    public string? AdmissionDepartmentName { get; set; }
    public string? AdmissionReason { get; set; }

    // Thông tin chuyển viện (nếu có)
    public string? TransferToFacility { get; set; }
    public string? TransferReason { get; set; }

    // Thông tin hẹn khám (nếu có)
    public DateTime? NextAppointmentDate { get; set; }
    public string? AppointmentNotes { get; set; }

    // Nghỉ ốm (nếu có)
    public int? SickLeaveDays { get; set; }
    public DateTime? SickLeaveFromDate { get; set; }
    public DateTime? SickLeaveToDate { get; set; }

    public DateTime ConcludedAt { get; set; }
    public string? ConcludedBy { get; set; }
}

/// <summary>
/// DTO hoàn thành khám bệnh
/// </summary>
public class CompleteExaminationDto
{
    public int ConclusionType { get; set; }
    public string? ConclusionNotes { get; set; }

    // Nhập viện
    public Guid? AdmissionDepartmentId { get; set; }
    public string? AdmissionReason { get; set; }

    // Chuyển viện
    public string? TransferToFacility { get; set; }
    public string? TransferReason { get; set; }

    // Hẹn khám
    public DateTime? NextAppointmentDate { get; set; }
    public string? AppointmentNotes { get; set; }

    // Nghỉ ốm
    public int? SickLeaveDays { get; set; }

    // Chẩn đoán cuối cùng
    public string? FinalDiagnosisCode { get; set; }
    public string? FinalDiagnosisName { get; set; }
}



/// <summary>
/// DTO thống kê khám bệnh
/// </summary>
public class ExaminationStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalExaminations { get; set; }
    public int InsuranceExaminations { get; set; }
    public int FeeExaminations { get; set; }

    // Theo trạng thái
    public int PendingCount { get; set; }
    public int InProgressCount { get; set; }
    public int WaitingResultCount { get; set; }
    public int CompletedCount { get; set; }

    // Theo kết luận
    public int DischargedHomeCount { get; set; }
    public int HospitalizedCount { get; set; }
    public int TransferredCount { get; set; }
    public int ReexaminationCount { get; set; }

    // Thời gian
    public double AverageWaitingTime { get; set; } // phút
    public double AverageExaminationTime { get; set; } // phút

    // Theo khoa/phòng
    public Dictionary<string, int> ByDepartment { get; set; } = new();
    public Dictionary<string, int> ByRoom { get; set; } = new();

    // Theo bác sĩ
    public List<DoctorExaminationStatDto> ByDoctor { get; set; } = new();
}

public class DoctorExaminationStatDto
{
    public Guid DoctorId { get; set; }
    public string DoctorCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public int TotalExaminations { get; set; }
    public int InsuranceExaminations { get; set; }
    public int FeeExaminations { get; set; }
    public int ServiceExaminations { get; set; }
    public int CompletedCount { get; set; }
    public int PendingCount { get; set; }
    public double AverageExaminationTime { get; set; }
}

/// <summary>
/// DTO báo cáo bệnh truyền nhiễm
/// </summary>
public class CommunicableDiseaseReportDto
{
    public Guid ExaminationId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string IcdCode { get; set; } = string.Empty;
    public string DiseaseName { get; set; } = string.Empty;
    public DateTime DiagnosisDate { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO nhật ký hoạt động khám bệnh
/// </summary>
public class ExaminationActivityLogDto
{
    public Guid Id { get; set; }
    public Guid ExaminationId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string ActionDescription { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime ActionTime { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
}

/// <summary>
/// DTO cấu hình màn hình chờ
/// </summary>
public class WaitingRoomDisplayConfigDto
{
    public Guid RoomId { get; set; }
    public string? DisplayTitle { get; set; }
    public int DisplayRows { get; set; }
    public bool ShowPatientName { get; set; }
    public bool ShowPatientCode { get; set; }
    public bool EnableVoiceCall { get; set; }
    public int CallIntervalSeconds { get; set; }
    public string? BackgroundColor { get; set; }
    public string? TextColor { get; set; }
}

/// <summary>
/// DTO sổ khám bệnh (QĐ 4069)
/// </summary>
public class ExaminationRegisterDto
{
    public int RowNumber { get; set; }
    public DateTime ExaminationDate { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? InsuranceNumber { get; set; }
    public string? DiagnosisCode { get; set; }
    public string? DiagnosisName { get; set; }
    public string? TreatmentResult { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
}



/// <summary>
/// DTO y lệnh thuốc
/// </summary>
public class MedicationOrderDto
{
    public Guid Id { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;

    public decimal MorningDose { get; set; }
    public decimal NoonDose { get; set; }
    public decimal AfternoonDose { get; set; }
    public decimal EveningDose { get; set; }
    public decimal TotalDailyDose { get; set; }

    public string Unit { get; set; } = string.Empty;
    public string? Route { get; set; }
    public string? Notes { get; set; }
}


// === Drug Interaction Import DTOs (Issue #96) ===

/// <summary>
/// Ket qua sau khi import file CSV cap tuong tac thuoc theo hoat chat.
/// NOTE: Excel can them thu vien ClosedXML/EPPlus; hien tai chi ho tro CSV.
/// </summary>
public class DrugInteractionImportResultDto
{
    public int TotalRows { get; set; }
    public int Imported { get; set; }    // Them moi
    public int Updated { get; set; }     // Cap nhat (upsert)
    public int Skipped { get; set; }     // Bo qua (du lieu loi)
    public List<DrugInteractionImportErrorDto> Errors { get; set; } = new();
}

public class DrugInteractionImportErrorDto
{
    public int RowNumber { get; set; }
    public string? ActiveIngredient1 { get; set; }
    public string? ActiveIngredient2 { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
}
