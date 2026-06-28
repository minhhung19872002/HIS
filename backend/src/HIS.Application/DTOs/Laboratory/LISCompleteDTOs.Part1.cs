using HIS.Application.DTOs.Examination;

namespace HIS.Application.DTOs.Laboratory;


/// <summary>
/// DTO cho cấu hình máy xét nghiệm
/// </summary>
public class LabAnalyzerDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }

    // Loại kết nối: 1-Một chiều, 2-Hai chiều
    public int ConnectionType { get; set; }
    public string ConnectionTypeName { get; set; } = string.Empty;

    // Giao thức: 1-HL7, 2-ASTM1381, 3-ASTM1394, 4-ASCII, 5-Advia, 6-Hitachi, 7-AU, 8-Rapidbind, 9-Custom
    public int Protocol { get; set; }
    public string ProtocolName { get; set; } = string.Empty;

    // Phương thức kết nối: 1-COM/RS232, 2-TCP/IP Server, 3-TCP/IP Client, 4-File
    public int ConnectionMethod { get; set; }
    public string ConnectionMethodName { get; set; } = string.Empty;

    // Cấu hình kết nối
    public string? ComPort { get; set; }
    public int? BaudRate { get; set; }
    public string? IpAddress { get; set; }
    public int? Port { get; set; }
    public string? FilePath { get; set; }

    // Khoa xét nghiệm
    public Guid? LabDepartmentId { get; set; }
    public string? LabDepartmentName { get; set; }

    // Danh sách test được hỗ trợ
    public List<AnalyzerTestMappingDto> TestMappings { get; set; } = new();

    // Trạng thái: 1-Hoạt động, 2-Tạm ngưng, 3-Bảo trì
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
    public DateTime? LastConnectedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO cho mapping test với máy
/// </summary>
public class AnalyzerTestMappingDto
{
    public Guid Id { get; set; }
    public Guid AnalyzerId { get; set; }
    public Guid TestId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string AnalyzerTestCode { get; set; } = string.Empty; // Mã test trên máy
    public string? AnalyzerTestName { get; set; }
    public string? Unit { get; set; }
    public int? DecimalPlaces { get; set; }
}

/// <summary>
/// DTO cho tạo/cập nhật máy xét nghiệm
/// </summary>
public class CreateLabAnalyzerDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public int ConnectionType { get; set; }
    public int Protocol { get; set; }
    public int ConnectionMethod { get; set; }
    public string? ComPort { get; set; }
    public int? BaudRate { get; set; }
    public string? IpAddress { get; set; }
    public int? Port { get; set; }
    public Guid? LabDepartmentId { get; set; }
}

/// <summary>
/// DTO cho dữ liệu thô từ máy
/// </summary>
public class RawDataDto
{
    public Guid Id { get; set; }
    public Guid AnalyzerId { get; set; }
    public string AnalyzerName { get; set; } = string.Empty;
    public string RawContent { get; set; } = string.Empty;
    public DateTime ReceivedAt { get; set; }

