using HIS.Application.DTOs.Examination;

namespace HIS.Application.DTOs.Laboratory;


/// <summary>
/// DTO cho sổ xét nghiệm
/// </summary>
public class LabRegisterDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    // Loại sổ: 1-Sinh hóa, 2-Huyết học, 3-Vi sinh, 4-Nước tiểu, 5-Khác
    public int RegisterType { get; set; }
    public string RegisterTypeName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalTests { get; set; }
    public List<LabRegisterEntryDto> Entries { get; set; } = new();
}

/// <summary>
/// DTO cho mục trong sổ XN
/// </summary>
public class LabRegisterEntryDto
{
    public int RowNumber { get; set; }
    public DateTime Date { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? Diagnosis { get; set; }
    public string? DepartmentName { get; set; }
    public string TestName { get; set; } = string.Empty;
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho báo cáo thống kê xét nghiệm
/// </summary>
public class LabStatisticsDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public int TotalOrders { get; set; }
    public int TotalTests { get; set; }
    public int CompletedTests { get; set; }
    public int PendingTests { get; set; }
    public int CriticalValueCount { get; set; }

    // Theo loại xét nghiệm
    public List<TestTypeStatDto> ByTestType { get; set; } = new();

    // Theo ngày
    public List<DailyLabStatDto> ByDay { get; set; } = new();

    // Theo khoa chỉ định
    public List<DepartmentLabStatDto> ByDepartment { get; set; } = new();

    // Theo máy
    public List<AnalyzerStatDto> ByAnalyzer { get; set; } = new();
}

/// <summary>
/// DTO cho thống kê theo loại XN
/// </summary>
public class TestTypeStatDto
{
    public string TestGroup { get; set; } = string.Empty;
    public int TestCount { get; set; }
    public int CompletedCount { get; set; }
    public decimal Revenue { get; set; }
}

/// <summary>
/// DTO cho thống kê theo ngày
/// </summary>
public class DailyLabStatDto
{
    public DateTime Date { get; set; }
    public int OrderCount { get; set; }
    public int TestCount { get; set; }
    public int CompletedCount { get; set; }
    public decimal Revenue { get; set; }
}

/// <summary>
/// DTO cho thống kê theo khoa
/// </summary>
public class DepartmentLabStatDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public int TestCount { get; set; }
    public decimal Revenue { get; set; }
}

/// <summary>
/// DTO cho thống kê theo máy
/// </summary>
public class AnalyzerStatDto
{
    public Guid AnalyzerId { get; set; }
    public string AnalyzerName { get; set; } = string.Empty;
    public int TestCount { get; set; }
    public int RerunCount { get; set; }
    public double AverageProcessingTime { get; set; } // Phút
}

/// <summary>
/// DTO cho báo cáo doanh thu XN
/// </summary>
public class LabRevenueReportDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    // Doanh thu theo thu tiền
    public decimal CollectedRevenue { get; set; }
    public int CollectedCount { get; set; }

    // Doanh thu theo trả kết quả thực tế
    public decimal ActualRevenue { get; set; }
    public int ActualCount { get; set; }

    // Chi tiết
    public List<LabRevenueItemDto> Details { get; set; } = new();
}

/// <summary>
/// DTO cho chi tiết doanh thu
/// </summary>
public class LabRevenueItemDto
{
    public Guid TestId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string TestGroup { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal InsuranceAmount { get; set; }
    public decimal PatientAmount { get; set; }
}

/// <summary>
/// DTO cho định mức xét nghiệm
/// </summary>
public class LabTestNormDto
{
    public Guid Id { get; set; }
    public Guid TestId { get; set; }
    public string TestCode { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;

    public List<LabTestNormItemDto> Supplies { get; set; } = new();
    public decimal TotalCost { get; set; }
}

/// <summary>
/// DTO cho vật tư/hóa chất trong định mức
/// </summary>
public class LabTestNormItemDto
{
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>
/// DTO cho tính toán hóa chất sử dụng
/// </summary>
public class LabSupplyUsageDto
{
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public Guid? LabDepartmentId { get; set; }

