using HIS.Tests.Fixtures;
using Xunit;

namespace HIS.Tests;

/// <summary>Kiểm tra harness chạy + HISDbContext InMemory dựng được model.</summary>
public class SmokeTest
{
    [Fact]
    public void Harness_runs()
    {
        Assert.True(true);
    }

    [Fact]
    public void InMemory_context_builds_and_saves()
    {
        using var ctx = TestDb.NewInMemory();
        Assert.NotNull(ctx);
        // model dựng được + SaveChanges trống chạy được
        var n = ctx.SaveChanges();
        Assert.Equal(0, n);
    }
}
