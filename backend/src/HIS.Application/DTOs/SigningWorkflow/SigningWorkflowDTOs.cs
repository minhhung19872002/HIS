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
    public string? SignerRole { get; set; } // Vai trò người ký
    public DateTime CreatedAt { get; set; }

    // Chain (trình ký nhiều cấp) — null/1/1 với phiếu đơn cấp cũ
    public Guid? ChainId { get; set; }
    public int StepOrder { get; set; } = 1;
    public int TotalSteps { get; set; } = 1;
    public Guid? MedicalRecordId { get; set; }
}

/// <summary>1 cấp ký trong yêu cầu trình ký nhiều cấp</summary>
public class SigningChainStepDto
{
    public Guid AssignedToId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    /// <summary>Vai trò cấp ký (code EmrSigningRole: BSDT, TK, GD...)</summary>
    public string? SignerRole { get; set; }
}

/// <summary>DTO gửi trình ký NHIỀU CẤP (chuỗi ký tuần tự theo steps)</summary>
public class SubmitSigningChainDto
{
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string? DocumentContent { get; set; }
    public Guid? PatientId { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? MedicalRecordId { get; set; }
    public List<SigningChainStepDto> Steps { get; set; } = new();
}

/// <summary>Trạng thái chuỗi ký của 1 tài liệu (EMR hiển thị badge)</summary>
public class DocumentChainDto
{
    public Guid ChainId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public Guid SubmittedById { get; set; }
    public string SubmittedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    /// <summary>Pending / InProgress / Completed / Rejected / Cancelled</summary>
    public string ChainStatus { get; set; } = string.Empty;
    /// <summary>Cấp đang chờ ký (1-based); null nếu chuỗi đã kết thúc</summary>
    public int? CurrentStep { get; set; }
    public int TotalSteps { get; set; }
    public List<SigningRequestDto> Steps { get; set; } = new();
}

/// <summary>1 cấp gợi ý trong chuỗi ký mặc định theo documentType (EmrSigningOperations)</summary>
public class ChainTemplateStepDto
{
    public string? RoleCode { get; set; }
    public string? RoleName { get; set; }
    public string OperationName { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>
/// DTO tìm kiếm / lọc yêu cầu trình ký
/// </summary>
public class SigningRequestSearchDto
{
    public string? Keyword { get; set; }
    public string? DocumentType { get; set; }
    public int? Status { get; set; }
    public string? SignerRole { get; set; } // Lọc theo vai trò người ký
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
    /// <summary>Vai trò người ký (tùy chọn): KTV, BacSi, TruongKhoa, GiamDoc, DieuDuong, Duoc</summary>
    public string? SignerRole { get; set; }
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
