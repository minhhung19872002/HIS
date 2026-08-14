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
    /// Lưu dữ liệu biểu đồ gây mê
    /// </summary>
    [HttpPost("anesthesia-chart")]
    public async Task<ActionResult<bool>> SaveAnesthesiaChart([FromBody] HIS.Application.DTOs.NangCap18.SaveAnesthesiaChartDto dto)
    {
        var result = await _surgeryService.SaveAnesthesiaChartAsync(dto, GetUserId());
        return Ok(result);
    }

    /// <summary>
    /// Lấy dữ liệu biểu đồ gây mê
    /// </summary>
    [HttpGet("{surgeryId}/anesthesia-chart")]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.AnesthesiaChartDto>> GetAnesthesiaChart(Guid surgeryId)
    {
        var result = await _surgeryService.GetAnesthesiaChartAsync(surgeryId);
        return Ok(result);
    }

    /// <summary>
    /// Tính lợi nhuận phẫu thuật
    /// </summary>
    // The main surgery controller already owns GET {id}/profit with the DTO
    // consumed by the UI. Keep this NangCap18 breakdown on a distinct route;
    // duplicate route templates previously caused AmbiguousMatchException.
    [HttpGet("{surgeryId}/profit-breakdown")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.Accountant)]
    public async Task<ActionResult<HIS.Application.DTOs.NangCap18.SurgeryProfitDto>> CalculateSurgeryProfit(Guid surgeryId)
    {
        var result = await _surgeryService.CalculateSurgeryProfitAsync(surgeryId);
        return Ok(result);
    }
}
