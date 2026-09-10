using System.Diagnostics;
using System.Text;
using HIS.Application.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services.Speech;

/// <summary>
/// <see cref="IViSpeechService"/> chạy bằng Piper — bộ đọc mã nguồn mở, chạy CPU, không gọi ra
/// Internet và không tốn phí theo lượt. Ảnh Docker prod đã kèm sẵn nhị phân + giọng
/// <c>vi_VN-vais1000-medium</c> ở <c>/opt/piper</c>; máy dev không có thì
/// <see cref="IsAvailable"/> = false và màn hình gọi số tự quay về Web Speech API.
/// </summary>
public sealed class PiperSpeechService : IViSpeechService
{
    private const int TimeoutMs = 15_000;

    private readonly IMemoryCache _cache;
    private readonly ILogger<PiperSpeechService> _logger;
    private readonly string _piperPath;
    private readonly string _modelPath;
    private readonly string? _espeakDataPath;

    /// <summary>
    /// Piper ăn gần trọn một lõi CPU cho mỗi câu. Máy chủ còn phải phục vụ API nên chỉ cho phép
    /// 2 câu chạy song song, phần còn lại xếp hàng — chậm vài trăm mili-giây còn hơn treo API.
    /// </summary>
    private static readonly SemaphoreSlim Throttle = new(2, 2);

    public PiperSpeechService(IMemoryCache cache, IConfiguration configuration, ILogger<PiperSpeechService> logger)
    {
        _cache = cache;
        _logger = logger;
        _piperPath = configuration["Tts:PiperPath"] ?? "/opt/piper/piper";
        _modelPath = configuration["Tts:VoiceModel"] ?? "/opt/piper/vi_VN-vais1000-medium.onnx";

        var espeak = configuration["Tts:EspeakData"]
            ?? Path.Combine(Path.GetDirectoryName(_piperPath) ?? ".", "espeak-ng-data");
        _espeakDataPath = Directory.Exists(espeak) ? espeak : null;
    }

    public bool IsAvailable => File.Exists(_piperPath) && File.Exists(_modelPath);

    public async Task<byte[]?> SynthesizeAsync(string text, CancellationToken cancellationToken = default)
    {
        text = Normalize(text);
        if (text.Length == 0 || !IsAvailable) return null;

        if (_cache.TryGetValue<byte[]>(CacheKey(text), out var cached) && cached is not null) return cached;

        await Throttle.WaitAsync(cancellationToken);
        try
        {
            // Đọc lại lần nữa: trong lúc xếp hàng có thể câu này đã được đọc xong và nằm trong cache.
            if (_cache.TryGetValue<byte[]>(CacheKey(text), out cached) && cached is not null) return cached;

            var wav = await RunPiperAsync(text, cancellationToken);
            if (wav is { Length: > 0 })
            {
                _cache.Set(CacheKey(text), wav, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6),
                });
            }
            return wav;
        }
        finally
        {
            Throttle.Release();
        }
    }

    /// <summary>
    /// Bỏ ký tự điều khiển (kể cả xuống dòng — Piper đọc theo TỪNG DÒNG stdin, còn dòng thừa thì
    /// nó ghi đè file kết quả) rồi gộp khoảng trắng và cắt cho đủ ngắn.
    /// </summary>
    private static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var sb = new StringBuilder(text.Length);
        var lastWasSpace = false;
        foreach (var ch in text)
        {
            var c = char.IsControl(ch) ? ' ' : ch;
            if (c == ' ')
            {
                if (lastWasSpace || sb.Length == 0) continue;
                lastWasSpace = true;
            }
            else
            {
                lastWasSpace = false;
            }
            sb.Append(c);
            if (sb.Length >= ViSpeechLimits.MaxTextLength) break;
        }
        return sb.ToString().TrimEnd();
    }

    private static string CacheKey(string text) => "tts:vi:" + text;

    private async Task<byte[]?> RunPiperAsync(string text, CancellationToken cancellationToken)
    {
        var outputPath = Path.Combine(Path.GetTempPath(), $"tts-{Guid.NewGuid():N}.wav");
        var psi = new ProcessStartInfo
        {
            FileName = _piperPath,
            WorkingDirectory = Path.GetDirectoryName(_piperPath),
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            StandardInputEncoding = new UTF8Encoding(false),
        };
        // Truyền từng tham số rời (KHÔNG ghép chuỗi lệnh) và đưa câu qua stdin — nội dung do người
        // dùng nhập không bao giờ chạm tới shell.
        psi.ArgumentList.Add("--model");
        psi.ArgumentList.Add(_modelPath);
        psi.ArgumentList.Add("--output_file");
        psi.ArgumentList.Add(outputPath);
        if (_espeakDataPath is not null)
        {
            psi.ArgumentList.Add("--espeak_data");
            psi.ArgumentList.Add(_espeakDataPath);
        }

        try
        {
            using var process = Process.Start(psi);
            if (process is null) return null;

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeoutMs);

            await process.StandardInput.WriteLineAsync(text);
            process.StandardInput.Close();

            try
            {
                await process.WaitForExitAsync(timeout.Token);
            }
            catch (OperationCanceledException)
            {
                TryKill(process);
                _logger.LogWarning("Piper quá {Timeout}ms, bỏ câu đọc.", TimeoutMs);
                return null;
            }

            if (process.ExitCode != 0)
            {
                var stderr = await process.StandardError.ReadToEndAsync(CancellationToken.None);
                _logger.LogWarning("Piper thoát mã {Code}: {Error}", process.ExitCode, stderr);
                return null;
            }

            return File.Exists(outputPath)
                ? await File.ReadAllBytesAsync(outputPath, CancellationToken.None)
                : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không chạy được Piper tại {Path}.", _piperPath);
            return null;
        }
        finally
        {
            try { if (File.Exists(outputPath)) File.Delete(outputPath); } catch { /* file tạm, mất cũng không sao */ }
        }
    }

    private static void TryKill(Process process)
    {
        try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch { /* đã tự thoát */ }
    }
}
