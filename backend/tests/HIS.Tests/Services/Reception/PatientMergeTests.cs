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
/// Ghép hồ sơ bệnh nhân trùng (1.10.5) phải mang theo TOÀN BỘ dữ liệu của hồ sơ bị xoá.
///
/// <para>Trước đây chỉ <c>MedicalRecords</c> được chuyển; 91 khoá ngoại khác (lịch hẹn, vé, nhập viện,
/// CĐHA, dị ứng, thẻ BHYT…) nằm lại trên hồ sơ đã xoá mềm — biến khỏi hồ sơ giữ lại. Phát hiện 15/09
/// khi ghép hồ sơ trùng do lỗi SĐT của app người bệnh.</para>
/// </summary>
public sealed class PatientMergeTests
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
        new() { Id = Guid.NewGuid(), PatientCode = code, FullName = "BN " + code, PhoneNumber = "0901234567" };

    [Fact]
    public async Task Ghep_chuyen_moi_du_lieu_cua_ho_so_nguon_sang_ho_so_dich()
    {
        using var ctx = TestDb.NewInMemory();
        var source = NewPatient("BN-DUP");
        var target = NewPatient("BN-KEEP");
        var bystander = NewPatient("BN-OTHER");
        ctx.Patients.AddRange(source, target, bystander);

        var recordId = Guid.NewGuid();
        var admissionId = Guid.NewGuid();
        ctx.MedicalRecords.Add(new MedicalRecord { Id = recordId, PatientId = source.Id, PatientType = 2 });
        ctx.Appointments.AddRange(
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-SRC", PatientId = source.Id, AppointmentDate = DateTime.Today },
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-SRC-DELETED", PatientId = source.Id, AppointmentDate = DateTime.Today, IsDeleted = true },
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-OTHER", PatientId = bystander.Id, AppointmentDate = DateTime.Today });
        ctx.Admissions.Add(new Admission
        {
            Id = admissionId, PatientId = source.Id, MedicalRecordId = recordId, AdmissionDate = DateTime.Today,
            AdmittingDoctorId = Guid.NewGuid(), DepartmentId = Guid.NewGuid(), RoomId = Guid.NewGuid(),
        });
        ctx.QueueTickets.Add(new QueueTicket { Id = Guid.NewGuid(), TicketNumber = "A001", PatientId = source.Id, IssueDate = DateTime.Today });
        // Cột không khai báo khoá ngoại trong model — vẫn là cùng một người.
        ctx.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), AccountId = Guid.NewGuid(), FullName = "Con", LinkedPatientId = source.Id });
        await ctx.SaveChangesAsync();
        ctx.ChangeTracker.Clear();

        await Build(ctx).MergePatientsAsync(
            new MergePatientDto { SourcePatientId = source.Id, TargetPatientId = target.Id, Reason = "Hồ sơ trùng" },
            Guid.NewGuid());
        ctx.ChangeTracker.Clear();

        Assert.Equal(target.Id, (await ctx.MedicalRecords.SingleAsync(m => m.Id == recordId)).PatientId);
        Assert.Equal(target.Id, (await ctx.Admissions.SingleAsync(a => a.Id == admissionId)).PatientId);
        Assert.All(await ctx.QueueTickets.IgnoreQueryFilters().ToListAsync(), t => Assert.Equal(target.Id, t.PatientId));
        Assert.Equal(target.Id, (await ctx.FamilyMembers.SingleAsync()).LinkedPatientId);

        var appointments = await ctx.Appointments.IgnoreQueryFilters().ToDictionaryAsync(a => a.AppointmentCode, a => a.PatientId);
        Assert.Equal(target.Id, appointments["APT-SRC"]);
        Assert.Equal(target.Id, appointments["APT-SRC-DELETED"]);   // lịch sử đã xoá mềm vẫn đi theo người
        Assert.Equal(bystander.Id, appointments["APT-OTHER"]);       // không đụng bệnh nhân khác

        var sourceAfter = await ctx.Patients.IgnoreQueryFilters().SingleAsync(p => p.Id == source.Id);
        Assert.True(sourceAfter.IsDeleted);
        Assert.False((await ctx.Patients.IgnoreQueryFilters().SingleAsync(p => p.Id == target.Id)).IsDeleted);
    }

    [Fact]
    public async Task Ghep_vao_ho_so_dich_khong_ton_tai_thi_tu_choi_va_KHONG_doi_gi()
    {
        using var ctx = TestDb.NewInMemory();
        var source = NewPatient("BN-SRC");
        ctx.Patients.Add(source);
        ctx.Appointments.Add(new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-1", PatientId = source.Id, AppointmentDate = DateTime.Today });
        await ctx.SaveChangesAsync();
        ctx.ChangeTracker.Clear();

        await Assert.ThrowsAsync<InvalidOperationException>(() => Build(ctx).MergePatientsAsync(
            new MergePatientDto { SourcePatientId = source.Id, TargetPatientId = Guid.NewGuid() }, Guid.NewGuid()));
        ctx.ChangeTracker.Clear();

        Assert.False((await ctx.Patients.SingleAsync(p => p.Id == source.Id)).IsDeleted);
        Assert.Equal(source.Id, (await ctx.Appointments.SingleAsync()).PatientId);
    }

    [Fact]
    public async Task Ghep_benh_nhan_vao_chinh_no_thi_tu_choi()
    {
        using var ctx = TestDb.NewInMemory();
        var patient = NewPatient("BN-SELF");
        ctx.Patients.Add(patient);
        await ctx.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => Build(ctx).MergePatientsAsync(
            new MergePatientDto { SourcePatientId = patient.Id, TargetPatientId = patient.Id }, Guid.NewGuid()));
        Assert.False((await ctx.Patients.IgnoreQueryFilters().SingleAsync()).IsDeleted);
    }

    /// <summary>
    /// Lưới an toàn cho tương lai: danh sách bảng lấy từ model nên thêm bảng mới là tự có. Bài này canh
    /// đúng những chỗ dễ hỏng — khoá ngoại tên khác "PatientId", cột không khai FK, và cột trông giống
    /// nhưng trỏ sang bảng khác.
    /// </summary>
    [Fact]
    public void Danh_sach_tham_chieu_phu_du_moi_khoa_ngoai_toi_benh_nhan()
    {
        using var ctx = TestDb.NewInMemory();
        var refs = PatientReferenceReassigner.PatientReferences(ctx.Model)
            .Select(r => $"{r.Entity.ClrType.Name}.{r.Property.Name}")
            .ToHashSet();

        var patient = ctx.Model.FindEntityType(typeof(Patient))!;
        var everyFk = ctx.Model.GetEntityTypes()
            .Where(e => e != patient && !e.IsOwned() && e.FindPrimaryKey() != null)
            .SelectMany(e => e.GetDeclaredForeignKeys().Where(f => f.PrincipalEntityType == patient)
                .SelectMany(f => f.Properties.Select(p => $"{e.ClrType.Name}.{p.Name}")))
            .ToList();

        Assert.True(everyFk.Count >= 90, $"chỉ thấy {everyFk.Count} khoá ngoại tới Patient");
        Assert.Empty(everyFk.Where(fk => !refs.Contains(fk)));
        Assert.Contains("BirthCertificateRecord.MotherPatientId", refs);
        Assert.Contains("FamilyMember.LinkedPatientId", refs);
        Assert.Contains("AnesthesiaRecord.PatientId", refs);
        Assert.DoesNotContain("HivLabResult.HivPatientId", refs);
        Assert.DoesNotContain("MedicalRecord.Id", refs);
    }
}
