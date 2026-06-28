using Microsoft.AspNetCore.Authorization;
using HIS.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.Services;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Insurance;
using HIS.API.Controllers;

namespace HIS.API.Dtos.InsuranceXml;

public class VerifyCardRequest
{
    public string InsuranceNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
}

public class UnlockRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class CreateSettlementBatchRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
}

