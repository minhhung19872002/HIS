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
    /// 0=Draft, 1=InProgress, 2=Completed, 3=Submitted, 4=Approved
    /// </summary>
    public int Status { get; set; }
    public Guid? AuditorId { get; set; }
    public string? Notes { get; set; }

    // Added by migration 75: approval + portal submit tracking
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? PortalTransactionId { get; set; }

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

/// <summary>
/// Dong du lieu import tu file giam dinh BHXH ben ngoai - BhxhAuditImport
/// Moi dong trong file CSV/Excel duoc luu 1 ban ghi de tra ve status + filter.
/// Migration 129.
/// </summary>
public class BhxhAuditImport : BaseEntity
{
    /// <summary>Ma lo import IMPORT-YYYYMMDD-HHMMSS de nhom cac dong cung 1 lan upload</summary>
    public string ImportBatchCode { get; set; } = string.Empty;
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
    public Guid? ImportedByUserId { get; set; }
    public string? FileName { get; set; }
    /// <summary>STT dong trong file (1-based)</summary>
    public int RowNumber { get; set; }
    // --- Du lieu tung dong ---
    public string MaHoSo { get; set; } = string.Empty;
    public string? MaBenhNhan { get; set; }
    public string? HoTen { get; set; }
    public string? SoTheBHYT { get; set; }
    public DateTime? NgayVao { get; set; }
    public DateTime? NgayRa { get; set; }
    public string? MaKhoa { get; set; }
    public string? TenKhoa { get; set; }
    public string? MaChanDoan { get; set; }
    public decimal TienVienPhi { get; set; }
    public decimal TienBHYT { get; set; }
    public decimal TienBenhNhan { get; set; }
    /// <summary>0=ChuaDuyet, 1=DaDuyet, 2=TuChoi</summary>
    public int TrangThaiGiamDinh { get; set; }
    public string? GhiChu { get; set; }
    // --- Ket qua xu ly ---
    public bool IsValid { get; set; } = true;
    public string? ValidationError { get; set; }
}
