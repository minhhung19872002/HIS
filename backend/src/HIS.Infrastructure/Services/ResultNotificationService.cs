using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public interface IResultNotificationService
{
    Task NotifyLabResultAsync(Guid labRequestId, string approvedByName);
    Task NotifyRadiologyResultAsync(Guid reportId, string approvedByName);
    Task NotifyCriticalValueAsync(Guid labRequestId, string testName, string value, string normalRange);
}

/// <summary>
/// Callers (LIS/RIS approval) invoke these fire-and-forget (<c>_ = Notify...</c>) right before the request ends.
/// Each notification therefore runs in its OWN DI scope: using the request's HISDbContext raced the caller
/// ("a second operation was started on this context") or hit a disposed context, and the exception was swallowed
/// — the patient silently got nothing.
/// </summary>
public class ResultNotificationService : IResultNotificationService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ResultNotificationService> _logger;
    private readonly string _portalUrl;

    public ResultNotificationService(
        IServiceScopeFactory scopeFactory,
        ILogger<ResultNotificationService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _portalUrl = configuration["PortalUrl"] ?? "http://localhost:3001";
    }

    /// <summary>True when a "result ready" SMS for this result was already sent/queued (re-approval must not spam).</summary>
    private static Task<bool> AlreadyNotifiedAsync(HISDbContext context, Guid resultId) =>
        context.SmsLogs.AsNoTracking().AnyAsync(l => !l.IsDeleted && l.MessageType == "Result"
                                                  && l.RelatedEntityId == resultId && l.Status != 1);

    public async Task NotifyLabResultAsync(Guid labRequestId, string approvedByName)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var smsService = scope.ServiceProvider.GetRequiredService<ISmsService>();

            // #14e: model 1 ServiceRequest (RequestType=1) — model 2 LabRequests đã gỡ
            var request = await context.ServiceRequests.AsNoTracking()
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted && r.RequestType == 1);

            var patient = request?.MedicalRecord?.Patient;
            if (patient == null) return;
            if (await AlreadyNotifiedAsync(context, labRequestId))
            {
                _logger.LogInformation("Lab result {RequestId} already notified, skipping duplicate", labRequestId);
                return;
            }

            var testNames = request!.Details.Any()
                ? string.Join(", ", request.Details.Select(d => d.Service?.ServiceName ?? "Xét nghiệm"))
                : "Xét nghiệm";

            // Email and SMS are independent channels: a patient with only a phone number (most patients)
            // used to get no SMS because the method returned early when Email was empty.
            if (!string.IsNullOrEmpty(patient.Email))
                await emailService.SendResultNotificationAsync(patient.Email, patient.FullName, "Xét nghiệm", testNames, approvedByName, DateTime.Now);
            if (!string.IsNullOrEmpty(patient.PhoneNumber))
                await smsService.SendResultNotificationSmsAsync(patient.PhoneNumber, patient.FullName, "xet nghiem", testNames, labRequestId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send lab result notification for request {RequestId}", labRequestId);
        }
    }

    public async Task NotifyRadiologyResultAsync(Guid reportId, string approvedByName)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var smsService = scope.ServiceProvider.GetRequiredService<ISmsService>();

            var report = await context.RadiologyReports.AsNoTracking()
                .Include(r => r.RadiologyExam)
                    .ThenInclude(e => e!.RadiologyRequest)
                        .ThenInclude(req => req!.Patient)
                .Include(r => r.RadiologyExam)
                    .ThenInclude(e => e!.RadiologyRequest)
                        .ThenInclude(req => req!.Service)
                .FirstOrDefaultAsync(r => r.Id == reportId && !r.IsDeleted);

            var patient = report?.RadiologyExam?.RadiologyRequest?.Patient;
            if (patient == null) return;
            if (await AlreadyNotifiedAsync(context, reportId))
            {
                _logger.LogInformation("Radiology report {ReportId} already notified, skipping duplicate", reportId);
                return;
            }

            var serviceName = report?.RadiologyExam?.RadiologyRequest?.Service?.ServiceName ?? "Chẩn đoán hình ảnh";

            if (!string.IsNullOrEmpty(patient.Email))
                await emailService.SendResultNotificationAsync(patient.Email, patient.FullName, "Chẩn đoán hình ảnh", serviceName, approvedByName, DateTime.Now);
            if (!string.IsNullOrEmpty(patient.PhoneNumber))
                await smsService.SendResultNotificationSmsAsync(patient.PhoneNumber, patient.FullName, "CDHA", serviceName, reportId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send radiology result notification for report {ReportId}", reportId);
        }
    }

    public async Task NotifyCriticalValueAsync(Guid labRequestId, string testName, string value, string normalRange)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<HISDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var smsService = scope.ServiceProvider.GetRequiredService<ISmsService>();

            // #14e: model 1 ServiceRequest — model 2 LabRequests đã gỡ
            var request = await context.ServiceRequests.AsNoTracking()
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted && r.RequestType == 1);

            var patient = request?.MedicalRecord?.Patient;
            if (patient == null)
                return;

            if (!string.IsNullOrEmpty(patient.Email))
                await emailService.SendCriticalValueNotificationAsync(patient.Email, patient.FullName, testName, value, normalRange);
            if (!string.IsNullOrEmpty(patient.PhoneNumber))
                await smsService.SendCriticalValueSmsAsync(patient.PhoneNumber, patient.FullName, testName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send critical value notification for request {RequestId}", labRequestId);
        }
    }
}
