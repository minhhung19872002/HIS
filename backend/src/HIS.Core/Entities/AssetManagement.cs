namespace HIS.Core.Entities;

/// <summary>
/// Goi thau - Tender Management
/// TenderType: 1=Open, 2=Limited, 3=DirectPurchase
/// Status: 1=Draft, 2=Published, 3=Evaluating, 4=Awarded, 5=Cancelled
/// </summary>
public class Tender : BaseEntity
{
    public string TenderCode { get; set; } = string.Empty;
    public string TenderName { get; set; } = string.Empty;
    public int TenderType { get; set; } // 1=Open, 2=Limited, 3=DirectPurchase
    public DateTime? PublishDate { get; set; }
    public DateTime? ClosingDate { get; set; }
    public decimal BudgetAmount { get; set; }
    public int Status { get; set; } = 1; // 1=Draft
    public Guid? WinnerSupplierId { get; set; }
    public string? ContractNumber { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public ICollection<TenderItem> Items { get; set; } = new List<TenderItem>();
}

/// <summary>
/// Hang muc trong goi thau - Tender Item
/// ItemType: 1=FixedAsset, 2=Tool, 3=Supply
/// </summary>
public class TenderItem : BaseEntity
{
    public Guid TenderId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public int ItemType { get; set; } // 1=FixedAsset, 2=Tool, 3=Supply
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Specification { get; set; }
    public Guid? SupplierId { get; set; }

    // Navigation
    public Tender? Tender { get; set; }
}

/// <summary>
/// Tai san co dinh - Fixed Asset
/// DepreciationMethod: 1=StraightLine, 2=DecliningBalance
/// Status: 1=InUse, 2=Broken, 3=UnderRepair, 4=PendingDisposal, 5=Disposed, 6=Transferred
/// </summary>
public class FixedAsset : BaseEntity
{
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string? AssetGroupId { get; set; }
    public decimal OriginalValue { get; set; }
    public decimal CurrentValue { get; set; }
    public DateTime PurchaseDate { get; set; }
    public int DepreciationMethod { get; set; } = 1; // 1=StraightLine
    public int UsefulLifeMonths { get; set; }
    public decimal MonthlyDepreciation { get; set; }
    public decimal AccumulatedDepreciation { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? LocationDescription { get; set; }
    public int Status { get; set; } = 1; // 1=InUse
    public string? QrCode { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? TenderId { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public ICollection<AssetHandover> Handovers { get; set; } = new List<AssetHandover>();
    public ICollection<AssetDisposal> Disposals { get; set; } = new List<AssetDisposal>();
    public ICollection<AssetDepreciation> Depreciations { get; set; } = new List<AssetDepreciation>();
}

/// <summary>
/// Ban giao tai san - Asset Handover
/// HandoverType: 1=Receive, 2=Transfer, 3=Borrow, 4=Return
/// Status: 1=Pending, 2=Confirmed
/// </summary>
public class AssetHandover : BaseEntity
{
    public Guid FixedAssetId { get; set; }
    public int HandoverType { get; set; } // 1=Receive, 2=Transfer, 3=Borrow, 4=Return
    public Guid? FromDepartmentId { get; set; }
    public Guid? ToDepartmentId { get; set; }
    public DateTime HandoverDate { get; set; }
    public string? HandoverById { get; set; }
    public string? ReceivedById { get; set; }
    public string? Notes { get; set; }
    public int Status { get; set; } = 1; // 1=Pending

    // Navigation
    public FixedAsset? FixedAsset { get; set; }
}

/// <summary>
/// Thanh ly tai san - Asset Disposal
/// DisposalType: 1=Scrap, 2=Auction, 3=Liquidation
/// Status: 1=Proposed, 2=Approved, 3=Completed, 4=Rejected
/// </summary>
public class AssetDisposal : BaseEntity
{
    public Guid FixedAssetId { get; set; }
    public int DisposalType { get; set; } // 1=Scrap, 2=Auction, 3=Liquidation
    public DateTime ProposalDate { get; set; }
    public DateTime? ApprovalDate { get; set; }
    public DateTime? DisposalDate { get; set; }
    public string? ApprovedById { get; set; }
    public decimal DisposalValue { get; set; }
    public decimal ResidualValue { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; } = 1; // 1=Proposed

    // Navigation
    public FixedAsset? FixedAsset { get; set; }
}

/// <summary>
/// Khau hao tai san - Asset Depreciation (monthly record)
/// </summary>
public class AssetDepreciation : BaseEntity
{
    public Guid FixedAssetId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal OpeningValue { get; set; }
    public decimal DepreciationAmount { get; set; }
    public decimal ClosingValue { get; set; }
    public DateTime CalculatedAt { get; set; }

    // Navigation
    public FixedAsset? FixedAsset { get; set; }
}
