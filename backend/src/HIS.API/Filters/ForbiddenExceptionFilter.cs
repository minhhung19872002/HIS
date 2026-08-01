using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HIS.API.Filters;

/// <summary>
/// #369 (AUTHZ-3): map <see cref="UnauthorizedAccessException"/> → **403 Forbidden**.
///
/// Trước đây guard quan hệ điều trị (`EnsureCanAccessPatientAsync`) ném
/// UnauthorizedAccessException nhưng không có filter nào bắt → rơi vào catch-all và trả
/// **500**. Smoke pilot 2 bác sĩ (2026-08-02) xác nhận: BS không có quan hệ điều trị bị
/// chặn ĐÚNG, nhưng client nhận 500 nên không phân biệt được "bị từ chối quyền" với
/// "hệ thống lỗi" — sai Acceptance của #369 ("403") và làm FE hiện thông báo sai.
///
/// 403 (KHÔNG phải 401): user ĐÃ xác thực hợp lệ, chỉ là không đủ quyền trên tài nguyên
/// này — trả 401 sẽ khiến interceptor FE tưởng token hết hạn và chạy refresh vô ích.
///
/// Đã có tiền lệ map thủ công y hệt trong RISCompleteController (per-modality permission)
/// — filter này chuẩn hoá cho toàn hệ thống, các chỗ map tay vẫn hoạt động như cũ
/// (chúng trả 403 trước khi exception nổi lên tới đây).
/// </summary>
public sealed class ForbiddenExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ForbiddenExceptionFilter> _logger;
    public ForbiddenExceptionFilter(ILogger<ForbiddenExceptionFilter> logger) => _logger = logger;

    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not UnauthorizedAccessException ex) return;

        _logger.LogWarning("Forbidden on {Path}: {Msg}", context.HttpContext.Request.Path, ex.Message);

        context.Result = new ObjectResult(new
        {
            error = "FORBIDDEN",
            message = ex.Message,
        })
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
        context.ExceptionHandled = true;
    }
}
