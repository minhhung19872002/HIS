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
/// Đưa lịch hẹn của NGÀY HÔM NAY vào hàng đợi thật, bằng đúng số thứ tự đã giữ khi đặt lịch
/// (migration 187).
///
/// <para>Quyết định nghiệp vụ: người đặt lịch trên app không phải bốc số, cũng không phải check-in
/// tại quầy — đến ngày khám vé của họ đã nằm sẵn trong hàng chờ và hiện trên bảng gọi số.</para>
///
/// <para>Worker CHỈ phát vé. Hồ sơ khám được mở ở bước phòng khám GỌI SỐ
/// (<c>ReceptionCompleteService.EnsureAppointmentRecordAsync</c>) — người không đến thì không bao
/// giờ được gọi, nên không đẻ ra hồ sơ khám rỗng và không làm sai thống kê vắng mặt.</para>
///
/// <para>Chạy lại nhiều lần không sinh vé trùng: <c>Appointment.QueueTicketId</c> là chốt.</para>
///
/// Cấu hình:
///   AppointmentQueue:Enabled          (mặc định true)
///   AppointmentQueue:IntervalSeconds  (mặc định 300 = 5 phút)
///   AppointmentQueue:MaxBatchSize     (mặc định 200)
/// </summary>
public sealed class AppointmentQueueMaterializerWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AppointmentQueueMaterializerWorker> _logger;
    private readonly bool _enabled;
    private readonly TimeSpan _interval;
    private readonly int _maxBatchSize;

    public AppointmentQueueMaterializerWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<AppointmentQueueMaterializerWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("AppointmentQueue:Enabled", true);
        _interval = TimeSpan.FromSeconds(
            config.GetValue<int>("AppointmentQueue:IntervalSeconds", 300));
        _maxBatchSize = config.GetValue<int>("AppointmentQueue:MaxBatchSize", 200);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation(
                "AppointmentQueueMaterializerWorker disabled (AppointmentQueue:Enabled=false)");
            return;
        }

        _logger.LogInformation(
            "AppointmentQueueMaterializerWorker started — interval={Interval}s, batch={Batch}",
            (int)_interval.TotalSeconds, _maxBatchSize);

        // Chờ bootstrap app xong (migration chạy lúc khởi động).
        try { await Task.Delay(TimeSpan.FromSeconds(25), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await MaterializeAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "AppointmentQueueMaterializerWorker iteration failed — will retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task MaterializeAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HISDbContext>();

        var todayVn = VnTime.TodayVn;
        var tomorrowVn = todayVn.AddDays(1);

        // Khoảng [hôm nay, ngày mai) — bản ghi cũ còn dính phần giờ vẫn lọt vào, so bằng thì không.
        var pending = await db.Appointments
            .Where(a => !a.IsDeleted
                && a.AppointmentDate >= todayVn && a.AppointmentDate < tomorrowVn
                && a.Status < 2               // chưa đến khám, chưa vắng, chưa huỷ
                && a.QueueNumber != null
                && a.RoomId != null
                && a.QueueTicketId == null)
            .OrderBy(a => a.QueueNumber)
            .Take(_maxBatchSize)
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        var issued = 0;

        foreach (var appointment in pending)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var nowUtc = DateTime.UtcNow;

                var ticket = new QueueTicket
                {
                    Id = Guid.NewGuid(),
                    TicketNumber = appointment.QueueCode
                        ?? AppointmentQueueAllocator.FormatCode("B", appointment.QueueNumber!.Value),
                    QueueNumber = appointment.QueueNumber!.Value,
                    IssueDate = nowUtc, // Chuẩn hoá UTC — query dùng DayRangeUtc để so đúng ngày VN
                    QueueType = AppointmentQueueAllocator.ExamQueueType,
                    Priority = 0,
                    Status = 0, // Chờ
                    PatientId = appointment.PatientId,
                    RoomId = appointment.RoomId,
                    Notes = $"Lịch hẹn {appointment.AppointmentCode}",
                    CreatedAt = nowUtc,
                    CreatedBy = "system:appointment-queue",
                };
                await db.QueueTickets.AddAsync(ticket, ct);

                appointment.QueueTicketId = ticket.Id;
                // Đã nằm trong hàng đợi thì lịch hẹn coi như đã xác nhận. KHÔNG đặt 2 ("đã đến
                // khám") — người bệnh chưa chắc đã tới, đặt 2 ở đây là bịa dữ liệu và làm sai luôn
                // tỉ lệ vắng. Trạng thái 2 do bước gọi số đặt.
                if (appointment.Status == 0) appointment.Status = 1;
                appointment.UpdatedAt = nowUtc;

                await db.SaveChangesAsync(ct);
                issued++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "AppointmentQueueMaterializerWorker: lỗi khi phát vé cho lịch hẹn {Code} — bỏ qua",
                    appointment.AppointmentCode);
                db.ChangeTracker.Clear();
            }
        }

        if (issued > 0)
        {
            _logger.LogInformation(
                "AppointmentQueueMaterializerWorker: đã đưa {Issued}/{Total} lịch hẹn vào hàng đợi ngày {Day:dd/MM/yyyy}",
                issued, pending.Count, todayVn);
        }
    }
}
