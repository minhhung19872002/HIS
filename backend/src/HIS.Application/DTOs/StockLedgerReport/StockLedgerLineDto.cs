namespace HIS.Application.DTOs.StockLedgerReport;

public record StockLedgerLineDto(
    DateTime Date, string ItemCode, string ItemName, string? Unit,
    decimal InQty, decimal OutQty, decimal UnitPrice, string RefCode, string RefType);
