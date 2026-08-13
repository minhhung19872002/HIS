using System.Security.Claims;
using HIS.API.Filters;
using HIS.Application.DTOs.NangCap27;
using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.API.Controllers;

// ============================================================
// NangCap27 G1 — Phiếu vận chuyển người bệnh
// Route đặt riêng 'transport-slips' để không đụng danh mục 'transport-services'
// đã có ở MasterCatalogController.
// ============================================================
[ApiController]
[Route("api/transport-slips")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class PatientTransportSlipController : ControllerBase
{
    private readonly IPatientTransportSlipService _service;

    public PatientTransportSlipController(IPatientTransportSlipService service) => _service = service;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    private string? GetUserIdString()
    {
        var id = GetUserId();
        return id == Guid.Empty ? null : id.ToString();
    }

    [HttpGet]
    public async Task<ActionResult<List<PatientTransportSlipDto>>> GetSlips([FromQuery] TransportSlipFilterDto filter)
        => Ok(await _service.GetSlipsAsync(filter));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PatientTransportSlipDto>> GetSlip(Guid id)
    {
        var result = await _service.GetSlipAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<PatientTransportSlipDto>> SaveSlip([FromBody] SaveTransportSlipDto dto)
        => Ok(await _service.SaveSlipAsync(dto, GetUserIdString()));

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<PatientTransportSlipDto>> ApproveSlip(Guid id)
        => Ok(await _service.ApproveSlipAsync(id, GetUserId()));

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<PatientTransportSlipDto>> CompleteSlip(Guid id)
        => Ok(await _service.CompleteSlipAsync(id, GetUserIdString()));

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<PatientTransportSlipDto>> CancelSlip(Guid id, [FromBody] CancelTransportSlipDto dto)
        => Ok(await _service.CancelSlipAsync(id, dto?.Reason, GetUserIdString()));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSlip(Guid id)
        => await _service.DeleteSlipAsync(id, GetUserIdString()) ? NoContent() : NotFound();
}

// ============================================================
// NangCap27 G8 — KSK theo đoàn: danh mục công ty + hợp đồng
// ============================================================
[ApiController]
[Route("api/checkup-contracts")]
[Authorize]
[TypeFilter(typeof(DomainExceptionFilter))]
public class CheckupContractController : ControllerBase
{
    private readonly ICheckupContractService _service;

    public CheckupContractController(ICheckupContractService service) => _service = service;

    private string? GetUserIdString() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) && id != Guid.Empty
            ? id.ToString()
            : null;

    [HttpGet("companies")]
    public async Task<ActionResult<List<CheckupCompanyDto>>> GetCompanies(
        [FromQuery] string? keyword, [FromQuery] bool? isActive)
        => Ok(await _service.GetCompaniesAsync(keyword, isActive));

    [HttpPost("companies")]
    public async Task<ActionResult<CheckupCompanyDto>> SaveCompany([FromBody] CheckupCompanyDto dto)
        => Ok(await _service.SaveCompanyAsync(dto, GetUserIdString()));

    [HttpDelete("companies/{id:guid}")]
    public async Task<IActionResult> DeleteCompany(Guid id)
        => await _service.DeleteCompanyAsync(id, GetUserIdString()) ? NoContent() : NotFound();

    [HttpGet]
    public async Task<ActionResult<List<CheckupContractDto>>> GetContracts([FromQuery] CheckupContractFilterDto filter)
        => Ok(await _service.GetContractsAsync(filter));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CheckupContractDto>> GetContract(Guid id)
    {
        var result = await _service.GetContractAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CheckupContractDto>> SaveContract([FromBody] SaveCheckupContractDto dto)
        => Ok(await _service.SaveContractAsync(dto, GetUserIdString()));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteContract(Guid id)
        => await _service.DeleteContractAsync(id, GetUserIdString()) ? NoContent() : NotFound();
}
