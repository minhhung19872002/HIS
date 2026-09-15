using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Services;

namespace HIS.PatientApp.Api.Workers;

public class PatientMergeReconcileOptions
{
    public const string SectionName = "PatientMergeReconcile";

    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Chu kỳ hỏi HIS id nào đã bị ghép. Ghép hồ sơ hiếm; 15 phút nghĩa là người bệnh thấy dữ liệu trở lại
    /// chậm nhất 15 phút sau khi quầy ghép, đổi lại chỉ vài lời gọi HIS mỗi giờ.
    /// </summary>
    public int PollIntervalMinutes { get; set; } = 15;
}

/// <summary>Vòng lặp mỏng quanh <see cref="PatientMergeReconciler"/>.</summary>
public class PatientMergeReconcileWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly PatientMergeReconcileOptions _options;
    private readonly ILogger<PatientMergeReconcileWorker> _logger;

    public PatientMergeReconcileWorker(
        IServiceScopeFactory scopeFactory,
        Microsoft.Extensions.Options.IOptions<PatientMergeReconcileOptions> options,
        ILogger<PatientMergeReconcileWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogWarning("PatientMergeReconcile:Enabled = false — tài khoản app KHÔNG đi theo hồ sơ ghép bên HIS.");
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(1, _options.PollIntervalMinutes));
        // Chờ một nhịp ngắn lúc khởi động để migration/HIS token sẵn sàng, rồi chạy ngay — không để người
        // bị ghép trong lúc BFF khởi động lại phải đợi thêm cả chu kỳ.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                await scope.ServiceProvider.GetRequiredService<PatientMergeReconciler>().RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (HisConnectorException ex)
            {
                _logger.LogWarning(ex, "Không hỏi được HIS về hồ sơ ghép, thử lại ở vòng sau.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đi theo hồ sơ ghép, thử lại ở vòng sau.");
            }

            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
