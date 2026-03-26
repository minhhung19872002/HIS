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

    // ====== NangCap17 Module C: Enhanced Pharmacy ======

    // --- Customers ---
    [HttpGet("customers")]
    public async Task<ActionResult<List<PharmacyCustomerListDto>>> GetCustomers(
        [FromQuery] string? keyword = null,
        [FromQuery] int? customerType = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new PharmacyCustomerSearchDto { Keyword = keyword, CustomerType = customerType, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _hospitalPharmacyService.GetCustomersAsync(filter));
    }

    [HttpGet("customers/{id}")]
    public async Task<ActionResult<PharmacyCustomerDetailDto>> GetCustomerById(Guid id)
    {
        var result = await _hospitalPharmacyService.GetCustomerByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("customers")]
    public async Task<ActionResult<PharmacyCustomerDetailDto>> SaveCustomer([FromBody] SavePharmacyCustomerDto dto)
    {
        return Ok(await _hospitalPharmacyService.SaveCustomerAsync(dto));
    }

    [HttpPost("customers/add-points")]
    public async Task<ActionResult<PharmacyPointTransactionDto>> AddPoints([FromBody] AddPointsDto dto)
    {
        return Ok(await _hospitalPharmacyService.AddPointsAsync(dto));
    }

    [HttpPost("customers/redeem-points")]
    public async Task<ActionResult<PharmacyPointTransactionDto>> RedeemPoints([FromBody] RedeemPointsDto dto)
    {
        return Ok(await _hospitalPharmacyService.RedeemPointsAsync(dto));
    }

    // --- Shifts ---
    [HttpGet("shifts")]
    public async Task<ActionResult<List<PharmacyShiftListDto>>> GetShifts(
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] Guid? cashierId = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new PharmacyShiftSearchDto { FromDate = fromDate, ToDate = toDate, CashierId = cashierId, Status = status, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _hospitalPharmacyService.GetShiftsAsync(filter));
    }

    [HttpPost("shifts/open")]
    public async Task<ActionResult<PharmacyShiftListDto>> OpenShift([FromBody] OpenShiftDto dto)
    {
        return Ok(await _hospitalPharmacyService.OpenShiftAsync(dto));
    }

    [HttpPost("shifts/close")]
    public async Task<ActionResult<PharmacyShiftListDto>> CloseShift([FromBody] CloseShiftDto dto)
    {
        return Ok(await _hospitalPharmacyService.CloseShiftAsync(dto));
    }

    [HttpGet("shifts/current")]
    public async Task<ActionResult> GetCurrentShift()
    {
        var result = await _hospitalPharmacyService.GetCurrentShiftAsync();
        if (result == null) return Ok(new { message = "No open shift" });
        return Ok(result);
    }

    // --- GPP Records ---
    [HttpGet("gpp-records")]
    public async Task<ActionResult<List<PharmacyGppRecordListDto>>> GetGppRecords(
        [FromQuery] string? keyword = null,
        [FromQuery] int? recordType = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new PharmacyGppRecordSearchDto { Keyword = keyword, RecordType = recordType, FromDate = fromDate, ToDate = toDate, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _hospitalPharmacyService.GetGppRecordsAsync(filter));
    }

    [HttpPost("gpp-records")]
    public async Task<ActionResult<PharmacyGppRecordListDto>> SaveGppRecord([FromBody] SavePharmacyGppRecordDto dto)
    {
        return Ok(await _hospitalPharmacyService.SaveGppRecordAsync(dto));
    }

    // --- Commissions ---
    [HttpGet("commissions")]
    public async Task<ActionResult<List<PharmacyCommissionListDto>>> GetCommissions(
        [FromQuery] string? keyword = null,
        [FromQuery] int? status = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 50)
    {
        var filter = new PharmacyCommissionSearchDto { Keyword = keyword, Status = status, FromDate = fromDate, ToDate = toDate, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _hospitalPharmacyService.GetCommissionsAsync(filter));
    }

    [HttpPost("commissions")]
    public async Task<ActionResult<PharmacyCommissionListDto>> SaveCommission([FromBody] SavePharmacyCommissionDto dto)
    {
        return Ok(await _hospitalPharmacyService.SaveCommissionAsync(dto));
    }

    [HttpPost("commissions/pay")]
    public async Task<ActionResult> PayCommissions([FromBody] PayCommissionDto dto)
    {
        var success = await _hospitalPharmacyService.PayCommissionsAsync(dto);
        if (!success) return NotFound(new { message = "No pending commissions found" });
        return Ok(new { message = "Commissions paid successfully" });
    }

    // --- Enhanced Dashboard ---
    [HttpGet("enhanced-dashboard")]
    public async Task<ActionResult<PharmacyEnhancedDashboardDto>> GetEnhancedDashboard()
    {
        return Ok(await _hospitalPharmacyService.GetEnhancedDashboardAsync());
    }
}

public class CancelSaleDto
{
    public string Reason { get; set; } = string.Empty;
}
