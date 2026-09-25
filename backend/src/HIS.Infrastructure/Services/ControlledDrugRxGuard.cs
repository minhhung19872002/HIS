using Microsoft.EntityFrameworkCore;
using HIS.Core.Common;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

/// <summary>
/// QA-R12: applies <see cref="ControlledDrugRxRule"/> to an outpatient prescription (OPD + inpatient "toa về") with
/// the admin switches in SystemConfigs:
/// <list type="bullet">
/// <item><c>Clinical.ControlledDrugSeparateRxMode</c> — Warn (seeded default; also when the row is missing) = save and
/// return the finding as a warning; Block = refuse the save (400) with the finding.</item>
/// <item><c>Clinical.ControlledDrugDaysLimitMode</c> — Warn (default) / Block. Block refuses with the
/// "bị chặn vì lý do an toàn" marker so the v2 editor opens its override drawer; a stated override reason
/// (chronic / cancer / AIDS course) lets it through and is written into the prescription notes by the caller.</item>
/// </list>
/// </summary>
public static class ControlledDrugRxGuard
{
    /// <param name="checkDays">false when the lines carry no course length (inpatient take-home lines).</param>
    /// <returns>Warnings to show the prescriber (empty = nothing to report).</returns>
    public static async Task<List<string>> CheckAsync(HISDbContext db, IReadOnlyCollection<ControlledDrugRxRule.Line> lines,
        bool checkDays, string? overrideReason)
    {
        var warnings = new List<string>();
        if (lines == null || lines.Count == 0 || !lines.Any(l => l.IsNarcotic || l.IsPsychotropic || l.IsPrecursor))
            return warnings;

        var modes = await db.SystemConfigs.AsNoTracking()
            .Where(c => (c.ConfigKey == ControlledDrugRxRule.SeparateRxModeKey || c.ConfigKey == ControlledDrugRxRule.DaysLimitModeKey)
                        && c.IsActive && !c.IsDeleted)
            .Select(c => new { c.ConfigKey, c.ConfigValue })
            .ToListAsync();
        ControlledDrugRxRule.Mode ModeOf(string key)
            => ControlledDrugRxRule.ParseMode(modes.FirstOrDefault(m => m.ConfigKey == key)?.ConfigValue);

        var mix = ControlledDrugRxRule.MixFinding(lines);
        if (mix != null)
        {
            if (ModeOf(ControlledDrugRxRule.SeparateRxModeKey) == ControlledDrugRxRule.Mode.Block)
                throw new InvalidOperationException("Không lưu được đơn: " + mix);
            warnings.Add(mix);
        }

        if (checkDays)
        {
            var days = ControlledDrugRxRule.DaysFindings(lines);
            if (days.Count > 0)
            {
                if (ModeOf(ControlledDrugRxRule.DaysLimitModeKey) == ControlledDrugRxRule.Mode.Block
                    && string.IsNullOrWhiteSpace(overrideReason))
                    throw new InvalidOperationException("Đơn thuốc bị chặn vì lý do an toàn: "
                        + string.Join(" ", days.Select(d => $"[Thuốc kiểm soát] {d};"))
                        + " Cần nhập lý do bỏ qua (OverrideReason) nếu bác sĩ vẫn quyết định kê.");
                warnings.AddRange(days);
            }
        }
        return warnings;
    }
}
