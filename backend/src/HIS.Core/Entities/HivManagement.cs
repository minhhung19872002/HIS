namespace HIS.Core.Entities;

/// <summary>
/// Quản lý bệnh nhân HIV/AIDS - HivPatient
/// </summary>
public class HivPatient : BaseEntity
{
    public Guid PatientId { get; set; }
    public string HivCode { get; set; } = string.Empty; // Unique patient code
    public DateTime DiagnosisDate { get; set; }
    /// <summary>
    /// VCT, HTC, PMTCT, Other
    /// </summary>
    public string DiagnosisType { get; set; } = "VCT";
    public DateTime? ConfirmationDate { get; set; }
    public string? CurrentARTRegimen { get; set; }
    public DateTime? ARTStartDate { get; set; }
    /// <summary>
    /// 0=PreART, 1=OnART, 2=Interrupted, 3=Transferred, 4=Deceased, 5=LostToFollowUp
    /// </summary>
    public int ARTStatus { get; set; }
    /// <summary>
    /// WHO Clinical Stage 1-4
    /// </summary>
    public int WHOStage { get; set; } = 1;
    public int? LastCD4Count { get; set; }
    public DateTime? LastCD4Date { get; set; }
    public decimal? LastViralLoad { get; set; }
    public DateTime? LastViralLoadDate { get; set; }
    public bool? IsVirallySuppressed { get; set; }
    public string? CoInfections { get; set; } // JSON or comma-separated (e.g., "HepB,HepC,TB")
    public string? ReferralSource { get; set; }
    public bool LinkedToMethadone { get; set; }
    public Guid? MethadonePatientId { get; set; }
    public DateTime? NextAppointmentDate { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
    public virtual ICollection<HivLabResult> LabResults { get; set; } = new List<HivLabResult>();
    public virtual ICollection<PmtctRecord> PmtctRecords { get; set; } = new List<PmtctRecord>();
}

/// <summary>
/// Kết quả xét nghiệm HIV - HivLabResult
/// </summary>
public class HivLabResult : BaseEntity
{
    public Guid HivPatientId { get; set; }
    public DateTime TestDate { get; set; }
    /// <summary>
    /// CD4, ViralLoad, Genotype, DrugResistance, HepB, HepC
    /// </summary>
    public string TestType { get; set; } = string.Empty;
    public string? Result { get; set; }
    public string? Unit { get; set; }
    public bool? IsAbnormal { get; set; }
    public string? LabName { get; set; }
    public string? OrderedBy { get; set; }

    // Navigation
    public virtual HivPatient? HivPatient { get; set; }
}

/// <summary>
/// Phòng lây truyền mẹ-con (PMTCT) - PmtctRecord
/// </summary>
public class PmtctRecord : BaseEntity
{
    public Guid HivPatientId { get; set; }
    public Guid? PregnancyId { get; set; }
    public int? GestationalAgeAtDiagnosis { get; set; }
    public bool ARTDuringPregnancy { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? DeliveryMode { get; set; } // e.g., "Vaginal", "C-Section"
    public bool InfantProphylaxis { get; set; }
    public DateTime? InfantHivTestDate { get; set; }
    public string? InfantHivTestResult { get; set; } // Positive, Negative, Indeterminate
    public string? BreastfeedingStatus { get; set; } // Exclusive, Mixed, Formula, None

    // Navigation
    public virtual HivPatient? HivPatient { get; set; }
}
