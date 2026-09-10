namespace HIS.Application.Services;

/// <summary>
/// Đọc câu tiếng Việt thành âm thanh (WAV) NGAY TRÊN MÁY CHỦ.
///
/// Vì sao cần: màn hình gọi số chạy trên TV/máy tính ở sảnh, trước đây dùng Web Speech API của
/// trình duyệt nên phụ thuộc máy đó có cài giọng tiếng Việt hay không — máy không có thì loa đọc
/// ra giọng tiếng Anh, bệnh nhân không nghe được. Đọc ở máy chủ thì mọi màn hình đều nghe giống
/// nhau, không phải cài gì trên máy trạm.
/// </summary>
public interface IViSpeechService
{
    /// <summary>Máy chủ có sẵn bộ đọc không (ảnh Docker prod có; máy dev thường không).</summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Trả về nội dung file WAV, hoặc <c>null</c> nếu không đọc được (chưa cài bộ đọc, quá thời
    /// gian, hoặc câu rỗng). Người gọi tự lo phương án dự phòng.
    /// </summary>
    Task<byte[]?> SynthesizeAsync(string text, CancellationToken cancellationToken = default);
}

/// <summary>Giới hạn dùng chung cho bộ đọc — khai báo MỘT nơi để controller và service không lệch nhau.</summary>
public static class ViSpeechLimits
{
    /// <summary>Câu gọi số dài nhất cũng chỉ vài chục ký tự — chặn ở đây để không ai bơm cả cuốn sách.</summary>
    public const int MaxTextLength = 200;
}
