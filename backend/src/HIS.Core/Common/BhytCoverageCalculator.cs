using System;
using System.Collections.Generic;
using System.Linq;

namespace HIS.Core.Common;

/// <summary>Visit-level facts the BHYT split depends on (one "lần khám chữa bệnh").</summary>
public sealed class BhytVisitContext
{
    /// <summary>Card benefit level (mức hưởng) 80/95/100. Null → derived from the card, then 80.</summary>
    public int? BenefitPercent { get; init; }

    /// <summary>MedicalRecords.InsuranceRightRoute: 1 đúng tuyến · 2 trái tuyến · 3 thông tuyến · other = not recorded.</summary>
    public int Route { get; init; }

    /// <summary>Patient brought a referral letter (giấy chuyển tuyến) → treated as đúng tuyến.</summary>
    public bool HasReferral { get; init; }

    /// <summary>Emergency visit (cấp cứu) → route rule waived.</summary>
    public bool IsEmergency { get; init; }

    /// <summary>Inpatient stay (điều trị nội trú) — trái tuyến rates differ from outpatient.</summary>
    public bool IsInpatient { get; init; }

    /// <summary>Facility level (tuyến CMKT): 1 trung ương · 2 tỉnh · 3 huyện · 4 xã · null = not configured.</summary>
    public int? HospitalLevel { get; init; }

    /// <summary>Lương cơ sở (VND). ≤ 0 → <see cref="BhytCoverageCalculator.DefaultBaseSalary"/>.</summary>
    public decimal BaseSalary { get; init; }
}

/// <summary>One billable line (service, medicine, supply, bed day).</summary>
public sealed class BhytLineInput
{
    public decimal UnitPrice { get; init; }
    public decimal Quantity { get; init; }

    /// <summary>BHYT price (giá BHYT). 0 = the catalog has no separate BHYT price → the hospital price is used.</summary>
    public decimal InsurancePrice { get; init; }

    /// <summary>Item is in the BHYT list AND the doctor did not mark the line as self-pay.</summary>
    public bool IsCovered { get; init; }

    /// <summary>Item payment ratio TY_LE_TT (0-100).</summary>
    public decimal ItemPaymentRatePercent { get; init; } = 100;
}

public sealed class BhytLineResult
{
    /// <summary>THANH_TIEN_BV = unit price × quantity (hospital price, what the line costs).</summary>
    public decimal Amount { get; init; }

    /// <summary>THANH_TIEN_BH = min(BHYT price, unit price) × quantity × TY_LE_TT; 0 when not covered.</summary>
    public decimal InsuredBase { get; init; }

    /// <summary>T_BHTT — paid by the fund.</summary>
    public decimal InsuranceAmount { get; init; }

    /// <summary>Everything the patient pays for the line (co-pay + price difference + non-covered).</summary>
    public decimal PatientAmount { get; init; }

    /// <summary>Benefit × route actually applied to this line (0-100), for PrescriptionDetails/ServiceRequestDetails.InsurancePaymentRate.</summary>
    public int AppliedPercent { get; init; }
}

public sealed class BhytVisitResult
{
    public IReadOnlyList<BhytLineResult> Lines { get; init; } = Array.Empty<BhytLineResult>();

    /// <summary>Mức hưởng after the 15% rule (card level or 100).</summary>
    public int BenefitPercent { get; init; }

    /// <summary>Route factor 0/40/100.</summary>
    public int RouteFactorPercent { get; init; }

    /// <summary>BenefitPercent × RouteFactorPercent / 100 — the rate stamped on claims (MUC_HUONG).</summary>
    public int EffectivePercent { get; init; }

    public bool BelowFifteenPercentThreshold { get; init; }
    public IReadOnlyList<string> Warnings { get; init; } = Array.Empty<string>();

    public decimal TotalAmount => Lines.Sum(l => l.Amount);
    public decimal TotalInsuredBase => Lines.Sum(l => l.InsuredBase);
    public decimal TotalInsurance => Lines.Sum(l => l.InsuranceAmount);
    public decimal TotalPatient => Lines.Sum(l => l.PatientAmount);
}

/// <summary>
/// Pure BHYT cost split for one visit — the single place the rules live (orders, prescriptions and claims all call it).
/// <code>
/// A  (THANH_TIEN_BV) = UnitPrice × Qty                              — hospital price, unchanged
/// B  (THANH_TIEN_BH) = min(BhytPrice|UnitPrice, UnitPrice) × Qty × TY_LE_TT%   — 0 when the line is not covered
/// M  mức hưởng       = MR.InsuranceCoverageRate → card 3rd char (BhytCardNumber.BenefitPercentOf) → 80
/// R  route factor    = 100 if emergency · đúng tuyến · referral letter · route not recorded · facility level not configured;
///                      trái/thông tuyến (flag 2/3): xã/huyện → 100 (thông tuyến huyện, Luật BHYT 2014 art.22.4);
///                      tỉnh → nội trú 100 (thông tuyến tỉnh from 01/01/2021), ngoại trú 0;
///                      trung ương → nội trú 40, ngoại trú 0 (art.22.3)
/// 15% rule           : R = 100 and ΣB of the whole visit &lt; 15% × lương cơ sở → M = 100 (art.22.1.e; NĐ 146/2018 art.14 —
///                      not applied to reduced trái-tuyến visits)
/// T_BHTT = round(B × M% × R%) · patient = A − T_BHTT
/// </code>
/// </summary>
public static class BhytCoverageCalculator
{
    public const decimal DefaultBaseSalary = 2_340_000m;
    public const int DefaultBenefitPercent = 80;
    public const decimal FifteenPercent = 0.15m;

