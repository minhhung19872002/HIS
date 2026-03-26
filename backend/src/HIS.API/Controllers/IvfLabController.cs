using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/ivf-lab")]
[Authorize]
public class IvfLabController : ControllerBase
{
    private readonly IIvfLabService _ivfLabService;

    public IvfLabController(IIvfLabService ivfLabService)
    {
        _ivfLabService = ivfLabService;
    }

    // ---- Couples ----

    [HttpGet("couples")]
    public async Task<ActionResult<List<IvfCoupleDto>>> GetCouples(
        [FromQuery] string? keyword = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 20)
    {
        var filter = new IvfCoupleSearchDto { Keyword = keyword, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _ivfLabService.GetCouplesAsync(filter));
    }

    [HttpGet("couples/{id}")]
    public async Task<ActionResult<IvfCoupleDetailDto>> GetCoupleById(Guid id)
    {
        var result = await _ivfLabService.GetCoupleByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("couples")]
    public async Task<ActionResult<IvfCoupleDto>> SaveCouple([FromBody] SaveIvfCoupleDto dto)
    {
        return Ok(await _ivfLabService.SaveCoupleAsync(dto));
    }

    // ---- Cycles ----

    [HttpGet("cycles")]
    public async Task<ActionResult<List<IvfCycleDto>>> GetCycles([FromQuery] Guid coupleId)
    {
        return Ok(await _ivfLabService.GetCyclesAsync(coupleId));
    }

    [HttpGet("cycles/{id}")]
    public async Task<ActionResult<IvfCycleDetailDto>> GetCycleById(Guid id)
    {
        var result = await _ivfLabService.GetCycleByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("cycles")]
    public async Task<ActionResult<IvfCycleDto>> SaveCycle([FromBody] SaveIvfCycleDto dto)
    {
        return Ok(await _ivfLabService.SaveCycleAsync(dto));
    }

    [HttpPut("cycles/{id}/status")]
    public async Task<ActionResult> UpdateCycleStatus(Guid id, [FromBody] UpdateIvfCycleStatusDto dto)
    {
        var result = await _ivfLabService.UpdateCycleStatusAsync(id, dto.Status);
        return result ? Ok() : NotFound();
    }

    // ---- OvumPickup ----

    [HttpPost("ovum-pickup")]
    public async Task<ActionResult<IvfOvumPickupDto>> SaveOvumPickup([FromBody] SaveIvfOvumPickupDto dto)
    {
        return Ok(await _ivfLabService.SaveOvumPickupAsync(dto));
    }

    [HttpGet("ovum-pickup")]
    public async Task<ActionResult<IvfOvumPickupDto>> GetOvumPickup([FromQuery] Guid cycleId)
    {
        var result = await _ivfLabService.GetOvumPickupAsync(cycleId);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // ---- Embryos ----

    [HttpGet("embryos")]
    public async Task<ActionResult<List<IvfEmbryoDto>>> GetEmbryos([FromQuery] Guid cycleId)
    {
        return Ok(await _ivfLabService.GetEmbryosAsync(cycleId));
    }

    [HttpPost("embryos")]
    public async Task<ActionResult<IvfEmbryoDto>> SaveEmbryo([FromBody] SaveIvfEmbryoDto dto)
    {
        return Ok(await _ivfLabService.SaveEmbryoAsync(dto));
    }

    [HttpPut("embryos/{id}/status")]
    public async Task<ActionResult> UpdateEmbryoStatus(Guid id, [FromBody] UpdateIvfEmbryoStatusDto dto)
    {
        var result = await _ivfLabService.UpdateEmbryoStatusAsync(id, dto.Status);
        return result ? Ok() : NotFound();
    }

    [HttpPut("embryos/{id}/freeze")]
    public async Task<ActionResult> FreezeEmbryo(Guid id, [FromBody] FreezeIvfEmbryoDto dto)
    {
        var result = await _ivfLabService.FreezeEmbryoAsync(id, dto);
        return result ? Ok() : NotFound();
    }

    [HttpPut("embryos/{id}/thaw")]
    public async Task<ActionResult> ThawEmbryo(Guid id, [FromBody] ThawIvfEmbryoDto dto)
    {
        var result = await _ivfLabService.ThawEmbryoAsync(id, dto);
        return result ? Ok() : NotFound();
    }

    // ---- Transfer ----

    [HttpGet("transfers")]
    public async Task<ActionResult<List<IvfTransferDto>>> GetTransfers([FromQuery] Guid cycleId)
    {
        return Ok(await _ivfLabService.GetTransfersAsync(cycleId));
    }

    [HttpPost("transfers")]
    public async Task<ActionResult<IvfTransferDto>> SaveTransfer([FromBody] SaveIvfTransferDto dto)
    {
        return Ok(await _ivfLabService.SaveTransferAsync(dto));
    }

    [HttpPut("transfers/{id}/result")]
    public async Task<ActionResult> UpdateTransferResult(Guid id, [FromBody] UpdateIvfTransferResultDto dto)
    {
        var result = await _ivfLabService.UpdateTransferResultAsync(id, dto.ResultStatus);
        return result ? Ok() : NotFound();
    }

    // ---- SpermBank ----

    [HttpGet("sperm-bank")]
    public async Task<ActionResult<List<IvfSpermSampleDto>>> GetSpermSamples(
        [FromQuery] string? keyword = null,
        [FromQuery] int? status = null,
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 20)
    {
        var filter = new IvfSpermSearchDto { Keyword = keyword, Status = status, PageIndex = pageIndex, PageSize = pageSize };
        return Ok(await _ivfLabService.GetSpermSamplesAsync(filter));
    }

    [HttpPost("sperm-bank")]
    public async Task<ActionResult<IvfSpermSampleDto>> SaveSpermSample([FromBody] SaveIvfSpermSampleDto dto)
    {
        return Ok(await _ivfLabService.SaveSpermSampleAsync(dto));
    }

    [HttpPut("sperm-bank/{id}/status")]
    public async Task<ActionResult> UpdateSpermStatus(Guid id, [FromBody] UpdateIvfSpermStatusDto dto)
    {
        var result = await _ivfLabService.UpdateSpermStatusAsync(id, dto.Status);
        return result ? Ok() : NotFound();
    }

    [HttpGet("sperm-bank/expiring")]
    public async Task<ActionResult<List<IvfSpermSampleDto>>> GetExpiringStorage([FromQuery] int daysAhead = 30)
    {
        return Ok(await _ivfLabService.GetExpiringStorageAsync(daysAhead));
    }

    // ---- Biopsy ----

    [HttpGet("biopsies")]
    public async Task<ActionResult<List<IvfBiopsyDto>>> GetBiopsies(
        [FromQuery] Guid? cycleId = null,
        [FromQuery] Guid? patientId = null)
    {
        return Ok(await _ivfLabService.GetBiopsiesAsync(cycleId, patientId));
    }

    [HttpPost("biopsies")]
    public async Task<ActionResult<IvfBiopsyDto>> SaveBiopsy([FromBody] SaveIvfBiopsyDto dto)
    {
        return Ok(await _ivfLabService.SaveBiopsyAsync(dto));
    }

    // ---- Dashboard & Reports ----

    [HttpGet("dashboard")]
    public async Task<ActionResult<IvfDashboardDto>> GetDashboard()
    {
        return Ok(await _ivfLabService.GetIvfDashboardAsync());
    }

    [HttpGet("daily-report")]
    public async Task<ActionResult<IvfDailyReportDto>> GetDailyReport([FromQuery] string? date = null)
    {
        return Ok(await _ivfLabService.GetDailyReportAsync(date));
    }
}
