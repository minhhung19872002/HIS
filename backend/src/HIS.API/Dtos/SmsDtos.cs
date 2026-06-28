using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Infrastructure.Services;
using HIS.API.Controllers;

namespace HIS.API.Dtos.Sms;

public class SendTestSmsDto
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Message { get; set; }
}

