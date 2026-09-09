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

/// <summary>
/// Thứ tự mặc định của màn "Quản lý đặt lịch": lịch VỪA ĐẶT phải nằm dòng đầu.
///
/// <para>Bộ này canh đúng chỗ chủ đầu tư báo: đặt lịch xong mở màn quản lý mà không thấy đâu. Sắp
/// theo NGÀY HẸN — tăng hay giảm cũng vậy — thì một lịch vừa đặt cho tháng sau sẽ rơi đúng vị trí
/// ngày hẹn của nó ở giữa (hoặc cuối) danh sách, trong khi người vừa bấm "Đặt lịch" thì tìm nó ở
/// dòng đầu.</para>
/// </summary>
public sealed class BookingManagementOrderTests
{
    private static (HIS.Infrastructure.Data.HISDbContext ctx, Patient p) Seed()
    {
        var context = TestDb.NewInMemory();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "BN-ORDER-01",
            FullName = "Benh Nhan Sap Xep",
            PhoneNumber = "0912000111"
        };
        context.Patients.Add(patient);
        return (context, patient);
    }

    /// <summary>
    /// Thêm một lịch hẹn rồi ĐẶT LẠI mốc tạo.
    ///
    /// <para>Phải đặt sau khi lưu vì `HISDbContext.SaveChangesAsync` đóng dấu
    /// `CreatedAt = DateTime.UtcNow` cho mọi bản ghi mới (HISDbContext.cs:1413) — gán trước rồi lưu
    /// thì giá trị bị ghi đè, và phép kiểm sẽ chỉ đang kiểm cái đồng hồ. Lần lưu thứ hai là
    /// `Modified` nên chỉ đụng `UpdatedAt`.</para>
    /// </summary>
    private static async Task AddBookingAsync(
        HIS.Infrastructure.Data.HISDbContext context, Patient p, string code, int dayOffset, DateTime createdAt)
    {
        var booking = new Appointment
        {
            Id = Guid.NewGuid(),
            AppointmentCode = code,
            AppointmentDate = DateTime.Today.AddDays(dayOffset),
            PatientId = p.Id,
            Patient = p,
            AppointmentType = 2,
            Status = 0
        };
        context.Appointments.Add(booking);
        await context.SaveChangesAsync();

        booking.CreatedAt = createdAt;
        await context.SaveChangesAsync();
    }

    private static Task<BookingManagementPagedResult> ListAsync(HIS.Infrastructure.Data.HISDbContext context) =>
        new BookingManagementService(context, new Mock<IUnitOfWork>().Object)
            .GetBookingsAsync(new BookingSearchDto
            {
                FromDate = DateTime.Today,
                ToDate = DateTime.Today.AddDays(90),
                PageSize = 20
            });

    [Fact]
    public async Task Danh_sach_mac_dinh_dua_lich_vua_dat_len_dau()
    {
        var (context, patient) = Seed();
        var now = DateTime.UtcNow;

        // Lịch đặt SAU CÙNG lại có ngày hẹn XA NHẤT.
        await AddBookingAsync(context, patient, "DK-CU", 1, now.AddHours(-5));
        await AddBookingAsync(context, patient, "DK-GIUA", 30, now.AddHours(-2));
        await AddBookingAsync(context, patient, "DK-MOI-NHAT", 60, now);

        var result = await ListAsync(context);

        Assert.Equal(
            new[] { "DK-MOI-NHAT", "DK-GIUA", "DK-CU" },
            result.Items.Select(i => i.AppointmentCode).ToArray());
        context.Dispose();
    }

    [Fact]
    public async Task Lich_dat_moi_nhat_van_len_dau_ke_ca_khi_ngay_hen_som_nhat()
    {
        var (context, patient) = Seed();
        var now = DateTime.UtcNow;

        // Lần này lịch mới đặt lại có ngày hẹn GẦN NHẤT. Ai "sửa" thành sắp giảm dần theo NGÀY HẸN
        // thì phép kiểm trên vẫn xanh, còn phép kiểm này đỏ ngay.
        await AddBookingAsync(context, patient, "DK-CU", 60, now.AddHours(-5));
        await AddBookingAsync(context, patient, "DK-MOI-NHAT", 1, now);

        var result = await ListAsync(context);

        Assert.Equal("DK-MOI-NHAT", result.Items[0].AppointmentCode);
        context.Dispose();
    }

    [Fact]
    public async Task Lich_dat_cu_nhat_van_xuong_cuoi_ke_ca_khi_ngay_hen_xa_nhat()
    {
        var (context, patient) = Seed();
        var now = DateTime.UtcNow;

        // Chốt nốt chiều còn lại: sắp TĂNG dần theo ngày hẹn cũng phải đỏ.
        await AddBookingAsync(context, patient, "DK-CU", 1, now.AddHours(-5));
        await AddBookingAsync(context, patient, "DK-MOI-NHAT", 60, now);

        var result = await ListAsync(context);

        Assert.Equal("DK-CU", result.Items[^1].AppointmentCode);
        context.Dispose();
    }

    [Fact]
    public async Task Tra_ve_moc_tao_de_giao_dien_con_sap_xep_duoc()
    {
        var (context, patient) = Seed();
        var created = DateTime.UtcNow.AddHours(-3);
        await AddBookingAsync(context, patient, "DK-CO-MOC", 2, created);

        var result = await ListAsync(context);

        // Không có mốc tạo thì giao diện chỉ còn cách đoán "mới nhất" theo ngày hẹn.
        Assert.Equal(created, Assert.Single(result.Items).CreatedAt);
        context.Dispose();
    }
}
