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

    public static decimal? TryParse(string? s)
        => decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : (decimal?)null;
}
