using HIS.PatientApp.Api.Connector;
using HIS.PatientApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.PatientApp.Api.Controllers;

/// <summary>Kiểm tra sức khoẻ dịch vụ — dùng cho docker healthcheck và giám sát.</summary>
[ApiController]
[Route("health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private readonly PatientAppDbContext _db;
    private readonly IHisConnector _his;

    public HealthController(PatientAppDbContext db, IHisConnector his)
    {
        _db = db;
        _his = his;
    }

    /// <summary>Sống hay không. Cố ý KHÔNG chạm vào CSDL để probe luôn nhẹ và nhanh.</summary>
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", utc = DateTime.UtcNow });

    /// <summary>
    /// Kiểm tra sâu: có nối được CSDL của app và HIS Core không.
    /// Trả 503 khi một trong hai hỏng, để giám sát bắt được.
    /// </summary>
    [HttpGet("ready")]
    public async Task<IActionResult> Ready(CancellationToken ct)
    {
        var dbOk = await _db.Database.CanConnectAsync(ct);
        var hisOk = await _his.PingAsync(ct);

        var payload = new { database = dbOk, hisCore = hisOk, utc = DateTime.UtcNow };
        return dbOk && hisOk
            ? Ok(payload)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, payload);
    }
}
