using System.Reflection;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Chuyển MỌI dữ liệu đang trỏ tới một bệnh nhân sang bệnh nhân khác — phần lõi của ghép hồ sơ trùng.
///
/// <para>Trước đây ghép hồ sơ chỉ chuyển <c>MedicalRecords</c>. Nhưng 91 khoá ngoại trỏ thẳng tới
/// <c>Patient</c> (lịch hẹn, vé xếp hàng, nhập viện, phiếu CĐHA, thăm dò chức năng, hoá đơn, thẻ BHYT,
/// dị ứng…) bị bỏ lại trên hồ sơ bị xoá: ghép một hồ sơ trùng CÓ dữ liệu là dữ liệu đó biến khỏi hồ sơ
/// giữ lại — bác sĩ mở hồ sơ không thấy dị ứng, không thấy đợt nằm viện cũ.</para>
///
/// <para>Danh sách bảng lấy từ EF model lúc chạy chứ không liệt kê tay: thêm bảng mới có khoá ngoại tới
/// bệnh nhân là tự được chuyển, không có chỗ nào để quên.</para>
///
/// <para>Chỉ đánh dấu thay đổi trên change tracker; người gọi tự <c>SaveChanges</c> một lần để toàn bộ
/// việc ghép là một giao dịch.</para>
/// </summary>
public static class PatientReferenceReassigner
{
    /// <summary>
    /// Cột trỏ tới bệnh nhân nhưng model không khai báo khoá ngoại (vd. <c>AnesthesiaRecord.PatientId</c>,
    /// <c>FamilyMember.LinkedPatientId</c>). Cố ý KHÔNG gồm <c>HivPatientId</c>/<c>MethadonePatientId</c>:
    /// hai cột đó trỏ sang bảng hồ sơ chuyên đề, không phải <c>Patient</c>.
    /// </summary>
    private static readonly HashSet<string> UnmappedPatientColumns = new(StringComparer.Ordinal)
    {
        "PatientId",
        "LinkedPatientId",
    };

    private static readonly MethodInfo ReassignGuidMethod = typeof(PatientReferenceReassigner)
        .GetMethod(nameof(ReassignGuidAsync), BindingFlags.NonPublic | BindingFlags.Static)!;

    private static readonly MethodInfo ReassignNullableGuidMethod = typeof(PatientReferenceReassigner)
        .GetMethod(nameof(ReassignNullableGuidAsync), BindingFlags.NonPublic | BindingFlags.Static)!;

    /// <summary>Mọi (bảng, cột) đang trỏ tới bệnh nhân, theo model hiện hành.</summary>
    public static IReadOnlyList<(IEntityType Entity, IProperty Property)> PatientReferences(IModel model)
    {
        var patient = model.FindEntityType(typeof(Patient))
            ?? throw new InvalidOperationException("Model không có thực thể Patient.");

        var result = new List<(IEntityType, IProperty)>();
        foreach (var entity in model.GetEntityTypes())
        {
            // Set<T>() không dùng được cho thực thể owned / keyless / dùng chung CLR type.
            if (entity == patient || entity.IsOwned() || entity.FindPrimaryKey() == null || entity.HasSharedClrType)
                continue;
            // Map vào view (không có bảng) thì chỉ đọc — dữ liệu gốc nằm ở bảng khác đã được duyệt.
            if (entity.GetTableName() == null)
                continue;

            var properties = new HashSet<IProperty>();

            foreach (var fk in entity.GetDeclaredForeignKeys().Where(f => f.PrincipalEntityType == patient))
                foreach (var p in fk.Properties) properties.Add(p);

            foreach (var p in entity.GetDeclaredProperties())
            {
                if (UnmappedPatientColumns.Contains(p.Name)
                    && (p.ClrType == typeof(Guid) || p.ClrType == typeof(Guid?))
                    && !p.GetContainingForeignKeys().Any(f => f.PrincipalEntityType != patient))
                    properties.Add(p);
            }

            foreach (var p in properties.Where(p => !p.IsShadowProperty()
                         && (p.ClrType == typeof(Guid) || p.ClrType == typeof(Guid?))))
                result.Add((entity, p));
        }
        return result;
    }

    /// <summary>Chuyển tham chiếu; trả về số dòng đã chuyển theo từng "Bảng.Cột".</summary>
    public static Task<Dictionary<string, int>> ReassignAsync(
        HISDbContext context, Guid sourcePatientId, Guid targetPatientId, CancellationToken ct = default)
        => ReassignCoreAsync(context, sourcePatientId, targetPatientId, scope: null, "ghép", ct);

