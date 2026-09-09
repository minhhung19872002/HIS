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
