using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Data;

/// <summary>
/// #197(b) DATA-5: suy danh sách bảng có cột CreatedBy/UpdatedBy kiểu uniqueidentifier
/// TỪ SCHEMA THẬT thay vì chỉ dựa list tay trong HISDbContext (list tay thiếu bảng mới
/// → InvalidCastException Guid↔String lúc runtime, đã xảy ra với SigningRequest 2026-06-12).
///
/// Cách dùng: Program.cs gọi <see cref="InitializeFromSchema"/> MỘT LẦN trước lần dùng
/// DbContext đầu tiên (trước khi model được build). OnModelCreating sau đó hỏi
/// <see cref="Contains"/> theo TABLE name, UNION với hand-list cũ (không bao giờ thu hẹp).
/// Probe lỗi (DB chưa lên) → fail-safe: trả false, chỉ còn hand-list — hành vi y như trước.
///
/// Lưu ý vòng đời: bảng MỚI được migration tạo trong CÙNG lần boot sẽ chưa có trong probe
/// (probe chạy trước migration) → instance kế tiếp (Cloud Run scale/restart) tự vá.
/// Hand-list vẫn là chỗ khai báo chắc chắn cho bảng mới nếu cần hiệu lực ngay boot đầu.
/// </summary>
public static class GuidAuditSchemaRegistry
{
    private static HashSet<string>? _tables;

    /// <summary>True nếu probe schema thành công (đang chạy chế độ derive).</summary>
    public static bool Initialized => _tables != null;

    public static void InitializeFromSchema(string connectionString, ILogger? logger = null)
    {
        try
        {
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using var conn = new SqlConnection(connectionString);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
SELECT DISTINCT TABLE_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME IN ('CreatedBy','UpdatedBy') AND DATA_TYPE = 'uniqueidentifier'";
            using var reader = cmd.ExecuteReader();
            while (reader.Read()) set.Add(reader.GetString(0));
            _tables = set;
            logger?.LogInformation(
                "GuidAuditSchemaRegistry: derived {Count} tables with uniqueidentifier CreatedBy/UpdatedBy from schema",
                set.Count);
        }
        catch (Exception ex)
        {
            _tables = null;
            logger?.LogWarning(ex,
                "GuidAuditSchemaRegistry: schema probe failed — falling back to hand-maintained whitelist only");
        }
    }

    public static bool Contains(string? tableName)
        => tableName != null && _tables != null && _tables.Contains(tableName);
}
