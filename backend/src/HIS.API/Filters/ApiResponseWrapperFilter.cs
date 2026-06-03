using HIS.Application.DTOs.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HIS.API.Filters;

/// <summary>
/// Auto-wraps 2xx ObjectResult responses into ApiResponse{T} envelope.
/// Skips: file downloads (FileResult), already-wrapped responses, redirects, error codes.
/// Applied globally via AddControllers options.
/// </summary>
public sealed class ApiResponseWrapperFilter : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        if (context.Result is ObjectResult objectResult
            && objectResult.StatusCode is null or (>= 200 and < 300)
            && objectResult.Value is not null
            && !IsAlreadyWrapped(objectResult.Value)
            && !IsFileOrStream(context.Result))
        {
            objectResult.Value = new ApiResponse<object>
            {
                Success = true,
                Data = objectResult.Value,
            };
        }

        await next();
    }

    private static bool IsAlreadyWrapped(object value)
    {
        var type = value.GetType();
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(ApiResponse<>))
            return true;
        var props = type.GetProperties();
        return props.Length >= 2
            && props.Any(p => p.Name == "Success" && p.PropertyType == typeof(bool))
            && props.Any(p => p.Name == "Data");
    }

    private static bool IsFileOrStream(IActionResult result)
        => result is FileResult or FileStreamResult or PhysicalFileResult or VirtualFileResult;
}
