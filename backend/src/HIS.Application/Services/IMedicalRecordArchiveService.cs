namespace HIS.Application.Services;

/// <summary>
/// Quản lý lưu trữ hồ sơ bệnh án
/// </summary>
public interface IMedicalRecordArchiveService
{
    // Archive management
    Task<PagedArchiveResult> SearchArchivesAsync(ArchiveSearchDto search);
    Task<ArchiveDto> CreateArchiveAsync(CreateArchiveDto dto, Guid userId);
    Task<ArchiveDto> UpdateArchiveLocationAsync(Guid archiveId, UpdateArchiveLocationDto dto, Guid userId);
    Task<List<ArchiveDto>> AutoArchiveCompletedRecordsAsync(int inactiveDays, Guid userId);

    // Borrow management
    Task<BorrowRequestDto> CreateBorrowRequestAsync(CreateArchiveBorrowDto dto, Guid userId);
    Task<BorrowRequestDto> ApproveBorrowRequestAsync(Guid requestId, bool approve, string? rejectReason, Guid userId);
    Task<BorrowRequestDto> RecordBorrowAsync(Guid requestId, Guid userId);
    Task<BorrowRequestDto> RecordReturnAsync(Guid requestId, Guid userId);
    Task<List<BorrowRequestDto>> GetBorrowRequestsAsync(Guid? archiveId, int? status);
    Task<List<BorrowRequestDto>> GetOverdueBorrowsAsync();

    // Statistics
    Task<ArchiveStatsDto> GetArchiveStatsAsync();
}

// === DTOs ===

public class ArchiveSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public int? ArchiveYear { get; set; }
    public Guid? DepartmentId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PagedArchiveResult
{
    public int TotalCount { get; set; }
    public List<ArchiveDto> Items { get; set; } = new();
}

public class ArchiveDto
{
    public Guid Id { get; set; }
    public string ArchiveCode { get; set; } = string.Empty;
    public Guid MedicalRecordId { get; set; }
    public string? MedicalRecordCode { get; set; }
    public Guid PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? Diagnosis { get; set; }
    public string? TreatmentResult { get; set; }
    public DateTime? AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public string? StorageLocation { get; set; }
    public string? ShelfNumber { get; set; }
    public string? BoxNumber { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public DateTime? ArchivedDate { get; set; }
    public string? ArchivedByName { get; set; }
    public int ArchiveYear { get; set; }
    public int BorrowCount { get; set; }
}

public class CreateArchiveDto
{
    public Guid MedicalRecordId { get; set; }
    public string? StorageLocation { get; set; }
    public string? ShelfNumber { get; set; }
    public string? BoxNumber { get; set; }
}

public class UpdateArchiveLocationDto
{
    public string? StorageLocation { get; set; }
    public string? ShelfNumber { get; set; }
    public string? BoxNumber { get; set; }
}

public class CreateArchiveBorrowDto
{
    public Guid MedicalRecordArchiveId { get; set; }
    public string? Purpose { get; set; }
    public DateTime? ExpectedReturnDate { get; set; }
}

public class BorrowRequestDto
{
    public Guid Id { get; set; }
    public string RequestCode { get; set; } = string.Empty;
    public Guid MedicalRecordArchiveId { get; set; }
    public string? ArchiveCode { get; set; }
    public string? PatientName { get; set; }
    public string? RequestedByName { get; set; }
    public DateTime RequestDate { get; set; }
    public string? Purpose { get; set; }
    public DateTime? ExpectedReturnDate { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public string? RejectReason { get; set; }
    public DateTime? BorrowedDate { get; set; }
    public DateTime? ReturnedDate { get; set; }
    public string? Note { get; set; }
    public bool IsOverdue { get; set; }
    public int DaysOverdue { get; set; }
}

public class ArchiveStatsDto
{
    public int TotalArchives { get; set; }
    public int PendingArchives { get; set; }
    public int ArchivedCount { get; set; }
    public int CurrentlyBorrowed { get; set; }
    public int OverdueBorrows { get; set; }
    public int PendingBorrowRequests { get; set; }
    public int ThisYearArchived { get; set; }
}
