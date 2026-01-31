namespace HIS.Application.DTOs.Surgery;

#region 6.1 Quản lý PTTT

/// <summary>
/// DTO cho thông tin phẫu thuật thủ thuật
/// </summary>
public class SurgeryDto
{
    public Guid Id { get; set; }
    public string SurgeryCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }

    // Thông tin hồ sơ
    public Guid MedicalRecordId { get; set; }
    public string MedicalRecordCode { get; set; } = string.Empty;
    public Guid? InpatientId { get; set; }

    // Khoa yêu cầu
    public Guid RequestDepartmentId { get; set; }
    public string RequestDepartmentName { get; set; } = string.Empty;
    public Guid RequestDoctorId { get; set; }
    public string RequestDoctorName { get; set; } = string.Empty;

    // Phòng mổ
    public Guid? OperatingRoomId { get; set; }
    public string? OperatingRoomName { get; set; }

    // Loại PTTT: 1-Phẫu thuật, 2-Thủ thuật
    public int SurgeryType { get; set; }
    public string SurgeryTypeName { get; set; } = string.Empty;

    // Phân loại: 1-Đặc biệt, 2-Loại 1, 3-Loại 2, 4-Loại 3
    public int SurgeryClass { get; set; }
    public string SurgeryClassName { get; set; } = string.Empty;

    // Tính chất: 1-Cấp cứu, 2-Chương trình
    public int SurgeryNature { get; set; }
    public string SurgeryNatureName { get; set; } = string.Empty;

    // Chẩn đoán
    public string? PreOperativeDiagnosis { get; set; }
    public string? PreOperativeIcdCode { get; set; }
    public string? PostOperativeDiagnosis { get; set; }
    public string? PostOperativeIcdCode { get; set; }
    public string? SecondaryIcdCodes { get; set; }

    // Kỹ thuật mổ
    public Guid SurgeryServiceId { get; set; }
    public string SurgeryServiceCode { get; set; } = string.Empty;
    public string SurgeryServiceName { get; set; } = string.Empty;
    public string? SurgeryMethod { get; set; }

    // Phương pháp vô cảm
    public int AnesthesiaType { get; set; } // 1-Gây mê, 2-Gây tê, 3-Tê tại chỗ, 4-Không vô cảm
    public string AnesthesiaTypeName { get; set; } = string.Empty;
    public string? AnesthesiaMethod { get; set; }

    // Thời gian
    public DateTime? ScheduledDate { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }

    // Mô tả
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Complications { get; set; }

    // Trạng thái: 1-Chờ duyệt, 2-Đã duyệt, 3-Đang thực hiện, 4-Hoàn thành, 5-Hủy
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Ekip mổ
    public List<SurgeryTeamMemberDto> TeamMembers { get; set; } = new();

    // Thuốc/vật tư
    public List<SurgeryMedicineDto> Medicines { get; set; } = new();
    public List<SurgerySupplyDto> Supplies { get; set; } = new();

    // Chi phí
    public decimal ServiceCost { get; set; }
    public decimal MedicineCost { get; set; }
    public decimal SupplyCost { get; set; }
    public decimal TotalCost { get; set; }

    // Lợi nhuận
    public decimal? Revenue { get; set; }
    public decimal? Expense { get; set; }
    public decimal? Profit { get; set; }

    // Audit
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedBy { get; set; }
}

/// <summary>
/// DTO cho thành viên ekip mổ
/// </summary>
public class SurgeryTeamMemberDto
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }
    public Guid StaffId { get; set; }
    public string StaffCode { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public string? Specialty { get; set; }

    // Vai trò: 1-PT viên chính, 2-PT viên phụ 1, 3-PT viên phụ 2, 4-BS gây mê, 5-Phụ mê, 6-Dụng cụ, 7-Chạy ngoài
    public int Role { get; set; }
    public string RoleName { get; set; } = string.Empty;

    // Tiền công theo QĐ73
    public decimal? FeePercent { get; set; }
    public decimal? FeeAmount { get; set; }

    public DateTime? JoinTime { get; set; }
    public DateTime? LeaveTime { get; set; }
}

