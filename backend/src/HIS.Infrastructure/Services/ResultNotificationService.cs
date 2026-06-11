using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public interface IResultNotificationService
{
    Task NotifyLabResultAsync(Guid labRequestId, string approvedByName);
    Task NotifyRadiologyResultAsync(Guid reportId, string approvedByName);
    Task NotifyCriticalValueAsync(Guid labRequestId, string testName, string value, string normalRange);
}

public class ResultNotificationService : IResultNotificationService
{
    private readonly HISDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;
    private readonly ILogger<ResultNotificationService> _logger;
    private readonly string _portalUrl;

    public ResultNotificationService(
        HISDbContext context,
        IEmailService emailService,
        ISmsService smsService,
        ILogger<ResultNotificationService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _smsService = smsService;
        _logger = logger;
        _portalUrl = configuration["PortalUrl"] ?? "http://localhost:3001";
    }

    public async Task NotifyLabResultAsync(Guid labRequestId, string approvedByName)
    {
        try
        {
            // #14e: model 1 ServiceRequest (RequestType=1) — model 2 LabRequests đã gỡ
            var request = await _context.ServiceRequests
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .Include(r => r.Details.Where(d => !d.IsDeleted && d.Status != 3)).ThenInclude(d => d.Service)
                .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted && r.RequestType == 1);

            var patient = request?.MedicalRecord?.Patient;
            if (patient == null || string.IsNullOrEmpty(patient.Email))
            {
                _logger.LogInformation("No email for patient on lab request {RequestId}, skipping notification", labRequestId);
                return;
            }

            var testNames = request!.Details.Any()
                ? string.Join(", ", request.Details.Select(d => d.Service?.ServiceName ?? "Xét nghiệm"))
                : "Xét nghiệm";

            await _emailService.SendResultNotificationAsync(
                patient.Email,
                patient.FullName,
                "Xét nghiệm",
                testNames,
                approvedByName,
                DateTime.Now);

            // SMS notification (fire-and-forget)
            if (!string.IsNullOrEmpty(patient.PhoneNumber))
                _ = _smsService.SendResultNotificationSmsAsync(patient.PhoneNumber, patient.FullName, "Xet nghiem", testNames);
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
            var report = await _context.RadiologyReports
                .Include(r => r.RadiologyExam)
                    .ThenInclude(e => e!.RadiologyRequest)
                        .ThenInclude(req => req!.Patient)
                .Include(r => r.RadiologyExam)
                    .ThenInclude(e => e!.RadiologyRequest)
                        .ThenInclude(req => req!.Service)
                .FirstOrDefaultAsync(r => r.Id == reportId && !r.IsDeleted);

            var patient = report?.RadiologyExam?.RadiologyRequest?.Patient;
            if (patient == null || string.IsNullOrEmpty(patient.Email))
            {
                _logger.LogInformation("No email for patient on radiology report {ReportId}, skipping notification", reportId);
                return;
            }

            var serviceName = report?.RadiologyExam?.RadiologyRequest?.Service?.ServiceName ?? "Chẩn đoán hình ảnh";

            await _emailService.SendResultNotificationAsync(
                patient.Email,
                patient.FullName,
                "Chẩn đoán hình ảnh",
                serviceName,
                approvedByName,
                DateTime.Now);

            if (!string.IsNullOrEmpty(patient.PhoneNumber))
                _ = _smsService.SendResultNotificationSmsAsync(patient.PhoneNumber, patient.FullName, "CDHA", serviceName);
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
            // #14e: model 1 ServiceRequest — model 2 LabRequests đã gỡ
            var request = await _context.ServiceRequests
                .Include(r => r.MedicalRecord).ThenInclude(m => m.Patient)
                .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted && r.RequestType == 1);

            var patient = request?.MedicalRecord?.Patient;
            if (patient == null || string.IsNullOrEmpty(patient.Email))
                return;

            await _emailService.SendCriticalValueNotificationAsync(
                patient.Email,
                patient.FullName,
                testName,
                value,
                normalRange);

            if (!string.IsNullOrEmpty(patient.PhoneNumber))
                _ = _smsService.SendCriticalValueSmsAsync(patient.PhoneNumber, patient.FullName, testName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send critical value notification for request {RequestId}", labRequestId);
        }
    }
}
