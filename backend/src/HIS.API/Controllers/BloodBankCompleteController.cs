using System;
using HIS.Core.Constants;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs.BloodBank;
using HIS.API.Dtos.BloodBankComplete;

namespace HIS.API.Controllers
{
    /// <summary>
    /// Complete Blood Bank Controller
    /// Module 9: Quản lý máu, chế phẩm máu - 10 chức năng
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public partial class BloodBankCompleteController : ControllerBase
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodImportReceiptDto>>> GetImportReceipts(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? supplierId = null,
            [FromQuery] string status = null)
        {
            // Client omit date -> ASP.NET binds DateTime.MinValue -> SqlDateTime overflow. Default an toan.
            if (fromDate == default) fromDate = DateTime.Today.AddDays(-30);
            if (toDate == default) toDate = DateTime.Today;
            var result = await _bloodBankService.GetImportReceiptsAsync(fromDate, toDate, supplierId, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết phiếu nhập
        /// </summary>
        [HttpGet("import-receipts/{receiptId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodImportReceiptDto>> GetImportReceipt(Guid receiptId)
        {
            var result = await _bloodBankService.GetImportReceiptAsync(receiptId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiếu nhập máu
        /// </summary>
        [HttpPost("import-receipts")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodImportReceiptDto>> CreateImportReceipt([FromBody] CreateBloodImportDto dto)
        {
            var result = await _bloodBankService.CreateImportReceiptAsync(dto);
            return CreatedAtAction(nameof(GetImportReceipt), new { receiptId = result.Id }, result);
        }

        /// <summary>
        /// Cập nhật phiếu nhập
        /// </summary>
        [HttpPut("import-receipts/{receiptId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> ConfirmImportReceipt(Guid receiptId)
        {
            await _bloodBankService.ConfirmImportReceiptAsync(receiptId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Hủy phiếu nhập
        /// </summary>
        [HttpPost("import-receipts/{receiptId}/cancel")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> CancelImportReceipt(Guid receiptId, [FromBody] BloodBankCancelRequest request)
        {
            await _bloodBankService.CancelImportReceiptAsync(receiptId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 2. In phiếu nhập máu
        /// </summary>
        [HttpGet("import-receipts/{receiptId}/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult<List<BloodIssueRequestDto>>> GetIssueRequests(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] string status = null)
        {
            if (fromDate == default) fromDate = DateTime.Today.AddDays(-30);
            if (toDate == default) toDate = DateTime.Today;
            var result = await _bloodBankService.GetIssueRequestsAsync(fromDate, toDate, departmentId, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết yêu cầu xuất
        /// </summary>
        [HttpGet("issue-requests/{requestId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult<BloodIssueRequestDto>> GetIssueRequest(Guid requestId)
        {
            var result = await _bloodBankService.GetIssueRequestAsync(requestId);
            return Ok(result);
        }

        /// <summary>
        /// 3. Tạo yêu cầu xuất kho
        /// </summary>
        [HttpPost("issue-requests")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff + "," + RoleNames.Doctor)]
        public async Task<ActionResult<BloodIssueRequestDto>> CreateIssueRequest([FromBody] CreateBloodIssueRequestDto dto)
        {
            var result = await _bloodBankService.CreateIssueRequestAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Duyệt yêu cầu xuất
        /// </summary>
        [HttpPost("issue-requests/{requestId}/approve")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> ApproveIssueRequest(Guid requestId)
        {
            await _bloodBankService.ApproveIssueRequestAsync(requestId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Từ chối yêu cầu xuất
        /// </summary>
        [HttpPost("issue-requests/{requestId}/reject")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> RejectIssueRequest(Guid requestId, [FromBody] BloodBankCancelRequest request)
        {
            await _bloodBankService.RejectIssueRequestAsync(requestId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Thực hiện xuất máu
        /// </summary>
        [HttpPost("issue")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodIssueReceiptDto>> IssueBlood([FromBody] IssueBloodDto dto)
        {
            var result = await _bloodBankService.IssueBloodAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách phiếu xuất
        /// </summary>
        [HttpGet("issue-receipts")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodIssueReceiptDto>>> GetIssueReceipts(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null)
        {
            if (fromDate == default) fromDate = DateTime.Today.AddDays(-30);
            if (toDate == default) toDate = DateTime.Today;
            var result = await _bloodBankService.GetIssueReceiptsAsync(fromDate, toDate, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// In phiếu xuất
        /// </summary>
        [HttpGet("issue-receipts/{receiptId}/print")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult> PrintIssueReceipt(Guid receiptId)
        {
            var result = await _bloodBankService.PrintIssueReceiptAsync(receiptId);
            return File(result, "application/pdf", $"blood_issue_{receiptId}.pdf");
        }

        #endregion
    }
}
