using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Security;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>
/// Lịch hẹn và vé xếp hàng từ app hỗ trợ người bệnh phải gắn vào ĐÚNG hồ sơ đã liên kết.
///
/// <para>Lỗi đo được trên prod 15/09: BFF gửi SĐT "+84901234567", HIS lưu "0901234567" và so chuỗi
/// thô → đặt lịch từ app tạo hồ sơ trùng BN20260915144044102, vé lấy số gắn vào hồ sơ trùng đó, và
/// app không thấy lịch đặt tại quầy. Số 0901234567 đang dùng chung cho 3 hồ sơ, nên sửa bằng cách
/// chỉ chuẩn hoá SĐT là chưa đủ: dò theo số sẽ gắn nhầm người trong cùng gia đình.</para>
/// </summary>
public sealed class PatientAppLinkageTests
{
    private const string LocalPhone = "0901234567";
    private const string IntlPhone = "+84901234567";

    private static AppointmentBookingService Build(HIS.Infrastructure.Data.HISDbContext context) =>
        new(context,
            new Mock<IUnitOfWork>().Object,
            new Mock<IEmailService>().Object,
            new Mock<ISmsService>().Object);

    private static Patient NewPatient(string code, string phone) => new()
    {
        Id = Guid.NewGuid(),
        PatientCode = code,
        FullName = "BN " + code,
        PhoneNumber = phone,
    };

    private static OnlineBookingDto NewBooking(string phone, Guid? patientId) => new()
    {
        PatientName = "Nguyen Van Test",
        PhoneNumber = phone,
        AppointmentDate = DateTime.Today.AddDays(2),
        AppointmentTime = new TimeSpan(8, 0, 0),
        AppointmentType = 2,
        ClientIp = "203.0.113.20",
        IsAuthenticatedCaller = true,
        PatientId = patientId,
    };

    [Theory]
    [InlineData("0901234567")]
    [InlineData("+84901234567")]
    [InlineData("84901234567")]
    [InlineData("0084901234567")]
    [InlineData("0901 234.567")]
    public void PhoneNumberKey_moi_cach_viet_la_cung_mot_so(string input)
    {
        Assert.Equal(LocalPhone, PhoneNumberKey.Of(input));
        Assert.True(PhoneNumberKey.Same(input, LocalPhone));
    }

    [Fact]
    public void PhoneNumberKey_rong_khong_bao_gio_khop_va_so_khac_khong_khop()
    {
        Assert.False(PhoneNumberKey.Same(null, ""));
        Assert.False(PhoneNumberKey.Same("0901234567", "0901234568"));
    }

    [Fact]
    public async Task Tra_benh_nhan_theo_SDT_dang_quoc_te_van_ra_ho_so_luu_dang_noi_dia()
    {
        using var context = TestDb.NewInMemory();
        var patient = NewPatient("BN-LOCAL", LocalPhone);
        context.Patients.Add(patient);
        await context.SaveChangesAsync();

        var found = await context.Patients.FindByPhoneNumberDecryptedAsync(IntlPhone);

        Assert.Equal(patient.Id, found?.Id);
    }

    /// <summary>Mệnh đề then chốt: có id hồ sơ thì gắn đúng hồ sơ đó, KHÔNG gắn người dùng chung số.</summary>
    [Fact]
    public async Task Dat_lich_co_PatientId_gan_dung_ho_so_du_ca_nha_dung_chung_so()
    {
        using var context = TestDb.NewInMemory();
        var sibling = NewPatient("BN-SIBLING", LocalPhone);   // thêm trước → dò theo số sẽ ra người này
        var owner = NewPatient("BN-OWNER", LocalPhone);
        context.Patients.AddRange(sibling, owner);
        await context.SaveChangesAsync();

        var result = await Build(context).BookAppointmentAsync(NewBooking(IntlPhone, owner.Id));

        Assert.True(result.Success, result.Message);
        // Service lưu qua IUnitOfWork (mock) → bản ghi mới nằm trong change tracker.
        var appointment = context.Appointments.Local.Single(a => a.AppointmentCode == result.AppointmentCode);
        Assert.Equal(owner.Id, appointment.PatientId);
        Assert.Equal(2, context.Patients.Local.Count);   // không tạo hồ sơ trùng
    }

