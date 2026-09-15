using HIS.Core.Common;
using HIS.Core.Entities;
using Xunit;

namespace HIS.Tests.Services.Pharmacy;

/// <summary>
/// QA round 3: dose checking in the prescribing flow, including weight-based (per-kg) thresholds.
/// Both directions matter: a missed overdose harms the patient; a false "severe" forces needless overrides.
/// </summary>
public class DoseRangeCheckerTests
{
    private static readonly Guid Med = Guid.NewGuid();

    private static MedicineDoseRange Range(decimal? maxDaily = null, decimal? maxSingle = null,
        decimal? maxPerKg = null, decimal? minPerKg = null, int ageGroup = 0, decimal severe = 1.5m,
        string rangeUnit = "mg", string? medicineUnit = "mg", string? strength = null) => new()
    {
        Id = Guid.NewGuid(), MedicineId = Med, AgeGroup = ageGroup, IsActive = true, Unit = rangeUnit,
        MaxDailyDose = maxDaily, MaxSingleDose = maxSingle, MaxDosePerKg = maxPerKg, MinDosePerKg = minPerKg,
        SevereMultiplier = severe,
        Medicine = new Medicine { Id = Med, MedicineName = "Paracetamol", Unit = medicineUnit, Concentration = strength },
    };

    private static DoseRangeChecker.Item Daily(decimal daily) => new(Med, null, daily, null, null, null, null, null);

    [Fact]
    public void No_thresholds_means_no_warning()
        => Assert.Empty(DoseRangeChecker.Check(Array.Empty<MedicineDoseRange>(), new[] { Daily(9999) }, 30, false, 60));

    [Fact]
    public void Daily_dose_is_summed_from_the_schedule_when_not_given()
        => Assert.Equal(4m, DoseRangeChecker.DailyDoseOf(new(Med, null, null, 1, 1, 1, 1, null)));

    [Theory]
    [InlineData(3000, 0)]   // at the limit → fine
    [InlineData(3500, 2)]   // above the limit
    [InlineData(4500, 3)]   // ≥ 1.5 × limit → severe
    public void Absolute_daily_limit(decimal daily, int expectedSeverity)
    {
        var w = DoseRangeChecker.Check(new[] { Range(maxDaily: 3000) }, new[] { Daily(daily) }, 30, false, null);
        if (expectedSeverity == 0) Assert.Empty(w);
        else Assert.Equal(expectedSeverity, Assert.Single(w).Severity);
    }

    [Theory]
    [InlineData(20, 1200, 0)]  // 60 mg/kg × 20 kg = 1200 → at the limit
    [InlineData(20, 1500, 2)]  // above, below 1.5×
    [InlineData(20, 1800, 3)]  // 1.5 × 1200 → severe
    public void Weight_based_daily_limit(decimal weight, decimal daily, int expectedSeverity)
    {
        var w = DoseRangeChecker.Check(new[] { Range(maxPerKg: 60) }, new[] { Daily(daily) }, 6, false, weight);
        if (expectedSeverity == 0) Assert.Empty(w);
        else
        {
            var single = Assert.Single(w);
            Assert.Equal(expectedSeverity, single.Severity);
            Assert.Contains("theo cân nặng", single.Message);
        }
    }

    [Fact]
    public void Missing_weight_warns_but_is_not_an_overdose()
    {
        var w = Assert.Single(DoseRangeChecker.Check(new[] { Range(maxPerKg: 60) }, new[] { Daily(5000) }, 6, false, null));
        Assert.Equal("DoseWeightMissing", w.WarningType);
        Assert.Equal(DoseRangeChecker.SeverityInfo, w.Severity);
        Assert.Contains("Chưa có cân nặng", w.Message);
    }

    [Fact]
    public void A_zero_weight_counts_as_missing()
        => Assert.Equal("DoseWeightMissing",
            Assert.Single(DoseRangeChecker.Check(new[] { Range(maxPerKg: 60) }, new[] { Daily(500) }, 6, false, 0)).WarningType);

    [Fact]
    public void Below_the_per_kg_minimum_is_flagged_as_underdose()
    {
        var w = Assert.Single(DoseRangeChecker.Check(new[] { Range(minPerKg: 10, maxPerKg: 60) }, new[] { Daily(100) }, 6, false, 20));
        Assert.Equal("DoseBelowRange", w.WarningType);
        Assert.Equal(DoseRangeChecker.SeverityOutOfRange, w.Severity);
    }

    [Fact]
    public void Absolute_and_weight_limits_are_both_checked()
    {
        // 80 kg adult: per-kg limit 60 → 4800 mg, absolute limit 4000 mg. 4500 mg breaks only the absolute one.
        var w = DoseRangeChecker.Check(new[] { Range(maxDaily: 4000, maxPerKg: 60) }, new[] { Daily(4500) }, 40, false, 80);
        var single = Assert.Single(w);
        Assert.Contains("liều/ngày:", single.Message);
    }

    // ── Server-side dose parsing (backend enforcement, same shapes the UIs send) ──

    [Fact]
    public void Opd_schedule_dosage_is_parsed_per_slot()
    {
        var item = DoseRangeChecker.ParseLine(Med, "Sáng: 2, Trưa: 0,5, Tối: 1 (Sau ăn)", null)!;
        Assert.Equal(2m, item.MorningDose);
        Assert.Equal(0.5m, item.NoonDose);
        Assert.Equal(1m, item.NightDose);
        Assert.Equal(2m, item.SingleDose);
        Assert.Equal(3.5m, DoseRangeChecker.DailyDoseOf(item));
    }

