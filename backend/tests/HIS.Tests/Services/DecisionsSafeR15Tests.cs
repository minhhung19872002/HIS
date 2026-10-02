using HIS.Application.DTOs.Telemedicine;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>
/// QA-R15 "decisions with safe defaults": telemedicine prescription safety switch, duplicate patient warning,
/// public booking with a CCCD owned by another patient, discharge letter transfer destination.
/// </summary>
public class DecisionsSafeR15Tests
{
    // ── 1. Telemedicine prescription safety (Clinical.TelemedicineRxSafetyMode) ──────────────────────────────

    private static (Guid sessionId, Guid medId) SeedTele(HISDbContext ctx, string? mode)
    {
        var patientId = Guid.NewGuid();
        var apptId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var medId = Guid.NewGuid();
        ctx.Patients.Add(new Patient { Id = patientId, PatientCode = "BN-R15", FullName = "QA-R15 Tele" });
        ctx.TeleAppointments.Add(new TeleAppointment { Id = apptId, AppointmentCode = "TELE-R15", PatientId = patientId, DoctorId = Guid.NewGuid(), Status = "InProgress" });
        ctx.TeleSessions.Add(new TeleSession { Id = sessionId, AppointmentId = apptId, SessionCode = "SES-R15", Status = "InProgress" });
        ctx.Medicines.Add(new Medicine { Id = medId, MedicineCode = "AMX", MedicineName = "Amoxicillin 500mg", ActiveIngredient = "Amoxicilin", Unit = "Vien", IsActive = true });
        ctx.Allergies.Add(new Allergy { Id = Guid.NewGuid(), PatientId = patientId, AllergyType = 1, AllergenName = "Penicillin", Reaction = "Phát ban", Severity = 3, IsActive = true });
        if (mode != null)
            ctx.SystemConfigs.Add(new SystemConfig { Id = Guid.NewGuid(), ConfigKey = TelemedicineServiceImpl.RxSafetyModeKey, ConfigValue = mode, IsActive = true });
        ctx.SaveChanges();
        return (sessionId, medId);
    }

    private static List<TelePrescriptionItemDto> Items(Guid medId) =>
        new() { new TelePrescriptionItemDto { DrugId = medId, DrugName = "Amoxicillin 500mg", Quantity = 10, DurationDays = 5 } };

    [Theory]
    [InlineData(null)]   // switch row missing → Warn
    [InlineData("Warn")]
    public async Task Tele_rx_with_allergy_is_saved_with_warning_by_default(string? mode)
    {
        using var ctx = TestDb.NewInMemory();
        var (sessionId, medId) = SeedTele(ctx, mode);

        var dto = await new TelemedicineServiceImpl(ctx).CreatePrescriptionAsync(sessionId, Items(medId), "");

        Assert.Contains(dto.Warnings!, w => w.StartsWith("[Dị ứng]"));
        Assert.True(await ctx.TelePrescriptions.AnyAsync(p => p.Id == dto.Id));
    }

