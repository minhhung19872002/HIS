namespace HIS.Application.DTOs;

public class CultureStockDto
{
    public Guid Id { get; set; }
    public string StockCode { get; set; } = string.Empty;
    public Guid? SourceCultureId { get; set; }
    public string OrganismCode { get; set; } = string.Empty;
    public string OrganismName { get; set; } = string.Empty;
    public string? ScientificName { get; set; }
    public string? GramStain { get; set; }
    public string? SourceType { get; set; }
    public string? SourceDescription { get; set; }
    public string? FreezerCode { get; set; }
    public string? RackCode { get; set; }
    public string? BoxCode { get; set; }
    public string? Position { get; set; }
    public string LocationDisplay { get; set; } = string.Empty; // "TL-01 / R1 / B1 / A1"
    public string PreservationMethod { get; set; } = string.Empty;
    public string? StorageTemperature { get; set; }
    public int PassageNumber { get; set; }
    public int AliquotCount { get; set; }
    public int RemainingAliquots { get; set; }
    public string PreservationDate { get; set; } = string.Empty;
    public string? ExpiryDate { get; set; }
    public string? LastViabilityCheck { get; set; }
    public bool? LastViabilityResult { get; set; }
    public int Status { get; set; }
    public string? PreservedBy { get; set; }
    public string? Notes { get; set; }
    public int LogCount { get; set; }
}

public class CultureStockSearchDto
{
    public string? Keyword { get; set; }
    public string? OrganismCode { get; set; }
    public string? FreezerCode { get; set; }
    public string? PreservationMethod { get; set; }
    public int? Status { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; } = 20;
}

public class CreateCultureStockDto
{
    public Guid? SourceCultureId { get; set; }
    public string OrganismCode { get; set; } = string.Empty;
    public string OrganismName { get; set; } = string.Empty;
    public string? ScientificName { get; set; }
    public string? GramStain { get; set; }
    public string? SourceType { get; set; }
    public string? SourceDescription { get; set; }
    public string? FreezerCode { get; set; }
    public string? RackCode { get; set; }
    public string? BoxCode { get; set; }
    public string? Position { get; set; }
    public string PreservationMethod { get; set; } = string.Empty;
    public string? StorageTemperature { get; set; }
    public int PassageNumber { get; set; } = 1;
    public int AliquotCount { get; set; } = 1;
    public string? PreservationDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateCultureStockDto
{
    public string? FreezerCode { get; set; }
    public string? RackCode { get; set; }
    public string? BoxCode { get; set; }
    public string? Position { get; set; }
    public string? StorageTemperature { get; set; }
    public string? ExpiryDate { get; set; }
    public string? Notes { get; set; }
}

public class RetrieveAliquotDto
{
    public int AliquotCount { get; set; } = 1;
    public string? Purpose { get; set; }
    public string? Notes { get; set; }
}

public class ViabilityCheckDto
{
    public bool IsViable { get; set; }
    public string? Method { get; set; } // subculture, staining, molecular
    public string? Notes { get; set; }
}

public class SubcultureDto
{
    public int NewAliquotCount { get; set; } = 1;
    public string? FreezerCode { get; set; }
    public string? RackCode { get; set; }
    public string? BoxCode { get; set; }
    public string? Position { get; set; }
    public string? Notes { get; set; }
}

public class CultureStockLogDto
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public int? AliquotsTaken { get; set; }
    public string? Purpose { get; set; }
    public string? Result { get; set; }
    public string? PerformedBy { get; set; }
    public string PerformedAt { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class CultureStockStatsDto
{
    public int TotalStocks { get; set; }
    public int ActiveCount { get; set; }
    public int LowStockCount { get; set; }
    public int ExpiredCount { get; set; }
    public int DepletedCount { get; set; }
    public int ExpiringIn30Days { get; set; }
    public int NeedViabilityCheck { get; set; } // >90 days since last check
    public List<OrganismStockSummary> TopOrganisms { get; set; } = new();
}

public class OrganismStockSummary
{
    public string OrganismName { get; set; } = string.Empty;
    public int StockCount { get; set; }
    public int TotalAliquots { get; set; }
}