    public List<SupplyUsageItemDto> Usages { get; set; } = new();
    public decimal TotalCost { get; set; }
}

/// <summary>
/// DTO cho chi tiết sử dụng hóa chất
/// </summary>
public class SupplyUsageItemDto
{
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal UsedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalCost { get; set; }
}

/// <summary>
/// DTO cho phiếu lĩnh vật tư/hóa chất
/// </summary>
public class LabSupplyRequestDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public Guid LabDepartmentId { get; set; }
    public string LabDepartmentName { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }

    public List<LabSupplyRequestItemDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }

    // Trạng thái: 1-Nháp, 2-Chờ duyệt, 3-Đã duyệt, 4-Đã xuất
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

/// <summary>
/// DTO cho chi tiết phiếu lĩnh
/// </summary>
public class LabSupplyRequestItemDto
{
    public Guid SupplyId { get; set; }
    public string SupplyCode { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal RequestQuantity { get; set; }
    public decimal? ApprovedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

/// <summary>
/// DTO cho xuất XML 130 bảng 4
/// </summary>
public class LabXml130Dto
{
    public string MaLk { get; set; } = string.Empty;
    public int Stt { get; set; }
    public string MaDichVu { get; set; } = string.Empty;
    public string MaChiSo { get; set; } = string.Empty;
    public string TenChiSo { get; set; } = string.Empty;
    public string GiaTri { get; set; } = string.Empty;
    public string MaMay { get; set; } = string.Empty;
    public string? MoTa { get; set; }
    public string? KetLuan { get; set; }
    public DateTime NgayKq { get; set; }
}



/// <summary>
/// DTO cho worklist gửi máy
/// </summary>
public class WorklistDto
{
    public Guid AnalyzerId { get; set; }
    public List<WorklistItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO cho item trong worklist
/// </summary>
public class WorklistItemDto
{
    public string SampleId { get; set; } = string.Empty; // Barcode
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public List<string> TestCodes { get; set; } = new();
    public bool IsPriority { get; set; }
}

/// <summary>
/// DTO cho kết quả từ máy
/// </summary>
public class AnalyzerResultDto
{
    public string SampleId { get; set; } = string.Empty;
    public string TestCode { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? Flag { get; set; }
    public DateTime ResultTime { get; set; }
    public Guid AnalyzerId { get; set; }
}



/// <summary>
/// DTO cho in kết quả xét nghiệm
/// </summary>
public class PrintLabResultDto
{
    public Guid LabOrderId { get; set; }
    public List<Guid>? TestItemIds { get; set; } // Null = in tất cả
    public bool IncludeNormalRange { get; set; } = true;
    public bool IncludeInterpretation { get; set; } = false;
}

/// <summary>
/// DTO cho in sổ xét nghiệm
/// </summary>
public class PrintLabRegisterDto
{
    public int RegisterType { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public Guid? LabDepartmentId { get; set; }
}



/// <summary>
/// DTO cho màn hình hiển thị hàng đợi xét nghiệm (public, AllowAnonymous)
/// </summary>
public class LabQueueDisplayDto
{
    public DateTime UpdatedAt { get; set; }

    // Thống kê
    public int TotalPending { get; set; }
    public int TotalProcessing { get; set; }
    public int TotalCompletedToday { get; set; }
    public int AverageProcessingMinutes { get; set; }

    // Mẫu đang xử lý
    public List<LabQueueItemDto> ProcessingItems { get; set; } = new();
    // Mẫu chờ
    public List<LabQueueItemDto> WaitingItems { get; set; } = new();
    // Kết quả vừa hoàn thành (10 gần nhất)
    public List<LabQueueItemDto> CompletedItems { get; set; } = new();
}

/// <summary>
/// DTO cho 1 item trong hàng đợi xét nghiệm
/// </summary>
public class LabQueueItemDto
{
    public Guid Id { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string? SampleBarcode { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string? PatientCode { get; set; }
    public string? SampleType { get; set; }
    public int TestCount { get; set; }
    public string TestSummary { get; set; } = string.Empty;
    public bool IsPriority { get; set; }
    public bool IsEmergency { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime OrderedAt { get; set; }
    public DateTime? CollectedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int WaitMinutes { get; set; }
    public string? DepartmentName { get; set; }
}

