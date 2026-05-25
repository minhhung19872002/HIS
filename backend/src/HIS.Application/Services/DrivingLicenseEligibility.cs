using HIS.Core.Entities;

namespace HIS.Application.Services;

/// <summary>
/// Tính toán điều kiện cấp giấy KSK lái xe theo TT 24/2023/TT-BYT.
/// Quy tắc nghiêm ngặt (High-New-2 + High-New-3):
///   - Server KHÔNG bao giờ tin giá trị <c>EligibleToDrive</c> từ client (BS có thể nhấn nhầm)
///   - Áp dụng đồng nhất TRƯỚC KHI persist tại CẢ Save và Submit
///   - Với hạng thương mại (B trở lên), BẮT BUỘC phải có test ma túy + cồn mới đủ điều kiện.
///     Nếu chưa test → coi như chưa đủ điều kiện (KHÔNG default to pass).
/// </summary>
public static class DrivingLicenseEligibility
{
    /// <summary>Ngưỡng cồn pháp lý (TT 24/2023 + Luật GTĐB) — 50 mg/100ml máu.</summary>
    public const decimal LegalAlcoholThresholdMgPercent = 50m;

    /// <summary>
    /// Hạng thương mại (lái xe có người/hàng hóa): B1, B2, C, D, E, F.
    /// Hạng cá nhân xe máy (A1, A2, A3) yêu cầu test tùy địa phương — mặc định không bắt buộc.
    /// </summary>
    public static bool IsCommercialClass(string? licenseClass)
    {
        if (string.IsNullOrWhiteSpace(licenseClass)) return false;
        var c = licenseClass.Trim().ToUpperInvariant();
        return c == "B" || c == "B1" || c == "B2"
            || c == "C" || c == "D" || c == "E" || c == "F"
            || c.StartsWith("F", StringComparison.Ordinal); // FB, FC, FD, FE
    }

    /// <summary>
    /// Tái tính <c>EligibleToDrive</c> trên entity. Mutate entity in-place.
    /// Trả về <c>true</c> nếu giá trị bị thay đổi (caller có thể log audit).
    /// </summary>
    public static bool Recompute(DrivingLicenseHealthCheck entity)
    {
        var original = entity.EligibleToDrive;

        var basicHealthOk =
            entity.ColorBlindNormal &&
            entity.HearingNormal &&
            entity.NeurologicalNormal &&
            entity.PsychiatricNormal;

        // High-New-3: với hạng thương mại, chưa test → KHÔNG cho pass (default-deny).
        // Hạng cá nhân (A*): permissive theo TT 24/2023 — chỉ cần làm khi BS yêu cầu.
        var commercial = IsCommercialClass(entity.LicenseClass);

        var drugOk = commercial
            ? entity.DrugTestPerformed && !entity.DrugTestPositive
            : (!entity.DrugTestPerformed || !entity.DrugTestPositive);

        var alcoholOk = commercial
            ? entity.AlcoholTestPerformed
              && (entity.AlcoholLevelMgPercent ?? 0m) < LegalAlcoholThresholdMgPercent
            : (!entity.AlcoholTestPerformed
               || (entity.AlcoholLevelMgPercent ?? 0m) < LegalAlcoholThresholdMgPercent);

        var computed = basicHealthOk && drugOk && alcoholOk;
        entity.EligibleToDrive = computed;
        return original != computed;
    }
}
