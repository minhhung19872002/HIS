namespace HIS.Core.Entities;

/// <summary>
/// Phieu de xuat / du tru / to trinh mua sam tai san + vat tu hanh chinh (#108)
/// Khac voi ProcurementRequest (warehouse module) — day la workflow duyet cap quan ly.
/// RequestType: 1=DeXuat (đề xuất), 2=DuTru (dự trù), 3=MuaSam (tờ trình mua sắm), 4=TrangCap (trang cấp tài sản — NangCap26 XVII.3)
/// Status: 0=DuThao, 1=ChoXetDuyet, 2=DaDuyet, 3=TuChoi, 4=HoanTat
/// </summary>
public class AssetProcurementRequest : BaseEntity
{
    public string RequestNo { get; set; } = string.Empty;   // auto-gen, e.g. DX-2026-XXXXXX
    public string Title { get; set; } = string.Empty;
    public int RequestType { get; set; } = 1;               // 1=DeXuat, 2=DuTru, 3=MuaSam
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? RequesterId { get; set; }
    public string? RequesterName { get; set; }
    public string? Reason { get; set; }
    public int Status { get; set; } = 0;                    // 0=DuThao
    public decimal? TotalAmount { get; set; }
    public Guid? ApproverId { get; set; }
    public string? ApproverName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Note { get; set; }

    // NangCap26 XVII.3/XVII.4: RequestType = 4 (TrangCap) — khoa/phòng xin cấp tài sản
    // từ kho TTB. Sau khi duyệt, bước "cấp phát" sinh AssetHandover về khoa yêu cầu.
    public DateTime? IssuedAt { get; set; }
    public Guid? IssuedBy { get; set; }

    // Navigation
    public ICollection<AssetProcurementRequestItem> Items { get; set; } = new List<AssetProcurementRequestItem>();
}

/// <summary>
/// Chi tiet hang muc trong phieu de xuat / mua sam tai san (#108)
/// </summary>
public class AssetProcurementRequestItem : BaseEntity
{
    public Guid AssetProcurementRequestId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Amount { get; set; }    // = Quantity * UnitPrice (denormalized for display)
    public string? Specification { get; set; }

    // Navigation
    public AssetProcurementRequest? AssetProcurementRequest { get; set; }
}
