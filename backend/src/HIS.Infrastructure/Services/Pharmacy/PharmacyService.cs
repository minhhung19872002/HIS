using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

// Issue #202 (2026-07-06): tách HISDbContext khỏi PharmacyController (5 partial, 39 _context)
// sang service layer (Clean Arch). Logic verbatim — FEFO/trừ kho vẫn qua IWarehouseCompleteService.
public partial class PharmacyService : IPharmacyService
{
    private readonly HISDbContext _context;
    private readonly ILogger<PharmacyService> _logger;
    private readonly IWarehouseCompleteService _warehouseService;

    public PharmacyService(HISDbContext context, ILogger<PharmacyService> logger, IWarehouseCompleteService warehouseService)
    {
        _context = context;
        _logger = logger;
        _warehouseService = warehouseService;
    }

    // ==================== 1. Pending Prescriptions ====================

    public async Task<object> GetPendingPrescriptionsAsync()
    {
        return await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.Department)
            .Include(p => p.Details)
            .Where(p => !p.IsDeleted && (p.Status == 0 || p.Status == 1))
            .OrderByDescending(p => p.CreatedAt)
            .Take(100)
            .Select(p => new
            {
                id = p.Id.ToString(),
                prescriptionCode = p.PrescriptionCode,
                patientName = p.MedicalRecord != null && p.MedicalRecord.Patient != null
                    ? p.MedicalRecord.Patient.FullName : "",
                patientCode = p.MedicalRecord != null && p.MedicalRecord.Patient != null
                    ? p.MedicalRecord.Patient.PatientCode : "",
                doctorName = p.Doctor != null ? p.Doctor.FullName : "",
                itemsCount = p.Details.Count(d => !d.IsDeleted),
                totalAmount = p.TotalAmount,
                status = p.Status == 0 ? "pending"
                       : p.Status == 1 ? "accepted"
                       : p.Status == 2 ? "completed"
                       : "rejected",
                priority = "normal",
                createdDate = p.CreatedAt,
                department = p.Department != null ? p.Department.DepartmentName : "",
            })
            .ToListAsync();
    }

    // ==================== 5. Additional endpoints for full CRUD ====================

    public async Task<bool> AcceptPrescriptionAsync(Guid prescriptionId)
    {
        var prescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);
        if (prescription == null) return false;

        prescription.Status = 1; // Đã duyệt
        prescription.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectPrescriptionAsync(Guid prescriptionId, string? reason)
    {
        var prescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);
        if (prescription == null) return false;

        prescription.Status = 4; // Hủy
        prescription.Note = reason ?? prescription.Note;
        prescription.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<object> GetMedicationItemsAsync(Guid prescriptionId)
    {
        var details = await _context.PrescriptionDetails
            .AsNoTracking()
            .Include(d => d.Medicine)
            .Where(d => d.PrescriptionId == prescriptionId && !d.IsDeleted)
            .ToListAsync();

        return details.Select(d => new
        {
            id = d.Id.ToString(),
            medicationCode = d.Medicine?.MedicineCode ?? "",
            medicationName = d.Medicine?.MedicineName ?? "",
            unit = d.Unit ?? d.Medicine?.Unit ?? "",
            quantity = (int)d.Quantity,
            dispensedQuantity = (int)d.DispensedQuantity,
            dosage = d.Dosage ?? "",
            instruction = d.UsageInstructions ?? d.Usage ?? "",
            batches = GetBatchesForMedicine(d.MedicineId, d.WarehouseId),
            selectedBatch = d.BatchNumber,
        }).ToList();
    }

    private List<object> GetBatchesForMedicine(Guid medicineId, Guid? warehouseId)
    {
        try
        {
            var query = _context.InventoryItems
                .AsNoTracking()
                .Include(i => i.Warehouse)
                .Where(i => !i.IsDeleted && i.MedicineId == medicineId && i.Quantity > 0);

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            return query
                .OrderBy(i => i.ExpiryDate)
                .Take(10)
                .Select(i => (object)new
                {
                    batchNumber = i.BatchNumber ?? "",
                    expiryDate = i.ExpiryDate,
                    availableQuantity = (int)i.AvailableQuantity,
                    warehouse = i.Warehouse != null ? i.Warehouse.WarehouseName : "",
                    manufacturingDate = i.ManufactureDate,
                    recommendedFEFO = true,
                })
                .ToList();
        }
        catch
        {
            return new List<object>();
        }
    }

    public async Task<PharmacyDispenseResultDto> CompleteDispensingAsync(Guid prescriptionId, Guid userId)
    {
        var prescription = await _context.Prescriptions
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

        if (prescription == null)
            return new PharmacyDispenseResultDto { NotFound = true };

        // Idempotent: đã phát rồi thì KHÔNG trừ kho lần nữa.
        if (prescription.IsDispensed)
            return new PharmacyDispenseResultDto();

        // Phát thuốc PHẢI trừ kho FEFO (audit luồng nghiệp vụ 2026-06-06 #6): đi qua nhánh chuẩn
        // WarehouseComplete (tạo phiếu xuất + trừ tồn + set trạng thái đơn trong transaction).
        // Test e2e prod 2026-06-13: fallback cũ "đơn chưa gán kho → chỉ đánh dấu đã phát" làm
        // thất thoát kho (không phiếu xuất → cancel-dispensed cũng không hoàn được). Nay đơn chưa
        // gán kho → resolve kho lẻ ngoại trú mặc định (WarehouseType=2); không có kho → 400 rõ ràng,
        // TUYỆT ĐỐI không phát mà không trừ tồn.
        if (!prescription.WarehouseId.HasValue || prescription.WarehouseId.Value == Guid.Empty)
        {
            var defaultDispensaryId = await _context.Warehouses
                .Where(w => w.IsActive && !w.IsDeleted && w.WarehouseType == 2)
                .OrderBy(w => w.WarehouseName)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync();
            if (defaultDispensaryId == null)
                return new PharmacyDispenseResultDto
                {
                    NoWarehouse = true,
                    Message = "Đơn thuốc chưa gán kho xuất và không có kho lẻ ngoại trú (WarehouseType=2) đang hoạt động — chọn kho trước khi phát"
                };

            _logger.LogInformation(
                "CompleteDispensing: prescription {Id} chưa gán kho — dùng kho lẻ mặc định {WarehouseId}",
                prescriptionId, defaultDispensaryId);
            prescription.WarehouseId = defaultDispensaryId;
            await _context.SaveChangesAsync();
        }

        await _warehouseService.DispenseOutpatientPrescriptionAsync(prescriptionId, userId);
        return new PharmacyDispenseResultDto();
    }

    public async Task<int?> UpdateDispensedQuantityAsync(Guid itemId, decimal quantity, string? batchNumber)
    {
        var detail = await _context.PrescriptionDetails
            .FirstOrDefaultAsync(d => d.Id == itemId && !d.IsDeleted);
        if (detail == null) return null;

        detail.DispensedQuantity = quantity;
        if (!string.IsNullOrEmpty(batchNumber))
            detail.BatchNumber = batchNumber;
        detail.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return (int)detail.DispensedQuantity;
    }
}
