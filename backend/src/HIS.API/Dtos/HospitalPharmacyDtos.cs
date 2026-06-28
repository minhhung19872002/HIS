using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.API.Controllers;

namespace HIS.API.Dtos.HospitalPharmacy;

public class CancelSaleDto
{
    public string Reason { get; set; } = string.Empty;
}

