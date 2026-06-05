namespace HIS.Core.Entities;

/// <summary>
/// Culture order for a patient sample — one record per lab request item that is microbiology type.
/// Status: 0=Pending, 1=Incubating, 2=GrowthDetected, 3=NoGrowth, 4=Identified, 5=Completed
/// </summary>
public class MicrobiologyCulture : BaseEntity
{
    /// <summary>Link to LabRequest (microbiology lab request)</summary>
    public Guid? LabRequestId { get; set; }

    /// <summary>Human-readable request code, e.g. LAB-20260605-0001</summary>
    public string RequestCode { get; set; } = string.Empty;

    public Guid? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;

    /// <summary>Sample type: blood, urine, sputum, csf, wound, stool, tissue, other</summary>
    public string SampleType { get; set; } = string.Empty;

    public string? SampleBarcode { get; set; }

    /// <summary>Culture type: aerobic, anaerobic, fungal, mycobacteria</summary>
    public string CultureType { get; set; } = string.Empty;

    public DateTime CultureDate { get; set; }
    public DateTime? IncubationStart { get; set; }
    public DateTime? IncubationEnd { get; set; }
    public DateTime? ResultDate { get; set; }

    /// <summary>0=Pending, 1=Incubating, 2=GrowthDetected, 3=NoGrowth, 4=Identified, 5=Completed</summary>
    public int Status { get; set; }

    public string? Notes { get; set; }

    // Navigation
    public virtual ICollection<MicrobiologyOrganismFinding> Organisms { get; set; } = new List<MicrobiologyOrganismFinding>();
}

/// <summary>
/// Organism identified in a culture — one row per identified organism per culture order.
/// </summary>
public class MicrobiologyOrganismFinding : BaseEntity
{
    public Guid CultureId { get; set; }

    /// <summary>Optional FK to LabOrganism master catalog</summary>
    public Guid? LabOrganismId { get; set; }

    public string OrganismCode { get; set; } = string.Empty;
    public string OrganismName { get; set; } = string.Empty;

    /// <summary>Colony count description: few, moderate, many, or numeric string</summary>
    public string? ColonyCount { get; set; }

    /// <summary>Colony morphology description</summary>
    public string? Morphology { get; set; }

    /// <summary>Gram stain: positive, negative, mixed</summary>
    public string? GramStain { get; set; }

    /// <summary>Identification method: standard, MALDI-TOF, 16S rRNA</summary>
    public string? IdentificationMethod { get; set; }

    // Navigation
    public virtual MicrobiologyCulture? Culture { get; set; }
    public virtual ICollection<AntibioticSensitivityResult> Antibiogram { get; set; } = new List<AntibioticSensitivityResult>();
}

/// <summary>
/// AST (Antibiotic Sensitivity Test) result for one antibiotic against one organism finding.
/// Interpretation: S=Sensitive, I=Intermediate, R=Resistant
/// </summary>
public class AntibioticSensitivityResult : BaseEntity
{
    public Guid OrganismFindingId { get; set; }

    /// <summary>Optional FK to LabAntibiotic master catalog</summary>
    public Guid? LabAntibioticId { get; set; }

    public string AntibioticCode { get; set; } = string.Empty;
    public string AntibioticName { get; set; } = string.Empty;

    /// <summary>MIC value in μg/mL</summary>
    public decimal? Mic { get; set; }

    /// <summary>Zone diameter in mm (disk diffusion)</summary>
    public decimal? ZoneDiameter { get; set; }

    /// <summary>S=Sensitive, I=Intermediate, R=Resistant</summary>
    public string Interpretation { get; set; } = string.Empty;

    /// <summary>Test method: disk, mic, etest</summary>
    public string? Method { get; set; }

    // Navigation
    public virtual MicrobiologyOrganismFinding? OrganismFinding { get; set; }
}
