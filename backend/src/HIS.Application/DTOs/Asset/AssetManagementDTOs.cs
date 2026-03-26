namespace HIS.Application.DTOs.Asset;

// ---- Tender DTOs ----

public class TenderSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public int? TenderType { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class TenderDto
{
    public Guid Id { get; set; }
    public string TenderCode { get; set; } = string.Empty;
    public string TenderName { get; set; } = string.Empty;
    public int TenderType { get; set; }
    public DateTime? PublishDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public decimal BudgetAmount { get; set; }
    public int Status { get; set; }
    public Guid? WinnerSupplierId { get; set; }
    public string? WinnerSupplierName { get; set; }
    public string? ContractNumber { get; set; }
    public string? Notes { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalItemValue { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveTenderDto
{
    public Guid? Id { get; set; }
    public string TenderCode { get; set; } = string.Empty;
    public string TenderName { get; set; } = string.Empty;
    public int TenderType { get; set; }
    public DateTime? PublishDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public decimal BudgetAmount { get; set; }
    public int Status { get; set; } = 1;
    public string? ContractNumber { get; set; }
    public string? Notes { get; set; }
}

public class TenderItemDto
{
    public Guid Id { get; set; }
    public Guid TenderId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public int ItemType { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Specification { get; set; }
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
}

public class SaveTenderItemDto
{
    public Guid? Id { get; set; }
    public Guid TenderId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public int ItemType { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Specification { get; set; }
    public Guid? SupplierId { get; set; }
}

public class AwardTenderDto
{
    public Guid TenderId { get; set; }
    public Guid WinnerSupplierId { get; set; }
    public string? ContractNumber { get; set; }
}

// ---- Fixed Asset DTOs ----

public class AssetSearchDto
{
    public string? Keyword { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Status { get; set; }
    public string? AssetGroupId { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class FixedAssetDto
{
    public Guid Id { get; set; }
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? AssetGroupId { get; set; }
    public decimal OriginalValue { get; set; }
    public decimal CurrentValue { get; set; }
    public DateTime PurchaseDate { get; set; }
    public int DepreciationMethod { get; set; }
    public int UsefulLifeMonths { get; set; }
    public decimal MonthlyDepreciation { get; set; }
    public decimal AccumulatedDepreciation { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? LocationDescription { get; set; }
    public int Status { get; set; }
    public string? QrCode { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? TenderId { get; set; }
    public string? TenderName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveFixedAssetDto
{
    public Guid? Id { get; set; }
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? AssetGroupId { get; set; }
    public decimal OriginalValue { get; set; }
    public decimal CurrentValue { get; set; }
    public DateTime PurchaseDate { get; set; }
    public int DepreciationMethod { get; set; } = 1;
    public int UsefulLifeMonths { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? LocationDescription { get; set; }
    public int Status { get; set; } = 1;
    public string? SerialNumber { get; set; }
    public Guid? TenderId { get; set; }
    public string? Notes { get; set; }
}

public class AssetHistoryDto
{
    public string EventType { get; set; } = string.Empty; // Handover, Disposal, Depreciation, Created
    public DateTime EventDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? PerformedBy { get; set; }
}

// ---- Handover DTOs ----

public class AssetHandoverSearchDto
{
    public Guid? FixedAssetId { get; set; }
    public Guid? DepartmentId { get; set; }
    public int? Status { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class AssetHandoverDto
{
    public Guid Id { get; set; }
    public Guid FixedAssetId { get; set; }
    public string? AssetCode { get; set; }
    public string? AssetName { get; set; }
    public int HandoverType { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public string? FromDepartmentName { get; set; }
    public Guid? ToDepartmentId { get; set; }
    public string? ToDepartmentName { get; set; }
    public DateTime HandoverDate { get; set; }
    public string? HandoverById { get; set; }
    public string? HandoverByName { get; set; }
    public string? ReceivedById { get; set; }
    public string? ReceivedByName { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaveHandoverDto
{
    public Guid? Id { get; set; }
    public Guid FixedAssetId { get; set; }
    public int HandoverType { get; set; }
    public Guid? FromDepartmentId { get; set; }
    public Guid? ToDepartmentId { get; set; }
    public DateTime HandoverDate { get; set; }
    public string? HandoverById { get; set; }
    public string? ReceivedById { get; set; }
    public string? Notes { get; set; }
}

// ---- Disposal DTOs ----

public class DisposalSearchDto
{
    public int? Status { get; set; }
    public int? DisposalType { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 20;
}

public class AssetDisposalDto
{
    public Guid Id { get; set; }
    public Guid FixedAssetId { get; set; }
    public string? AssetCode { get; set; }
    public string? AssetName { get; set; }
    public decimal OriginalValue { get; set; }
    public int DisposalType { get; set; }
    public DateTime ProposalDate { get; set; }
    public DateTime? ApprovalDate { get; set; }
    public DateTime? DisposalDate { get; set; }
    public string? ApprovedById { get; set; }
    public string? ApprovedByName { get; set; }
    public decimal DisposalValue { get; set; }
    public decimal ResidualValue { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProposeDisposalDto
{
    public Guid FixedAssetId { get; set; }
    public int DisposalType { get; set; }
    public decimal DisposalValue { get; set; }
    public decimal ResidualValue { get; set; }
    public string? Reason { get; set; }
}

// ---- Depreciation DTOs ----

public class DepreciationReportDto
{
    public Guid FixedAssetId { get; set; }
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal OpeningValue { get; set; }
    public decimal DepreciationAmount { get; set; }
    public decimal ClosingValue { get; set; }
    public DateTime CalculatedAt { get; set; }
}

public class DepreciationFilterDto
{
    public int? Month { get; set; }
    public int? Year { get; set; }
    public Guid? DepartmentId { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 50;
}

// ---- Dashboard DTOs ----

public class AssetDashboardDto
{
    public int TotalAssets { get; set; }
    public decimal TotalOriginalValue { get; set; }
    public decimal TotalCurrentValue { get; set; }
    public int InUseCount { get; set; }
    public int BrokenCount { get; set; }
    public int UnderRepairCount { get; set; }
    public int PendingDisposalCount { get; set; }
    public int DisposedCount { get; set; }
    public int TransferredCount { get; set; }
    public int PendingHandovers { get; set; }
    public int ActiveTenders { get; set; }
    public decimal MonthlyDepreciationTotal { get; set; }
    public List<AssetStatusBreakdown> StatusBreakdown { get; set; } = new();
    public List<DepreciationTrend> DepreciationTrends { get; set; } = new();
}

public class AssetStatusBreakdown
{
    public int Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalValue { get; set; }
}

public class DepreciationTrend
{
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
}

// ---- Report DTOs ----

public class AssetReportFilterDto
{
    public int? DepartmentId { get; set; }
    public string? AssetGroupCode { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public Guid? AssetId { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }
}

public class AssetReportTypeDto
{
    public int Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}

public class AssetQrCodeDto
{
    public Guid AssetId { get; set; }
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? DepartmentName { get; set; }
    public decimal OriginalValue { get; set; }
    public string? SerialNumber { get; set; }
    public string? LocationDescription { get; set; }
    public string QrContent { get; set; } = string.Empty;
}

// ---- Paged Result ----

public class AssetPagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}
