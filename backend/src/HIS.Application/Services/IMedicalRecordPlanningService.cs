namespace HIS.Application.Services;

/// <summary>
/// Ke hoach Tong hop - Medical Record Planning (KHTH)
/// NangCap10 items 255-265
/// </summary>
public interface IMedicalRecordPlanningService
{
    // Record Code Management
    Task<PagedRecordCodeResult> GetRecordCodesAsync(RecordCodeSearchDto search);
    Task<RecordCodeDto> AssignRecordCodeAsync(AssignRecordCodeDto dto, Guid userId);
    Task<bool> CancelRecordCodeAsync(CancelRecordCodeDto dto, Guid userId);

    // Transfer Management
    Task<PagedTransferResult> GetTransfersAsync(TransferSearchDto search);
    Task<TransferRecordDto> ApproveTransferAsync(ApproveTransferDto dto, Guid userId);
    Task<TransferRecordDto> AssignTransferNumberAsync(AssignTransferNumberDto dto, Guid userId);

    // Record Borrowing
    Task<PagedBorrowResult> GetBorrowingAsync(BorrowSearchDto search);
    Task<RecordBorrowDto> CreateBorrowAsync(CreateBorrowDto dto, Guid userId);
    Task<RecordBorrowDto> ReturnRecordAsync(ReturnRecordDto dto, Guid userId);
    Task<RecordBorrowDto> ExtendBorrowAsync(ExtendBorrowDto dto, Guid userId);

    // Record Handover
    Task<PagedHandoverResult> GetHandoverAsync(HandoverSearchDto search);
    Task<HandoverRecordDto> SubmitHandoverAsync(SubmitHandoverDto dto, Guid userId);
    Task<HandoverRecordDto> ApproveHandoverAsync(ApproveHandoverDto dto, Guid userId);

    // Outpatient Records
    Task<PagedOutpatientRecordResult> GetOutpatientRecordsAsync(OutpatientRecordSearchDto search);

    // Record Copying
    Task<RecordCopyDto> CreateRecordCopyAsync(CreateRecordCopyDto dto, Guid userId);

    // Department Attendance
    Task<AttendanceSummaryDto> GetAttendanceAsync(AttendanceSearchDto search);
    Task<AttendanceCheckInDto> CheckInAsync(CheckInDto dto, Guid userId);

    // Stats
    Task<PlanningStatsDto> GetStatsAsync();
}

// === Record Code DTOs ===

