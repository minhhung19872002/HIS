namespace HIS.Application.DTOs.Inpatient;


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

    // G-07: loai y lenh (1-Thuong qui, 2-Xuat tu truc, 3-Hoan tra, 4-Don xuat vien)
    public int DrugOrderType { get; set; }

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

    // G-07: 1-Thuong qui, 2-Xuat tu truc, 3-Hoan tra, 4-Don xuat vien (toa ve). Default = 1.
    public int DrugOrderType { get; set; } = 1;

    public List<CreateInpatientMedicineItemDto> Items { get; set; } = new();

    // #185/#186: lý do bác sĩ bỏ qua cảnh báo dị-ứng/tương-tác nghiêm trọng (vẫn lưu đơn). Bỏ trống + có cảnh báo → CHẶN (400).
    public string? OverrideReason { get; set; }
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


