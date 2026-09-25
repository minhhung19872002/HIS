using System.Globalization;

namespace HIS.Infrastructure.Services;

/// <summary>
/// R1: tính cờ cao-thấp (N/H/L/HH/LL) cho 1 chỉ số XN từ giá trị + khoảng tham chiếu + ngưỡng nguy kịch.
/// Dùng chung cho mọi write path (analyzer HL7 / KTV nhập tay / SampleReceive) — khớp ngữ nghĩa
/// FE `evaluateLabValue` (LabResultValue.tsx) để FE/BE nhất quán.
/// </summary>
public static class LabFlagEvaluator
{
    /// <summary>N=bình thường, H=cao, L=thấp, HH=cao nguy kịch, LL=thấp nguy kịch.</summary>
    public static string EvaluateFlag(decimal? value, decimal? min, decimal? max, decimal? critLow, decimal? critHigh)
    {
        if (value == null) return "N";
        if (critLow.HasValue && value < critLow.Value) return "LL";
        if (critHigh.HasValue && value > critHigh.Value) return "HH";
        if (min.HasValue && value < min.Value) return "L";
        if (max.HasValue && value > max.Value) return "H";
        return "N";
    }

    /// <summary>Map cờ → AbnormalType DTO (1-Cao, 2-Thấp, 3-Nguy kịch).</summary>
    public static int? FlagToAbnormalType(string? flag) => flag switch
    {
        "H" => 1,
        "L" => 2,
        "HH" or "LL" => 3,
        _ => null,
    };

    public static bool IsAbnormal(string? flag) => !string.IsNullOrEmpty(flag) && flag != "N";

    public static string? BuildReferenceRange(decimal? min, decimal? max)
    {
        if (!min.HasValue && !max.HasValue) return null;
        var lo = min.HasValue ? min.Value.ToString("0.##", CultureInfo.InvariantCulture) : "";
        var hi = max.HasValue ? max.Value.ToString("0.##", CultureInfo.InvariantCulture) : "";
        return $"{lo}–{hi}";
    }

    /// <summary>
    /// Chuẩn hóa cờ HL7 OBX-8 về N/H/L/HH/LL; ngoài tập đó (A, AA, &gt;, &lt;, rỗng…) trả null
    /// để caller fallback tính từ khoảng tham chiếu catalog.
    /// </summary>
    public static string? NormalizeHl7Flag(string? hl7Flag) => hl7Flag?.Trim().ToUpperInvariant() switch
    {
        "N" or "H" or "L" or "HH" or "LL" => hl7Flag.Trim().ToUpperInvariant(),
        _ => null,
    };

    public static decimal? TryParse(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var t = s.Trim();
        // Vietnamese staff type the decimal separator as a comma ("5,6"). NumberStyles.Any (AllowThousands)
        // used to read that as 56 — a normal WBC became critical-high, a critical K "2,1" became 21 (HH).
        // A single comma with no dot is a decimal separator; mixed/multiple separators are ambiguous → null.
        if (t.Contains(','))
        {
            if (t.Contains('.') || t.IndexOf(',') != t.LastIndexOf(',')) return null;
            t = t.Replace(',', '.');
        }
        return decimal.TryParse(t, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) ? v : (decimal?)null;
    }

    /// <summary>
    /// Reference range for a patient: gender-specific catalog bounds (1=male, 2=female) first, then the
    /// generic ReferenceLow/High, then the male bounds (legacy fallback when gender is unknown).
    /// </summary>
    public static (decimal? Min, decimal? Max) ResolveRange(HIS.Core.Entities.LisTestParameter? cat, int? gender)
    {
        if (cat == null) return (null, null);
        var gMin = gender == 1 ? cat.NormalMinMale : gender == 2 ? cat.NormalMinFemale : null;
        var gMax = gender == 1 ? cat.NormalMaxMale : gender == 2 ? cat.NormalMaxFemale : null;
        return (gMin ?? cat.ReferenceLow ?? cat.NormalMinMale, gMax ?? cat.ReferenceHigh ?? cat.NormalMaxMale);
    }

    /// <summary>Age span treated as "every age" when the patient's age is unknown (0 → 120 years).</summary>
    private const int AllAgesDays = 43800;

    /// <summary>
    /// QA-R12: reference range for a patient that also uses the configured age/sex rows (LabReferenceRanges), which
    /// were never read. The best matching row wins (sex-specific over "both", then the narrowest age band); a row
    /// with another unit than the result is skipped (a µmol/L range must not flag a mg/dL value). No usable row →
    /// the catalog range of <see cref="ResolveRange(HIS.Core.Entities.LisTestParameter?, int?)"/> (previous behaviour).
    /// </summary>
    /// <param name="codes">Parameter codes of the result (input code, catalog Code/Hl7Code) — matched case-insensitively.</param>
    /// <param name="anyCodeOfService">The service has a single parameter: its rows apply whatever TestCode they carry.</param>
    public static (decimal? Min, decimal? Max) ResolveRange(HIS.Core.Entities.LisTestParameter? cat, int? gender,
        IEnumerable<HIS.Core.Entities.LabReferenceRange>? rows, int? ageDays, string? unit,
        IEnumerable<string?> codes, bool anyCodeOfService = false)
    {
        var row = PickReferenceRow(rows, codes, anyCodeOfService, gender, ageDays, unit);
        return row != null ? (row.LowValue, row.HighValue) : ResolveRange(cat, gender);
    }

