namespace HIS.Application.DTOs;

/// <summary>
/// DTO hiển thị danh sách yêu cầu trình ký
/// </summary>
public class SigningRequestDto
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string DocumentContent { get; set; } = string.Empty;
    public Guid SubmittedById { get; set; }
    public string SubmittedByName { get; set; } = string.Empty;
    public Guid AssignedToId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public int Status { get; set; }
    public string StatusText { get; set; } = string.Empty;
    public string? RejectReason { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? SignatureData { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tìm kiếm / lọc yêu cầu trình ký
/// </summary>
public class SigningRequestSearchDto
{
    public string? Keyword { get; set; }
    public string? DocumentType { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

/// <summary>
/// DTO gửi trình ký mới
/// </summary>
public class SubmitSigningRequestDto
{
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string? DocumentContent { get; set; }
    public Guid AssignedToId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
}

/// <summary>
/// DTO phê duyệt trình ký
/// </summary>
public class ApproveSigningRequestDto
{
    public string? SignatureData { get; set; }
}

/// <summary>
/// DTO từ chối trình ký
/// </summary>
public class RejectSigningRequestDto
{
    public string RejectReason { get; set; } = string.Empty;
}

/// <summary>
/// DTO thống kê trình ký
/// </summary>
public class SigningWorkflowStatsDto
{
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int CancelledCount { get; set; }
    public int TotalCount { get; set; }
    public int TodaySubmitted { get; set; }
    public int TodayApproved { get; set; }
}
