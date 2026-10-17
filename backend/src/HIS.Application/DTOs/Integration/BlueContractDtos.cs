namespace HIS.Application.DTOs.Integration;

// BlueContract (cổng hợp đồng / mua sắm) — shapes defined by BlueContract docs/HIS_INTEGRATION.md: the receipt payload is
// what its POST /api/integration/his/warehouse-receipts accepts, the stock row what its RestHisClient maps (StockFields).
// Dates are "yyyy-MM-dd" strings on purpose: the portal parses DateOnly, and business times here are VN local.

/// <summary>Xuất – Nhập – Tồn của một mặt hàng trong kỳ. <see cref="HisKey"/> = mã thuốc trên HIS.</summary>
public class BlueContractStockMovementDto
{
    public string HisKey { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Opening { get; set; }
    public decimal Received { get; set; }
    public decimal Issued { get; set; }
    public decimal Closing { get; set; }
}

/// <summary>Phiếu nhập NCC đã duyệt, theo schema phiếu của BlueContract (idempotent theo <see cref="HisReceiptId"/>).</summary>
public class BlueContractReceiptPayload
{
    public string HisReceiptId { get; set; } = string.Empty;
    public string? ReceiptNumber { get; set; }
    public string Type { get; set; } = "Receipt";
    public string ReceiptDate { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public string? BidDecisionNumber { get; set; }
    public string SupplierTaxCode { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public string? ContractNumber { get; set; }
    public string? Note { get; set; }
    public List<BlueContractReceiptLine> Lines { get; set; } = new();
}

public class BlueContractReceiptLine
{
    public string HisKey { get; set; } = string.Empty;
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? LotNumber { get; set; }
    public string? ExpiryDate { get; set; }
    public decimal Quantity { get; set; }

    /// <summary>Đơn giá ĐÃ GỒM VAT (quy ước của cổng).</summary>
    public decimal UnitPrice { get; set; }
    public decimal VatRate { get; set; }
}
