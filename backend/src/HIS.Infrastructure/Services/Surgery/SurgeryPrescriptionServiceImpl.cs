using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Surgery;
using HIS.Application.Services;
using HIS.Application.Services.Surgery;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;
using BloodBankDto = HIS.Application.Services.BloodBankDto;

namespace HIS.Infrastructure.Services.Surgery;

/// <summary>
/// K12 Step 4 (2026-05-30, Plan B): Implementation ISurgeryPrescriptionService.
/// Logic copy 1-1 từ SurgeryCompleteService cũ region 6.5 + 6.5.1 + 6.6 Blood + 6.6 Consent
/// (32 method, ~426 dong).
/// </summary>
public class SurgeryPrescriptionServiceImpl : ISurgeryPrescriptionService
{
    private readonly HISDbContext _context;

    public SurgeryPrescriptionServiceImpl(HISDbContext context)
    {
        _context = context;
    }

    #region 6.5 Kê thuốc, vật tư trong PTTT

    // F1 (audit FLOW-FINAL 2026-06-06): persist thuốc/vật tư PTTT THẬT + tính tiền (cho viện phí) +
    // trừ kho FEFO. Trước đây toàn stub in-memory → mất dữ liệu, thất thu, không trừ kho.

    public async Task<SurgeryPrescriptionDto> GetPrescriptionAsync(Guid surgeryId)
    {
        var meds = await (from m in _context.SurgeryMedicineItems.Where(x => x.SurgeryId == surgeryId && !x.IsDeleted)
                          join med in _context.Medicines on m.MedicineId equals med.Id into mj
                          from med in mj.DefaultIfEmpty()
                          select new SurgeryMedicineDto
                          {
                              Id = m.Id, SurgeryId = m.SurgeryId, MedicineId = m.MedicineId,
                              MedicineCode = med != null ? med.MedicineCode : "", MedicineName = med != null ? med.MedicineName : "",
                              Unit = med != null ? (med.Unit ?? "") : "", Quantity = m.Quantity, UnitPrice = m.UnitPrice, Amount = m.Amount,
                              IsInPackage = m.IsInPackage, WarehouseId = m.WarehouseId ?? Guid.Empty, BatchNumber = m.BatchNumber,
                              PaymentObject = m.PaymentObject, Notes = m.UsageInstruction
                          }).ToListAsync();
        var supplies = await (from s in _context.SurgerySupplyItems.Where(x => x.SurgeryId == surgeryId && !x.IsDeleted)
                              join sup in _context.MedicalSupplies on s.SupplyId equals sup.Id into sj
                              from sup in sj.DefaultIfEmpty()
                              select new SurgerySupplyDto
                              {
                                  Id = s.Id, SurgeryId = s.SurgeryId, SupplyId = s.SupplyId,
                                  SupplyCode = sup != null ? sup.SupplyCode : "", SupplyName = sup != null ? sup.SupplyName : "",
                                  Unit = sup != null ? (sup.Unit ?? "") : "", Quantity = s.Quantity, UnitPrice = s.UnitPrice, Amount = s.Amount,
                                  IsInPackage = s.IsInPackage, WarehouseId = s.WarehouseId ?? Guid.Empty,
                                  PaymentObject = s.PaymentObject, Notes = s.Notes
                              }).ToListAsync();
        return new SurgeryPrescriptionDto { SurgeryId = surgeryId, Medicines = meds, Supplies = supplies };
    }

    /// <summary>Trừ kho FEFO best-effort (vật tư PTTT đã dùng trong mổ → trừ những gì có, không chặn).</summary>
    private async Task<(bool deducted, string? batch)> DeductStockFefoAsync(Guid warehouseId, Guid? medicineId, Guid? supplyId, decimal qty)
    {
        if (warehouseId == Guid.Empty || qty <= 0) return (false, null);
        var batches = await _context.InventoryItems
            .Where(i => i.WarehouseId == warehouseId
                && ((medicineId != null && i.MedicineId == medicineId) || (supplyId != null && i.SupplyId == supplyId))
                && (i.Quantity - i.ReservedQuantity) > 0 && i.ExpiryDate >= DateTime.Today && !i.IsLocked && !i.IsDeleted)
            .OrderBy(i => i.ExpiryDate).ToListAsync();
        var remaining = qty; string? firstBatch = null;
        foreach (var b in batches)
        {
            if (remaining <= 0) break;
            var take = Math.Min(b.Quantity - b.ReservedQuantity, remaining);
            if (take <= 0) continue;
            b.Quantity -= take; remaining -= take;
            firstBatch ??= b.BatchNumber;
        }
        return (remaining <= 0, firstBatch);
    }

    /// <summary>F1-refine: hoàn kho best-effort khi xoá dòng đã trừ kho — cộng trả lượng đã trừ về
    /// đúng lô (BatchNumber) nếu còn, không thì lô sớm hết hạn nhất cùng kho/mặt hàng. Đối xứng với
    /// <see cref="DeductStockFefoAsync"/> (cũng best-effort) để xoá thuốc/vật tư PTTT không làm thất thoát tồn.</summary>
    private async Task RestoreStockAsync(Guid? warehouseId, Guid? medicineId, Guid? supplyId, string? batchNumber, decimal qty)
    {
        if (warehouseId == null || warehouseId == Guid.Empty || qty <= 0) return;
        var items = await _context.InventoryItems
            .Where(i => i.WarehouseId == warehouseId
                && ((medicineId != null && i.MedicineId == medicineId) || (supplyId != null && i.SupplyId == supplyId))
                && !i.IsDeleted)
            .ToListAsync();
        if (items.Count == 0) return;
        var target = (!string.IsNullOrEmpty(batchNumber) ? items.FirstOrDefault(i => i.BatchNumber == batchNumber) : null)
            ?? items.OrderBy(i => i.ExpiryDate).First();
        target.Quantity += qty;
    }

