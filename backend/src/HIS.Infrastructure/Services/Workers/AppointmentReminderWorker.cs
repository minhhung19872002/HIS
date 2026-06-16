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
/// Worker nền nhắc lịch hẹn khám / tái khám (<see cref="Appointment"/>).
///
/// Chu kỳ (mặc định 15 phút) quét Appointments thoả:
///   - Status = 1 (Đã xác nhận)
///   - AppointmentDate nằm trong N giờ tới (cấu hình Reminder:LookAheadHours, mặc định 24)
///   - ReminderSentAt IS NULL
///
/// Kênh gửi: SMS / Zalo (cấu hình Reminder:Channel = "sms" | "zalo" | "both")
/// MockMode (Reminder:MockMode = true, mặc định): chỉ log + lưu Notification, KHÔNG gọi API ngoài.
///
/// Cấu hình (appsettings hoặc Cloud Run env):
///   Reminder:Enabled         (default false)
///   Reminder:IntervalSeconds  (default 900 = 15 phút)
///   Reminder:MaxBatchSize     (default 50)
///   Reminder:LookAheadHours   (default 24 — nhắc trong 24 giờ tới)
///   Reminder:Channel          (default "sms" — "sms" | "zalo" | "both")
///   Reminder:MockMode         (default true — chỉ log, không gửi thật)
/// </summary>
public sealed class AppointmentReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AppointmentReminderWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;
    private readonly int _maxBatchSize;
    private readonly int _lookAheadHours;
    private readonly string _channel;
    private readonly bool _mockMode;

    public AppointmentReminderWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<AppointmentReminderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("Reminder:Enabled", false);
        _interval = TimeSpan.FromSeconds(
            config.GetValue<int>("Reminder:IntervalSeconds", 900));
        _maxBatchSize = config.GetValue<int>("Reminder:MaxBatchSize", 50);
        _lookAheadHours = config.GetValue<int>("Reminder:LookAheadHours", 24);
        _channel = (config["Reminder:Channel"] ?? "sms").ToLowerInvariant();
        _mockMode = config.GetValue<bool>("Reminder:MockMode", true);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation(
                "AppointmentReminderWorker disabled (set Reminder:Enabled=true to enable)");
            return;
        }

        _logger.LogInformation(
            "AppointmentReminderWorker started — interval={Interval}s, lookAhead={LookAhead}h, " +
            "channel={Channel}, mockMode={MockMode}, batch={Batch}",
            (int)_interval.TotalSeconds, _lookAheadHours, _channel, _mockMode, _maxBatchSize);

        // Chờ bootstrap app xong
        try { await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AppointmentReminderWorker iteration failed — will retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();
        var sms = scope.ServiceProvider.GetRequiredService<ISmsService>();

        var nowUtc = DateTime.UtcNow;
        var windowEnd = nowUtc.AddHours(_lookAheadHours);

        // Chuyển về ngày VN để so sánh AppointmentDate (date-only field)
        var windowEndVn = TimeZoneInfo.ConvertTimeFromUtc(windowEnd,
            TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Ho_Chi_Minh"));
        var todayVn = VnTime.TodayVn;

        // Lấy batch lịch hẹn đã xác nhận sắp tới chưa nhắc
        var pending = await db.Appointments
            .Where(a => !a.IsDeleted
                     && a.Status == 1                              // Đã xác nhận
                     && a.AppointmentDate >= todayVn
                     && a.AppointmentDate <= windowEndVn.Date
                     && a.ReminderSentAt == null)
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.AppointmentTime)
            .Take(_maxBatchSize)
            .Include(a => a.Patient)
            .Include(a => a.Department)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        _logger.LogInformation(
            "AppointmentReminderWorker: {Count} appointment(s) to remind", pending.Count);

        var sent = 0;

        foreach (var appt in pending)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                await ProcessOneAsync(appt, sms, db, nowUtc, ct);
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "AppointmentReminderWorker: error processing appointment {Id} — skipping", appt.Id);
                db.ChangeTracker.Clear();
            }
        }

        if (sent > 0)
        {
            _logger.LogInformation(
                "AppointmentReminderWorker: sent {Sent}/{Total} reminder(s)", sent, pending.Count);
        }
    }

    private async Task ProcessOneAsync(
        Appointment appt,
        ISmsService sms,
        HISDbContext db,
        DateTime nowUtc,
        CancellationToken ct)
    {
        var patient = appt.Patient;
        var patientName = patient?.FullName ?? "Bệnh nhân";
        var phone = patient?.PhoneNumber;
        var deptName = appt.Department?.DepartmentName;

        // Tạo thông báo nội bộ (luôn tạo, dù mock hay không)
        db.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            Title = "Nhắc lịch hẹn tái khám",
            Content = $"{patientName} có lịch hẹn ngày {appt.AppointmentDate:dd/MM/yyyy}" +
                      (appt.AppointmentTime.HasValue ? $" lúc {appt.AppointmentTime.Value:hh\\:mm}" : "") +
                      (deptName != null ? $" tại {deptName}" : "") + ".",
            NotificationType = "Info",
            Module = "Appointment",
            ActionUrl = $"/v2/appointments?appointmentId={appt.Id}",
            IsRead = false,
            CreatedAt = nowUtc,
            CreatedBy = "system:reminder-worker",
        });

        // Gửi SMS / Zalo
        if (!string.IsNullOrWhiteSpace(phone))
        {
            if (_mockMode)
            {
                _logger.LogWarning(
                    "[REMINDER-MOCK] channel={Channel} patient={Patient} phone={Phone} date={Date} apptId={Id}",
                    _channel, patientName, phone, appt.AppointmentDate.ToString("dd/MM/yyyy"), appt.Id);
            }
            else
            {
                if (_channel is "sms" or "both")
                {
                    await sms.SendBookingReminderSmsAsync(
                        phone, patientName, appt.AppointmentCode,
                        appt.AppointmentDate, appt.AppointmentTime);
                }

                if (_channel is "zalo" or "both")
                {
                    // Zalo ZNS gửi qua IZaloNotificationService — inject khi cần,
                    // hiện tại channel="sms" là mặc định; Zalo cần templateId từ SystemConfig.
                    _logger.LogInformation(
                        "[REMINDER-ZALO] Zalo channel not yet wired — add IZaloNotificationService injection when template ready. apptId={Id}", appt.Id);
                }
            }
        }
        else
        {
            _logger.LogWarning(
                "AppointmentReminderWorker: patient {PatientId} has no phone — notification only", appt.PatientId);
        }

        // Đánh dấu đã nhắc — idempotent guard
        appt.ReminderSentAt = nowUtc;
        appt.IsReminderSent = true;
        appt.UpdatedAt = nowUtc;
        appt.UpdatedBy = "system:reminder-worker";

        await db.SaveChangesAsync(ct);
    }
}