    // Trạng thái xử lý: 1-Mới, 2-Đã xử lý, 3-Lỗi
    public int ProcessStatus { get; set; }
    public string ProcessStatusName { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

/// <summary>
/// DTO cho trạng thái kết nối máy
/// </summary>
public class AnalyzerConnectionStatusDto
{
    public Guid AnalyzerId { get; set; }
    public string AnalyzerName { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public string? Status { get; set; }
    public DateTime? LastConnectedAt { get; set; }
    public DateTime? LastDataReceivedAt { get; set; }
    public int TodayResultCount { get; set; }
    public int ActiveConnectionCount { get; set; }
    public bool ServerRunning { get; set; }
    public string? ErrorMessage { get; set; }
}



/// <summary>
/// DTO cho danh sách lấy mẫu
/// </summary>
public class SampleCollectionListDto
{
    public DateTime Date { get; set; }
    public Guid? LabDepartmentId { get; set; }
    public string? LabDepartmentName { get; set; }
    public int TotalPending { get; set; }
    public int TotalCollected { get; set; }
    public List<SampleCollectionItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO cho bệnh nhân chờ lấy mẫu
/// </summary>
public class SampleCollectionItemDto
{
    public Guid Id { get; set; }
    public Guid LabOrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;

    // Thông tin bệnh nhân
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }

    // Thông tin hồ sơ
    public Guid MedicalRecordId { get; set; }
    public int PatientType { get; set; } // 1-Ngoại trú, 2-Nội trú
    public string? DepartmentName { get; set; }
    public string? BedCode { get; set; }

    // Số thứ tự
    public int QueueNumber { get; set; }

    // Danh sách xét nghiệm
    public List<LabTestItemDto> Tests { get; set; } = new();

    // Mẫu cần lấy
    public List<SampleTypeDto> RequiredSamples { get; set; } = new();

    // Trạng thái: 1-Chờ lấy mẫu, 2-Đã lấy mẫu, 3-Đã tiếp nhận
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Ưu tiên / cấp cứu
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }

    public DateTime OrderedAt { get; set; }
    public DateTime? CollectedAt { get; set; }
    public string? CollectedBy { get; set; }
}

/// <summary>
/// DTO cho loại mẫu
/// </summary>
public class SampleTypeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? TubeColor { get; set; } // Màu ống nghiệm
    public string? TubeColorHex { get; set; }
    public int? Volume { get; set; } // ml
    public string? Container { get; set; }
    public string? PreparationNotes { get; set; }
}

/// <summary>
/// DTO cho xác nhận lấy mẫu
/// </summary>
public class CollectSampleDto
{
    public Guid LabOrderId { get; set; }
    public List<SampleCollectedDto> Samples { get; set; } = new();
    public string? Notes { get; set; }
    /// <summary>
    /// Người lấy mẫu (optional). Truyền từ FE labRoles.defaultKtvId khi có.
    /// Nếu null, giữ nguyên CollectedByUserId hiện tại trong DB.
    /// </summary>
    public Guid? CollectorUserId { get; set; }
}

/// <summary>
/// DTO cho mẫu đã lấy
/// </summary>
public class SampleCollectedDto
{
    public Guid SampleTypeId { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public DateTime CollectedAt { get; set; }
    public int? Volume { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho in barcode
/// </summary>
public class PrintBarcodeDto
{
    public Guid LabOrderId { get; set; }
    public List<Guid>? SampleTypeIds { get; set; }
    public int Copies { get; set; } = 1;
}

/// <summary>
/// DTO cho tiếp nhận bệnh phẩm
/// </summary>
public class ReceiveSampleDto
{
    public List<string> Barcodes { get; set; } = new();
    public DateTime ReceivedAt { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho gọi bệnh nhân
/// </summary>
public class CallPatientDto
{
    public Guid LabOrderId { get; set; }
    public int Counter { get; set; } // Quầy lấy mẫu
}



/// <summary>
/// DTO cho phiếu xét nghiệm
/// </summary>
public class LabOrderDto
{
    public Guid Id { get; set; }
    public string OrderCode { get; set; } = string.Empty;

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
    public int PatientType { get; set; }
    public string PatientTypeName { get; set; } = string.Empty;

    // Khoa chỉ định
    public Guid? OrderDepartmentId { get; set; }
    public string? OrderDepartmentName { get; set; }
    public Guid OrderDoctorId { get; set; }
    public string OrderDoctorName { get; set; } = string.Empty;

    // Chẩn đoán
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }

    // Danh sách xét nghiệm
    public List<LabTestItemDto> Tests { get; set; } = new();

    // Trạng thái: 1-Chờ lấy mẫu, 2-Đã lấy mẫu, 3-Đang XN, 4-Chờ duyệt, 5-Hoàn thành, 6-Đã hủy
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Ưu tiên
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }

    // Ghi chú
    public string? Notes { get; set; }
    public string? ClinicalNotes { get; set; }

    // Đối tượng thanh toán
    public int PaymentObject { get; set; }
    public decimal InsuranceRate { get; set; }

    // Mẫu xét nghiệm
    public string? SampleBarcode { get; set; }
    public string? SampleType { get; set; }

    // Audit
    public DateTime OrderedAt { get; set; }
    public DateTime? CollectedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public string? ApprovedByName { get; set; }
}

/// <summary>
/// DTO cho xét nghiệm trong phiếu
/// </summary>
public class LabTestItemDto
{
    public Guid Id { get; set; }
    public Guid LabOrderId { get; set; }
    public Guid TestId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? TestGroup { get; set; }

    // Loại mẫu cần
    public Guid? SampleTypeId { get; set; }
    public string? SampleTypeName { get; set; }

    // Kết quả
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }

    // Giá trị tham chiếu
    public decimal? NormalMin { get; set; }
    public decimal? NormalMax { get; set; }
    public decimal? CriticalLow { get; set; }
    public decimal? CriticalHigh { get; set; }
    public int? ResultStatus { get; set; }

    // Cờ bất thường: 0-Bình thường, 1-Thấp, 2-Cao, 3-Nguy hiểm thấp, 4-Nguy hiểm cao
    public int? AbnormalFlag { get; set; }
    public string? AbnormalFlagName { get; set; }

    // Máy thực hiện
    public Guid? AnalyzerId { get; set; }
    public string? AnalyzerName { get; set; }

    // Trạng thái: 1-Chờ mẫu, 2-Có mẫu, 3-Đang XN, 4-Có KQ, 5-Đã duyệt
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    // Giá
    public decimal UnitPrice { get; set; }
    public decimal InsurancePrice { get; set; }

    // Kỹ thuật viên
    public Guid? TechnicianId { get; set; }
    public string? TechnicianName { get; set; }

    public DateTime? ResultAt { get; set; }
    public string? Notes { get; set; }

    /// <summary>R1: danh sách chỉ số con per-parameter (rỗng nếu chỉ có Result chuỗi).</summary>
    public List<LabResultParameterDto>? Parameters { get; set; }
}

/// <summary>
/// DTO đọc 1 chỉ số con của kết quả XN (ServiceRequestDetailParameter).
/// Flag theo chuẩn HL7: N | H | L | HH | LL.
/// </summary>
public class LabResultParameterDto
{
    public string ParameterCode { get; set; } = string.Empty;
    public string ParameterName { get; set; } = string.Empty;
    public string? Value { get; set; }
    public decimal? NumericValue { get; set; }
    public string? Unit { get; set; }
    public decimal? RefMin { get; set; }
    public decimal? RefMax { get; set; }
    public string? RefRange { get; set; }
    /// <summary>N | H | L | HH | LL (null nếu chưa đánh giá)</summary>
    public string? Flag { get; set; }
    public int Sequence { get; set; }
}

/// <summary>
/// DTO cho nhập kết quả xét nghiệm
/// </summary>
public class EnterLabResultDto
{
    public Guid LabTestItemId { get; set; }
    public string Result { get; set; } = string.Empty;
    public string? Notes { get; set; }
    /// <summary>R1: KQ per-parameter (optional — rỗng thì giữ hành vi cũ ghi 1 chuỗi).</summary>
    public List<LabResultParameterInputDto>? Parameters { get; set; }
}

/// <summary>
/// DTO cho nhập nhiều kết quả
/// </summary>
public class EnterLabResultsDto
{
    public Guid LabOrderId { get; set; }
    public List<EnterLabResultDto> Results { get; set; } = new();
}

/// <summary>
/// DTO cho chạy lại xét nghiệm
/// </summary>
public class RerunTestDto
{
    public List<Guid> LabTestItemIds { get; set; } = new();
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho duyệt kết quả
/// </summary>
public class ApproveLabResultDto
{
    public Guid LabOrderId { get; set; }
    public List<Guid>? LabTestItemIds { get; set; } // Null = duyệt tất cả
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho cảnh báo kết quả bất thường
/// </summary>
public class CriticalValueAlertDto
{
    public Guid LabTestItemId { get; set; }
    public Guid LabOrderId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string ReferenceRange { get; set; } = string.Empty;
    public int AbnormalFlag { get; set; }
    public string AbnormalFlagName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public DateTime AlertAt { get; set; }
    public bool IsAcknowledged { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public string? AcknowledgedBy { get; set; }
}

/// <summary>
/// DTO cho kê vật tư/hóa chất
/// </summary>
public class LabSupplyOrderDto
{
    public Guid Id { get; set; }
    public Guid LabOrderId { get; set; }
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho thêm vật tư/hóa chất
/// </summary>
public class AddLabSupplyDto
{
    public Guid LabOrderId { get; set; }
    public Guid SupplyId { get; set; }
    public decimal Quantity { get; set; }
    public Guid WarehouseId { get; set; }
}

/// <summary>
/// DTO cho tìm kiếm phiếu XN
/// </summary>
public class LabOrderSearchDto
{
    public string? Keyword { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? PatientType { get; set; }
    public int? Status { get; set; }
    public bool? HasCriticalValue { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}