    /// <summary>QA-R4: a medicine/supply line needs a real surgery (zero-GUID parent rows were accepted),
    /// a positive quantity (negative Amount reached billing / stock) and an editable (TT46) record.</summary>
    private async Task EnsureSurgeryLineWritableAsync(Guid surgeryId, decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng thuốc/vật tư phải lớn hơn 0.", "quantity");
        if (surgeryId == Guid.Empty || !await _context.SurgeryRequests.AnyAsync(r => r.Id == surgeryId && !r.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật (surgeryId không hợp lệ).");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, surgeryId);
    }

    public async Task<SurgeryMedicineDto> AddMedicineAsync(AddSurgeryMedicineDto dto, Guid userId)
    {
        await EnsureSurgeryLineWritableAsync(dto.SurgeryId, dto.Quantity);
        var med = await _context.Medicines.FirstOrDefaultAsync(m => m.Id == dto.MedicineId)
            ?? throw new KeyNotFoundException("Không tìm thấy thuốc");
        var unitPrice = (dto.PaymentObject == 1 && med.InsurancePrice > 0) ? med.InsurancePrice : med.UnitPrice;
        var (deducted, batch) = await DeductStockFefoAsync(dto.WarehouseId, dto.MedicineId, null, dto.Quantity);
        var entity = new SurgeryMedicineItem
        {
            Id = Guid.NewGuid(), SurgeryId = dto.SurgeryId, MedicineId = dto.MedicineId,
            Quantity = dto.Quantity, UnitPrice = unitPrice, Amount = unitPrice * dto.Quantity,
            PaymentObject = dto.PaymentObject == 0 ? 2 : dto.PaymentObject,
            WarehouseId = dto.WarehouseId == Guid.Empty ? null : dto.WarehouseId,
            BatchNumber = string.IsNullOrEmpty(dto.BatchNumber) ? batch : dto.BatchNumber,
            IsInPackage = dto.IsInPackage, UsageInstruction = dto.UsageInstruction,
            IsStockDeducted = deducted, CreatedBy = userId.ToString(),
        };
        _context.SurgeryMedicineItems.Add(entity);
        await _context.SaveChangesAsync();
        return new SurgeryMedicineDto
        {
            Id = entity.Id, SurgeryId = entity.SurgeryId, MedicineId = entity.MedicineId,
            MedicineCode = med.MedicineCode, MedicineName = med.MedicineName, Unit = med.Unit ?? "",
            Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount,
            IsInPackage = entity.IsInPackage, WarehouseId = entity.WarehouseId ?? Guid.Empty,
            BatchNumber = entity.BatchNumber, PaymentObject = entity.PaymentObject, Notes = entity.UsageInstruction
        };
    }

    public async Task<SurgerySupplyDto> AddSupplyAsync(AddSurgerySupplyDto dto, Guid userId)
    {
        await EnsureSurgeryLineWritableAsync(dto.SurgeryId, dto.Quantity);
        var sup = await _context.MedicalSupplies.FirstOrDefaultAsync(s => s.Id == dto.SupplyId)
            ?? throw new KeyNotFoundException("Không tìm thấy vật tư");
        var unitPrice = (dto.PaymentObject == 1 && sup.InsurancePrice > 0) ? sup.InsurancePrice : sup.UnitPrice;
        var (deducted, batch) = await DeductStockFefoAsync(dto.WarehouseId, null, dto.SupplyId, dto.Quantity);
        var entity = new SurgerySupplyItem
        {
            Id = Guid.NewGuid(), SurgeryId = dto.SurgeryId, SupplyId = dto.SupplyId,
            Quantity = dto.Quantity, UnitPrice = unitPrice, Amount = unitPrice * dto.Quantity,
            PaymentObject = dto.PaymentObject == 0 ? 2 : dto.PaymentObject,
            WarehouseId = dto.WarehouseId == Guid.Empty ? null : dto.WarehouseId,
            BatchNumber = batch,
            IsInPackage = dto.IsInPackage, Notes = dto.Notes,
            IsStockDeducted = deducted, CreatedBy = userId.ToString(),
        };
        _context.SurgerySupplyItems.Add(entity);
        await _context.SaveChangesAsync();
        return new SurgerySupplyDto
        {
            Id = entity.Id, SurgeryId = entity.SurgeryId, SupplyId = entity.SupplyId,
            SupplyCode = sup.SupplyCode, SupplyName = sup.SupplyName, Unit = sup.Unit ?? "",
            Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount,
            IsInPackage = entity.IsInPackage, WarehouseId = entity.WarehouseId ?? Guid.Empty,
            PaymentObject = entity.PaymentObject, Notes = entity.Notes
        };
    }

    public async Task<SurgeryMedicineDto> UpdateMedicineAsync(Guid medicineItemId, AddSurgeryMedicineDto dto, Guid userId)
    {
        var entity = await _context.SurgeryMedicineItems.FirstOrDefaultAsync(m => m.Id == medicineItemId && !m.IsDeleted);
        if (entity == null) throw new KeyNotFoundException("Không tìm thấy dòng thuốc PTTT");
        await EnsureSurgeryLineWritableAsync(entity.SurgeryId, dto.Quantity);
        entity.Quantity = dto.Quantity;
        entity.Amount = entity.UnitPrice * dto.Quantity;
        entity.PaymentObject = dto.PaymentObject == 0 ? entity.PaymentObject : dto.PaymentObject;
        entity.UsageInstruction = dto.UsageInstruction;
        entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return new SurgeryMedicineDto { Id = entity.Id, SurgeryId = entity.SurgeryId, MedicineId = entity.MedicineId, Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount, PaymentObject = entity.PaymentObject };
    }

    public async Task<SurgerySupplyDto> UpdateSupplyAsync(Guid supplyItemId, AddSurgerySupplyDto dto, Guid userId)
    {
        var entity = await _context.SurgerySupplyItems.FirstOrDefaultAsync(s => s.Id == supplyItemId && !s.IsDeleted);
        if (entity == null) throw new KeyNotFoundException("Không tìm thấy dòng vật tư PTTT");
        await EnsureSurgeryLineWritableAsync(entity.SurgeryId, dto.Quantity);
        entity.Quantity = dto.Quantity;
        entity.Amount = entity.UnitPrice * dto.Quantity;
        entity.PaymentObject = dto.PaymentObject == 0 ? entity.PaymentObject : dto.PaymentObject;
        entity.Notes = dto.Notes;
        entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return new SurgerySupplyDto { Id = entity.Id, SurgeryId = entity.SurgeryId, SupplyId = entity.SupplyId, Quantity = entity.Quantity, UnitPrice = entity.UnitPrice, Amount = entity.Amount, PaymentObject = entity.PaymentObject };
    }

    public async Task<bool> RemoveMedicineAsync(Guid medicineItemId, Guid userId)
    {
        var entity = await _context.SurgeryMedicineItems.FirstOrDefaultAsync(m => m.Id == medicineItemId && !m.IsDeleted);
        if (entity == null) throw new KeyNotFoundException("Không tìm thấy dòng thuốc PTTT"); // QA-R4: was 200 + false
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, entity.SurgeryId);
        if (entity.IsStockDeducted)
        {
            await RestoreStockAsync(entity.WarehouseId, entity.MedicineId, null, entity.BatchNumber, entity.Quantity);
            entity.IsStockDeducted = false;
        }
        entity.IsDeleted = true; entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveSupplyAsync(Guid supplyItemId, Guid userId)
    {
        var entity = await _context.SurgerySupplyItems.FirstOrDefaultAsync(s => s.Id == supplyItemId && !s.IsDeleted);
        if (entity == null) throw new KeyNotFoundException("Không tìm thấy dòng vật tư PTTT"); // QA-R4: was 200 + false
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, entity.SurgeryId);
        if (entity.IsStockDeducted)
        {
            await RestoreStockAsync(entity.WarehouseId, null, entity.SupplyId, entity.BatchNumber, entity.Quantity);
            entity.IsStockDeducted = false;
        }
        entity.IsDeleted = true; entity.UpdatedAt = DateTime.UtcNow; entity.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    // QA-R11: the endpoints below returned invented catalogue rows with random ids ("Paracetamol 500mg" stock 1000,
    // every medicine "Không có chống chỉ định", stock always 100) or pretended to save. They now read / write the
    // real Medicines, InventoryItems, DrugInteractions, PrescriptionTemplates and BloodRequests tables.

    public Task<SurgeryPrescriptionDto> ApplyPackageAsync(Guid surgeryId, Guid packageId, Guid userId)
        => throw new InvalidOperationException(
            "Gói PTTT chưa có danh mục trên máy chủ (không có bảng gói / định mức) nên chưa áp dụng được. Vui lòng kê từng thuốc/vật tư.");

    public async Task<List<SurgeryMedicineDto>> AddFromEmergencyCabinetAsync(Guid surgeryId, Guid cabinetId, List<AddSurgeryMedicineDto> medicines, Guid userId)
    {
        var cabinet = await _context.Warehouses.AsNoTracking().FirstOrDefaultAsync(w => w.Id == cabinetId && !w.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy tủ trực.");
        if (!cabinet.IsCabinet && cabinet.WarehouseType != 5)
            throw new InvalidOperationException($"{cabinet.WarehouseName} không phải tủ trực.");
        if (medicines == null || medicines.Count == 0)
            throw new ArgumentException("Chưa chọn thuốc nào từ tủ trực.", nameof(medicines));
        var added = new List<SurgeryMedicineDto>();
        foreach (var m in medicines)
        {
            // Stock check first: taking from the cabinet must not go below zero (AddMedicineAsync deducts best-effort).
            var available = await AvailableStockAsync(m.MedicineId, cabinetId);
            if (available < m.Quantity)
                throw new InvalidOperationException($"Tủ trực không đủ tồn (còn {available:#,##0.##}).");
            m.SurgeryId = surgeryId;
            m.WarehouseId = cabinetId;
            added.Add(await AddMedicineAsync(m, userId));
        }
        return added;
    }

    private async Task<decimal> AvailableStockAsync(Guid medicineId, Guid warehouseId) =>
        await _context.InventoryItems.AsNoTracking()
            .Where(i => i.WarehouseId == warehouseId && i.MedicineId == medicineId && !i.IsDeleted && !i.IsLocked
                        && (i.ExpiryDate == null || i.ExpiryDate >= DateTime.Today))
            .SumAsync(i => (decimal?)(i.Quantity - i.ReservedQuantity)) ?? 0m;

    public async Task<List<MedicineDetailDto>> SearchMedicinesAsync(string keyword, Guid warehouseId)
    {
        var kw = (keyword ?? string.Empty).Trim();
        var q = _context.Medicines.AsNoTracking().Where(m => m.IsActive && !m.IsDeleted);
        if (kw.Length > 0)
            q = q.Where(m => m.MedicineName.Contains(kw) || m.MedicineCode.Contains(kw)
                             || (m.ActiveIngredient != null && m.ActiveIngredient.Contains(kw)));
        var meds = await q.OrderBy(m => m.MedicineName).Take(50).ToListAsync();
        var ids = meds.Select(m => m.Id).ToList();
        var stock = warehouseId == Guid.Empty ? new Dictionary<Guid, decimal>()
            : (await _context.InventoryItems.AsNoTracking()
                .Where(i => i.WarehouseId == warehouseId && i.MedicineId != null && ids.Contains(i.MedicineId.Value)
                            && !i.IsDeleted && !i.IsLocked && (i.ExpiryDate == null || i.ExpiryDate >= DateTime.Today))
                .GroupBy(i => i.MedicineId!.Value)
                .Select(g => new { g.Key, Qty = g.Sum(i => i.Quantity - i.ReservedQuantity) })
                .ToListAsync()).ToDictionary(x => x.Key, x => x.Qty);
        return meds.Select(m => ToMedicineDetail(m, stock.GetValueOrDefault(m.Id))).ToList();
    }

    private static MedicineDetailDto ToMedicineDetail(Medicine m, decimal stock) => new()
    {
        Id = m.Id,
        Code = m.MedicineCode,
        Name = m.MedicineName,
        ActiveIngredient = m.ActiveIngredient,
        Dosage = m.Concentration,
        Unit = m.Unit ?? string.Empty,
        Manufacturer = m.Manufacturer,
        Country = m.ManufacturerCountry ?? m.Country,
        StockQuantity = stock,
        UnitPrice = m.UnitPrice,
        Contraindications = m.Contraindications,
        Interactions = m.DrugInteractions,
    };

    public async Task<List<MedicineWarningDto>> CheckMedicineWarningsAsync(Guid surgeryId, Guid medicineId)
    {
        var med = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == medicineId)
            ?? throw new KeyNotFoundException("Không tìm thấy thuốc.");
        var current = await (from i in _context.SurgeryMedicineItems.AsNoTracking()
                             where i.SurgeryId == surgeryId && !i.IsDeleted
                             join m in _context.Medicines on i.MedicineId equals m.Id
                             select new { m.Id, m.MedicineName, m.ActiveIngredient, m.IsAntibiotic }).ToListAsync();
        var warnings = new List<MedicineWarningDto>();
        if (current.Any(c => c.Id == medicineId))
            warnings.Add(new MedicineWarningDto { WarningType = 1, WarningTypeName = "Trùng thuốc", Severity = 2, SeverityColor = "yellow",
                Message = $"{med.MedicineName} đã được kê trong ca mổ này." });
        else if (!string.IsNullOrWhiteSpace(med.ActiveIngredient)
                 && current.FirstOrDefault(c => c.ActiveIngredient == med.ActiveIngredient) is { } same)
            warnings.Add(new MedicineWarningDto { WarningType = 1, WarningTypeName = "Trùng hoạt chất", Severity = 2, SeverityColor = "yellow",
                Message = $"Trùng hoạt chất {med.ActiveIngredient} với {same.MedicineName}.", RelatedMedicineId = same.Id, RelatedMedicineName = same.MedicineName });
        if (med.IsAntibiotic && current.FirstOrDefault(c => c.IsAntibiotic && c.Id != medicineId) is { } abx)
            warnings.Add(new MedicineWarningDto { WarningType = 3, WarningTypeName = "Trùng kháng sinh", Severity = 2, SeverityColor = "orange",
                Message = $"Ca mổ đã có kháng sinh {abx.MedicineName}.", RelatedMedicineId = abx.Id, RelatedMedicineName = abx.MedicineName });
        var otherIds = current.Select(c => c.Id).Where(id => id != medicineId).Distinct().ToList();
        if (otherIds.Count > 0)
        {
            var interactions = await _context.DrugInteractions.AsNoTracking()
                .Where(x => x.IsActive && !x.IsDeleted
                            && ((x.Medicine1Id == medicineId && otherIds.Contains(x.Medicine2Id))
                                || (x.Medicine2Id == medicineId && otherIds.Contains(x.Medicine1Id))))
                .ToListAsync();
            foreach (var x in interactions)
            {
                var otherId = x.Medicine1Id == medicineId ? x.Medicine2Id : x.Medicine1Id;
                var other = current.First(c => c.Id == otherId);
                warnings.Add(new MedicineWarningDto
                {
                    WarningType = 2, WarningTypeName = "Tương tác thuốc", Severity = x.Severity,
                    SeverityColor = x.Severity >= 4 ? "red" : x.Severity == 3 ? "orange" : x.Severity == 2 ? "yellow" : "green",
                    Message = x.Description ?? $"Tương tác giữa {med.MedicineName} và {other.MedicineName}.",
                    RelatedMedicineId = otherId, RelatedMedicineName = other.MedicineName,
                });
            }
        }
        return warnings;
    }

    public async Task<string?> GetContraindicationsAsync(Guid medicineId)
    {
        var med = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == medicineId)
            ?? throw new KeyNotFoundException("Không tìm thấy thuốc.");
        return med.Contraindications;
    }

    public Task<decimal> GetMedicineStockAsync(Guid medicineId, Guid warehouseId)
        => AvailableStockAsync(medicineId, warehouseId);

    public async Task<MedicineDetailDto?> GetMedicineDetailAsync(Guid medicineId, Guid warehouseId)
    {
        var med = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == medicineId);
        if (med == null) return null;
        var detail = ToMedicineDetail(med, warehouseId == Guid.Empty ? 0m : await AvailableStockAsync(medicineId, warehouseId));
        if (warehouseId != Guid.Empty)
        {
            // First-expiring usable lot (FEFO) = the lot the next issue will take.
            var lot = await _context.InventoryItems.AsNoTracking()
                .Where(i => i.WarehouseId == warehouseId && i.MedicineId == medicineId && !i.IsDeleted && !i.IsLocked
                            && (i.Quantity - i.ReservedQuantity) > 0 && (i.ExpiryDate == null || i.ExpiryDate >= DateTime.Today))
                .OrderBy(i => i.ExpiryDate).FirstOrDefaultAsync();
            detail.BatchNumber = lot?.BatchNumber;
            detail.ExpiryDate = lot?.ExpiryDate;
        }
        return detail;
    }

