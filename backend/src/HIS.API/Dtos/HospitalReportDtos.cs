using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Reporting;
using HIS.Application.Services;
using HIS.Infrastructure.Services;
using System.Text;
using System.Text.Json;
using HIS.API.Controllers;

namespace HIS.API.Dtos.HospitalReport;

/// <summary>Request DTO for sending a report by email.</summary>
public class SendReportEmailDto
{
    /// <summary>Địa chỉ email nhận báo cáo (bắt buộc).</summary>
    public string ToEmail { get; set; } = string.Empty;
    /// <summary>Ngày bắt đầu kỳ báo cáo (ghi đè query param).</summary>
    public DateTime? From { get; set; }
    /// <summary>Ngày kết thúc kỳ báo cáo (ghi đè query param).</summary>
    public DateTime? To { get; set; }
}

