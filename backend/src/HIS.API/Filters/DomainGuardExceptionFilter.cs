using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Filters;

/// <summary>
/// Global safety net for business guards thrown by HIS services, registered like
/// <see cref="ForbiddenExceptionFilter"/>. Only 42 of ~200 controllers carry
/// <see cref="DomainExceptionFilter"/>; everywhere else a guard such as "không đủ tồn kho" or
/// "không tìm thấy phiếu" fell through to the production exception handler and the user saw the
/// generic 500 "Hệ thống đang gặp sự cố" instead of the reason (QA sweep 2026-09-15).
///
/// Deliberately narrow — unlike DomainExceptionFilter it is NOT a catch-all:
///   KeyNotFoundException thrown by HIS code      → 404
///   ArgumentException thrown by HIS code         → 400
///   InvalidOperationException thrown by HIS code → 400 (framework ones, e.g. an EF translation
///                                                   failure, stay 500 so real bugs are not
///                                                   disguised as client errors)
///   DbUpdateConcurrencyException                 → 409
/// Anything else, or an exception already handled by a controller-level filter, is left alone.
/// </summary>
public sealed class DomainGuardExceptionFilter : IExceptionFilter
{
    private readonly ILogger<DomainGuardExceptionFilter> _logger;
    public DomainGuardExceptionFilter(ILogger<DomainGuardExceptionFilter> logger) => _logger = logger;

    public void OnException(ExceptionContext context)
    {
        if (context.ExceptionHandled) return;

        (int status, string code)? mapped = context.Exception switch
        {
            // Only exceptions thrown by HIS code: a framework ArgumentOutOfRange / dictionary miss is a bug and
            // must stay a logged 500, not a 400/404 leaking a technical message.
            KeyNotFoundException ex when IsThrownByHisCode(ex) => (StatusCodes.Status404NotFound, "NOT_FOUND"),
            ArgumentException ex when IsThrownByHisCode(ex) => (StatusCodes.Status400BadRequest, "VALIDATION_FAILED"),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "CONCURRENCY_CONFLICT"),
            InvalidOperationException ex when IsThrownByHisCode(ex) => (StatusCodes.Status400BadRequest, "INVALID_STATE"),
            _ => null,
        };
        if (mapped == null) return;

        var message = context.Exception is DbUpdateConcurrencyException
            ? "Dữ liệu vừa bị thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại."
            : context.Exception.Message;

        _logger.LogInformation("Domain guard on {Path}: {Type} {Msg}",
            context.HttpContext.Request.Path, context.Exception.GetType().Name, context.Exception.Message);

        context.Result = new ObjectResult(new { error = mapped.Value.code, message })
        {
            StatusCode = mapped.Value.status,
        };
        context.ExceptionHandled = true;
    }

    private static bool IsThrownByHisCode(Exception ex) =>
        ex.Source != null && ex.Source.StartsWith("HIS.", StringComparison.Ordinal);
}
