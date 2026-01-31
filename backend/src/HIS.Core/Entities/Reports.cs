namespace HIS.Core.Entities;

/// <summary>
/// Mẫu báo cáo - ReportTemplate
/// </summary>
public class ReportTemplate : BaseEntity
{
    public string ReportCode { get; set; } = string.Empty; // Mã báo cáo
    public string ReportName { get; set; } = string.Empty; // Tên báo cáo
    public int ReportType { get; set; } // 1-Thống kê, 2-Chi tiết, 3-Tổng hợp, 4-Phân tích
    public string Category { get; set; } = string.Empty; // Danh mục: Khám, Xét nghiệm, Dược, Tài chính...

    public string? Description { get; set; } // Mô tả
    public string? SQLQuery { get; set; } // Câu truy vấn SQL
    public string? StoredProcedure { get; set; } // Tên stored procedure

    // Tham số báo cáo
    public string? Parameters { get; set; } // JSON: [{"name":"StartDate","type":"date","required":true}]

    // Định dạng xuất
    public string OutputFormat { get; set; } = "PDF"; // PDF, Excel, Word, HTML
    public string? TemplateFile { get; set; } // File mẫu (cho Excel, Word)

    // Phân quyền
    public string? AllowedRoles { get; set; } // Danh sách role được phép (cách nhau bởi dấu phẩy)
    public string? AllowedDepartments { get; set; } // Danh sách khoa được phép

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } // Thứ tự hiển thị
    public string? Icon { get; set; } // Icon hiển thị
    public string? Note { get; set; }

    // Navigation
    public virtual ICollection<GeneratedReport> GeneratedReports { get; set; } = new List<GeneratedReport>();
}

/// <summary>
/// Báo cáo đã tạo - GeneratedReport
/// </summary>
public class GeneratedReport : BaseEntity
{
    public Guid ReportTemplateId { get; set; }
    public virtual ReportTemplate ReportTemplate { get; set; } = null!;

    public string ReportCode { get; set; } = string.Empty; // Mã báo cáo đã tạo
    public string ReportName { get; set; } = string.Empty; // Tên báo cáo

    public Guid GeneratedBy { get; set; } // Người tạo
    public virtual User GeneratedByUser { get; set; } = null!;

    public DateTime GeneratedAt { get; set; } // Thời gian tạo
    public string? Parameters { get; set; } // Tham số đã sử dụng (JSON)

    // File đầu ra
    public string? OutputPath { get; set; } // Đường dẫn file
    public string? FileName { get; set; } // Tên file
    public string? FileFormat { get; set; } // Định dạng file
    public long FileSize { get; set; } // Kích thước file (bytes)

    public int Status { get; set; } // 0-Đang tạo, 1-Hoàn thành, 2-Lỗi
    public string? ErrorMessage { get; set; } // Thông báo lỗi nếu có
    public int? TotalRecords { get; set; } // Số lượng bản ghi

    // Thời gian thực thi
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? ExecutionTimeMs { get; set; } // Thời gian thực thi (ms)

    public DateTime? ExpiryDate { get; set; } // Ngày hết hạn (tự động xóa)
    public bool IsDownloaded { get; set; } // Đã tải về
    public int DownloadCount { get; set; } // Số lần tải về
    public string? Note { get; set; }
}

/// <summary>
/// Widget dashboard - DashboardWidget
/// </summary>
public class DashboardWidget : BaseEntity
{
    public string WidgetCode { get; set; } = string.Empty; // Mã widget
    public string WidgetName { get; set; } = string.Empty; // Tên widget
    public int WidgetType { get; set; } // 1-Số liệu, 2-Biểu đồ, 3-Bảng, 4-Danh sách, 5-Thông báo

    public string Category { get; set; } = string.Empty; // Danh mục dashboard
    public string? Description { get; set; }

    // Nguồn dữ liệu
    public string DataSource { get; set; } = string.Empty; // SQL query hoặc API endpoint
    public string? DataSourceType { get; set; } // SQL, API, StoredProcedure
    public string? Parameters { get; set; } // Tham số (JSON)

    // Cấu hình hiển thị
    public string? ChartType { get; set; } // Line, Bar, Pie, Doughnut... (cho biểu đồ)
    public string? DisplayConfig { get; set; } // Cấu hình hiển thị (JSON)
    public string? ColorScheme { get; set; } // Màu sắc

    // Vị trí và kích thước
    public int Position { get; set; } // Thứ tự hiển thị
    public int GridX { get; set; } // Vị trí X trong grid
    public int GridY { get; set; } // Vị trí Y trong grid
    public int GridWidth { get; set; } = 4; // Độ rộng (1-12)
    public int GridHeight { get; set; } = 3; // Độ cao

    // Làm mới dữ liệu
    public int RefreshInterval { get; set; } // Khoảng thời gian làm mới (giây), 0 = không tự động
    public DateTime? LastRefreshed { get; set; }

    // Phân quyền
    public string? AllowedRoles { get; set; } // Role được phép xem
    public string? AllowedDepartments { get; set; } // Khoa được phép xem

    public bool IsActive { get; set; } = true;
    public string? Icon { get; set; }
    public string? Note { get; set; }
}

/// <summary>
/// Lịch sử truy cập báo cáo - ReportAccessLog
/// </summary>
public class ReportAccessLog : BaseEntity
{
    public Guid ReportTemplateId { get; set; }
    public virtual ReportTemplate ReportTemplate { get; set; } = null!;

    public Guid? GeneratedReportId { get; set; }
    public virtual GeneratedReport? GeneratedReport { get; set; }

    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public DateTime AccessTime { get; set; } // Thời gian truy cập
    public string ActionType { get; set; } = string.Empty; // View, Generate, Download, Export
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Parameters { get; set; } // Tham số sử dụng (JSON)
}
