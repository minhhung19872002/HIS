using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Workers;

/// <summary>
/// Worker nền nhắc lịch hẹn lấy mẫu / tái xét nghiệm (<see cref="SampleAppointment"/>).
///
/// Mỗi chu kỳ (mặc định 10 phút) quét SampleAppointments thoả:
///   - Status = "Scheduled"
///   - AppointmentAt nằm trong ngày hôm nay (giờ VN, so bằng UTC range)
///   - ReminderSentAt IS NULL (chưa được nhắc)
///
/// Với mỗi hẹn tìm thấy, worker tạo một bản ghi <see cref="Notification"/> và đánh
/// dấu ReminderSentAt = UtcNow để đảm bảo idempotent — không nhắc trùng dù worker
/// chạy lại nhiều lần trong ngày.
///
/// Cấu hình (mặc định tắt cho dev):
///   SampleAppointmentReminder:Enabled          (default false)
///   SampleAppointmentReminder:IntervalSeconds   (default 600 = 10 phút)
///   SampleAppointmentReminder:MaxBatchSize      (default 50)
/// </summary>
public sealed class SampleAppointmentReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SampleAppointmentReminderWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;
    private readonly int _maxBatchSize;

    public SampleAppointmentReminderWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<SampleAppointmentReminderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("SampleAppointmentReminder:Enabled", false);
        _interval = TimeSpan.FromSeconds(
            config.GetValue<int>("SampleAppointmentReminder:IntervalSeconds", 600));
        _maxBatchSize = config.GetValue<int>("SampleAppointmentReminder:MaxBatchSize", 50);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation(
                "SampleAppointmentReminderWorker disabled " +
                "(set SampleAppointmentReminder:Enabled=true to enable)");
            return;
        }

        _logger.LogInformation(
            "SampleAppointmentReminderWorker started — interval={Interval}s, batch={Batch}",
            (int)_interval.TotalSeconds, _maxBatchSize);

        // Chờ app bootstrap xong trước khi bắt đầu quét
        try { await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersForTodayAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Worker không được die — log rồi tiếp tục chu kỳ sau
                _logger.LogError(ex, "SampleAppointmentReminderWorker iteration failed — will retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task SendRemindersForTodayAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        // Khoảng UTC tương ứng ngày hôm nay (giờ VN)
        var (fromUtc, toUtc) = VnTime.DayRangeUtc(VnTime.TodayVn);

        // Lấy batch hẹn hôm nay chưa được nhắc
        var pending = await db.SampleAppointments
            .Where(a => !a.IsDeleted
                     && a.Status == "Scheduled"
                     && a.AppointmentAt >= fromUtc
                     && a.AppointmentAt < toUtc
                     && a.ReminderSentAt == null)
            .OrderBy(a => a.AppointmentAt)
            .Take(_maxBatchSize)
            .Include(a => a.Patient)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        _logger.LogInformation(
            "SampleAppointmentReminderWorker: {Count} appointment(s) to remind today", pending.Count);

        var now = DateTime.UtcNow;
        var sent = 0;

        foreach (var appt in pending)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var patientName = appt.Patient?.FullName ?? "Bệnh nhân";
                var serviceName = string.IsNullOrWhiteSpace(appt.ServiceName)
                    ? "lấy mẫu xét nghiệm"
                    : appt.ServiceName;

                // Tạo thông báo trong hệ thống
                db.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = "Nhắc lịch hẹn lấy mẫu",
                    Content = $"{patientName} có lịch hẹn {serviceName} lúc {appt.AppointmentAt.ToLocalTime():HH:mm}.",
                    NotificationType = "Info",
                    Module = "LIS",
                    ActionUrl = $"/v2/sample-appointments?patientId={appt.PatientId}",
                    IsRead = false,
                    CreatedAt = now,
                    CreatedBy = "system:reminder-worker",
                });

                // Đánh dấu đã nhắc — idempotent guard
                appt.ReminderSentAt = now;
                appt.UpdatedAt = now;
                appt.UpdatedBy = "system:reminder-worker";

                await db.SaveChangesAsync(ct);
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "SampleAppointmentReminderWorker: error processing appointment {Id} — skipping", appt.Id);
                db.ChangeTracker.Clear();
            }
        }

        if (sent > 0)
        {
            _logger.LogInformation(
                "SampleAppointmentReminderWorker: sent {Sent}/{Total} reminder(s)", sent, pending.Count);
        }
    }
}
