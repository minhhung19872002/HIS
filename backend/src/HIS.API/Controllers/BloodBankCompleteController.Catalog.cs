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
        /// 10. Đọc mã vạch/QR code túi máu
        /// </summary>
        [HttpPost("blood-bags/scan")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<ScanBloodBagResultDto>> ScanBloodBag([FromBody] ScanBloodBagDto dto)
        {
            var result = await _bloodBankService.ScanBloodBagAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// In mã vạch túi máu
        /// </summary>
        [HttpPost("blood-bags/print-barcodes")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult> PrintBloodBagBarcodes([FromBody] PrintBloodBagBarcodeDto dto)
        {
            var result = await _bloodBankService.PrintBloodBagBarcodesAsync(dto);
            return File(result, "application/pdf", "blood_bag_barcodes.pdf");
        }

        /// <summary>
        /// Tra cứu túi máu theo mã vạch
        /// </summary>
        [HttpGet("blood-bags/by-barcode/{barcode}")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<BloodBagDto>> GetBloodBagByBarcode(string barcode)
        {
            var result = await _bloodBankService.GetBloodBagByBarcodeAsync(barcode);
            return Ok(result);
        }

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
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult<BloodProductTypeDto>> SaveProductType([FromBody] BloodProductTypeDto dto)
        {
            var result = await _bloodBankService.SaveProductTypeAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách nhà cung cấp
        /// </summary>
        [HttpGet("suppliers")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult<List<BloodSupplierDto>>> GetSuppliers([FromQuery] string keyword = null)
        {
            var result = await _bloodBankService.GetSuppliersAsync(keyword);
            return Ok(result);
        }

        /// <summary>
        /// Thêm/Sửa nhà cung cấp
        /// </summary>
        [HttpPost("suppliers")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager)]
        public async Task<ActionResult<BloodSupplierDto>> SaveSupplier([FromBody] BloodSupplierDto dto)
        {
            var result = await _bloodBankService.SaveSupplierAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// Danh sách kết quả Gelcard test
        /// </summary>
        [HttpGet("gelcard-tests")]
        [Authorize(Roles = RoleNames.Admin + "," + RoleNames.BloodBankManager + "," + RoleNames.BloodBankStaff)]
        public async Task<ActionResult> GetGelcardTests(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            // Gelcard results are stored as cross-match results on assigned blood bags
            var from = fromDate ?? DateTime.Today.AddDays(-30);
            var to = toDate ?? DateTime.Today.AddDays(1).AddTicks(-1);
            var orders = await _bloodBankService.GetBloodOrdersAsync(from, to, null, null, null);
            var gelcardResults = orders
                .SelectMany(o => o.Items ?? new List<BloodOrderItemDto>())
                .SelectMany(i => (i.AssignedBags ?? new List<BloodBagAssignmentDto>()))
                .Where(b => !string.IsNullOrEmpty(b.CrossMatchResult))
                .Select(b => new
                {
                    b.BloodBagId,
                    b.BagCode,
                    b.BloodType,
                    b.RhFactor,
                    b.CrossMatchResult,
                    b.CrossMatchDate,
                    b.TransfusionStatus
                })
                .ToList();
            return Ok(gelcardResults);
        }
    }
}