/// <summary>
/// DTO cho thuốc trong PTTT
/// </summary>
public class SurgeryMedicineDto
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }
    public Guid MedicineId { get; set; }
    public string MedicineCode { get; set; } = string.Empty;
    public string MedicineName { get; set; } = string.Empty;
    public string? ActiveIngredient { get; set; }
    public string Unit { get; set; } = string.Empty;

    // Số lượng
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    // Trong gói / ngoài gói
    public bool IsInPackage { get; set; }
    public decimal? PackageQuantity { get; set; }
    public decimal? ExtraQuantity { get; set; }

    // Kho xuất
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Đối tượng thanh toán
    public int PaymentObject { get; set; }
    public decimal InsuranceRate { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho vật tư trong PTTT
/// </summary>
public class SurgerySupplyDto
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }

    public bool IsInPackage { get; set; }
    public decimal? PackageQuantity { get; set; }
    public decimal? ExtraQuantity { get; set; }

    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    public int PaymentObject { get; set; }
    public decimal InsuranceRate { get; set; }

    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho tạo yêu cầu PTTT
/// </summary>
public class CreateSurgeryRequestDto
{
    public Guid MedicalRecordId { get; set; }
    public Guid? InpatientId { get; set; }
    public Guid SurgeryServiceId { get; set; }
    public int SurgeryType { get; set; }
    public int SurgeryClass { get; set; }
    public int SurgeryNature { get; set; }
    public string? PreOperativeDiagnosis { get; set; }
    public string? PreOperativeIcdCode { get; set; }
    public string? SurgeryMethod { get; set; }
    public int AnesthesiaType { get; set; }
    public string? AnesthesiaMethod { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public Guid? OperatingRoomId { get; set; }
    public string? Notes { get; set; }
    public List<SurgeryTeamMemberRequestDto>? TeamMembers { get; set; }
}

/// <summary>
/// DTO cho thành viên ekip (request)
/// </summary>
public class SurgeryTeamMemberRequestDto
{
    public Guid StaffId { get; set; }
    public int Role { get; set; }
    public decimal? FeePercent { get; set; }
}

/// <summary>
/// DTO cho duyệt mổ
/// </summary>
public class ApproveSurgeryDto
{
    public Guid SurgeryId { get; set; }
    public bool IsApproved { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public Guid? OperatingRoomId { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho lên lịch mổ
/// </summary>
public class ScheduleSurgeryDto
{
    public Guid SurgeryId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public Guid OperatingRoomId { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public List<SurgeryTeamMemberRequestDto>? TeamMembers { get; set; }
}

/// <summary>
/// DTO cho lịch mổ
/// </summary>
public class SurgeryScheduleDto
{
    public DateTime Date { get; set; }
    public Guid OperatingRoomId { get; set; }
    public string OperatingRoomName { get; set; } = string.Empty;
    public List<SurgeryScheduleItemDto> Surgeries { get; set; } = new();
}

/// <summary>
/// DTO cho ca mổ trong lịch
/// </summary>
public class SurgeryScheduleItemDto
{
    public Guid SurgeryId { get; set; }
    public string SurgeryCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string SurgeryServiceName { get; set; } = string.Empty;
    public int SurgeryType { get; set; }
    public int SurgeryNature { get; set; }
    public DateTime? ScheduledTime { get; set; }
    public int EstimatedDuration { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string SurgeonName { get; set; } = string.Empty;
    public string? AnesthesiologistName { get; set; }
}

/// <summary>
/// DTO cho tìm kiếm PTTT
/// </summary>
public class SurgerySearchDto
{
    public string? Keyword { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? OperatingRoomId { get; set; }
    public int? SurgeryType { get; set; }
    public int? SurgeryNature { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

#endregion

#region 6.2 Màn hình chờ phòng mổ

/// <summary>
/// DTO cho danh sách chờ phòng mổ
/// </summary>
public class SurgeryWaitingListDto
{
    public Guid OperatingRoomId { get; set; }
    public string OperatingRoomName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<SurgeryWaitingItemDto> WaitingPatients { get; set; } = new();
    public SurgeryWaitingItemDto? CurrentSurgery { get; set; }
}

/// <summary>
/// DTO cho bệnh nhân chờ mổ
/// </summary>
public class SurgeryWaitingItemDto
{
    public Guid SurgeryId { get; set; }
    public int QueueNumber { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string SurgeryServiceName { get; set; } = string.Empty;
    public int SurgeryType { get; set; }
    public int SurgeryNature { get; set; }
    public DateTime? ScheduledTime { get; set; }
    public int EstimatedDuration { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string SurgeonName { get; set; } = string.Empty;
    public string RequestDepartmentName { get; set; } = string.Empty;
    public DateTime? CheckInTime { get; set; }
}

#endregion

#region 6.3 Thực hiện PTTT

/// <summary>
/// DTO cho thực hiện PTTT
/// </summary>
public class SurgeryExecutionDto
{
    public Guid SurgeryId { get; set; }

    // Chẩn đoán
    public string? PreOperativeDiagnosis { get; set; }
    public string? PreOperativeIcdCode { get; set; }
    public string? PostOperativeDiagnosis { get; set; }
    public string? PostOperativeIcdCode { get; set; }
    public string? SecondaryIcdCodes { get; set; }

    // Thông tin kỹ thuật (TT50)
    public string? SurgeryMethod { get; set; }
    public int AnesthesiaType { get; set; }
    public string? AnesthesiaMethod { get; set; }

    // Thời gian
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }

    // Mô tả
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Complications { get; set; }

    // Ekip mổ
    public List<SurgeryTeamMemberRequestDto> TeamMembers { get; set; } = new();
}

/// <summary>
/// DTO cho tiếp nhận bệnh nhân vào phòng mổ
/// </summary>
public class SurgeryCheckInDto
{
    public Guid SurgeryId { get; set; }
    public DateTime CheckInTime { get; set; }
    public Guid OperatingRoomId { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho bắt đầu ca mổ
/// </summary>
public class StartSurgeryDto
{
    public Guid SurgeryId { get; set; }
    public DateTime StartTime { get; set; }
    public List<SurgeryTeamMemberRequestDto>? TeamMembers { get; set; }
}

/// <summary>
/// DTO cho kết thúc ca mổ
/// </summary>
public class CompleteSurgeryDto
{
    public Guid SurgeryId { get; set; }
    public DateTime EndTime { get; set; }
    public string? PostOperativeDiagnosis { get; set; }
    public string? PostOperativeIcdCode { get; set; }
    public string? Description { get; set; }
    public string? Conclusion { get; set; }
    public string? Complications { get; set; }
}

/// <summary>
/// DTO cho thông tin PTTT theo TT50
/// </summary>
public class SurgeryTT50InfoDto
{
    public Guid SurgeryId { get; set; }

    // Bác sĩ gây mê
    public Guid AnesthesiologistId { get; set; }
    public string AnesthesiologistName { get; set; } = string.Empty;

    // Phụ mê
    public Guid? AssistantAnesthesiologistId { get; set; }
    public string? AssistantAnesthesiologistName { get; set; }

    // Phương pháp vô cảm
    public int AnesthesiaType { get; set; }
    public string AnesthesiaTypeName { get; set; } = string.Empty;
    public string? AnesthesiaMethod { get; set; }
    public string? AnesthesiaNotes { get; set; }

    // Phương pháp phẫu thuật
    public string SurgeryMethod { get; set; } = string.Empty;
    public int SurgeryClass { get; set; }

    // Phẫu thuật viên chính
    public Guid MainSurgeonId { get; set; }
    public string MainSurgeonName { get; set; } = string.Empty;
    public string? MainSurgeonCertificate { get; set; }

    // Phẫu thuật viên phụ
    public List<AssistantSurgeonDto> AssistantSurgeons { get; set; } = new();

    // Điều dưỡng
    public List<SurgeryNurseDto> Nurses { get; set; } = new();
}

/// <summary>
/// DTO cho PT viên phụ
/// </summary>
public class AssistantSurgeonDto
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string? Certificate { get; set; }
    public int Order { get; set; } // 1, 2, 3...
}

/// <summary>
/// DTO cho điều dưỡng PTTT
/// </summary>
public class SurgeryNurseDto
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public int Role { get; set; } // 1-Dụng cụ, 2-Chạy ngoài, 3-Phụ mê
}

#endregion

#region 6.4 Chỉ định dịch vụ trong PTTT

/// <summary>
/// DTO cho chỉ định dịch vụ trong PTTT
/// </summary>
public class SurgeryServiceOrderDto
{
    public Guid Id { get; set; }
    public Guid SurgeryId { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceGroup { get; set; } = string.Empty;

    // Loại dịch vụ: 1-XN, 2-CĐHA, 3-Siêu âm, 4-Nội soi, 5-TDCN, 6-PTTT
    public int ServiceType { get; set; }
    public string ServiceTypeName { get; set; } = string.Empty;

    // Số lượng và giá
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public decimal? Surcharge { get; set; }

    // Phòng thực hiện
    public Guid? ExecuteRoomId { get; set; }
    public string? ExecuteRoomName { get; set; }

    // Người chỉ định
    public Guid OrderDoctorId { get; set; }
    public string OrderDoctorName { get; set; } = string.Empty;

    // Người tư vấn
    public Guid? ConsultantId { get; set; }
    public string? ConsultantName { get; set; }

    // Đối tượng thanh toán
    public int PaymentObject { get; set; }
    public string PaymentObjectName { get; set; } = string.Empty;
    public decimal InsuranceRate { get; set; }

    // Ưu tiên / cấp cứu
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }

    // Ghi chú
    public string? Notes { get; set; }

    // Trạng thái
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    public DateTime OrderedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
}

/// <summary>
/// DTO cho tạo chỉ định dịch vụ
/// </summary>
public class CreateSurgeryServiceOrderDto
{
    public Guid SurgeryId { get; set; }
    public Guid ServiceId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal? Surcharge { get; set; }
    public Guid? ExecuteRoomId { get; set; }
    public Guid? ConsultantId { get; set; }
    public int PaymentObject { get; set; }
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho chỉ định theo gói
/// </summary>
public class SurgeryPackageOrderDto
{
    public Guid SurgeryId { get; set; }
    public Guid PackageId { get; set; }
    public string PackageCode { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;

    public List<SurgeryServiceOrderDto> Services { get; set; } = new();
    public List<SurgeryMedicineDto> Medicines { get; set; } = new();
    public List<SurgerySupplyDto> Supplies { get; set; } = new();

    public decimal PackagePrice { get; set; }
    public decimal ActualCost { get; set; }
    public decimal Difference { get; set; }
}

/// <summary>
/// DTO cho nhóm dịch vụ nhanh
/// </summary>
public class SurgeryServiceGroupDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public bool IsShared { get; set; }
    public List<Guid> ServiceIds { get; set; } = new();
}

/// <summary>
/// DTO cho cảnh báo chỉ định
/// </summary>
public class ServiceOrderWarningDto
{
    public int WarningType { get; set; } // 1-Trùng, 2-Hết tiền, 3-TT35, 4-HbA1c, 5-Vượt gói, 6-Ngoài phác đồ
    public string WarningTypeName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public bool IsBlocking { get; set; }
}

/// <summary>
/// DTO cho thông tin chi phí dịch vụ
/// </summary>
public class ServiceCostInfoDto
{
    public decimal TotalServiceCost { get; set; }
    public decimal InsuranceCoverage { get; set; }
    public decimal PatientPayment { get; set; }
    public decimal DepositBalance { get; set; }
    public decimal RemainingDeposit { get; set; }
    public bool HasSufficientDeposit { get; set; }
}

#endregion

#region 6.5 Kê thuốc, vật tư trong PTTT

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

#endregion

#region 6.6 Kê đơn máu trong PTTT

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

#endregion

#region Báo cáo & Thống kê

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

#endregion

#region Gói PTTT & Định mức

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

#endregion

#region Phòng mổ

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

#endregion

#region XML Export

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

#endregion
