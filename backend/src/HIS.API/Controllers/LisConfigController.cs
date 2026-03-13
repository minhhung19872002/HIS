using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs.Laboratory;
using HIS.Application.Services;

namespace HIS.API.Controllers;

/// <summary>
/// LIS Configuration Controller
/// Quản lý cấu hình máy xét nghiệm, thông số, khoảng tham chiếu, mapping, Labconnect
/// </summary>
[ApiController]
[Route("api/lis")]
[Authorize]
public class LisConfigController : ControllerBase
{
    private readonly ILisConfigService _service;

    public LisConfigController(ILisConfigService service)
    {
        _service = service;
    }

    #region Analyzers

    /// <summary>
    /// Danh sách máy phân tích
    /// </summary>
    [HttpGet("analyzers")]
    public async Task<IActionResult> GetAnalyzers()
    {
        var result = await _service.GetAnalyzersAsync();
        return Ok(result);
    }

    /// <summary>
    /// Chi tiết máy phân tích
    /// </summary>
    [HttpGet("analyzers/{id}")]
    public async Task<IActionResult> GetAnalyzer(Guid id)
    {
        var result = await _service.GetAnalyzerByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Thêm mới máy phân tích
    /// </summary>
    [HttpPost("analyzers")]
    public async Task<IActionResult> CreateAnalyzer([FromBody] CreateLisAnalyzerDto dto)
    {
        try
        {
            var result = await _service.CreateAnalyzerAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật máy phân tích
    /// </summary>
    [HttpPut("analyzers/{id}")]
    public async Task<IActionResult> UpdateAnalyzer(Guid id, [FromBody] CreateLisAnalyzerDto dto)
    {
        try
        {
            var result = await _service.UpdateAnalyzerAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa máy phân tích (soft delete)
    /// </summary>
    [HttpDelete("analyzers/{id}")]
    public async Task<IActionResult> DeleteAnalyzer(Guid id)
    {
        var result = await _service.DeleteAnalyzerAsync(id);
        if (!result) return NotFound();
        return Ok(new { success = true });
    }

    /// <summary>
    /// Test kết nối máy phân tích
    /// </summary>
    [HttpPost("analyzers/{id}/test-connection")]
    public async Task<IActionResult> TestAnalyzerConnection(Guid id)
    {
        var result = await _service.TestAnalyzerConnectionAsync(id);
        return Ok(result);
    }

    #endregion

    #region Test Parameters

    /// <summary>
    /// Danh sách thông số xét nghiệm
    /// </summary>
    [HttpGet("test-parameters")]
    public async Task<IActionResult> GetTestParameters()
    {
        var result = await _service.GetTestParametersAsync();
        return Ok(result);
    }

    /// <summary>
    /// Thêm mới thông số xét nghiệm
    /// </summary>
    [HttpPost("test-parameters")]
    public async Task<IActionResult> CreateTestParameter([FromBody] CreateLisTestParameterDto dto)
    {
        try
        {
            var result = await _service.CreateTestParameterAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật thông số xét nghiệm
    /// </summary>
    [HttpPut("test-parameters/{id}")]
    public async Task<IActionResult> UpdateTestParameter(Guid id, [FromBody] CreateLisTestParameterDto dto)
    {
        try
        {
            var result = await _service.UpdateTestParameterAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa thông số xét nghiệm (soft delete)
    /// </summary>
    [HttpDelete("test-parameters/{id}")]
    public async Task<IActionResult> DeleteTestParameter(Guid id)
    {
        var result = await _service.DeleteTestParameterAsync(id);
        if (!result) return NotFound();
        return Ok(new { success = true });
    }

    /// <summary>
    /// Import thông số xét nghiệm từ CSV
    /// </summary>
    [HttpPost("test-parameters/import-csv")]
    public async Task<IActionResult> ImportTestParametersCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file CSV" });

        using var stream = file.OpenReadStream();
        var count = await _service.ImportTestParametersCsvAsync(stream);
        return Ok(new { success = true, importedCount = count, message = $"Đã import {count} thông số" });
    }

    #endregion

    #region Reference Ranges

    /// <summary>
    /// Danh sách khoảng tham chiếu
    /// </summary>
    [HttpGet("reference-ranges")]
    public async Task<IActionResult> GetReferenceRanges([FromQuery] Guid? testParameterId = null)
    {
        var result = await _service.GetReferenceRangesAsync(testParameterId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm mới khoảng tham chiếu
    /// </summary>
    [HttpPost("reference-ranges")]
    public async Task<IActionResult> CreateReferenceRange([FromBody] CreateLisReferenceRangeDto dto)
    {
        try
        {
            var result = await _service.CreateReferenceRangeAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật khoảng tham chiếu
    /// </summary>
    [HttpPut("reference-ranges/{id}")]
    public async Task<IActionResult> UpdateReferenceRange(Guid id, [FromBody] CreateLisReferenceRangeDto dto)
    {
        try
        {
            var result = await _service.UpdateReferenceRangeAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa khoảng tham chiếu (soft delete)
    /// </summary>
    [HttpDelete("reference-ranges/{id}")]
    public async Task<IActionResult> DeleteReferenceRange(Guid id)
    {
        var result = await _service.DeleteReferenceRangeAsync(id);
        if (!result) return NotFound();
        return Ok(new { success = true });
    }

    #endregion

    #region Analyzer Mappings

    /// <summary>
    /// Danh sách mapping test máy phân tích
    /// </summary>
    [HttpGet("analyzer-mappings")]
    public async Task<IActionResult> GetAnalyzerMappings([FromQuery] Guid? analyzerId = null)
    {
        var result = await _service.GetAnalyzerMappingsAsync(analyzerId);
        return Ok(result);
    }

    /// <summary>
    /// Thêm mới mapping
    /// </summary>
    [HttpPost("analyzer-mappings")]
    public async Task<IActionResult> CreateAnalyzerMapping([FromBody] CreateLisAnalyzerMappingDto dto)
    {
        try
        {
            var result = await _service.CreateAnalyzerMappingAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật mapping
    /// </summary>
    [HttpPut("analyzer-mappings/{id}")]
    public async Task<IActionResult> UpdateAnalyzerMapping(Guid id, [FromBody] CreateLisAnalyzerMappingDto dto)
    {
        try
        {
            var result = await _service.UpdateAnalyzerMappingAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa mapping (soft delete)
    /// </summary>
    [HttpDelete("analyzer-mappings/{id}")]
    public async Task<IActionResult> DeleteAnalyzerMapping(Guid id)
    {
        var result = await _service.DeleteAnalyzerMappingAsync(id);
        if (!result) return NotFound();
        return Ok(new { success = true });
    }

    /// <summary>
    /// Tự động mapping tất cả test parameters cho máy phân tích
    /// </summary>
    [HttpPost("analyzer-mappings/auto-map/{analyzerId}")]
    public async Task<IActionResult> AutoMapAnalyzer(Guid analyzerId)
    {
        var result = await _service.AutoMapAnalyzerAsync(analyzerId);
        return Ok(result);
    }

    #endregion

    #region Labconnect

    /// <summary>
    /// Trạng thái kết nối Labconnect
    /// </summary>
    [HttpGet("labconnect/status")]
    public async Task<IActionResult> GetLabconnectStatus()
    {
        var result = await _service.GetLabconnectStatusAsync();
        return Ok(result);
    }

    /// <summary>
    /// Đồng bộ Labconnect
    /// </summary>
    [HttpPost("labconnect/sync")]
    public async Task<IActionResult> SyncLabconnect([FromBody] LisLabconnectSyncRequestDto? dto = null)
    {
        var result = await _service.SyncLabconnectAsync(dto?.Direction);
        return Ok(result);
    }

    /// <summary>
    /// Lịch sử đồng bộ Labconnect
    /// </summary>
    [HttpGet("labconnect/history")]
    public async Task<IActionResult> GetLabconnectHistory()
    {
        var result = await _service.GetLabconnectHistoryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Thử lại các lần đồng bộ thất bại
    /// </summary>
    [HttpPost("labconnect/retry-failed")]
    public async Task<IActionResult> RetryFailedSyncs()
    {
        var result = await _service.RetryFailedSyncsAsync();
        return Ok(result);
    }

    #endregion
}
