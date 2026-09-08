namespace HIS.PatientApp.Api;

/// <summary>
/// Tên các chính sách giới hạn tần suất. Đây là API mở ra Internet nên mọi đường ẩn danh đều phải
/// có giới hạn — khảo sát cho thấy <c>POST /api/portal/login</c> của HIS thiếu đúng điều này.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>Đăng nhập / đăng ký / làm mới / đặt lại mật khẩu.</summary>
    public const string Auth = "auth";

    /// <summary>Xin mã OTP — chặt hơn, vì mỗi lần gọi là một tin nhắn tốn tiền gửi đi.</summary>
    public const string Otp = "otp";
}
