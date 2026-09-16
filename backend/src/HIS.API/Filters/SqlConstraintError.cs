using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Filters;

/// <summary>
/// Maps a SQL constraint violation that escaped a service to the HTTP answer the client can act on.
///
/// QA round 4 (2026-09-16): a write reaching SQL with a bad payload — blank code on a unique index, a
/// zero-GUID / unknown parent, NULL into a NOT NULL column, oversized text — surfaced as a bare 500 on
/// ~90 write routes, so the screen showed "Hệ thống đang gặp sự cố" instead of the reason. The constraint
/// already says exactly what is wrong, so both exception filters answer 400/409 with that reason instead.
/// Shared by <see cref="DomainExceptionFilter"/> (controller-level, has a catch-all) and
/// <see cref="DomainGuardExceptionFilter"/> (global, deliberately narrow).
/// </summary>
internal static class SqlConstraintError
{
    /// <summary>SQL error number of the innermost <see cref="SqlException"/>, or 0 when there is none.</summary>
    internal static int Number(DbUpdateException ex) =>
        ex.GetBaseException() is SqlException sql ? sql.Number : 0;

    /// <summary>The (status, error code) for a constraint we can explain, or null to leave the exception alone.</summary>
    internal static (int Status, string Code)? Map(DbUpdateException ex) => Number(ex) switch
    {
        2601 or 2627 => (StatusCodes.Status409Conflict, "DUPLICATE"),
        547 => (StatusCodes.Status400BadRequest, "INVALID_REFERENCE"),
        515 => (StatusCodes.Status400BadRequest, "MISSING_REQUIRED"),
        2628 or 8152 => (StatusCodes.Status400BadRequest, "VALUE_TOO_LONG"),
        _ => null,
    };

    /// <summary>Vietnamese reason derived from the constraint; the raw SQL text stays in the log only.</summary>
    internal static string Message(DbUpdateException ex)
    {
        var raw = ex.GetBaseException().Message;
        return Number(ex) switch
        {
            2601 or 2627 => "Bản ghi này đã tồn tại (trùng mã/khóa duy nhất). Vui lòng kiểm tra lại mã.",
            547 => raw.Contains("DELETE", StringComparison.OrdinalIgnoreCase)
                ? "Bản ghi đang được tham chiếu bởi dữ liệu khác nên không thể xóa."
                : "Tham chiếu không hợp lệ: bản ghi cha (bệnh nhân/phiếu/danh mục) không tồn tại.",
            515 => Column(raw) is { Length: > 0 } col ? $"Thiếu trường bắt buộc: {col}." : "Thiếu trường bắt buộc.",
            2628 or 8152 => "Giá trị nhập vượt quá độ dài cho phép của trường.",
            _ => "Không lưu được dữ liệu.",
        };
    }

    private static string Column(string text)
    {
        var m = System.Text.RegularExpressions.Regex.Match(text, "column '([^']+)'");
        return m.Success ? m.Groups[1].Value : "";
    }
}
