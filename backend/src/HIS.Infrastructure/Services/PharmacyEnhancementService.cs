using HIS.Application.Common;
using HIS.Application.DTOs.PharmacyEnhancement;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Dược nâng cao: cảnh báo hết hạn + pha chế trung tâm.
/// Logic tách khỏi PharmacyEnhancementController (#202 thin-controller).
/// Behavior-preserving: mọi query/projection/response shape giữ NGUYÊN;
/// GetExpiryAlertsOnLogin giữ nguyên inline subquery MedicineName/WarehouseName;
/// userId truyền từ controller (thay cho GetUserId() cũ đọc claim).
/// </summary>
public class PharmacyEnhancementService : IPharmacyEnhancementService
{
    private readonly HISDbContext _db;
    public PharmacyEnhancementService(HISDbContext db) => _db = db;

    // ========== Login-time Expiry Alerts ==========

    public async Task<ServiceOutcome> GetExpiryAlertsOnLoginAsync()
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

        return ServiceOutcome.Ok(new { totalAlerts = alerts.Count, alerts });
    }

    public async Task<ServiceOutcome> AcknowledgeExpiryAlertAsync(Guid id, Guid userId)
    {
        var alert = await _db.ExpiryAlerts.FindAsync(id);
        if (alert == null) return ServiceOutcome.NotFound();
        alert.Status = 1;
        alert.AcknowledgedAt = DateTime.Now;
        alert.AcknowledgedBy = userId;
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    // ========== Compounding Orders (Pha chế trung tâm) ==========

    public async Task<ServiceOutcome> GetCompoundingOrdersAsync(int? status, Guid? departmentId)
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

        return ServiceOutcome.Ok(items);
    }

    public async Task<ServiceOutcome> GetCompoundingOrderAsync(Guid id)
    {
        var c = await _db.CompoundingOrders
            .Include(x => x.Items).ThenInclude(i => i.Medicine)
            .Include(x => x.Patient).Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (c == null) return ServiceOutcome.NotFound();

        return ServiceOutcome.Ok(new
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

    public async Task<ServiceOutcome> CreateCompoundingOrderAsync(CompoundingOrder dto, Guid userId)
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
            IsDeleted = false,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
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
                CreatedBy = userId.ToString(),
            });
        }

        _db.CompoundingOrders.Add(entity);
        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { entity.Id, entity.OrderCode });
    }

    public async Task<ServiceOutcome> StartCompoundingAsync(Guid id, Guid userId)
    {
        var c = await _db.CompoundingOrders.FindAsync(id);
        if (c == null) return ServiceOutcome.NotFound();
        c.Status = 1;
        c.PreparedById = userId;
        c.PreparedAt = DateTime.Now;
        c.UpdatedAt = DateTime.Now;
        c.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> CompleteCompoundingAsync(Guid id, Guid userId)
    {
        var c = await _db.CompoundingOrders.FindAsync(id);
        if (c == null) return ServiceOutcome.NotFound();
        c.Status = 2;
        c.CheckedById = userId;
        c.CheckedAt = DateTime.Now;
        c.UpdatedAt = DateTime.Now;
        c.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }

    public async Task<ServiceOutcome> CancelCompoundingAsync(Guid id, CancelReasonDto dto, Guid userId)
    {
        var c = await _db.CompoundingOrders.FindAsync(id);
        if (c == null) return ServiceOutcome.NotFound();
        c.Status = 3;
        c.CancelReason = dto.Reason;
        c.UpdatedAt = DateTime.Now;
        c.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return ServiceOutcome.OkEmpty();
    }
}
