using System.Collections.Generic;
using System.Linq;
using HIS.Core.Common;
using Xunit;

namespace HIS.Tests.Services.Insurance;

/// <summary>
/// R3: BHYT split computed at order time (Luật BHYT 2014 art.22, NĐ 146/2018 art.14). Before, every order and
/// prescription stored InsuranceAmount = 0, so insured patients were billed the full price.
/// </summary>
public class BhytCoverageCalculatorTests
{
    private const decimal Salary = 2_340_000m; // 15% = 351,000

    private static BhytVisitContext Ctx(int? benefit = 80, int route = 1, int? level = null,
        bool inpatient = false, bool emergency = false, bool referral = false) => new()
    {
        BenefitPercent = benefit,
        Route = route,
        HospitalLevel = level,
        IsInpatient = inpatient,
        IsEmergency = emergency,
        HasReferral = referral,
        BaseSalary = Salary,
    };

    private static BhytLineInput Line(decimal price, decimal qty = 1, decimal bhytPrice = 0, bool covered = true, decimal rate = 100)
        => new() { UnitPrice = price, Quantity = qty, InsurancePrice = bhytPrice, IsCovered = covered, ItemPaymentRatePercent = rate };

    [Fact]
    public void Correct_route_above_threshold_pays_card_level_of_the_bhyt_price()
    {
        // 500,000 service, BHYT price 400,000 → base 400,000 ≥ 351,000 → 80% = 320,000; patient 180,000
        var r = BhytCoverageCalculator.Calculate(Ctx(), new[] { Line(500_000, bhytPrice: 400_000) });
        Assert.False(r.BelowFifteenPercentThreshold);
        Assert.Equal(320_000m, r.Lines[0].InsuranceAmount);
        Assert.Equal(180_000m, r.Lines[0].PatientAmount);
        Assert.Equal(80, r.EffectivePercent);
    }

    [Fact]
    public void Visit_below_fifteen_percent_of_base_salary_is_fully_covered()
    {
        // lab 27,000 + x-ray 62,000 at BHYT price (hospital 35,000 / 80,000) → base 89,000 < 351,000 → 100%
        var r = BhytCoverageCalculator.Calculate(Ctx(benefit: 80),
            new[] { Line(35_000, bhytPrice: 27_000), Line(80_000, bhytPrice: 62_000) });
        Assert.True(r.BelowFifteenPercentThreshold);
        Assert.Equal(100, r.BenefitPercent);
        Assert.Equal(89_000m, r.TotalInsurance);
        Assert.Equal(26_000m, r.TotalPatient); // only the price difference
    }

