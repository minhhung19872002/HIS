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

    /// <summary>Re-evaluate tất cả parameters (LabResult rows) của 1 LabRequestItem.</summary>
    [HttpPost("request-item/{requestItemId:guid}")]
    public async Task<IActionResult> EvaluateRequestItem(Guid requestItemId)
    {
        var rows = await _db.LabResults
            .Where(r => r.LabRequestItemId == requestItemId)
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
            abnormal = rows.Count(p => p.IsAbnormal),
            critical = rows.Count(p => p.IsCritical),
        });
    }

    /// <summary>Re-evaluate 1 LabResult row cụ thể.</summary>
    [HttpPost("row/{labResultId:guid}")]
    public async Task<IActionResult> EvaluateRow(Guid labResultId)
    {
        var row = await _db.LabResults.FindAsync(labResultId);
        if (row == null) return NotFound();
        var changed = EvaluateOne(row);
        if (changed) await _db.SaveChangesAsync();
        return Ok(new { row.Id, row.IsAbnormal, row.AbnormalType, row.IsCritical, changed });
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

    private static bool EvaluateOne(Core.Entities.LabResult p)
    {
        if (!p.NumericResult.HasValue) return false;
        var (isAbn, type, _) = EvaluateValue(p.NumericResult, p.ReferenceMin, p.ReferenceMax);
        var prevAbn = p.IsAbnormal;
        var prevType = p.AbnormalType;
        var prevCrit = p.IsCritical;
        p.IsAbnormal = isAbn;
        p.AbnormalType = type;
        p.IsCritical = type == 3;
        return prevAbn != p.IsAbnormal || prevType != p.AbnormalType || prevCrit != p.IsCritical;
    }
}
