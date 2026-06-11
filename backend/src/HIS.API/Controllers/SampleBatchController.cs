using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// M3.13 — Lịch sử lấy mẫu phân theo đợt (morning/afternoon/evening/emergency).
/// Dùng cho KTV xem báo cáo trong ca của mình.
/// </summary>
[ApiController]
[Route("api/sample-batches")]
[Authorize]
public class SampleBatchController : ControllerBase
{
    private readonly HISDbContext _db;

    public SampleBatchController(HISDbContext db) { _db = db; }

    public record SampleItemDto(
        Guid Id,
        string? SampleBarcode,
        string? SampleType,
        string TestName,
        string PatientName,
        string PatientCode,
        DateTime CollectedAt,
        Guid? CollectedBy,
        string? CollectorName,
        int Priority,
        int Status);

    public record BatchDto(string BatchName, int Count, IReadOnlyList<SampleItemDto> Items);
    public record BatchReportDto(DateTime Date, IReadOnlyList<BatchDto> Batches, int Total);

    [HttpGet]
    public async Task<ActionResult<BatchReportDto>> GetBatches([FromQuery] DateTime? date)
    {
        var target = date?.Date ?? DateTime.Today;
        var from = target;
        var to = target.AddDays(1).AddSeconds(-1);

        // #14e: model 1 SRD (RequestType=1, đã lấy mẫu trong ngày) — model 2 LabRequestItems đã gỡ
        var items = await _db.ServiceRequestDetails
            .Where(i => !i.IsDeleted && i.Status != 3
                && i.ServiceRequest.RequestType == 1
                && i.SampleCollectedAt != null && i.SampleCollectedAt >= from && i.SampleCollectedAt <= to)
            .Include(i => i.Service).ThenInclude(s => s.ServiceGroup)
            .Include(i => i.ServiceRequest).ThenInclude(r => r.MedicalRecord).ThenInclude(m => m.Patient)
            .ToListAsync();

        var collectorIds = items.Where(i => i.CollectedByUserId.HasValue).Select(i => i.CollectedByUserId!.Value).Distinct().ToList();
        var collectorNames = collectorIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await _db.Users.Where(u => collectorIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);

        var shaped = items.Select(i => new SampleItemDto(
            i.Id,
            i.SampleBarcode,
            i.Service?.ServiceGroup?.GroupName,
            i.Service?.ServiceName ?? "-",
            i.ServiceRequest?.MedicalRecord?.Patient?.FullName ?? "-",
            i.ServiceRequest?.MedicalRecord?.Patient?.PatientCode ?? "-",
            i.SampleCollectedAt!.Value,
            i.CollectedByUserId,
            i.CollectedByUserId.HasValue && collectorNames.TryGetValue(i.CollectedByUserId.Value, out var cn) ? cn : null,
            i.ServiceRequest?.IsEmergency == true ? 3 : i.ServiceRequest?.IsPriority == true ? 2 : 1,
            i.Status)).ToList();

        // Partition by shift + emergency (priority 3)
        var emergency = shaped.Where(s => s.Priority == 3).ToList();
        var nonEmergency = shaped.Where(s => s.Priority != 3).ToList();

        BatchDto ToBatch(string name, Func<SampleItemDto, bool> pred)
        {
            var list = nonEmergency.Where(pred).OrderBy(s => s.CollectedAt).ToList();
            return new BatchDto(name, list.Count, list);
        }

        var batches = new List<BatchDto>
        {
            ToBatch("Sáng (06-12)", s => s.CollectedAt.Hour >= 6 && s.CollectedAt.Hour < 12),
            ToBatch("Chiều (12-18)", s => s.CollectedAt.Hour >= 12 && s.CollectedAt.Hour < 18),
            ToBatch("Tối (18-24)", s => s.CollectedAt.Hour >= 18),
            ToBatch("Đêm (00-06)", s => s.CollectedAt.Hour < 6),
            new BatchDto("Cấp cứu (mọi lúc)", emergency.Count, emergency.OrderBy(s => s.CollectedAt).ToList()),
        };

        return Ok(new BatchReportDto(target, batches, shaped.Count));
    }
}
