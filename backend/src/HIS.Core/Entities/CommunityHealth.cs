namespace HIS.Core.Entities;

/// <summary>
/// Hồ sơ sức khỏe hộ gia đình - HouseholdHealthRecord
/// </summary>
public class HouseholdHealthRecord : BaseEntity
{
    public string HouseholdCode { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? WardName { get; set; }
    public string? DistrictName { get; set; }
    public string? HeadOfHousehold { get; set; }
    public string? PhoneNumber { get; set; }
    public int MemberCount { get; set; }
    /// <summary>
    /// 0=Low, 1=Medium, 2=High, 3=VeryHigh
    /// </summary>
    public int RiskLevel { get; set; }
    public Guid? AssignedTeamId { get; set; }
    public DateTime? LastVisitDate { get; set; }
    public DateTime? NextVisitDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual CommunityHealthTeam? AssignedTeam { get; set; }
}

/// <summary>
/// Sàng lọc bệnh không lây nhiễm (NCD) - WHO PEN
/// </summary>
public class NcdScreening : BaseEntity
{
    public Guid PatientId { get; set; }
    public DateTime ScreeningDate { get; set; }
    /// <summary>
    /// HTN, DM, CVD, Combined
    /// </summary>
    public string ScreeningType { get; set; } = "Combined";
    public int? SystolicBP { get; set; }
    public int? DiastolicBP { get; set; }
    public decimal? FastingGlucose { get; set; }
    public decimal? RandomGlucose { get; set; }
    public decimal? HbA1c { get; set; }
    public decimal? BMI { get; set; }
    public decimal? WaistCircumference { get; set; }
    /// <summary>
    /// 0=Never, 1=Former, 2=Current
    /// </summary>
    public int SmokingStatus { get; set; }
    /// <summary>
    /// 0=None, 1=Low, 2=Moderate, 3=Heavy
    /// </summary>
    public int AlcoholUse { get; set; }
    /// <summary>
    /// 0=Sedentary, 1=Light, 2=Moderate, 3=Active
    /// </summary>
    public int PhysicalActivity { get; set; }
    public string? FamilyHistory { get; set; }
    public decimal? CVDRiskScore { get; set; }
    /// <summary>
    /// 0=Low, 1=Medium, 2=High, 3=VeryHigh
    /// </summary>
    public int RiskLevel { get; set; }
    public string? Diagnosis { get; set; }
    public bool ReferredToFacility { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public string? ScreenedBy { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

/// <summary>
/// Đội sức khỏe cộng đồng - CommunityHealthTeam
/// </summary>
public class CommunityHealthTeam : BaseEntity
{
    public string TeamCode { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public string? LeaderName { get; set; }
    public Guid? LeaderId { get; set; }
    public string? AssignedWard { get; set; }
    public int MemberCount { get; set; }
    public int ActiveHouseholds { get; set; }
    /// <summary>
    /// 0=Active, 1=Inactive
    /// </summary>
    public int Status { get; set; }
    public DateTime? EstablishedDate { get; set; }

    // Navigation
    public virtual ICollection<HouseholdHealthRecord> Households { get; set; } = new List<HouseholdHealthRecord>();
}
