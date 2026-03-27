using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;

namespace HIS.API.Controllers;

// ============================================================
// Module 6: SchoolHealthController
// ============================================================

[ApiController]
[Route("api/school-health")]
[Authorize]
public class SchoolHealthController : ControllerBase
{
    private readonly ISchoolHealthService _service;

    public SchoolHealthController(ISchoolHealthService service)
    {
        _service = service;
    }

    /// <summary>
    /// Danh sách hồ sơ y tế trường học (phân trang)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<SchoolHealthPagedResult>> GetRecords([FromQuery] SchoolHealthSearchDto2 filter)
    {
        var result = await _service.GetRecordsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Tạo hồ sơ khám sức khỏe trường học
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SchoolHealthListDto>> Create([FromBody] CreateSchoolHealthDto2 dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật hồ sơ khám sức khỏe trường học
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<SchoolHealthListDto>> Update(Guid id, [FromBody] CreateSchoolHealthDto2 dto)
    {
        try
        {
            var result = await _service.UpdateAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thống kê theo trường học
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<SchoolHealthStatisticsDto2>> GetStatistics([FromQuery] string? schoolName)
    {
        var result = await _service.GetStatisticsBySchoolAsync(schoolName);
        return Ok(result);
    }

    /// <summary>
    /// Danh sách học sinh cần chuyển tuyến
    /// </summary>
    [HttpGet("referrals")]
    public async Task<ActionResult<SchoolHealthPagedResult>> GetReferrals(
        [FromQuery] int pageIndex = 0,
        [FromQuery] int pageSize = 20)
    {
        var result = await _service.GetReferralsAsync(pageIndex, pageSize);
        return Ok(result);
    }
}

// ============================================================
// Module 7: OccupationalHealthController
// ============================================================

[ApiController]
[Route("api/occupational-health")]
[Authorize]
public class OccupationalHealthController : ControllerBase
{
    private readonly IOccupationalHealthService _service;

    public OccupationalHealthController(IOccupationalHealthService service)
    {
        _service = service;
    }

    /// <summary>
    /// Danh sách hồ sơ sức khỏe nghề nghiệp (phân trang)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<OccHealthPagedResult>> GetRecords([FromQuery] OccHealthSearchDto2 filter)
    {
        var result = await _service.GetRecordsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Tạo hồ sơ khám sức khỏe nghề nghiệp
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<OccHealthListDto>> Create([FromBody] CreateOccHealthDto2 dto)
    {
        var result = await _service.CreateAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật hồ sơ khám sức khỏe nghề nghiệp
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<OccHealthListDto>> Update(Guid id, [FromBody] CreateOccHealthDto2 dto)
    {
        try
        {
            var result = await _service.UpdateAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thống kê sức khỏe nghề nghiệp
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<OccHealthStatisticsDto2>> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo bệnh nghề nghiệp
    /// </summary>
    [HttpGet("disease-report")]
    public async Task<ActionResult<List<OccHealthDiseaseReportDto>>> GetDiseaseReport()
    {
        var result = await _service.GetDiseaseReportAsync();
        return Ok(result);
    }
}

// ============================================================
// Module 8: MethadoneController
// ============================================================

[ApiController]
[Route("api/methadone")]
[Authorize]
public class MethadoneController : ControllerBase
{
    private readonly IMethadoneTreatmentService _service;

    public MethadoneController(IMethadoneTreatmentService service)
    {
        _service = service;
    }

    /// <summary>
    /// Danh sách bệnh nhân Methadone (phân trang)
    /// </summary>
    [HttpGet("patients")]
    public async Task<ActionResult<MethadonePagedResult>> GetPatients([FromQuery] MethadoneSearchDto2 filter)
    {
        var result = await _service.GetPatientsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Đăng ký bệnh nhân mới vào chương trình Methadone
    /// </summary>
    [HttpPost("enroll")]
    public async Task<ActionResult<MethadoneDetailDto2>> Enroll([FromBody] CreateMethadoneDto2 dto)
    {
        try
        {
            var result = await _service.EnrollAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Ghi nhận liều Methadone
    /// </summary>
    [HttpPost("dose")]
    public async Task<ActionResult<DoseRecordDto2>> RecordDose([FromBody] CreateDoseRecordDto dto)
    {
        try
        {
            var result = await _service.RecordDoseAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Ghi nhận xét nghiệm nước tiểu
    /// </summary>
    [HttpPost("urine-screening")]
    public async Task<ActionResult<ScreeningDto2>> RecordUrineScreening([FromBody] CreateScreeningDto dto)
    {
        try
        {
            var result = await _service.RecordUrineScreeningAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lịch sử cấp liều của bệnh nhân
    /// </summary>
    [HttpGet("patient/{id}/doses")]
    public async Task<ActionResult<List<DoseRecordDto2>>> GetDoseHistory(Guid id)
    {
        var result = await _service.GetDoseHistoryAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Lịch sử xét nghiệm nước tiểu
    /// </summary>
    [HttpGet("patient/{id}/screenings")]
    public async Task<ActionResult<List<ScreeningDto2>>> GetScreenings(Guid id)
    {
        var result = await _service.GetScreeningsAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái bệnh nhân (Active/Suspended/Completed/Transferred/Dropped)
    /// </summary>
    [HttpPut("patient/{id}/status")]
    public async Task<ActionResult<MethadoneDetailDto2>> UpdateStatus(Guid id, [FromBody] UpdateMethadoneStatusDto dto)
    {
        try
        {
            var result = await _service.UpdateStatusAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Dashboard tổng quan Methadone
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<MethadoneDashboardDto2>> GetDashboard()
    {
        var result = await _service.GetDashboardAsync();
        return Ok(result);
    }
}

// ============================================================
// Module 9: BhxhAuditController
// ============================================================

[ApiController]
[Route("api/bhxh-audit")]
[Authorize]
public class BhxhAuditController : ControllerBase
{
    private readonly IBhxhAuditService _service;

    public BhxhAuditController(IBhxhAuditService service)
    {
        _service = service;
    }

    /// <summary>
    /// Danh sách phiên kiểm tra BHXH (phân trang)
    /// </summary>
    [HttpGet("sessions")]
    public async Task<ActionResult<BhxhAuditPagedResult>> GetSessions([FromQuery] BhxhAuditSearchDto filter)
    {
        var result = await _service.GetSessionsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Tạo phiên kiểm tra mới
    /// </summary>
    [HttpPost("session")]
    public async Task<ActionResult<BhxhAuditDetailDto>> CreateSession([FromBody] CreateAuditSessionDto dto)
    {
        var result = await _service.CreateSessionAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Chạy kiểm tra tự động (so sánh hồ sơ vs XML130)
    /// </summary>
    [HttpPost("session/{id}/run")]
    public async Task<ActionResult<BhxhAuditDetailDto>> RunAudit(Guid id)
    {
        try
        {
            var result = await _service.RunAuditAsync(id);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Danh sách lỗi của phiên kiểm tra
    /// </summary>
    [HttpGet("session/{id}/errors")]
    public async Task<ActionResult<List<AuditErrorDto>>> GetErrors(Guid id)
    {
        var result = await _service.GetErrorsAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Sửa lỗi kiểm tra BHXH
    /// </summary>
    [HttpPut("error/{id}/fix")]
    public async Task<ActionResult<AuditErrorDto>> FixError(Guid id, [FromBody] FixAuditErrorDto dto)
    {
        try
        {
            var result = await _service.FixErrorAsync(id, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Dashboard tổng quan BHXH audit
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<AuditDashboardDto>> GetDashboard()
    {
        var result = await _service.GetDashboardAsync();
        return Ok(result);
    }

    /// <summary>
    /// Xuất báo cáo phiên kiểm tra (CSV)
    /// </summary>
    [HttpGet("session/{id}/export")]
    public async Task<IActionResult> ExportSession(Guid id)
    {
        try
        {
            var bytes = await _service.ExportSessionAsync(id);
            return File(bytes, "text/csv", $"bhxh-audit-{id:N}.csv");
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Thống kê kiểm tra BHXH năm hiện tại
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<BhxhAuditStatisticsDto>> GetStatistics()
    {
        var result = await _service.GetStatisticsAsync();
        return Ok(result);
    }
}
