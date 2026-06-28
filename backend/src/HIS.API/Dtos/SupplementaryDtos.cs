using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.API.Filters;
using HIS.API.Controllers;

namespace HIS.API.Dtos.Supplementary;

/// <summary>
/// Request body for rejecting procurement
/// </summary>
public class RejectProcurementRequest
{
    public string? Reason { get; set; }
}