    /// <summary>Best matching LabReferenceRanges row, or null (see <see cref="ResolveRange(HIS.Core.Entities.LisTestParameter?, int?, IEnumerable{HIS.Core.Entities.LabReferenceRange}?, int?, string?, IEnumerable{string?}, bool)"/>).</summary>
    public static HIS.Core.Entities.LabReferenceRange? PickReferenceRow(IEnumerable<HIS.Core.Entities.LabReferenceRange>? rows,
        IEnumerable<string?> codes, bool anyCodeOfService, int? gender, int? ageDays, string? unit)
    {
        if (rows == null) return null;
        var codeSet = CodeSet(codes);
        var resultUnit = NormalizeUnit(unit);
        return rows
            .Where(r => r.IsActive && !r.IsDeleted && (r.LowValue.HasValue || r.HighValue.HasValue)
                        && (anyCodeOfService || codeSet.Contains(r.TestCode?.Trim() ?? ""))
                        && GenderMatches(r.Gender, gender) && AgeMatches(r.AgeFromDays, r.AgeToDays, ageDays)
                        && (resultUnit.Length == 0 || NormalizeUnit(r.Unit).Length == 0 || NormalizeUnit(r.Unit) == resultUnit))
            .OrderByDescending(r => IsSexSpecific(r.Gender))
            .ThenBy(r => AgeSpan(r.AgeFromDays, r.AgeToDays))
            .FirstOrDefault();
    }

    /// <summary>
    /// QA-R12: critical thresholds for a patient — a matching LabCriticalValueConfigs row (same sex/age rules as
    /// the reference rows) wins bound by bound; a bound the row leaves empty keeps the catalog value.
    /// </summary>
    public static (decimal? Low, decimal? High) ResolveCritical(decimal? catalogLow, decimal? catalogHigh,
        IEnumerable<HIS.Core.Entities.LabCriticalValueConfig>? rows, IEnumerable<string?> codes, bool anyCodeOfService,
        int? gender, int? ageDays)
    {
        if (rows == null) return (catalogLow, catalogHigh);
        var codeSet = CodeSet(codes);
        var row = rows
            .Where(r => r.IsActive && !r.IsDeleted && (r.CriticalLow.HasValue || r.CriticalHigh.HasValue)
                        && (anyCodeOfService || codeSet.Contains(r.TestCode?.Trim() ?? ""))
                        && GenderMatches(r.Gender, gender) && AgeMatches(r.AgeFromDays, r.AgeToDays, ageDays))
            .OrderByDescending(r => IsSexSpecific(r.Gender))
            .ThenBy(r => AgeSpan(r.AgeFromDays, r.AgeToDays))
            .FirstOrDefault();
        return row == null ? (catalogLow, catalogHigh) : (row.CriticalLow ?? catalogLow, row.CriticalHigh ?? catalogHigh);
    }

    /// <summary>Age in whole days on <paramref name="at"/>; year-of-birth only → counted from 1 July of that year.</summary>
    public static int? AgeInDays(DateTime? dateOfBirth, int? yearOfBirth, DateTime at)
    {
        var dob = dateOfBirth?.Date ?? (yearOfBirth is > 1900 and < 3000 ? new DateTime(yearOfBirth.Value, 7, 1) : (DateTime?)null);
        if (dob == null || dob.Value > at.Date) return null;
        return (int)(at.Date - dob.Value).TotalDays;
    }

    /// <summary>"µmol/L", "umol/l", "μmol / L" compare equal.</summary>
    public static string NormalizeUnit(string? unit)
        => string.IsNullOrWhiteSpace(unit) ? string.Empty
            : unit.Trim().Replace('µ', 'u').Replace('μ', 'u').Replace(" ", "").ToLowerInvariant();

    private static HashSet<string> CodeSet(IEnumerable<string?> codes)
        => new(codes.Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c!.Trim()), StringComparer.OrdinalIgnoreCase);

    /// <summary>Row sex code → 1 male / 2 female / null = both.</summary>
    private static int? RowSex(string? g) => g?.Trim().ToUpperInvariant() switch
    {
        "M" or "MALE" or "NAM" or "1" => 1,
        "F" or "FEMALE" or "NỮ" or "NU" or "2" => 2,
        _ => null,
    };

    private static bool IsSexSpecific(string? g) => RowSex(g) != null;

    /// <summary>A sex-specific row applies only to a patient of that sex (unknown sex → only "both" rows).</summary>
    private static bool GenderMatches(string? rowGender, int? patientGender)
    {
        var sex = RowSex(rowGender);
        return sex == null || sex == patientGender;
    }

    /// <summary>Inclusive bounds. Unknown age → only rows that cover every age.</summary>
    private static bool AgeMatches(int? fromDays, int? toDays, int? ageDays)
    {
        if (ageDays == null) return (fromDays ?? 0) <= 0 && (toDays == null || toDays >= AllAgesDays);
        return (fromDays == null || ageDays >= fromDays) && (toDays == null || ageDays <= toDays);
    }

    private static long AgeSpan(int? fromDays, int? toDays) => (long)(toDays ?? int.MaxValue) - (fromDays ?? 0);
}
