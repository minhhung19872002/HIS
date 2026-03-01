using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/culture-stock")]
[Authorize]
public class CultureStockController : ControllerBase
{
    private readonly ICultureStockService _service;

    public CultureStockController(ICultureStockService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetCultureStocks([FromQuery] CultureStockSearchDto? filter)
    {
        var result = await _service.GetCultureStocksAsync(filter);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCultureStockById(Guid id)
    {
        var result = await _service.GetCultureStockByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("{id}/logs")]
    public async Task<IActionResult> GetStockLogs(Guid id)
    {
        var result = await _service.GetStockLogsAsync(id);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCultureStock([FromBody] CreateCultureStockDto dto)
    {
        var result = await _service.CreateCultureStockAsync(dto);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCultureStock(Guid id, [FromBody] UpdateCultureStockDto dto)
    {
        try
        {
            var result = await _service.UpdateCultureStockAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/retrieve")]
    public async Task<IActionResult> RetrieveAliquot(Guid id, [FromBody] RetrieveAliquotDto dto)
    {
        try
        {
            var result = await _service.RetrieveAliquotAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/viability-check")]
    public async Task<IActionResult> RecordViabilityCheck(Guid id, [FromBody] ViabilityCheckDto dto)
    {
        try
        {
            var result = await _service.RecordViabilityCheckAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/subculture")]
    public async Task<IActionResult> Subculture(Guid id, [FromBody] SubcultureDto dto)
    {
        try
        {
            var result = await _service.SubcultureAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DiscardStock(Guid id, [FromQuery] string? reason)
    {
        try
        {
            await _service.DiscardStockAsync(id, reason);
            return Ok(new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync();
        return Ok(result);
    }

    [HttpGet("freezer-codes")]
    public async Task<IActionResult> GetFreezerCodes()
    {
        var result = await _service.GetFreezerCodesAsync();
        return Ok(result);
    }
}
