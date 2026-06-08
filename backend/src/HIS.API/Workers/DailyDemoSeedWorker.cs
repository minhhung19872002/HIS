using HIS.API.Controllers;
using HIS.Infrastructure.Data;

namespace HIS.API.Workers;

/// <summary>
/// Background worker bơm dữ liệu demo mỗi ngày để màn hình Tiếp Đón (và các phân hệ
/// khác) luôn có dữ liệu để review.
///
/// Mỗi chu kỳ (mặc định 24h, chạy lần đầu ~30s sau khi app khởi động) worker:
///   1. Gọi <see cref="DailySeedController.RunDailySeedAsync"/> — sinh bệnh nhân tiếp đón
///      hôm nay + hồ sơ/khám/đơn thuốc/XN/CĐHA/PT/nội trú/viện phí/hàng đợi của ngày.
///   2. Gọi <see cref="PopulateDataController.PopulateAll"/> — fill các bảng còn rỗng cho
///      những phân hệ chưa có dữ liệu (KSNK, portal, thiết bị, GPB, chất lượng, PHCN,
///      tele, dinh dưỡng, ngân hàng máu, y tế công cộng, methadone, lab-QC, MCI, CME...).
///
/// Cả hai bước đều idempotent (kiểm tra count theo mã *SEED* / bảng rỗng) nên chạy lại
/// nhiều lần trong ngày không tạo trùng. Tái sử dụng nguyên logic 2 controller seed
/// có sẵn — worker chỉ điều phối lịch chạy, không nhân bản logic.
///
/// Cấu hình (mặc định TẮT cho local/test — bật trên Cloud Run qua env var):
///   DailyDemoSeed:Enabled          (default false)   → env DailyDemoSeed__Enabled=true
///   DailyDemoSeed:PatientsPerDay   (default 30)
///   DailyDemoSeed:IntervalHours    (default 24)
/// </summary>
public sealed class DailyDemoSeedWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DailyDemoSeedWorker> _logger;
    private readonly bool _enabled;
    private readonly int _patientsPerDay;
    private readonly TimeSpan _interval;

    public DailyDemoSeedWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<DailyDemoSeedWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _enabled = config.GetValue<bool>("DailyDemoSeed:Enabled", false);
        _patientsPerDay = config.GetValue<int>("DailyDemoSeed:PatientsPerDay", 30);
        _interval = TimeSpan.FromHours(config.GetValue<int>("DailyDemoSeed:IntervalHours", 24));
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
            "DailyDemoSeedWorker started — interval={Hours}h, patientsPerDay={Count}",
            (int)_interval.TotalHours, _patientsPerDay);

        // Chờ app bootstrap + DB sẵn sàng trước khi seed lần đầu.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SeedOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Worker không được die — log rồi tiếp tục chu kỳ sau.
                _logger.LogError(ex, "DailyDemoSeedWorker iteration failed — will retry next cycle");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task SeedOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<HISDbContext>();
        var config = sp.GetRequiredService<IConfiguration>();

        // Bước 1 — Tiếp Đón + workflow lâm sàng của hôm nay.
        // Khởi tạo trực tiếp controller với các dependency đã resolve: hai phương thức
        // seed dưới đây chỉ dùng DbContext/Config/Logger, không chạm HttpContext nên
        // gọi in-process an toàn (tránh self-HTTP + không cần X-Seed-Key/URL).
        var daily = new DailySeedController(
            db, config, sp.GetRequiredService<ILogger<DailySeedController>>());
        var dailyResult = await daily.RunDailySeedAsync(_patientsPerDay, purge: false);
        if (dailyResult is null)
            _logger.LogWarning(
                "DailyDemoSeedWorker: bỏ qua seed tiếp đón — chưa có phòng khám (Room active) nào");
        // SeedPatients/PopulateAll mỗi cái tự SaveChanges; xoá tracker giữa 2 bước cho sạch.
        db.ChangeTracker.Clear();

        if (ct.IsCancellationRequested) return;

        // Bước 2 — fill các phân hệ còn rỗng (PopulateAll đã orchestrate đúng thứ tự).
        var populate = new PopulateDataController(
            db, sp.GetRequiredService<ILogger<PopulateDataController>>());
        await populate.PopulateAll();
        db.ChangeTracker.Clear();

        _logger.LogInformation("DailyDemoSeedWorker: hoàn tất một chu kỳ seed demo");
    }
}
