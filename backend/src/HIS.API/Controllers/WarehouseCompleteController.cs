using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using System.Security.Claims;
using WarehouseDto = HIS.Application.DTOs.Warehouse.WarehouseDto;

namespace HIS.API.Controllers;

/// <summary>
/// API Controller đầy đủ cho Phân hệ 5: Kho Dược - Vật tư
/// </summary>
[Authorize]
[ApiController]
[Route("api/warehouse")]
public class WarehouseCompleteController : ControllerBase
{
    private readonly IWarehouseCompleteService _warehouseService;
    private readonly ILogger<WarehouseCompleteController> _logger;

    public WarehouseCompleteController(
        IWarehouseCompleteService warehouseService,
        ILogger<WarehouseCompleteController> logger)
    {
        _warehouseService = warehouseService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    #region 5.1 Nhập kho

    /// <summary>
    /// Tạo phiếu nhập NCC
    /// </summary>
    [HttpPost("receipts/supplier")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockReceiptDto>> CreateSupplierReceipt([FromBody] CreateStockReceiptDto dto)
    {
        var result = await _warehouseService.CreateSupplierReceiptAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu nhập từ nguồn khác
    /// </summary>
    [HttpPost("receipts/other-source")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockReceiptDto>> CreateOtherSourceReceipt([FromBody] CreateStockReceiptDto dto)
    {
        var result = await _warehouseService.CreateOtherSourceReceiptAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu nhập chuyển kho
    /// </summary>
    [HttpPost("receipts/transfer")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockReceiptDto>> CreateTransferReceipt([FromBody] CreateStockReceiptDto dto)
    {
        var result = await _warehouseService.CreateTransferReceiptAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiếu nhập hoàn trả khoa
    /// </summary>
    [HttpPost("receipts/department-return")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockReceiptDto>> CreateDepartmentReturnReceipt([FromBody] CreateStockReceiptDto dto)
    {
        var result = await _warehouseService.CreateDepartmentReturnReceiptAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật phiếu nhập
    /// </summary>
    [HttpPut("receipts/{id}")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockReceiptDto>> UpdateStockReceipt(Guid id, [FromBody] CreateStockReceiptDto dto)
    {
        var result = await _warehouseService.UpdateStockReceiptAsync(id, dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Duyệt phiếu nhập
    /// </summary>
    [HttpPost("receipts/{id}/approve")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<StockReceiptDto>> ApproveStockReceipt(Guid id)
    {
        var result = await _warehouseService.ApproveStockReceiptAsync(id, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hủy phiếu nhập
    /// </summary>
    [HttpPost("receipts/{id}/cancel")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<bool>> CancelStockReceipt(Guid id, [FromBody] string reason)
    {
        var result = await _warehouseService.CancelStockReceiptAsync(id, reason, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu nhập
    /// </summary>
    [HttpGet("receipts")]
    public async Task<ActionResult<PagedResultDto<StockReceiptDto>>> GetStockReceipts([FromQuery] StockReceiptSearchDto searchDto)
    {
        var result = await _warehouseService.GetStockReceiptsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết phiếu nhập
    /// </summary>
    [HttpGet("receipts/{id}")]
    public async Task<ActionResult<StockReceiptDto>> GetStockReceiptById(Guid id)
    {
        var result = await _warehouseService.GetStockReceiptByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Lấy công nợ NCC
    /// </summary>
    [HttpGet("supplier-payables")]
    [Authorize(Roles = "Admin,WarehouseManager,Accountant")]
    public async Task<ActionResult<List<SupplierPayableDto>>> GetSupplierPayables([FromQuery] Guid? supplierId)
    {
        var result = await _warehouseService.GetSupplierPayablesAsync(supplierId);
        return Ok(result);
    }

    /// <summary>
    /// Thanh toán NCC
    /// </summary>
    [HttpPost("supplier-payments")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<ActionResult<SupplierPaymentDto>> CreateSupplierPayment([FromBody] SupplierPaymentDto dto)
    {
        var result = await _warehouseService.CreateSupplierPaymentAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// In phiếu nhập
    /// </summary>
    [HttpGet("receipts/{id}/print")]
    public async Task<ActionResult> PrintStockReceipt(Guid id)
    {
        var pdfBytes = await _warehouseService.PrintStockReceiptAsync(id);
        return File(pdfBytes, "application/pdf", "stock-receipt.pdf");
    }

    /// <summary>
    /// In biên bản kiểm nhập
    /// </summary>
    [HttpGet("receipts/{id}/print-inspection")]
    public async Task<ActionResult> PrintInspectionReport(Guid id)
    {
        var pdfBytes = await _warehouseService.PrintInspectionReportAsync(id);
        return File(pdfBytes, "application/pdf", "inspection-report.pdf");
    }

    #endregion

    #region 5.2 Xuất kho

    /// <summary>
    /// Tự động chọn lô xuất
    /// </summary>
    [HttpGet("auto-select-batches")]
    public async Task<ActionResult<List<StockDto>>> AutoSelectBatches([FromQuery] Guid warehouseId, [FromQuery] Guid itemId, [FromQuery] decimal quantity)
    {
        var result = await _warehouseService.AutoSelectBatchesAsync(warehouseId, itemId, quantity);
        return Ok(result);
    }

    /// <summary>
    /// Xuất đơn thuốc ngoại trú
    /// </summary>
    [HttpPost("issues/dispense-outpatient/{prescriptionId}")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff,Pharmacist")]
    public async Task<ActionResult<StockIssueDto>> DispenseOutpatientPrescription(Guid prescriptionId)
    {
        var result = await _warehouseService.DispenseOutpatientPrescriptionAsync(prescriptionId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xuất phiếu lĩnh nội trú
    /// </summary>
    [HttpPost("issues/dispense-inpatient/{orderSummaryId}")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff,Pharmacist")]
    public async Task<ActionResult<StockIssueDto>> DispenseInpatientOrder(Guid orderSummaryId)
    {
        var result = await _warehouseService.DispenseInpatientOrderAsync(orderSummaryId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xuất khoa/phòng
    /// </summary>
    [HttpPost("issues/department")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockIssueDto>> IssueToDepartment([FromBody] CreateStockIssueDto dto)
    {
        var result = await _warehouseService.IssueToDepartmentAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xuất chuyển kho
    /// </summary>
    [HttpPost("issues/transfer")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockIssueDto>> CreateTransferIssue([FromBody] CreateStockIssueDto dto)
    {
        var result = await _warehouseService.CreateTransferIssueAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xuất trả NCC
    /// </summary>
    [HttpPost("issues/supplier-return")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<StockIssueDto>> CreateSupplierReturn([FromBody] CreateStockIssueDto dto)
    {
        var result = await _warehouseService.CreateSupplierReturnAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xuất hủy
    /// </summary>
    [HttpPost("issues/destruction")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<StockIssueDto>> CreateDestructionIssue([FromBody] CreateStockIssueDto dto)
    {
        var result = await _warehouseService.CreateDestructionIssueAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Bán thuốc nhà thuốc theo đơn
    /// </summary>
    [HttpPost("pharmacy-sales/by-prescription/{prescriptionId}")]
    [Authorize(Roles = "Admin,WarehouseManager,Pharmacist")]
    public async Task<ActionResult<PharmacySaleDto>> CreatePharmacySaleByPrescription(Guid prescriptionId)
    {
        var result = await _warehouseService.CreatePharmacySaleByPrescriptionAsync(prescriptionId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Bán lẻ nhà thuốc
    /// </summary>
    [HttpPost("pharmacy-sales/retail")]
    [Authorize(Roles = "Admin,WarehouseManager,Pharmacist")]
    public async Task<ActionResult<PharmacySaleDto>> CreateRetailSale([FromBody] PharmacySaleDto dto)
    {
        var result = await _warehouseService.CreateRetailSaleAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiếu xuất
    /// </summary>
    [HttpGet("issues")]
    public async Task<ActionResult<PagedResultDto<StockIssueDto>>> GetStockIssues([FromQuery] StockIssueSearchDto searchDto)
    {
        var result = await _warehouseService.GetStockIssuesAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết phiếu xuất
    /// </summary>
    [HttpGet("issues/{id}")]
    public async Task<ActionResult<StockIssueDto>> GetStockIssueById(Guid id)
    {
        var result = await _warehouseService.GetStockIssueByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Lấy đơn thuốc ngoại trú chờ phát
    /// </summary>
    [HttpGet("pending-prescriptions")]
    public async Task<ActionResult<List<DispenseOutpatientDto>>> GetPendingOutpatientPrescriptions([FromQuery] Guid warehouseId, [FromQuery] DateTime date)
    {
        var result = await _warehouseService.GetPendingOutpatientPrescriptionsAsync(warehouseId, date);
        return Ok(result);
    }

    /// <summary>
    /// In hóa đơn bán
    /// </summary>
    [HttpGet("pharmacy-sales/{id}/print")]
    public async Task<ActionResult> PrintSaleInvoice(Guid id)
    {
        var pdfBytes = await _warehouseService.PrintSaleInvoiceAsync(id);
        return File(pdfBytes, "application/pdf", "sale-invoice.pdf");
    }

    /// <summary>
    /// In phiếu xuất
    /// </summary>
    [HttpGet("issues/{id}/print")]
    public async Task<ActionResult> PrintStockIssue(Guid id)
    {
        var pdfBytes = await _warehouseService.PrintStockIssueAsync(id);
        return File(pdfBytes, "application/pdf", "stock-issue.pdf");
    }

    /// <summary>
    /// In phiếu xuất thuốc GN/HT
    /// </summary>
    [HttpGet("issues/{id}/print-narcotic")]
    public async Task<ActionResult> PrintNarcoticIssue(Guid id)
    {
        var pdfBytes = await _warehouseService.PrintNarcoticIssueAsync(id);
        return File(pdfBytes, "application/pdf", "narcotic-issue.pdf");
    }

    #endregion

    #region 5.3 Tồn kho

    /// <summary>
    /// Tạo dự trù
    /// </summary>
    [HttpPost("procurement-requests")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<ProcurementRequestDto>> CreateProcurementRequest([FromBody] CreateProcurementRequestDto dto)
    {
        var result = await _warehouseService.CreateProcurementRequestAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Gợi ý dự trù tự động
    /// </summary>
    [HttpGet("procurement-suggestions/{warehouseId}")]
    public async Task<ActionResult<List<AutoProcurementSuggestionDto>>> GetAutoProcurementSuggestions(Guid warehouseId)
    {
        var result = await _warehouseService.GetAutoProcurementSuggestionsAsync(warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Duyệt dự trù
    /// </summary>
    [HttpPost("procurement-requests/{id}/approve")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<ProcurementRequestDto>> ApproveProcurementRequest(Guid id)
    {
        var result = await _warehouseService.ApproveProcurementRequestAsync(id, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách dự trù
    /// </summary>
    [HttpGet("procurement-requests")]
    public async Task<ActionResult<List<ProcurementRequestDto>>> GetProcurementRequests([FromQuery] Guid? warehouseId, [FromQuery] int? status, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var result = await _warehouseService.GetProcurementRequestsAsync(warehouseId, status, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Quản lý tồn kho
    /// </summary>
    [HttpGet("stock")]
    public async Task<ActionResult<PagedResultDto<StockDto>>> GetStock([FromQuery] StockSearchDto searchDto)
    {
        var result = await _warehouseService.GetStockAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Cảnh báo tồn kho
    /// </summary>
    [HttpGet("stock-warnings/{warehouseId}")]
    public async Task<ActionResult<List<StockDto>>> GetStockWarnings(Guid warehouseId)
    {
        var result = await _warehouseService.GetStockWarningsAsync(warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Thuốc sắp hết hạn
    /// </summary>
    [HttpGet("expiry-warnings")]
    public async Task<ActionResult<List<ExpiryWarningDto>>> GetExpiryWarnings([FromQuery] Guid? warehouseId, [FromQuery] int monthsAhead = 6)
    {
        var result = await _warehouseService.GetExpiryWarningsAsync(warehouseId, monthsAhead);
        return Ok(result);
    }

    /// <summary>
    /// Quản lý lô thuốc
    /// </summary>
    [HttpGet("batches")]
    public async Task<ActionResult<List<BatchInfoDto>>> GetBatchInfo([FromQuery] Guid? warehouseId, [FromQuery] Guid? itemId)
    {
        var result = await _warehouseService.GetBatchInfoAsync(warehouseId, itemId);
        return Ok(result);
    }

    /// <summary>
    /// Đơn thuốc không lĩnh
    /// </summary>
    [HttpGet("unclaimed-prescriptions/{warehouseId}")]
    public async Task<ActionResult<List<UnclaimedPrescriptionDto>>> GetUnclaimedPrescriptions(Guid warehouseId, [FromQuery] int daysOld = 3)
    {
        var result = await _warehouseService.GetUnclaimedPrescriptionsAsync(warehouseId, daysOld);
        return Ok(result);
    }

    /// <summary>
    /// Hủy đơn không lĩnh
    /// </summary>
    [HttpPost("unclaimed-prescriptions/{prescriptionId}/cancel")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<bool>> CancelUnclaimedPrescription(Guid prescriptionId)
    {
        var result = await _warehouseService.CancelUnclaimedPrescriptionAsync(prescriptionId, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tạo kỳ kiểm kê
    /// </summary>
    [HttpPost("stock-takes")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<StockTakeDto>> CreateStockTake([FromBody] CreateStockTakeRequest request)
    {
        var result = await _warehouseService.CreateStockTakeAsync(request.WarehouseId, request.PeriodFrom, request.PeriodTo, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật kết quả kiểm kê
    /// </summary>
    [HttpPut("stock-takes/{id}/results")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<StockTakeDto>> UpdateStockTakeResults(Guid id, [FromBody] List<StockTakeItemDto> items)
    {
        var result = await _warehouseService.UpdateStockTakeResultsAsync(id, items, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hoàn thành kiểm kê
    /// </summary>
    [HttpPost("stock-takes/{id}/complete")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<StockTakeDto>> CompleteStockTake(Guid id)
    {
        var result = await _warehouseService.CompleteStockTakeAsync(id, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Điều chỉnh sau kiểm kê
    /// </summary>
    [HttpPost("stock-takes/{id}/adjust")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<bool>> AdjustStockAfterTake(Guid id)
    {
        var result = await _warehouseService.AdjustStockAfterTakeAsync(id, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// In biên bản kiểm kê
    /// </summary>
    [HttpGet("stock-takes/{id}/print")]
    public async Task<ActionResult> PrintStockTakeReport(Guid id)
    {
        var pdfBytes = await _warehouseService.PrintStockTakeReportAsync(id);
        return File(pdfBytes, "application/pdf", "stock-take-report.pdf");
    }

    /// <summary>
    /// Lấy thẻ kho
    /// </summary>
    [HttpGet("stock-card")]
    public async Task<ActionResult<StockCardDto>> GetStockCard([FromQuery] Guid warehouseId, [FromQuery] Guid itemId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var result = await _warehouseService.GetStockCardAsync(warehouseId, itemId, fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// In thẻ kho
    /// </summary>
    [HttpGet("stock-card/print")]
    public async Task<ActionResult> PrintStockCard([FromQuery] Guid warehouseId, [FromQuery] Guid itemId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var pdfBytes = await _warehouseService.PrintStockCardAsync(warehouseId, itemId, fromDate, toDate);
        return File(pdfBytes, "application/pdf", "stock-card.pdf");
    }

    /// <summary>
    /// Báo cáo nhập xuất tồn
    /// </summary>
    [HttpGet("reports/stock-movement")]
    public async Task<ActionResult<List<StockMovementReportDto>>> GetStockMovementReport([FromQuery] Guid warehouseId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] int? itemType)
    {
        var result = await _warehouseService.GetStockMovementReportAsync(warehouseId, fromDate, toDate, itemType);
        return Ok(result);
    }

    /// <summary>
    /// In báo cáo NXT
    /// </summary>
    [HttpGet("reports/stock-movement/print")]
    public async Task<ActionResult> PrintStockMovementReport([FromQuery] Guid warehouseId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate, [FromQuery] int? itemType)
    {
        var pdfBytes = await _warehouseService.PrintStockMovementReportAsync(warehouseId, fromDate, toDate, itemType);
        return File(pdfBytes, "application/pdf", "stock-movement-report.pdf");
    }

    /// <summary>
    /// Thống kê xuất khoa phòng
    /// </summary>
    [HttpGet("reports/department-usage")]
    public async Task<ActionResult<DepartmentUsageReportDto>> GetDepartmentUsageReport([FromQuery] Guid warehouseId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
    {
        var result = await _warehouseService.GetDepartmentUsageReportAsync(warehouseId, fromDate, toDate);
        return Ok(result);
    }

    #endregion

    #region 5.4 Quản lý

    /// <summary>
    /// Lấy danh sách kho
    /// </summary>
    [HttpGet("warehouses")]
    public async Task<ActionResult<List<WarehouseDto>>> GetWarehouses([FromQuery] int? warehouseType)
    {
        var result = await _warehouseService.GetWarehousesAsync(warehouseType);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết kho
    /// </summary>
    [HttpGet("warehouses/{id}")]
    public async Task<ActionResult<WarehouseDto>> GetWarehouseById(Guid id)
    {
        var result = await _warehouseService.GetWarehouseByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    /// <summary>
    /// Vật tư tái sử dụng
    /// </summary>
    [HttpGet("reusable-supplies")]
    public async Task<ActionResult<List<ReusableSupplyDto>>> GetReusableSupplies([FromQuery] Guid? warehouseId, [FromQuery] int? status)
    {
        var result = await _warehouseService.GetReusableSuppliesAsync(warehouseId, status);
        return Ok(result);
    }

    /// <summary>
    /// Ghi nhận tiệt khuẩn
    /// </summary>
    [HttpPost("reusable-supplies/{id}/sterilize")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<ReusableSupplyDto>> RecordSterilization(Guid id, [FromBody] DateTime sterilizationDate)
    {
        var result = await _warehouseService.RecordSterilizationAsync(id, sterilizationDate, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Hàng ký gửi
    /// </summary>
    [HttpGet("consignment-stock")]
    public async Task<ActionResult<List<ConsignmentStockDto>>> GetConsignmentStock([FromQuery] Guid? warehouseId, [FromQuery] Guid? supplierId)
    {
        var result = await _warehouseService.GetConsignmentStockAsync(warehouseId, supplierId);
        return Ok(result);
    }

    /// <summary>
    /// Thuốc kê theo IU
    /// </summary>
    [HttpGet("iu-medicines")]
    public async Task<ActionResult<List<IUMedicineDto>>> GetIUMedicines([FromQuery] Guid? warehouseId)
    {
        var result = await _warehouseService.GetIUMedicinesAsync(warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Quy đổi IU
    /// </summary>
    [HttpGet("convert-iu")]
    public async Task<ActionResult<decimal>> ConvertIUToBaseUnit([FromQuery] Guid itemId, [FromQuery] decimal iuQuantity)
    {
        var result = await _warehouseService.ConvertIUToBaseUnitAsync(itemId, iuQuantity);
        return Ok(result);
    }

    /// <summary>
    /// Danh sách có thể tách lẻ
    /// </summary>
    [HttpGet("splitable-items/{warehouseId}")]
    public async Task<ActionResult<List<SplitIssueDto>>> GetSplitableItems(Guid warehouseId)
    {
        var result = await _warehouseService.GetSplitableItemsAsync(warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Tách lẻ
    /// </summary>
    [HttpPost("split-package")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<ActionResult<bool>> SplitPackage([FromBody] SplitPackageRequest request)
    {
        var result = await _warehouseService.SplitPackageAsync(request.WarehouseId, request.ItemId, request.PackageQuantity, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cấu hình giá lợi nhuận
    /// </summary>
    [HttpGet("profit-margin-configs/{warehouseId}")]
    public async Task<ActionResult<List<ProfitMarginConfigDto>>> GetProfitMarginConfigs(Guid warehouseId)
    {
        var result = await _warehouseService.GetProfitMarginConfigsAsync(warehouseId);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình giá
    /// </summary>
    [HttpPut("profit-margin-configs")]
    [Authorize(Roles = "Admin,WarehouseManager")]
    public async Task<ActionResult<ProfitMarginConfigDto>> UpdateProfitMarginConfig([FromBody] ProfitMarginConfigDto dto)
    {
        var result = await _warehouseService.UpdateProfitMarginConfigAsync(dto, GetCurrentUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tính giá bán
    /// </summary>
    [HttpGet("calculate-selling-price")]
    public async Task<ActionResult<decimal>> CalculateSellingPrice([FromQuery] Guid warehouseId, [FromQuery] Guid itemId, [FromQuery] decimal costPrice)
    {
        var result = await _warehouseService.CalculateSellingPriceAsync(warehouseId, itemId, costPrice);
        return Ok(result);
    }

    #endregion
}

#region Request DTOs

public class CreateStockTakeRequest
{
    public Guid WarehouseId { get; set; }
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }
}

public class SplitPackageRequest
{
    public Guid WarehouseId { get; set; }
    public Guid ItemId { get; set; }
    public decimal PackageQuantity { get; set; }
}

#endregion
