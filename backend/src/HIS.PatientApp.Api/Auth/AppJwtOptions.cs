namespace HIS.PatientApp.Api.Auth;

/// <summary>Cấu hình JWT do BFF tự phát cho app. Đọc từ section "AppJwt".</summary>
public class AppJwtOptions
{
    public const string SectionName = "AppJwt";

    /// <summary>
    /// Khoá ký. PHẢI đặt qua biến môi trường ở môi trường thật, tối thiểu 32 ký tự.
    /// Cố ý KHÔNG dùng chung khoá với HIS Core: token của app rò ra không được phép mở cửa vào HIS.
    /// </summary>
    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = "HIS.PatientApp";
    public string Audience { get; set; } = "HIS.PatientApp.Mobile";

    /// <summary>
    /// Access token ngắn hạn. Việc "giữ đăng nhập" của HSMT do refresh token đảm nhiệm, không phải
    /// bằng cách kéo dài access token — token dài mà rò ra thì không thu hồi kịp.
    /// </summary>
    public int AccessTokenMinutes { get; set; } = 15;

    /// <summary>Hạn refresh token. 60 ngày để người bệnh ít khi phải đăng nhập lại.</summary>
    public int RefreshTokenDays { get; set; } = 60;
}
