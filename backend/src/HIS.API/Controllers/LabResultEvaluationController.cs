using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Đánh giá kết quả XN so với khoảng tham chiếu — N1.18.
/// Tự động set IsAbnormal / AbnormalType cho từng parameter để UI tô đỏ/xanh.
/// </summary>
[ApiController]
[Route("api/lab-result-evaluation")]
[Authorize]
public class LabResultEvaluationController : ControllerBase
{
    private readonly HISDbContext _db;
    public LabResultEvaluationController(HISDbContext db) { _db = db; }

    /// <summary>Re-evaluate tất cả chỉ số con (ServiceRequestDetailParameter) của 1 SRD — #14e: model 1.</summary>
    [HttpPost("request-item/{requestItemId:guid}")]
    public async Task<IActionResult> EvaluateRequestItem(Guid requestItemId)
    {
        var rows = await _db.ServiceRequestDetailParameters
            .Where(r => r.ServiceRequestDetailId == requestItemId && !r.IsDeleted)
            .ToListAsync();
        if (rows.Count == 0) return NotFound(new { message = "Chưa có KQ để đánh giá" });
        int changed = 0;
        foreach (var p in rows) if (EvaluateOne(p)) changed++;
        if (changed > 0) await _db.SaveChangesAsync();
        return Ok(new
        {
            requestItemId,
            parameters = rows.Count,
            changed,
            abnormal = rows.Count(p => HIS.Infrastructure.Services.LabFlagEvaluator.IsAbnormal(p.Flag)),
            critical = rows.Count(p => p.Flag == "HH" || p.Flag == "LL"),
        });
    }

    /// <summary>Re-evaluate 1 chỉ số con cụ thể — #14e: model 1.</summary>
    [HttpPost("row/{labResultId:guid}")]
    public async Task<IActionResult> EvaluateRow(Guid labResultId)
    {
        var row = await _db.ServiceRequestDetailParameters.FindAsync(labResultId);
        if (row == null) return NotFound();
        var changed = EvaluateOne(row);
        if (changed) await _db.SaveChangesAsync();
        return Ok(new
        {
            row.Id,
            isAbnormal = HIS.Infrastructure.Services.LabFlagEvaluator.IsAbnormal(row.Flag),
            abnormalType = HIS.Infrastructure.Services.LabFlagEvaluator.FlagToAbnormalType(row.Flag),
            isCritical = row.Flag == "HH" || row.Flag == "LL",
            changed,
        });
    }

    /// <summary>Evaluate 1 giá trị cụ thể — dùng cho preview trước khi lưu.</summary>
    [HttpGet("preview")]
    public IActionResult Preview([FromQuery] decimal value, [FromQuery] decimal? min, [FromQuery] decimal? max)
    {
        var (isAbnormal, type, color) = EvaluateValue(value, min, max);
        return Ok(new { isAbnormal, abnormalType = type, color });
    }

    /// <summary>Pure function — dùng bởi các service khác.</summary>
    public static (bool isAbnormal, int? type, string color) EvaluateValue(decimal? value, decimal? min, decimal? max)
    {
        if (!value.HasValue || (!min.HasValue && !max.HasValue))
            return (false, null, "default");
        if (min.HasValue && value.Value < min.Value)
        {
            // Critical low: <0.8 × min (heuristic — adjust per analyte)
            if (value.Value < min.Value * 0.8m) return (true, 3, "red");
            return (true, 2, "blue");
        }
        if (max.HasValue && value.Value > max.Value)
        {
            if (value.Value > max.Value * 1.5m) return (true, 3, "red");
            return (true, 1, "red");
        }
        return (false, null, "green");
    }

    // #14e: model 1 — tính lại Flag (N/H/L/HH/LL) cho chỉ số con từ NumericValue + khoảng tham chiếu
    private static bool EvaluateOne(Core.Entities.ServiceRequestDetailParameter p)
    {
        if (!p.NumericValue.HasValue) return false;
        var newFlag = HIS.Infrastructure.Services.LabFlagEvaluator.EvaluateFlag(
            p.NumericValue, p.ReferenceMin, p.ReferenceMax, null, null);
        if (p.Flag == newFlag) return false;
        p.Flag = newFlag;
        return true;
    }
}
