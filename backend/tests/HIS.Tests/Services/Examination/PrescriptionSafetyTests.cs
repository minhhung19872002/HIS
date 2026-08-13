using HIS.Application.Common;
using HIS.Application.DTOs.Examination;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Text.Json;
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
        var departmentId = Guid.NewGuid();
        var doctorId = Guid.NewGuid();

        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN1", FullName = "Nguyen Van Test" });
        ctx.MedicalRecords.Add(new MedicalRecord { Id = mrId, PatientId = patientId, PatientType = 2 });
        ctx.Departments.Add(new Department
        {
            Id = departmentId, DepartmentCode = "KTEST", DepartmentName = "Khoa Test", IsActive = true
        });
        ctx.Users.Add(new User
        {
            Id = doctorId, Username = "doctor.test", FullName = "Bac si Test",
            PasswordHash = "test", UserType = 1, DepartmentId = departmentId, IsActive = true
        });
        ctx.Examinations.Add(new Examination
        {
            Id = examId, MedicalRecordId = mrId,
            DepartmentId = departmentId, RoomId = Guid.NewGuid(), DoctorId = doctorId,
            Status = HIS.Core.Constants.ExaminationStatus.InProgress
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

    [Fact]
    public async Task Create_blocks_when_examination_has_not_started()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, medId) = SeedScenario(ctx, withSevereAllergy: false);
        ctx.Examinations.Single(e => e.Id == examId).Status = HIS.Core.Constants.ExaminationStatus.Waiting;
        ctx.SaveChanges();
        var svc = NewService(ctx);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreatePrescriptionAsync(Dto(examId, medId)));

        Assert.Contains("chưa bắt đầu khám", error.Message);
        Assert.Empty(ctx.Prescriptions);
    }

    [Fact]
    public async Task Create_and_update_preserve_warehouse_and_payment_categories()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, medId) = SeedScenario(ctx, withSevereAllergy: false);
        var warehouseId = Guid.NewGuid();
        var svc = NewService(ctx);
        var dto = Dto(examId, medId);
        dto.WarehouseId = warehouseId;
        dto.PaymentCategory = 1;
        dto.Items[0].PaymentType = 1;

        var created = await svc.CreatePrescriptionAsync(dto);
        Assert.Equal(warehouseId, created.WarehouseId);
        Assert.Equal(1, created.PaymentType);
        Assert.Equal(1, Assert.Single(created.Items).PaymentType);

        dto.PaymentCategory = 2;
        dto.Items[0].PaymentType = 2;
        var updated = await svc.UpdatePrescriptionAsync(created.Id, dto);

        Assert.Equal(warehouseId, updated.WarehouseId);
        Assert.Equal(2, updated.PaymentType);
        Assert.Equal(2, Assert.Single(updated.Items).PaymentType);
        var stored = ctx.Prescriptions.Single(p => p.Id == created.Id);
        Assert.Equal(2, stored.PaymentCategory);
        Assert.Equal(warehouseId, stored.WarehouseId);
        Assert.Equal(2, ctx.PrescriptionDetails.Single(d => d.PrescriptionId == created.Id).PatientType);
    }

    [Fact]
    public async Task Create_rejects_empty_or_invalid_items()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, medId) = SeedScenario(ctx, withSevereAllergy: false);
        var svc = NewService(ctx);
        var empty = Dto(examId, medId);
        empty.Items.Clear();
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreatePrescriptionAsync(empty));

        var invalid = Dto(examId, medId);
        invalid.Items[0].Quantity = 0;
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreatePrescriptionAsync(invalid));
        Assert.Empty(ctx.Prescriptions);
    }

    [Fact]
    public async Task Legacy_prescription_resolves_nearest_examination_context_without_mutating_data()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, _) = SeedScenario(ctx, withSevereAllergy: false);
        var examination = ctx.Examinations.Single(e => e.Id == examId);
        examination.StartTime = new DateTime(2026, 8, 14, 8, 0, 0);
        var legacyPrescription = new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = "RX-LEGACY",
            PrescriptionDate = new DateTime(2026, 8, 14, 8, 15, 0),
            MedicalRecordId = examination.MedicalRecordId,
            ExaminationId = null,
            DoctorId = examination.DoctorId!.Value,
            DepartmentId = examination.DepartmentId,
            Status = 0,
        };
        ctx.Prescriptions.Add(legacyPrescription);
        ctx.SaveChanges();
        var svc = NewService(ctx);

        var result = await svc.GetPrescriptionByIdAsync(legacyPrescription.Id);

        Assert.NotNull(result);
        Assert.Equal(examId, result!.ExaminationId);
        Assert.Null(ctx.Prescriptions.Single(p => p.Id == legacyPrescription.Id).ExaminationId);
    }

    [Fact]
    public async Task Recent_legacy_prescription_exposes_resolved_examination_context()
    {
        using var ctx = TestDb.NewInMemory();
        var (examId, _) = SeedScenario(ctx, withSevereAllergy: false);
        var examination = ctx.Examinations.Single(e => e.Id == examId);
        examination.StartTime = new DateTime(2026, 8, 14, 8, 0, 0);
        ctx.Prescriptions.Add(new Prescription
        {
            Id = Guid.NewGuid(),
            PrescriptionCode = "RX-RECENT-LEGACY",
            PrescriptionDate = new DateTime(2026, 8, 14, 8, 15, 0),
            MedicalRecordId = examination.MedicalRecordId,
            ExaminationId = null,
            DoctorId = examination.DoctorId!.Value,
            DepartmentId = examination.DepartmentId,
            Status = 0,
        });
        ctx.SaveChanges();
        var savedPrescriptionDate = ctx.Prescriptions.Single().PrescriptionDate;
        var svc = NewService(ctx);

        var result = await svc.GetRecentPrescriptionsAsync(
            savedPrescriptionDate.AddMinutes(-1),
            savedPrescriptionDate.AddMinutes(1),
            null,
            20);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(result));

        Assert.Equal(
            examId,
            json.RootElement.EnumerateArray().Single().GetProperty("examinationId").GetGuid());
    }
}
