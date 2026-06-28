using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.PatientFlag;

    public record PatientFlagDto(
        Guid Id, Guid PatientId, int FlagType, string FlagTypeName,
        string Color, string Note, bool IsActive, DateTime? ExpiresAt,
        DateTime CreatedAt, string? CreatedByName);

    public record SavePatientFlagDto(
        Guid? Id, Guid PatientId, int FlagType, string Color, string Note, DateTime? ExpiresAt);

