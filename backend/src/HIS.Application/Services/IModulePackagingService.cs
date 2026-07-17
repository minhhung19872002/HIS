namespace HIS.Application.Services;

/// <summary>
/// #405: cơ chế đóng gói module thương mại (doc 08 §7) — cờ EnabledModules trong SystemConfig.
/// KHÔNG phải security boundary (permission #367/#378 lo phần đó) — chỉ là packaging/ẩn-hiện.
/// </summary>
public interface IModulePackagingService
{
    /// <summary>Danh sách module đang bật (CORE luôn có mặt). Chưa cấu hình → Gói Phòng khám mặc định.</summary>
    Task<List<string>> GetEnabledModulesAsync();

    /// <summary>Cập nhật cờ. CORE không tắt được (tự union); mã ngoài catalog bị loại. Trả về danh sách sau khi lưu.</summary>
    Task<List<string>> SetEnabledModulesAsync(List<string> modules, string updatedBy);
}

/// <summary>Hằng số catalog module thương mại (doc 08 §7).</summary>
public static class CommercialModules
{
    /// <summary>6 module CORE — luôn bật, không cho tắt.</summary>
    public static readonly string[] Core =
        { "TIEPDON", "KHAMBENH", "DUOCKHO", "THUNGAN", "BAOCAO", "QUANTRI" };

    /// <summary>4 module toggle theo gói.</summary>
    public static readonly string[] Toggle = { "LIS", "CDHA", "BHYT", "NOITRU" };

    /// <summary>Nhãn đặc biệt: ~49 trang ngoài 10 module thương mại (ẩn mặc định, bật tường minh).</summary>
    public const string Extended = "extended";

    /// <summary>Toàn bộ giá trị hợp lệ của cờ.</summary>
    public static readonly HashSet<string> AllValid =
        new(Core.Concat(Toggle).Append(Extended), StringComparer.OrdinalIgnoreCase);

    /// <summary>Gói Phòng khám mặc định cho deploy MỚI (chưa có row config): CORE + LIS + CDHA + BHYT (KHÔNG NOITRU, KHÔNG extended).</summary>
    public static readonly string[] DefaultClinicPackage =
        Core.Concat(new[] { "LIS", "CDHA", "BHYT" }).ToArray();
}
