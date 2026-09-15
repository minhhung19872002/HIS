namespace HIS.Core.Constants;

/// <summary>
/// Continuing medical education (đào tạo liên tục / CME) requirement for practitioners.
/// Nghị định 96/2023/NĐ-CP: at least 120 tiết per 5-year cycle → 24 tiết per year.
/// QA-R3: HR used 24 while Training defaulted to 48 — one value for both.
/// </summary>
public static class CmeRequirement
{
    public const int HoursPerCycle = 120;
    public const int CycleYears = 5;
    public const int HoursPerYear = HoursPerCycle / CycleYears; // 24
}