    #endregion

    #region 6.5.1 Mẫu đơn thuốc

    // Surgery medicine templates share the PrescriptionTemplates catalogue with OPD / inpatient (one list of
    // "đơn mẫu" for the hospital). The template table stores medicines only — supplies are refused, not dropped.
    public async Task<List<SurgeryPrescriptionTemplateDto>> GetPrescriptionTemplatesAsync(Guid userId, Guid? surgeryServiceId)
    {
        var rows = await _context.PrescriptionTemplates.AsNoTracking()
            .Include(t => t.Items).ThenInclude(i => i.Medicine)
            .Where(t => t.IsActive && !t.IsDeleted && (t.IsPublic || t.CreatedByUserId == userId))
            .OrderBy(t => t.SortOrder).ThenBy(t => t.TemplateName)
            .Take(200)
            .ToListAsync();
        var ownerIds = rows.Where(r => r.CreatedByUserId.HasValue).Select(r => r.CreatedByUserId!.Value).Distinct().ToList();
        var owners = await _context.Users.AsNoTracking().Where(u => ownerIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName);
        return rows.Select(t => ToTemplateDto(t, owners)).ToList();
    }

    private static SurgeryPrescriptionTemplateDto ToTemplateDto(PrescriptionTemplate t, IReadOnlyDictionary<Guid, string> owners) => new()
    {
        Id = t.Id,
        Code = t.TemplateCode,
        Name = t.TemplateName,
        Medicines = t.Items.Where(i => !i.IsDeleted).OrderBy(i => i.SortOrder).Select(i => new TemplateMedicineItemDto
        {
            MedicineId = i.MedicineId,
            MedicineCode = i.Medicine?.MedicineCode ?? string.Empty,
            MedicineName = i.Medicine?.MedicineName ?? string.Empty,
            Quantity = i.Quantity,
            UsageInstruction = i.UsageInstructions,
        }).ToList(),
        CreatedBy = t.CreatedByUserId ?? Guid.Empty,
        CreatedByName = t.CreatedByUserId.HasValue ? owners.GetValueOrDefault(t.CreatedByUserId.Value) ?? string.Empty : string.Empty,
        IsShared = t.IsPublic,
    };

