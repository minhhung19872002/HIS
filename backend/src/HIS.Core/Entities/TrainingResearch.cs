namespace HIS.Core.Entities;

/// <summary>
/// Lop dao tao (NangCap17 - Module D: Dao tao, Chi dao tuyen, NCKH)
/// </summary>
public class TrainingClass : BaseEntity
{
    public string ClassCode { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;

    /// <summary>1=Internal, 2=External, 3=CME, 4=ClinicalDirection</summary>
    public int TrainingType { get; set; } = 1;

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int MaxStudents { get; set; } = 30;
    public string? Location { get; set; }
    public Guid? InstructorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Description { get; set; }
    public decimal CreditHours { get; set; }

    /// <summary>1=Planned, 2=InProgress, 3=Completed, 4=Cancelled</summary>
    public int Status { get; set; } = 1;

    public decimal Fee { get; set; }

    // Navigation
    public virtual User? Instructor { get; set; }
    public virtual Department? Department { get; set; }
    public virtual ICollection<TrainingStudent> Students { get; set; } = new List<TrainingStudent>();
}

/// <summary>
/// Hoc vien tham gia lop dao tao
/// </summary>
public class TrainingStudent : BaseEntity
{
    public Guid ClassId { get; set; }
    public Guid? StaffId { get; set; }
    public string? ExternalName { get; set; }

    /// <summary>1=Internal, 2=External, 3=Intern</summary>
    public int StudentType { get; set; } = 1;

    /// <summary>1=Registered, 2=Attending, 3=Completed, 4=Dropped</summary>
    public int AttendanceStatus { get; set; } = 1;

    public decimal? Score { get; set; }
    public string? CertificateNumber { get; set; }
    public DateTime? CertificateDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual TrainingClass? TrainingClass { get; set; }
    public virtual User? Staff { get; set; }
}

/// <summary>
/// Chi dao tuyen (Upper/Lower clinical direction)
/// </summary>
public class ClinicalDirection : BaseEntity
{
    /// <summary>1=Upper (tuyen tren), 2=Lower (tuyen duoi)</summary>
    public int DirectionType { get; set; } = 1;

    public string PartnerHospital { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Objectives { get; set; }

    /// <summary>1=Planned, 2=Active, 3=Completed</summary>
    public int Status { get; set; } = 1;

    public Guid? ResponsibleDoctorId { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual User? ResponsibleDoctor { get; set; }
}

/// <summary>
/// Du an nghien cuu khoa hoc
/// </summary>
public class ResearchProject : BaseEntity
{
    public string ProjectCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>1=National, 2=Ministry, 3=Hospital</summary>
    public int Level { get; set; } = 3;

    public Guid? PrincipalInvestigatorId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal Budget { get; set; }

    /// <summary>1=Proposed, 2=Approved, 3=InProgress, 4=Completed, 5=Published</summary>
    public int Status { get; set; } = 1;

    public string? Abstract { get; set; }
    public string? Findings { get; set; }
    public string? PublicationInfo { get; set; }

    // Navigation
    public virtual User? PrincipalInvestigator { get; set; }
}
