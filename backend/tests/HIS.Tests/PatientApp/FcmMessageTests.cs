using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HIS.Tests.PatientApp;

/// <summary>
/// Thân thông điệp relay gửi sang FCM HTTP v1.
///
/// <para><b>Vì sao phải kiểm trên chuỗi JSON chứ không trên đối tượng.</b> Lỗi ở đây không nằm ở
/// giá trị mà nằm ở <b>tên khoá lên dây</b>: C# không đặt được định danh có gạch nối, nên khoá APNs
/// <c>content-available</c> từng bị viết thành <c>contentAvailable</c>. Đọc đối tượng thì thấy đủ
/// cả, chỉ khi tuần tự hoá mới lộ ra tên sai — và APNs thì lặng lẽ bỏ qua khoá nó không biết:
/// FCM vẫn trả 200, banner vẫn hiện, chỉ phần đánh thức app chạy ngầm là câm.</para>
///
/// <para>Tuần tự hoá đúng bằng <see cref="JsonContent"/> như relay dùng thật, để bài kiểm không
/// xanh nhờ một bộ tuỳ chọn khác với bộ chạy thật.</para>
/// </summary>
public class FcmMessageTests
{
    private static JsonElement Serialize()
    {
        var message = FcmMessage.Build(
            token: "token-thiet-bi",
            title: "Nhắc lịch khám",
            body: "Lúc 08:00 ngày 12/09/2026",
            notificationId: "11111111-1111-1111-1111-111111111111",
            category: "appointment",
            deepLink: "/appointments");

        // Đúng đường relay dùng: JsonContent.Create, không truyền options riêng.
        var json = JsonContent.Create(message).ReadAsStringAsync().GetAwaiter().GetResult();
        return JsonDocument.Parse(json).RootElement;
    }

    [Fact]
    public void Apns_PhaiDungKhoaContentAvailable_CoGachNoi()
    {
        var aps = Serialize()
            .GetProperty("message").GetProperty("apns").GetProperty("payload").GetProperty("aps");

        Assert.True(aps.TryGetProperty("content-available", out var value),
            "APNs chỉ hiểu khoá `content-available`; thiếu nó thì iOS không đánh thức app chạy ngầm "
            + "(HSMT I.2 #2) mà không có lỗi nào báo.");
        Assert.Equal(1, value.GetInt32());

        Assert.False(aps.TryGetProperty("contentAvailable", out _),
            "tên viết liền là tên APNs không biết — nó bị bỏ qua trong im lặng");
    }

    [Fact]
    public void Data_PhaiToanChuoi_KhongCoNull()
    {
        var data = Serialize().GetProperty("message").GetProperty("data");

        foreach (var field in data.EnumerateObject())
        {
            Assert.True(field.Value.ValueKind == JsonValueKind.String,
                $"FCM v1 đòi `data` là map<string,string>; `{field.Name}` đang là "
                + $"{field.Value.ValueKind} và sẽ làm FCM trả 400 cho cả thông điệp.");
        }
    }

    [Fact]
    public void CoDuNotificationVaToken()
    {
        var message = Serialize().GetProperty("message");

        Assert.Equal("token-thiet-bi", message.GetProperty("token").GetString());
        Assert.Equal("Nhắc lịch khám", message.GetProperty("notification").GetProperty("title").GetString());
        Assert.Equal("/appointments", message.GetProperty("data").GetProperty("deepLink").GetString());
    }
}
