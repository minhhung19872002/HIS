using System;
using System.Collections.Generic;
using HIS.Core.Entities;
using HIS.Infrastructure.Services;
using Xunit;

namespace HIS.Tests.Services.Laboratory;

/// <summary>
/// QA-R12: <see cref="LabFlagEvaluator"/> now prefers the configured age/sex rows (LabReferenceRanges) and the
/// configured critical thresholds (LabCriticalValueConfigs) — both had data (13 / 8 rows) and were never read, so a
/// child's haemoglobin was judged against the adult range and the catalog critical limits were the only ones used.
/// </summary>
public class LabRangeResolutionTests
{
    private const int Male = 1, Female = 2;
    private const int Adult = 18 * 365; // 6570 days — the adult boundary of the seeded rows

    private static readonly LisTestParameter Hgb = new()
    {
        Code = "HGB", Hl7Code = "HGB", Unit = "g/L",
        ReferenceLow = 120, ReferenceHigh = 170,
        NormalMinMale = 130, NormalMaxMale = 170, NormalMinFemale = 120, NormalMaxFemale = 150,
        CriticalLow = 70, CriticalHigh = 200,
    };

    private static LabReferenceRange Row(string code, string? gender, int? from, int? to, decimal low, decimal high, string? unit = "g/L")
        => new() { TestCode = code, Gender = gender, AgeFromDays = from, AgeToDays = to, LowValue = low, HighValue = high, Unit = unit, IsActive = true };

    private static readonly List<LabReferenceRange> HgbRows = new()
    {
        Row("HGB", "M", Adult, 43800, 130, 175),
        Row("HGB", "F", Adult, 43800, 120, 160),
        Row("HGB", null, 0, Adult - 1, 110, 145), // child, both sexes
    };

    private static (decimal? Min, decimal? Max) Resolve(int? gender, int? ageDays, string? unit = "g/L",
        List<LabReferenceRange>? rows = null, string code = "HGB", bool anyCode = false)
        => LabFlagEvaluator.ResolveRange(Hgb, gender, rows ?? HgbRows, ageDays, unit, new[] { code }, anyCode);

    [Fact]
    public void Adult_male_uses_the_male_row()
        => Assert.Equal((130m, 175m), Resolve(Male, Adult + 100));

    [Fact]
    public void Adult_female_uses_the_female_row()
        => Assert.Equal((120m, 160m), Resolve(Female, Adult + 100));

    [Fact]
    public void Age_boundary_is_inclusive_on_both_ends()
    {
        Assert.Equal((130m, 175m), Resolve(Male, Adult));       // first adult day → adult row
        Assert.Equal((110m, 145m), Resolve(Male, Adult - 1));   // last child day → child row
        Assert.Equal((110m, 145m), Resolve(Female, 0));         // newborn
    }

    [Fact]
    public void Sex_specific_row_beats_a_both_sexes_row_of_the_same_age()
    {
        var rows = new List<LabReferenceRange>(HgbRows) { Row("HGB", null, 0, 43800, 100, 200) };
        Assert.Equal((120m, 160m), Resolve(Female, Adult + 5, rows: rows));
    }

    [Fact]
    public void Narrowest_age_band_wins()
    {
        var rows = new List<LabReferenceRange> { Row("HGB", null, 0, 43800, 100, 200), Row("HGB", null, 0, 30, 140, 220) };
        Assert.Equal((140m, 220m), Resolve(Male, 10, rows: rows));
    }

    [Fact]
    public void Unknown_sex_never_takes_a_sex_specific_row()
        => Assert.Equal((120m, 170m), Resolve(null, Adult + 100)); // no both-sexes adult row → catalog generic range

    [Fact]
    public void Unknown_age_only_takes_rows_covering_every_age()
    {
        var rows = new List<LabReferenceRange>(HgbRows) { Row("HGB", null, 0, 43800, 115, 165) };
        Assert.Equal((115m, 165m), Resolve(Male, null, rows: rows));
        Assert.Equal((130m, 170m), Resolve(Male, null));            // only age-banded rows → catalog male range
    }

    [Fact]
    public void Missing_rows_fall_back_to_the_catalog_range()
    {
        Assert.Equal((130m, 170m), Resolve(Male, Adult + 100, rows: new List<LabReferenceRange>()));
        Assert.Equal((120m, 150m), LabFlagEvaluator.ResolveRange(Hgb, Female, null, Adult, "g/L", new[] { "HGB" }));
    }

