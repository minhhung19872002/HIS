using HIS.Core.Entities;

namespace HIS.Core.Common;

/// <summary>
/// Pure dose-range evaluation (#214 SAFE-3, extended in QA round 3 with weight-based mg/kg thresholds).
/// Advisory: produces warnings with a severity (1 = reminder / not checked, 2 = outside range, 3 = severe overdose);
/// the prescribing UI demands an override reason for severity 3. Missing data (no thresholds, no age, no weight)
/// never blocks — it produces a severity-1 "not checked" warning where a threshold exists but cannot be applied.
/// </summary>
public static class DoseRangeChecker
{
    public const int SeverityInfo = 1;
    public const int SeverityOutOfRange = 2;
    public const int SeveritySevere = 3;

    public sealed record Item(Guid MedicineId, decimal? SingleDose, decimal? DailyDose,
        decimal? MorningDose, decimal? NoonDose, decimal? EveningDose, decimal? NightDose, string? RouteCode);

    public sealed record Warning(Guid MedicineId, string MedicineName, string WarningType, int Severity,
        string Message, string Recommendation);

    public static List<Warning> Check(IReadOnlyCollection<MedicineDoseRange> activeRanges, IEnumerable<Item> items,
        int? patientAge, bool isRenalImpaired, decimal? weightKg)
    {
        var warnings = new List<Warning>();
        if (activeRanges.Count == 0) return warnings;
        var ageGroup = ResolveAgeGroup(patientAge);
        var weight = weightKg is > 0 ? weightKg : null;

        foreach (var item in items)
        {
            var candidates = activeRanges.Where(r => r.MedicineId == item.MedicineId).ToList();
            if (candidates.Count == 0) continue;

            var range = PickBestRange(candidates, item.RouteCode, ageGroup, isRenalImpaired);
            if (range == null)
            {
                // Thresholds exist for this drug but none applies to this patient (e.g. only an adult row for a
                // child, or age unknown). Silently returning "no warning" read as "dose checked and OK".
                warnings.Add(new Warning(item.MedicineId, candidates[0].Medicine?.MedicineName ?? "",
                    "DoseRangeNotApplicable", SeverityInfo,
                    ageGroup switch
                    {
                        0 => "Chưa có tuổi người bệnh — không chọn được ngưỡng liều theo nhóm tuổi, liều CHƯA được kiểm tra",
                        1 => "Chưa cấu hình ngưỡng liều cho trẻ em — liều CHƯA được kiểm tra",
                        _ => "Không có ngưỡng liều phù hợp (nhóm tuổi / đường dùng) — liều CHƯA được kiểm tra"
                    },
                    "Tự kiểm tra liều theo cân nặng/tuổi trước khi kê"));
                continue;
            }

            var medName = range.Medicine?.MedicineName ?? "";

            // Prescribed doses are counted in the medicine's dispensing unit ("Sáng: 1" = 1 viên); thresholds are in
            // range.Unit (often mg). Comparing 1 viên of Digoxin 0.25 mg against a 0.25 mg limit as "1 > 0.25" was a
            // false severe overdose. Convert via the medicine strength, or refuse to compare (severity 1, no block).
            var conversion = ResolveUnitConversion(range, range.Medicine?.Unit, range.Medicine?.Concentration);
            if (conversion == null)
            {
                warnings.Add(new Warning(item.MedicineId, medName, "DoseUnitMismatch", SeverityInfo,
                    $"Không so sánh được đơn vị: ngưỡng liều tính theo \"{range.Unit}\", đơn kê theo \"{range.Medicine?.Unit ?? "?"}\""
                    + (string.IsNullOrWhiteSpace(range.Medicine?.Concentration) ? " và thuốc chưa khai báo hàm lượng" : $" (hàm lượng \"{range.Medicine!.Concentration}\" không quy đổi được)")
                    + " — liều CHƯA được kiểm tra",
                    "Dược: khai báo hàm lượng thuốc (VD 0,25 mg) hoặc đặt ngưỡng theo đơn vị cấp phát"));
                continue;
            }
            var (factor, basis) = conversion.Value;
            var singleDose = item.SingleDose * factor;
            var dailyDose = DailyDoseOf(item) * factor;

            AddIfExceeds(warnings, range, item.MedicineId, medName, "liều 1 lần", singleDose, range.MaxSingleDose, basis);
            AddIfExceeds(warnings, range, item.MedicineId, medName, "liều/ngày", dailyDose, range.MaxDailyDose, basis);
            CheckPerKg(warnings, range, item.MedicineId, medName, dailyDose, weight);
        }
        return warnings;
    }

