namespace HIS.Application.DTOs.Procurement;

// ── List / search ────────────────────────────────────────────────────────────

public class AssetProcurementSearchDto
{
    public string? Keyword { get; set; }
    public int? Status { get; set; }
    public int? RequestType { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
    public int PageIndex { get; set; } = 0;
    public int PageSize { get; set; } = 30;
}

// ── Read DTOs ────────────────────────────────────────────────────────────────

public class AssetProcurementRequestDto
{
    public Guid Id { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int RequestType { get; set; }    // 1=DeXuat, 2=DuTru, 3=MuaSam
    public string RequestTypeName { get; set; } = string.Empty;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? RequesterId { get; set; }
    public string? RequesterName { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; }         // 0=DuThao,1=ChoXetDuyet,2=DaDuyet,3=TuChoi,4=HoanTat
    public string StatusName { get; set; } = string.Empty;
    public decimal? TotalAmount { get; set; }
    public Guid? ApproverId { get; set; }
    public string? ApproverName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public int ItemCount { get; set; }
    public List<AssetProcurementItemDto> Items { get; set; } = new();
}

public class AssetProcurementItemDto
{
    public Guid Id { get; set; }
    public Guid AssetProcurementRequestId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Amount { get; set; }
    public string? Specification { get; set; }
}

// ── Write DTOs ───────────────────────────────────────────────────────────────

public class SaveAssetProcurementRequestDto
{
    public Guid? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int RequestType { get; set; } = 1;
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? RequesterName { get; set; }
    public string? Reason { get; set; }
    public string? Note { get; set; }
    public List<SaveAssetProcurementItemDto> Items { get; set; } = new();
}

public class SaveAssetProcurementItemDto
{
    public Guid? Id { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public string? Specification { get; set; }
}

// ── Action DTOs ──────────────────────────────────────────────────────────────

public class ApproveRejectAssetProcurementDto
{
    public Guid RequestId { get; set; }
    public string? Note { get; set; }
}

// ── Paged result ──────────────────────────────────────────────────────────────

public class AssetProcurementPagedResult
{
    public List<AssetProcurementRequestDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
}
