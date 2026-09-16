using HIS.Application.Services;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HIS.API.Filters;

/// <summary>
/// Applies the per-user data scope to every action that names a patient, a medical record or an
/// inpatient stay in its route.
///
/// Wiring the check into each service one by one was the alternative; it was rejected because the
/// endpoints that leak are exactly the ones nobody remembers to wire. QA round 4 found a doctor
/// assigned to one department could read another department's patients through
/// /api/Patients/{id}, /api/examination/patient/{id}/history, /api/inpatient/{admissionId}/detail,
/// /api/LISComplete/orders/by-admission/{id}, /api/BillingComplete/patients/{mrId}/billing-status
/// and /payments/history/{pid} — six routes in six different services.
///
/// Cost when nothing is configured: one indexed lookup per request (cached for the request), then
/// an immediate return, because a user with no data-permission group is Unrestricted. Denial raises
/// UnauthorizedAccessException, which <see cref="ForbiddenExceptionFilter"/> turns into 403.
/// </summary>
public sealed class PatientDataScopeFilter : IAsyncActionFilter
{
    // Route parameter names that identify the subject of the request, in resolution order.
    private static readonly string[] PatientKeys = { "patientId", "benhNhanId" };
    private static readonly string[] RecordKeys = { "medicalRecordId", "recordId", "hoSoId" };
    private static readonly string[] AdmissionKeys = { "admissionId" };

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.HttpContext.User?.Identity?.IsAuthenticated == true)
        {
            var guard = context.HttpContext.RequestServices.GetService(typeof(IPatientDataScopeGuard)) as IPatientDataScopeGuard;
            if (guard != null)
            {
                var ct = context.HttpContext.RequestAborted;
                if (TryGetId(context, PatientKeys, out var patientId))
                    await guard.EnsurePatientInScopeAsync(patientId, ct);
                else if (TryGetId(context, RecordKeys, out var recordId))
                    await guard.EnsureMedicalRecordInScopeAsync(recordId, ct);
                else if (TryGetId(context, AdmissionKeys, out var admissionId))
                    await guard.EnsureAdmissionInScopeAsync(admissionId, ct);
            }
        }

        await next();
    }

    private static bool TryGetId(ActionExecutingContext context, string[] keys, out Guid id)
    {
        foreach (var key in keys)
        {
            if (context.ActionArguments.TryGetValue(key, out var raw) && raw is Guid g && g != Guid.Empty)
            {
                id = g;
                return true;
            }
        }
        id = Guid.Empty;
        return false;
    }
}