    [Fact]
    public void Threshold_uses_the_whole_visit_not_one_line()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(benefit: 80),
            new[] { Line(200_000), Line(200_000) }); // 400,000 total ≥ 351,000
        Assert.False(r.BelowFifteenPercentThreshold);
        Assert.All(r.Lines, l => Assert.Equal(160_000m, l.InsuranceAmount));
    }

    [Fact]
    public void Te1_child_card_is_100_percent()
    {
        Assert.Equal(100, BhytCoverageCalculator.ResolveBenefitPercent(null, "TE1461234567890"));
        var r = BhytCoverageCalculator.Calculate(Ctx(benefit: 100), new[] { Line(1_000_000) });
        Assert.Equal(1_000_000m, r.Lines[0].InsuranceAmount);
        Assert.Equal(0m, r.Lines[0].PatientAmount);
    }

    [Fact]
    public void Stored_coverage_rate_wins_over_the_card_digit()
        => Assert.Equal(95, BhytCoverageCalculator.ResolveBenefitPercent(95, "DN4461234567890"));

    [Fact]
    public void Not_covered_item_gets_no_insurance()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(), new[] { Line(600_000, covered: false), Line(400_000) });
        Assert.Equal(0m, r.Lines[0].InsuranceAmount);
        Assert.Equal(600_000m, r.Lines[0].PatientAmount);
        Assert.Equal(0, r.Lines[0].AppliedPercent);
        Assert.Equal(320_000m, r.Lines[1].InsuranceAmount); // base 400,000 alone decides the threshold
    }

    [Fact]
    public void Item_payment_ratio_reduces_the_insured_base()
    {
        // TY_LE_TT 50%: base 250,000 of a 500,000 drug; visit base 250,000 + 400,000 = 650,000 → 80%
        var r = BhytCoverageCalculator.Calculate(Ctx(), new[] { Line(500_000, rate: 50), Line(400_000) });
        Assert.Equal(250_000m, r.Lines[0].InsuredBase);
        Assert.Equal(200_000m, r.Lines[0].InsuranceAmount);
        Assert.Equal(300_000m, r.Lines[0].PatientAmount);
    }

    [Fact]
    public void Bhyt_price_above_hospital_price_is_capped_at_hospital_price()
        => Assert.Equal(100_000m, BhytCoverageCalculator.InsuredBase(Line(100_000, bhytPrice: 150_000)));

    [Theory]
    // trái tuyến outpatient
    [InlineData(BhytCoverageCalculator.LevelCommune, false, 100)]
    [InlineData(BhytCoverageCalculator.LevelDistrict, false, 100)]
    [InlineData(BhytCoverageCalculator.LevelProvincial, false, 0)]
    [InlineData(BhytCoverageCalculator.LevelCentral, false, 0)]
    // trái tuyến inpatient
    [InlineData(BhytCoverageCalculator.LevelDistrict, true, 100)]
    [InlineData(BhytCoverageCalculator.LevelProvincial, true, 100)]
    [InlineData(BhytCoverageCalculator.LevelCentral, true, 40)]
    public void Wrong_route_factor_by_facility_level(int level, bool inpatient, int expected)
    {
        Assert.Equal(expected, BhytCoverageCalculator.RouteFactorPercent(Ctx(route: 2, level: level, inpatient: inpatient), out var w));
        Assert.Null(w);
        Assert.Equal(expected, BhytCoverageCalculator.RouteFactorPercent(Ctx(route: 3, level: level, inpatient: inpatient), out _));
    }

    [Fact]
    public void Central_inpatient_wrong_route_pays_40_percent_of_benefit_and_skips_the_15_percent_rule()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(benefit: 80, route: 2, level: BhytCoverageCalculator.LevelCentral, inpatient: true),
            new[] { Line(100_000) }); // small visit, but reduced route → no 100%
        Assert.False(r.BelowFifteenPercentThreshold);
        Assert.Equal(32, r.EffectivePercent);
        Assert.Equal(32_000m, r.Lines[0].InsuranceAmount);
    }

    [Fact]
    public void Wrong_route_outpatient_at_provincial_level_pays_nothing()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(route: 2, level: BhytCoverageCalculator.LevelProvincial),
            new[] { Line(50_000) });
        Assert.Equal(0m, r.TotalInsurance);
        Assert.Equal(50_000m, r.TotalPatient);
    }

    [Theory]
    [InlineData(true, false)]  // emergency
    [InlineData(false, true)]  // referral letter
    public void Emergency_or_referral_counts_as_correct_route(bool emergency, bool referral)
        => Assert.Equal(100, BhytCoverageCalculator.RouteFactorPercent(
            Ctx(route: 2, level: BhytCoverageCalculator.LevelCentral, emergency: emergency, referral: referral), out _));

    [Fact]
    public void Missing_route_flag_is_treated_as_correct_route_with_a_warning()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(route: 0), new[] { Line(500_000) });
        Assert.Equal(100, r.RouteFactorPercent);
        Assert.Contains(r.Warnings, w => w.Contains("tuyến KCB"));
    }

    [Fact]
    public void Unconfigured_hospital_level_does_not_cut_benefits_and_warns()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(route: 2, level: null), new[] { Line(500_000) });
        Assert.Equal(100, r.RouteFactorPercent);
        Assert.Contains(r.Warnings, w => w.Contains("BHYT.HospitalLevel"));
    }

    [Fact]
    public void Unknown_benefit_falls_back_to_80_with_a_warning()
    {
        var r = BhytCoverageCalculator.Calculate(Ctx(benefit: null), new[] { Line(500_000) });
        Assert.Equal(80, r.BenefitPercent);
        Assert.NotEmpty(r.Warnings);
    }

    [Fact]
    public void Base_salary_default_and_threshold()
    {
        Assert.Equal(351_000m, BhytCoverageCalculator.FifteenPercentThreshold(0));
        Assert.Equal(351_000m, BhytCoverageCalculator.FifteenPercentThreshold(Salary));
        var justBelow = BhytCoverageCalculator.Calculate(Ctx(), new[] { Line(350_999) });
        var atThreshold = BhytCoverageCalculator.Calculate(Ctx(), new[] { Line(351_000) });
        Assert.True(justBelow.BelowFifteenPercentThreshold);
        Assert.False(atThreshold.BelowFifteenPercentThreshold);
    }

    [Fact]
    public void Line_amount_always_equals_insurance_plus_patient()
    {
        var lines = new List<BhytLineInput> { Line(33_333, 3, 27_777, rate: 70), Line(12_345, 7), Line(999, 2, covered: false) };
        var r = BhytCoverageCalculator.Calculate(Ctx(benefit: 95), lines);
        Assert.All(r.Lines, l => Assert.Equal(l.Amount, l.InsuranceAmount + l.PatientAmount));
        Assert.Equal(r.TotalAmount, r.Lines.Sum(l => l.InsuranceAmount + l.PatientAmount));
    }
}
