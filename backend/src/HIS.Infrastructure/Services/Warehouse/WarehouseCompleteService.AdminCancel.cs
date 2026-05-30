using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K10 phien 4 (2026-05-30): tach 3 region cuoi (5.4 Quản lý + 5.7 Hủy đơn + NangCap18 Drug Equivalence, ~597 dong) khoi WarehouseCompleteService.
public partial class WarehouseCompleteService {
    #region 5.4 Quản lý

    public async Task<List<WarehouseDto>> GetWarehousesAsync(int? warehouseType)
    {
        var query = _context.Warehouses.Where(w => w.IsActive);

        if (warehouseType.HasValue)
        {
            query = query.Where(w => w.WarehouseType == warehouseType.Value);
        }

        var warehouses = await query.ToListAsync();

        return warehouses.Select(w => new WarehouseDto
        {
            Id = w.Id,
            WarehouseCode = w.WarehouseCode,
            WarehouseName = w.WarehouseName,
            WarehouseType = w.WarehouseType,
            ParentWarehouseId = w.ParentWarehouseId,
            DepartmentId = w.DepartmentId,
            IsActive = w.IsActive
        }).ToList();
    }

    public async Task<WarehouseDto?> GetWarehouseByIdAsync(Guid id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null) return null;

        return new WarehouseDto
        {
            Id = warehouse.Id,
            WarehouseCode = warehouse.WarehouseCode,
            WarehouseName = warehouse.WarehouseName,
            WarehouseType = warehouse.WarehouseType,
            ParentWarehouseId = warehouse.ParentWarehouseId,
            DepartmentId = warehouse.DepartmentId,
            IsActive = warehouse.IsActive
        };
    }

    public async Task<List<ReusableSupplyDto>> GetReusableSuppliesAsync(Guid? warehouseId, int? status)
    {
        // Demo: synthesize a deterministic reusable-supply list from existing
        // MedicalSupplies catalog since there is no dedicated tracking table.
        // Each catalog row becomes one reusable "item" whose status / reuse
        // count is derived from the Id so UI renders stable data per refresh.
        var supplies = await _context.MedicalSupplies
            .Where(s => s.IsActive)
            .OrderBy(s => s.SupplyCode)
            .Take(30)
            .Select(s => new { s.Id, s.SupplyCode, s.SupplyName })
            .ToListAsync();
        var today = DateTime.UtcNow.AddHours(7).Date;
        var list = supplies.Select((s, idx) =>
        {
            int max = 10;
            int current = (s.Id.GetHashCode() & 0x7fffffff) % max;
            int stat = idx % 10 switch
            {
                0 or 1 or 2 or 3 or 4 or 5 => 1, // Sẵn sàng
                6 or 7 => 2,                     // Đang sử dụng
                8 => 3,                          // Chờ tiệt khuẩn
                _ => current >= max - 1 ? 4 : 1  // Hết hạn hoặc sẵn sàng
            };
            var lastSter = today.AddDays(-((s.Id.GetHashCode() & 0xff) % 25 + 1));
            return new ReusableSupplyDto
            {
                Id = s.Id,
                ItemId = s.Id,
                ItemCode = s.SupplyCode,
                ItemName = s.SupplyName,
                MaxReuseCount = max,
                CurrentReuseCount = current,
                LastSterilizationDate = lastSter,
                NextSterilizationDue = lastSter.AddDays(30),
                Status = stat
            };
        }).ToList();
        if (status.HasValue) list = list.Where(x => x.Status == status.Value).ToList();
        return list;
    }

    public async Task<ReusableSupplyDto> UpdateReusableSupplyStatusAsync(Guid id, int status, Guid userId)
    {
        await Task.CompletedTask;
        return new ReusableSupplyDto
        {
            Id = id,
            Status = status,
            CurrentReuseCount = 0,
            MaxReuseCount = 10
        };
    }

    public async Task<ReusableSupplyDto> RecordSterilizationAsync(Guid id, DateTime sterilizationDate, Guid userId)
    {
        await Task.CompletedTask;
        return new ReusableSupplyDto
        {
            Id = id,
            Status = 1, // Sẵn sàng
            LastSterilizationDate = sterilizationDate,
            NextSterilizationDue = sterilizationDate.AddDays(30),
            CurrentReuseCount = 0,
            MaxReuseCount = 10
        };
    }

    public async Task<List<ConsignmentStockDto>> GetConsignmentStockAsync(Guid? warehouseId, Guid? supplierId)
    {
        var query = _context.ConsignmentStocks
            .Where(c => !c.IsDeleted);
        if (warehouseId.HasValue) query = query.Where(c => c.WarehouseId == warehouseId.Value);
        if (supplierId.HasValue) query = query.Where(c => c.SupplierId == supplierId.Value);

        var rows = await query
            .Select(c => new {
                c.Id, c.SupplierId, c.WarehouseId, c.MedicineId, c.SupplyId,
                c.BatchNumber, c.ExpiryDate, c.Quantity, c.UsedQuantity,
                c.ConsignmentDate, c.ExpirationDate,
                SupplierName = c.Supplier != null ? c.Supplier.SupplierName : null,
                WarehouseName = c.Warehouse != null ? c.Warehouse.WarehouseName : null,
                MedicineCode = c.Medicine != null ? c.Medicine.MedicineCode : null,
                MedicineName = c.Medicine != null ? c.Medicine.MedicineName : null,
                MedicineUnit = c.Medicine != null ? c.Medicine.Unit : null,
            })
            .OrderByDescending(c => c.ConsignmentDate)
            .Take(200)
            .ToListAsync();

        return rows.Select(r => new ConsignmentStockDto
        {
            Id = r.Id,
            SupplierId = r.SupplierId,
            SupplierName = r.SupplierName ?? "",
            WarehouseId = r.WarehouseId,
            WarehouseName = r.WarehouseName ?? "",
            ItemId = r.MedicineId ?? r.SupplyId ?? Guid.Empty,
            ItemCode = r.MedicineCode ?? "",
            ItemName = r.MedicineName ?? "",
            Unit = r.MedicineUnit ?? "",
            BatchNumber = r.BatchNumber,
            ExpiryDate = r.ExpiryDate,
            Quantity = r.Quantity,
            UsedQuantity = r.UsedQuantity,
            ConsignmentDate = r.ConsignmentDate,
            ExpirationDate = r.ExpirationDate,
        }).ToList();
    }

    public async Task<ConsignmentStockDto> RecordConsignmentUsageAsync(Guid consignmentId, decimal quantity, Guid userId)
    {
        await Task.CompletedTask;
        return new ConsignmentStockDto
        {
            Id = consignmentId,
            Quantity = 100,
            UsedQuantity = quantity,
            ConsignmentDate = DateTime.Now.AddMonths(-1)
        };
    }

    public async Task<List<IUMedicineDto>> GetIUMedicinesAsync(Guid? warehouseId)
    {
        var configs = await _context.IUMedicineConfigs
            .Where(c => !c.IsDeleted && c.IsActive)
            .Select(c => new {
                c.MedicineId, c.BaseUnit, c.IUPerBaseUnit,
                MedicineCode = c.Medicine != null ? c.Medicine.MedicineCode : null,
                MedicineName = c.Medicine != null ? c.Medicine.MedicineName : null,
            })
            .ToListAsync();
        if (configs.Count == 0) return new List<IUMedicineDto>();

        var medIds = configs.Select(c => c.MedicineId).ToHashSet();
        var stocks = await _context.InventoryItems
            .Where(i => i.MedicineId.HasValue && medIds.Contains(i.MedicineId.Value)
                        && (warehouseId == null || warehouseId == Guid.Empty || i.WarehouseId == warehouseId.Value)
                        && !i.IsDeleted)
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToListAsync();

        return configs.Select(c => new IUMedicineDto
        {
            ItemId = c.MedicineId,
            ItemCode = c.MedicineCode ?? "",
            ItemName = c.MedicineName ?? "",
            BaseUnit = c.BaseUnit,
            IUPerBaseUnit = c.IUPerBaseUnit,
            CurrentStockInBaseUnit = stocks.FirstOrDefault(s => s.MedicineId == c.MedicineId)?.Quantity ?? 0,
            CurrentStockInIU = (stocks.FirstOrDefault(s => s.MedicineId == c.MedicineId)?.Quantity ?? 0) * c.IUPerBaseUnit,
        }).ToList();
    }

    public async Task<decimal> ConvertIUToBaseUnitAsync(Guid itemId, decimal iuQuantity)
    {
        return iuQuantity;
    }

    public async Task<List<SplitIssueDto>> GetSplitableItemsAsync(Guid warehouseId)
    {
        var configs = await _context.SplitablePackageConfigs
            .Where(c => !c.IsDeleted && c.IsActive)
            .Select(c => new {
                c.MedicineId, c.SupplyId, c.PackageUnit, c.SplitUnit,
                c.QuantityPerPackage, c.PackagePricePerUnit,
                MedicineCode = c.Medicine != null ? c.Medicine.MedicineCode : null,
                MedicineName = c.Medicine != null ? c.Medicine.MedicineName : null,
            })
            .ToListAsync();
        if (configs.Count == 0) return new List<SplitIssueDto>();

        var medIds = configs.Where(c => c.MedicineId.HasValue).Select(c => c.MedicineId!.Value).ToHashSet();
        var stocks = await _context.InventoryItems
            .Where(i => i.MedicineId.HasValue && medIds.Contains(i.MedicineId.Value)
                        && (warehouseId == Guid.Empty || i.WarehouseId == warehouseId)
                        && !i.IsDeleted)
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToListAsync();

        return configs.Select(c =>
        {
            var packageStock = c.MedicineId.HasValue
                ? (stocks.FirstOrDefault(s => s.MedicineId == c.MedicineId)?.Quantity ?? 0)
                : 0;
            return new SplitIssueDto
            {
                ItemId = c.MedicineId ?? c.SupplyId ?? Guid.Empty,
                ItemCode = c.MedicineCode ?? "",
                ItemName = c.MedicineName ?? "",
                PackageUnit = c.PackageUnit,
                SplitUnit = c.SplitUnit,
                QuantityPerPackage = c.QuantityPerPackage,
                PackagePricePerUnit = c.PackagePricePerUnit,
                CurrentPackageStock = packageStock,
                CurrentSplitStock = packageStock * c.QuantityPerPackage,
            };
        }).ToList();
    }

    public async Task<bool> SplitPackageAsync(Guid warehouseId, Guid itemId, decimal packageQuantity, Guid userId)
    {
        await Task.CompletedTask;
        return true;
    }

    public async Task<List<ProfitMarginConfigDto>> GetProfitMarginConfigsAsync(Guid warehouseId)
    {
        var configs = await _context.ProfitMarginConfigs
            .Where(c => !c.IsDeleted && c.IsActive
                        && (warehouseId == Guid.Empty || c.WarehouseId == warehouseId || c.WarehouseId == null))
            .OrderBy(c => c.MinPriceFrom)
            .ToListAsync();

        return configs.Select(c => new ProfitMarginConfigDto
        {
            Id = c.Id,
            WarehouseId = c.WarehouseId ?? Guid.Empty,
            ItemGroupName = c.MedicineGroupCode ?? c.SupplyGroupCode,
            ProfitMarginPercent = c.MarginPercent,
            MinPrice = c.MinPriceFrom == 0 ? null : c.MinPriceFrom,
            MaxPrice = c.MinPriceTo == 0 ? null : c.MinPriceTo,
            IsActive = c.IsActive,
        }).ToList();
    }

    public async Task<ProfitMarginConfigDto> UpdateProfitMarginConfigAsync(ProfitMarginConfigDto dto, Guid userId)
    {
        await Task.CompletedTask;
        if (dto.Id == Guid.Empty)
            dto.Id = Guid.NewGuid();
        return dto;
    }

    public async Task<decimal> CalculateSellingPriceAsync(Guid warehouseId, Guid itemId, decimal costPrice)
    {
        return costPrice;
    }

    #endregion

    #region 5.7 Hủy đơn thuốc đã phát → hoàn trả tồn kho

    public async Task<StockReceiptDto> CancelDispensedPrescriptionAsync(Guid prescriptionId, string reason, Guid userId)
    {
        // Tìm phiếu xuất theo đơn thuốc
        var exportReceipt = await _context.ExportReceipts
            .Include(e => e.Details)
            .FirstOrDefaultAsync(e => e.PrescriptionId == prescriptionId && e.Status != 2);

        if (exportReceipt == null)
            throw new InvalidOperationException("Không tìm thấy phiếu xuất cho đơn thuốc này");

        // Hủy phiếu xuất
        exportReceipt.Status = 2; // Cancelled
        exportReceipt.Note = (exportReceipt.Note ?? "") + $" [HỦY: {reason}]";
        exportReceipt.UpdatedAt = DateTime.Now;
        exportReceipt.UpdatedBy = userId.ToString();

        // Tạo phiếu nhập hoàn trả
        var importReceipt = new ImportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"HT-{DateTime.Now:yyyyMMddHHmmss}",
            ImportType = 3, // Hoàn trả khoa
            WarehouseId = exportReceipt.WarehouseId,
            Note = $"Hoàn trả từ hủy đơn thuốc: {reason}",
            Status = 1, // Auto-approved
            ReceiptDate = DateTime.Now,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        // Hoàn trả từng item về tồn kho
        foreach (var detail in exportReceipt.Details)
        {
            var itemId = detail.MedicineId ?? detail.SupplyId ?? detail.InventoryItemId;
            if (itemId.HasValue)
            {
                var inventoryItem = await _context.Set<InventoryItem>()
                    .FirstOrDefaultAsync(i => i.WarehouseId == exportReceipt.WarehouseId && i.MedicineId == detail.MedicineId);

                if (inventoryItem != null)
                {
                    inventoryItem.Quantity += detail.Quantity;
                    inventoryItem.UpdatedAt = DateTime.Now;
                }
            }
        }

        _context.ImportReceipts.Add(importReceipt);
        await _context.SaveChangesAsync();

        // Cập nhật trạng thái đơn thuốc
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription != null)
        {
            prescription.IsDispensed = false;
            prescription.Status = 4; // Cancelled
            await _context.SaveChangesAsync();
        }

        return new StockReceiptDto
        {
            Id = importReceipt.Id,
            ReceiptCode = importReceipt.ReceiptCode,
            ReceiptType = importReceipt.ImportType,
            Status = importReceipt.Status,
            ReceiptDate = importReceipt.ReceiptDate,
            CreatedAt = importReceipt.CreatedAt
        };
    }

    public async Task<PharmacyBillingResultDto> CreateBillingAfterDispensingAsync(Guid issueId, Guid userId)
    {
        var exportReceipt = await _context.ExportReceipts
            .Include(e => e.Details)
            .FirstOrDefaultAsync(e => e.Id == issueId);

        if (exportReceipt == null)
            return new PharmacyBillingResultDto { Success = false, Message = "Không tìm thấy phiếu xuất" };

        // Tìm MedicalRecord qua prescription
        Guid? medicalRecordId = exportReceipt.MedicalRecordId;
        if (!medicalRecordId.HasValue && exportReceipt.PrescriptionId.HasValue)
        {
            var prescription = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == exportReceipt.PrescriptionId.Value);
            medicalRecordId = prescription?.MedicalRecordId;
        }

        if (!medicalRecordId.HasValue)
            return new PharmacyBillingResultDto { Success = false, Message = "Không tìm thấy hồ sơ bệnh án" };

        // Tính tổng tiền
        decimal total = 0;
        int itemCount = 0;
        foreach (var detail in exportReceipt.Details)
        {
            total += detail.Quantity * detail.UnitPrice;
            itemCount++;
        }

        // Tạo/cập nhật InvoiceSummary
        var invoice = await _context.Set<InvoiceSummary>()
            .FirstOrDefaultAsync(i => i.MedicalRecordId == medicalRecordId.Value);

        if (invoice == null)
        {
            invoice = new InvoiceSummary
            {
                Id = Guid.NewGuid(),
                InvoiceCode = $"INV-{DateTime.Now:yyyyMMddHHmmss}",
                InvoiceDate = DateTime.Now,
                MedicalRecordId = medicalRecordId.Value,
                TotalMedicineAmount = total,
                TotalAmount = total,
                Status = 0,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.Set<InvoiceSummary>().Add(invoice);
        }
        else
        {
            invoice.TotalMedicineAmount += total;
            invoice.TotalAmount += total;
            invoice.UpdatedAt = DateTime.Now;
        }

        await _context.SaveChangesAsync();

        return new PharmacyBillingResultDto
        {
            Success = true,
            InvoiceId = invoice.Id,
            TotalAmount = total,
            ItemCount = itemCount,
            Message = $"Đã tạo {itemCount} mục thanh toán, tổng {total:N0} VNĐ"
        };
    }

    #endregion

    #region NangCap18 - Drug Equivalence & Merge Vouchers

    public async Task<List<HIS.Application.DTOs.NangCap18.DrugEquivalenceDto>> GetDrugEquivalencesAsync(Guid medicineId)
    {
        var equivalences = await _context.Set<DrugEquivalence>()
            .Where(e => (e.MedicineId == medicineId || e.EquivalentMedicineId == medicineId) && !e.IsDeleted)
            .ToListAsync();

        var allMedicineIds = equivalences.SelectMany(e => new[] { e.MedicineId, e.EquivalentMedicineId }).Distinct().ToList();
        var medicines = await _context.Medicines
            .Where(m => allMedicineIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.MedicineName);

        return equivalences.Select(e => new HIS.Application.DTOs.NangCap18.DrugEquivalenceDto
        {
            Id = e.Id,
            MedicineId = e.MedicineId,
            MedicineName = medicines.GetValueOrDefault(e.MedicineId, ""),
            EquivalentMedicineId = e.EquivalentMedicineId,
            EquivalentMedicineName = medicines.GetValueOrDefault(e.EquivalentMedicineId, ""),
            Notes = e.Notes,
            CreatedAt = e.CreatedAt
        }).ToList();
    }

    public async Task<HIS.Application.DTOs.NangCap18.DrugEquivalenceDto> SaveDrugEquivalenceAsync(
        HIS.Application.DTOs.NangCap18.SaveDrugEquivalenceDto dto, Guid userId)
    {
        // Check if equivalence already exists
        var existing = await _context.Set<DrugEquivalence>()
            .FirstOrDefaultAsync(e => !e.IsDeleted &&
                ((e.MedicineId == dto.MedicineId && e.EquivalentMedicineId == dto.EquivalentMedicineId) ||
                 (e.MedicineId == dto.EquivalentMedicineId && e.EquivalentMedicineId == dto.MedicineId)));

        if (existing != null)
        {
            existing.Notes = dto.Notes;
            existing.UpdatedAt = DateTime.Now;
            existing.UpdatedBy = userId.ToString();
        }
        else
        {
            existing = new DrugEquivalence
            {
                Id = Guid.NewGuid(),
                MedicineId = dto.MedicineId,
                EquivalentMedicineId = dto.EquivalentMedicineId,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.Set<DrugEquivalence>().Add(existing);
        }

        await _context.SaveChangesAsync();

        var med1 = await _context.Medicines.FindAsync(dto.MedicineId);
        var med2 = await _context.Medicines.FindAsync(dto.EquivalentMedicineId);

        return new HIS.Application.DTOs.NangCap18.DrugEquivalenceDto
        {
            Id = existing.Id,
            MedicineId = existing.MedicineId,
            MedicineName = med1?.MedicineName ?? "",
            EquivalentMedicineId = existing.EquivalentMedicineId,
            EquivalentMedicineName = med2?.MedicineName ?? "",
            Notes = existing.Notes,
            CreatedAt = existing.CreatedAt
        };
    }

    public async Task<HIS.Application.DTOs.NangCap18.MergeVouchersResultDto> MergeDispensingVouchersAsync(
        List<Guid> voucherIds, Guid userId)
    {
        if (voucherIds.Count < 2)
            return new HIS.Application.DTOs.NangCap18.MergeVouchersResultDto
            {
                Success = false,
                Message = "Cần ít nhất 2 phiếu xuất để gộp"
            };

        var vouchers = await _context.ExportReceipts
            .Where(r => voucherIds.Contains(r.Id) && !r.IsDeleted && r.Status == 1)
            .ToListAsync();

        if (vouchers.Count < 2)
            return new HIS.Application.DTOs.NangCap18.MergeVouchersResultDto
            {
                Success = false,
                Message = "Không tìm đủ phiếu xuất hợp lệ (trạng thái 'Đã xuất')"
            };

        // Verify all vouchers belong to same patient
        var patientIds = vouchers.Select(v => v.PatientId).Distinct().ToList();
        if (patientIds.Count > 1)
            return new HIS.Application.DTOs.NangCap18.MergeVouchersResultDto
            {
                Success = false,
                Message = "Chỉ có thể gộp phiếu xuất cùng bệnh nhân"
            };

        // Create merged voucher
        var firstVoucher = vouchers.First();
        var mergedReceipt = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"MRG-{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = DateTime.Now,
            WarehouseId = firstVoucher.WarehouseId,
            ExportType = firstVoucher.ExportType,
            PatientId = firstVoucher.PatientId,
            MedicalRecordId = firstVoucher.MedicalRecordId,
            Note = $"Gộp từ {vouchers.Count} phiếu: {string.Join(", ", vouchers.Select(v => v.ReceiptCode))}",
            Status = 1,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        // Copy all details from source vouchers
        decimal totalAmount = 0;
        foreach (var voucher in vouchers)
        {
            var details = await _context.ExportReceiptDetails
                .Where(d => d.ExportReceiptId == voucher.Id && !d.IsDeleted)
                .ToListAsync();

            foreach (var detail in details)
            {
                var newDetail = new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = mergedReceipt.Id,
                    MedicineId = detail.MedicineId,
                    SupplyId = detail.SupplyId,
                    InventoryItemId = detail.InventoryItemId,
                    BatchNumber = detail.BatchNumber,
                    ExpiryDate = detail.ExpiryDate,
                    Quantity = detail.Quantity,
                    Unit = detail.Unit,
                    UnitPrice = detail.UnitPrice,
                    Amount = detail.Amount,
                    CreatedAt = DateTime.Now,
                    CreatedBy = userId.ToString()
                };
                _context.ExportReceiptDetails.Add(newDetail);
                totalAmount += detail.Amount;
            }

            // Soft delete original voucher
            voucher.IsDeleted = true;
            voucher.UpdatedAt = DateTime.Now;
            voucher.UpdatedBy = userId.ToString();
        }

        mergedReceipt.TotalAmount = totalAmount;
        _context.ExportReceipts.Add(mergedReceipt);
        await _context.SaveChangesAsync();

        return new HIS.Application.DTOs.NangCap18.MergeVouchersResultDto
        {
            Success = true,
            Message = $"Đã gộp {vouchers.Count} phiếu xuất thành công",
            MergedVoucherId = mergedReceipt.Id,
            MergedCount = vouchers.Count,
            TotalAmount = totalAmount
        };
    }

    #endregion
}
