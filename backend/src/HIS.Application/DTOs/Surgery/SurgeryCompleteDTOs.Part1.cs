namespace HIS.Application.DTOs.Surgery;


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
    /// <summary>Lần khám ngoại trú (OPD/CĐHA workflow)</summary>
    public Guid? ExaminationId { get; set; }

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
    /// <summary>Link về lần khám ngoại trú (OPD/CĐHA workflow)</summary>
    public Guid? ExaminationId { get; set; }
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
    // Tường trình PTTT (OPD-inline, MS.PT-02) — FE mới gửi field tường minh thay sentinel Notes.
    public string? SurgeryReport { get; set; }
    public string? Conclusion { get; set; }
    public string? AttachedImageUrls { get; set; } // các dòng [HINHCHINH]/[HINHPHU] join '\n'
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
    /// <summary>Lọc theo lần khám ngoại trú — dùng tại OPD/CĐHA workflow</summary>
    public Guid? ExaminationId { get; set; }
    /// <summary>Lọc theo hồ sơ bệnh án (nội trú)</summary>
    public Guid? MedicalRecordId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}



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


