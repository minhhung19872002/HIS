using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.System;
using HIS.Application.Services;
using HIS.Core.Constants;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of ISystemCompleteService.
/// Covers Modules: 11 (Tai chinh), 13 (Danh muc), 15 (Bao cao Duoc), 16 (HSBA & Thong ke), 17 (Quan tri).
///
/// K2 HOAN TAT 2026-05-30 — converted to partial class, 5 region tach ra 5 file:
/// — M11 Tai chinh (704 dong) → `SystemCompleteService.M11.Finance.cs`
/// — M13 Danh muc (2377 dong) → `SystemCompleteService.M13.Catalogs.cs`
/// — M15 Bao cao Duoc (951 dong) → `SystemCompleteService.M15.PharmacyReports.cs`
/// — M16 HSBA & Thong ke (1135 dong) → `SystemCompleteService.M16.Emr.cs`
/// — M17 Quan tri + 17.12 IT Tickets + 13.19 Chi nhanh (~1861 dong) → `SystemCompleteService.M17.Admin.cs`
/// ZERO runtime change — partial class chia code physical, runtime identical. Build verify du.
/// File goc giu (~105 dong): using + ctor + fields + Private Helpers (SoftDeleteEntity,
/// GetDefaultServiceGroupId, MapMedicineToDto, HashPassword).
/// </summary>
public partial class SystemCompleteService : ISystemCompleteService
{
    private readonly HISDbContext _context;
    private readonly ILogger<SystemCompleteService> _logger;
    private readonly HIS.Application.Services.ISoDService _sodService; // AUTHZ-4 #370 (grant-time SoD, OFF)
    private readonly IHttpContextAccessor _httpCtx;

    public SystemCompleteService(
        HISDbContext context,
        ILogger<SystemCompleteService> logger,
        HIS.Application.Services.ISoDService sodService,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _sodService = sodService;
        _httpCtx = httpContextAccessor;
    }


    // Module 11 → SystemCompleteService.M11.Finance.cs (K2 phien 5)
    // Module 13 → SystemCompleteService.M13.Catalogs.cs (K2 phien 1)
    // Module 15 → SystemCompleteService.M15.PharmacyReports.cs (K2 phien 4)
    // Module 16 → SystemCompleteService.M16.Emr.cs (K2 phien 3)
    // Module 17 + 17.12 + 13.19 → SystemCompleteService.M17.Admin.cs (K2 phien 2)

    #region Private Helper Methods

    /// <summary>
    /// #371 inc-2: ghi PermissionChangeHistory khi role set của user thay đổi.
    /// Phân tích diff old→new, ghi mỗi role grant/revoke thành 1 dòng history.
    /// </summary>
    private async Task RecordRoleChangeHistoryAsync(
        Guid targetUserId,
        IReadOnlySet<Guid> oldRoleIds,
        IReadOnlySet<Guid> newRoleIds)
    {
        try
        {
            var changedBy = _httpCtx.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? _httpCtx.HttpContext?.User?.FindFirst("sub")?.Value
                         ?? "system";
            var now = DateTime.UtcNow;
            var histories = new List<PermissionChangeHistory>();

            foreach (var revokedId in oldRoleIds.Except(newRoleIds))
            {
                histories.Add(new PermissionChangeHistory
                {
                    Id = Guid.NewGuid(),
                    CreatedAt = now,
                    CreatedBy = changedBy,
                    IsDeleted = false,
                    ChangeType = "UserRole",
                    TargetUserId = targetUserId,
                    TargetRoleId = revokedId,
                    Action = "revoke",
                    OldValueJson = JsonSerializer.Serialize(new { RoleId = revokedId }),
                    NewValueJson = null,
                    ChangedBy = changedBy,
                    ChangedAt = now,
                });
            }

            foreach (var grantedId in newRoleIds.Except(oldRoleIds))
            {
                histories.Add(new PermissionChangeHistory
                {
                    Id = Guid.NewGuid(),
                    CreatedAt = now,
                    CreatedBy = changedBy,
                    IsDeleted = false,
                    ChangeType = "UserRole",
                    TargetUserId = targetUserId,
                    TargetRoleId = grantedId,
                    Action = "grant",
                    OldValueJson = null,
                    NewValueJson = JsonSerializer.Serialize(new { RoleId = grantedId }),
                    ChangedBy = changedBy,
                    ChangedAt = now,
                });
            }

            if (histories.Count > 0)
            {
                _context.PermissionChangeHistories.AddRange(histories);
            }
        }
        catch (Exception ex)
        {
            // Never let audit history block the main operation
            _logger.LogWarning(ex, "RecordRoleChangeHistoryAsync failed for user {UserId}", targetUserId);
        }
    }

    private async Task<bool> SoftDeleteEntityAsync<T>(Guid id) where T : BaseEntity
    {
        try
        {
            var entity = await _context.Set<T>().FirstOrDefaultAsync(e => e.Id == id);
            if (entity == null) return false;
            entity.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SoftDeleteEntityAsync<{EntityType}> for Id {Id}", typeof(T).Name, id);
            return false;
        }
    }

    private async Task<Guid> GetDefaultServiceGroupIdAsync()
    {
        try
        {
            var group = await _context.ServiceGroups.FirstOrDefaultAsync(g => g.IsActive);
            return group?.Id ?? Guid.Empty;
        }
        catch
        {
            return Guid.Empty;
        }
    }

    private MedicineCatalogDto MapMedicineToDto(Medicine m)
    {
        return new MedicineCatalogDto
        {
            Id = m.Id,
            Code = m.MedicineCode,
            Name = m.MedicineName,
            EquivalentCode = m.MedicineCodeBYT,
            RegistrationNumber = m.RegistrationNumber,
            ActiveIngredientName = m.ActiveIngredient,
            Concentration = m.Concentration,
            Unit = m.Unit,
            PackageUnit = m.PackageUnit,
            PackageQuantity = m.ConversionRate,
            Manufacturer = m.Manufacturer,
            Country = m.Country,
            Price = m.UnitPrice,
            InsurancePrice = m.InsurancePrice,
            RouteName = m.RouteName,
            IsNarcotic = m.IsNarcotic,
            IsPsychotropic = m.IsPsychotropic,
            IsPrecursor = m.IsPrecursor,
            IsActive = m.IsActive
        };
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    #endregion


}