    [Fact]
    public async Task Dat_lich_khong_PatientId_gui_so_quoc_te_KHONG_tao_ho_so_trung()
    {
        using var context = TestDb.NewInMemory();
        var existing = NewPatient("BN-EXIST", LocalPhone);
        context.Patients.Add(existing);
        await context.SaveChangesAsync();

        var result = await Build(context).BookAppointmentAsync(NewBooking(IntlPhone, null));

        Assert.True(result.Success, result.Message);
        Assert.Equal(1, context.Patients.Local.Count);
        // Service lưu qua IUnitOfWork (mock) → bản ghi mới nằm trong change tracker.
        var appointment = context.Appointments.Local.Single(a => a.AppointmentCode == result.AppointmentCode);
        Assert.Equal(existing.Id, appointment.PatientId);
    }

    [Fact]
    public async Task Dat_lich_voi_PatientId_khong_ton_tai_thi_tu_choi_va_khong_tao_ho_so()
    {
        using var context = TestDb.NewInMemory();

        var result = await Build(context).BookAppointmentAsync(NewBooking(LocalPhone, Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.Empty(context.Patients.Local);
    }

    [Fact]
    public async Task Tra_lich_theo_PatientId_khong_lo_lich_cua_nguoi_dung_chung_so()
    {
        using var context = TestDb.NewInMemory();
        var owner = NewPatient("BN-OWNER", LocalPhone);
        var sibling = NewPatient("BN-SIBLING", LocalPhone);
        context.Patients.AddRange(owner, sibling);
        context.Appointments.AddRange(
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-OWNER", PatientId = owner.Id, AppointmentDate = DateTime.Today.AddDays(1) },
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-SIBLING", PatientId = sibling.Id, AppointmentDate = DateTime.Today.AddDays(1) });
        await context.SaveChangesAsync();

        var service = Build(context);
        var byPatient = await service.LookupAppointmentsAsync(null, IntlPhone, owner.Id);
        var byPhone = await service.LookupAppointmentsAsync(null, IntlPhone);

        Assert.Equal(new[] { "APT-OWNER" }, byPatient.Select(a => a.AppointmentCode));
        // Chưa liên kết (không id) thì tra theo số — dạng "+84" phải khớp dữ liệu quầy lưu "09…".
        Assert.Equal(2, byPhone.Count);
    }

    [Fact]
    public async Task Huy_lich_xac_thuc_theo_ho_so_va_theo_SDT_da_chuan_hoa()
    {
        using var context = TestDb.NewInMemory();
        var owner = NewPatient("BN-OWNER", LocalPhone);
        var sibling = NewPatient("BN-SIBLING", LocalPhone);
        context.Patients.AddRange(owner, sibling);
        context.Appointments.AddRange(
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-1", PatientId = owner.Id, AppointmentDate = DateTime.Today.AddDays(1) },
            new Appointment { Id = Guid.NewGuid(), AppointmentCode = "APT-2", PatientId = owner.Id, AppointmentDate = DateTime.Today.AddDays(2) });
        await context.SaveChangesAsync();
        var service = Build(context);

        // Người dùng chung số nhưng khác hồ sơ không huỷ được lịch của người khác.
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CancelAppointmentAsync("APT-1", new CancelBookingDto { PhoneNumber = LocalPhone, PatientId = sibling.Id }));

        var byOwner = await service.CancelAppointmentAsync("APT-1", new CancelBookingDto { PhoneNumber = IntlPhone, PatientId = owner.Id });
        Assert.Equal(4, byOwner.Status);

        var byPhone = await service.CancelAppointmentAsync("APT-2", new CancelBookingDto { PhoneNumber = IntlPhone });
        Assert.Equal(4, byPhone.Status);
    }
}