    private async Task<PrescriptionTemplate> LoadOwnTemplateAsync(Guid templateId, Guid userId)
    {
        var template = await _context.PrescriptionTemplates.Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.IsActive && !t.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc mẫu.");
        if (template.CreatedByUserId != userId)
            throw new InvalidOperationException("Chỉ người tạo đơn mẫu mới được sửa / xóa / chia sẻ đơn mẫu.");
        return template;
    }

    public async Task<SurgeryPrescriptionTemplateDto> SavePrescriptionTemplateAsync(SurgeryPrescriptionTemplateDto dto, Guid userId)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Chưa nhập tên đơn thuốc mẫu.", nameof(dto.Name));
        if (dto.Supplies?.Count > 0)
            throw new ArgumentException("Đơn mẫu chỉ lưu được thuốc — vật tư PTTT chưa có chỗ lưu trong mẫu.", nameof(dto.Supplies));
        var lines = (dto.Medicines ?? new()).Where(m => m.MedicineId != Guid.Empty).ToList();
        if (lines.Count == 0)
            throw new ArgumentException("Đơn thuốc mẫu chưa có thuốc.", nameof(dto.Medicines));
        if (lines.Any(l => l.Quantity <= 0))
            throw new ArgumentException("Số lượng thuốc trong đơn mẫu phải lớn hơn 0.", nameof(dto.Medicines));
        var ids = lines.Select(l => l.MedicineId).Distinct().ToList();
        if (await _context.Medicines.CountAsync(m => ids.Contains(m.Id) && m.IsActive) != ids.Count)
            throw new ArgumentException("Đơn mẫu có thuốc không tồn tại hoặc đã ngừng sử dụng.", nameof(dto.Medicines));

