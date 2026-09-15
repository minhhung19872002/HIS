using HIS.Application.Common;
using HIS.Application.Interfaces;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Đánh giá kết quả XN so với khoảng tham chiếu — N1.18. Tách khỏi
/// LabResultEvaluationController (#202 thin-controller).
/// Behavior-preserving: mọi query/business-math/status/response shape + message giữ nguyên.
/// Tự động set IsAbnormal / AbnormalType cho từng parameter để UI tô đỏ/xanh.
/// </summary>
public class LabResultEvaluationService : ILabResultEvaluationService
{
    private readonly HISDbContext _db;
    public LabResultEvaluationService(HISDbContext db) { _db = db; }

    /// <summary>Re-evaluate tất cả chỉ số con (ServiceRequestDetailParameter) của 1 SRD — #14e: model 1.</summary>
    public async Task<ServiceOutcome> EvaluateRequestItemAsync(Guid requestItemId)
    {
        var rows = await _db.ServiceRequestDetailParameters
            .Where(r => r.ServiceRequestDetailId == requestItemId && !r.IsDeleted)
            .ToListAsync();
        if (rows.Count == 0) return ServiceOutcome.NotFound("Chưa có KQ để đánh giá");
        int changed = 0;
        var critOf = await CriticalLimitsAsync(new[] { requestItemId });
        foreach (var p in rows) if (EvaluateOne(p, critOf(p))) changed++;
        if (changed > 0) await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new
        {
            requestItemId,
            parameters = rows.Count,
            changed,
            abnormal = rows.Count(p => HIS.Infrastructure.Services.LabFlagEvaluator.IsAbnormal(p.Flag)),
            critical = rows.Count(p => p.Flag == "HH" || p.Flag == "LL"),
        });
    }

    /// <summary>Re-evaluate 1 chỉ số con cụ thể — #14e: model 1.</summary>
    public async Task<ServiceOutcome> EvaluateRowAsync(Guid labResultId)
    {
        var row = await _db.ServiceRequestDetailParameters.FindAsync(labResultId);
        if (row == null) return ServiceOutcome.NotFound();
        var critOf = await CriticalLimitsAsync(new[] { row.ServiceRequestDetailId });
        var changed = EvaluateOne(row, critOf(row));
        if (changed) await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new
        {
            row.Id,
            isAbnormal = HIS.Infrastructure.Services.LabFlagEvaluator.IsAbnormal(row.Flag),
            abnormalType = HIS.Infrastructure.Services.LabFlagEvaluator.FlagToAbnormalType(row.Flag),
            isCritical = row.Flag == "HH" || row.Flag == "LL",
            changed,
        });
    }

    /// <summary>Evaluate 1 giá trị cụ thể — dùng cho preview trước khi lưu.</summary>
    public Task<ServiceOutcome> PreviewAsync(decimal value, decimal? min, decimal? max)
    {
        var (isAbnormal, type, color) = EvaluateValue(value, min, max);
        return Task.FromResult(ServiceOutcome.Ok(new { isAbnormal, abnormalType = type, color }));
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

    /// <summary>
    /// Critical limits per parameter from the LisTestParameter catalog. Re-evaluation used to pass null limits,
    /// which silently downgraded every HH/LL flag to H/L and removed the LAB-29 critical-value alert.
    /// </summary>
    private async Task<Func<Core.Entities.ServiceRequestDetailParameter, (decimal? Low, decimal? High)>> CriticalLimitsAsync(
        IEnumerable<Guid> srdIds)
    {
        var ids = srdIds.Distinct().ToList();
        var serviceBySrd = await _db.ServiceRequestDetails.Where(d => ids.Contains(d.Id))
            .Select(d => new { d.Id, d.ServiceId }).ToDictionaryAsync(x => x.Id, x => x.ServiceId);
        var svcIds = serviceBySrd.Values.Distinct().ToList();
        var cats = await _db.LisTestParameters
            .Where(c => c.ServiceId != null && svcIds.Contains(c.ServiceId.Value) && c.IsActive && !c.IsDeleted)
            .ToListAsync();
        return p =>
        {
            if (!serviceBySrd.TryGetValue(p.ServiceRequestDetailId, out var sid)) return (null, null);
            var c = cats.FirstOrDefault(x => x.ServiceId == sid && (x.Code == p.ParameterCode || x.Hl7Code == p.ParameterCode));
            return (c?.CriticalLow, c?.CriticalHigh);
        };
    }

    // #14e: model 1 — tính lại Flag (N/H/L/HH/LL) cho chỉ số con từ NumericValue + khoảng tham chiếu
    private static bool EvaluateOne(Core.Entities.ServiceRequestDetailParameter p, (decimal? Low, decimal? High) crit)
    {
        // Re-parse the raw value: rows saved before the decimal-comma fix hold "5,6" as 56
        var parsed = HIS.Infrastructure.Services.LabFlagEvaluator.TryParse(p.Value);
        var changed = false;
        if (parsed.HasValue && parsed != p.NumericValue) { p.NumericValue = parsed; changed = true; }
        if (!p.NumericValue.HasValue) return changed;
        // No catalog critical limits (e.g. HH/LL came from the analyzer's OBX-8) → never downgrade a critical flag
        if (!crit.Low.HasValue && !crit.High.HasValue && (p.Flag == "HH" || p.Flag == "LL")) return changed;
        var newFlag = HIS.Infrastructure.Services.LabFlagEvaluator.EvaluateFlag(
            p.NumericValue, p.ReferenceMin, p.ReferenceMax, crit.Low, crit.High);
        if (p.Flag == newFlag) return changed;
        p.Flag = newFlag;
        return true;
    }
}
