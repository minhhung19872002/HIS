namespace HIS.Application.DTOs.Surgery;


/// <summary>
/// DTO cho kê thuốc trong PTTT
/// </summary>
public class SurgeryPrescriptionDto
{
    public Guid SurgeryId { get; set; }
    public string? DiagnosisMain { get; set; }
    public string? DiagnosisMainIcd { get; set; }
    public string? DiagnosisSecondary { get; set; }
    public string? ExternalCause { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public List<SurgeryMedicineDto> Medicines { get; set; } = new();
    public List<SurgerySupplyDto> Supplies { get; set; } = new();

    public decimal TotalMedicineCost { get; set; }
    public decimal TotalSupplyCost { get; set; }
    public decimal TotalCost { get; set; }

    // Cảnh báo vượt gói
    public decimal? PackageLimit { get; set; }
    public bool IsOverLimit { get; set; }
    public decimal? OverLimitAmount { get; set; }
}

/// <summary>
/// DTO cho thêm thuốc vào PTTT
/// </summary>
public class AddSurgeryMedicineDto
{
    public Guid SurgeryId { get; set; }
    public Guid MedicineId { get; set; }
    public decimal Quantity { get; set; }
    public Guid WarehouseId { get; set; }
    public string? BatchNumber { get; set; }
    public bool IsInPackage { get; set; }
    public int PaymentObject { get; set; }
    public string? UsageInstruction { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho thêm vật tư vào PTTT
/// </summary>
public class AddSurgerySupplyDto
{
    public Guid SurgeryId { get; set; }
    public Guid SupplyId { get; set; }
    public decimal Quantity { get; set; }
    public Guid WarehouseId { get; set; }
    public bool IsInPackage { get; set; }
    public int PaymentObject { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho mẫu đơn thuốc PTTT
/// </summary>
public class SurgeryPrescriptionTemplateDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? SurgeryServiceId { get; set; }
    public string? SurgeryServiceName { get; set; }

    public List<TemplateMedicineItemDto> Medicines { get; set; } = new();
    public List<TemplateSupplyItemDto> Supplies { get; set; } = new();

    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public bool IsShared { get; set; }
}

/// <summary>
/// DTO cho thuốc trong mẫu
/// </summary>
public class TemplateMedicineItemDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? UsageInstruction { get; set; }
}

/// <summary>
/// DTO cho vật tư trong mẫu
/// </summary>
public class TemplateSupplyItemDto
{
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
}

/// <summary>
/// DTO cho cảnh báo thuốc
/// </summary>
public class MedicineWarningDto
{
    public int WarningType { get; set; } // 1-Trùng, 2-Tương tác, 3-Trùng KS, 4-Vượt gói, 5-Hết hạn
    public string WarningTypeName { get; set; } = string.Empty;
    public int Severity { get; set; } // 1-Thấp, 2-Trung bình, 3-Cao, 4-Nguy hiểm
    public string SeverityColor { get; set; } = string.Empty; // green, yellow, orange, red
    public string Message { get; set; } = string.Empty;
    public Guid? RelatedMedicineId { get; set; }
    public string? RelatedMedicineName { get; set; }
}

/// <summary>
/// DTO cho thông tin thuốc chi tiết
/// </summary>
public class MedicineDetailDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string? Dosage { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Country { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal StockQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Contraindications { get; set; }
    public string? Interactions { get; set; }
}



/// <summary>
/// DTO cho kê đơn máu
/// </summary>
public class SurgeryBloodOrderDto
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }

    // Chẩn đoán
    public string? DiagnosisMain { get; set; }
    public string? DiagnosisMainIcd { get; set; }
    public string? DiagnosisSecondary { get; set; }
    public string? ExternalCause { get; set; }

    // Kho máu
    public Guid BloodBankId { get; set; }
    public string BloodBankName { get; set; } = string.Empty;

    // Chi tiết máu
    public List<BloodProductItemDto> BloodProducts { get; set; } = new();

    public decimal TotalCost { get; set; }

    // Trạng thái
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    public DateTime OrderedAt { get; set; }
    public Guid OrderedBy { get; set; }
    public string OrderedByName { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho chế phẩm máu
/// </summary>
public class BloodProductItemDto
{
    public Guid Id { get; set; }
    public Guid BloodProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string BloodType { get; set; } = string.Empty; // A, B, AB, O
    public string RhFactor { get; set; } = string.Empty; // +, -
    public int Volume { get; set; } // ml
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public string? BagNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public decimal StockQuantity { get; set; }
}

/// <summary>
/// DTO cho tạo kê đơn máu
/// </summary>
public class CreateBloodOrderDto
{
    public Guid SurgeryId { get; set; }
    public string? DiagnosisMain { get; set; }
    public string? DiagnosisMainIcd { get; set; }
    public Guid BloodBankId { get; set; }
    public List<BloodProductRequestDto> BloodProducts { get; set; } = new();
}

/// <summary>
/// DTO cho yêu cầu máu
/// </summary>
public class BloodProductRequestDto
{
    public Guid BloodProductId { get; set; }
    public string BloodType { get; set; } = string.Empty;
    public string RhFactor { get; set; } = string.Empty;
    public int Quantity { get; set; }
}



/// <summary>
/// DTO cho báo cáo thống kê PTTT
/// </summary>
public class SurgeryStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalSurgeries { get; set; }
    public int EmergencySurgeries { get; set; }
    public int ScheduledSurgeries { get; set; }

    public int CompletedCount { get; set; }
    public int CancelledCount { get; set; }

    // Theo loại
    public List<SurgeryTypeStatDto> ByType { get; set; } = new();

    // Theo khoa
    public List<SurgeryDepartmentStatDto> ByDepartment { get; set; } = new();

    // Theo bác sĩ
    public List<SurgeonStatDto> BySurgeon { get; set; } = new();

    // Theo phòng mổ
    public List<OperatingRoomStatDto> ByRoom { get; set; } = new();

    // Tài chính
    public decimal TotalRevenue { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal TotalProfit { get; set; }
}

/// <summary>
/// DTO cho thống kê theo loại PTTT
/// </summary>
public class SurgeryTypeStatDto
{
    public int SurgeryType { get; set; }
    public string SurgeryTypeName { get; set; } = string.Empty;
    public int SurgeryClass { get; set; }
    public string SurgeryClassName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Revenue { get; set; }
}

/// <summary>
/// DTO cho thống kê theo khoa
/// </summary>
public class SurgeryDepartmentStatDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int SurgeryCount { get; set; }
    public int ProcedureCount { get; set; }
    public decimal Revenue { get; set; }
}

/// <summary>
/// DTO cho thống kê theo bác sĩ
/// </summary>
public class SurgeonStatDto
{
    public Guid DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public int MainSurgeonCount { get; set; }
    public int AssistantCount { get; set; }
    public decimal TotalFee { get; set; }
}

/// <summary>
/// DTO cho thống kê theo phòng mổ
/// </summary>
public class OperatingRoomStatDto
{
    public Guid RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public int SurgeryCount { get; set; }
    public int TotalDurationMinutes { get; set; }
    public double UtilizationRate { get; set; }
}

/// <summary>
/// DTO cho tính công PTTT theo QĐ73
/// </summary>
public class SurgeryFeeCalculationDto
{
    public Guid SurgeryId { get; set; }
    public decimal ServicePrice { get; set; }
    public decimal TotalFeePool { get; set; }

    public List<TeamMemberFeeDto> TeamFees { get; set; } = new();

    public decimal TotalDistributed { get; set; }
    public decimal Remainder { get; set; }
}

/// <summary>
/// DTO cho tiền công thành viên
/// </summary>
public class TeamMemberFeeDto
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public int Role { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public decimal FeePercent { get; set; }
    public decimal FeeAmount { get; set; }
}

/// <summary>
/// DTO cho tính chi phí cuộc mổ (TT37)
/// </summary>
public class SurgeryCostCalculationDto
{
    public Guid SurgeryId { get; set; }

    // Chi phí dịch vụ
    public decimal ServiceCost { get; set; }
    public bool HasTeamChange { get; set; }
    public decimal? AdditionalServiceCost { get; set; }

    // Chi phí thuốc/vật tư
    public decimal MedicineCost { get; set; }
    public decimal SupplyCost { get; set; }

    // Tổng
    public decimal TotalCost { get; set; }
    public decimal InsuranceCoverage { get; set; }
    public decimal PatientPayment { get; set; }
}

/// <summary>
/// DTO cho lợi nhuận PTTT
/// </summary>
public class SurgeryProfitDto
{
    public Guid SurgeryId { get; set; }
    public string SurgeryCode { get; set; } = string.Empty;

    // Doanh thu
    public decimal ServiceRevenue { get; set; }
    public decimal MedicineRevenue { get; set; }
    public decimal SupplyRevenue { get; set; }
    public decimal TotalRevenue { get; set; }

    // Chi phí
    public decimal MedicineCost { get; set; }
    public decimal SupplyCost { get; set; }
    public decimal TeamFee { get; set; }
    public decimal OperatingCost { get; set; }
    public decimal TotalExpense { get; set; }

    // Lợi nhuận
    public decimal Profit { get; set; }
    public double ProfitMargin { get; set; }
}



/// <summary>
/// DTO cho gói PTTT
/// </summary>
public class SurgeryPackageDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid SurgeryServiceId { get; set; }
    public string SurgeryServiceName { get; set; } = string.Empty;

    // Định mức thuốc
    public List<PackageMedicineNormDto> MedicineNorms { get; set; } = new();

    // Định mức vật tư
    public List<PackageSupplyNormDto> SupplyNorms { get; set; } = new();

    public decimal PackagePrice { get; set; }
    public decimal MedicineLimit { get; set; }
    public decimal SupplyLimit { get; set; }

    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho định mức thuốc trong gói
/// </summary>
public class PackageMedicineNormDto
{
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal MinQuantity { get; set; }
    public decimal MaxQuantity { get; set; }
    public decimal StandardQuantity { get; set; }
    public decimal UnitPrice { get; set; }
}

/// <summary>
/// DTO cho định mức vật tư trong gói
/// </summary>
public class PackageSupplyNormDto
{
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal MinQuantity { get; set; }
    public decimal MaxQuantity { get; set; }
    public decimal StandardQuantity { get; set; }
    public decimal UnitPrice { get; set; }
}



/// <summary>
/// DTO cho phòng mổ
/// </summary>
public class OperatingRoomDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Loại phòng: 1-Đại phẫu, 2-Tiểu phẫu, 3-Thủ thuật, 4-Cấp cứu
    public int RoomType { get; set; }
    public string RoomTypeName { get; set; } = string.Empty;

    // Chuyên khoa
    public Guid? SpecialtyId { get; set; }
    public string? SpecialtyName { get; set; }

    // Trạng thái: 1-Sẵn sàng, 2-Đang sử dụng, 3-Bảo trì, 4-Đóng
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Ca mổ hiện tại
    public Guid? CurrentSurgeryId { get; set; }
    public string? CurrentPatientName { get; set; }

    public bool IsActive { get; set; }
}



/// <summary>
/// DTO cho xuất XML 4210 bảng 5 (PTTT)
/// </summary>
public class SurgeryXml4210Dto
{
    public Guid SurgeryId { get; set; }
    public string MaLk { get; set; } = string.Empty; // Mã liên kết
    public int Stt { get; set; }
    public string MaDichVu { get; set; } = string.Empty;
    public string MaVatTu { get; set; } = string.Empty;
    public string MaChiSo { get; set; } = string.Empty;
    public string TenDichVu { get; set; } = string.Empty;
    public string? TenVatTu { get; set; }
    public decimal DonGia { get; set; }
    public decimal SoLuong { get; set; }
    public decimal ThanhTien { get; set; }
    public int TyLeTt { get; set; }
    public decimal TtBhyt { get; set; }
    public int MaKhoa { get; set; }
    public int MaBacSi { get; set; }
    public string MaBenh { get; set; } = string.Empty;
    public DateTime NgayYl { get; set; }
    public int MaPttt { get; set; }
}

