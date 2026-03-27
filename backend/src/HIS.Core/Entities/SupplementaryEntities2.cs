namespace HIS.Core.Entities;

// ======= Module 9: BHXH Audit (Kiem tra BHXH) =======

/// <summary>
/// Phien kiem tra BHXH - BhxhAuditSession
/// </summary>
public class BhxhAuditSession : BaseEntity
{
    public string SessionCode { get; set; } = string.Empty;
    public int PeriodMonth { get; set; }
    public int PeriodYear { get; set; }
    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }
    public int ErrorCount { get; set; }
    public decimal ErrorAmount { get; set; }
    /// <summary>
    /// 0=Draft, 1=InProgress, 2=Completed, 3=Submitted
    /// </summary>
    public int Status { get; set; }
    public Guid? AuditorId { get; set; }
    public string? Notes { get; set; }

    public virtual User? Auditor { get; set; }
    public virtual ICollection<BhxhAuditError> Errors { get; set; } = new List<BhxhAuditError>();
}

/// <summary>
/// Loi kiem tra BHXH - BhxhAuditError
/// </summary>
public class BhxhAuditError : BaseEntity
{
    public Guid AuditSessionId { get; set; }
    public Guid? RecordId { get; set; }
    public string? PatientName { get; set; }
    public string? InsuranceNumber { get; set; }
    /// <summary>
    /// OverCeiling, WrongIcd, WrongObject, DuplicateClaim, WrongService, Other
    /// </summary>
    public string ErrorType { get; set; } = string.Empty;
    public string? ErrorDescription { get; set; }
    public decimal OriginalAmount { get; set; }
    public decimal AdjustedAmount { get; set; }
    public bool IsFixed { get; set; }
    public string? FixedBy { get; set; }
    public DateTime? FixedDate { get; set; }
    public string? Notes { get; set; }

    public virtual BhxhAuditSession? AuditSession { get; set; }
    public virtual MedicalRecord? MedicalRecord { get; set; }
}
