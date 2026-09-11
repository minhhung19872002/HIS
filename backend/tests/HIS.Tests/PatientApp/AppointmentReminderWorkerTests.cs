using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using HIS.PatientApp.Api.Workers;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Nhắc lịch khám trước 1 ngày và trước 1 giờ (HSMT I.2 #4, dòng I.2.4.3 của bảng nghiệm thu).
///
/// <para><b>Vì sao bộ kiểm này ra đời muộn.</b> Ô I.2.4.3 tự ghi "mốc nhắc 24h/1h chưa kiểm được
/// bằng smoke vì phụ thuộc đồng hồ thật — sẽ kiểm ở Phase 8 bằng test tua thời gian", rồi Phase 8
/// đóng với dấu ✅ mà lời hứa đó không ai làm. Cả 67 phép kiểm của BFF đều chỉ chạm tới hàm thuần
/// (chuẩn hoá SĐT, so phiên bản, ví giấy tờ), **không bài nào chạm tới CSDL** — nên một lỗi nằm
/// ngay trong câu truy vấn chọn ứng viên không có gì bắt được.</para>
///
/// <para>Không tua đồng hồ hệ thống: đặt <c>AppointmentAt</c> lệch so với hiện tại đúng bằng mốc
/// cần kiểm rồi gọi thẳng <c>SendDueRemindersAsync</c>. Cách đó không phụ thuộc đồng hồ máy chạy
/// test và cũng không cần chờ một giây nào.</para>
/// </summary>
public class AppointmentReminderWorkerTests : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly ServiceProvider _sp;

    public AppointmentReminderWorkerTests()
    {
        // Sqlite in-memory chứ không phải provider InMemory: worker dùng transaction (qua
        // NotificationService) mà provider InMemory không hỗ trợ — kiểm trên nó là kiểm một thứ
        // khác với thứ chạy thật.
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();

        var services = new ServiceCollection();
        services.AddLogging(b => b.AddProvider(NullLoggerProvider.Instance));
        services.AddDbContext<PatientAppDbContext>(o => o.UseSqlite(_conn));
        services.AddScoped<NotificationService>();
        _sp = services.BuildServiceProvider();

        using var scope = _sp.CreateScope();
        scope.ServiceProvider.GetRequiredService<PatientAppDbContext>().Database.EnsureCreated();
    }

    public void Dispose()
    {
        _sp.Dispose();
        _conn.Dispose();
        GC.SuppressFinalize(this);
    }

    private AppointmentReminderWorker NewWorker() => new(
        _sp.GetRequiredService<IServiceScopeFactory>(),
        Options.Create(new AppointmentReminderOptions()),
        NullLogger<AppointmentReminderWorker>.Instance);

    private PatientAppDbContext Db() => _sp.GetRequiredService<PatientAppDbContext>();

    private Guid SeedAccount(string phone = "+84912345678")
    {
        var db = Db();
        var account = new AppAccount
        {
            PhoneNumber = phone,
            FullName = "Nguyễn Văn Kiểm",
            PasswordHash = "x",
            Status = AppAccountStatus.Active,
        };
        db.Accounts.Add(account);
        db.SaveChanges();
        return account.Id;
    }

    private AppointmentReminder SeedReminder(Guid accountId, TimeSpan fromNow, int status = 0,
        string? code = null)
    {
        var db = Db();
        var reminder = new AppointmentReminder
        {
            AccountId = accountId,
            AppointmentCode = code ?? $"LH{Guid.NewGuid():N}"[..10],
            AppointmentAt = DateTime.UtcNow + fromNow,
            DepartmentName = "Khoa Nội",
            Status = status,
        };
        db.AppointmentReminders.Add(reminder);
        db.SaveChanges();
        return reminder;
    }

    private List<AppNotification> Notifications() =>
        Db().Notifications.AsNoTracking().ToList();

    // ─────────────────────────────────────────────────── mốc nhắc

    [Fact]
    public async Task Truoc1Gio_ThiNhac()
    {
        var account = SeedAccount();
        var reminder = SeedReminder(account, TimeSpan.FromMinutes(30));

        await NewWorker().SendDueRemindersAsync(default);

        var saved = Db().AppointmentReminders.AsNoTracking().Single(r => r.Id == reminder.Id);
        Assert.NotNull(saved.RemindedHourBeforeAt);
        Assert.Contains(Notifications(), n => n.Title == "Sắp tới giờ khám");
    }

    [Fact]
    public async Task Truoc1Ngay_ThiNhac()
    {
        var account = SeedAccount();
        var reminder = SeedReminder(account, TimeSpan.FromHours(20));

        await NewWorker().SendDueRemindersAsync(default);

        var saved = Db().AppointmentReminders.AsNoTracking().Single(r => r.Id == reminder.Id);
        Assert.NotNull(saved.RemindedDayBeforeAt);
        Assert.Null(saved.RemindedHourBeforeAt);
    }

    [Fact]
    public async Task ConXa_ThiChuaNhacGi()
    {
        var account = SeedAccount();
        var reminder = SeedReminder(account, TimeSpan.FromDays(3));

        await NewWorker().SendDueRemindersAsync(default);

        var saved = Db().AppointmentReminders.AsNoTracking().Single(r => r.Id == reminder.Id);
        Assert.Null(saved.RemindedDayBeforeAt);
        Assert.Null(saved.RemindedHourBeforeAt);
        Assert.Empty(Notifications());
    }

    [Fact]
    public async Task DaQuaGioHen_ThiKhongNhac()
    {
        var account = SeedAccount();
        SeedReminder(account, TimeSpan.FromMinutes(-30));

        await NewWorker().SendDueRemindersAsync(default);

        Assert.Empty(Notifications());
    }

    [Fact]
    public async Task LichDaDong_ThiKhongNhac()
    {
        var account = SeedAccount();
        SeedReminder(account, TimeSpan.FromMinutes(30), status: 2);

        await NewWorker().SendDueRemindersAsync(default);

        Assert.Empty(Notifications());
    }

    [Fact]
    public async Task ChayHaiVong_ChiNhacMotLan()
    {
        var account = SeedAccount();
        SeedReminder(account, TimeSpan.FromMinutes(30));

        await NewWorker().SendDueRemindersAsync(default);
        await NewWorker().SendDueRemindersAsync(default);

        Assert.Single(Notifications());
    }

    // ─────────────────────────────────────────── đói ứng viên (lỗi thật)

    /// <summary>
    /// Lịch xa ngày KHÔNG được lọt vào tập ứng viên.
    ///
    /// Đây là nửa đầu của lỗi đã đo được trên PostgreSQL thật: bộ lọc cũ khớp **mọi** lịch tương lai
    /// chưa nhắc đủ hai mốc — một lịch đặt trước ba tháng cũng khớp, dù nó chẳng bắn được mốc nào.
    /// Bệnh viện có hơn 200 lịch phía trước là tập ứng viên tràn, rồi <c>Take(200)</c> cắt mất đúng
    /// những lịch đang tới hạn.
    ///
    /// Kiểm thẳng vào tập ứng viên chứ không kiểm qua kết quả chạy: chạy worker rồi xem kết quả thì
    /// SQLite vẫn xanh cả khi lỗi còn nguyên (planner ở đó đi theo index nên vô tình đúng thứ tự).
    /// </summary>
    [Fact]
    public void LichXaNgay_KhongLotVaoTapUngVien()
    {
        var account = SeedAccount();
        var db = Db();
        for (var i = 0; i < 250; i++)
        {
            db.AppointmentReminders.Add(new AppointmentReminder
            {
                AccountId = account,
                AppointmentCode = $"XA{i:D4}",
                AppointmentAt = DateTime.UtcNow.AddDays(30 + i),
            });
        }
        db.SaveChanges();
        SeedReminder(account, TimeSpan.FromMinutes(30), code: "SAPTOI");

        var ungVien = AppointmentReminderWorker
            .DueCandidates(Db(), DateTime.UtcNow).ToList();

        Assert.Single(ungVien);
        Assert.Equal("SAPTOI", ungVien[0].AppointmentCode);
    }

    /// <summary>
    /// Câu truy vấn phải có thứ tự XÁC ĐỊNH.
    ///
    /// Nửa sau của lỗi. SQL không hứa hẹn gì về thứ tự khi thiếu <c>ORDER BY</c>; đo trên đúng
    /// PostgreSQL của sản phẩm thì planner chọn Seq Scan và trả theo thứ tự heap, nên <c>LIMIT</c>
    /// cắt phải lịch đang tới hạn. Kiểm trên chuỗi SQL sinh ra để bài kiểm này không phụ thuộc
    /// planner của engine đang chạy test.
    /// </summary>
    [Fact]
    public void CauTruyVanUngVien_PhaiCoThuTuXacDinh()
    {
        var sql = AppointmentReminderWorker.DueCandidates(Db(), DateTime.UtcNow).ToQueryString();

        Assert.Contains("ORDER BY", sql, StringComparison.OrdinalIgnoreCase);
    }

    // ─────────────────────────────────────────────── chữ trong lời nhắc

    [Fact]
    public async Task LichCungNgay_KhongNoiLaNgayMai()
    {
        var account = SeedAccount();
        // 5 giờ nữa: rơi vào mốc "trước 1 ngày" (2–24 giờ) nhưng vẫn là hôm nay theo giờ Việt Nam.
        var gioVnHienTai = DateTime.UtcNow.AddHours(7);
        if (gioVnHienTai.Hour >= 19) return; // gần nửa đêm thì +5h sang ngày khác, bỏ qua

        SeedReminder(account, TimeSpan.FromHours(5));

        await NewWorker().SendDueRemindersAsync(default);

        var notification = Assert.Single(Notifications());
        Assert.Equal("Nhắc lịch khám hôm nay", notification.Title);
    }
}
