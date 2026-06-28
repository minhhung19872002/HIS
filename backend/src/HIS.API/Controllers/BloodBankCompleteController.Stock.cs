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
        /// 4. Tồn kho tổng hợp
        /// </summary>
        [HttpGet("stock")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodBagDto>> GetBloodBag(Guid bloodBagId)
        {
            var result = await _bloodBankService.GetBloodBagAsync(bloodBagId);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật trạng thái túi máu
        /// </summary>
        [HttpPut("blood-bags/{bloodBagId}/status")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> UpdateBloodBagStatus(Guid bloodBagId, [FromBody] BloodBankUpdateStatusRequest request)
        {
            await _bloodBankService.UpdateBloodBagStatusAsync(bloodBagId, request.Status, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Tồn kho theo nhóm máu (alias)
        /// </summary>
        [HttpGet("by-blood-group")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodStockDto>>> GetByBloodGroup(
            [FromQuery] string bloodType = null,
            [FromQuery] string rhFactor = null)
        {
            var result = await _bloodBankService.GetBloodStockAsync(bloodType, rhFactor, null);
            return Ok(result);
        }

        /// <summary>
        /// Túi máu sắp hết hạn (alias)
        /// </summary>
        [HttpGet("expiring")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodStockDetailDto>>> GetExpiringAlias([FromQuery] int daysUntilExpiry = 7)
        {
            var result = await _bloodBankService.GetExpiringBloodBagsAsync(daysUntilExpiry);
            return Ok(result);
        }

        /// <summary>
        /// Túi máu sắp hết hạn
        /// </summary>
        [HttpGet("stock/expiring")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodStockDetailDto>>> GetExpiringBloodBags([FromQuery] int daysUntilExpiry = 7)
        {
            var result = await _bloodBankService.GetExpiringBloodBagsAsync(daysUntilExpiry);
            return Ok(result);
        }

        /// <summary>
        /// Túi máu đã hết hạn
        /// </summary>
        [HttpGet("stock/expired")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodStockDetailDto>>> GetExpiredBloodBags()
        {
            var result = await _bloodBankService.GetExpiredBloodBagsAsync();
            return Ok(result);
        }

        /// <summary>
        /// Hủy túi máu hết hạn
        /// </summary>
        [HttpPost("blood-bags/destroy")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> DestroyExpiredBloodBags([FromBody] DestroyBloodBagsRequest request)
        {
            await _bloodBankService.DestroyExpiredBloodBagsAsync(request.BloodBagIds, request.Reason);
            return Ok(new { success = true });
        }

        /// <summary>
        /// 5. Danh sách phiếu kiểm kê
        /// </summary>
        [HttpGet("inventories")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodInventoryDto>>> GetInventories(
            [FromQuery] DateTime fromDate,
            [FromQuery] DateTime toDate,
            [FromQuery] string status = null)
        {
            if (fromDate == default) fromDate = DateTime.Today.AddDays(-30);
            if (toDate == default) toDate = DateTime.Today;
            var result = await _bloodBankService.GetInventoriesAsync(fromDate, toDate, status);
            return Ok(result);
        }

        /// <summary>
        /// Chi tiết phiếu kiểm kê
        /// </summary>
        [HttpGet("inventories/{inventoryId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodInventoryDto>> GetInventory(Guid inventoryId)
        {
            var result = await _bloodBankService.GetInventoryAsync(inventoryId);
            return Ok(result);
        }

        /// <summary>
        /// Tạo phiếu kiểm kê
        /// </summary>
        [HttpPost("inventories")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodInventoryDto>> CreateInventory([FromBody] CreateBloodInventoryDto dto)
        {
            var result = await _bloodBankService.CreateInventoryAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Cập nhật phiếu kiểm kê
        /// </summary>
        [HttpPut("inventories/{inventoryId}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> CompleteInventory(Guid inventoryId)
        {
            await _bloodBankService.CompleteInventoryAsync(inventoryId);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Duyệt kiểm kê
        /// </summary>
        [HttpPost("inventories/{inventoryId}/approve")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult> ApproveInventory(Guid inventoryId)
        {
            await _bloodBankService.ApproveInventoryAsync(inventoryId);
            return Ok(new { success = true });
        }
    }
}
