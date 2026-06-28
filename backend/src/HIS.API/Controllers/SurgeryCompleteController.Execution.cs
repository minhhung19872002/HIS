using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using System.Security.Claims;
using IcdCodeDto = HIS.Application.DTOs.IcdCodeDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Dtos.SurgeryComplete;

namespace HIS.API.Controllers;

public partial class SurgeryCompleteController
{
    /// <summary>
    /// Bắt đầu ca mổ
    /// </summary>
    [HttpPost("start")]
    public async Task<ActionResult<SurgeryDto>> StartSurgery([FromBody] StartSurgeryDto dto)
    {
        var result = await _surgeryService.StartSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Kết thúc ca mổ
    /// </summary>
    [HttpPost("complete")]
    public async Task<ActionResult<SurgeryDto>> CompleteSurgery([FromBody] CompleteSurgeryDto dto)
    {
        var result = await _surgeryService.CompleteSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin thực hiện
    /// </summary>
    [HttpPut("{id}/execution")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> UpdateExecutionInfo(Guid id, [FromBody] SurgeryExecutionDto dto)
    {
        dto.SurgeryId = id;
        var result = await _surgeryService.UpdateExecutionInfoAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chẩn đoán trước mổ
    /// </summary>
    [HttpPut("{id}/pre-diagnosis")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> UpdatePreOperativeDiagnosis(Guid id, [FromBody] DiagnosisRequest request)
    {
        var result = await _surgeryService.UpdatePreOperativeDiagnosisAsync(id, request.Diagnosis, request.IcdCode, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật chẩn đoán sau mổ
    /// </summary>
    [HttpPut("{id}/post-diagnosis")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> UpdatePostOperativeDiagnosis(Guid id, [FromBody] DiagnosisRequest request)
    {
        var result = await _surgeryService.UpdatePostOperativeDiagnosisAsync(id, request.Diagnosis, request.IcdCode, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Khai báo thông tin theo TT50
    /// </summary>
    [HttpPut("{id}/tt50-info")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> UpdateTT50Info(Guid id, [FromBody] SurgeryTT50InfoDto dto)
    {
        dto.SurgeryId = id;
        var result = await _surgeryService.UpdateTT50InfoAsync(id, dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật ekip mổ
    /// </summary>
    [HttpPut("{id}/team")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.SurgeryManager)]
    public async Task<ActionResult<SurgeryDto>> UpdateTeamMembers(Guid id, [FromBody] List<SurgeryTeamMemberRequestDto> members)
    {
        var result = await _surgeryService.UpdateTeamMembersAsync(id, members, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Thay đổi thành viên ekip giữa chừng
    /// </summary>
    [HttpPost("{id}/team/change")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Doctor + "," + RoleNames.SurgeryManager)]
    public async Task<ActionResult<SurgeryDto>> ChangeTeamMember(Guid id, [FromBody] ChangeTeamMemberRequest request)
    {
        var result = await _surgeryService.ChangeTeamMemberAsync(id, request.OldMemberId, request.NewMember, request.ChangeTime, GetUserId());
        return Ok(result);
    }
}
