using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using System.Security.Claims;
using HIS.API.Controllers;

namespace HIS.API.Dtos.BillingComplete;

public class CreateDepartmentDepositRequest
{
    public Guid DepartmentId { get; set; }
    public List<Guid> DepositIds { get; set; } = new();
}

public class BillingCancelRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class ResendEmailRequest
{
    public string Email { get; set; } = string.Empty;
}

