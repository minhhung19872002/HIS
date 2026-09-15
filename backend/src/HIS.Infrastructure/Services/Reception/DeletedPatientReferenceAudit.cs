using System.Reflection;
using System.Text.Json;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Rà dữ liệu còn trỏ tới bệnh nhân ĐÃ XOÁ MỀM — chỉ đọc, không sửa gì.
///
/// <para>Trước bản sửa 15/09, ghép hồ sơ trùng chỉ chuyển <c>MedicalRecords</c> rồi xoá mềm hồ sơ nguồn:
/// lịch hẹn, vé, nhập viện, CĐHA, dị ứng… của nó nằm lại trên một hồ sơ không màn nào mở ra được. Hàm
/// này trả lời "đã có ai bị như vậy chưa, bao nhiêu dòng, và nếu là do ghép thì đã ghép vào ai".</para>
///
/// <para>Người ghép gợi ý lấy từ nhật ký diff (<c>AuditFieldDiffInterceptor</c>): lần ghép cũ đổi
/// <c>MedicalRecord.PatientId</c> từ nguồn sang đích. Nguồn không có hồ sơ bệnh án nào thì không suy ra
/// được — để trống, người quyết là quản trị viên.</para>
/// </summary>
public static class DeletedPatientReferenceAudit
{
    public sealed record DeletedPatientReferences(
        Guid PatientId,
        string PatientCode,
        string FullName,
        DateTime? DeletedAt,
        int TotalRows,
        Dictionary<string, int> RowsByTable,
        Guid? SuggestedTargetPatientId,
        string? SuggestedTargetPatientCode);

    private static readonly MethodInfo ValuesGuidMethod = typeof(DeletedPatientReferenceAudit)
        .GetMethod(nameof(ValuesGuidAsync), BindingFlags.NonPublic | BindingFlags.Static)!;
    private static readonly MethodInfo ValuesNullableGuidMethod = typeof(DeletedPatientReferenceAudit)
        .GetMethod(nameof(ValuesNullableGuidAsync), BindingFlags.NonPublic | BindingFlags.Static)!;

    public static async Task<List<DeletedPatientReferences>> FindAsync(HISDbContext context, CancellationToken ct = default)
    {
        var deleted = await context.Patients.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.IsDeleted)
            .Select(p => new { p.Id, p.PatientCode, p.FullName, p.UpdatedAt })
            .ToListAsync(ct);
        if (deleted.Count == 0) return new List<DeletedPatientReferences>();

        var deletedIds = deleted.Select(d => d.Id).ToList();
        var counts = deletedIds.ToDictionary(id => id, _ => new Dictionary<string, int>(StringComparer.Ordinal));

        foreach (var (entity, property) in PatientReferenceReassigner.PatientReferences(context.Model))
        {
            var method = (property.ClrType == typeof(Guid) ? ValuesGuidMethod : ValuesNullableGuidMethod)
                .MakeGenericMethod(entity.ClrType);
            List<Guid> values;
            try
            {
                values = await (Task<List<Guid>>)method.Invoke(null, new object[] { context, property.Name, deletedIds, ct })!;
            }
            catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
            {
                continue; // bảng chưa có trên CSDL này thì không có dòng nào để mồ côi
            }

            foreach (var group in values.GroupBy(v => v))
                counts[group.Key][$"{entity.ClrType.Name}.{property.Name}"] = group.Count();
        }

        var withRows = deleted.Where(d => counts[d.Id].Count > 0).ToList();
        var suggestions = await SuggestTargetsAsync(context, withRows.Select(d => d.Id).ToHashSet(), ct);
        var targetIds = suggestions.Values.Distinct().ToList();
        var targetCodes = await context.Patients.IgnoreQueryFilters().AsNoTracking()
            .Where(p => targetIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.PatientCode, ct);

        return withRows
            .Select(d =>
            {
                Guid? target = suggestions.TryGetValue(d.Id, out var t) ? t : null;
                return new DeletedPatientReferences(
                    d.Id, d.PatientCode, d.FullName, d.UpdatedAt,
                    counts[d.Id].Values.Sum(), counts[d.Id],
                    target,
                    target is Guid tid && targetCodes.TryGetValue(tid, out var code) ? code : null);
            })
            .OrderByDescending(r => r.TotalRows)
            .ToList();
    }

    /// <summary>Nguồn → đích, suy từ diff <c>MedicalRecord.PatientId</c> của các lần ghép cũ.</summary>
    private static async Task<Dictionary<Guid, Guid>> SuggestTargetsAsync(
        HISDbContext context, HashSet<Guid> sources, CancellationToken ct)
    {
        var result = new Dictionary<Guid, Guid>();
        if (sources.Count == 0) return result;

        var diffs = await context.AuditLogs.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.Action == "FieldUpdate" && a.EntityType == nameof(MedicalRecord)
                        && a.OldValues != null && a.OldValues.Contains("PatientId"))
            .OrderBy(a => a.Timestamp)
            .Select(a => new { a.OldValues, a.NewValues })
            .ToListAsync(ct);

        foreach (var diff in diffs)
        {
            if (ReadPatientId(diff.OldValues) is Guid from && ReadPatientId(diff.NewValues) is Guid to
                && sources.Contains(from) && from != to)
                result[from] = to;   // lần sau cùng thắng
        }
        return result;
    }

    private static Guid? ReadPatientId(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("PatientId", out var p)
                   && p.ValueKind == JsonValueKind.String && Guid.TryParse(p.GetString(), out var id)
                ? id
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static Task<List<Guid>> ValuesGuidAsync<T>(
        HISDbContext context, string property, List<Guid> ids, CancellationToken ct) where T : class
        => context.Set<T>().IgnoreQueryFilters().AsNoTracking()
            .Where(e => ids.Contains(EF.Property<Guid>(e, property)))
            .Select(e => EF.Property<Guid>(e, property))
            .ToListAsync(ct);

    private static async Task<List<Guid>> ValuesNullableGuidAsync<T>(
        HISDbContext context, string property, List<Guid> ids, CancellationToken ct) where T : class
    {
        var nullable = ids.Select(i => (Guid?)i).ToList();
        var values = await context.Set<T>().IgnoreQueryFilters().AsNoTracking()
            .Where(e => nullable.Contains(EF.Property<Guid?>(e, property)))
            .Select(e => EF.Property<Guid?>(e, property))
            .ToListAsync(ct);
        return values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
    }
}
