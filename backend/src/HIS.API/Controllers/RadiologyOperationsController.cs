using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// CĐHA: chỉ định thêm + xuất thuốc/vật tư tại phòng — N1.14 + N1.15.
/// </summary>
[ApiController]
[Route("api/radiology-ops")]
[Authorize]
public class RadiologyOperationsController : ControllerBase
{
    private readonly HISDbContext _db;
    public RadiologyOperationsController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public class AddOnDto
    {
        public Guid ParentRequestId { get; set; }
        public List<Guid> ServiceIds { get; set; } = new();
        public string? Reason { get; set; }
        public bool WithContrast { get; set; }
    }

    /// <summary>N1.14 — thêm chỉ định CĐHA mới liên kết cùng HSBA/examination.</summary>
    [HttpPost("add-on")]
    [Authorize(Roles = "Admin,Radiologist,Technician,Doctor")]
    public async Task<IActionResult> AddOn([FromBody] AddOnDto dto)
    {
        var parent = await _db.Set<RadiologyRequest>()
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.ParentRequestId);
        if (parent == null) return NotFound(new { message = "Phiếu CĐHA gốc không tồn tại" });
        if (dto.ServiceIds.Count == 0) return BadRequest(new { message = "Chưa chọn dịch vụ" });

        var services = await _db.Services
            .Where(s => dto.ServiceIds.Contains(s.Id) && s.IsActive)
            .ToListAsync();
        if (services.Count == 0) return BadRequest(new { message = "Dịch vụ không tồn tại" });

        var now = DateTime.Now;
        var uid = GetUserId();
        var created = new List<object>();

        foreach (var svc in services)
        {
            var req = new RadiologyRequest
            {
                Id = Guid.NewGuid(),
                RequestCode = $"CDHA{now:yyyyMMddHHmmss}{created.Count:00}",
                PatientId = parent.PatientId,
                ExaminationId = parent.ExaminationId,
                MedicalRecordId = parent.MedicalRecordId,
                RequestDate = now,
                ServiceId = svc.Id,
                RequestingDoctorId = uid != Guid.Empty ? uid : parent.RequestingDoctorId,
                Priority = parent.Priority,
                Status = 0,
                ClinicalInfo = dto.Reason,
                BodyPart = parent.BodyPart,
                Contrast = dto.WithContrast,
                ScheduledDate = now,
                PatientType = parent.PatientType,
                InsuranceNumber = parent.InsuranceNumber,
                TotalAmount = svc.UnitPrice,
                PatientAmount = parent.PatientType == 1 ? 0 : svc.UnitPrice,
                InsuranceAmount = parent.PatientType == 1 ? svc.UnitPrice : 0,
                IsPaid = false,
                Notes = $"Chỉ định thêm từ phiếu {parent.RequestCode}",
                CreatedAt = now,
                CreatedBy = uid.ToString(),
            };
            _db.Set<RadiologyRequest>().Add(req);
            created.Add(new { req.Id, req.RequestCode, serviceId = svc.Id, svc.ServiceName });
        }

        await _db.SaveChangesAsync();
        return Ok(new { parentRequestId = parent.Id, created });
    }

    public class RoomDispenseItemDto
    {
        public Guid? MedicineId { get; set; }
        public Guid? SupplyId { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public string? Note { get; set; }
    }

    public class RoomDispenseDto
    {
        public Guid WarehouseId { get; set; }
        public Guid PatientId { get; set; }
        public Guid? RadiologyRequestId { get; set; }
        public Guid? MedicalRecordId { get; set; }
        public List<RoomDispenseItemDto> Items { get; set; } = new();
        public string? Note { get; set; }
    }

    /// <summary>N1.15 — xuất thuốc/vật tư tiêu hao tại phòng CĐHA cho BN.</summary>
    [HttpPost("dispense")]
    [Authorize(Roles = "Admin,Radiologist,Technician,Nurse,Pharmacist")]
    public async Task<IActionResult> Dispense([FromBody] RoomDispenseDto dto)
    {
        if (dto.Items.Count == 0) return BadRequest(new { message = "Chưa chọn thuốc/vật tư" });
        var warehouse = await _db.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null) return BadRequest(new { message = "Kho không tồn tại" });
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient == null) return BadRequest(new { message = "Bệnh nhân không tồn tại" });

        var now = DateTime.Now;
        var uid = GetUserId();

        var export = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"XCDHA{now:yyyyMMddHHmmss}",
            ReceiptDate = now,
            WarehouseId = dto.WarehouseId,
            ExportType = 1, // Xuất cho BN
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            TotalAmount = 0,
            Status = 1,
            Note = $"Xuất tại phòng CĐHA{(dto.RadiologyRequestId != null ? $" (phiếu {dto.RadiologyRequestId})" : "")}. {dto.Note ?? string.Empty}",
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        };

        decimal total = 0;
        foreach (var it in dto.Items)
        {
            if ((it.MedicineId == null && it.SupplyId == null) || it.Quantity <= 0)
                return BadRequest(new { message = "Dòng không hợp lệ" });

            var stocks = await _db.InventoryItems
                .Where(s => s.WarehouseId == dto.WarehouseId
                    && ((it.MedicineId != null && s.MedicineId == it.MedicineId)
                      || (it.SupplyId != null && s.SupplyId == it.SupplyId))
                    && (s.Quantity - s.ReservedQuantity) > 0)
                .OrderBy(s => s.ExpiryDate)
                .ToListAsync();

            var remaining = it.Quantity;
            foreach (var stock in stocks)
            {
                if (remaining <= 0) break;
                var take = Math.Min(remaining, stock.Quantity - stock.ReservedQuantity);
                if (take <= 0) continue;
                stock.Quantity -= take;
                remaining -= take;
                var amount = take * stock.UnitPrice;
                total += amount;

                _db.ExportReceiptDetails.Add(new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = export.Id,
                    MedicineId = it.MedicineId,
                    SupplyId = it.SupplyId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = it.Unit,
                    UnitPrice = stock.UnitPrice,
                    Amount = amount,
                    CreatedAt = now,
                    CreatedBy = uid.ToString(),
                });
            }
            if (remaining > 0)
                return BadRequest(new { message = $"Không đủ tồn cho dòng {(it.MedicineId ?? it.SupplyId)}, thiếu {remaining}" });
        }

        export.TotalAmount = total;
        _db.ExportReceipts.Add(export);
        await _db.SaveChangesAsync();

        return Ok(new { export.Id, export.ReceiptCode, export.TotalAmount });
    }
}