    [Fact]
    public void Row_with_another_unit_is_skipped()
        => Assert.Equal((130m, 170m), Resolve(Male, Adult + 100, unit: "g/dL"));

    [Fact]
    public void Micro_sign_variants_are_the_same_unit()
    {
        var rows = new List<LabReferenceRange> { Row("CREATININ", "M", Adult, 43800, 62, 106, "umol/L") };
        Assert.Equal((62m, 106m), LabFlagEvaluator.ResolveRange(null, Male, rows, Adult + 1, "µmol/L", new[] { "CRE" }, anyCodeOfService: true));
    }

    [Fact]
    public void Row_of_another_parameter_is_ignored_unless_the_service_has_a_single_parameter()
    {
        var rows = new List<LabReferenceRange> { Row("CREATININ", null, 0, 43800, 44, 106, "umol/L") };
        Assert.Equal((null, null), LabFlagEvaluator.ResolveRange(null, Male, rows, Adult, "umol/L", new[] { "CRE" }));
        Assert.Equal((44m, 106m), LabFlagEvaluator.ResolveRange(null, Male, rows, Adult, "umol/L", new[] { "CRE" }, anyCodeOfService: true));
    }

    [Fact]
    public void Inactive_or_deleted_rows_are_ignored()
    {
        var off = Row("HGB", "M", Adult, 43800, 1, 2); off.IsActive = false;
        var gone = Row("HGB", "M", Adult, 43800, 3, 4); gone.IsDeleted = true;
        Assert.Equal((130m, 170m), Resolve(Male, Adult + 1, rows: new List<LabReferenceRange> { off, gone }));
    }

    [Fact]
    public void Configured_critical_thresholds_win_bound_by_bound()
    {
        var rows = new List<LabCriticalValueConfig>
        {
            new() { TestCode = "GOT", CriticalHigh = 200, IsActive = true },
            new() { TestCode = "WBC", CriticalLow = 1, CriticalHigh = 30, IsActive = true },
        };
        Assert.Equal((1m, 30m), LabFlagEvaluator.ResolveCritical(2, 25, rows, new[] { "WBC" }, false, Male, Adult));
        // GOT row has no low bound → catalog low kept
        Assert.Equal((5m, 200m), LabFlagEvaluator.ResolveCritical(5, 300, rows, new[] { "GOT" }, false, Male, Adult));
        // no matching row → catalog values (previous behaviour)
        Assert.Equal((70m, 200m), LabFlagEvaluator.ResolveCritical(70, 200, rows, new[] { "HGB" }, false, Male, Adult));
    }

    [Fact]
    public void Critical_config_respects_sex_and_age()
    {
        var rows = new List<LabCriticalValueConfig>
        {
            new() { TestCode = "HGB", Gender = "Female", AgeFromDays = Adult, CriticalLow = 60, IsActive = true },
        };
        Assert.Equal((60m, 200m), LabFlagEvaluator.ResolveCritical(70, 200, rows, new[] { "HGB" }, false, Female, Adult));
        Assert.Equal((70m, 200m), LabFlagEvaluator.ResolveCritical(70, 200, rows, new[] { "HGB" }, false, Male, Adult));
        Assert.Equal((70m, 200m), LabFlagEvaluator.ResolveCritical(70, 200, rows, new[] { "HGB" }, false, Female, 100));
    }

    [Fact]
    public void Child_value_is_flagged_against_the_child_range()
    {
        // 112 g/L: low for an adult man (130–175) but normal for a child (110–145).
        var (min, max) = Resolve(Male, 3 * 365);
        Assert.Equal("N", LabFlagEvaluator.EvaluateFlag(112, min, max, 70, 200));
        var (aMin, aMax) = Resolve(Male, Adult + 365);
        Assert.Equal("L", LabFlagEvaluator.EvaluateFlag(112, aMin, aMax, 70, 200));
    }

    [Theory]
    [InlineData("2000-01-01", null, "2000-01-31", 30)]
    [InlineData(null, 2000, "2000-07-11", 10)]      // year only → counted from 1 July
    [InlineData("2030-01-01", null, "2026-01-01", null)] // birth date after the sample → unknown
    [InlineData(null, null, "2026-01-01", null)]
    public void Age_in_days(string? dob, int? year, string at, int? expected)
        => Assert.Equal(expected, LabFlagEvaluator.AgeInDays(dob == null ? null : DateTime.Parse(dob), year, DateTime.Parse(at)));
}