    [Fact]
    public void Inpatient_note_per_time_times_per_day_is_parsed()
    {
        var item = DoseRangeChecker.ParseLine(Med, "1 viên", "2 x 3 lần/ngày x 5 ngày")!;
        Assert.Equal(2m, item.SingleDose);
        Assert.Equal(6m, item.DailyDose);
    }

    [Fact]
    public void Inpatient_slot_fields_are_parsed()
        => Assert.Equal(3m, DoseRangeChecker.DailyDoseOf(DoseRangeChecker.ParseLine(Med, null, null, null, "1", "1", null, "1")!));

    [Theory]
    [InlineData("1 viên")]
    [InlineData("—")]
    [InlineData(null)]
    public void Unreadable_free_text_dose_is_not_evidence(string? dosage)
        => Assert.Null(DoseRangeChecker.ParseLine(Med, dosage, "uống sau ăn"));

    [Fact]
    public void A_parsed_severe_line_is_severity_3()
    {
        var item = DoseRangeChecker.ParseLine(Med, "Sáng: 30, Tối: 30", null)!;
        Assert.Equal(DoseRangeChecker.SeveritySevere,
            Assert.Single(DoseRangeChecker.Check(new[] { Range(maxPerKg: 0.5m) }, new[] { item }, 40, false, 70)).Severity);
    }

    // ── Unit safety: tablet counts vs mg thresholds (pre-push review S3) ──

    private static DoseRangeChecker.Item Tablets(decimal perTime, decimal perDay) => new(Med, perTime, perDay, null, null, null, null, null);

    [Fact]
    public void One_digoxin_tablet_of_0_25_mg_is_not_an_overdose_of_a_0_25_mg_limit()
        => Assert.Empty(DoseRangeChecker.Check(
            new[] { Range(maxSingle: 0.25m, rangeUnit: "mg", medicineUnit: "Viên", strength: "0,25 mg") },
            new[] { Tablets(1, 1) }, 60, false, 60));

    [Fact]
    public void Two_digoxin_tablets_convert_to_0_5_mg_and_are_severe()
    {
        var w = Assert.Single(DoseRangeChecker.Check(
            new[] { Range(maxSingle: 0.25m, rangeUnit: "mg", medicineUnit: "Viên", strength: "0.25mg") },
            new[] { Tablets(2, 2) }, 60, false, 60));
        Assert.Equal(DoseRangeChecker.SeveritySevere, w.Severity);
        Assert.Contains("0.5 mg", w.Message);
        Assert.Contains("quy đổi", w.Message);
    }

    [Fact]
    public void Tablets_against_mg_without_a_strength_are_not_compared_and_never_block()
    {
        var w = Assert.Single(DoseRangeChecker.Check(
            new[] { Range(maxSingle: 0.25m, maxDaily: 0.25m, rangeUnit: "mg", medicineUnit: "Viên", strength: null) },
            new[] { Tablets(4, 8) }, 60, false, 60));
        Assert.Equal("DoseUnitMismatch", w.WarningType);
        Assert.Equal(DoseRangeChecker.SeverityInfo, w.Severity);
        Assert.Contains("Không so sánh được đơn vị", w.Message);
    }

    [Fact]
    public void A_per_volume_strength_is_not_guessed()
        => Assert.Equal("DoseUnitMismatch", Assert.Single(DoseRangeChecker.Check(
            new[] { Range(maxDaily: 1000m, rangeUnit: "mg", medicineUnit: "Chai", strength: "250mg/5ml") },
            new[] { Tablets(1, 10) }, 30, false, 60)).WarningType);

    [Fact]
    public void Threshold_in_the_dispensing_unit_compares_directly_whatever_the_accents()
        => Assert.Equal(DoseRangeChecker.SeveritySevere, Assert.Single(DoseRangeChecker.Check(
            new[] { Range(maxDaily: 2m, rangeUnit: "viên", medicineUnit: "Viên", strength: "5mg") },
            new[] { Tablets(2, 4) }, 30, false, 60)).Severity);

    [Fact]
    public void Gram_strength_converts_to_a_mg_threshold()
    {
        // 1 lọ = 1 g; limit 2000 mg/day → 3 lọ = 3000 mg = 1.5× → severe
        Assert.Empty(DoseRangeChecker.Check(new[] { Range(maxDaily: 2000m, rangeUnit: "mg", medicineUnit: "Lọ", strength: "1g") },
            new[] { Tablets(1, 2) }, 30, false, 60));
        Assert.Equal(DoseRangeChecker.SeveritySevere, Assert.Single(DoseRangeChecker.Check(
            new[] { Range(maxDaily: 2000m, rangeUnit: "mg", medicineUnit: "Lọ", strength: "1g") },
            new[] { Tablets(1, 3) }, 30, false, 60)).Severity);
    }

    [Fact]
    public void Per_kg_limits_use_the_converted_dose()
    {
        // 500 mg tablets, 60 mg/kg/day, 20 kg → max 1200 mg; 3 tablets/day = 1500 mg → out of range (not severe)
        var w = Assert.Single(DoseRangeChecker.Check(
            new[] { Range(maxPerKg: 60m, rangeUnit: "mg", medicineUnit: "Viên", strength: "500mg") },
            new[] { Tablets(1, 3) }, 6, false, 20));
        Assert.Equal(DoseRangeChecker.SeverityOutOfRange, w.Severity);
    }

    [Fact]
    public void An_adult_only_threshold_is_not_applied_to_a_child()
    {
        var w = Assert.Single(DoseRangeChecker.Check(new[] { Range(maxDaily: 4000, ageGroup: 2) }, new[] { Daily(9000) }, 5, false, 20));
        Assert.Equal("DoseRangeNotApplicable", w.WarningType);
    }
}
