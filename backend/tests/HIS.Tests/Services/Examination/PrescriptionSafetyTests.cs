using HIS.Application.Common;
using HIS.Application.DTOs.Examination;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace HIS.Tests.Services.ExaminationFlow;

/// <summary>
/// #185 (SAFE-1) enforce dị-ứng thuốc khi LƯU đơn (trước chỉ advisory).
/// #186 (SAFE-2) khung enforce tương-tác (KB rỗng → không chặn tới khi seed).
/// Lưới test khu trú (user duyệt) — chạy LOCAL `dotnet test`.
/// </summary>
public class PrescriptionSafetyTests
{
    private static ExaminationCompleteService NewService(HISDbContext ctx) =>
        new ExaminationCompleteService(
            ctx,
            new Mock<IRepository<Patient>>().Object,
            new Mock<IRepository<MedicalRecord>>().Object,
            new Mock<IRepository<Examination>>().Object,
            new Mock<IRepository<Room>>().Object,
            new Mock<IRepository<User>>().Object,
            new UnitOfWork(ctx),
            new Mock<ICurrentUserAccessor>().Object,
            new Mock<HIS.Application.Services.IPaymentGatewayService>().Object,
            new Mock<HIS.Application.Services.ITreatmentRelationshipService>().Object);

    private static (Guid examId, Guid medId) SeedScenario(HISDbContext ctx, bool withSevereAllergy)
    {
        var patientId = Guid.NewGuid();
        var mrId = Guid.NewGuid();
        var examId = Guid.NewGuid();
        var medId = Guid.NewGuid();

        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN1", FullName = "Nguyen Van Test" });
        ctx.MedicalRecords.Add(new MedicalRecord { Id = mrId, PatientId = patientId, PatientType = 2 });
        ctx.Examinations.Add(new Examination
        {
            Id = examId, MedicalRecordId = mrId,
            DepartmentId = Guid.NewGuid(), RoomId = Guid.NewGuid(), DoctorId = Guid.NewGuid()
        });
        ctx.Medicines.Add(new Medicine
        {
            Id = medId, MedicineCode = "PEN01", MedicineName = "Penicillin V 500mg",
            ActiveIngredient = "Penicillin", Unit = "Vien", UnitPrice = 1000, IsActive = true
        });
        if (withSevereAllergy)
            ctx.Allergies.Add(new Allergy
            {
                Id = Guid.NewGuid(), PatientId = patientId, AllergyType = 1,
                AllergenName = "Penicillin", Reaction = "Phat ban, kho tho", Severity = 3, IsActive = true
            });
        ctx.SaveChanges();
        return (examId, medId);
    }

    private static CreateExaminationPrescriptionDto Dto(Guid examId, Guid medId, string? overrideReason = null) =>
        new CreateExaminationPrescriptionDto
        {
            ExaminationId = examId,
            PrescriptionType = 1,
            Items = new List<CreatePrescriptionItemDto> { new() { MedicineId = medId, Quantity = 10, Days = 5 } },
            OverrideReason = overrideReason
        };

    [Fact]
    public async Task Create_blocks_when_severe_allergy_and_no_override()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, medId) = SeedScenario(ctx, withSevereAllergy: true);
        var svc = NewService(ctx);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreatePrescriptionAsync(Dto(examId, medId)));
        Assert.Empty(ctx.Prescriptions); // KHÔNG lưu đơn nguy hiểm
    }

    [Fact]
    public async Task Create_allows_when_override_reason_provided()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, medId) = SeedScenario(ctx, withSevereAllergy: true);
        var svc = NewService(ctx);

        var result = await svc.CreatePrescriptionAsync(Dto(examId, medId, "Can thiet lam sang, da can nhac ky"));
        Assert.NotNull(result);
        Assert.Single(ctx.Prescriptions);
        Assert.Contains("bỏ qua cảnh báo", ctx.Prescriptions.Single().Instructions ?? ""); // audit ghi lại override
    }

    [Fact]
    public async Task Create_succeeds_when_no_allergy()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, medId) = SeedScenario(ctx, withSevereAllergy: false);
        var svc = NewService(ctx);

        var result = await svc.CreatePrescriptionAsync(Dto(examId, medId));
        Assert.NotNull(result);
        Assert.Single(ctx.Prescriptions);
    }
}
