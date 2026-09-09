using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Services;
using HIS.Tests.Fixtures;
using Moq;
using Xunit;

namespace HIS.Tests.Services;

/// <summary>
/// Hạn mức chống gian lận theo IP ở đặt lịch trực tuyến.
///
/// <para>Hạn mức này sinh ra để chặn một kẻ vô danh nện biểu mẫu đặt lịch công khai — và với biểu
/// mẫu đó thì nó đúng việc. Nhưng app hỗ trợ người bệnh đi qua BFF, mà BFF là MỘT máy chủ: HIS
/// nhìn thấy đúng một địa chỉ IP cho toàn bộ người bệnh. Áp nguyên hạn mức thì người thứ 11 đặt
/// lịch trong ngày — và mọi người sau đó — đều bị từ chối với câu "Quá nhiều yêu cầu từ địa chỉ
/// này", dù họ chẳng liên quan gì tới nhau.</para>
///
/// <para>Đây là lỗi ĐÃ XẢY RA trên bản đang chạy: bộ kiểm chức năng gặp HTTP 400 ở bước đặt lịch
/// sau khi có đủ 10 lượt đặt thành công trong ngày qua app.</para>
///
/// <para>Bốn mệnh đề dưới đây phải đúng cùng lúc; bỏ mệnh đề nào cũng hỏng một phía: nới quá thì
/// mất lớp chống gian lận cho biểu mẫu công khai, siết quá thì app chết sau 10 lượt.</para>
/// </summary>
public sealed class BookingIpLimitTests
{
    private const string SharedIp = "203.0.113.9";

    private static AppointmentBookingService Build(HIS.Infrastructure.Data.HISDbContext context) =>
        new(context,
            new Mock<IUnitOfWork>().Object,
            new Mock<IEmailService>().Object,
            new Mock<ISmsService>().Object);

    /// <summary>Dựng sẵn N lượt đặt THÀNH CÔNG trong hôm nay từ cùng một IP.</summary>
    private static async Task SeedSuccessfulAttemptsAsync(
        HIS.Infrastructure.Data.HISDbContext context, int count, string ip)
    {
        for (var i = 0; i < count; i++)
        {
            context.Set<BookingAttemptLog>().Add(new BookingAttemptLog
            {
                Id = Guid.NewGuid(),
                PhoneNumber = $"09000000{i:D2}",
                IpAddress = ip,
                IsSuccessful = true,
                CreatedAt = DateTime.UtcNow,
            });
        }
        await context.SaveChangesAsync();
    }

    private static OnlineBookingDto NewBooking(string phone, bool authenticated) => new()
    {
        PatientName = "Người bệnh kiểm thử",
        PhoneNumber = phone,
        AppointmentDate = DateTime.Today.AddDays(1),
        AppointmentTime = new TimeSpan(8, 0, 0),
        AppointmentType = 2,
        ClientIp = SharedIp,
        IsAuthenticatedCaller = authenticated,
    };

    [Fact]
    public async Task Khach_vo_danh_vuot_han_muc_IP_thi_bi_chan()
    {
        using var context = TestDb.NewInMemory();
        await SeedSuccessfulAttemptsAsync(context, 10, SharedIp);

        var result = await Build(context)
            .BookAppointmentAsync(NewBooking("0911111111", authenticated: false));

        Assert.False(result.Success);
        Assert.Contains("địa chỉ này", result.Message);
    }

    /// <summary>
    /// Mệnh đề then chốt: cùng một IP, cùng số lượt, nhưng người gọi CÓ danh tính thì không bị
    /// hạn mức IP chặn. Hỏng mệnh đề này là app chết sau 10 lượt đặt mỗi ngày cho TẤT CẢ.
    /// </summary>
    [Fact]
    public async Task Nguoi_goi_da_xac_thuc_thi_KHONG_bi_han_muc_IP_chan()
    {
        using var context = TestDb.NewInMemory();
        await SeedSuccessfulAttemptsAsync(context, 10, SharedIp);

        var result = await Build(context)
            .BookAppointmentAsync(NewBooking("0922222222", authenticated: true));

        // Có thể vẫn hỏng vì lý do khác (không có lịch trực, khoa không tồn tại trong bộ dữ liệu
        // rỗng) — nhưng KHÔNG được hỏng vì hạn mức IP.
        Assert.DoesNotContain("địa chỉ này", result.Message ?? string.Empty);
    }

    /// <summary>
    /// Bỏ hạn mức IP KHÔNG được kéo theo bỏ hạn mức số điện thoại: đó mới là danh tính có nghĩa
    /// với người dùng app, và nó đã qua xác thực OTP.
    /// </summary>
    [Fact]
    public async Task Da_xac_thuc_van_bi_han_muc_SO_DIEN_THOAI_chan()
    {
        using var context = TestDb.NewInMemory();
        const string phone = "0933333333";

        for (var i = 0; i < 3; i++)
        {
            context.Set<BookingAttemptLog>().Add(new BookingAttemptLog
            {
                Id = Guid.NewGuid(),
                PhoneNumber = phone,
                IpAddress = SharedIp,
                IsSuccessful = true,
                CreatedAt = DateTime.UtcNow,
            });
        }
        await context.SaveChangesAsync();

        var result = await Build(context)
            .BookAppointmentAsync(NewBooking(phone, authenticated: true));

        Assert.False(result.Success);
        Assert.Contains("Số điện thoại này", result.Message);
    }

