using System.Security.Claims;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Lấy mẫu bệnh phẩm với STT tuần tự theo ngày + thêm XN cùng mẫu.
/// Bổ sung LISCompleteController với các tính năng MQ Solutions yêu cầu.
/// </summary>
[ApiController]
[Route("api/sample-collection")]
[Authorize]
public class SampleCollectionController : ControllerBase
{
    private readonly HISDbContext _db;

    public SampleCollectionController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public record AssignSequenceDto(Guid ServiceRequestDetailId, string? PreferredPrefix);
    public record AssignSequenceResultDto(string SampleBarcode, int SequenceNumber);

    /// <summary>
    /// Cấp STT tuần tự theo ngày cho mẫu bệnh phẩm.
    /// Format: {Prefix}-{yyMMdd}-{NNNN} (VD: XN-250102-0042)
    /// </summary>
    [HttpPost("assign-sequence")]
    public async Task<ActionResult<AssignSequenceResultDto>> AssignSequence([FromBody] AssignSequenceDto dto)
    {
        var detail = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException("ServiceRequestDetail không tồn tại");

        if (!string.IsNullOrWhiteSpace(detail.SampleBarcode))
        {
            return Ok(new AssignSequenceResultDto(detail.SampleBarcode, 0));
        }

        var prefix = string.IsNullOrWhiteSpace(dto.PreferredPrefix) ? "XN" : dto.PreferredPrefix;
        var today = DateTime.Today;
        var dateStr = today.ToString("yyMMdd");

        var todayCount = await _db.ServiceRequestDetails
            .CountAsync(d => d.SampleCollectedAt != null
                && d.SampleCollectedAt.Value.Date == today);

        var seq = todayCount + 1;
        var barcode = $"{prefix}-{dateStr}-{seq:D4}";

        detail.SampleBarcode = barcode;
        detail.SampleCollectedAt = DateTime.UtcNow;
        detail.IsSampleCollected = true;
        detail.UpdatedAt = DateTime.UtcNow;
        detail.UpdatedBy = GetUserId().ToString();

        await _db.SaveChangesAsync();
        return Ok(new AssignSequenceResultDto(barcode, seq));
    }

    public record AddTestsToSampleDto(string ExistingBarcode, List<Guid> AdditionalDetailIds);
    public record AddTestsResultDto(int Added, string Barcode);

    /// <summary>
    /// Thêm XN bổ sung trên cùng 1 mẫu bệnh phẩm đã lấy — MQ Solutions "Thêm XN cùng mẫu".
    /// Các XN mới dùng lại cùng SampleBarcode → không cần lấy mẫu mới.
    /// </summary>
    [HttpPost("add-tests")]
    public async Task<ActionResult<AddTestsResultDto>> AddTests([FromBody] AddTestsToSampleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ExistingBarcode) || dto.AdditionalDetailIds.Count == 0)
            throw new ArgumentException("Thiếu barcode hoặc danh sách XN");

        // Lấy mẫu gốc để copy SampleCollectedAt
        var origin = await _db.ServiceRequestDetails
            .FirstOrDefaultAsync(d => d.SampleBarcode == dto.ExistingBarcode)
            ?? throw new KeyNotFoundException($"Không tìm thấy mẫu với barcode {dto.ExistingBarcode}");

        var details = await _db.ServiceRequestDetails
            .Where(d => dto.AdditionalDetailIds.Contains(d.Id))
            .ToListAsync();

        var userId = GetUserId().ToString();
        int added = 0;
        foreach (var d in details)
        {
            if (!string.IsNullOrWhiteSpace(d.SampleBarcode)) continue;
            d.SampleBarcode = dto.ExistingBarcode;
            d.SampleCollectedAt = origin.SampleCollectedAt;
            d.IsSampleCollected = true;
            d.UpdatedAt = DateTime.UtcNow;
            d.UpdatedBy = userId;
            added++;
        }
        await _db.SaveChangesAsync();
        return Ok(new AddTestsResultDto(added, dto.ExistingBarcode));
    }

    public record UpdateSequenceDto(Guid ServiceRequestDetailId, int NewSequenceNumber, string? Prefix);

    /// <summary>
    /// Sửa STT mẫu — đổi số thứ tự trong ngày (MQ Solutions "Sửa STT").
    /// </summary>
    [HttpPost("update-sequence")]
    public async Task<ActionResult<AssignSequenceResultDto>> UpdateSequence([FromBody] UpdateSequenceDto dto)
    {
        var detail = await _db.ServiceRequestDetails.FirstOrDefaultAsync(d => d.Id == dto.ServiceRequestDetailId)
            ?? throw new KeyNotFoundException();

        var dateStr = (detail.SampleCollectedAt ?? DateTime.Today).ToString("yyMMdd");
        var prefix = dto.Prefix ?? detail.SampleBarcode?.Split('-').FirstOrDefault() ?? "XN";
        var newBarcode = $"{prefix}-{dateStr}-{dto.NewSequenceNumber:D4}";

        var clash = await _db.ServiceRequestDetails
            .AnyAsync(d => d.Id != detail.Id && d.SampleBarcode == newBarcode);
        if (clash) throw new InvalidOperationException($"STT {newBarcode} đã bị sử dụng");

        detail.SampleBarcode = newBarcode;
        detail.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new AssignSequenceResultDto(newBarcode, dto.NewSequenceNumber));
    }

    /// <summary>Lịch sử lấy mẫu của BN, group theo ngày/đợt</summary>
    [HttpGet("history/{patientId:guid}")]
    public async Task<IActionResult> History(Guid patientId)
    {
        var samples = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest).ThenInclude(r => r.MedicalRecord)
            .Where(d => d.ServiceRequest.MedicalRecord.PatientId == patientId
                && d.IsSampleCollected)
            .OrderByDescending(d => d.SampleCollectedAt)
            .Take(100)
            .Select(d => new
            {
                d.Id,
                d.SampleBarcode,
                d.SampleCollectedAt,
                ServiceName = d.Service.ServiceName,
                Result = d.Result,
                Status = d.Status,
                RequestCode = d.ServiceRequest.RequestCode,
            })
            .ToListAsync();

        var grouped = samples.GroupBy(s => s.SampleCollectedAt!.Value.Date)
            .Select(g => new
            {
                Date = g.Key,
                Count = g.Count(),
                Samples = g.OrderBy(s => s.SampleBarcode).ToList()
            })
            .ToList();
        return Ok(grouped);
    }
}
