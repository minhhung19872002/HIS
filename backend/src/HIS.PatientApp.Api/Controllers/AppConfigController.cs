using HIS.PatientApp.Api.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>
/// Cấu hình app đọc lúc khởi động — HSMT I.2 #1 ("tải và <b>cập nhật</b> ứng dụng").
///
/// <para>Cho phép bệnh viện buộc người dùng cập nhật khi một bản cũ có lỗi nghiêm trọng hoặc khi hợp
/// đồng dữ liệu đổi. Không có cơ chế này thì một bản app hỏng sẽ sống mãi trên máy những người không
/// bao giờ bật tự động cập nhật — và với app y tế, "hiển thị sai kết quả" là một lỗi không thể chờ
/// người dùng tự nâng cấp.</para>
///
/// <para>Công khai vì app phải đọc được <b>trước</b> khi đăng nhập: bản quá cũ có thể hỏng ngay ở màn
/// đăng nhập. Không trả bất cứ thứ gì nhạy cảm.</para>
/// </summary>
[ApiController]
[Route("api/v1/app-config")]
[AllowAnonymous]
[Produces("application/json")]
public class AppConfigController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public AppConfigController(IConfiguration configuration) => _configuration = configuration;

    [HttpGet]
    public IActionResult Get([FromQuery] string? platform, [FromQuery] string? version)
    {
        var section = _configuration.GetSection("AppRelease");
        var isIos = string.Equals(platform, "ios", StringComparison.OrdinalIgnoreCase);

        var minimum = section[isIos ? "MinimumIosVersion" : "MinimumAndroidVersion"] ?? "1.0.0";
        var latest = section[isIos ? "LatestIosVersion" : "LatestAndroidVersion"] ?? minimum;

        var config = new AppConfigDto
        {
            MinimumVersion = minimum,
            LatestVersion = latest,
            StoreUrl = section[isIos ? "AppStoreUrl" : "PlayStoreUrl"] ?? "",
            UpdateRequired = AppVersions.Compare(version, minimum) < 0,
            UpdateAvailable = AppVersions.Compare(version, latest) < 0,
            MaintenanceMessage = section["MaintenanceMessage"],
            SupportPhone = section["SupportPhone"] ?? "",
        };

        return Ok(ApiResponse<AppConfigDto>.Ok(config));
    }

    // So sánh phiên bản nằm ở Common/AppVersions.cs — đủ nhiều bẫy để cần test riêng.
}

public class AppConfigDto
{
    /// <summary>Bản cũ hơn mức này thì không dùng tiếp được.</summary>
    public string MinimumVersion { get; set; } = string.Empty;

    public string LatestVersion { get; set; } = string.Empty;

    /// <summary>Đường tới App Store hoặc Google Play để người dùng bấm cập nhật.</summary>
    public string StoreUrl { get; set; } = string.Empty;

    public bool UpdateRequired { get; set; }
    public bool UpdateAvailable { get; set; }

    /// <summary>Thông báo bảo trì hiện toàn app. Rỗng = không có gì.</summary>
    public string? MaintenanceMessage { get; set; }

    /// <summary>Số điện thoại hỗ trợ, để app hiện ở màn lỗi thay vì để người bệnh bơ vơ.</summary>
    public string SupportPhone { get; set; } = string.Empty;
}
