using System.Text.Json.Serialization;

namespace HIS.PatientApp.Api.Connector;

/// <summary>
/// Vỏ bọc response chuẩn của HIS Core: <c>{ success, data, message }</c>.
/// </summary>
public class HisEnvelope<T>
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")] public T? Data { get; set; }
    [JsonPropertyName("message")] public string? Message { get; set; }
}

/// <summary>
/// Bệnh nhân theo góc nhìn của app. CỐ Ý hẹp hơn <c>PatientDto</c> của HIS: BFF chỉ lấy những trường
/// app thật sự hiển thị, để không vô tình mang dữ liệu thừa ra Internet.
/// </summary>
public class HisPatient
{
    [JsonPropertyName("id")] public Guid Id { get; set; }
    [JsonPropertyName("patientCode")] public string PatientCode { get; set; } = string.Empty;
    [JsonPropertyName("fullName")] public string FullName { get; set; } = string.Empty;
    [JsonPropertyName("dateOfBirth")] public DateTime? DateOfBirth { get; set; }
    [JsonPropertyName("gender")] public int Gender { get; set; }
    [JsonPropertyName("genderName")] public string? GenderName { get; set; }
    [JsonPropertyName("phoneNumber")] public string? PhoneNumber { get; set; }
    [JsonPropertyName("identityNumber")] public string? IdentityNumber { get; set; }
    [JsonPropertyName("insuranceNumber")] public string? InsuranceNumber { get; set; }
    [JsonPropertyName("insuranceExpireDate")] public DateTime? InsuranceExpireDate { get; set; }
    [JsonPropertyName("address")] public string? Address { get; set; }
}

/// <summary>Kết quả đăng nhập của HIS Core — dùng cho tài khoản dịch vụ của connector.</summary>
public class HisLoginResult
{
    [JsonPropertyName("token")] public string Token { get; set; } = string.Empty;
    [JsonPropertyName("refreshToken")] public string? RefreshToken { get; set; }
    [JsonPropertyName("expiresAt")] public DateTime ExpiresAt { get; set; }
}

/// <summary>Trang kết quả tìm kiếm của HIS (<c>PagedResultDto&lt;T&gt;</c>).</summary>
public class HisPagedResult<T>
{
    [JsonPropertyName("items")] public List<T> Items { get; set; } = new();
    [JsonPropertyName("totalCount")] public int TotalCount { get; set; }
}

/// <summary>
/// Lỗi khi gọi HIS. Tách riêng để controller phân biệt được "HIS trả 404" với "không gọi được HIS" —
/// hai thứ này cần thông điệp khác nhau cho người bệnh.
/// </summary>
public class HisConnectorException : Exception
{
    public HisConnectorException(string message, int? statusCode = null, Exception? inner = null)
        : base(message, inner) => StatusCode = statusCode;

    /// <summary>Mã HTTP mà HIS trả về; null nghĩa là không kết nối được tới HIS.</summary>
    public int? StatusCode { get; }

    public bool IsUnavailable => StatusCode is null;
}
