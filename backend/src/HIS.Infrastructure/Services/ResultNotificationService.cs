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
    private readonly ILogger<ResultNotificationService> _logger;
    private readonly string _portalUrl;

    public ResultNotificationService(
        HISDbContext context,
        IEmailService emailService,
        ILogger<ResultNotificationService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
        _portalUrl = configuration["PortalUrl"] ?? "http://localhost:3001";
    }

    public async Task NotifyLabResultAsync(Guid labRequestId, string approvedByName)
    {
        try
        {
            var request = await _context.Set<HIS.Core.Entities.LabRequest>()
                .Include(r => r.Patient)
                .Include(r => r.Items)
                .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted);

            if (request?.Patient == null || string.IsNullOrEmpty(request.Patient.Email))
            {
                _logger.LogInformation("No email for patient on lab request {RequestId}, skipping notification", labRequestId);
                return;
            }

            var testNames = request.Items.Any()
                ? string.Join(", ", request.Items.Select(i => i.TestName ?? "Xét nghiệm"))
                : "Xét nghiệm";

            await _emailService.SendResultNotificationAsync(
                request.Patient.Email,
                request.Patient.FullName,
                "Xét nghiệm",
                testNames,
                approvedByName,
                DateTime.Now);
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
            var request = await _context.Set<HIS.Core.Entities.LabRequest>()
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == labRequestId && !r.IsDeleted);

            if (request?.Patient == null || string.IsNullOrEmpty(request.Patient.Email))
                return;

            await _emailService.SendCriticalValueNotificationAsync(
                request.Patient.Email,
                request.Patient.FullName,
                testName,
                value,
                normalRange);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send critical value notification for request {RequestId}", labRequestId);
        }
    }
}
