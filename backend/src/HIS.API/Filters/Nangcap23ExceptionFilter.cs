using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Filters;

/// <summary>
/// Map domain exception sang HTTP status code phù hợp cho NangCap23 controllers.
///
///   ArgumentException            → 400 Bad Request   (DTO validation fail)
///   InvalidOperationException    → 400 Bad Request   (state machine guard fail)
///   KeyNotFoundException         → 404 Not Found     (entity không tồn tại)
///   JsonException                → 400 Bad Request   (malformed JSON từ DB hoặc payload)
///   DbUpdateException + UNIQUE   → 409 Conflict      (race-condition duplicate)
///   DbUpdateException khác       → 500 (log + masked message)
///   OperationCanceledException   → 499 Client Closed (user huỷ giữa chừng)
///
/// Filter chỉ apply cho controller có attribute [TypeFilter(typeof(Nangcap23ExceptionFilter))]
/// — không global để tránh ảnh hưởng module khác.
/// </summary>
public sealed class Nangcap23ExceptionFilter : IExceptionFilter
{
    private readonly ILogger<Nangcap23ExceptionFilter> _logger;
    public Nangcap23ExceptionFilter(ILogger<Nangcap23ExceptionFilter> logger) => _logger = logger;

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
                _logger.LogInformation("NangCap23 validation: {Msg}", argEx.Message);
                break;
            case InvalidOperationException invEx:
                context.Result = new BadRequestObjectResult(new
                {
                    error = "INVALID_STATE",
                    message = invEx.Message
                });
                context.ExceptionHandled = true;
                _logger.LogInformation("NangCap23 state guard: {Msg}", invEx.Message);
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
                _logger.LogInformation("NangCap23 invalid JSON: {Msg}", jsEx.Message);
                break;
            case DbUpdateException dbEx when IsUniqueViolation(dbEx):
                context.Result = new ConflictObjectResult(new
                {
                    error = "DUPLICATE",
                    message = "Bản ghi này đã tồn tại. Vui lòng refresh danh sách."
                });
                context.ExceptionHandled = true;
                _logger.LogWarning("NangCap23 unique violation: {Msg}", dbEx.InnerException?.Message);
                break;
            case OperationCanceledException:
                // 499 Client Closed Request (Nginx convention; ASP.NET không có sẵn enum)
                context.Result = new StatusCodeResult(499);
                context.ExceptionHandled = true;
                _logger.LogInformation("NangCap23 request cancelled by client");
                break;
            // Default → middleware error handler chung xử lý + log
        }
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
        => ex.InnerException is SqlException sql && (sql.Number == 2601 || sql.Number == 2627);
}
