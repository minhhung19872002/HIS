namespace HIS.Core.Constants;

/// <summary>
/// Trần kích thước kết quả cho list endpoint CHƯA phân trang (#196 PERF-2).
/// Mục tiêu: chặn tải nguyên bảng vào RAM (OOM) mà KHÔNG đổi hành vi với dữ liệu thường.
///
/// ⚠️ CHỈ áp cho query TRẢ ROWS VỀ CLIENT (list endpoint). KHÔNG áp cho query
/// load-all-rồi-aggregate-in-memory (count/sum/group) — bound ở đó = sai số liệu;
/// loại đó phải đẩy aggregate xuống SQL.
/// </summary>
public static class QueryLimits
{
    /// <summary>Trần mặc định cho list endpoint vô biên (đủ lớn để không chạm với dữ liệu thường).</summary>
    public const int DefaultListCeiling = 5000;
}
