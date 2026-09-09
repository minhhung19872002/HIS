using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Workers;

public class AppointmentReminderOptions
{
    public const string SectionName = "AppointmentReminder";

    /// <summary>Chu kỳ chạy. 10 phút đủ mịn cho mốc nhắc trước 1 giờ.</summary>
    public int PollIntervalMinutes { get; set; } = 10;

    /// <summary>Số tài khoản đồng bộ lịch hẹn mỗi vòng — chặn để không nện HIS.</summary>
    public int SyncBatchSize { get; set; } = 50;

    /// <summary>Chỉ đồng bộ tài khoản còn hoạt động gần đây; người bỏ app lâu rồi thì bỏ qua.</summary>
    public int ActiveWithinDays { get; set; } = 45;

    public bool Enabled { get; set; } = true;
}

/// <summary>
/// Nhắc lịch khám trước **1 ngày** và trước **1 giờ** (HSMT I.2 #4).
///
/// Hai việc trong một vòng:
/// <list type="number">
/// <item><b>Đồng bộ</b> lịch hẹn sắp tới của một nhóm tài khoản từ HIS về bảng
///       <c>appointment_reminders</c>. Nhờ vậy lịch đặt tại quầy cũng được nhắc, chứ không chỉ lịch
///       đặt qua app.</item>
/// <item><b>Gửi</b> những lời nhắc đã tới hạn.</item>
/// </list>
///
/// Mỗi mốc chỉ gửi một lần, ghi lại thời điểm đã gửi. Chạy lại vòng sau sẽ không nhắc trùng.
/// </summary>
public class AppointmentReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AppointmentReminderOptions _options;
    private readonly ILogger<AppointmentReminderWorker> _logger;

    public AppointmentReminderWorker(
        IServiceScopeFactory scopeFactory,
        Microsoft.Extensions.Options.IOptions<AppointmentReminderOptions> options,
        ILogger<AppointmentReminderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogWarning("AppointmentReminder:Enabled = false — KHÔNG nhắc lịch khám.");
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(1, _options.PollIntervalMinutes));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncUpcomingAsync(stoppingToken);
                await SendDueRemindersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Nuốt để vòng lặp sống tiếp — một lỗi không được phép làm tắt hẳn việc nhắc lịch.
                _logger.LogError(ex, "Lỗi trong vòng nhắc lịch, sẽ thử lại ở vòng sau.");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>Kéo lịch hẹn sắp tới từ HIS về, cập nhật hoặc thêm mới.</summary>
    private async Task SyncUpcomingAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PatientAppDbContext>();
        var his = scope.ServiceProvider.GetRequiredService<IHisConnector>();
        var notifications = scope.ServiceProvider.GetRequiredService<NotificationService>();

        // Gom thay đổi rồi báo SAU khi lưu: báo trước mà lưu hỏng thì người bệnh nhận thông báo
        // "lịch đã dời" trong khi hệ thống vẫn giữ giờ cũ.
        var changes = new List<AppointmentChange>();

        var activeSince = DateTime.UtcNow.AddDays(-Math.Max(1, _options.ActiveWithinDays));

        // Xoay vòng theo tài khoản lâu chưa đồng bộ nhất, để mọi người đều tới lượt.
        var accounts = await db.Accounts
            .Where(a => a.Status == AppAccountStatus.Active && a.LastLoginAt >= activeSince)
            .OrderBy(a => db.AppointmentReminders
                .Where(r => r.AccountId == a.Id)
                .Max(r => (DateTime?)r.SyncedAt) ?? DateTime.MinValue)
            .Take(Math.Clamp(_options.SyncBatchSize, 1, 500))
            .Select(a => new { a.Id, a.PhoneNumber })
            .ToListAsync(ct);

        var now = DateTime.UtcNow;

        foreach (var account in accounts)
        {
            IReadOnlyList<HisBookingStatus> appointments;
            try
            {
                appointments = await his.LookupAppointmentsAsync(account.PhoneNumber, ct);
            }
            catch (HisConnectorException ex)
            {
                _logger.LogWarning(ex, "Không tra được lịch hẹn của một tài khoản, bỏ qua vòng này.");
                continue;
            }

            foreach (var appointment in appointments)
            {
                var at = CombineDateAndTime(appointment.AppointmentDate, appointment.AppointmentTime);

                var reminder = await db.AppointmentReminders.FirstOrDefaultAsync(
                    r => r.AccountId == account.Id && r.AppointmentCode == appointment.AppointmentCode, ct);

                // Lịch bị đóng (huỷ / hoãn) ở quầy: người bệnh PHẢI biết, nếu không họ vẫn đi khám
                // theo giờ cũ. Trước đây nhánh này bị `continue` bỏ qua hoàn toàn — app im lặng, và
                // người bệnh chỉ phát hiện khi đã tới nơi.
                if (appointment.Status >= 2)
                {
                    if (reminder is not null)
                    {
                        changes.Add(new AppointmentChange(
                            account.Id, reminder.AppointmentCode, AppointmentChangeKind.Closed,
                            reminder.AppointmentAt, at, reminder.DepartmentName, reminder.DoctorName));

                        db.AppointmentReminders.Remove(reminder);
                    }
                    continue;
                }

                // Lịch đã qua thì thôi, không nhắc và cũng không báo đổi.
                if (at <= now) continue;

                if (reminder is null)
                {
                    reminder = new AppointmentReminder
                    {
                        AccountId = account.Id,
                        AppointmentCode = appointment.AppointmentCode,
                    };
                    db.AppointmentReminders.Add(reminder);
                }
                else if (reminder.AppointmentAt != at)
                {
                    // Lịch dời sang giờ khác thì phải nhắc lại từ đầu, nếu không người bệnh chỉ nhận
                    // được lời nhắc của giờ cũ. Và phải báo cho họ biết là đã dời.
                    changes.Add(new AppointmentChange(
                        account.Id, reminder.AppointmentCode, AppointmentChangeKind.Rescheduled,
                        reminder.AppointmentAt, at,
                        appointment.DepartmentName, appointment.DoctorName));

                    reminder.RemindedDayBeforeAt = null;
                    reminder.RemindedHourBeforeAt = null;
                }

                reminder.AppointmentAt = at;
                reminder.DepartmentName = appointment.DepartmentName;
                reminder.DoctorName = appointment.DoctorName;
                reminder.RoomName = appointment.RoomName;
                reminder.Status = appointment.Status;
                reminder.SyncedAt = now;
            }
        }

        // Dọn lịch đã qua để bảng không phình mãi.
        await db.AppointmentReminders
            .Where(r => r.AppointmentAt < now.AddDays(-2))
            .ExecuteDeleteAsync(ct);

        await db.SaveChangesAsync(ct);

        // Báo cho người bệnh biết quầy đã đổi gì (HSMT I.3 #1.3 — quản lý đặt khám).
        foreach (var change in changes)
        {
            var (title, body) = change.Kind == AppointmentChangeKind.Closed
                ? ("Lịch khám đã bị huỷ",
                   $"Lịch khám {FormatVn(change.OldAt)}"
                   + (string.IsNullOrWhiteSpace(change.DepartmentName) ? "" : $" tại {change.DepartmentName}")
                   + " đã bị huỷ. Vui lòng đặt lại hoặc liên hệ bệnh viện nếu bạn không yêu cầu việc này.")
                : ("Lịch khám đã được đổi giờ",
                   $"Lịch khám của bạn dời từ {FormatVn(change.OldAt)} sang {FormatVn(change.NewAt)}"
                   + (string.IsNullOrWhiteSpace(change.DoctorName) ? "" : $" — {change.DoctorName}") + ".");

            await notifications.CreateAsync(
                change.AccountId, title, body,
                NotificationCategory.Appointment,
                deepLink: "/appointments",
                data: new { appointmentCode = change.AppointmentCode, kind = change.Kind.ToString() },
                ct: ct);
        }

        if (changes.Count > 0)
        {
            _logger.LogInformation(
                "Đã báo {Count} thay đổi lịch khám do quầy thực hiện.", changes.Count);
        }
    }

    private enum AppointmentChangeKind { Rescheduled, Closed }

    private record AppointmentChange(
        Guid AccountId, string AppointmentCode, AppointmentChangeKind Kind,
        DateTime OldAt, DateTime NewAt, string? DepartmentName, string? DoctorName);

    /// <summary>Giờ Việt Nam cho người đọc — dữ liệu lưu UTC.</summary>
    private static string FormatVn(DateTime utc) =>
        (utc + TimeSpan.FromHours(7)).ToString("HH:mm 'ngày' dd/MM/yyyy");

    private async Task SendDueRemindersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PatientAppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var now = DateTime.UtcNow;

        var candidates = await db.AppointmentReminders
            .Where(r => r.Status < 2 && r.AppointmentAt > now)
            .Where(r => r.RemindedDayBeforeAt == null || r.RemindedHourBeforeAt == null)
            .Take(200)
            .ToListAsync(ct);

        foreach (var reminder in candidates)
        {
            var untilAppointment = reminder.AppointmentAt - now;

            // Trước 1 ngày: bắn khi còn dưới 24 giờ. Cửa sổ mở tới 23 giờ để một vòng quét lỡ nhịp
            // vẫn kịp gửi, thay vì im lặng bỏ qua mốc.
            if (reminder.RemindedDayBeforeAt is null
                && untilAppointment <= TimeSpan.FromHours(24)
                && untilAppointment > TimeSpan.FromHours(2))
            {
                await notifications.CreateAsync(
                    reminder.AccountId,
                    "Nhắc lịch khám ngày mai",
                    BuildBody(reminder),
                    NotificationCategory.Appointment,
                    deepLink: "/appointments",
                    data: new { appointmentCode = reminder.AppointmentCode },
                    ct: ct);

                reminder.RemindedDayBeforeAt = now;
            }

            // Trước 1 giờ.
            if (reminder.RemindedHourBeforeAt is null
                && untilAppointment <= TimeSpan.FromHours(1)
                && untilAppointment > TimeSpan.Zero)
            {
                await notifications.CreateAsync(
                    reminder.AccountId,
                    "Sắp tới giờ khám",
                    BuildBody(reminder),
                    NotificationCategory.Appointment,
                    deepLink: "/appointments",
                    data: new { appointmentCode = reminder.AppointmentCode },
                    ct: ct);

                reminder.RemindedHourBeforeAt = now;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private static string BuildBody(AppointmentReminder reminder)
    {
        // Đổi sang giờ Việt Nam để người bệnh đọc đúng giờ mình đi khám.
        var local = reminder.AppointmentAt.AddHours(7);
        var parts = new List<string> { $"Lúc {local:HH:mm} ngày {local:dd/MM/yyyy}" };
        if (!string.IsNullOrWhiteSpace(reminder.DepartmentName)) parts.Add(reminder.DepartmentName!);
        if (!string.IsNullOrWhiteSpace(reminder.DoctorName)) parts.Add($"BS {reminder.DoctorName}");
        if (!string.IsNullOrWhiteSpace(reminder.RoomName)) parts.Add($"phòng {reminder.RoomName}");
        return string.Join(" · ", parts);
    }

    /// <summary>
    /// Ghép ngày + giờ hẹn thành mốc UTC. HIS trả ngày giờ theo giờ Việt Nam (UTC+7) nên trừ đi 7
    /// tiếng; không trừ thì lời nhắc "trước 1 giờ" sẽ bắn lệch 7 tiếng.
    /// </summary>
    private static DateTime CombineDateAndTime(DateTime date, TimeSpan? time)
    {
        var local = date.Date + (time ?? new TimeSpan(8, 0, 0));
        return DateTime.SpecifyKind(local.AddHours(-7), DateTimeKind.Utc);
    }
}
