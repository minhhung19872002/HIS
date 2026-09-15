namespace HIS.Core.Common;

/// <summary>
/// NRS-2002 nutritional risk screening (Kondrup 2003), QA round 3.
/// Total = impaired nutritional status (the WORST of BMI / weight loss / food intake, 0-3)
///       + severity of disease (0-3)
///       + age adjustment (age ≥ 70 → +1).
/// The old code SUMMED the three nutrition items (a patient scoring 1+1+1 read as 3 nutrition points) and never
/// added the age point. Risk labels are unchanged: total ≥ 3 = at risk (High), 2 = Medium, otherwise Low.
/// </summary>
public static class Nrs2002Calculator
{
    public sealed record Result(int NutritionScore, int DiseaseScore, int AgeScore, int TotalScore, string RiskLevel)
    {
        public bool RequiresIntervention => TotalScore >= 3;
    }

    /// <param name="nutritionItems">Item scores for BMI, weight loss and food intake (nulls ignored). When none is
    /// given, <paramref name="legacyNutritionScore"/> (an already-combined 0-3 score) is used.</param>
    public static Result Calculate(IEnumerable<int?> nutritionItems, int legacyNutritionScore, int diseaseScore, int? ageYears)
    {
        var items = nutritionItems.Where(i => i.HasValue).Select(i => Clamp(i!.Value)).ToList();
        var nutrition = items.Count > 0 ? items.Max() : Clamp(legacyNutritionScore);
        var disease = Clamp(diseaseScore);
        var age = ageYears is >= 70 ? 1 : 0;
        var total = nutrition + disease + age;
        return new Result(nutrition, disease, age, total, RiskLevelOf(total));
    }

    public static string RiskLevelOf(int total) => total >= 3 ? "High" : total == 2 ? "Medium" : "Low";

    private static int Clamp(int score) => Math.Clamp(score, 0, 3);
}
