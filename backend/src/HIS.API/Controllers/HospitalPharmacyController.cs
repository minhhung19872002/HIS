using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/hospital-pharmacy")]
[Authorize]
public class HospitalPharmacyController : ControllerBase
{
    private readonly IHospitalPharmacyService _hospitalPharmacyService;

    public HospitalPharmacyController(IHospitalPharmacyService hospitalPharmacyService)
    {
        _hospitalPharmacyService = hospitalPharmacyService;
    }

    [HttpGet("sales")]
    public async Task<ActionResult<List<RetailSaleListDto>>> SearchSales(
        [FromQuery] string? keyword = null,
        [FromQuery] string? status = null,
        [FromQuery] string? paymentMethod = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] Guid? cashierId = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new RetailSaleSearchDto
        {
            Keyword = keyword,
            Status = status,
            PaymentMethod = paymentMethod,
            FromDate = fromDate,
            ToDate = toDate,
            CashierId = cashierId,
            PageIndex = pageIndex,
            PageSize = pageSize,
        };
        var result = await _hospitalPharmacyService.SearchSalesAsync(filter);
        return Ok(result);
    }

    [HttpGet("sales/{id}")]
    public async Task<ActionResult<RetailSaleDetailDto>> GetSaleById(Guid id)
    {
        var result = await _hospitalPharmacyService.GetSaleByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("sales")]
    public async Task<ActionResult<RetailSaleDetailDto>> CreateSale([FromBody] CreateRetailSaleDto dto)
    {
        var result = await _hospitalPharmacyService.CreateSaleAsync(dto);
        return Ok(result);
    }

    [HttpPut("sales/{id}/cancel")]
    public async Task<ActionResult> CancelSale(Guid id, [FromBody] CancelSaleDto dto)
    {
        var success = await _hospitalPharmacyService.CancelSaleAsync(id, dto.Reason);
        if (!success) return NotFound();
        return Ok(new { message = "Sale cancelled successfully" });
    }

    [HttpGet("statistics")]
    public async Task<ActionResult<RetailSaleStatsDto>> GetSalesStatistics()
    {
        var result = await _hospitalPharmacyService.GetSalesStatisticsAsync();
        return Ok(result);
    }

    [HttpGet("medicines")]
    public async Task<ActionResult<List<MedicineForSaleDto>>> SearchMedicines([FromQuery] string? keyword = null)
    {
        var result = await _hospitalPharmacyService.SearchMedicineForSaleAsync(keyword);
        return Ok(result);
    }
}

public class CancelSaleDto
{
    public string Reason { get; set; } = string.Empty;
}
