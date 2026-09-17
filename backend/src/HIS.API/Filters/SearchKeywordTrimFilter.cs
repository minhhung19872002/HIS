using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HIS.API.Filters;

/// <summary>
/// Trims the free-text search term of every query-string search before the action runs.
///
/// QA round 6 (2026-09-17): most catalog/medicine/service searches pass the keyword straight into
/// <c>Contains(keyword)</c>, so "paracetamol " (a trailing space the user can't see, or a pasted value)
/// found 1 medicine instead of 21, and " Khám " found no service at all. Fixing ~40 services one by one
/// would miss the next one; trimming here covers them all.
///
/// Deliberately narrow: only a string bound from the query whose name is a search term
/// (<c>keyword</c>, <c>search</c>, <c>searchTerm</c>, <c>q</c>, <c>term</c>), or the same-named string
/// property of a <c>[FromQuery]</c> search object. "   " becomes "" (every service already treats that as
/// "no filter").
/// </summary>
public sealed class SearchKeywordTrimFilter : IActionFilter
{
    private static readonly HashSet<string> Names = new(StringComparer.OrdinalIgnoreCase)
    {
        "keyword", "search", "searchTerm", "searchText", "q", "term",
    };

    public void OnActionExecuting(ActionExecutingContext context)
    {
        foreach (var p in context.ActionDescriptor.Parameters)
        {
            var source = p.BindingInfo?.BindingSource;
            if (source != null && source != BindingSource.Query && source != BindingSource.ModelBinding) continue;
            if (!context.ActionArguments.TryGetValue(p.Name, out var value) || value == null) continue;

            if (value is string s)
            {
                if (Names.Contains(p.Name)) context.ActionArguments[p.Name] = Clean(s);
                continue;
            }

            // A [FromQuery] search DTO (e.g. MedicineCatalogSearchDto.Keyword).
            if (source != BindingSource.Query || value.GetType().IsValueType) continue;
            foreach (var prop in value.GetType().GetProperties())
            {
                if (prop.PropertyType != typeof(string) || !prop.CanWrite || !prop.CanRead
                    || prop.GetIndexParameters().Length > 0 || !Names.Contains(prop.Name)) continue;
                if (prop.GetValue(value) is string ps) prop.SetValue(value, Clean(ps));
            }
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }

    // Blank stays "" (not null): some actions call keyword.ToLower() without a null check.
    private static string Clean(string s) => s.Trim();
}
