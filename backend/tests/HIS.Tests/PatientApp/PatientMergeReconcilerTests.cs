using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using HIS.PatientApp.Api.Entities;
using HIS.PatientApp.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Quầy ghép hồ sơ trùng bên HIS → tài khoản app và liên kết người thân phải đi theo người.
///
/// <para>Đo trên prod 15/09: sau khi ghép B vào A, app của người bệnh B vẫn hỏi theo B và nhận HTTP 200
/// với 0 lượt khám, 0 lịch hẹn — không lỗi nào. Kiểm trên SQLite (không phải provider InMemory) để ràng
/// buộc duy nhất (OwnerAccountId, MemberPatientId) có hiệu lực thật.</para>
/// </summary>
public sealed class PatientMergeReconcilerTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly PatientAppDbContext _db;

    public PatientMergeReconcilerTests()
    {
        _conn.Open();
        _db = new PatientAppDbContext(new DbContextOptionsBuilder<PatientAppDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    private AppAccount Account(string phone, Guid? patient) => new()
    {
        PhoneNumber = phone, FullName = "Người bệnh", PasswordHash = "x",
        Status = AppAccountStatus.Active, HisPatientId = patient, HisPatientCode = patient is null ? null : "OLD",
    };

    private static AppFamilyLink Link(Guid owner, Guid member) => new()
    {
        OwnerAccountId = owner, MemberPatientId = member, MemberPatientCode = "OLD", MemberName = "Cũ",
        Status = AppFamilyLinkStatus.Verified,
    };

    private static HisMergeSuccessor Merged(Guid from, Guid to, string code) =>
        new() { PatientId = from, CurrentPatientId = to, CurrentPatientCode = code, CurrentFullName = "Người còn lại" };

    [Fact]
    public async Task Tai_khoan_va_nguoi_than_di_theo_ho_so_con_lai()
    {
        Guid b = Guid.NewGuid(), a = Guid.NewGuid(), untouched = Guid.NewGuid();
        Guid memberOld = Guid.NewGuid(), memberNew = Guid.NewGuid();
        Guid dupOld = Guid.NewGuid(), dupExisting = Guid.NewGuid();

        var merged = Account("+84900000001", b);             // hồ sơ của chính chủ bị ghép B → A
        var other = Account("+84900000002", untouched);      // không liên quan
        var withFamily = Account("+84900000003", Guid.NewGuid());
        _db.Accounts.AddRange(merged, other, withFamily);
        await _db.SaveChangesAsync();

        var moveLink = Link(withFamily.Id, memberOld);           // người thân bị ghép → trỏ lại
        var dupLink = Link(withFamily.Id, dupOld);               // ghép vào người ĐÃ có trong danh sách → thu hồi
        var existing = Link(withFamily.Id, dupExisting);
        var selfLink = Link(merged.Id, Guid.NewGuid());          // người thân hoá ra chính là chủ → thu hồi
        _db.FamilyLinks.AddRange(moveLink, dupLink, existing, selfLink);
        await _db.SaveChangesAsync();

        var his = new Mock<IHisConnector>();
        his.Setup(h => h.GetMergeSuccessorsAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<HisMergeSuccessor>
            {
                Merged(b, a, "BN-A"),
                Merged(memberOld, memberNew, "BN-MEMBER"),
                Merged(dupOld, dupExisting, "BN-EXISTING"),
                Merged(selfLink.MemberPatientId, a, "BN-A"),
            });

        var result = await new PatientMergeReconciler(_db, his.Object, NullLogger<PatientMergeReconciler>.Instance).RunOnceAsync();
        _db.ChangeTracker.Clear();

        Assert.Equal(new PatientMergeReconciler.Result(1, 1, 2), result);
        var accounts = await _db.Accounts.ToDictionaryAsync(x => x.Id);
        Assert.Equal(a, accounts[merged.Id].HisPatientId);
        Assert.Equal("BN-A", accounts[merged.Id].HisPatientCode);
        Assert.Equal(untouched, accounts[other.Id].HisPatientId);

        var links = await _db.FamilyLinks.ToDictionaryAsync(x => x.Id);
        Assert.Equal(memberNew, links[moveLink.Id].MemberPatientId);
        Assert.Equal(AppFamilyLinkStatus.Verified, links[moveLink.Id].Status);
        Assert.Equal(AppFamilyLinkStatus.Revoked, links[dupLink.Id].Status);
        Assert.Equal(AppFamilyLinkStatus.Revoked, links[selfLink.Id].Status);
        Assert.Equal(AppFamilyLinkStatus.Verified, links[existing.Id].Status);

        Assert.Contains(await _db.AccessAuditLogs.ToListAsync(),
            l => l.Action == "his_patient_merged" && l.ActorType == "system" && l.TargetPatientId == a);
    }

    [Fact]
    public async Task Khong_co_ho_so_nao_bi_ghep_thi_khong_doi_gi()
    {
        _db.Accounts.Add(Account("+84900000009", Guid.NewGuid()));
        await _db.SaveChangesAsync();
        var his = new Mock<IHisConnector>();
        his.Setup(h => h.GetMergeSuccessorsAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<HisMergeSuccessor>());

        var result = await new PatientMergeReconciler(_db, his.Object, NullLogger<PatientMergeReconciler>.Instance).RunOnceAsync();

        Assert.Equal(new PatientMergeReconciler.Result(0, 0, 0), result);
        Assert.Empty(await _db.AccessAuditLogs.ToListAsync());
    }
}
