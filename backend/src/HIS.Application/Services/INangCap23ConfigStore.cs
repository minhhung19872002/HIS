namespace HIS.Application.Services;

/// <summary>
/// Persistence cho cấu hình NangCap23 (cổng QG / Đề án 06 / Zalo OA).
///
/// Key format: <c>NangCap23.{Module}.{Setting}</c>
///   ví dụ: NangCap23.NationalGateway.MockMode
///          NangCap23.NationalGateway.Prescription.ApiKey  (encrypted)
///          NangCap23.Zalo.AccessToken                     (encrypted)
///
/// Backed bởi bảng <c>SystemConfigs</c>. Implementation chịu trách nhiệm:
///   - encrypt giá trị nhạy cảm (ApiKey, AccessToken, Password) bằng IDataProtectionProvider
///   - decrypt khi đọc
///   - upsert idempotent (CreatedAt/UpdatedAt audit)
///   - fallback về appsettings (IConfiguration) khi key chưa có trong DB
///
/// Service layer chỉ cần gọi <see cref="GetOrFallbackAsync"/> để có giá trị đúng,
/// và <see cref="SaveAsync"/> để persist từ UI/admin endpoint.
/// </summary>
public interface INangCap23ConfigStore
{
    /// <summary>
    /// Đọc giá trị từ DB; nếu không có thì fallback về <paramref name="fallback"/>
    /// (thường là <c>IConfiguration[fullKey]</c>). Sensitive key được decrypt tự động.
    /// </summary>
    Task<string?> GetOrFallbackAsync(string fullKey, string? fallback = null, CancellationToken ct = default);

    Task<bool> GetBoolAsync(string fullKey, bool fallback, CancellationToken ct = default);
    Task<int> GetIntAsync(string fullKey, int fallback, CancellationToken ct = default);

    /// <summary>
    /// Upsert config row. Sensitive value (chứa "Token", "Key", "Password") được encrypt.
    /// Trả về số row affected. Trong cùng 1 transaction nếu caller bắt đầu transaction.
    /// </summary>
    Task<int> SaveAsync(IDictionary<string, string?> keyValues, string? userId, CancellationToken ct = default);

    /// <summary>Đánh dấu key là sensitive — sẽ được encrypt khi save / decrypt khi load.</summary>
    bool IsSensitiveKey(string fullKey);
}
