using System.Security.Claims;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// Cho lại chỉ định CLS sau hoàn hóa đơn — N1.09.
/// Sau khi hoàn tiền một hoặc nhiều dịch vụ CLS, cho phép "cho lại" chỉ định
/// để BN có thể thực hiện lại mà không cần làm đơn mới.
/// </summary>
[ApiController]
[Route("api/service-refund")]
[Authorize]
public class ServiceRefundController : ControllerBase
{
    private readonly HISDbContext _db;
    public ServiceRefundController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Lấy danh sách DV CLS đã hủy/hoàn của 1 hồ sơ để chọn "cho lại".</summary>
    [HttpGet("cancelled-services/{medicalRecordId:guid}")]
    public async Task<IActionResult> CancelledServices(Guid medicalRecordId)
    {
        var list = await _db.ServiceRequestDetails
            .Include(d => d.Service)
            .Include(d => d.ServiceRequest)
            .Where(d => d.ServiceRequest.MedicalRecordId == medicalRecordId
                && d.Status == 3) // 3 = Hủy
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .Take(100)
            .ToListAsync();
        return Ok(list.Select(d => new
        {
            d.Id,
            ServiceRequestId = d.ServiceRequestId,
            RequestCode = d.ServiceRequest.RequestCode,
            RequestDate = d.ServiceRequest.RequestDate,
            ServiceCode = d.Service.ServiceCode,
            ServiceName = d.Service.ServiceName,
            d.Quantity,
            d.UnitPrice,
            d.Amount,
            d.PatientAmount,
            d.InsuranceAmount,
            d.Note,
            CancelledAt = d.UpdatedAt,
        }));
    }

    public class RequeueDto
    {
        public List<Guid> ServiceRequestDetailIds { get; set; } = new();
        public string Reason { get; set; } = string.Empty;
        public bool KeepAsPaid { get; set; } = true; // true = kế thừa đã TT, false = chờ TT lại
    }

    /// <summary>Cho lại các chỉ định — chuyển status về Chờ, log lý do.</summary>
    [HttpPost("requeue")]
    [Authorize(Roles = "Admin,Doctor,Cashier,Accountant")]
    public async Task<IActionResult> Requeue([FromBody] RequeueDto dto)
    {
        if (dto.ServiceRequestDetailIds.Count == 0)
            return BadRequest(new { message = "Chưa chọn dịch vụ" });
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "Phải nhập lý do cho lại" });

        var details = await _db.ServiceRequestDetails
            .Include(d => d.ServiceRequest)
            .Where(d => dto.ServiceRequestDetailIds.Contains(d.Id))
            .ToListAsync();

        var updated = 0;
        var now = DateTime.Now;
        var userId = GetUserId();

        foreach (var d in details)
        {
            if (d.Status != 3) continue; // only re-issue cancelled ones
            d.Status = 0;
            d.Result = null;
            d.ResultDescription = null;
            d.Conclusion = null;
            d.ResultDate = null;
            d.ResultUserId = null;
            d.IsSampleCollected = false;
            d.SampleCollectedAt = null;
            d.SampleBarcode = null;
            var prefix = string.IsNullOrWhiteSpace(d.Note) ? "" : d.Note + "\n";
            d.Note = $"{prefix}[CHO LẠI {now:dd/MM/yyyy HH:mm}] {dto.Reason}";
            d.UpdatedAt = now;
            d.UpdatedBy = userId.ToString();

            // Also lift parent request from cancelled if entirely rebooted
            var sr = d.ServiceRequest;
            if (sr.Status == 4)
            {
                sr.Status = dto.KeepAsPaid && sr.IsPaid ? 1 : 0;
                sr.UpdatedAt = now;
                sr.UpdatedBy = userId.ToString();
            }
            updated++;
        }

        await _db.SaveChangesAsync();
        return Ok(new { requeued = updated, total = details.Count });
    }
}
