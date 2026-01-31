using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.BloodBank;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Complete Blood Bank Controller
    /// Module 9: Quản lý máu, chế phẩm máu - 10 chức năng
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BloodBankCompleteController : ControllerBase
    {
        private readonly IBloodBankCompleteService _bloodBankService;

        public BloodBankCompleteController(IBloodBankCompleteService bloodBankService)
        {
            _bloodBankService = bloodBankService;
        }

        #region 1-2. Quản lý nhập máu từ nhà cung cấp

        /// <summary>
        /// 1. Danh sách phiếu nhập máu
        /// </summary>
        [HttpGet("import-receipts")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodImportReceiptDto>>> GetImportReceipts(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? supplierId = null,
            [FromQuery] string status = null)
        {
            var result = await _bloodBankService.GetImportReceiptsAsync(fromDate, toDate, supplierId, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết phiếu nhập
        /// </summary>
        [HttpGet("import-receipts/{receiptId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodImportReceiptDto>> GetImportReceipt(Guid receiptId)
        {
            var result = await _bloodBankService.GetImportReceiptAsync(receiptId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiếu nhập máu
        /// </summary>
        [HttpPost("import-receipts")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodImportReceiptDto>> CreateImportReceipt([FromBody] CreateBloodImportDto dto)
        {
            var result = await _bloodBankService.CreateImportReceiptAsync(dto);
            return CreatedAtAction(nameof(GetImportReceipt), new { receiptId = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật phiếu nhập
        /// </summary>
        [HttpPut("import-receipts/{receiptId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodImportReceiptDto>> UpdateImportReceipt(
            Guid receiptId,
            [FromBody] CreateBloodImportDto dto)
        {
            var result = await _bloodBankService.UpdateImportReceiptAsync(receiptId, dto);
            return Ok(result);
        }

        /// <summary>
        /// Xác nhận phiếu nhập
        /// </summary>
        [HttpPost("import-receipts/{receiptId}/confirm")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> ConfirmImportReceipt(Guid receiptId)
        {
            await _bloodBankService.ConfirmImportReceiptAsync(receiptId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Hủy phiếu nhập
        /// </summary>
        [HttpPost("import-receipts/{receiptId}/cancel")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> CancelImportReceipt(Guid receiptId, [FromBody] BloodBankCancelRequest request)
        {
            await _bloodBankService.CancelImportReceiptAsync(receiptId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 2. In phiếu nhập máu
        /// </summary>
        [HttpGet("import-receipts/{receiptId}/print")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult> PrintImportReceipt(Guid receiptId)
        {
            var result = await _bloodBankService.PrintImportReceiptAsync(receiptId);
            return File(result, "application/pdf", $"blood_import_{receiptId}.pdf");
        }

        #endregion

        #region 3. Quản lý yêu cầu xuất kho máu

        /// <summary>
        /// Danh sách yêu cầu xuất
        /// </summary>
        [HttpGet("issue-requests")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff,Doctor,Nurse")]
        public async Task<ActionResult<List<BloodIssueRequestDto>>> GetIssueRequests(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string status = null)
        {
            var result = await _bloodBankService.GetIssueRequestsAsync(fromDate, toDate, departmentId, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết yêu cầu xuất
        /// </summary>
        [HttpGet("issue-requests/{requestId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff,Doctor,Nurse")]
        public async Task<ActionResult<BloodIssueRequestDto>> GetIssueRequest(Guid requestId)
        {
            var result = await _bloodBankService.GetIssueRequestAsync(requestId);
            return Ok(result);
        }

        /// <summary>
        /// 3. Tạo yêu cầu xuất kho
        /// </summary>
        [HttpPost("issue-requests")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff,Doctor")]
        public async Task<ActionResult<BloodIssueRequestDto>> CreateIssueRequest([FromBody] CreateBloodIssueRequestDto dto)
        {
            var result = await _bloodBankService.CreateIssueRequestAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Duyệt yêu cầu xuất
        /// </summary>
        [HttpPost("issue-requests/{requestId}/approve")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> ApproveIssueRequest(Guid requestId)
        {
            await _bloodBankService.ApproveIssueRequestAsync(requestId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Từ chối yêu cầu xuất
        /// </summary>
        [HttpPost("issue-requests/{requestId}/reject")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> RejectIssueRequest(Guid requestId, [FromBody] BloodBankCancelRequest request)
        {
            await _bloodBankService.RejectIssueRequestAsync(requestId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Thực hiện xuất máu
        /// </summary>
        [HttpPost("issue")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodIssueReceiptDto>> IssueBlood([FromBody] IssueBloodDto dto)
        {
            var result = await _bloodBankService.IssueBloodAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách phiếu xuất
        /// </summary>
        [HttpGet("issue-receipts")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodIssueReceiptDto>>> GetIssueReceipts(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.GetIssueReceiptsAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// In phiếu xuất
        /// </summary>
        [HttpGet("issue-receipts/{receiptId}/print")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult> PrintIssueReceipt(Guid receiptId)
        {
            var result = await _bloodBankService.PrintIssueReceiptAsync(receiptId);
            return File(result, "application/pdf", $"blood_issue_{receiptId}.pdf");
        }

        #endregion

        #region 4. Quản lý tồn kho máu

        /// <summary>
        /// 4. Tồn kho tổng hợp
        /// </summary>
        [HttpGet("stock")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodStockDto>>> GetBloodStock(
            [FromQuery] string bloodType = null,
            [FromQuery] string rhFactor = null,
            [FromQuery] Guid? productTypeId = null)
        {
            var result = await _bloodBankService.GetBloodStockAsync(bloodType, rhFactor, productTypeId);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết tồn kho theo túi
        /// </summary>
        [HttpGet("stock/detail")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodStockDetailDto>>> GetBloodStockDetail(
            [FromQuery] string bloodType = null,
            [FromQuery] string rhFactor = null,
            [FromQuery] Guid? productTypeId = null,
            [FromQuery] string status = null)
        {
            var result = await _bloodBankService.GetBloodStockDetailAsync(bloodType, rhFactor, productTypeId, status);
            return Ok(result);
        }

        /// <summary>
        /// Thông tin túi máu
        /// </summary>
        [HttpGet("blood-bags/{bloodBagId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodBagDto>> GetBloodBag(Guid bloodBagId)
        {
            var result = await _bloodBankService.GetBloodBagAsync(bloodBagId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật trạng thái túi máu
        /// </summary>
        [HttpPut("blood-bags/{bloodBagId}/status")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> UpdateBloodBagStatus(Guid bloodBagId, [FromBody] BloodBankUpdateStatusRequest request)
        {
            await _bloodBankService.UpdateBloodBagStatusAsync(bloodBagId, request.Status, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Túi máu sắp hết hạn
        /// </summary>
        [HttpGet("stock/expiring")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodStockDetailDto>>> GetExpiringBloodBags([FromQuery] int daysUntilExpiry = 7)
        {
            var result = await _bloodBankService.GetExpiringBloodBagsAsync(daysUntilExpiry);
            return Ok(result);
        }

        /// <summary>
        /// Túi máu đã hết hạn
        /// </summary>
        [HttpGet("stock/expired")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodStockDetailDto>>> GetExpiredBloodBags()
        {
            var result = await _bloodBankService.GetExpiredBloodBagsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Hủy túi máu hết hạn
        /// </summary>
        [HttpPost("blood-bags/destroy")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> DestroyExpiredBloodBags([FromBody] DestroyBloodBagsRequest request)
        {
            await _bloodBankService.DestroyExpiredBloodBagsAsync(request.BloodBagIds, request.Reason);
            return Ok(new { success = true });
        }

        #endregion

        #region 5. Quản lý hoạt động kiểm kê

        /// <summary>
        /// 5. Danh sách phiếu kiểm kê
        /// </summary>
        [HttpGet("inventories")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodInventoryDto>>> GetInventories(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string status = null)
        {
            var result = await _bloodBankService.GetInventoriesAsync(fromDate, toDate, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết phiếu kiểm kê
        /// </summary>
        [HttpGet("inventories/{inventoryId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodInventoryDto>> GetInventory(Guid inventoryId)
        {
            var result = await _bloodBankService.GetInventoryAsync(inventoryId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiếu kiểm kê
        /// </summary>
        [HttpPost("inventories")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodInventoryDto>> CreateInventory([FromBody] CreateBloodInventoryDto dto)
        {
            var result = await _bloodBankService.CreateInventoryAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật phiếu kiểm kê
        /// </summary>
        [HttpPut("inventories/{inventoryId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodInventoryDto>> UpdateInventory(
            Guid inventoryId,
            [FromBody] CreateBloodInventoryDto dto)
        {
            var result = await _bloodBankService.UpdateInventoryAsync(inventoryId, dto);
            return Ok(result);
        }

        /// <summary>
        /// Hoàn thành kiểm kê
        /// </summary>
        [HttpPost("inventories/{inventoryId}/complete")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> CompleteInventory(Guid inventoryId)
        {
            await _bloodBankService.CompleteInventoryAsync(inventoryId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Duyệt kiểm kê
        /// </summary>
        [HttpPost("inventories/{inventoryId}/approve")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> ApproveInventory(Guid inventoryId)
        {
            await _bloodBankService.ApproveInventoryAsync(inventoryId);
            return Ok(new { success = true });
        }

        #endregion

        #region 6. Hệ thống báo cáo kho máu

        /// <summary>
        /// 6. Thẻ kho máu
        /// </summary>
        [HttpGet("reports/stock-card")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult<BloodStockCardDto>> GetStockCard(
            [FromQuery] string bloodType,
            [FromQuery] string rhFactor,
            [FromQuery] Guid productTypeId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.GetStockCardAsync(bloodType, rhFactor, productTypeId, fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// Báo cáo nhập xuất tồn kho
        /// </summary>
        [HttpGet("reports/inventory")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult<BloodInventoryReportDto>> GetInventoryReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.GetInventoryReportAsync(fromDate, toDate);
            return Ok(result);
        }

        /// <summary>
        /// In phiếu nhập
        /// </summary>
        [HttpGet("reports/import/print")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> PrintImportReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? supplierId = null)
        {
            var result = await _bloodBankService.PrintImportReportAsync(fromDate, toDate, supplierId);
            return File(result, "application/pdf", "blood_import_report.pdf");
        }

        /// <summary>
        /// In phiếu xuất
        /// </summary>
        [HttpGet("reports/export/print")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> PrintExportReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.PrintExportReportAsync(fromDate, toDate, departmentId);
            return File(result, "application/pdf", "blood_export_report.pdf");
        }

        /// <summary>
        /// In biên bản kiểm kê
        /// </summary>
        [HttpGet("inventories/{inventoryId}/print")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> PrintInventoryReport(Guid inventoryId)
        {
            var result = await _bloodBankService.PrintInventoryReportAsync(inventoryId);
            return File(result, "application/pdf", $"blood_inventory_{inventoryId}.pdf");
        }

        /// <summary>
        /// In báo cáo nhập xuất tồn
        /// </summary>
        [HttpGet("reports/stock/print")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> PrintStockReport(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.PrintStockReportAsync(fromDate, toDate);
            return File(result, "application/pdf", "blood_stock_report.pdf");
        }

        #endregion

        #region 7. Chỉ định máu, chế phẩm máu

        /// <summary>
        /// 7. Danh sách chỉ định máu
        /// </summary>
        [HttpGet("orders")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff,Doctor,Nurse")]
        public async Task<ActionResult<List<BloodOrderDto>>> GetBloodOrders(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? patientId = null,
            [FromQuery] string status = null)
        {
            var result = await _bloodBankService.GetBloodOrdersAsync(fromDate, toDate, departmentId, patientId, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết chỉ định máu
        /// </summary>
        [HttpGet("orders/{orderId}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff,Doctor,Nurse")]
        public async Task<ActionResult<BloodOrderDto>> GetBloodOrder(Guid orderId)
        {
            var result = await _bloodBankService.GetBloodOrderAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo chỉ định máu
        /// </summary>
        [HttpPost("orders")]
        [Authorize(Roles = "Admin,Doctor")]
        public async Task<ActionResult<BloodOrderDto>> CreateBloodOrder([FromBody] CreateBloodOrderDto dto)
        {
            var result = await _bloodBankService.CreateBloodOrderAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Hủy chỉ định máu
        /// </summary>
        [HttpPost("orders/{orderId}/cancel")]
        [Authorize(Roles = "Admin,Doctor")]
        public async Task<ActionResult> CancelBloodOrder(Guid orderId, [FromBody] BloodBankCancelRequest request)
        {
            await _bloodBankService.CancelBloodOrderAsync(orderId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Gán túi máu cho bệnh nhân
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/assign")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult> AssignBloodBag(Guid orderItemId, [FromBody] AssignBloodBagRequest request)
        {
            await _bloodBankService.AssignBloodBagToPatientAsync(orderItemId, request.BloodBagId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Hủy gán túi máu
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/unassign")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult> UnassignBloodBag(Guid orderItemId, [FromBody] UnassignBloodBagRequest request)
        {
            await _bloodBankService.UnassignBloodBagAsync(orderItemId, request.BloodBagId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Ghi nhận kết quả phản ứng chéo
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/cross-match")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult> RecordCrossMatchResult(
            Guid orderItemId,
            [FromBody] CrossMatchResultRequest request)
        {
            await _bloodBankService.RecordCrossMatchResultAsync(orderItemId, request.BloodBagId, request.Result, request.Note);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Bắt đầu truyền máu
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/start-transfusion")]
        [Authorize(Roles = "Admin,Doctor,Nurse")]
        public async Task<ActionResult> StartTransfusion(Guid orderItemId, [FromBody] TransfusionRequest request)
        {
            await _bloodBankService.StartTransfusionAsync(orderItemId, request.BloodBagId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Kết thúc truyền máu
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/complete-transfusion")]
        [Authorize(Roles = "Admin,Doctor,Nurse")]
        public async Task<ActionResult> CompleteTransfusion(
            Guid orderItemId,
            [FromBody] CompleteTransfusionRequest request)
        {
            await _bloodBankService.CompleteTransfusionAsync(orderItemId, request.BloodBagId, request.Note);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Ghi nhận phản ứng truyền máu
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/reaction")]
        [Authorize(Roles = "Admin,Doctor,Nurse")]
        public async Task<ActionResult> RecordTransfusionReaction(
            Guid orderItemId,
            [FromBody] TransfusionReactionRequest request)
        {
            await _bloodBankService.RecordTransfusionReactionAsync(orderItemId, request.BloodBagId, request.Reaction, request.Action);
            return Ok(new { success = true });
        }

        #endregion

        #region 8-9. In phiếu lĩnh máu

        /// <summary>
        /// 8. In phiếu lĩnh máu tổng hợp
        /// </summary>
        [HttpGet("reports/issue-summary/print")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult> PrintBloodIssueSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.PrintBloodIssueSummaryAsync(fromDate, toDate, departmentId);
            return File(result, "application/pdf", "blood_issue_summary.pdf");
        }

        /// <summary>
        /// Báo cáo phiếu lĩnh máu tổng hợp
        /// </summary>
        [HttpGet("reports/issue-summary")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult<BloodIssueSummaryDto>> GetBloodIssueSummary(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            var result = await _bloodBankService.GetBloodIssueSummaryAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 9. In phiếu lĩnh máu theo bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/blood-issue/print")]
        [Authorize(Roles = "Admin,BloodBankManager,Doctor,Nurse")]
        public async Task<ActionResult> PrintBloodIssueByPatient(
            Guid patientId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.PrintBloodIssueByPatientAsync(patientId, fromDate, toDate);
            return File(result, "application/pdf", $"blood_issue_patient_{patientId}.pdf");
        }

        /// <summary>
        /// Báo cáo máu theo bệnh nhân
        /// </summary>
        [HttpGet("patients/{patientId}/blood-issue")]
        [Authorize(Roles = "Admin,BloodBankManager,Doctor,Nurse")]
        public async Task<ActionResult<BloodIssueByPatientDto>> GetBloodIssueByPatient(
            Guid patientId,
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate)
        {
            var result = await _bloodBankService.GetBloodIssueByPatientAsync(patientId, fromDate, toDate);
            return Ok(result);
        }

        #endregion

        #region 10. Kết nối thiết bị QRcode, Barcode

        /// <summary>
        /// 10. Đọc mã vạch/QR code túi máu
        /// </summary>
        [HttpPost("blood-bags/scan")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<ScanBloodBagResultDto>> ScanBloodBag([FromBody] ScanBloodBagDto dto)
        {
            var result = await _bloodBankService.ScanBloodBagAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// In mã vạch túi máu
        /// </summary>
        [HttpPost("blood-bags/print-barcodes")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult> PrintBloodBagBarcodes([FromBody] PrintBloodBagBarcodeDto dto)
        {
            var result = await _bloodBankService.PrintBloodBagBarcodesAsync(dto);
            return File(result, "application/pdf", "blood_bag_barcodes.pdf");
        }

        /// <summary>
        /// Tra cứu túi máu theo mã vạch
        /// </summary>
        [HttpGet("blood-bags/by-barcode/{barcode}")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<BloodBagDto>> GetBloodBagByBarcode(string barcode)
        {
            var result = await _bloodBankService.GetBloodBagByBarcodeAsync(barcode);
            return Ok(result);
        }

        #endregion

        #region Danh mục

        /// <summary>
        /// Danh sách loại chế phẩm máu
        /// </summary>
        [HttpGet("product-types")]
        public async Task<ActionResult<List<BloodProductTypeDto>>> GetProductTypes()
        {
            var result = await _bloodBankService.GetProductTypesAsync();
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa loại chế phẩm
        /// </summary>
        [HttpPost("product-types")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult<BloodProductTypeDto>> SaveProductType([FromBody] BloodProductTypeDto dto)
        {
            var result = await _bloodBankService.SaveProductTypeAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách nhà cung cấp
        /// </summary>
        [HttpGet("suppliers")]
        [Authorize(Roles = "Admin,BloodBankManager,BloodBankStaff")]
        public async Task<ActionResult<List<BloodSupplierDto>>> GetSuppliers([FromQuery] string keyword = null)
        {
            var result = await _bloodBankService.GetSuppliersAsync(keyword);
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa nhà cung cấp
        /// </summary>
        [HttpPost("suppliers")]
        [Authorize(Roles = "Admin,BloodBankManager")]
        public async Task<ActionResult<BloodSupplierDto>> SaveSupplier([FromBody] BloodSupplierDto dto)
        {
            var result = await _bloodBankService.SaveSupplierAsync(dto);
            return Ok(result);
        }

        #endregion
    }

    #region Request DTOs

    public class BloodBankCancelRequest
    {
        public string Reason { get; set; }
    }

    public class BloodBankUpdateStatusRequest
    {
        public string Status { get; set; }
        public string Reason { get; set; }
    }

    public class DestroyBloodBagsRequest
    {
        public List<Guid> BloodBagIds { get; set; }
        public string Reason { get; set; }
    }

    public class AssignBloodBagRequest
    {
        public Guid BloodBagId { get; set; }
    }

    public class UnassignBloodBagRequest
    {
        public Guid BloodBagId { get; set; }
        public string Reason { get; set; }
    }

    public class CrossMatchResultRequest
    {
        public Guid BloodBagId { get; set; }
        public string Result { get; set; }
        public string Note { get; set; }
    }

    public class TransfusionRequest
    {
        public Guid BloodBagId { get; set; }
    }

    public class CompleteTransfusionRequest
    {
        public Guid BloodBagId { get; set; }
        public string Note { get; set; }
    }

    public class TransfusionReactionRequest
    {
        public Guid BloodBagId { get; set; }
        public string Reaction { get; set; }
        public string Action { get; set; }
    }

    #endregion
}
