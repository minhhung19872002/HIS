namespace HIS.Core.Entities;

/// <summary>
/// Kho lưu chủng vi sinh - Culture Collection/Strain Repository
/// </summary>
public class CultureStock : BaseEntity
{
    public string StockCode { get; set; } = string.Empty; // VS-2026-0001
    public Guid? SourceCultureId { get; set; } // Link to microbiology culture order
    public string OrganismCode { get; set; } = string.Empty;
    public string OrganismName { get; set; } = string.Empty;
    public string? ScientificName { get; set; }
    public string? GramStain { get; set; } // positive, negative
    public string? SourceType { get; set; } // clinical, environmental, reference, qc
    public string? SourceDescription { get; set; } // e.g. "Blood culture - BN Nguyen Van A"

    // Storage location
    public string? FreezerCode { get; set; } // TL-01 (Tủ lạnh)
    public string? RackCode { get; set; } // R1
    public string? BoxCode { get; set; } // B1
    public string? Position { get; set; } // A1, A2...

    // Preservation
    public string PreservationMethod { get; set; } = string.Empty; // glycerol, lyophilization, cryopreservation, skim_milk
    public string? StorageTemperature { get; set; } // -80, -20, -196, 4
    public int PassageNumber { get; set; } = 1; // P1, P2...
    public int AliquotCount { get; set; }
    public int RemainingAliquots { get; set; }

    // Dates
    public DateTime PreservationDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public DateTime? LastViabilityCheck { get; set; }
    public bool? LastViabilityResult { get; set; } // true=viable, false=not viable

    // Status: 0=Active, 1=LowStock, 2=Expired, 3=Depleted, 4=Discarded
    public int Status { get; set; }
    public string? PreservedBy { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public ICollection<CultureStockLog> Logs { get; set; } = new List<CultureStockLog>();
}

/// <summary>
/// Log hoạt động kho lưu chủng
/// </summary>
public class CultureStockLog : BaseEntity
{
    public Guid CultureStockId { get; set; }
    public string Action { get; set; } = string.Empty; // store, retrieve, viability_check, subculture, discard, note
    public int? AliquotsTaken { get; set; }
    public string? Purpose { get; set; }
    public string? Result { get; set; }
    public string? PerformedBy { get; set; }
    public DateTime PerformedAt { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public CultureStock? CultureStock { get; set; }
}
