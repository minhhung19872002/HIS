using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

public sealed class BookingManagementSearchTests
{
    [Theory]
    [InlineData("booking search", "APT-SEARCH-01")]
    [InlineData("APT-SEARCH", "APT-SEARCH-01")]
    [InlineData("091234", "APT-SEARCH-01")]
    [InlineData("not-present", null)]
    public async Task Search_supports_name_code_and_decrypted_phone_without_sql_like_on_pii(
        string keyword,
        string? expectedCode)
    {
        using var context = TestDb.NewInMemory();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "BN-SEARCH-01",
            FullName = "Booking Search Patient",
            PhoneNumber = "0912345678"
        };
        context.Patients.Add(patient);
        context.Appointments.Add(new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = "APT-SEARCH-01",
            AppointmentDate = DateTime.Today.AddDays(1),
            PatientId = patient.Id,
            Patient = patient,
            AppointmentType = 2,
            Status = 1
        });
        await context.SaveChangesAsync();

        var service = new BookingManagementService(context, new Mock<IUnitOfWork>().Object);
        var result = await service.GetBookingsAsync(new BookingSearchDto
        {
            Keyword = keyword,
            FromDate = DateTime.Today,
            ToDate = DateTime.Today.AddDays(2),
            PageSize = 20
        });

        if (expectedCode is null)
        {
            Assert.Empty(result.Items);
            Assert.Equal(0, result.TotalCount);
        }
        else
        {
            var booking = Assert.Single(result.Items);
            Assert.Equal(expectedCode, booking.AppointmentCode);
            Assert.Equal("0912345678", booking.PhoneNumber);
            Assert.Equal(1, result.TotalCount);
        }
    }
}

/// <summary>
/// Tìm lịch hẹn theo SỐ ĐIỆN THOẠI khi hai bên ghi số khác định dạng.
///
/// <para>Lịch đặt qua app hỗ trợ người bệnh lưu số ở dạng quốc tế ("+84399166923"), còn nhân viên
/// gõ đúng dạng người bệnh đọc cho họ ("0399166923"). Trước đây `Contains` nguyên văn nên KHÔNG
/// khớp, và mọi lịch đặt qua app đều không tra được bằng số điện thoại.</para>
///
/// <para>Lỗi này đã xảy ra thật: chủ đầu tư đặt lịch trên app, nhân viên tra số trên HIS ra
/// "Chưa có lịch hẹn", và cả hai bên kết luận lịch không vào hệ thống — trong khi bản ghi vẫn nằm
/// nguyên trong cơ sở dữ liệu.</para>
/// </summary>
public sealed class BookingPhoneSearchTests
{
    private static async Task<HIS.Infrastructure.Data.HISDbContext> SeedAsync(string storedPhone)
    {
        var context = TestDb.NewInMemory();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "BN-PHONE-01",
            FullName = "Người Bệnh App",
            PhoneNumber = storedPhone,
        };
        context.Patients.Add(patient);
        context.Appointments.Add(new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = "DK-PHONE-01",
            AppointmentDate = DateTime.Today.AddDays(11),
            PatientId = patient.Id,
            Patient = patient,
            AppointmentType = 2,
            Status = 1,
        });
        await context.SaveChangesAsync();
        return context;
    }

    private static async Task<int> CountAsync(
        HIS.Infrastructure.Data.HISDbContext context, string keyword)
    {
        var service = new BookingManagementService(context, new Mock<IUnitOfWork>().Object);
        var result = await service.GetBookingsAsync(new BookingSearchDto
        {
            Keyword = keyword,
            FromDate = DateTime.Today,
            ToDate = DateTime.Today.AddDays(60),
            PageSize = 20,
        });
        return result.Items.Count;
    }

    /// <summary>Số lưu dạng quốc tế, nhân viên gõ dạng trong nước — phải tìm ra.</summary>
    [Theory]
    [InlineData("0399166923")]
    [InlineData("+84399166923")]
    [InlineData("84399166923")]
    [InlineData("399166923")]
    [InlineData("0399 166 923")]
    public async Task Luu_dang_quoc_te_thi_go_kieu_nao_cung_tim_ra(string keyword)
    {
        using var context = await SeedAsync("+84399166923");
        Assert.Equal(1, await CountAsync(context, keyword));
    }

    /// <summary>Và ngược lại: số lưu dạng trong nước, nhân viên gõ dạng quốc tế.</summary>
    [Theory]
    [InlineData("0399166923")]
    [InlineData("+84399166923")]
    public async Task Luu_dang_trong_nuoc_thi_van_tim_ra(string keyword)
    {
        using var context = await SeedAsync("0399166923");
        Assert.Equal(1, await CountAsync(context, keyword));
    }

    /// <summary>
    /// Chuẩn hoá KHÔNG được nới tay tới mức một từ khoá lạc lại khớp mọi bản ghi.
    /// </summary>
    [Theory]
    [InlineData("0911111111")]
    [InlineData("khong-co-that")]
    public async Task So_khac_va_tu_khoa_lac_thi_khong_khop(string keyword)
    {
        using var context = await SeedAsync("+84399166923");
        Assert.Equal(0, await CountAsync(context, keyword));
    }
}