    /// <summary>
    /// Tách bệnh án: chỉ chuyển những dòng THUỘC VỀ các hồ sơ bệnh án được tách — trỏ tới hồ sơ đó
    /// trực tiếp, hoặc qua đợt nhập viện / lượt khám của hồ sơ đó.
    ///
    /// <para>Dữ liệu mức con người (dị ứng, thẻ BHYT, người thân…) không gắn hồ sơ nào nên ở lại bệnh
    /// nhân nguồn: tách một đợt điều trị nhầm người không có nghĩa là người nguồn hết dị ứng.</para>
    ///
    /// <para>Gọi SAU khi đã đổi <c>MedicalRecords.PatientId</c> hay trước đều được: hồ sơ, đợt nhập viện,
    /// lượt khám được tra theo id, không theo bệnh nhân.</para>
    /// </summary>
    public static async Task<Dictionary<string, int>> ReassignForRecordsAsync(
        HISDbContext context, Guid sourcePatientId, Guid targetPatientId,
        IReadOnlyCollection<Guid> medicalRecordIds, CancellationToken ct = default)
    {
        var records = medicalRecordIds.ToHashSet();
        var admissions = (await context.Admissions.IgnoreQueryFilters()
            .Where(a => records.Contains(a.MedicalRecordId))
            .Select(a => a.Id).ToListAsync(ct)).ToHashSet();
        var examinations = (await context.Examinations.IgnoreQueryFilters()
            .Where(e => records.Contains(e.MedicalRecordId))
            .Select(e => e.Id).ToListAsync(ct)).ToHashSet();

        var model = context.Model;
        var principals = new (IEntityType? Type, string Column, HashSet<Guid> Ids)[]
        {
            (model.FindEntityType(typeof(MedicalRecord)), "MedicalRecordId", records),
            (model.FindEntityType(typeof(Admission)), "AdmissionId", admissions),
            (model.FindEntityType(typeof(Examination)), "ExaminationId", examinations),
        };

        bool Scope(IEntityType entity, EntityEntryAccessor row)
        {
            foreach (var (type, column, ids) in principals)
            {
                // Khoá ngoại tới hồ sơ/đợt/lượt (kể cả tên khác, vd. Appointment.PreviousMedicalRecordId)
                // + cột cùng tên nhưng model không khai báo khoá ngoại.
                var links = entity.GetProperties().Where(p =>
                    p.GetContainingForeignKeys().Any(f => f.PrincipalEntityType == type)
                    || (p.Name == column && !p.IsForeignKey()));
                foreach (var link in links)
                    if (row(link.Name) is Guid id && ids.Contains(id)) return true;
            }
            return false;
        }

        return await ReassignCoreAsync(context, sourcePatientId, targetPatientId, Scope, "tách", ct);
    }

    /// <summary>Đọc giá trị một thuộc tính của dòng đang xét.</summary>
    public delegate object? EntityEntryAccessor(string propertyName);

    private static async Task<Dictionary<string, int>> ReassignCoreAsync(
        HISDbContext context, Guid sourcePatientId, Guid targetPatientId,
        Func<IEntityType, EntityEntryAccessor, bool>? scope, string operation, CancellationToken ct)
    {
        var moved = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var (entity, property) in PatientReferences(context.Model))
        {
            var method = (property.ClrType == typeof(Guid) ? ReassignGuidMethod : ReassignNullableGuidMethod)
                .MakeGenericMethod(entity.ClrType);
            Func<object, bool>? filter = scope is null
                ? null
                : row => scope(entity, name => context.Entry(row).Property(name).CurrentValue);
            int count;
            try
            {
                count = await (Task<int>)method.Invoke(null,
                    new object?[] { context, property.Name, sourcePatientId, targetPatientId, filter, ct })!;
            }
            catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
            {
                // Fail-closed: bỏ qua bảng lệch cấu trúc thì dữ liệu của bảng đó nằm lại trên người cũ mà
                // không ai biết. Chưa SaveChanges nên dừng ở đây là không đổi gì cả.
                throw new InvalidOperationException(
                    $"Chưa {operation} được: bảng {entity.GetTableName() ?? entity.ClrType.Name} lệch cấu trúc CSDL. "
                    + "Không có dữ liệu nào bị thay đổi. Chạy kiểm tra schema-drift rồi thử lại.", ex);
            }
            if (count > 0) moved[$"{entity.ClrType.Name}.{property.Name}"] = count;
        }
        return moved;
    }

    // IgnoreQueryFilters: dòng đã xoá mềm (và dòng thuộc chi nhánh khác) vẫn là lịch sử của cùng một
    // người — bỏ lại là mất dấu vết.
    private static async Task<int> ReassignGuidAsync<T>(
        HISDbContext context, string property, Guid source, Guid target, Func<object, bool>? filter,
        CancellationToken ct) where T : class
    {
        var rows = await context.Set<T>().IgnoreQueryFilters()
            .Where(e => EF.Property<Guid>(e, property) == source)
            .ToListAsync(ct);
        var selected = filter is null ? rows : rows.Where(r => filter(r)).ToList();
        foreach (var row in selected) context.Entry(row).Property(property).CurrentValue = target;
        return selected.Count;
    }

    private static async Task<int> ReassignNullableGuidAsync<T>(
        HISDbContext context, string property, Guid source, Guid target, Func<object, bool>? filter,
        CancellationToken ct) where T : class
    {
        var rows = await context.Set<T>().IgnoreQueryFilters()
            .Where(e => EF.Property<Guid?>(e, property) == source)
            .ToListAsync(ct);
        var selected = filter is null ? rows : rows.Where(r => filter(r)).ToList();
        foreach (var row in selected) context.Entry(row).Property(property).CurrentValue = (Guid?)target;
        return selected.Count;
    }
}
