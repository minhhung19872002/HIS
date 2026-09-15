using HIS.Core.Entities;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Xunit;

namespace HIS.Tests.Services.Reception;

/// <summary>
/// Rà hậu quả của ghép hồ sơ cũ (trước 15/09): dữ liệu nằm lại trên bệnh nhân đã xoá mềm, và đích
/// ghép suy từ nhật ký diff của <c>MedicalRecord.PatientId</c>.
/// </summary>
public sealed class DeletedPatientReferenceAuditTests
{
    [Fact]
    public async Task Tim_du_lieu_mo_coi_va_goi_y_dich_ghep_tu_nhat_ky()
    {
        using var ctx = TestDb.NewInMemory();
        var mergedAway = new Patient { Id = Guid.NewGuid(), PatientCode = "BN-OLD-DUP", FullName = "Trùng", IsDeleted = true };
        var keeper = new Patient { Id = Guid.NewGuid(), PatientCode = "BN-KEEPER", FullName = "Giữ" };
        var deletedClean = new Patient { Id = Guid.NewGuid(), PatientCode = "BN-DELETED-EMPTY", FullName = "Xoá sạch", IsDeleted = true };
        var alive = new Patient { Id = Guid.NewGuid(), PatientCode = "BN-ALIVE", FullName = "Còn" };
        ctx.Patients.AddRange(mergedAway, keeper, deletedClean, alive);

        // Ghép cũ: hồ sơ bệnh án đã sang người giữ, nhưng lịch hẹn và vé thì nằm lại
        ctx.MedicalRecords.Add(new MedicalRecord { Id = Guid.NewGuid(), PatientId = keeper.Id, PatientType = 2 });
        ctx.Appointments.AddRange(
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-1", PatientId = mergedAway.Id, AppointmentDate = DateTime.Today },
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-2", PatientId = mergedAway.Id, AppointmentDate = DateTime.Today },
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-3", PatientId = alive.Id, AppointmentDate = DateTime.Today });
        ctx.QueueTickets.Add(new QueueTicket { Id = Guid.NewGuid(), TicketNumber = "A1", PatientId = mergedAway.Id, IssueDate = DateTime.Today });
        ctx.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(), Action = "FieldUpdate", EntityType = nameof(MedicalRecord), TableName = nameof(MedicalRecord),
            OldValues = $"{{\"PatientId\":\"{mergedAway.Id}\"}}", NewValues = $"{{\"PatientId\":\"{keeper.Id}\"}}",
            Timestamp = DateTime.UtcNow.AddDays(-3),
        });
        await ctx.SaveChangesAsync();

        var result = await DeletedPatientReferenceAudit.FindAsync(ctx);

        var row = Assert.Single(result);   // hồ sơ xoá mà không còn gì trỏ tới thì không cần báo
        Assert.Equal("BN-OLD-DUP", row.PatientCode);
        Assert.Equal(3, row.TotalRows);
        Assert.Equal(2, row.RowsByTable["Appointment.PatientId"]);
        Assert.Equal(1, row.RowsByTable["QueueTicket.PatientId"]);
        Assert.Equal(keeper.Id, row.SuggestedTargetPatientId);
        Assert.Equal("BN-KEEPER", row.SuggestedTargetPatientCode);
    }
}
