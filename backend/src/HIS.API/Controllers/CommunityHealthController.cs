using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/community-health")]
[Authorize]
public class CommunityHealthController : ControllerBase
{
    private readonly ICommunityHealthService _communityHealthService;

    public CommunityHealthController(ICommunityHealthService communityHealthService)
    {
        _communityHealthService = communityHealthService;
    }

    // ==================== Households ====================

    [HttpGet("households")]
    public async Task<ActionResult<List<HouseholdListDto>>> SearchHouseholds(
        [FromQuery] string? keyword = null,
        [FromQuery] int? riskLevel = null,
        [FromQuery] string? wardName = null,
        [FromQuery] Guid? assignedTeamId = null,
        [FromQuery] bool? overdueVisitOnly = null)
    {
        var filter = new HouseholdSearchDto
        {
            Keyword = keyword,
            RiskLevel = riskLevel,
            WardName = wardName,
            AssignedTeamId = assignedTeamId,
            OverdueVisitOnly = overdueVisitOnly,
        };
        var result = await _communityHealthService.SearchHouseholdsAsync(filter);
        return Ok(result);
    }

    [HttpGet("households/{id}")]
    public async Task<ActionResult<HouseholdListDto>> GetHouseholdById(Guid id)
    {
        var result = await _communityHealthService.GetHouseholdByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("households")]
    public async Task<ActionResult<HouseholdListDto>> CreateHousehold([FromBody] HouseholdCreateDto dto)
    {
        var result = await _communityHealthService.CreateHouseholdAsync(dto);
        return Ok(result);
    }

    [HttpPut("households/{id}")]
    public async Task<ActionResult<HouseholdListDto>> UpdateHousehold(Guid id, [FromBody] HouseholdUpdateDto dto)
    {
        var result = await _communityHealthService.UpdateHouseholdAsync(id, dto);
        return Ok(result);
    }

    [HttpDelete("households/{id}")]
    public async Task<ActionResult> DeleteHousehold(Guid id)
    {
        await _communityHealthService.DeleteHouseholdAsync(id);
        return NoContent();
    }

    [HttpGet("households/by-risk/{riskLevel}")]
    public async Task<ActionResult<List<HouseholdListDto>>> GetHouseholdsByRisk(int riskLevel)
    {
        var result = await _communityHealthService.GetHouseholdsByRiskAsync(riskLevel);
        return Ok(result);
    }

    [HttpGet("households/overdue-visits")]
    public async Task<ActionResult<List<OverdueVisitDto>>> GetOverdueVisits()
    {
        var result = await _communityHealthService.GetOverdueVisitsAsync();
        return Ok(result);
    }

    // ==================== NCD Screenings ====================

    [HttpGet("ncd-screenings")]
    public async Task<ActionResult<List<NcdScreeningListDto>>> SearchNcdScreenings(
        [FromQuery] string? keyword = null,
        [FromQuery] Guid? patientId = null,
        [FromQuery] string? screeningType = null,
        [FromQuery] int? riskLevel = null,
        [FromQuery] string? fromDate = null,
        [FromQuery] string? toDate = null,
        [FromQuery] bool? referredOnly = null)
    {
        var filter = new NcdScreeningSearchDto
        {
            Keyword = keyword,
            PatientId = patientId,
            ScreeningType = screeningType,
            RiskLevel = riskLevel,
            FromDate = fromDate,
            ToDate = toDate,
            ReferredOnly = referredOnly,
        };
        var result = await _communityHealthService.SearchNcdScreeningsAsync(filter);
        return Ok(result);
    }

    [HttpGet("ncd-screenings/{id}")]
    public async Task<ActionResult<NcdScreeningListDto>> GetNcdScreeningById(Guid id)
    {
        var result = await _communityHealthService.GetNcdScreeningByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("ncd-screenings")]
    public async Task<ActionResult<NcdScreeningListDto>> CreateNcdScreening([FromBody] NcdScreeningCreateDto dto)
    {
        var result = await _communityHealthService.CreateNcdScreeningAsync(dto);
        return Ok(result);
    }

    [HttpPut("ncd-screenings/{id}")]
    public async Task<ActionResult<NcdScreeningListDto>> UpdateNcdScreening(Guid id, [FromBody] NcdScreeningUpdateDto dto)
    {
        var result = await _communityHealthService.UpdateNcdScreeningAsync(id, dto);
        return Ok(result);
    }

    [HttpGet("ncd-screenings/stats")]
    public async Task<ActionResult<NcdStatsDto>> GetNcdStats()
    {
        var result = await _communityHealthService.GetNcdStatsAsync();
        return Ok(result);
    }

    // ==================== Teams ====================

    [HttpGet("teams")]
    public async Task<ActionResult<List<TeamListDto>>> SearchTeams(
        [FromQuery] string? keyword = null,
        [FromQuery] int? status = null,
        [FromQuery] string? assignedWard = null)
    {
        var filter = new TeamSearchDto
        {
            Keyword = keyword,
            Status = status,
            AssignedWard = assignedWard,
        };
        var result = await _communityHealthService.SearchTeamsAsync(filter);
        return Ok(result);
    }

    [HttpGet("teams/{id}")]
    public async Task<ActionResult<TeamListDto>> GetTeamById(Guid id)
    {
        var result = await _communityHealthService.GetTeamByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("teams")]
    public async Task<ActionResult<TeamListDto>> CreateTeam([FromBody] TeamCreateDto dto)
    {
        var result = await _communityHealthService.CreateTeamAsync(dto);
        return Ok(result);
    }

    [HttpPut("teams/{id}")]
    public async Task<ActionResult<TeamListDto>> UpdateTeam(Guid id, [FromBody] TeamUpdateDto dto)
    {
        var result = await _communityHealthService.UpdateTeamAsync(id, dto);
        return Ok(result);
    }

    [HttpDelete("teams/{id}")]
    public async Task<ActionResult> DeleteTeam(Guid id)
    {
        await _communityHealthService.DeleteTeamAsync(id);
        return NoContent();
    }
}