    public const int LevelCentral = 1;
    public const int LevelProvincial = 2;
    public const int LevelDistrict = 3;
    public const int LevelCommune = 4;

    public static decimal FifteenPercentThreshold(decimal baseSalary)
        => Math.Round((baseSalary > 0 ? baseSalary : DefaultBaseSalary) * FifteenPercent, 0, MidpointRounding.AwayFromZero);

    /// <summary>Route factor (0-100) and, when a rule could not be applied from data, a warning.</summary>
    public static int RouteFactorPercent(BhytVisitContext ctx, out string? warning)
    {
        warning = null;
        if (ctx.IsEmergency || ctx.HasReferral || ctx.Route == 1) return 100;
        if (ctx.Route != 2 && ctx.Route != 3)
        {
            warning = "Hồ sơ chưa ghi tuyến KCB — tạm tính đúng tuyến.";
            return 100;
        }
        switch (ctx.HospitalLevel)
        {
            case LevelCommune:
            case LevelDistrict:
                return 100;
            case LevelProvincial:
                return ctx.IsInpatient ? 100 : 0;
            case LevelCentral:
                return ctx.IsInpatient ? 40 : 0;
            default:
                warning = "Chưa cấu hình tuyến bệnh viện (BHYT.HospitalLevel) — chưa áp dụng giảm mức hưởng trái tuyến.";
                return 100;
        }
    }

    public static decimal InsuredBase(BhytLineInput line)
    {
        if (!line.IsCovered || line.Quantity <= 0 || line.UnitPrice < 0) return 0;
        var rate = Math.Clamp(line.ItemPaymentRatePercent, 0, 100);
        var price = line.InsurancePrice > 0 ? Math.Min(line.InsurancePrice, line.UnitPrice) : line.UnitPrice;
        return Math.Round(price * line.Quantity * rate / 100m, 2, MidpointRounding.AwayFromZero);
    }

    public static BhytVisitResult Calculate(BhytVisitContext ctx, IReadOnlyList<BhytLineInput> lines)
    {
        var warnings = new List<string>();
        var routeFactor = RouteFactorPercent(ctx, out var routeWarning);
        if (routeWarning != null) warnings.Add(routeWarning);

        var cardLevel = ctx.BenefitPercent is > 0 and <= 100 ? ctx.BenefitPercent.Value : DefaultBenefitPercent;
        if (ctx.BenefitPercent is not (> 0 and <= 100))
            warnings.Add($"Không xác định được mức hưởng — tạm tính {DefaultBenefitPercent}%.");

        var bases = lines.Select(InsuredBase).ToList();
        var visitBase = bases.Sum();
        var below = routeFactor == 100 && visitBase < FifteenPercentThreshold(ctx.BaseSalary);
        var benefit = below ? 100 : cardLevel;
        var effective = benefit * routeFactor / 100;

        var results = lines.Select(l => SplitLine(l, benefit, routeFactor)).ToList();

        return new BhytVisitResult
        {
            Lines = results,
            BenefitPercent = benefit,
            RouteFactorPercent = routeFactor,
            EffectivePercent = effective,
            BelowFifteenPercentThreshold = below,
            Warnings = warnings,
        };
    }

    /// <summary>
    /// Split ONE line once the visit-level benefit (after the 15% rule) and route factor are known:
    /// T_BHTT = round(B × benefit% × route%), capped at the line amount; patient = amount − T_BHTT.
    /// <see cref="Calculate"/> uses it for every line; single-item estimates (no visit yet) call it directly.
    /// </summary>
    public static BhytLineResult SplitLine(BhytLineInput line, int benefitPercent, int routeFactorPercent)
    {
        var amount = Math.Round(line.UnitPrice * line.Quantity, 2, MidpointRounding.AwayFromZero);
        var insuredBase = InsuredBase(line);
        var insurance = Math.Round(insuredBase * benefitPercent * routeFactorPercent / 10000m, 0, MidpointRounding.AwayFromZero);
        if (insurance > amount) insurance = amount;
        if (insurance < 0) insurance = 0;
        return new BhytLineResult
        {
            Amount = amount,
            InsuredBase = insuredBase,
            InsuranceAmount = insurance,
            PatientAmount = amount - insurance,
            AppliedPercent = insuredBase > 0 ? benefitPercent * routeFactorPercent / 100 : 0,
        };
    }

    /// <summary>Benefit level for a record: stored rate first, then the card's 3rd character.</summary>
    public static int? ResolveBenefitPercent(int? storedRate, string? cardNumber)
        => storedRate is > 0 and <= 100 ? storedRate : BhytCardNumber.BenefitPercentOf(cardNumber);
}
