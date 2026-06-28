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
    public partial class BloodBankCompleteController : ControllerBase
    {
        /// <summary>
        /// 7. Danh sách chỉ định máu
        /// </summary>
        [HttpGet("orders")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult<List<BloodOrderDto>>> GetBloodOrders(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] Guid? departmentId = null,
            [FromQuery] Guid? patientId = null,
            [FromQuery] string status = null)
        {
            // If client omits dates, ASP.NET binds DateTime.MinValue which breaks SQL datetime.
            if (fromDate == default)
            {
                fromDate = DateTime.Today.AddDays(-30);
            }

            if (toDate == default)
            {
                toDate = DateTime.Today.AddDays(1).AddTicks(-1);
            }

            var result = await _bloodBankService.GetBloodOrdersAsync(fromDate, toDate, departmentId, patientId, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết chỉ định máu
        /// </summary>
        [HttpGet("orders/{orderId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult<BloodOrderDto>> GetBloodOrder(Guid orderId)
        {
            var result = await _bloodBankService.GetBloodOrderAsync(orderId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo yêu cầu máu (alias)
        /// </summary>
        [HttpPost("requests")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
        public async Task<ActionResult<BloodOrderDto>> CreateBloodRequest([FromBody] CreateBloodOrderDto dto)
        {
            var result = await _bloodBankService.CreateBloodOrderAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Tạo chỉ định máu
        /// </summary>
        [HttpPost("orders")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
        public async Task<ActionResult<BloodOrderDto>> CreateBloodOrder([FromBody] CreateBloodOrderDto dto)
        {
            var result = await _bloodBankService.CreateBloodOrderAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Hủy chỉ định máu
        /// </summary>
        [HttpPost("orders/{orderId}/cancel")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
        public async Task<ActionResult> CancelBloodOrder(Guid orderId, [FromBody] BloodBankCancelRequest request)
        {
            await _bloodBankService.CancelBloodOrderAsync(orderId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Gán túi máu cho bệnh nhân
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/assign")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult> AssignBloodBag(Guid orderItemId, [FromBody] AssignBloodBagRequest request)
        {
            await _bloodBankService.AssignBloodBagToPatientAsync(orderItemId, request.BloodBagId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Hủy gán túi máu
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/unassign")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult> UnassignBloodBag(Guid orderItemId, [FromBody] UnassignBloodBagRequest request)
        {
            await _bloodBankService.UnassignBloodBagAsync(orderItemId, request.BloodBagId, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Ghi nhận kết quả phản ứng chéo
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/cross-match")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult> StartTransfusion(Guid orderItemId, [FromBody] TransfusionRequest request)
        {
            await _bloodBankService.StartTransfusionAsync(orderItemId, request.BloodBagId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Kết thúc truyền máu
        /// </summary>
        [HttpPost("orders/items/{orderItemId}/complete-transfusion")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
        public async Task<ActionResult> RecordTransfusionReaction(
            Guid orderItemId,
            [FromBody] TransfusionReactionRequest request)
        {
            await _bloodBankService.RecordTransfusionReactionAsync(orderItemId, request.BloodBagId, request.Reaction, request.Action);
            return Ok(new { success = true });
        }
    }
}
