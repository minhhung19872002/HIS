using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.API.Filters;
using HIS.API.Controllers;

namespace HIS.API.Dtos.Auth;

public class ResendOtpRequest
{
    public Guid UserId { get; set; }
}

