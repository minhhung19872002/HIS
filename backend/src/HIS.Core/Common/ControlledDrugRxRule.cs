namespace HIS.Core.Common;

/// <summary>
/// QA-R12: prescribing rules for controlled drugs on an OUTPATIENT prescription (OPD prescription and the
/// inpatient take-home "toa về"). TT 52/2017/TT-BYT (amended by TT 18/2018 · TT 04/2022) and TT 20/2017/TT-BYT:
/// <list type="bullet">
/// <item>narcotic drugs (gây nghiện) go on their own "N" prescription, psychotropic/precursor drugs (hướng thần /
/// tiền chất) on their own "H" prescription — never mixed with ordinary drugs or with each other;</item>
/// <item>an acute-condition narcotic course is at most 7 days, a psychotropic/precursor course at most 10 days
/// (chronic / cancer / AIDS patients may get up to 30 days — hence the override reason).</item>
/// </list>
/// Pure logic; the mode (Warn/Block) comes from SystemConfigs and is applied by the caller.
/// </summary>
public static class ControlledDrugRxRule
{
    public const string SeparateRxModeKey = "Clinical.ControlledDrugSeparateRxMode";
    public const string DaysLimitModeKey = "Clinical.ControlledDrugDaysLimitMode";
    public const int NarcoticMaxDays = 7;
    public const int PsychotropicMaxDays = 10;

    public enum Mode { Warn, Block }

    /// <summary>"Block" (any case) → Block; anything else, including a missing row → Warn (never a silent new block).</summary>
    public static Mode ParseMode(string? value)
        => string.Equals(value?.Trim(), "Block", StringComparison.OrdinalIgnoreCase) ? Mode.Block : Mode.Warn;

    public sealed record Line(string MedicineName, bool IsNarcotic, bool IsPsychotropic, bool IsPrecursor, int? Days);

    private const string Narcotic = "gây nghiện";
    private const string Psychotropic = "hướng thần/tiền chất";

    private static string? Category(Line l)
        => l.IsNarcotic ? Narcotic : (l.IsPsychotropic || l.IsPrecursor) ? Psychotropic : null;

    /// <summary>
    /// Finding when one prescription mixes categories (narcotic / psychotropic-precursor / ordinary), or null.
    /// </summary>
    public static string? MixFinding(IReadOnlyCollection<Line> lines)
    {
        if (lines == null || lines.Count < 2) return null;
        var groups = lines.GroupBy(l => Category(l) ?? "thường").ToList();
        if (groups.Count < 2) return null;
        var parts = groups.OrderBy(g => g.Key == Narcotic ? 0 : g.Key == Psychotropic ? 1 : 2)
            .Select(g => $"thuốc {g.Key}: {string.Join(", ", g.Select(l => l.MedicineName).Distinct())}");
        return "Đơn trộn nhiều loại thuốc (" + string.Join("; ", parts) + ") — TT 52/2017/TT-BYT: thuốc gây nghiện kê "
               + "đơn riêng (mẫu N), thuốc hướng thần/tiền chất kê đơn riêng (mẫu H), không kê chung với thuốc thường. "
               + "Hãy tách thành đơn riêng.";
    }

    /// <summary>Findings for controlled lines whose course exceeds the acute-condition limit.</summary>
    public static List<string> DaysFindings(IReadOnlyCollection<Line> lines)
    {
        var findings = new List<string>();
        if (lines == null) return findings;
        foreach (var l in lines)
        {
            var cat = Category(l);
            if (cat == null || l.Days is not int days) continue;
            var max = cat == Narcotic ? NarcoticMaxDays : PsychotropicMaxDays;
            if (days > max)
                findings.Add($"{l.MedicineName} (thuốc {cat}) kê {days} ngày > {max} ngày cho bệnh cấp tính (TT 52/2017/TT-BYT)"
                             + " — chỉ bệnh mạn tính/ung thư/AIDS mới được kê tối đa 30 ngày, ghi rõ lý do.");
        }
        return findings;
    }
}
