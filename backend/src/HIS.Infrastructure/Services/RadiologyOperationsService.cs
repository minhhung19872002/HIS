using HIS.Application.Common;
using HIS.Application.DTOs.RadiologyOperations;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// CĐHA: chỉ định thêm + xuất thuốc/vật tư tại phòng — N1.14 + N1.15.
/// Logic tách khỏi RadiologyOperationsController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape/FEFO logic giữ NGUYÊN;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public class RadiologyOperationsService : IRadiologyOperationsService
{
    private readonly HISDbContext _db;
    public RadiologyOperationsService(HISDbContext db) { _db = db; }

    /// <summary>N1.14 — thêm chỉ định CĐHA mới liên kết cùng HSBA/examination.</summary>
    public async Task<ServiceOutcome> AddOnAsync(AddOnDto dto, Guid userId)
    {
        var parent = await _db.Set<RadiologyRequest>()
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.ParentRequestId);
        if (parent == null) return ServiceOutcome.NotFound("Phiếu CĐHA gốc không tồn tại");
        if (dto.ServiceIds.Count == 0) return ServiceOutcome.Bad("Chưa chọn dịch vụ");

        var services = await _db.Services
            .Where(s => dto.ServiceIds.Contains(s.Id) && s.IsActive)
            .ToListAsync();
        if (services.Count == 0) return ServiceOutcome.Bad("Dịch vụ không tồn tại");

        var now = DateTime.UtcNow; // dot16: chuẩn UTC — RequestDate bị query DayRangeUtc (RIS Core8x:40)
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
                RequestingDoctorId = userId != Guid.Empty ? userId : parent.RequestingDoctorId,
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
                CreatedBy = userId.ToString(),
            };
            _db.Set<RadiologyRequest>().Add(req);
            created.Add(new { req.Id, req.RequestCode, serviceId = svc.Id, svc.ServiceName });
        }

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { parentRequestId = parent.Id, created });
    }

    /// <summary>N1.15 — xuất thuốc/vật tư tiêu hao tại phòng CĐHA cho BN.</summary>
    public async Task<ServiceOutcome> DispenseAsync(RoomDispenseDto dto, Guid userId)
    {
        if (dto.Items.Count == 0) return ServiceOutcome.Bad("Chưa chọn thuốc/vật tư");
        var warehouse = await _db.Warehouses.FindAsync(dto.WarehouseId);
        if (warehouse == null) return ServiceOutcome.Bad("Kho không tồn tại");
        var patient = await _db.Patients.FindAsync(dto.PatientId);
        if (patient == null) return ServiceOutcome.Bad("Bệnh nhân không tồn tại");

        var now = DateTime.Now;

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
            CreatedBy = userId.ToString(),
        };

        decimal total = 0;
        foreach (var it in dto.Items)
        {
            if ((it.MedicineId == null && it.SupplyId == null) || it.Quantity <= 0)
                return ServiceOutcome.Bad("Dòng không hợp lệ");

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
                    CreatedBy = userId.ToString(),
                });
            }
            if (remaining > 0)
                return ServiceOutcome.Bad($"Không đủ tồn cho dòng {(it.MedicineId ?? it.SupplyId)}, thiếu {remaining}");
        }

        export.TotalAmount = total;
        _db.ExportReceipts.Add(export);
        await _db.SaveChangesAsync();

        return ServiceOutcome.Ok(new { export.Id, export.ReceiptCode, export.TotalAmount });
    }
}
