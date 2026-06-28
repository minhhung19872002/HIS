using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using System.Security.Claims;
using IcdCodeDto = HIS.Application.DTOs.IcdCodeDto;
using ServiceDto = HIS.Application.DTOs.ServiceDto;
using HIS.API.Controllers;

namespace HIS.API.Dtos.SurgeryComplete;

public class SignConsentRequest
{
    public string SignerName { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
}

public class RejectRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SurgeryCancelRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SurgeryUpdateStatusRequest
{
    public int Status { get; set; }
}

public class DiagnosisRequest
{
    public string Diagnosis { get; set; } = string.Empty;
    public string IcdCode { get; set; } = string.Empty;
}

public class ChangeTeamMemberRequest
{
    public Guid OldMemberId { get; set; }
    public SurgeryTeamMemberRequestDto NewMember { get; set; } = new();
    public DateTime ChangeTime { get; set; }
}

