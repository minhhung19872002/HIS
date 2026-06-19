using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Tests.Fixtures;

/// <summary>
/// Lưới test khu trú cho #185-190 (patient-safety + tiền). Tạo HISDbContext nền InMemory,
/// mỗi test một DB riêng (Guid) để cô lập tuyệt đối — không chia sẻ trạng thái.
/// Dùng ctor options-only (KHÔNG IDataProtectionProvider) — encryption config được null-guard
/// trong OnModelCreating nên bỏ qua an toàn khi test.
/// </summary>
public static class TestDb
{
    public static HISDbContext NewInMemory()
    {
        var options = new DbContextOptionsBuilder<HISDbContext>()
            .UseInMemoryDatabase($"his-test-{Guid.NewGuid():N}")
            .EnableSensitiveDataLogging()
            .Options;
        var ctx = new HISDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }
}
