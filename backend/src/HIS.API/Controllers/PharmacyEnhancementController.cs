using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HIS.API.Controllers;

[ApiController]
[Route("api/pharmacy")]
[Authorize]
public class PharmacyEnhancementController : ControllerBase
{
    private readonly HISDbContext _db;

    public PharmacyEnhancementController(HISDbContext db) => _db = db;

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ========== Login-time Expiry Alerts ==========

    [HttpGet("expiry-alerts/on-login")]
    public async Task<IActionResult> GetExpiryAlertsOnLogin()
    {
        var alerts = await _db.ExpiryAlerts
            .Where(a => a.Status == 0 && a.AlertLevel <= 2)
            .OrderBy(a => a.AlertLevel).ThenBy(a => a.ExpiryDate)
            .Take(20)
            .Select(a => new
            {
                a.Id, a.MedicineId, a.WarehouseId, a.BatchNumber, a.ExpiryDate,
                a.Quantity, a.AlertLevel,
                AlertLevelName = a.AlertLevel == 1 ? "Sắp hết hạn (<1 tháng)" : "Cảnh báo (1-3 tháng)",
                MedicineName = _db.Medicines.Where(m => m.Id == a.MedicineId).Select(m => m.MedicineName).FirstOrDefault() ?? "",
                WarehouseName = _db.Warehouses.Where(w => w.Id == a.WarehouseId).Select(w => w.WarehouseName).FirstOrDefault() ?? "",
            })
            .ToListAsync();

        return Ok(new { totalAlerts = alerts.Count, alerts });
    }

    [HttpPut("expiry-alerts/{id:guid}/acknowledge")]
    public async Task<IActionResult> AcknowledgeExpiryAlert(Guid id)
    {
        var alert = await _db.ExpiryAlerts.FindAsync(id);
        if (alert == null) return NotFound();
        alert.Status = 1;
        alert.AcknowledgedAt = DateTime.Now;
        alert.AcknowledgedBy = GetUserId();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ========== Compounding Orders (Pha chế trung tâm) ==========

    [HttpGet("compounding")]
    public async Task<IActionResult> GetCompoundingOrders([FromQuery] int? status, [FromQuery] Guid? departmentId)
    {
        var q = _db.CompoundingOrders
            .Include(c => c.Patient).Include(c => c.Department)
            .Where(c => !c.IsDeleted);

        if (status.HasValue) q = q.Where(c => c.Status == status.Value);
        if (departmentId.HasValue) q = q.Where(c => c.DepartmentId == departmentId.Value);

        var items = await q.OrderByDescending(c => c.CreatedAt).Take(200)
            .Select(c => new
            {
                c.Id, c.OrderCode, c.CompoundingType,
                CompoundingTypeName = c.CompoundingType == 1 ? "IV Admixture" : c.CompoundingType == 2 ? "TPN" : c.CompoundingType == 3 ? "Cytotoxic" : "Khác",
                PatientName = c.Patient != null ? c.Patient.FullName : "",
                DepartmentName = c.Department != null ? c.Department.DepartmentName : "",
                c.BaseFluid, c.TotalVolume, c.InfusionRate,
                c.Status,
                StatusName = c.Status == 0 ? "Chờ pha chế" : c.Status == 1 ? "Đang pha" : c.Status == 2 ? "Hoàn thành" : "Hủy",
                c.CreatedAt, c.PreparedAt, c.CheckedAt,
            }).ToListAsync();

        return Ok(items);
    }

    [HttpGet("compounding/{id:guid}")]
    public async Task<IActionResult> GetCompoundingOrder(Guid id)
    {
        var c = await _db.CompoundingOrders
            .Include(x => x.Items).ThenInclude(i => i.Medicine)
            .Include(x => x.Patient).Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return NotFound();

        return Ok(new
        {
            c.Id, c.OrderCode, c.PrescriptionId, c.PatientId, c.CompoundingType,
            PatientName = c.Patient?.FullName,
            DepartmentName = c.Department?.DepartmentName,
            c.Instructions, c.BaseFluid, c.TotalVolume, c.InfusionRate, c.StabilityNotes,
            c.Status, c.PreparedAt, c.CheckedAt, c.CancelReason, c.CreatedAt,
            Items = c.Items.Select(i => new
            {
                i.Id, i.MedicineId,
                MedicineName = i.Medicine?.MedicineName ?? "",
                i.Quantity, i.Unit, i.MixingInstructions, i.SortOrder,
            }),
        });
    }

    [HttpPost("compounding")]
    [Authorize(Roles = "Admin,Pharmacist,PharmacyHead")]
    public async Task<IActionResult> CreateCompoundingOrder([FromBody] CompoundingOrder dto)
    {
        var entity = new CompoundingOrder
        {
            Id = Guid.NewGuid(),
            OrderCode = $"PC{DateTime.Now:yyyyMMddHHmmss}",
            PrescriptionId = dto.PrescriptionId,
            PatientId = dto.PatientId,
            AdmissionId = dto.AdmissionId,
            DepartmentId = dto.DepartmentId,
            CompoundingType = dto.CompoundingType,
            Instructions = dto.Instructions,
            BaseFluid = dto.BaseFluid,
            TotalVolume = dto.TotalVolume,
            InfusionRate = dto.InfusionRate,
            StabilityNotes = dto.StabilityNotes,
            Status = 0,
            CreatedAt = DateTime.Now,
            CreatedBy = GetUserId().ToString(),
        };

        foreach (var item in dto.Items)
        {
            entity.Items.Add(new CompoundingOrderItem
            {
                Id = Guid.NewGuid(),
                CompoundingOrderId = entity.Id,
                MedicineId = item.MedicineId,
                Quantity = item.Quantity,
                Unit = item.Unit,
                MixingInstructions = item.MixingInstructions,
                SortOrder = item.SortOrder,
                CreatedAt = DateTime.Now,
                CreatedBy = GetUserId().ToString(),
            });
        }

        _db.CompoundingOrders.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(new { entity.Id, entity.OrderCode });
    }

    [HttpPut("compounding/{id:guid}/start")]
    [Authorize(Roles = "Admin,Pharmacist,PharmacyHead")]
    public async Task<IActionResult> StartCompounding(Guid id)
    {
        var c = await _db.CompoundingOrders.FindAsync(id);
        if (c == null) return NotFound();
        c.Status = 1;
        c.PreparedById = GetUserId();
        c.PreparedAt = DateTime.Now;
        c.UpdatedAt = DateTime.Now;
        c.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("compounding/{id:guid}/complete")]
    [Authorize(Roles = "Admin,Pharmacist,PharmacyHead")]
    public async Task<IActionResult> CompleteCompounding(Guid id)
    {
        var c = await _db.CompoundingOrders.FindAsync(id);
        if (c == null) return NotFound();
        c.Status = 2;
        c.CheckedById = GetUserId();
        c.CheckedAt = DateTime.Now;
        c.UpdatedAt = DateTime.Now;
        c.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPut("compounding/{id:guid}/cancel")]
    [Authorize(Roles = "Admin,Pharmacist,PharmacyHead")]
    public async Task<IActionResult> CancelCompounding(Guid id, [FromBody] CancelReasonDto dto)
    {
        var c = await _db.CompoundingOrders.FindAsync(id);
        if (c == null) return NotFound();
        c.Status = 3;
        c.CancelReason = dto.Reason;
        c.UpdatedAt = DateTime.Now;
        c.UpdatedBy = GetUserId().ToString();
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

public class CancelReasonDto
{
    public string? Reason { get; set; }
}
