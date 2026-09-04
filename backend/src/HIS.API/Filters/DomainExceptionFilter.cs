using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Filters;

/// <summary>
/// Map domain exception sang HTTP status code phù hợp (dùng chung mọi module, vd NangCap23/NangCap24).
///
///   ArgumentException            → 400 Bad Request   (DTO validation fail)
///   InvalidOperationException    → 400 Bad Request   (state machine guard fail / xung đột nghiệp vụ)
///   NotSupportedException        → 400 Bad Request   (tuỳ chọn chưa hỗ trợ — trả lý do thật)
///   KeyNotFoundException         → 404 Not Found     (entity không tồn tại)
///   JsonException                → 400 Bad Request   (malformed JSON từ DB hoặc payload)
///   DbUpdateConcurrencyException → 409 Conflict      (RowVersion chặn lost-update; đã có sẵn,
///                                                    chỉ thiếu ở controller tự bắt Exception)
///   DbUpdateException + UNIQUE   → 409 Conflict      (race-condition duplicate)
///   DbUpdateException khác       → 500 (log + masked message)
///   OperationCanceledException   → 499 Client Closed (user huỷ giữa chừng)
///
/// Filter chỉ apply cho controller có attribute [TypeFilter(typeof(DomainExceptionFilter))]
/// — không global để tránh ảnh hưởng module khác.
/// </summary>
public sealed class DomainExceptionFilter : IExceptionFilter
{
    private readonly ILogger<DomainExceptionFilter> _logger;
    public DomainExceptionFilter(ILogger<DomainExceptionFilter> logger) => _logger = logger;

    public void OnException(ExceptionContext context)
    {
        switch (context.Exception)
        {
            case ArgumentException argEx:
                context.Result = new BadRequestObjectResult(new
                {
                    error = "VALIDATION_FAILED",
                    message = argEx.Message,
                    field = argEx.ParamName
                });
                context.ExceptionHandled = true;
                _logger.LogInformation("Domain validation: {Msg}", argEx.Message);
                break;
            case InvalidOperationException invEx:
                context.Result = new BadRequestObjectResult(new
                {
                    error = "INVALID_STATE",
                    message = invEx.Message
                });
                context.ExceptionHandled = true;
                _logger.LogInformation("Domain state guard: {Msg}", invEx.Message);
                break;
            case UnauthorizedAccessException forbidEx:
                // #369 (AUTHZ-3): guard quan hệ điều trị / permission ném UnauthorizedAccessException.
                // Phải là 403 (user đã xác thực, chỉ thiếu quyền trên tài nguyên) — KHÔNG phải 401,
                // vì 401 khiến interceptor FE tưởng token hết hạn và chạy refresh vô ích.
                // Trước đây rơi xuống catch-all → 500, smoke pilot 2 bác sĩ phát hiện.
                context.Result = new ObjectResult(new
                {
                    error = "FORBIDDEN",
                    message = forbidEx.Message
                })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                context.ExceptionHandled = true;
                _logger.LogWarning("Forbidden on {Path}: {Msg}",
                    context.HttpContext.Request.Path, forbidEx.Message);
                break;
            case NotSupportedException nsEx:
                // Client chọn một tuỳ chọn hệ thống chưa hỗ trợ (loại báo cáo, kiểu kết nối,
                // trigger type...). Trả thông điệp thật thay vì 500 che mất lý do.
                context.Result = new BadRequestObjectResult(new
                {
                    error = "NOT_SUPPORTED",
                    message = nsEx.Message
                });
                context.ExceptionHandled = true;
                _logger.LogInformation("Domain unsupported option: {Msg}", nsEx.Message);
                break;
            case KeyNotFoundException kEx:
                context.Result = new NotFoundObjectResult(new
                {
                    error = "NOT_FOUND",
                    message = kEx.Message
                });
                context.ExceptionHandled = true;
                break;
            case JsonException jsEx:
                context.Result = new BadRequestObjectResult(new
                {
                    error = "INVALID_JSON",
                    message = "Dữ liệu JSON không hợp lệ: " + jsEx.Message
                });
                context.ExceptionHandled = true;
                _logger.LogInformation("Domain invalid JSON: {Msg}", jsEx.Message);
                break;
            case DbUpdateConcurrencyException:
                // #188: xung đột optimistic-concurrency (tồn kho/số dư bị sửa đồng thời) → 409, KHÔNG ghi đè mù (chống oversell/lost-update).
                context.Result = new ConflictObjectResult(new
                {
                    error = "CONCURRENCY_CONFLICT",
                    message = "Dữ liệu (tồn kho/số dư) vừa bị thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại."
                });
                context.ExceptionHandled = true;
                _logger.LogWarning("Concurrency conflict: {Msg}", context.Exception.Message);
                break;
            case DbUpdateException dbEx when IsUniqueViolation(dbEx):
                context.Result = new ConflictObjectResult(new
                {
                    error = "DUPLICATE",
                    message = "Bản ghi này đã tồn tại. Vui lòng refresh danh sách."
                });
                context.ExceptionHandled = true;
                _logger.LogWarning("Domain unique violation: {Msg}", dbEx.InnerException?.Message);
                break;
            case OperationCanceledException:
                // 499 Client Closed Request (Nginx convention; ASP.NET không có sẵn enum)
                context.Result = new StatusCodeResult(499);
                context.ExceptionHandled = true;
                _logger.LogInformation("Domain request cancelled by client");
                break;
            default:
                // Catch-all cho exception không lường trước (SqlException, NullReference, ...)
                // → trả 500 JSON body cùng shape với các case khác (tránh body rỗng làm FE
                //   chỉ nhận "Network Error" generic). Stack trace KHÔNG leak vào response
                //   (chỉ vào log server-side để debug).
                // Reference: bug 2026-05-30 login prod 500 empty (SqlException UserId1 shadow FK).
                _logger.LogError(context.Exception,
                    "Unhandled exception in {Path}",
                    context.HttpContext.Request.Path);
                context.Result = new ObjectResult(new
                {
                    error = "INTERNAL_ERROR",
                    message = "Hệ thống đang gặp sự cố, vui lòng thử lại sau ít phút.",
                    traceId = context.HttpContext.TraceIdentifier
                })
                {
                    StatusCode = 500
                };
                context.ExceptionHandled = true;
                break;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
        => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
}
