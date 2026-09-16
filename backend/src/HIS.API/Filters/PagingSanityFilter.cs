using System.Reflection;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HIS.API.Filters;

/// <summary>
/// Clamps paging values before an action runs.
///
/// QA round 5 (2026-09-16): fuzzing the declared query parameters answered 500 on 205 endpoints.
/// Two shapes, both from trusting the client's number straight into the query:
///   pageSize = -1        → "The number of rows provided for a FETCH clause must be greater then zero"
///   page = 999999999     → (page - 1) * pageSize overflows int → "The offset specified in a OFFSET
///                          clause may not be negative"
/// and a pageSize of 100000 was honoured, which is a resource-exhaustion path rather than a crash.
///
/// Every paging DTO in the codebase declares its own Page/PageIndex/PageSize properties, so there was
/// no single place to fix — except here, before model values ever reach a service. Bounds are wide on
/// purpose: no screen asks for page 1,000,001 or 1001 rows, so nothing legitimate changes.
/// </summary>
public sealed class PagingSanityFilter : IActionFilter
{
    private const int MaxPage = 1_000_000;   // (MaxPage - 1) * MaxPageSize stays far inside int
    private const int MaxPageSize = 1_000;

    private static readonly string[] PageNames = { "page", "pageindex", "pagenumber", "pageno" };
    private static readonly string[] SizeNames = { "pagesize", "limit", "top", "take", "pagelength" };
    private static readonly string[] OffsetNames = { "skip", "offset" };

    // Reflection per DTO type is resolved once; a request only walks the cached property list.
    private static readonly Dictionary<Type, PropertyInfo[]> Cache = new();
    private static readonly object CacheLock = new();

    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var key in context.ActionArguments.Keys.ToList())
        {
            var value = context.ActionArguments[key];
            if (value is null) continue;

            if (value is int n)
            {
                var clamped = ClampByName(key, n);
                if (clamped != n) context.ActionArguments[key] = clamped;
                continue;
            }

            var type = value.GetType();
            if (type.IsPrimitive || type == typeof(string) || type == typeof(Guid) || type == typeof(DateTime))
                continue;

            foreach (var prop in IntProperties(type))
            {
                if (prop.GetValue(value) is not int current) continue;
                var clamped = ClampByName(prop.Name, current);
                if (clamped != current) prop.SetValue(value, clamped);
            }
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }

    private static int ClampByName(string name, int value)
    {
        var lower = name.ToLowerInvariant();
        if (SizeNames.Contains(lower))
            return value <= 0 ? 1 : Math.Min(value, MaxPageSize);
        if (PageNames.Contains(lower))
            return value < 0 ? 0 : Math.Min(value, MaxPage);
        if (OffsetNames.Contains(lower))
            return value < 0 ? 0 : value;
        return value;
    }

    private static PropertyInfo[] IntProperties(Type type)
    {
        lock (CacheLock)
        {
            if (Cache.TryGetValue(type, out var cached)) return cached;
            var props = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => p.PropertyType == typeof(int) && p.CanRead && p.CanWrite)
                .Where(p => PageNames.Contains(p.Name.ToLowerInvariant())
                            || SizeNames.Contains(p.Name.ToLowerInvariant())
                            || OffsetNames.Contains(p.Name.ToLowerInvariant()))
                .ToArray();
            Cache[type] = props;
            return props;
        }
    }
}
