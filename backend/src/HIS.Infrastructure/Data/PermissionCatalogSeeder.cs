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
    /// <summary>#216/F2: quyền NỀN cấp cho mọi vai trò LIVE (trừ ADMIN vốn đã full catalog).
    /// Đây là những việc bất kỳ nhân viên nào cũng phải làm được, nếu thiếu thì việc siết đường ghi
    /// sẽ chặn nhầm: tra danh mục dùng chung, báo sự cố chất lượng, báo hỏng thiết bị, tự nộp đơn
    /// nghỉ phép, xem trạng thái liên thông.</summary>
    private static readonly string[] Baseline =
    {
        PermissionCatalog.Catalog.Read,
        PermissionCatalog.Quality.Read, PermissionCatalog.Quality.Update,
        PermissionCatalog.Asset.Read, PermissionCatalog.Asset.Request,
        PermissionCatalog.Hr.Read, PermissionCatalog.Hr.SelfService,
        PermissionCatalog.Integration.Read,
    };

    /// <summary>Ma trận Role×Permission baseline cho 8 role LIVE (behavior-preserve với role-gate hiện hành:
    /// CASHIER phát cả English roles Cashier+Accountant nên giữ Billing.Approve/Refund/Void).</summary>
    private static readonly Dictionary<string, string[]> RoleMatrix = new(StringComparer.OrdinalIgnoreCase)
    {
        // ADMIN gán full catalog trong code (dưới) — không liệt kê tay.
        ["DOCTOR"] = new[]
        {
            // #216/F2: bác sĩ làm nội trú, chỉ định CĐHA, khám từ xa, dinh dưỡng, PHCN,
            // khám sức khỏe và các chương trình y tế công cộng. Bác sĩ chỉ định cận lâm sàng thì
            // cũng phải HỦY được chỉ định đó và ghi/duyệt kết quả thăm dò chức năng.
            PermissionCatalog.LabResult.Create, PermissionCatalog.LabResult.Validate,
            PermissionCatalog.Inpatient.Read, PermissionCatalog.Inpatient.Admit,
            PermissionCatalog.Inpatient.Update, PermissionCatalog.Inpatient.Discharge,
            PermissionCatalog.Inpatient.Approve,
            PermissionCatalog.Radiology.Create,
            PermissionCatalog.Reception.Read,
            PermissionCatalog.Telehealth.Read, PermissionCatalog.Telehealth.Update,
            PermissionCatalog.Nutrition.Read, PermissionCatalog.Nutrition.Update,
            PermissionCatalog.Rehab.Read, PermissionCatalog.Rehab.Update,
            PermissionCatalog.Checkup.Read, PermissionCatalog.Checkup.Update,
            PermissionCatalog.PublicHealth.Read, PermissionCatalog.PublicHealth.Update,
            PermissionCatalog.PublicHealth.Submit,
            PermissionCatalog.Integration.Submit,
            PermissionCatalog.Patient.Read,
            PermissionCatalog.MedicalRecord.Read, PermissionCatalog.MedicalRecord.Create,
            PermissionCatalog.MedicalRecord.Update,
            PermissionCatalog.Prescription.Read, PermissionCatalog.Prescription.Create,
            PermissionCatalog.Prescription.Update, PermissionCatalog.Prescription.Cancel,
            PermissionCatalog.LabResult.Read,
            PermissionCatalog.Report.Read,
            // #432: bác sĩ = phẫu thuật + đọc/duyệt CĐHA
            PermissionCatalog.Surgery.Read, PermissionCatalog.Surgery.Create, PermissionCatalog.Surgery.Update,
            PermissionCatalog.Radiology.Read, PermissionCatalog.Radiology.Report, PermissionCatalog.Radiology.Approve,
        },
        ["NURSE"] = new[]
        {
            // #216/F2: điều dưỡng chăm sóc nội trú, ghi suất ăn, tiêm chủng, PHCN, khám sức khỏe,
            // và lấy/gửi bệnh phẩm.
            PermissionCatalog.LabResult.Create,
            PermissionCatalog.Inpatient.Read, PermissionCatalog.Inpatient.Update,
            PermissionCatalog.Reception.Read,
            PermissionCatalog.Nutrition.Read, PermissionCatalog.Nutrition.Update,
            PermissionCatalog.Rehab.Read, PermissionCatalog.Rehab.Update,
            PermissionCatalog.Checkup.Read, PermissionCatalog.Checkup.Update,
            PermissionCatalog.PublicHealth.Read, PermissionCatalog.PublicHealth.Update,
            PermissionCatalog.Telehealth.Read,
            PermissionCatalog.Patient.Read,
            PermissionCatalog.MedicalRecord.Read, PermissionCatalog.MedicalRecord.Update,
            PermissionCatalog.Prescription.Read,
            PermissionCatalog.LabResult.Read,
        },
        ["RECEPTIONIST"] = new[]
        {
            // #216/F2: tiếp đón thu tạm ứng và làm hợp đồng khám sức khỏe.
            PermissionCatalog.Billing.Collect,
            PermissionCatalog.Checkup.Read, PermissionCatalog.Checkup.Update,
            PermissionCatalog.Telehealth.Read,
            PermissionCatalog.Patient.Read, PermissionCatalog.Patient.Create,
            PermissionCatalog.Patient.Update,
            PermissionCatalog.Billing.Read,
            // #432: tiếp đón
            PermissionCatalog.Reception.Read, PermissionCatalog.Reception.Update,
        },
        ["PHARMACIST"] = new[]
        {
            // #216/F2: dược sĩ tra cứu bệnh nhân khi cấp phát và gửi đơn lên hệ thống quốc gia.
            PermissionCatalog.Patient.Read,
            PermissionCatalog.Integration.Submit,
            PermissionCatalog.Pharmacy.Read, PermissionCatalog.Pharmacy.Dispense,
            PermissionCatalog.Pharmacy.Approve, PermissionCatalog.Pharmacy.StockIn,
            PermissionCatalog.Pharmacy.StockOut,
            PermissionCatalog.Prescription.Read, PermissionCatalog.Prescription.Approve,
        },
        ["LAB_TECH"] = new[]
        {
            // #216/F2: KTV xét nghiệm từ chối/thu hồi mẫu — cùng chuỗi với nhập kết quả.
            PermissionCatalog.LabResult.Validate,
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
            // #432: thu ngân = giám định/BHYT back-office
            PermissionCatalog.Insurance.Read, PermissionCatalog.Insurance.Submit, PermissionCatalog.Insurance.Approve,
        },
        ["IMAGING_TECH"] = new[]
        {
            PermissionCatalog.Patient.Read,
            PermissionCatalog.Report.Read,
            // #432: KTV CĐHA = chụp + xem CĐHA
            PermissionCatalog.Radiology.Read, PermissionCatalog.Radiology.Create,
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
                : RoleMatrix.TryGetValue(role.RoleCode, out var m) ? Baseline.Concat(m).Distinct(StringComparer.OrdinalIgnoreCase).ToArray()
                : Array.Empty<string>();

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
