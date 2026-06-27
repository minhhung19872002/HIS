using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using HIS.Core.Constants;

namespace HIS.Infrastructure.Extensions;

/// <summary>
/// #196 PERF-2 — Bound 1 list query CHƯA phân trang để chặn tải nguyên bảng vào RAM (OOM),
/// CÓ ghi log khi chạm trần (no silent cap → còn truy được chỗ cần phân trang thật).
///
/// ⚠️ CHỈ dùng cho query TRẢ ROWS VỀ CLIENT (list endpoint). KHÔNG dùng cho query
/// load-all-rồi-aggregate-in-memory (count/sum/group/avg) — bound ở đó làm SAI số liệu;
/// loại đó phải đẩy aggregate xuống SQL. Cũng KHÔNG dùng cho write-bulk load-then-loop-save.
///
/// Logger là static, cấu hình 1 lần lúc startup (Program.cs: <see cref="Configure"/>) → áp được
/// ở mọi service mà KHÔNG cần inject ILogger vào constructor.
/// </summary>
public static class QueryBoundExtensions
{
    private static ILogger _logger = NullLogger.Instance;

    /// <summary>Gọi 1 lần lúc startup để bật log "chạm trần" cho <see cref="ToBoundedListAsync"/>.</summary>
    public static void Configure(ILoggerFactory loggerFactory)
        => _logger = loggerFactory.CreateLogger("QueryBound");

    public static async Task<List<T>> ToBoundedListAsync<T>(
        this IQueryable<T> query,
        string context,
        int ceiling = QueryLimits.DefaultListCeiling,
        CancellationToken cancellationToken = default)
    {
        // Lấy ceiling+1 để biết có vượt trần hay không mà không cần CountAsync thừa.
        var rows = await query.Take(ceiling + 1).ToListAsync(cancellationToken);
        if (rows.Count > ceiling)
        {
            _logger.LogWarning(
                "[QueryBound] '{Context}' trả > {Ceiling} dòng → cắt còn {Ceiling} (no silent cap). Cần phân trang server-side.",
                context, ceiling, ceiling);
            rows.RemoveAt(ceiling);
        }
        return rows;
    }
}
