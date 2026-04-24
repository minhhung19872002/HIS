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

        var items = await _db.LabRequestItems
            .Where(i => i.SampleCollectedAt != null && i.SampleCollectedAt >= from && i.SampleCollectedAt <= to)
            .Include(i => i.LabRequest)
                .ThenInclude(r => r!.MedicalRecord)
                    .ThenInclude(m => m!.Patient)
            .Include(i => i.CollectedByUser)
            .ToListAsync();

        var shaped = items.Select(i => new SampleItemDto(
            i.Id,
            i.SampleBarcode,
            i.SampleType,
            i.TestName,
            i.LabRequest?.MedicalRecord?.Patient?.FullName ?? "-",
            i.LabRequest?.MedicalRecord?.Patient?.PatientCode ?? "-",
            i.SampleCollectedAt!.Value,
            i.SampleCollectedBy,
            i.CollectedByUser?.FullName,
            i.LabRequest?.Priority ?? 1,
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
