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
}
