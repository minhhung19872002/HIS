using HIS.Core.Common;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R3 (security leftovers): sequential business codes that used to be <c>Count()+1</c> or
/// <c>Random(1000, 9999)</c> — two users saving at the same moment got the same code. Migration 201 adds unique
/// indexes (UX_InterHospitalRequests_RequestCode, UX_MedicalRecordArchives_ArchiveCode); callers compute the next
/// code here and, on a unique-index clash, recompute and save again (<see cref="MaxAttempts"/>).
/// Deleted rows are included (IgnoreQueryFilters) because the unique index covers them too.
/// </summary>
internal static class RecordCodeGenerator
{
    public const int MaxAttempts = 5;

    /// <summary>Highest numeric suffix among <paramref name="codes"/> that start with <paramref name="prefix"/>, plus 1.
    /// Codes whose remainder is not all digits (other formats) are ignored.</summary>
    public static long NextNumber(IEnumerable<string> codes, string prefix)
    {
        long max = 0;
        foreach (var code in codes)
        {
            if (code == null || !code.StartsWith(prefix, StringComparison.Ordinal)) continue;
            var rest = code.AsSpan(prefix.Length);
            if (rest.Length == 0 || rest.Length > 18) continue;
            var allDigits = true;
            foreach (var ch in rest) if (ch < '0' || ch > '9') { allDigits = false; break; }
            if (allDigits && long.TryParse(rest, out var n) && n > max) max = n;
        }
        return max + 1;
    }

    /// <summary>Inter-hospital request code <c>LV-yyyy-NNNN</c> (VN year).</summary>
    public static async Task<string> NextInterHospitalCodeAsync(HISDbContext db)
    {
        var prefix = $"LV-{VnTime.NowVn:yyyy}-";
        var codes = await db.InterHospitalRequests.IgnoreQueryFilters()
            .Where(r => r.RequestCode.StartsWith(prefix))
            .Select(r => r.RequestCode)
            .ToListAsync();
        return $"{prefix}{NextNumber(codes, prefix):D4}";
    }

    /// <summary><paramref name="count"/> consecutive archive codes <c>LT{yyyyMMdd}{NNNN}</c> (VN day) — keeps the
    /// existing LT+date shape; the old random suffixes of the same day are skipped over by taking the max.</summary>
    public static async Task<List<string>> NextArchiveCodesAsync(HISDbContext db, int count = 1)
    {
        var prefix = $"LT{VnTime.NowVn:yyyyMMdd}";
        var codes = await db.MedicalRecordArchives.IgnoreQueryFilters()
            .Where(a => a.ArchiveCode.StartsWith(prefix))
            .Select(a => a.ArchiveCode)
            .ToListAsync();
        var first = NextNumber(codes, prefix);
        return Enumerable.Range(0, count).Select(i => $"{prefix}{first + i:D4}").ToList();
    }
}
