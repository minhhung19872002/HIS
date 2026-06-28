using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Interfaces;
using System.Security.Claims;
using HIS.API.Controllers;

namespace HIS.API.Dtos.EmrManagement;

public class ValidateExtractAccessRequestDto
{
    public string AccessCode { get; set; } = string.Empty;
}

public class ReleaseLockRequestDto
{
    public Guid LockId { get; set; }
}

public class ForceReleaseLockRequestDto
{
    public Guid LockId { get; set; }
}

public class ReopenEmrRequestDto
{
    public Guid ExaminationId { get; set; }
    public string? Note { get; set; }
}

