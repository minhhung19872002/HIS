using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>
/// QA-R12: liên kết tài khoản cổng BN ↔ hồ sơ chỉ dựa vào mã BN + SĐT/CCCD/ngày sinh (dò được) trên endpoint
/// ẩn danh. Giới hạn số lần sai / 24h theo tài khoản và theo IP, và không cho tài khoản thứ hai liên kết
/// một hồ sơ đã có chủ trừ khi nhân viên duyệt.
/// </summary>
public sealed class PortalLinkGuardTests
{
    private readonly Guid _patientId = Guid.NewGuid();
    private const string Code = "BN-QA-R12";
    private const string Dob = "1990-05-17";

    private static PatientPortalServiceImpl Build(HISDbContext ctx) =>
        new(ctx, new Mock<IRISCompleteService>().Object, new Mock<IAppointmentBookingService>().Object);

    private HISDbContext Seed(params Guid[] accountIds)
    {
        var ctx = TestDb.NewInMemory();
        ctx.Patients.Add(new Patient { Id = _patientId, PatientCode = Code, FullName = "BN QA-R12", DateOfBirth = DateTime.Parse(Dob) });
        foreach (var id in accountIds)
            ctx.PortalAccounts.Add(new PortalAccount { Id = id, Username = $"u{id:N}", Status = "Pending" });
        ctx.SaveChanges();
        return ctx;
    }

    [Fact]
    public async Task Sai_5_lan_theo_tai_khoan_thi_lan_6_bi_chan_du_dung_thong_tin()
    {
        var acc = Guid.NewGuid();
        using var ctx = Seed(acc);
        var svc = Build(ctx);
        for (var i = 0; i < PatientPortalServiceImpl.MaxFailedLinkPerAccount24h; i++)
            Assert.Equal("MISMATCH", (await svc.LinkPatientRecordGuardedAsync(acc, Code, $"2000-01-0{i + 1}", "10.0.0.1", false)).Code);

        var r = await svc.LinkPatientRecordGuardedAsync(acc, Code, Dob, "10.0.0.2", false);
        Assert.False(r.Success);
        Assert.Equal("TOO_MANY_ATTEMPTS", r.Code);

        // Nhân viên tại quầy vẫn liên kết được.
        Assert.True((await svc.LinkPatientRecordGuardedAsync(acc, Code, Dob, "10.0.0.2", true)).Success);
    }

    [Fact]
    public async Task Doi_tai_khoan_khong_lach_duoc_gioi_han_theo_IP()
    {
        var accounts = Enumerable.Range(0, 6).Select(_ => Guid.NewGuid()).ToArray();
        using var ctx = Seed(accounts);
        var svc = Build(ctx);
        var n = 0;
        foreach (var acc in accounts.Take(5))
            for (var i = 0; i < 4 && n < PatientPortalServiceImpl.MaxFailedLinkPerIp24h; i++, n++)
                await svc.LinkPatientRecordGuardedAsync(acc, Code, $"1999-{i + 1:00}-01", "10.9.9.9", false);

        var r = await svc.LinkPatientRecordGuardedAsync(accounts[5], Code, Dob, "10.9.9.9", false);
        Assert.Equal("TOO_MANY_ATTEMPTS", r.Code);
        // Một IP khác không bị ảnh hưởng.
        Assert.True((await svc.LinkPatientRecordGuardedAsync(accounts[5], Code, Dob, "10.1.1.1", false)).Success);
    }

    [Fact]
    public async Task Ho_so_da_co_tai_khoan_active_thi_tai_khoan_thu_hai_bi_tu_choi_tru_khi_nhan_vien_duyet()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        using var ctx = Seed(first, second);
        var svc = Build(ctx);
        Assert.True((await svc.LinkPatientRecordGuardedAsync(first, Code, Dob, "10.0.0.1", false)).Success);

        var r = await svc.LinkPatientRecordGuardedAsync(second, Code, Dob, "10.0.0.3", false);
        Assert.False(r.Success);
        Assert.Equal("ALREADY_LINKED", r.Code);

        Assert.True((await svc.LinkPatientRecordGuardedAsync(second, Code, Dob, "10.0.0.3", true)).Success);
    }

    [Fact]
    public async Task Sai_thong_tin_khong_tiet_lo_ho_so_da_co_chu()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        using var ctx = Seed(first, second);
        var svc = Build(ctx);
        await svc.LinkPatientRecordGuardedAsync(first, Code, Dob, null, false);

        // Sai ngày sinh → cùng một câu trả lời "không khớp", không lộ "đã liên kết tài khoản khác".
        Assert.Equal("MISMATCH", (await svc.LinkPatientRecordGuardedAsync(second, Code, "1991-01-01", null, false)).Code);
    }
}
