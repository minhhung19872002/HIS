using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace HIS.API.Filters;

/// <summary>
/// Gates an action/controller to the Development environment only (#180 security).
/// In any non-Development environment (Production/Staging) it short-circuits with
/// 404 Not Found — hiding dev/seed/debug endpoints from prod even when they are
/// marked [AllowAnonymous]. Prevents anonymous data-seeding / dev mutations on prod.
/// Dev convenience is preserved (still anonymous in Development).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class DevelopmentOnlyAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        var env = context.HttpContext.RequestServices.GetService<IWebHostEnvironment>();
        if (env is null || !env.IsDevelopment())
        {
            context.Result = new NotFoundResult();
            return;
        }
        base.OnActionExecuting(context);
    }
}
