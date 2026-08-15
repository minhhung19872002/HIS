using HIS.API.Workers;
using Xunit;

namespace HIS.Tests.Workers;

/// <summary>
/// Hồi quy cho sự cố prod 14/8: appsettings đặt AuditFallback:Directory = "" (placeholder),
/// `??` chỉ chặn null nên chuỗi rỗng lọt qua → Directory.CreateDirectory("") ném
/// ArgumentException → batch audit "PERMANENTLY LOST" đúng lúc DB đang chết.
/// </summary>
public sealed class AuditWriterWorkerTests
{
    private static readonly string Default = Path.Combine(Path.GetTempPath(), "his-audit-fallback");

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Blank_or_missing_config_falls_back_to_temp_default(string? configured)
    {
        Assert.Equal(Default, AuditWriterWorker.ResolveFallbackDir(configured));
    }

    [Fact]
    public void Explicit_directory_is_honored()
    {
        Assert.Equal("/var/log/his-audit", AuditWriterWorker.ResolveFallbackDir("/var/log/his-audit"));
    }

    [Fact]
    public void Resolved_default_is_a_valid_creatable_path()
    {
        // Chính thao tác đã nổ trên prod — giờ phải luôn hợp lệ với default.
        var dir = AuditWriterWorker.ResolveFallbackDir("");
        var info = Directory.CreateDirectory(dir);
        Assert.True(info.Exists);
    }
}
