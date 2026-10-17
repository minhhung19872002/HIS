using System.Globalization;
using HIS.Application.DTOs.Integration;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services.Integration;

/// <summary>
/// Dữ liệu kho cho cổng BlueContract. Mặt hàng được nhận diện bằng MÃ THUỐC (hisKey = MedicineCode): ổn định, đọc được,
/// và là mã bệnh viện ghi trong danh mục trúng thầu nhập vào cổng. Chỉ phiếu nhập NCC (ImportType 1) đã duyệt mới sang.
/// </summary>
public sealed class BlueContractIntegrationService : IBlueContractIntegrationService
{
    private const string DateFormat = "yyyy-MM-dd";
    private readonly HISDbContext _context;
    private readonly IWarehouseCompleteService _warehouse;

    public BlueContractIntegrationService(HISDbContext context, IWarehouseCompleteService warehouse)
    {
        _context = context;
        _warehouse = warehouse;
    }

    public async Task<List<BlueContractStockMovementDto>> GetStockMovementsAsync(
        string warehouseCode, DateTime fromDate, DateTime toDate, IReadOnlyCollection<string> hisKeys)
    {
        var code = warehouseCode.Trim();
        var warehouseId = await _context.Warehouses.AsNoTracking()
            .Where(w => w.WarehouseCode == code)
            .Select(w => (Guid?)w.Id).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Không có kho mã {code}.");
        if (fromDate.Date > toDate.Date)
            throw new InvalidOperationException("Từ ngày phải trước đến ngày.");

        var keys = hisKeys.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var rows = await _warehouse.GetStockMovementReportAsync(warehouseId, fromDate, toDate, null);
        return rows
            .Where(r => keys.Count == 0 || keys.Contains(r.ItemCode))
            .Select(r => new BlueContractStockMovementDto
            {
                HisKey = r.ItemCode,
                ItemName = r.ItemName,
                Unit = r.Unit,
                Opening = r.OpeningQuantity,
                Received = r.TotalReceived,
                Issued = r.TotalIssued,
                Closing = r.ClosingQuantity,
            })
            .ToList();
    }

    public async Task<List<BlueContractReceiptPayload>> GetApprovedReceiptsAsync(DateTime fromDate, DateTime toDate)
    {
        var from = fromDate.Date;
        var toExclusive = toDate.Date.AddDays(1);
        var receipts = await ApprovedSupplierReceipts()
            .Where(r => r.ApprovedAt >= from && r.ApprovedAt < toExclusive)
            .OrderBy(r => r.ApprovedAt)
            .Take(1000)
            .ToListAsync();
        return await ToPayloadsAsync(receipts);
    }

    public async Task<BlueContractReceiptPayload?> BuildReceiptPayloadAsync(Guid receiptId)
    {
        var receipts = await ApprovedSupplierReceipts().Where(r => r.Id == receiptId).ToListAsync();
        return (await ToPayloadsAsync(receipts)).FirstOrDefault();
    }

    private IQueryable<ImportReceipt> ApprovedSupplierReceipts() =>
        _context.ImportReceipts.AsNoTracking()
            .Include(r => r.Warehouse)
            .Include(r => r.Details).ThenInclude(d => d.Medicine)
            .Where(r => !r.IsDeleted && r.ImportType == 1 && r.Status == 1);

    private async Task<List<BlueContractReceiptPayload>> ToPayloadsAsync(List<ImportReceipt> receipts)
    {
        // SupplierCode holds the supplier GUID as text (CreateSupplierReceiptAsync); older rows may hold the code.
        var refs = receipts.Select(r => r.SupplierCode).Where(c => !string.IsNullOrEmpty(c)).Distinct().ToList();
        var ids = refs.Select(c => Guid.TryParse(c, out var id) ? id : Guid.Empty).Where(id => id != Guid.Empty).ToList();
        var suppliers = await _context.Suppliers.AsNoTracking()
            .Where(s => ids.Contains(s.Id) || refs.Contains(s.SupplierCode))
            .ToListAsync();

        var result = new List<BlueContractReceiptPayload>();
        foreach (var r in receipts)
        {
            var supplier = suppliers.FirstOrDefault(s => s.Id.ToString() == r.SupplierCode || s.SupplierCode == r.SupplierCode);
            // The portal links a receipt to its contract by the supplier's tax code: without one it cannot be matched.
            if (string.IsNullOrWhiteSpace(supplier?.TaxCode))
                continue;

            var payload = new BlueContractReceiptPayload
            {
                HisReceiptId = r.Id.ToString(),
                ReceiptNumber = r.ReceiptCode,
                ReceiptDate = r.ReceiptDate.ToString(DateFormat, CultureInfo.InvariantCulture),
                WarehouseCode = r.Warehouse.WarehouseCode,
                BidDecisionNumber = r.BidDecisionNumber,
                SupplierTaxCode = supplier.TaxCode.Trim(),
                SupplierName = r.SupplierName ?? supplier.SupplierName,
                ContractNumber = r.ContractNumber,
                Note = r.Note,
                Lines = r.Details.Where(d => d.Medicine != null).Select(d => new BlueContractReceiptLine
                {
                    HisKey = d.Medicine!.MedicineCode,
                    ItemCode = d.Medicine.MedicineCode,
                    ItemName = d.Medicine.MedicineName,
                    Unit = d.Unit ?? d.Medicine.Unit,
                    LotNumber = d.BatchNumber,
                    ExpiryDate = d.ExpiryDate?.ToString(DateFormat, CultureInfo.InvariantCulture),
                    Quantity = d.Quantity,
                    // HIS keeps the pre-tax price and the line VAT rate; the portal compares VAT-inclusive prices.
                    UnitPrice = Math.Round(d.UnitPrice * (1 + d.Vat / 100), 2),
                    VatRate = d.Vat,
                }).ToList(),
            };
            if (payload.Lines.Count > 0)
                result.Add(payload);
        }

        return result;
    }
}