        var now = DateTime.Now;
        PrescriptionTemplate template;
        if (dto.Id != Guid.Empty)
        {
            template = await LoadOwnTemplateAsync(dto.Id, userId);
            template.TemplateName = dto.Name.Trim();
            template.IsPublic = dto.IsShared;
            template.UpdatedAt = now;
            template.UpdatedBy = userId.ToString();
            _context.PrescriptionTemplateItems.RemoveRange(template.Items);
        }
        else
        {
            template = new PrescriptionTemplate
            {
                Id = Guid.NewGuid(),
                TemplateCode = string.IsNullOrWhiteSpace(dto.Code) ? $"MTPT{HIS.Core.Common.VnTime.NowVn:yyyyMMddHHmmssfff}" : dto.Code.Trim(),
                TemplateName = dto.Name.Trim(),
                PrescriptionType = 2, // nội trú — surgery patients are billed on the stay
                Description = "Đơn mẫu PTTT",
                IsPublic = dto.IsShared,
                CreatedByUserId = userId == Guid.Empty ? null : userId,
                IsActive = true,
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            };
            _context.PrescriptionTemplates.Add(template);
        }
        var order = 0;
        foreach (var l in lines)
            _context.PrescriptionTemplateItems.Add(new PrescriptionTemplateItem
            {
                Id = Guid.NewGuid(), PrescriptionTemplateId = template.Id, MedicineId = l.MedicineId, Quantity = l.Quantity,
                Days = 1, UsageInstructions = l.UsageInstruction, SortOrder = order++, CreatedAt = now, CreatedBy = userId.ToString(),
            });
        await _context.SaveChangesAsync();
        return (await GetPrescriptionTemplatesAsync(userId, null)).First(t => t.Id == template.Id);
    }

    public async Task<bool> DeletePrescriptionTemplateAsync(Guid templateId, Guid userId)
    {
        var template = await LoadOwnTemplateAsync(templateId, userId);
        template.IsActive = false; // soft delete, same as OPD / inpatient templates
        template.UpdatedAt = DateTime.Now;
        template.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<SurgeryPrescriptionTemplateDto> SharePrescriptionTemplateAsync(Guid templateId, Guid userId)
    {
        var template = await LoadOwnTemplateAsync(templateId, userId);
        template.IsPublic = true;
        template.UpdatedAt = DateTime.Now;
        template.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return (await GetPrescriptionTemplatesAsync(userId, null)).First(t => t.Id == templateId);
    }

    public async Task<SurgeryPrescriptionDto> ApplyPrescriptionTemplateAsync(Guid surgeryId, Guid templateId, Guid userId)
    {
        var template = await _context.PrescriptionTemplates.AsNoTracking().Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.IsActive && !t.IsDeleted && (t.IsPublic || t.CreatedByUserId == userId))
            ?? throw new KeyNotFoundException("Không tìm thấy đơn thuốc mẫu.");
        // No warehouse on a template: lines are added without stock deduction (like AddMedicine with no warehouse);
        // the user picks the issuing warehouse per line afterwards.
        foreach (var i in template.Items.Where(i => !i.IsDeleted).OrderBy(i => i.SortOrder))
            await AddMedicineAsync(new AddSurgeryMedicineDto
            {
                SurgeryId = surgeryId, MedicineId = i.MedicineId, Quantity = i.Quantity, UsageInstruction = i.UsageInstructions,
            }, userId);
        return await GetPrescriptionAsync(surgeryId);
    }

    public async Task<SurgeryPrescriptionDto> CopyPrescriptionAsync(Guid surgeryId, Guid sourceSurgeryId, Guid userId)
    {
        if (surgeryId == sourceSurgeryId)
            throw new InvalidOperationException("Ca nguồn trùng ca hiện tại.");
        var target = await _context.SurgeryRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == surgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật.");
        var source = await _context.SurgeryRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == sourceSurgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật nguồn.");
        if (source.PatientId != target.PatientId)
            throw new InvalidOperationException("Ca nguồn thuộc bệnh nhân khác — không sao chép thuốc được.");
        var meds = await _context.SurgeryMedicineItems.AsNoTracking()
            .Where(m => m.SurgeryId == sourceSurgeryId && !m.IsDeleted).ToListAsync();
        var sups = await _context.SurgerySupplyItems.AsNoTracking()
            .Where(s => s.SurgeryId == sourceSurgeryId && !s.IsDeleted).ToListAsync();
        if (meds.Count + sups.Count == 0)
            throw new InvalidOperationException("Ca nguồn chưa có thuốc / vật tư nào để sao chép.");
        foreach (var m in meds)
            await AddMedicineAsync(new AddSurgeryMedicineDto
            {
                SurgeryId = surgeryId, MedicineId = m.MedicineId, Quantity = m.Quantity, WarehouseId = m.WarehouseId ?? Guid.Empty,
                IsInPackage = m.IsInPackage, PaymentObject = m.PaymentObject, UsageInstruction = m.UsageInstruction,
            }, userId);
        foreach (var s in sups)
            await AddSupplyAsync(new AddSurgerySupplyDto
            {
                SurgeryId = surgeryId, SupplyId = s.SupplyId, Quantity = s.Quantity, WarehouseId = s.WarehouseId ?? Guid.Empty,
                IsInPackage = s.IsInPackage, PaymentObject = s.PaymentObject, Notes = s.Notes,
            }, userId);
        return await GetPrescriptionAsync(surgeryId);
    }

    #endregion

    #region 6.6 Kê đơn máu trong PTTT

    // QA-R11: the surgery blood order was a stub (create echoed a random id, get always 404, banks / products were
    // invented rows). A surgery blood order is now a set of BloodRequests (one per blood group line) tagged with
    // BloodRequests.SurgeryRequestId — the same rows the blood-bank screen approves and issues. There is no blood-bank
    // catalogue table (BloodUnits carry only a StorageLocation), so BloodBankId is not required / not stored.
    private static readonly string[] BloodGroups = { "A", "B", "AB", "O" };

    public async Task<SurgeryBloodOrderDto?> GetBloodOrderAsync(Guid surgeryId)
    {
        var rows = await _context.BloodRequests.AsNoTracking()
            .Where(r => r.SurgeryRequestId == surgeryId && !r.IsDeleted && r.Status != 5)
            .OrderBy(r => r.RequestDate)
            .ToListAsync();
        if (rows.Count == 0) return null;
        var doctorId = rows[0].RequestingDoctorId;
        var doctorName = await _context.Users.AsNoTracking().Where(u => u.Id == doctorId).Select(u => u.FullName).FirstOrDefaultAsync();
        var status = rows.Min(r => r.Status);
        return new SurgeryBloodOrderDto
        {
            Id = rows[0].Id,
            SurgeryId = surgeryId,
            DiagnosisMain = rows[0].ClinicalDiagnosis,
            BloodProducts = rows.Select(r => new BloodProductItemDto
            {
                Id = r.Id,
                ProductCode = r.RequestCode,
                ProductName = $"Máu nhóm {r.BloodType}{r.RhFactor}",
                BloodType = r.BloodType,
                RhFactor = r.RhFactor ?? string.Empty,
                Volume = (int)r.Volume,
                Quantity = r.Quantity,
            }).ToList(),
            Status = status,
            StatusName = status switch { 0 => "Chờ duyệt", 1 => "Đã duyệt", 2 => "Đang chuẩn bị", 3 => "Đã cấp phát", 4 => "Từ chối", _ => "" },
            OrderedAt = rows[0].RequestDate,
            OrderedBy = doctorId,
            OrderedByName = doctorName ?? string.Empty,
        };
    }

    private static void ValidateBloodLines(CreateBloodOrderDto dto)
    {
        if (dto.BloodProducts == null || dto.BloodProducts.Count == 0)
            throw new ArgumentException("Chưa chọn chế phẩm máu nào.", nameof(dto.BloodProducts));
        foreach (var p in dto.BloodProducts)
        {
            if (!BloodGroups.Contains((p.BloodType ?? string.Empty).Trim().ToUpperInvariant()))
                throw new ArgumentException("Nhóm máu phải là A, B, AB hoặc O.", nameof(dto.BloodProducts));
            if ((p.RhFactor ?? string.Empty).Trim() is not ("+" or "-"))
                throw new ArgumentException("Rh phải là + hoặc -.", nameof(dto.BloodProducts));
            if (p.Quantity <= 0)
                throw new ArgumentException("Số lượng đơn vị máu phải lớn hơn 0.", nameof(dto.BloodProducts));
        }
    }

    private async Task<decimal> UnitVolumeAsync(Guid bloodProductId) =>
        bloodProductId == Guid.Empty ? 0m
            : await _context.BloodUnits.AsNoTracking().Where(u => u.Id == bloodProductId).Select(u => (decimal?)u.Volume).FirstOrDefaultAsync() ?? 0m;

    public async Task<SurgeryBloodOrderDto> CreateBloodOrderAsync(CreateBloodOrderDto dto, Guid userId)
    {
        var surgery = await _context.SurgeryRequests.FirstOrDefaultAsync(r => r.Id == dto.SurgeryId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật.");
        if (surgery.Status is 3 or 4)
            throw new InvalidOperationException("Ca phẫu thuật đã hoàn thành hoặc đã hủy — không kê máu được.");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, surgery.Id); // TT46
        ValidateBloodLines(dto);
        // QA-R12 racescan: two concurrent submits both inserted a full set of BloodRequests. Serialize per surgery and
        // answer a same-lines resubmit from the same doctor within a few seconds with the order just created.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.Surgery.Blood.{surgery.Id:N}",
            "Ca mổ đang có một yêu cầu máu khác đang được lưu, vui lòng thử lại.");
        var justNow = DateTime.Now.AddSeconds(-10);
        var recent = await _context.BloodRequests.AsNoTracking()
            .Where(r => r.SurgeryRequestId == surgery.Id && !r.IsDeleted && r.Status == 0
                        && r.RequestingDoctorId == userId && r.RequestDate >= justNow)
            .Select(r => new { r.BloodType, r.RhFactor, r.Quantity })
            .ToListAsync();
        if (recent.Count > 0 && recent.Count == dto.BloodProducts.Count
            && recent.Select(r => $"{r.BloodType}|{r.RhFactor}|{r.Quantity}").OrderBy(x => x)
                .SequenceEqual(dto.BloodProducts.Select(p => $"{p.BloodType.Trim().ToUpperInvariant()}|{p.RhFactor.Trim()}|{p.Quantity}").OrderBy(x => x)))
        {
            if (tx != null) await tx.CommitAsync();
            return (await GetBloodOrderAsync(surgery.Id))!;
        }
        Guid? deptId = null;
        if (surgery.MedicalRecordId is Guid recordId)
            deptId = await _context.Admissions.AsNoTracking()
                         .Where(a => a.MedicalRecordId == recordId && !a.IsDeleted && (a.Status == 0 || a.Status == 6))
                         .Select(a => (Guid?)a.DepartmentId).FirstOrDefaultAsync()
                     ?? await _context.MedicalRecords.AsNoTracking().Where(m => m.Id == recordId).Select(m => m.DepartmentId).FirstOrDefaultAsync();
        var now = DateTime.Now;
        var n = 0;
        foreach (var p in dto.BloodProducts)
        {
            var volume = await UnitVolumeAsync(p.BloodProductId);
            _context.BloodRequests.Add(new BloodRequest
            {
                Id = Guid.NewGuid(),
                RequestCode = $"YCM{now:yyyyMMddHHmmssfff}{++n:D2}",
                PatientId = surgery.PatientId,
                MedicalRecordId = surgery.MedicalRecordId,
                RequestDate = now,
                BloodType = p.BloodType.Trim().ToUpperInvariant(),
                RhFactor = p.RhFactor.Trim(),
                Quantity = p.Quantity,
                Volume = volume * p.Quantity,
                Priority = surgery.Priority >= 3 ? 2 : 1, // cấp cứu / ưu tiên (máu cho ca mổ)
                Purpose = $"Phẫu thuật {surgery.RequestCode}{(string.IsNullOrWhiteSpace(surgery.PlannedProcedure) ? "" : " — " + surgery.PlannedProcedure)}",
                ClinicalDiagnosis = dto.DiagnosisMain ?? surgery.PreOpDiagnosis,
                RequestingDoctorId = userId,
                DepartmentId = deptId,
                Status = 0,
                SurgeryRequestId = surgery.Id,
                CreatedAt = now,
                CreatedBy = userId.ToString(),
            });
        }
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();
        return (await GetBloodOrderAsync(surgery.Id))!;
    }

    private async Task<BloodRequest> LoadPendingSurgeryBloodRequestAsync(Guid orderId)
    {
        var request = await _context.BloodRequests.FirstOrDefaultAsync(r => r.Id == orderId && !r.IsDeleted && r.SurgeryRequestId != null)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu máu của ca mổ.");
        if (request.Status != 0)
            throw new InvalidOperationException("Yêu cầu máu đã được kho máu xử lý — không sửa / hủy được nữa.");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, request.SurgeryRequestId!.Value); // TT46
        return request;
    }

    public async Task<SurgeryBloodOrderDto> UpdateBloodOrderAsync(Guid orderId, CreateBloodOrderDto dto, Guid userId)
    {
        ValidateBloodLines(dto);
        if (dto.BloodProducts.Count != 1)
            throw new ArgumentException("Mỗi yêu cầu máu là một nhóm máu — sửa từng dòng một.", nameof(dto.BloodProducts));
        var request = await LoadPendingSurgeryBloodRequestAsync(orderId);
        var p = dto.BloodProducts[0];
        request.BloodType = p.BloodType.Trim().ToUpperInvariant();
        request.RhFactor = p.RhFactor.Trim();
        request.Quantity = p.Quantity;
        request.Volume = await UnitVolumeAsync(p.BloodProductId) * p.Quantity;
        if (!string.IsNullOrWhiteSpace(dto.DiagnosisMain)) request.ClinicalDiagnosis = dto.DiagnosisMain;
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return (await GetBloodOrderAsync(request.SurgeryRequestId!.Value))!;
    }

    public async Task<bool> DeleteBloodOrderAsync(Guid orderId, Guid userId)
    {
        var request = await LoadPendingSurgeryBloodRequestAsync(orderId);
        request.Status = 5; // Hủy
        request.UpdatedAt = DateTime.Now;
        request.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    public Task<List<BloodBankDto>> GetBloodBanksAsync()
        => Task.FromResult(new List<BloodBankDto>()); // no blood-bank catalogue table (was 2 invented banks with random ids)

    public async Task<List<BloodProductItemDto>> SearchBloodProductsAsync(Guid bloodBankId, string? bloodType, string? rhFactor)
    {
        // Eligible (Status 1 "đủ điều kiện"), unexpired units; bloodBankId is ignored (no bank catalogue).
        var q = _context.BloodUnits.AsNoTracking().Where(u => !u.IsDeleted && u.Status == 1 && u.ExpiryDate >= DateTime.Today);
        if (!string.IsNullOrWhiteSpace(bloodType)) q = q.Where(u => u.BloodType == bloodType.Trim());
        if (!string.IsNullOrWhiteSpace(rhFactor)) q = q.Where(u => u.RhFactor == rhFactor.Trim());
        return await q.OrderBy(u => u.ExpiryDate).Take(100)
            .Select(u => new BloodProductItemDto
            {
                Id = u.Id,
                BloodProductId = u.Id,
                ProductCode = u.UnitCode,
                ProductName = "Đơn vị máu " + u.BloodType + u.RhFactor,
                BloodType = u.BloodType,
                RhFactor = u.RhFactor,
                Volume = (int)u.Volume,
                Quantity = 1,
                BagNumber = u.UnitCode,
                ExpiryDate = u.ExpiryDate,
                StockQuantity = 1,
            })
            .ToListAsync();
    }

    public async Task<decimal> GetBloodProductStockAsync(Guid bloodProductId, Guid bloodBankId)
        => await _context.BloodUnits.AsNoTracking()
            .AnyAsync(u => u.Id == bloodProductId && !u.IsDeleted && u.Status == 1 && u.ExpiryDate >= DateTime.Today) ? 1m : 0m;

    #endregion
    #region 6.6 Quản lý cam kết phẫu thuật

    public async Task<List<SurgeryConsentDto>> GetSurgeryConsentsAsync(Guid surgeryId)
    {
        var surgery = await _context.Set<SurgeryRequest>()
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.Id == surgeryId);

        if (surgery == null) return new List<SurgeryConsentDto>();

        try
        {
            var consents = await _context.Database.SqlQueryRaw<SurgeryConsentRaw>(
                @"SELECT Id, SurgeryId, ConsentType, Diagnosis, PlannedProcedure, Risks, Alternatives,
                         DoctorExplanation, SignerName, SignerRelationship, SignedAt, IsSigned, DoctorId, CreatedAt
                  FROM SurgeryConsents WHERE SurgeryId = {0} AND IsDeleted = 0
                  ORDER BY ConsentType", surgeryId).ToListAsync();

            var doctorIds = consents.Where(c => c.DoctorId != null).Select(c => c.DoctorId!.Value).Distinct().ToList();
            var doctors = doctorIds.Count > 0
                ? await _context.Users.Where(u => doctorIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FullName)
                : new Dictionary<Guid, string>();

            return consents.Select(c => new SurgeryConsentDto
            {
                Id = c.Id,
                SurgeryId = c.SurgeryId,
                ConsentType = c.ConsentType,
                ConsentTypeName = GetConsentTypeName(c.ConsentType),
                PatientName = surgery.Patient?.FullName ?? "",
                PatientId = surgery.Patient?.PatientCode,
                Diagnosis = c.Diagnosis,
                PlannedProcedure = c.PlannedProcedure,
                Risks = c.Risks,
                Alternatives = c.Alternatives,
                DoctorExplanation = c.DoctorExplanation,
                SignerName = c.SignerName,
                SignerRelationship = c.SignerRelationship,
                SignedAt = c.SignedAt,
                IsSigned = c.IsSigned,
                DoctorName = c.DoctorId != null && doctors.ContainsKey(c.DoctorId.Value) ? doctors[c.DoctorId.Value] : null,
                CreatedAt = c.CreatedAt
            }).ToList();
        }
        catch
        {
            // Table may not exist yet
            return new List<SurgeryConsentDto>();
        }
    }

    public async Task<SurgeryConsentDto> SaveSurgeryConsentAsync(SaveSurgeryConsentDto dto, Guid userId)
    {
        var surgery = await _context.Set<SurgeryRequest>().FindAsync(dto.SurgeryId)
            ?? throw new KeyNotFoundException("Không tìm thấy ca phẫu thuật");
        await EmrLockGuard.EnsureEditableBySurgeryRequestAsync(_context, dto.SurgeryId); // QA-R4: TT46

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            // QA0915 (P1): the content (planned procedure, risks...) could be rewritten AFTER the
            // patient/family signed, so the signature no longer matched what was explained.
            // Only unsigned consents are editable; a signed one needs a new consent form.
            var updated = await _context.Database.ExecuteSqlRawAsync(
                @"UPDATE SurgeryConsents SET Diagnosis = {0}, PlannedProcedure = {1}, Risks = {2},
                  Alternatives = {3}, DoctorExplanation = {4}, UpdatedAt = GETDATE(), UpdatedBy = {5}
                  WHERE Id = {6} AND SurgeryId = {7} AND IsDeleted = 0 AND IsSigned = 0",
                dto.Diagnosis ?? "", dto.PlannedProcedure ?? "", dto.Risks ?? "",
                dto.Alternatives ?? "", dto.DoctorExplanation ?? "", userId.ToString(), dto.Id.Value, dto.SurgeryId);
            if (updated == 0)
                throw new InvalidOperationException(
                    "Không sửa được cam kết: không tìm thấy phiếu của ca mổ này, hoặc phiếu đã được ký. Hãy lập phiếu cam kết mới.");
        }
        else
        {
            var newId = Guid.NewGuid();
            await _context.Database.ExecuteSqlRawAsync(
                @"INSERT INTO SurgeryConsents (Id, SurgeryId, ConsentType, Diagnosis, PlannedProcedure,
                  Risks, Alternatives, DoctorExplanation, DoctorId, IsSigned, IsDeleted, CreatedAt, CreatedBy)
                  VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, 0, 0, GETDATE(), {9})",
                newId, dto.SurgeryId, dto.ConsentType, dto.Diagnosis ?? "", dto.PlannedProcedure ?? "",
                dto.Risks ?? "", dto.Alternatives ?? "", dto.DoctorExplanation ?? "", userId, userId.ToString());
            dto.Id = newId;
        }

        var consents = await GetSurgeryConsentsAsync(dto.SurgeryId);
        return consents.FirstOrDefault(c => c.Id == dto.Id) ?? new SurgeryConsentDto { Id = dto.Id ?? Guid.NewGuid(), SurgeryId = dto.SurgeryId };
    }

    public async Task<SurgeryConsentDto> SignConsentAsync(Guid consentId, string signerName, string relationship, Guid userId)
    {
        // QA-R4: a consent was marked signed with an empty signer name — a "signature" by nobody.
        if (string.IsNullOrWhiteSpace(signerName))
            throw new ArgumentException("Phải ghi họ tên người ký cam kết.", nameof(signerName));
        // QA0915: unknown id returned 200 "IsSigned = true"; re-signing overwrote the original signer/time.
        var signed = await _context.Database.ExecuteSqlRawAsync(
            @"UPDATE SurgeryConsents SET SignerName = {0}, SignerRelationship = {1},
              SignedAt = GETDATE(), IsSigned = 1, UpdatedAt = GETDATE(), UpdatedBy = {2}
              WHERE Id = {3} AND IsDeleted = 0 AND IsSigned = 0",
            signerName, relationship, userId.ToString(), consentId);
        if (signed == 0)
            throw new InvalidOperationException("Không ký được: không tìm thấy phiếu cam kết hoặc phiếu đã được ký trước đó.");

        return new SurgeryConsentDto
        {
            Id = consentId, IsSigned = true, SignerName = signerName,
            SignerRelationship = relationship, SignedAt = DateTime.Now
        };
    }

    public async Task<ConsentValidationResult> ValidateConsentsBeforeSurgeryAsync(Guid surgeryId)
    {
        var consents = await GetSurgeryConsentsAsync(surgeryId);
        var result = new ConsentValidationResult { IsValid = true };

        // Cam kết PT bắt buộc
        var ptConsent = consents.FirstOrDefault(c => c.ConsentType == 1);
        if (ptConsent == null)
        {
            result.IsValid = false;
            result.MissingConsents.Add(GetConsentTypeName(1));
        }
        else if (!ptConsent.IsSigned)
        {
            result.IsValid = false;
            result.UnsignedConsents.Add(GetConsentTypeName(1));
        }

        // Nếu có gây mê → bắt buộc cam kết gây mê
        var surgery = await _context.Set<SurgeryRequest>().FindAsync(surgeryId);
        if (surgery != null && surgery.AnesthesiaType > 0)
        {
            var anes = consents.FirstOrDefault(c => c.ConsentType == 2);
            if (anes == null)
            {
                result.IsValid = false;
                result.MissingConsents.Add(GetConsentTypeName(2));
            }
            else if (!anes.IsSigned)
            {
                result.IsValid = false;
                result.UnsignedConsents.Add(GetConsentTypeName(2));
            }
        }

        if (!result.IsValid)
        {
            var msgs = new List<string>();
            if (result.MissingConsents.Count > 0) msgs.Add($"Thiếu: {string.Join(", ", result.MissingConsents)}");
            if (result.UnsignedConsents.Count > 0) msgs.Add($"Chưa ký: {string.Join(", ", result.UnsignedConsents)}");
            result.Message = string.Join(". ", msgs);
        }
        else
        {
            result.Message = "Đã đủ cam kết phẫu thuật";
        }

        return result;
    }

    public async Task<byte[]> PrintConsentFormAsync(Guid consentId)
    {
        try
        {
            var consentRaw = await _context.Database.SqlQueryRaw<SurgeryConsentRaw>(
                @"SELECT Id, SurgeryId, ConsentType, Diagnosis, PlannedProcedure, Risks, Alternatives,
                         DoctorExplanation, SignerName, SignerRelationship, SignedAt, IsSigned, DoctorId, CreatedAt
                  FROM SurgeryConsents WHERE Id = {0} AND IsDeleted = 0", consentId).FirstOrDefaultAsync();
            if (consentRaw == null) return Array.Empty<byte>();

            var surgery = await _context.Set<SurgeryRequest>()
                .Include(s => s.Patient)
                .FirstOrDefaultAsync(s => s.Id == consentRaw.SurgeryId);
            var pat = surgery?.Patient;

            var doctorName = "";
            if (consentRaw.DoctorId.HasValue)
            {
                var doc = await _context.Users.FindAsync(consentRaw.DoctorId.Value);
                doctorName = doc?.FullName ?? "";
            }

            var consentTypeName = GetConsentTypeName(consentRaw.ConsentType);

            var body = new StringBuilder();
            body.AppendLine(GetHospitalHeader());
            body.AppendLine($@"<div class=""form-title"">GIAY {consentTypeName.ToUpper()}</div>");
            body.AppendLine($@"<div class=""form-number"">MS. CK-{consentRaw.ConsentType:D2}</div>");

            if (pat != null)
                body.AppendLine(GetPatientInfoBlock(pat.PatientCode, pat.FullName, pat.Gender, pat.DateOfBirth, pat.Address, pat.PhoneNumber, null));

            body.AppendLine($@"
<div class=""section-title"">I. CHAN DOAN VA PHUONG PHAP</div>
<div class=""field""><span class=""field-label"">Chan doan:</span><span class=""field-value"">{Esc(consentRaw.Diagnosis)}</span></div>
<div class=""field""><span class=""field-label"">Phuong phap du kien:</span><span class=""field-value"">{Esc(consentRaw.PlannedProcedure)}</span></div>

<div class=""section-title"">II. NGUY CO VA TAC DUNG PHU</div>
<div class=""field""><span class=""field-value"">{Esc(consentRaw.Risks ?? "Khong co ghi nhan")}</span></div>

<div class=""section-title"">III. PHUONG PHAP THAY THE</div>
<div class=""field""><span class=""field-value"">{Esc(consentRaw.Alternatives ?? "Khong co")}</span></div>");

            if (!string.IsNullOrEmpty(consentRaw.DoctorExplanation))
            {
                body.AppendLine($@"
<div class=""section-title"">IV. GIAI THICH CUA BAC SI</div>
<div class=""field""><span class=""field-value"">{Esc(consentRaw.DoctorExplanation)}</span></div>");
            }

            body.AppendLine($@"
<div class=""section-title"">CAM KET</div>
<p>Toi da duoc bac si {Esc(doctorName)} giai thich day du ve tinh trang benh, phuong phap dieu tri, cac nguy co co the xay ra. Toi dong y va cam ket thuc hien {Esc(consentTypeName?.ToLower())} theo phuong phap da neu tren.</p>");

            if (consentRaw.IsSigned)
            {
                body.AppendLine($@"
<div class=""field""><span class=""field-label"">Nguoi ky:</span><span class=""field-value"">{Esc(consentRaw.SignerName)}</span></div>
<div class=""field""><span class=""field-label"">Quan he:</span><span class=""field-value"">{Esc(consentRaw.SignerRelationship)}</span></div>
<div class=""field""><span class=""field-label"">Ngay ky:</span><span class=""field-value"">{consentRaw.SignedAt?.ToString("dd/MM/yyyy HH:mm") ?? ""}</span></div>");
            }

            body.AppendLine(GetSignatureBlock(doctorName, null, null, false));

            var html = WrapHtmlPage($"{consentTypeName} - MS.CK-{consentRaw.ConsentType:D2}", body.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    private static string GetConsentTypeName(int type) => type switch
    {
        1 => "Cam kết phẫu thuật",
        2 => "Cam kết gây mê",
        3 => "Cam kết truyền máu",
        4 => "Cam kết thủ thuật",
        _ => "Cam kết khác"
    };

    #endregion
}