    /// <summary>Chưa chạm trần thì khách vô danh vẫn đặt được — không siết nhầm người dùng thật.</summary>
    [Fact]
    public async Task Chua_cham_tran_thi_khach_vo_danh_khong_bi_chan_vi_IP()
    {
        using var context = TestDb.NewInMemory();
        await SeedSuccessfulAttemptsAsync(context, 3, SharedIp);

        var result = await Build(context)
            .BookAppointmentAsync(NewBooking("0944444444", authenticated: false));

        Assert.DoesNotContain("địa chỉ này", result.Message ?? string.Empty);
    }
}

/// <summary>
/// Hạn mức theo SỐ ĐIỆN THOẠI không được tính lịch ĐÃ HUỶ.
///
/// <para>Hạn mức sinh ra để một người không ôm nhiều chỗ khám. Lịch đã huỷ thì không ôm chỗ nào —
/// chỗ đó đã trả lại. Tính cả lịch đã huỷ nghĩa là người bệnh bấm nhầm giờ rồi tự sửa lại bị PHẠT
/// mất một suất trong ngày, mà người dùng chính của app là người cao tuổi — nhóm bấm nhầm nhiều
/// nhất.</para>
///
/// <para>Chuyện đã xảy ra thật: chủ đầu tư đặt 3 lịch, huỷ 1, và bị chặn khi chỉ còn 2 lịch còn
/// hiệu lực.</para>
/// </summary>
public sealed class BookingCancelledQuotaTests
{
    private const string Phone = "0955555555";

    private static AppointmentBookingService Build(HIS.Infrastructure.Data.HISDbContext context) =>
        new(context,
            new Mock<IUnitOfWork>().Object,
            new Mock<IEmailService>().Object,
            new Mock<ISmsService>().Object);

    /// <summary>Ghi N lượt đặt thành công hôm nay; `cancelled` lượt đầu bị huỷ.</summary>
    private static async Task SeedAsync(
        HIS.Infrastructure.Data.HISDbContext context, int total, int cancelled)
    {
        for (var i = 0; i < total; i++)
        {
            var code = $"DK-QUOTA-{i:D2}";
            context.Set<BookingAttemptLog>().Add(new BookingAttemptLog
            {
                Id = Guid.NewGuid(),
                PhoneNumber = Phone,
                IpAddress = "203.0.113.5",
                IsSuccessful = true,
                AppointmentCode = code,
                CreatedAt = DateTime.UtcNow,
            });
            context.Appointments.Add(new Appointment
            {
                Id = Guid.NewGuid(),
                AppointmentCode = code,
                AppointmentDate = DateTime.Today.AddDays(3 + i),
                AppointmentType = 2,
                Status = i < cancelled ? 4 : 1,   // 4 = đã huỷ
            });
        }
        await context.SaveChangesAsync();
    }

    private static OnlineBookingDto NewBooking() => new()
    {
        PatientName = "Người bệnh kiểm thử",
        PhoneNumber = Phone,
        AppointmentDate = DateTime.Today.AddDays(1),
        AppointmentTime = new TimeSpan(8, 0, 0),
        AppointmentType = 2,
        ClientIp = "203.0.113.5",
        IsAuthenticatedCaller = true,
    };

    [Fact]
    public async Task Ba_lich_CON_HIEU_LUC_thi_bi_chan()
    {
        using var context = TestDb.NewInMemory();
        await SeedAsync(context, total: 3, cancelled: 0);

        var result = await Build(context).BookAppointmentAsync(NewBooking());

        Assert.False(result.Success);
        Assert.Contains("Số điện thoại này", result.Message);
    }

    /// <summary>Mệnh đề then chốt: huỷ một lịch thì được đặt lại.</summary>
    [Fact]
    public async Task Ba_lich_nhung_MOT_DA_HUY_thi_van_dat_duoc()
    {
        using var context = TestDb.NewInMemory();
        await SeedAsync(context, total: 3, cancelled: 1);

        var result = await Build(context).BookAppointmentAsync(NewBooking());

        Assert.DoesNotContain("Số điện thoại này", result.Message ?? string.Empty);
    }

    [Fact]
    public async Task Huy_het_thi_dat_lai_thoai_mai_trong_han_muc()
    {
        using var context = TestDb.NewInMemory();
        await SeedAsync(context, total: 3, cancelled: 3);

        var result = await Build(context).BookAppointmentAsync(NewBooking());

        Assert.DoesNotContain("Số điện thoại này", result.Message ?? string.Empty);
    }
}
