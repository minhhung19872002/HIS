using HIS.Core.Common;
using Xunit;

namespace HIS.Tests.Services.Pharmacy;

/// <summary>QA-R12: TT 52/2017 — narcotic (N) / psychotropic-precursor (H) drugs on their own prescription, course limits.</summary>
public class ControlledDrugRxRuleTests
{
    private static ControlledDrugRxRule.Line Normal(string n, int? days = 5) => new(n, false, false, false, days);
    private static ControlledDrugRxRule.Line Narcotic(string n, int? days = 5) => new(n, true, false, false, days);
    private static ControlledDrugRxRule.Line Psycho(string n, int? days = 5) => new(n, false, true, false, days);
    private static ControlledDrugRxRule.Line Precursor(string n, int? days = 5) => new(n, false, false, true, days);

    [Theory]
    [InlineData(null, ControlledDrugRxRule.Mode.Warn)]   // row missing → warn, never a silent new block
    [InlineData("warn", ControlledDrugRxRule.Mode.Warn)]
    [InlineData("Block", ControlledDrugRxRule.Mode.Block)]
    [InlineData("xyz", ControlledDrugRxRule.Mode.Warn)]
    public void Mode_parsing(string? value, ControlledDrugRxRule.Mode expected)
        => Assert.Equal(expected, ControlledDrugRxRule.ParseMode(value));

    [Fact]
    public void Ordinary_only_or_single_category_prescriptions_are_fine()
    {
        Assert.Null(ControlledDrugRxRule.MixFinding(new[] { Normal("Paracetamol"), Normal("Vitamin C") }));
        Assert.Null(ControlledDrugRxRule.MixFinding(new[] { Narcotic("Morphin"), Narcotic("Fentanyl") }));
        Assert.Null(ControlledDrugRxRule.MixFinding(new[] { Psycho("Diazepam"), Precursor("Ephedrin") })); // both on form H
        Assert.Null(ControlledDrugRxRule.MixFinding(new[] { Narcotic("Morphin") }));
    }

    [Fact]
    public void Narcotic_with_ordinary_drug_is_reported_with_both_names()
    {
        var f = ControlledDrugRxRule.MixFinding(new[] { Narcotic("Morphin"), Normal("Paracetamol") });
        Assert.NotNull(f);
        Assert.Contains("Morphin", f);
        Assert.Contains("Paracetamol", f);
    }

    [Fact]
    public void Narcotic_with_psychotropic_is_reported()
        => Assert.NotNull(ControlledDrugRxRule.MixFinding(new[] { Narcotic("Morphin"), Psycho("Diazepam") }));

    [Fact]
    public void Narcotic_flag_wins_when_a_drug_is_flagged_twice()
        => Assert.Null(ControlledDrugRxRule.MixFinding(new[] { new ControlledDrugRxRule.Line("X", true, true, false, 3), Narcotic("Morphin") }));

    [Fact]
    public void Course_limits_seven_and_ten_days_inclusive()
    {
        Assert.Empty(ControlledDrugRxRule.DaysFindings(new[] { Narcotic("Morphin", 7), Psycho("Diazepam", 10), Normal("Para", 90) }));
        var f = ControlledDrugRxRule.DaysFindings(new[] { Narcotic("Morphin", 8), Precursor("Ephedrin", 11), Psycho("Diazepam", null) });
        Assert.Equal(2, f.Count);
        Assert.Contains(f, x => x.Contains("Morphin") && x.Contains("> 7"));
        Assert.Contains(f, x => x.Contains("Ephedrin") && x.Contains("> 10"));
    }
}
