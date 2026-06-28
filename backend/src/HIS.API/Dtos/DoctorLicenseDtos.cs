using System.Security.Claims;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HIS.API.Controllers;

namespace HIS.API.Dtos.DoctorLicense;

    public record LicenseStatusDto(
        bool HasProfile,
        bool IsValid,
        string Status, // Valid | NoLicense | Inactive | Expired | NoStaffProfile
        string? LicenseNumber,
        DateTime? IssueDate,
        DateTime? ExpiryDate,
        int? DaysUntilExpiry,
        string? Specialty,
        string Message);

