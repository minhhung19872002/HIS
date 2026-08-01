namespace HIS.Application.Services;

/// <summary>
/// AUTHZ-2 (#368): quản lý refresh token bền — cấp / xoay vòng / thu hồi. Lưu HASH (SHA-256), KHÔNG lưu plaintext.
/// Đồng thời mở/đóng UserSession (bảng M17 admin đọc) để có bản ghi phiên thật khi login/logout.
/// </summary>
public interface IRefreshTokenService
{
    /// <summary>Cấp refresh token mới cho user + mở UserSession. Trả plaintext (chỉ lần này) để FE lưu.</summary>
    Task<string> IssueAsync(Guid userId);

    /// <summary>
    /// Xoay vòng: xác thực plaintext FE gửi. Hợp lệ → revoke token cũ + cấp token mới (trả NewPlaintext).
    /// Token đã revoke bị dùng lại → ReuseDetected=true + revoke cả family. Không hợp lệ/hết hạn → Ok=false.
    /// </summary>
    Task<RefreshRotationResult> RotateAsync(string plaintext);

    /// <summary>Thu hồi 1 refresh token (logout đúng thiết bị) + đóng UserSession tương ứng.
    /// Chỉ revoke khi token thuộc về userId (ownership check — không cho user này tắt phiên user khác).</summary>
    Task RevokeAsync(Guid userId, string plaintext, string reason);

    /// <summary>#437: thu hồi bằng CHÍNH refresh token, KHÔNG cần userId — sở hữu plaintext token = đủ quyền
    /// tắt phiên của nó (userId lấy từ bản ghi token). Dùng cho idle-logout cookie-mode khi access token đã
    /// hết hạn ([Authorize] /logout không chạy được). Token không tồn tại → im lặng (không leak — chống probing).</summary>
    Task RevokeByTokenAsync(string plaintext, string reason);

    /// <summary>Thu hồi TẤT CẢ refresh token còn sống của user + đóng mọi session (đổi mật khẩu / force-logout / reuse).</summary>
    Task RevokeAllForUserAsync(Guid userId, string reason);
}

/// <summary>Kết quả xoay vòng refresh token (AUTHZ-2 #368).</summary>
public class RefreshRotationResult
{
    public bool Ok { get; set; }
    public Guid UserId { get; set; }
    public string? NewPlaintext { get; set; }
    public bool ReuseDetected { get; set; }
    public string FailReason { get; set; } = string.Empty;
}
