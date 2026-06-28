using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.API.Controllers;

namespace HIS.API.Dtos.EndpointSecurity;

public class ResolveIncidentRequest
{
    public string Resolution { get; set; } = string.Empty;
    public string? RootCause { get; set; }
}

public class FlagSoftwareRequest
{
    public string? Notes { get; set; }
}

