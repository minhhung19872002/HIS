using HIS.Core.Entities;
using HIS.Core.Constants;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using HIS.API.Controllers;

namespace HIS.API.Dtos.PharmacyEnhancement;

public class CancelReasonDto
{
    public string? Reason { get; set; }
}

