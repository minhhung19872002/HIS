using System.Security.Claims;
using HIS.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HIS.API.Filters;

/// <summary>
/// Patient-safety gate (QA round 3): refuses creating/issuing prescriptions and service orders when the acting
/// user's practice licence (CCHN) IS expired, suspended or revoked. Missing licence data never blocks — see
/// <see cref="HIS.Core.Common.PracticeLicenseGate"/>. Applied per action so the clinical services stay untouched.
/// Response: 403 { error: "PRACTICE_LICENSE_BLOCKED", message } — the message says who can lift the block.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class RequirePracticeLicenseAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var result = await CheckAsync(context.HttpContext);
        if (result != null)
        {
            context.Result = result;
            return;
        }
        await next();
    }

    /// <summary>Document types whose signing is a prescribing/ordering act (signing-workflow, digital signature).</summary>
    public static bool IsClinicalOrderDocument(string? documentType) =>
        !string.IsNullOrWhiteSpace(documentType)
        && (documentType.Contains("Prescription", StringComparison.OrdinalIgnoreCase)
            || documentType.Contains("ServiceOrder", StringComparison.OrdinalIgnoreCase)
            || documentType.Contains("ServiceRequest", StringComparison.OrdinalIgnoreCase)
            || string.Equals(documentType.Trim(), "Order", StringComparison.OrdinalIgnoreCase));

    /// <summary>Returns a 403 result when the current user is blocked, otherwise null.</summary>
    public static async Task<IActionResult?> CheckAsync(HttpContext http)
    {
        var raw = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var userId) || userId == Guid.Empty) return null; // [Authorize] handles anonymous

        var svc = http.RequestServices.GetRequiredService<IDoctorLicenseService>();
        var gate = await svc.EvaluatePrescribingGateAsync(userId);
        if (!gate.Blocked)
        {
            // QA-R9: a non-blocking finding (missing data, expiring, or any finding in Warn mode) travels with the
            // response so the save itself carries it, not only the page-load banner. URL-encoded: headers are ASCII.
            if (gate.Level == HIS.Core.Common.PracticeLicenseGate.LevelWarning && !http.Response.HasStarted)
            {
                http.Response.Headers["X-Practice-License-Warning"] = Uri.EscapeDataString(gate.Message);
                http.Response.Headers["X-Practice-License-Status"] = gate.Status;
            }
            return null;
        }

        http.RequestServices.GetRequiredService<ILogger<RequirePracticeLicenseAttribute>>()
            .LogWarning("Practice licence gate blocked user {UserId} on {Path}: {Status}", userId, http.Request.Path, gate.Status);
        return new ObjectResult(new { error = "PRACTICE_LICENSE_BLOCKED", message = gate.Message, licenseStatus = gate.Status })
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
    }
}
