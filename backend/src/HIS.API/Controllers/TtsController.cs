using HIS.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace HIS.API.Controllers;

/// <summary>
/// Đọc câu tiếng Việt thành file WAV cho màn hình gọi số.
///
/// <para>Không yêu cầu đăng nhập: TV treo ở sảnh mở thẳng <c>/v2/queue-display</c> mà không có tài
/// khoản — cùng lý do endpoint <c>reception/queue/display/{roomId}</c> để ẩn danh. Bù lại phải
/// chặn lạm dụng: câu tối đa <see cref="ViSpeechLimits.MaxTextLength"/> ký tự, giới hạn số lượt theo
/// IP, và kết quả có cache nên câu lặp không tốn thêm CPU.</para>
/// </summary>
[AllowAnonymous]
[ApiController]
[Route("api/tts")]
public class TtsController : ControllerBase
{
    /// <summary>Số lượt đọc tối đa cho mỗi IP trong một phút.</summary>
    private const int RateLimitPerMinute = 120;

    private readonly IViSpeechService _speech;
    private readonly IMemoryCache _cache;

    public TtsController(IViSpeechService speech, IMemoryCache cache)
    {
        _speech = speech;
        _cache = cache;
    }

    /// <summary>
    /// Trả file WAV đọc <paramref name="text"/> bằng giọng tiếng Việt.
    /// 503 nghĩa là máy chủ này chưa cài bộ đọc — phía màn hình tự quay về giọng của trình duyệt.
    /// </summary>
    // KHÔNG dùng [Produces("audio/wav")]: nó bật thương lượng nội dung, nên mọi phản hồi CÓ THÂN
    // khác kiểu (400/503 trả chuỗi lỗi) bị đổi thành 406 Not Acceptable. Màn hình gọi số dựa vào
    // đúng mã 503 để biết máy chủ chưa có bộ đọc mà tạm ngừng hỏi — 406 thì nó hỏi lại mỗi lượt gọi.
    [HttpGet("vi")]
    public async Task<IActionResult> SpeakVietnamese([FromQuery] string? text, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(text)) return BadRequest("Thiếu nội dung cần đọc.");
        if (text.Length > ViSpeechLimits.MaxTextLength)
            return BadRequest($"Câu đọc tối đa {ViSpeechLimits.MaxTextLength} ký tự.");
        if (!_speech.IsAvailable) return StatusCode(StatusCodes.Status503ServiceUnavailable, "Máy chủ chưa cài bộ đọc tiếng Việt.");
        if (IsRateLimited()) return StatusCode(StatusCodes.Status429TooManyRequests, "Gọi quá nhiều, thử lại sau.");

        var wav = await _speech.SynthesizeAsync(text, cancellationToken);
        if (wav is null or { Length: 0 })
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Không đọc được câu này.");

        // Câu gọi số lặp đi lặp lại cả ngày ("Mời số ... vào Phòng khám ..."), để trình duyệt giữ
        // lại thì lần gọi sau phát ra tức thì mà máy chủ không phải đọc lại.
        // `private`: chỉ trình duyệt được giữ, KHÔNG cho proxy dùng chung giữ — câu đọc có thể
        // mang tên bệnh nhân, không để nó nằm trong bộ đệm mà người khác chạm tới được.
        Response.Headers.CacheControl = "private, max-age=3600";
        return File(wav, "audio/wav");
    }

    private bool IsRateLimited()
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var key = $"tts:rate:{ip}:{DateTime.UtcNow:yyyyMMddHHmm}";
        var count = _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
            return 0;
        });
        count++;
        _cache.Set(key, count, TimeSpan.FromMinutes(2));
        return count > RateLimitPerMinute;
    }
}
