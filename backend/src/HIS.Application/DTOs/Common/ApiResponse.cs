namespace HIS.Application.DTOs.Common;

/// <summary>
/// Standard envelope cho mọi endpoint MỚI từ T4 onwards (xem
/// docs/workspace-docs/plans/plan-T4-api-envelope.md).
/// Legacy endpoint giữ shape cũ — migrate dần khi đụng vào, KHÔNG big-bang.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }

    /// <summary>Chỉ set cho paged endpoint. Null cho non-paged.</summary>
    public PageMeta? Meta { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null)
        => new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> OkPaged(T data, int page, int pageSize, int totalCount)
        => new()
        {
            Success = true,
            Data = data,
            Meta = new PageMeta
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = pageSize > 0 ? (totalCount + pageSize - 1) / pageSize : 0,
            },
        };

    public static ApiResponse<T> Fail(string message, Dictionary<string, string[]>? errors = null)
        => new() { Success = false, Message = message, Errors = errors };
}

public class PageMeta
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}
