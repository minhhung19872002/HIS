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

/// <summary>
/// API Controller đầy đủ cho Phân hệ 6: Phẫu thuật thủ thuật (PTTT)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[TypeFilter(typeof(Filters.DomainExceptionFilter))] // sweep 2026-06-12: lỗi nghiệp vụ → 400 message rõ
public partial class SurgeryCompleteController : ControllerBase
{
    private readonly ISurgeryCompleteService _surgeryService;

    public SurgeryCompleteController(ISurgeryCompleteService surgeryService)
    {
        _surgeryService = surgeryService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? Guid.Empty.ToString());

    #region 6.1 Quản lý PTTT

    /// <summary>
    /// Tạo yêu cầu PTTT
    /// </summary>
    [HttpPost]
    [HttpPost("requests")]
    public async Task<ActionResult<SurgeryDto>> CreateSurgeryRequest([FromBody] CreateSurgeryRequestDto dto)
    {
        var result = await _surgeryService.CreateSurgeryRequestAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Duyệt mổ
    /// </summary>
    [HttpPost("approve")]
    public async Task<ActionResult<SurgeryDto>> ApproveSurgery([FromBody] ApproveSurgeryDto dto)
    {
        var result = await _surgeryService.ApproveSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Từ chối duyệt mổ
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.SurgeryManager + "," + RoleNames.DepartmentHead)]
    public async Task<ActionResult<SurgeryDto>> RejectSurgery(Guid id, [FromBody] RejectRequest request)
    {
        var result = await _surgeryService.RejectSurgeryAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lên lịch mổ
    /// </summary>
    [HttpPost("schedule")]
    public async Task<ActionResult<SurgeryDto>> ScheduleSurgery([FromBody] ScheduleSurgeryDto dto)
    {
        var result = await _surgeryService.ScheduleSurgeryAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch mổ
    /// </summary>
    [HttpGet("schedule")]
    public async Task<ActionResult<List<SurgeryScheduleDto>>> GetSurgerySchedule([FromQuery] DateTime date, [FromQuery] Guid? operatingRoomId)
    {
        var result = await _surgeryService.GetSurgeryScheduleAsync(date, operatingRoomId);
        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận bệnh nhân vào phòng mổ
    /// </summary>
    [HttpPost("check-in")]
    public async Task<ActionResult<SurgeryDto>> CheckInPatient([FromBody] SurgeryCheckInDto dto)
    {
        var result = await _surgeryService.CheckInPatientAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách PTTT
    /// </summary>
    [HttpGet]
    [HttpGet("surgeries")]
    public async Task<ActionResult<PagedResultDto<SurgeryDto>>> GetSurgeries([FromQuery] SurgerySearchDto dto)
    {
        var result = await _surgeryService.GetSurgeriesAsync(dto);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết PTTT
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<SurgeryDto>> GetSurgery(Guid id)
    {
        var result = await _surgeryService.GetSurgeryByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Hủy PTTT
    /// </summary>
    [HttpPost("{id}/cancel")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.SurgeryManager + "," + RoleNames.Doctor)]
    public async Task<ActionResult<bool>> CancelSurgery(Guid id, [FromBody] SurgeryCancelRequest request)
    {
        var result = await _surgeryService.CancelSurgeryAsync(id, request.Reason, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Khai báo tiền công ekip
    /// </summary>
    [HttpPost("{id}/team-fees")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.SurgeryManager)]
    public async Task<ActionResult<SurgeryDto>> SetTeamFees(Guid id, [FromBody] List<SurgeryTeamMemberRequestDto> teamMembers)
    {
        var result = await _surgeryService.SetTeamFeesAsync(id, teamMembers, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Tính công PTTT theo QĐ73
    /// </summary>
    [HttpGet("{id}/fee-calculation")]
    public async Task<ActionResult<SurgeryFeeCalculationDto>> CalculateTeamFees(Guid id)
    {
        var result = await _surgeryService.CalculateTeamFeesAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tính lợi nhuận PTTT
    /// </summary>
    [HttpGet("{id}/profit")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<SurgeryProfitDto>> CalculateProfit(Guid id)
    {
        var result = await _surgeryService.CalculateProfitAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Tính chi phí theo TT37
    /// </summary>
    [HttpGet("{id}/cost-tt37")]
    public async Task<ActionResult<SurgeryCostCalculationDto>> CalculateCostTT37(Guid id, [FromQuery] bool hasTeamChange = false)
    {
        var result = await _surgeryService.CalculateCostTT37Async(id, hasTeamChange);
        return Ok(result);
    }

    /// <summary>
    /// Báo cáo thống kê PTTT
    /// </summary>
    [HttpGet("statistics")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.SurgeryManager + "," + RoleNames.Accountant)]
    public async Task<ActionResult<SurgeryStatisticsDto>> GetStatistics(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] Guid? departmentId)
    {
        var result = await _surgeryService.GetStatisticsAsync(fromDate, toDate, departmentId);
        return Ok(result);
    }

    #endregion

    #region 6.1.1 Gói PTTT & Định mức

    /// <summary>
    /// Lấy danh sách gói PTTT
    /// </summary>
    [HttpGet("packages")]
    public async Task<ActionResult<List<SurgeryPackageDto>>> GetSurgeryPackages([FromQuery] Guid? surgeryServiceId)
    {
        var result = await _surgeryService.GetSurgeryPackagesAsync(surgeryServiceId);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết gói PTTT
    /// </summary>
    [HttpGet("packages/{id}")]
    public async Task<ActionResult<SurgeryPackageDto>> GetSurgeryPackage(Guid id)
    {
        var result = await _surgeryService.GetSurgeryPackageByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>
    /// Tạo/Cập nhật gói PTTT
    /// </summary>
    [HttpPost("packages")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.SurgeryManager)]
    public async Task<ActionResult<SurgeryPackageDto>> SaveSurgeryPackage([FromBody] SurgeryPackageDto dto)
    {
        var result = await _surgeryService.SaveSurgeryPackageAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Xóa gói PTTT
    /// </summary>
    [HttpDelete("packages/{id}")]
    [Authorize(Roles = RoleNames.Admin)]
    public async Task<ActionResult<bool>> DeleteSurgeryPackage(Guid id)
    {
        var result = await _surgeryService.DeleteSurgeryPackageAsync(id, GetUserId());
        return Ok(result);
    }

    #endregion

    #region 6.2 Màn hình chờ phòng mổ

    /// <summary>
    /// Lấy danh sách chờ của phòng mổ
    /// </summary>
    [HttpGet("waiting-list/{roomId}")]
    public async Task<ActionResult<SurgeryWaitingListDto>> GetWaitingList(Guid roomId, [FromQuery] DateTime date)
    {
        var result = await _surgeryService.GetWaitingListAsync(roomId, date);
        return Ok(result);
    }

    /// <summary>
    /// Lấy tất cả danh sách chờ
    /// </summary>
    [HttpGet("waiting-lists")]
    public async Task<ActionResult<List<SurgeryWaitingListDto>>> GetAllWaitingLists([FromQuery] DateTime date)
    {
        var result = await _surgeryService.GetAllWaitingListsAsync(date);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phòng mổ
    /// </summary>
    [HttpGet("operating-rooms")]
    public async Task<ActionResult<List<OperatingRoomDto>>> GetOperatingRooms([FromQuery] int? roomType, [FromQuery] int? status)
    {
        var result = await _surgeryService.GetOperatingRoomsAsync(roomType, status);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái phòng mổ
    /// </summary>
    [HttpPut("operating-rooms/{id}/status")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.SurgeryManager)]
    public async Task<ActionResult<OperatingRoomDto>> UpdateOperatingRoomStatus(Guid id, [FromBody] SurgeryUpdateStatusRequest request)
    {
        var result = await _surgeryService.UpdateOperatingRoomStatusAsync(id, request.Status, GetUserId());
        return Ok(result);
    }

    #endregion
}
