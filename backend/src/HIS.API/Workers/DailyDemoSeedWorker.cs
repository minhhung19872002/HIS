using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Infrastructure.Data;

namespace HIS.API.Workers;

/// <summary>
/// Background worker bơm dữ liệu demo mỗi ngày để màn hình Tiếp Đón (và các phân hệ
/// khác) luôn có dữ liệu để review.
///
/// Mỗi chu kỳ (chạy lần đầu ~30s sau khi app khởi động, sau đó mỗi ngày một lần) worker:
///   1. Gọi <see cref="IDailySeedService.RunDailySeedAsync"/> — sinh bệnh nhân tiếp đón
///      hôm nay + hồ sơ/khám/đơn thuốc/XN/CĐHA/PT/nội trú/viện phí/hàng đợi của ngày.
///   2. Gọi <see cref="IPopulateDataService.PopulateAllAsync"/> — fill các bảng còn rỗng cho
///      những phân hệ chưa có dữ liệu (KSNK, portal, thiết bị, GPB, chất lượng, PHCN,
///      tele, dinh dưỡng, ngân hàng máu, y tế công cộng, methadone, lab-QC, MCI, CME...).
///
/// Cả hai bước đều idempotent (kiểm tra count theo mã *SEED* / bảng rỗng) nên chạy lại
/// nhiều lần trong ngày không tạo trùng. Tái sử dụng nguyên logic 2 service seed
/// có sẵn (#365 REFAC-3 chuyển từ controller sang service) — worker chỉ điều phối lịch
/// chạy, không nhân bản logic.
///
/// Lịch chạy neo vào MỐC NỬA ĐÊM GIỜ VN, không phải "24h kể từ lúc app boot". Neo theo
/// boot làm dữ liệu của ngày mới chỉ xuất hiện đúng giờ container khởi động (vd 15:44 VN),
/// nên màn Tiếp Đón trống suốt từ 00:00 tới lúc đó mỗi ngày — đúng triệu chứng gặp trên
/// prod 17/08/2026. Seed lần đầu sau boot vẫn giữ để bắt kịp ngày hiện tại khi container
/// vừa restart giữa ngày.
///
/// Cấu hình (mặc định TẮT cho local/test — bật trên prod qua env var):
///   DailyDemoSeed:Enabled          (default false)    → env DailyDemoSeed__Enabled=true
///   DailyDemoSeed:PatientsPerDay   (default 30)
///   DailyDemoSeed:RunAtVnTime      (default "00:05")  → giờ VN chạy mỗi ngày
/// </summary>
public sealed class DailyDemoSeedWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyDemoSeedWorker> _logger;
    private readonly bool _enabled;
    private readonly int _patientsPerDay;
    private readonly TimeSpan _runAtVnTime;

    /// <summary>Seed hỏng thì thử lại sớm thay vì bỏ trống cả ngày.</summary>
    private static readonly TimeSpan RetryAfterFailure = TimeSpan.FromMinutes(30);

    public DailyDemoSeedWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<DailyDemoSeedWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("DailyDemoSeed:Enabled", false);
        _patientsPerDay = config.GetValue<int>("DailyDemoSeed:PatientsPerDay", 30);
        var runAtRaw = config.GetValue<string>("DailyDemoSeed:RunAtVnTime", "00:05");
        _runAtVnTime = TimeSpan.TryParse(runAtRaw, out var runAt)
                       && runAt >= TimeSpan.Zero && runAt < TimeSpan.FromDays(1)
            ? runAt
            : TimeSpan.FromMinutes(5);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation(
                "DailyDemoSeedWorker disabled (set DailyDemoSeed:Enabled=true to enable)");
            return;
        }

        _logger.LogInformation(
            "DailyDemoSeedWorker started — runAtVnTime={RunAt}, patientsPerDay={Count}",
            _runAtVnTime, _patientsPerDay);

        // Chờ app bootstrap + DB sẵn sàng trước khi seed lần đầu.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            var succeeded = true;
            try
            {
                await SeedOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Worker không được die — log rồi tiếp tục chu kỳ sau.
                succeeded = false;
                _logger.LogError(ex, "DailyDemoSeedWorker iteration failed — will retry next cycle");
            }

            var delay = succeeded ? DelayUntilNextVnRun() : RetryAfterFailure;
            _logger.LogInformation(
                "DailyDemoSeedWorker: chu kỳ kế tiếp sau {Delay} (giờ VN hiện tại {NowVn:yyyy-MM-dd HH:mm})",
                delay, VnTime.NowVn);

            try { await Task.Delay(delay, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    /// <summary>
    /// Khoảng chờ tới lần chạy kế tiếp = <see cref="_runAtVnTime"/> của NGÀY VN kế tiếp.
    /// Neo theo lịch VN (không cộng dồn 24h từ lúc boot) để dữ liệu "hôm nay" luôn có sẵn
    /// ngay đầu ngày làm việc, bất kể container khởi động lúc mấy giờ.
    /// </summary>
    private TimeSpan DelayUntilNextVnRun()
    {
        var nowVn = VnTime.NowVn;
        var nextRunVn = nowVn.Date.AddDays(1).Add(_runAtVnTime);
        var delay = nextRunVn - nowVn;
        // Chặn dưới: tránh busy-loop nếu đồng hồ nhảy hoặc _runAtVnTime rơi sát thời điểm hiện tại.
        return delay < TimeSpan.FromMinutes(1) ? TimeSpan.FromMinutes(1) : delay;
    }

    private async Task SeedOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<HISDbContext>();

        // Bước 1 — Tiếp Đón + workflow lâm sàng của hôm nay.
        // #365 REFAC-3: gọi thẳng service qua DI scope thay vì `new` controller trực tiếp
        // (controller không còn constructor nhận HISDbContext) — service chỉ dùng
        // DbContext/Logger, không chạm HttpContext nên gọi in-process an toàn (tránh
        // self-HTTP + không cần X-Seed-Key/URL).
        var dailySeedService = sp.GetRequiredService<IDailySeedService>();
        var dailyResult = await dailySeedService.RunDailySeedAsync(_patientsPerDay, purge: false);
        if (dailyResult is null)
            _logger.LogWarning(
                "DailyDemoSeedWorker: bỏ qua seed tiếp đón — chưa có phòng khám (Room active) nào");
        // SeedPatients/PopulateAll mỗi cái tự SaveChanges; xoá tracker giữa 2 bước cho sạch.
        db.ChangeTracker.Clear();

        if (ct.IsCancellationRequested) return;

        // Bước 2 — fill các phân hệ còn rỗng (PopulateAllAsync đã orchestrate đúng thứ tự).
        var populateDataService = sp.GetRequiredService<IPopulateDataService>();
        await populateDataService.PopulateAllAsync();
        db.ChangeTracker.Clear();

        _logger.LogInformation("DailyDemoSeedWorker: hoàn tất một chu kỳ seed demo");
    }
}