public class RecordCodeSearchDto
{
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class PagedRecordCodeResult
{
    public int TotalCount { get; set; }
    public List<RecordCodeDto> Items { get; set; } = new();
}

public class RecordCodeDto
{
    public Guid Id { get; set; }
    public string RecordCode { get; set; } = string.Empty;
    public Guid? ExaminationId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public DateTime? AssignedDate { get; set; }
    public string? AssignedByName { get; set; }
    public int Status { get; set; } // 0=Available, 1=Assigned, 2=Cancelled
    public string StatusName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AssignRecordCodeDto
{
    public Guid ExaminationId { get; set; }
    public string? RecordCode { get; set; }
}

public class CancelRecordCodeDto
{
    public Guid RecordCodeId { get; set; }
    public string? Reason { get; set; }
}

// === Transfer DTOs ===

public class TransferSearchDto
{
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class PagedTransferResult
{
    public int TotalCount { get; set; }
    public List<TransferRecordDto> Items { get; set; } = new();
}

public class TransferRecordDto
{
    public Guid Id { get; set; }
    public string? TransferNumber { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? FromDepartment { get; set; }
    public string? ToDepartment { get; set; }
    public string? FromHospital { get; set; }
    public string? ToHospital { get; set; }
    public string? Reason { get; set; }
    public string? Diagnosis { get; set; }
    public DateTime? TransferDate { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Approved, 2=Rejected, 3=Completed
    public string StatusName { get; set; } = string.Empty;
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedDate { get; set; }
}

public class ApproveTransferDto
{
    public Guid TransferId { get; set; }
    public bool Approve { get; set; }
    public string? RejectReason { get; set; }
}

public class AssignTransferNumberDto
{
    public Guid TransferId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
}

// === Borrow DTOs ===

public class BorrowSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class PagedBorrowResult
{
    public int TotalCount { get; set; }
    public List<RecordBorrowDto> Items { get; set; } = new();
}

public class RecordBorrowDto
{
    public Guid Id { get; set; }
    public string BorrowCode { get; set; } = string.Empty;
    public string? RecordCode { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? BorrowerName { get; set; }
    public string? BorrowerDepartment { get; set; }
    public string? Purpose { get; set; }
    public DateTime BorrowDate { get; set; }
    public DateTime? ExpectedReturnDate { get; set; }
    public DateTime? ActualReturnDate { get; set; }
    public int Status { get; set; } // 0=Borrowing, 1=Returned, 2=Overdue, 3=Extended
    public string StatusName { get; set; } = string.Empty;
    public int ExtensionCount { get; set; }
    public bool IsOverdue { get; set; }
    public int DaysOverdue { get; set; }
}

public class CreateBorrowDto
{
    public Guid MedicalRecordId { get; set; }
    public string? Purpose { get; set; }
    public int BorrowDays { get; set; } = 7;
}

public class ReturnRecordDto
{
    public Guid BorrowId { get; set; }
    public string? Note { get; set; }
}

public class ExtendBorrowDto
{
    public Guid BorrowId { get; set; }
    public int ExtendDays { get; set; } = 7;
    public string? Reason { get; set; }
}

// === Handover DTOs ===

public class HandoverSearchDto
{
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class PagedHandoverResult
{
    public int TotalCount { get; set; }
    public List<HandoverRecordDto> Items { get; set; } = new();
}

public class HandoverRecordDto
{
    public Guid Id { get; set; }
    public string HandoverCode { get; set; } = string.Empty;
    public string? RecordCode { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? DepartmentName { get; set; }
    public string? SubmittedByName { get; set; }
    public DateTime? SubmittedDate { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public int Status { get; set; } // 0=Draft, 1=Submitted, 2=Approved, 3=Rejected
    public string StatusName { get; set; } = string.Empty;
    public string? Note { get; set; }
    public int TotalForms { get; set; }
    public int CompletedForms { get; set; }
}

public class SubmitHandoverDto
{
    public List<Guid> MedicalRecordIds { get; set; } = new();
    public string? Note { get; set; }
}

public class ApproveHandoverDto
{
    public Guid HandoverId { get; set; }
    public bool Approve { get; set; }
    public string? RejectReason { get; set; }
}

// === Outpatient Record DTOs ===

public class OutpatientRecordSearchDto
{
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class PagedOutpatientRecordResult
{
    public int TotalCount { get; set; }
    public List<OutpatientRecordDto> Items { get; set; } = new();
}

public class OutpatientRecordDto
{
    public Guid Id { get; set; }
    public string? RecordCode { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? DepartmentName { get; set; }
    public string? DoctorName { get; set; }
    public string? Diagnosis { get; set; }
    public string? IcdCode { get; set; }
    public DateTime ExaminationDate { get; set; }
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int? ConclusionType { get; set; }
    public string? ConclusionNote { get; set; }
}

// === Record Copy DTOs ===

public class CreateRecordCopyDto
{
    public Guid MedicalRecordId { get; set; }
    public string? Requester { get; set; }
    public string? Purpose { get; set; }
    public int CopyCount { get; set; } = 1;
}

public class RecordCopyDto
{
    public Guid Id { get; set; }
    public string CopyCode { get; set; } = string.Empty;
    public string? RecordCode { get; set; }
    public string? PatientName { get; set; }
    public string? Requester { get; set; }
    public string? Purpose { get; set; }
    public int CopyCount { get; set; }
    public DateTime RequestDate { get; set; }
    public string? ProcessedByName { get; set; }
    public int Status { get; set; } // 0=Pending, 1=Processing, 2=Completed
    public string StatusName { get; set; } = string.Empty;
}

// === Attendance DTOs ===

public class AttendanceSearchDto
{
    public DateTime? Date { get; set; }
    public Guid? DepartmentId { get; set; }
}

public class AttendanceSummaryDto
{
    public DateTime Date { get; set; }
    public int TotalDepartments { get; set; }
    public int CheckedInCount { get; set; }
    public int PendingCount { get; set; }
    public List<DepartmentAttendanceDto> Departments { get; set; } = new();
}

public class DepartmentAttendanceDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public bool IsCheckedIn { get; set; }
    public DateTime? CheckInTime { get; set; }
    public string? CheckInByName { get; set; }
    public int TotalRecords { get; set; }
    public int CompletedRecords { get; set; }
    public int PendingRecords { get; set; }
}

public class CheckInDto
{
    public Guid DepartmentId { get; set; }
    public string? Note { get; set; }
}

public class AttendanceCheckInDto
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime CheckInTime { get; set; }
    public string? CheckInByName { get; set; }
    public bool Success { get; set; }
}

// === Planning Stats DTOs ===

public class PlanningStatsDto
{
    public int TotalRecords { get; set; }
    public int AssignedCodes { get; set; }
    public int PendingCodes { get; set; }
    public int TotalTransfers { get; set; }
    public int PendingTransfers { get; set; }
    public int ActiveBorrows { get; set; }
    public int OverdueBorrows { get; set; }
    public int PendingHandovers { get; set; }
    public int CompletedHandovers { get; set; }
    public int TodayAttendance { get; set; }
    public int OutpatientRecords { get; set; }
    public int RecordCopyRequests { get; set; }
}
