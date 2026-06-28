using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.NonDicom;

    public record CreateStudyDto(
        Guid ServiceRequestDetailId,
        Guid PatientId,
        string DeviceType,
        string? DeviceName,
        Guid? RoomId,
        string? Description);

    public record UpdateStudyDto(string? Description, string? Findings, string? Conclusion, int? Status);

