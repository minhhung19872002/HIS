namespace HIS.Core.Entities;

/// <summary>
/// Cặp vợ chồng IVF (In Vitro Fertilization)
/// </summary>
public class IvfPatientCouple : BaseEntity
{
    public Guid WifePatientId { get; set; }
    public Guid HusbandPatientId { get; set; }
    public int InfertilityDurationMonths { get; set; }
    public string? InfertilityCause { get; set; }
    public DateTime? MarriageDate { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? WifePatient { get; set; }
    public virtual Patient? HusbandPatient { get; set; }
    public virtual ICollection<IvfCycle> Cycles { get; set; } = new List<IvfCycle>();
}

/// <summary>
/// Chu kỳ IVF
/// Status: 1=Active, 2=OvumPickup, 3=Fertilization, 4=Transfer, 5=Frozen, 6=Completed, 7=Cancelled
/// </summary>
public class IvfCycle : BaseEntity
{
    public Guid CoupleId { get; set; }
    public int CycleNumber { get; set; }
    public DateTime StartDate { get; set; }
    public int Status { get; set; } = 1;
    public string? Protocol { get; set; }
    public Guid? DoctorId { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual IvfPatientCouple? Couple { get; set; }
    public virtual User? Doctor { get; set; }
    public virtual IvfOvumPickup? OvumPickup { get; set; }
    public virtual ICollection<IvfEmbryo> Embryos { get; set; } = new List<IvfEmbryo>();
    public virtual ICollection<IvfEmbryoTransfer> Transfers { get; set; } = new List<IvfEmbryoTransfer>();
    public virtual ICollection<IvfBiopsy> Biopsies { get; set; } = new List<IvfBiopsy>();
}

/// <summary>
/// Chọc trứng (Ovum Pickup / OPU)
/// </summary>
public class IvfOvumPickup : BaseEntity
{
    public Guid CycleId { get; set; }
    public DateTime PickupDate { get; set; }
    public int TotalOvums { get; set; }
    public int MatureOvums { get; set; }
    public int ImmatureOvums { get; set; }
    public int DegeneratedOvums { get; set; }
    public Guid? PerformedById { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual IvfCycle? Cycle { get; set; }
    public virtual User? PerformedBy { get; set; }
}

/// <summary>
/// Phôi (Embryo)
/// Status: 1=Culture, 2=Fresh_Transfer, 3=Frozen, 4=Thawed, 5=Transferred, 6=Discarded
/// </summary>
public class IvfEmbryo : BaseEntity
{
    public Guid CycleId { get; set; }
    public string EmbryoCode { get; set; } = string.Empty;
    public string? Day2Grade { get; set; }
    public string? Day3Grade { get; set; }
    public string? Day5Grade { get; set; }
    public string? Day6Grade { get; set; }
    public string? Day7Grade { get; set; }
    public int Status { get; set; } = 1;
    public DateTime? FreezeDate { get; set; }
    public DateTime? ThawDate { get; set; }
    public string? StrawCode { get; set; }
    public string? StrawColor { get; set; }
    public string? BoxCode { get; set; }
    public string? TankCode { get; set; }
    public string? RackPosition { get; set; }
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }

    // Navigation
    public virtual IvfCycle? Cycle { get; set; }
}

/// <summary>
/// Chuyển phôi (Embryo Transfer)
/// TransferType: 1=Fresh, 2=Frozen
/// ResultStatus: 0=Pending, 1=Positive, 2=Negative
/// </summary>
public class IvfEmbryoTransfer : BaseEntity
{
    public Guid CycleId { get; set; }
    public DateTime TransferDate { get; set; }
    public int TransferType { get; set; } = 1;
    public int EmbryoCount { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? EmbryologistId { get; set; }
    public string? Notes { get; set; }
    public int ResultStatus { get; set; }

    // Navigation
    public virtual IvfCycle? Cycle { get; set; }
    public virtual User? Doctor { get; set; }
    public virtual User? Embryologist { get; set; }
}

/// <summary>
/// Ngân hàng tinh trùng (Sperm Bank)
/// Status: 1=Stored, 2=Used, 3=Disposed
/// </summary>
public class IvfSpermBank : BaseEntity
{
    public Guid PatientId { get; set; }
    public string SampleCode { get; set; } = string.Empty;
    public DateTime CollectionDate { get; set; }
    public decimal? Volume { get; set; }
    public decimal? Concentration { get; set; }
    public decimal? Motility { get; set; }
    public decimal? Morphology { get; set; }
    public int StrawCount { get; set; }
    public string? TankCode { get; set; }
    public string? RackPosition { get; set; }
    public string? BoxCode { get; set; }
    public int Status { get; set; } = 1;
    public DateTime? ExpiryDate { get; set; }
    public decimal StorageFee { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual Patient? Patient { get; set; }
}

/// <summary>
/// Sinh thiết phôi (Embryo Biopsy / PGT)
/// </summary>
public class IvfBiopsy : BaseEntity
{
    public Guid CycleId { get; set; }
    public Guid? PatientId { get; set; }
    public string? BiopsyLab { get; set; }
    public DateTime? SentDate { get; set; }
    public DateTime? ResultDate { get; set; }
    public string? Result { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public virtual IvfCycle? Cycle { get; set; }
    public virtual Patient? Patient { get; set; }
}
