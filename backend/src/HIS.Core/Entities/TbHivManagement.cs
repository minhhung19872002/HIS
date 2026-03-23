namespace HIS.Core.Entities;

/// <summary>
/// Sổ quản lý bệnh nhân Lao/HIV (NangCap14 - Module 4.38-4.39)
/// </summary>
public class TbHivRecord : BaseEntity
{
    public Guid PatientId { get; set; }

    // RecordType: TB, HIV, TB_HIV
    public string RecordType { get; set; } = "TB";

    public DateTime RegistrationDate { get; set; }
    public string RegistrationCode { get; set; } = string.Empty;

    // TreatmentCategory: New, Relapse, FailedTreatment, ReturnAfterDefault, TransferIn, Other
    public string TreatmentCategory { get; set; } = "New";

    public string? TreatmentRegimen { get; set; } // e.g. 2RHZE/4RH, TDF+3TC+DTG
    public DateTime? TreatmentStartDate { get; set; }
    public DateTime? ExpectedEndDate { get; set; }

    // Status: OnTreatment, Completed, Failed, DefaultedLostToFollowUp, Died, TransferredOut
    public string Status { get; set; } = "OnTreatment";

    // TB-specific
    public string? SmearResult { get; set; } // Positive, Negative, NotDone
    public string? GeneXpertResult { get; set; } // Detected, NotDetected, RifResistant, Indeterminate, NotDone
    public string? TbSite { get; set; } // Pulmonary, ExtraPulmonary, Both
    public bool IsMdr { get; set; } // Multi-drug resistant

    // HIV-specific
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }
    public string? ArtRegimen { get; set; } // ART regimen line
    public DateTime? ArtStartDate { get; set; }
    public string? WhoStage { get; set; } // I, II, III, IV

    // DOT (Directly Observed Therapy)
    public string? DotProvider { get; set; }
    public string? DotProviderPhone { get; set; }

    // Outcome
    public DateTime? OutcomeDate { get; set; }
    public string? OutcomeNotes { get; set; }

    public Guid? DoctorId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual User? Doctor { get; set; }
    public virtual Department? Department { get; set; }
    public virtual ICollection<TbHivFollowUp> FollowUps { get; set; } = new List<TbHivFollowUp>();
}

/// <summary>
/// Lần tái khám bệnh nhân Lao/HIV
/// </summary>
public class TbHivFollowUp : BaseEntity
{
    public Guid TbHivRecordId { get; set; }
    public DateTime VisitDate { get; set; }
    public int TreatmentMonth { get; set; } // Thang dieu tri thu may

    // Clinical
    public decimal? Weight { get; set; }
    public string? SmearResult { get; set; }
    public string? CultureResult { get; set; }
    public int? Cd4Count { get; set; }
    public decimal? ViralLoad { get; set; }

    // Treatment adherence
    public string? DrugAdherence { get; set; } // Good, Fair, Poor
    public string? SideEffects { get; set; }
    public bool RegimenChanged { get; set; }
    public string? NewRegimen { get; set; }

    public string? Notes { get; set; }
    public Guid? ExaminationId { get; set; }

    // Navigation
    public virtual TbHivRecord? TbHivRecord { get; set; }
    public virtual Examination? Examination { get; set; }
}