    [Fact]
    public async Task Tele_rx_with_allergy_is_refused_in_Block_mode_without_reason()
    {
        using var ctx = TestDb.NewInMemory();
        var (sessionId, medId) = SeedTele(ctx, "Block");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new TelemedicineServiceImpl(ctx).CreatePrescriptionAsync(sessionId, Items(medId), ""));
        Assert.Contains("bị chặn vì lý do an toàn", ex.Message);
        Assert.False(await ctx.TelePrescriptions.AnyAsync());
    }

    [Fact]
    public async Task Tele_rx_in_Block_mode_passes_with_override_reason_written_to_note()
    {
        using var ctx = TestDb.NewInMemory();
        var (sessionId, medId) = SeedTele(ctx, "Block");

        var dto = await new TelemedicineServiceImpl(ctx).CreatePrescriptionAsync(sessionId, Items(medId), "Uống sau ăn", "Đã test da âm tính");

        var saved = await ctx.TelePrescriptions.SingleAsync(p => p.Id == dto.Id);
        Assert.Contains("Đã test da âm tính", saved.Note);
        Assert.NotEmpty(dto.Warnings!);
    }

    // ── 3. Duplicate patient identity warning ─────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("Nguyễn Văn  An", "nguyen van an", 1, 1, true)]   // accents / case / double space ignored
    [InlineData("Nguyễn Văn An", "Nguyễn Văn Anh", 1, 1, false)]  // different name
    [InlineData("Trần Thị Bình", "TRAN THI BINH", 2, 1, false)]   // gender differs
    [InlineData("Trần Thị Bình", "TRAN THI BINH", 2, 3, true)]    // gender "Khác" on one side → not compared
    public void Duplicate_name_match_rules(string a, string b, int ga, int gb, bool expected)
    {
        var dob = new DateTime(1980, 5, 1);
        Assert.Equal(expected, PatientDuplicateCheck.IsMatch(a, dob, null, ga, b, dob, null, gb));
    }

    [Fact]
    public void Duplicate_uses_year_when_one_side_has_no_full_date()
    {
        Assert.True(PatientDuplicateCheck.IsMatch("Lê Văn C", null, 1990, 1, "Le Van C", new DateTime(1990, 3, 3), null, 1));
        Assert.False(PatientDuplicateCheck.IsMatch("Lê Văn C", new DateTime(1990, 3, 4), null, 1, "Le Van C", new DateTime(1990, 3, 3), null, 1));
        Assert.False(PatientDuplicateCheck.IsMatch("Lê Văn C", null, null, 1, "Le Van C", null, null, 1)); // no birth info → no warning
    }

    [Fact]
    public async Task Duplicate_warning_lists_existing_active_patient_only()
    {
        using var ctx = TestDb.NewInMemory();
        ctx.Patients.Add(new Patient { Id = Guid.NewGuid(), PatientCode = "BN-OLD", FullName = "Phạm Thị Dung", DateOfBirth = new DateTime(1975, 1, 2), Gender = 2 });
        ctx.Patients.Add(new Patient { Id = Guid.NewGuid(), PatientCode = "BN-DEL", FullName = "Phạm Thị Dung", DateOfBirth = new DateTime(1975, 1, 2), Gender = 2, IsDeleted = true });
        ctx.SaveChanges();

        var warnings = await PatientDuplicateCheck.FindWarningsAsync(ctx, "pham thi dung", null, 1975, 2);

        Assert.Single(warnings);
        Assert.Contains("BN-OLD", warnings[0]);
        Assert.Empty(await PatientDuplicateCheck.FindWarningsAsync(ctx, "pham thi dung", null, 1976, 2));
    }

    // ── 4. Public booking with a CCCD owned by another patient ────────────────────────────────────────────

    [Fact]
    public async Task Booking_with_foreign_cccd_does_not_copy_it_and_notes_the_counter()
    {
        using var ctx = TestDb.NewInMemory();
        ctx.Patients.Add(new Patient { Id = Guid.NewGuid(), PatientCode = "BN-OWNER", FullName = "Chủ CCCD", IdentityNumber = "001090000123", PhoneNumber = "0900000001" });
        ctx.SaveChanges();
        var svc = new AppointmentBookingService(ctx, new UnitOfWork(ctx), new Mock<IEmailService>().Object, new Mock<ISmsService>().Object);

        var result = await svc.BookAppointmentAsync(new OnlineBookingDto
        {
            PatientName = "QA-R15 Người đặt", PhoneNumber = "0977000015", IdentityNumber = "001090000123",
            AppointmentDate = DateTime.Today.AddDays(2), AppointmentType = 2, Notes = "Đau đầu", ClientIp = "203.0.113.15",
        });

        Assert.True(result.Success, result.Message);
        Assert.DoesNotContain("BN-OWNER", result.Message);
        var appt = await ctx.Appointments.Include(a => a.Patient).SingleAsync(a => a.AppointmentCode == result.AppointmentCode);
        Assert.Null(appt.Patient!.IdentityNumber);
        Assert.StartsWith("CCCD trùng BN BN-OWNER — quầy đối chiếu", appt.Notes);
        Assert.Contains("Đau đầu", appt.Notes);
    }

    // ── 2. Discharge letter shows the transfer destination ────────────────────────────────────────────────

    [Fact]
    public void Discharge_letter_prints_transfer_destination_and_reason()
    {
        var html = PdfTemplateHelper.GetDischargeLetter("BN1", "QA-R15", 1, null, null, null, null, "HS1", "Nội",
            DateTime.Today.AddDays(-3), DateTime.Today, "Viêm phổi", "Viêm phổi nặng", null, 4, null, null, "BS A", null,
            "Bệnh viện Bạch Mai", "Vượt khả năng chuyên môn");
        var text = System.Net.WebUtility.HtmlDecode(html);
        Assert.Contains("Chuyển đến:", text);
        Assert.Contains("Bệnh viện Bạch Mai", text);
        Assert.Contains("Vượt khả năng chuyên môn", text);
        Assert.Contains("Nặng hơn", html);
    }
}