    private static readonly System.Text.RegularExpressions.Regex ScheduleRx = new(
        @"(Sáng|Trưa|Chiều|Tối)\s*:\s*(\d+(?:[.,]\d+)?)",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);
    private static readonly System.Text.RegularExpressions.Regex TimesPerDayRx = new(
        @"(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*lần\s*/\s*ngày",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <summary>
    /// Server-side reading of a prescribed line, the same shapes the prescribing UIs send to /medicine-dose-range/check:
    /// OPD dosage "Sáng: 1, Trưa: 0.5, Tối: 1 (Sau ăn)"; inpatient note "2 x 3 lần/ngày x 5 ngày" (per time × times/day);
    /// or explicit per-slot numbers (inpatient Morning/Noon/Afternoon/Evening). Returns null when nothing numeric can be
    /// read — an unreadable free-text dose is missing data, never an overdose.
    /// </summary>
    public static Item? ParseLine(Guid medicineId, string? dosage, string? note, string? route = null,
        string? morning = null, string? noon = null, string? afternoon = null, string? evening = null)
    {
        decimal? m = null, n = null, e = null, t = null;
        foreach (System.Text.RegularExpressions.Match match in ScheduleRx.Matches(dosage ?? ""))
        {
            var v = Num(match.Groups[2].Value);
            switch (match.Groups[1].Value.ToLowerInvariant())
            {
                case "sáng": m = v; break;
                case "trưa": n = v; break;
                case "chiều": e = v; break;
                case "tối": t = v; break;
            }
        }
        if ((m ?? n ?? e ?? t) is not null)
        {
            var slots = new[] { m, n, e, t }.Where(x => x is > 0).Select(x => x!.Value).ToList();
            return new Item(medicineId, slots.Count > 0 ? slots.Max() : null, null, m, n, e, t, route);
        }

        var perTime = TimesPerDayRx.Match($"{note} {dosage}");
        if (perTime.Success && Num(perTime.Groups[1].Value) is decimal single && Num(perTime.Groups[2].Value) is decimal times)
            return new Item(medicineId, single, single * times, null, null, null, null, route);

        decimal? pm = Num(morning), pn = Num(noon), pa = Num(afternoon), pe = Num(evening);
        if ((pm ?? pn ?? pa ?? pe) is not null)
        {
            var slots = new[] { pm, pn, pa, pe }.Where(x => x is > 0).Select(x => x!.Value).ToList();
            return new Item(medicineId, slots.Count > 0 ? slots.Max() : null, null, pm, pn, pa, pe, route);
        }
        return null;
    }

    private static decimal? Num(string? raw)
        => decimal.TryParse((raw ?? "").Trim().Replace(',', '.'), System.Globalization.NumberStyles.Number,
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : null;

    /// <summary>Daily dose: explicit value, else the sum of the morning/noon/evening/night doses.</summary>
    public static decimal? DailyDoseOf(Item item)
    {
        if (item.DailyDose.HasValue) return item.DailyDose;
        var present = new[] { item.MorningDose, item.NoonDose, item.EveningDose, item.NightDose }
            .Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return present.Count == 0 ? null : present.Sum();
    }

    private static readonly System.Text.RegularExpressions.Regex StrengthRx = new(
        @"^\s*(\d+(?:[.,]\d+)?)\s*(mcg|µg|ug|mg|g|gam|gram)\s*$",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    /// <summary>Mass units in mg; null for anything that is not a mass (viên, ống, ml, IU…).</summary>
    private static decimal? MilligramsPer(string? unit) => NormalizeUnit(unit) switch
    {
        "mcg" or "µg" or "ug" => 0.001m,
        "mg" => 1m,
        "g" or "gam" or "gram" => 1000m,
        _ => null,
    };

    private static string NormalizeUnit(string? unit)
    {
        var s = (unit ?? "").Trim().ToLowerInvariant().Replace(".", "").Replace(" ", "");
        var decomposed = s.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC).Replace('đ', 'd');
    }

    /// <summary>
    /// Factor turning a prescribed quantity (in the medicine's dispensing unit) into the threshold's unit, plus a note
    /// explaining the conversion. Null = the two units cannot be compared (the dose is NOT checked, never blocked).
    /// Rules: no threshold unit (legacy row) or same unit → 1; both masses (g vs mg) → mass ratio; threshold in mass
    /// and dispensing unit a count (viên, ống…) with a plain mass strength ("0,25 mg", not "250mg/5ml") → strength.
    /// </summary>
    public static (decimal Factor, string? Basis)? ResolveUnitConversion(MedicineDoseRange range, string? prescribedUnit, string? strength)
    {
        if (string.IsNullOrWhiteSpace(range.Unit)) return (1m, null);
        if (string.IsNullOrWhiteSpace(prescribedUnit)) return null;
        if (NormalizeUnit(range.Unit) == NormalizeUnit(prescribedUnit)) return (1m, null);

        var rangeMg = MilligramsPer(range.Unit);
        if (rangeMg == null) return null;
        var prescribedMg = MilligramsPer(prescribedUnit);
        if (prescribedMg != null)
            return (prescribedMg.Value / rangeMg.Value, $" (quy đổi {prescribedUnit} → {range.Unit})");

        var m = StrengthRx.Match(strength ?? "");
        if (!m.Success || Num(m.Groups[1].Value) is not decimal amount || amount <= 0
            || MilligramsPer(m.Groups[2].Value) is not decimal strengthMg)
            return null;
        return (amount * strengthMg / rangeMg.Value, $" (quy đổi: 1 {prescribedUnit} = {strength!.Trim()})");
    }

    private static void CheckPerKg(List<Warning> warnings, MedicineDoseRange range, Guid medId, string medName,
        decimal? dailyDose, decimal? weight)
    {
        var hasPerKg = range.MaxDosePerKg is > 0 || range.MinDosePerKg is > 0;
        if (!hasPerKg || dailyDose is not > 0) return;
        var unit = string.IsNullOrEmpty(range.Unit) ? "" : " " + range.Unit;

        if (weight == null)
        {
            warnings.Add(new Warning(medId, medName, "DoseWeightMissing", SeverityInfo,
                "Chưa có cân nặng người bệnh — liều theo cân nặng (/kg) CHƯA được kiểm tra",
                "Cân/nhập cân nặng (sinh hiệu) rồi kiểm tra lại liều"));
            return;
        }

        if (range.MaxDosePerKg is > 0)
        {
            var max = Math.Round(range.MaxDosePerKg.Value * weight.Value, 2);
            AddIfExceeds(warnings, range, medId, medName, "liều/ngày theo cân nặng", dailyDose, max,
                $" ({range.MaxDosePerKg.Value:0.##}{unit}/kg × {weight.Value:0.#} kg)");
        }
        if (range.MinDosePerKg is > 0)
        {
            var min = Math.Round(range.MinDosePerKg.Value * weight.Value, 2);
            if (dailyDose!.Value < min)  // dailyDose already converted to range.Unit
                warnings.Add(new Warning(medId, medName, "DoseBelowRange", SeverityOutOfRange,
                    $"Dưới liều theo cân nặng: kê {dailyDose.Value:0.##}{unit}/ngày < tối thiểu {min:0.##}{unit}"
                    + $" ({range.MinDosePerKg.Value:0.##}{unit}/kg × {weight.Value:0.#} kg)",
                    "Kiểm tra lại liều — có thể không đủ hiệu quả điều trị"));
        }
    }

    private static void AddIfExceeds(List<Warning> warnings, MedicineDoseRange range,
        Guid medId, string medName, string label, decimal? actual, decimal? max, string? basis)
    {
        if (actual == null || actual <= 0 || max == null || max <= 0) return;
        if (actual.Value <= max.Value) return;

        var multiplier = range.SevereMultiplier <= 1 ? 1.5m : range.SevereMultiplier;
        var severe = actual.Value >= max.Value * multiplier;
        var unit = string.IsNullOrEmpty(range.Unit) ? "" : " " + range.Unit;
        warnings.Add(new Warning(medId, medName, "DoseRange", severe ? SeveritySevere : SeverityOutOfRange,
            $"{(severe ? "QUÁ LIỀU NẶNG" : "Vượt ngưỡng")} {label}: kê {actual.Value:0.##}{unit} > tối đa {max.Value:0.##}{unit}"
                + (basis ?? "")
                + (range.IsRenalAdjusted ? " (ngưỡng đã hiệu chỉnh suy thận)" : ""),
            severe
                ? "Rà soát lại liều — quá liều nặng, cân nhắc giảm liều hoặc ghi rõ lý do y lệnh"
                : "Kiểm tra lại liều so với khuyến cáo"));
    }

    private static MedicineDoseRange? PickBestRange(List<MedicineDoseRange> candidates,
        string? route, int ageGroup, bool renal)
    {
        // Filter out ranges that do NOT apply to this patient before ranking. Ranking alone used to pick a
        // non-matching row: an adult-only threshold was applied to a child (paediatric overdose passed silently)
        // and a renal-adjusted threshold was applied to a patient without renal impairment (false "severe overdose").
        var applicable = candidates
            .Where(r => renal || !r.IsRenalAdjusted)
            .Where(r => string.IsNullOrEmpty(r.RouteCode) || string.IsNullOrEmpty(route) || r.RouteCode == route)
            .Where(r => r.AgeGroup == 0
                || (ageGroup != 0 && r.AgeGroup == ageGroup)
                || (ageGroup == 3 && r.AgeGroup == 2)) // elderly may fall back to the adult threshold; children may not
            .ToList();

        return applicable
            .OrderByDescending(r => renal && r.IsRenalAdjusted)                              // renal first when impaired
            .ThenByDescending(r => !string.IsNullOrEmpty(route) && r.RouteCode == route)     // route match
            .ThenByDescending(r => r.AgeGroup == ageGroup)                                   // age-group match
            .ThenByDescending(r => r.AgeGroup == 0)                                          // all-ages fallback
            .FirstOrDefault();
    }

    public static int ResolveAgeGroup(int? age)
    {
        if (age == null) return 0;
        if (age < 12) return 1;
        if (age >= 65) return 3;
        return 2;
    }
}
