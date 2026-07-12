using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Core.Constants;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Data;

/// <summary>
/// AUTHZ-1 (#367): upsert PermissionCatalog (code-first) vào bảng Permissions + seed ma trận
/// Role×Permission cho 8 RoleCode LIVE. Chạy MỌI startup, idempotent:
/// - Permission: thêm code thiếu, cập nhật Name/Module/IsSensitive lệch; KHÔNG xóa code cũ
///   (legacy UPPERCASE như SYSTEM.MANAGE giữ nguyên — không phá RolePermissions hiện có).
/// - Matrix: chỉ THÊM link Role→Permission còn thiếu, KHÔNG xóa link thừa (không mất quyền hiện hữu).
/// Default-deny nằm ở handler: user không có permission trong DB → 403 tại endpoint [RequirePermission].
/// </summary>
public static class PermissionCatalogSeeder
{
    /// <summary>Ma trận Role×Permission baseline cho 8 role LIVE (behavior-preserve với role-gate hiện hành:
    /// CASHIER phát cả English roles Cashier+Accountant nên giữ Billing.Approve/Refund/Void).</summary>
    private static readonly Dictionary<string, string[]> RoleMatrix = new(StringComparer.OrdinalIgnoreCase)
    {
        // ADMIN gán full catalog trong code (dưới) — không liệt kê tay.
        ["DOCTOR"] = new[]
        {
            PermissionCatalog.Patient.Read,
            PermissionCatalog.MedicalRecord.Read, PermissionCatalog.MedicalRecord.Create,
            PermissionCatalog.MedicalRecord.Update,
            PermissionCatalog.Prescription.Read, PermissionCatalog.Prescription.Create,
            PermissionCatalog.Prescription.Update, PermissionCatalog.Prescription.Cancel,
            PermissionCatalog.LabResult.Read,
            PermissionCatalog.Report.Read,
        },
        ["NURSE"] = new[]
        {
            PermissionCatalog.Patient.Read,
            PermissionCatalog.MedicalRecord.Read, PermissionCatalog.MedicalRecord.Update,
            PermissionCatalog.Prescription.Read,
            PermissionCatalog.LabResult.Read,
        },
        ["RECEPTIONIST"] = new[]
        {
            PermissionCatalog.Patient.Read, PermissionCatalog.Patient.Create,
            PermissionCatalog.Patient.Update,
            PermissionCatalog.Billing.Read,
        },
        ["PHARMACIST"] = new[]
        {
            PermissionCatalog.Pharmacy.Read, PermissionCatalog.Pharmacy.Dispense,
            PermissionCatalog.Pharmacy.Approve, PermissionCatalog.Pharmacy.StockIn,
            PermissionCatalog.Pharmacy.StockOut,
            PermissionCatalog.Prescription.Read, PermissionCatalog.Prescription.Approve,
        },
        ["LAB_TECH"] = new[]
        {
            PermissionCatalog.LabResult.Read, PermissionCatalog.LabResult.Create,
            PermissionCatalog.Patient.Read,
        },
        ["CASHIER"] = new[]
        {
            PermissionCatalog.Billing.Read, PermissionCatalog.Billing.Collect,
            PermissionCatalog.Billing.Approve, PermissionCatalog.Billing.Refund,
            PermissionCatalog.Billing.Void,
            // Gate cũ records/lock = Admin+Accountant (Accountant sinh từ CASHIER) → preserve quyền tạm khóa
            // hồ sơ phục vụ duyệt viện phí. Unlock vẫn chỉ ADMIN.
            PermissionCatalog.MedicalRecord.Lock,
            PermissionCatalog.Report.Read, PermissionCatalog.Report.Export,
            PermissionCatalog.Patient.Read,
        },
        ["IMAGING_TECH"] = new[]
        {
            PermissionCatalog.Patient.Read,
            PermissionCatalog.Report.Read,
        },
    };

    public static async Task UpsertAsync(HISDbContext context, ILogger? logger)
    {
        var now = DateTime.UtcNow;

        // 1) Upsert catalog vào Permissions (theo PermissionCode).
        // ToListAsync + GroupBy (thay vì ToDictionaryAsync) để không throw ArgumentException
        // khi DB có duplicate PermissionCode (concurrent startup trước khi unique index active).
        var existingList = await context.Permissions
            .Where(p => !p.IsDeleted)
            .ToListAsync();
        var existing = existingList
            .GroupBy(p => p.PermissionCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var added = 0;
        foreach (var def in PermissionCatalog.All)
        {
            if (existing.TryGetValue(def.Code, out var p))
            {
                if (p.PermissionName != def.Name || p.Module != def.Module || p.IsSensitive != def.IsSensitive)
                {
                    p.PermissionName = def.Name; p.Module = def.Module; p.IsSensitive = def.IsSensitive;
                    p.UpdatedAt = now;
                }
            }
            else
            {
                var np = new Permission
                {
                    Id = Guid.NewGuid(),
                    PermissionCode = def.Code,
                    PermissionName = def.Name,
                    Module = def.Module,
                    IsSensitive = def.IsSensitive,
                    CreatedAt = now,
                };
                context.Permissions.Add(np);
                existing[def.Code] = np;
                added++;
            }
        }
        await context.SaveChangesAsync();

        // 2) Seed matrix — chỉ THÊM link thiếu.
        var roles = await context.Roles.Where(r => !r.IsDeleted).ToListAsync();
        var links = await context.RolePermissions.Where(rp => !rp.IsDeleted)
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync();
        var linkSet = links.Select(l => (l.RoleId, l.PermissionId)).ToHashSet();

        var linked = 0;
        foreach (var role in roles)
        {
            // ADMIN = full catalog; role khác theo matrix; role ngoài matrix (custom) → bỏ qua.
            string[] codes = role.RoleCode.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)
                ? PermissionCatalog.All.Select(d => d.Code).ToArray()
                : RoleMatrix.TryGetValue(role.RoleCode, out var m) ? m : Array.Empty<string>();

            foreach (var code in codes)
            {
                if (!existing.TryGetValue(code, out var perm)) continue;
                if (linkSet.Contains((role.Id, perm.Id))) continue;
                context.RolePermissions.Add(new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = role.Id,
                    PermissionId = perm.Id,
                    CreatedAt = now,
                });
                linkSet.Add((role.Id, perm.Id));
                linked++;
            }
        }
        await context.SaveChangesAsync();

        if (added > 0 || linked > 0)
            logger?.LogInformation("PermissionCatalogSeeder: +{Added} permission, +{Linked} role-link", added, linked);
    }
}
