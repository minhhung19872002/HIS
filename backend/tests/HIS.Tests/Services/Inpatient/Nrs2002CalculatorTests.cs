using HIS.Core.Common;
using Xunit;

namespace HIS.Tests.Services.Inpatient;

/// <summary>QA round 3: NRS-2002 = max(nutrition items) + disease severity + (age ≥ 70 ? 1 : 0).</summary>
public class Nrs2002CalculatorTests
{
    [Fact]
    public void Nutrition_status_is_the_worst_item_not_the_sum()
    {
        var r = Nrs2002Calculator.Calculate(new int?[] { 1, 1, 1 }, 0, 0, 40);
        Assert.Equal(1, r.NutritionScore);
        Assert.Equal(1, r.TotalScore);
        Assert.Equal("Low", r.RiskLevel);
    }

    [Fact]
    public void Age_70_adds_one_point()
    {
        var r = Nrs2002Calculator.Calculate(new int?[] { 1, 0, 0 }, 0, 1, 70);
        Assert.Equal(1, r.AgeScore);
        Assert.Equal(3, r.TotalScore);
        Assert.Equal("High", r.RiskLevel);
        Assert.True(r.RequiresIntervention);
    }

    [Fact]
    public void Age_69_adds_nothing()
        => Assert.Equal(0, Nrs2002Calculator.Calculate(new int?[] { 1 }, 0, 1, 69).AgeScore);

    [Fact]
    public void Unknown_age_adds_nothing()
        => Assert.Equal(0, Nrs2002Calculator.Calculate(new int?[] { 2 }, 0, 0, null).AgeScore);

    [Theory]
    [InlineData(0, 0, "Low")]
    [InlineData(1, 1, "Medium")]
    [InlineData(2, 1, "High")]
    [InlineData(3, 3, "High")]
    public void Label_thresholds_are_kept(int nutrition, int disease, string expected)
        => Assert.Equal(expected, Nrs2002Calculator.Calculate(new int?[] { nutrition }, 0, disease, 30).RiskLevel);

    [Fact]
    public void Legacy_combined_score_is_used_when_no_items_are_sent()
        => Assert.Equal(2, Nrs2002Calculator.Calculate(Array.Empty<int?>(), 2, 0, 30).NutritionScore);

    [Fact]
    public void Scores_are_clamped_to_the_0_to_3_scale()
    {
        var r = Nrs2002Calculator.Calculate(new int?[] { 9 }, 0, 7, 80);
        Assert.Equal(7, r.TotalScore); // 3 + 3 + 1 = the NRS-2002 maximum
    }
}
