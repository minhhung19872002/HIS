using HIS.Application.DTOs.Reception;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HIS.Tests.Services.Reception;

/// <summary>
/// Tách bệnh án (#99, 1.10.5b) phải mang theo dữ liệu CỦA hồ sơ được tách — và chỉ dữ liệu đó.
///
/// <para>Trước đây chỉ <c>MedicalRecords.PatientId</c> được đổi: đợt nhập viện, phiếu CĐHA, vé… của
/// chính hồ sơ đó vẫn gắn người nguồn. Ngược lại, dữ liệu mức con người (người thân, dị ứng) KHÔNG được
/// đi theo: tách một đợt điều trị nhầm người không làm người nguồn mất thông tin của họ.</para>
/// </summary>
public sealed class PatientSplitTests
{
    private static ReceptionCompleteService Build(HISDbContext ctx) => new(
        ctx,
        new Repository<Patient>(ctx),
        new Mock<IRepository<MedicalRecord>>().Object,
        new Mock<IRepository<Examination>>().Object,
        new Mock<IRepository<QueueTicket>>().Object,
        new Mock<IRepository<QueueConfiguration>>().Object,
        new Mock<IRepository<Room>>().Object,
        new Mock<IRepository<Department>>().Object,
        new Mock<IRepository<User>>().Object,
        new UnitOfWork(ctx),
        new Mock<IBhxhGatewayClient>().Object);

    private static Patient NewPatient(string code) =>
        new() { Id = Guid.NewGuid(), PatientCode = code, FullName = "BN " + code };

    [Fact]
    public async Task Tach_chuyen_du_lieu_cua_ho_so_duoc_tach_va_giu_nguyen_phan_con_lai()
    {
        using var ctx = TestDb.NewInMemory();
        var source = NewPatient("BN-SRC");
        var target = NewPatient("BN-DST");
        ctx.Patients.AddRange(source, target);

        var movedRecord = Guid.NewGuid();
        var keptRecord = Guid.NewGuid();
        ctx.MedicalRecords.AddRange(
            new MedicalRecord { Id = movedRecord, PatientId = source.Id, PatientType = 2 },
            new MedicalRecord { Id = keptRecord, PatientId = source.Id, PatientType = 2 });

        var movedAdmission = Guid.NewGuid();
        var keptAdmission = Guid.NewGuid();
        ctx.Admissions.AddRange(
            new Admission { Id = movedAdmission, PatientId = source.Id, MedicalRecordId = movedRecord, AdmissionDate = DateTime.Today, AdmittingDoctorId = Guid.NewGuid(), DepartmentId = Guid.NewGuid(), RoomId = Guid.NewGuid() },
            new Admission { Id = keptAdmission, PatientId = source.Id, MedicalRecordId = keptRecord, AdmissionDate = DateTime.Today, AdmittingDoctorId = Guid.NewGuid(), DepartmentId = Guid.NewGuid(), RoomId = Guid.NewGuid() });

        // Gắn hồ sơ trực tiếp
        var movedTicket = new QueueTicket { Id = Guid.NewGuid(), TicketNumber = "A1", PatientId = source.Id, MedicalRecordId = movedRecord, IssueDate = DateTime.Today };
        var keptTicket = new QueueTicket { Id = Guid.NewGuid(), TicketNumber = "A2", PatientId = source.Id, MedicalRecordId = keptRecord, IssueDate = DateTime.Today };
        // Gắn qua ĐỢT NHẬP VIỆN (không có MedicalRecordId)
        var movedDiet = new DietOrder { Id = Guid.NewGuid(), PatientId = source.Id, AdmissionId = movedAdmission };
        // Dữ liệu mức con người — không gắn hồ sơ nào
        var family = new FamilyMember { Id = Guid.NewGuid(), AccountId = Guid.NewGuid(), FullName = "Con", LinkedPatientId = source.Id };
        ctx.QueueTickets.AddRange(movedTicket, keptTicket);
        ctx.DietOrders.Add(movedDiet);
        ctx.FamilyMembers.Add(family);
        await ctx.SaveChangesAsync();
        ctx.ChangeTracker.Clear();

        await Build(ctx).SplitPatientAsync(
            new SplitPatientDto { SourcePatientId = source.Id, TargetPatientId = target.Id, MedicalRecordIds = new List<Guid> { movedRecord } },
            Guid.NewGuid());
        ctx.ChangeTracker.Clear();

        Assert.Equal(target.Id, (await ctx.MedicalRecords.SingleAsync(m => m.Id == movedRecord)).PatientId);
        Assert.Equal(target.Id, (await ctx.Admissions.SingleAsync(a => a.Id == movedAdmission)).PatientId);
        Assert.Equal(target.Id, (await ctx.QueueTickets.IgnoreQueryFilters().SingleAsync(t => t.Id == movedTicket.Id)).PatientId);
        Assert.Equal(target.Id, (await ctx.DietOrders.SingleAsync(d => d.Id == movedDiet.Id)).PatientId);

        Assert.Equal(source.Id, (await ctx.MedicalRecords.SingleAsync(m => m.Id == keptRecord)).PatientId);
        Assert.Equal(source.Id, (await ctx.Admissions.SingleAsync(a => a.Id == keptAdmission)).PatientId);
        Assert.Equal(source.Id, (await ctx.QueueTickets.IgnoreQueryFilters().SingleAsync(t => t.Id == keptTicket.Id)).PatientId);
        Assert.Equal(source.Id, (await ctx.FamilyMembers.SingleAsync()).LinkedPatientId);
        Assert.False((await ctx.Patients.IgnoreQueryFilters().SingleAsync(p => p.Id == source.Id)).IsDeleted);
    }

    [Fact]
    public async Task Tach_ho_so_khong_thuoc_benh_nhan_nguon_thi_tu_choi()
    {
        using var ctx = TestDb.NewInMemory();
        var source = NewPatient("BN-SRC");
        var target = NewPatient("BN-DST");
        var other = NewPatient("BN-OTHER");
        ctx.Patients.AddRange(source, target, other);
        var foreignRecord = Guid.NewGuid();
        ctx.MedicalRecords.Add(new MedicalRecord { Id = foreignRecord, PatientId = other.Id, PatientType = 2 });
        await ctx.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => Build(ctx).SplitPatientAsync(
            new SplitPatientDto { SourcePatientId = source.Id, TargetPatientId = target.Id, MedicalRecordIds = new List<Guid> { foreignRecord } },
            Guid.NewGuid()));
        ctx.ChangeTracker.Clear();
        Assert.Equal(other.Id, (await ctx.MedicalRecords.SingleAsync()).PatientId);
    }
}
