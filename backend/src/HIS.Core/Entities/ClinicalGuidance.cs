namespace HIS.Core.Entities;

/// <summary>
/// Đợt chỉ đạo tuyến (NangCap14 - Module 20)
/// </summary>
public class ClinicalGuidanceBatch : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string TargetFacility { get; set; } = string.Empty; // Co so y te tuyen duoi
    public string? TargetFacilityCode { get; set; }

    // GuidanceType: KhamChua, DaoTao, ChuyenGiao, HoTro
    public string GuidanceType { get; set; } = "KhamChua";

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    // Status: Planning, InProgress, Completed, Cancelled
    public string Status { get; set; } = "Planning";

    public Guid LeadDoctorId { get; set; }
    public string? TeamMembers { get; set; } // JSON array of team member objects

    // Budget
    public decimal Budget { get; set; }
    public decimal ActualCost { get; set; }

    // Results
    public string? Summary { get; set; }
    public string? Results { get; set; }
    public string? Recommendations { get; set; }
    public int PatientsExamined { get; set; }
    public int TraineesCount { get; set; }
    public int TechniquesTransferred { get; set; }

    // Navigation
    public virtual User? LeadDoctor { get; set; }
    public virtual ICollection<ClinicalGuidanceActivity> Activities { get; set; } = new List<ClinicalGuidanceActivity>();
}

/// <summary>
/// Hoạt động trong đợt chỉ đạo tuyến
/// </summary>
public class ClinicalGuidanceActivity : BaseEntity
{
    public Guid BatchId { get; set; }
    public DateTime ActivityDate { get; set; }

    // ActivityType: KhamBenh, DaoTao, ChuyenGiao, HoiChan, BaoCao, Other
    public string ActivityType { get; set; } = "KhamBenh";

    public string Description { get; set; } = string.Empty;
    public string? Performer { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }

    // Metrics
    public int? PatientCount { get; set; }
    public int? TraineeCount { get; set; }

    // Navigation
    public virtual ClinicalGuidanceBatch? Batch { get; set; }
}
