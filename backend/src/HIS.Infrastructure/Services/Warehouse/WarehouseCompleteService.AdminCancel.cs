using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Common;
using HIS.Core.Constants;
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

    // ════════════════════════════════════════════════════════════════════════════════════════
    // Vật tư tái sử dụng — #218/T3
    //
    // Cả tính năng này trước đây được BỊA RA TỪ HASH CỦA Id. Đường đọc không đọc bản ghi nào — nó
    // lấy 30 dòng danh mục `MedicalSupplies` rồi sinh số:
    //
    //     int current  = (s.Id.GetHashCode() & 0x7fffffff) % max;                // số lần đã tái sử dụng
    //     int stat     = idx % 10 switch { ... };                                // trạng thái theo VỊ TRÍ trong danh sách
    //     var lastSter = today.AddDays(-((s.Id.GetHashCode() & 0xff) % 25 + 1));  // ngày tiệt khuẩn gần nhất
    //
    // kèm chú thích thành thật "Demo: synthesize ... since there is no dedicated tracking table".
    //
    // Màn hình này nói cho nhân viên kiểm soát nhiễm khuẩn biết dụng cụ nào đã tiệt khuẩn, tiệt khuẩn
    // lúc nào, và đã tái sử dụng bao nhiêu lần — giới hạn số lần tồn tại vì dụng cụ xuống cấp. Mọi
    // con số trên đó là một phép băm. Nó còn bỏ qua cả cột `MedicalSupplies.IsReusable` sẵn có, nên
    // vật tư dùng-một-lần cũng hiện ra như tái sử dụng được.
    //
    // Migration 181 dựng `ReusableSupplyInstances` (mỗi dòng một hiện vật cụ thể — hai cái kìm cùng
    // loại đếm số lần dùng riêng) và `SterilizationLogs` (truy vết ngược khi có sự cố nhiễm khuẩn).
    // ════════════════════════════════════════════════════════════════════════════════════════

    private static ReusableSupplyDto ToReusableDto(ReusableSupplyInstance i) => new ReusableSupplyDto
    {
        Id = i.Id,
        ItemId = i.SupplyId,
        ItemCode = i.Supply?.SupplyCode ?? i.InstanceCode,
        ItemName = i.Supply?.SupplyName ?? string.Empty,
        InstanceCode = i.InstanceCode,
        MaxReuseCount = i.MaxReuseCount,
        CurrentReuseCount = i.CurrentReuseCount,
        LastSterilizationDate = i.LastSterilizationAt,
        NextSterilizationDue = i.NextSterilizationDue,
        Status = i.Status,
    };

    public async Task<List<ReusableSupplyDto>> GetReusableSuppliesAsync(Guid? warehouseId, int? status)
    {
        var query = _context.ReusableSupplyInstances
            .Include(i => i.Supply)
            .Where(i => !i.IsDeleted);

        if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);
        if (status.HasValue) query = query.Where(i => i.Status == status.Value);

        var rows = await query
            .OrderBy(i => i.InstanceCode)
            .ToListAsync();

        return rows.Select(ToReusableDto).ToList();
    }

    /// <summary>
    /// Đổi trạng thái một hiện vật (sẵn sàng · đang sử dụng · chờ tiệt khuẩn · hết hạn dùng lại).
    ///
    /// <para>#218/T3 — trước đây `await Task.CompletedTask` rồi dội lại DTO, và **không có route
    /// nào** gọi tới. Nay ghi thật, kèm gác: dụng cụ đã dùng đủ số lần cho phép thì không đặt lại
    /// thành "sẵn sàng" được — đó chính là con số dùng để quyết định khi nào loại bỏ.</para>
    /// </summary>
    public async Task<ReusableSupplyDto> UpdateReusableSupplyStatusAsync(Guid id, int status, Guid userId)
    {
        if (!ReusableSupplyStatus.IsValid(status))
            throw new InvalidOperationException(
                $"Trạng thái {status} không hợp lệ cho vật tư tái sử dụng.");

        var inst = await _context.ReusableSupplyInstances
            .Include(i => i.Supply)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy vật tư tái sử dụng");

        if (inst.CurrentReuseCount >= inst.MaxReuseCount
            && status != ReusableSupplyStatus.Retired)
            throw new InvalidOperationException(
                $"Vật tư đã dùng đủ {inst.MaxReuseCount} lần cho phép, phải loại bỏ. "
                + "Không đặt lại thành trạng thái còn dùng được.");

        inst.Status = status;
        inst.UpdatedAt = DateTime.Now;
        inst.UpdatedBy = userId.ToString();
        if (status == ReusableSupplyStatus.Retired && inst.RetiredAt == null)
            inst.RetiredAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return ToReusableDto(inst);
    }

    /// <summary>
    /// Ghi nhận một mẻ tiệt khuẩn cho hiện vật.
    ///
    /// <para>#218/T3 — trước đây cũng chỉ dội lại DTO, và trả cứng <c>CurrentReuseCount = 0</c>. Chỗ
    /// số 0 ấy đáng nói riêng: nếu có ai nối nó vào dữ liệu thật thì **mỗi lần tiệt khuẩn sẽ xoá
    /// sạch lịch sử tái sử dụng** của dụng cụ — đúng con số dùng để quyết định khi nào loại bỏ. Tiệt
    /// khuẩn phải LÀM TĂNG số lần đã dùng, không phải đặt về 0.</para>
    /// </summary>
    public async Task<ReusableSupplyDto> RecordSterilizationAsync(Guid id, DateTime sterilizationDate, Guid userId)
    {
        var inst = await _context.ReusableSupplyInstances
            .Include(i => i.Supply)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy vật tư tái sử dụng");

        if (sterilizationDate.Date > DateTime.Today)
            throw new InvalidOperationException("Ngày tiệt khuẩn ở tương lai, không hợp lệ.");
        if (inst.Status == ReusableSupplyStatus.Retired)
            throw new InvalidOperationException("Vật tư đã loại bỏ, không tiệt khuẩn để dùng lại.");
        if (inst.CurrentReuseCount >= inst.MaxReuseCount)
            throw new InvalidOperationException(
                $"Vật tư đã dùng đủ {inst.MaxReuseCount} lần cho phép, phải loại bỏ chứ không tiệt khuẩn lại.");

        inst.CurrentReuseCount++;
        inst.LastSterilizationAt = sterilizationDate;
        inst.NextSterilizationDue = sterilizationDate.AddDays(30);
        inst.Status = inst.CurrentReuseCount >= inst.MaxReuseCount
            ? ReusableSupplyStatus.Retired
            : ReusableSupplyStatus.Ready;
        inst.UpdatedAt = DateTime.Now;
        inst.UpdatedBy = userId.ToString();

        // Nhật ký để truy vết ngược khi có sự cố nhiễm khuẩn: cần biết dụng cụ ấy đã qua mẻ nào.
        // `ReuseCountAfter` chụp lại tại thời điểm ghi, cố ý không đọc động từ hiện vật — cùng lý do
        // với giấy nghỉ ốm chụp chẩn đoán ở migration 177.
        _context.SterilizationLogs.Add(new SterilizationLog
        {
            Id = Guid.NewGuid(),
            InstanceId = inst.Id,
            SterilizedAt = sterilizationDate,
            ReuseCountAfter = inst.CurrentReuseCount,
            PerformedById = userId,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString(),
        });

        await _context.SaveChangesAsync();
        return ToReusableDto(inst);
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

    /// <summary>
    /// Ghi nhận sử dụng hàng ký gửi. #218/T3 — trước đây trả về một DTO bịa (`Quantity = 100` cứng,
    /// `ConsignmentDate` là "tháng trước") mà không ghi gì, trong khi bảng `ConsignmentStocks` đã có
    /// sẵn và `GetConsignmentStocksAsync` ngay trên vẫn truy vấn nó.
    /// Ghi chú: hàm này hiện CHƯA có route API nào gọi tới — vá cho nhất quán với sáu hàm cùng nhóm.
    /// </summary>
    public async Task<ConsignmentStockDto> RecordConsignmentUsageAsync(Guid consignmentId, decimal quantity, Guid userId)
    {
        if (quantity <= 0)
            throw new InvalidOperationException("Số lượng sử dụng phải lớn hơn 0.");

        var stock = await _context.ConsignmentStocks
            .FirstOrDefaultAsync(c => c.Id == consignmentId && !c.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy lô hàng ký gửi");

        var remaining = stock.Quantity - stock.UsedQuantity;
        if (quantity > remaining)
            throw new InvalidOperationException(
                $"Chỉ còn {remaining:N0} trong lô ký gửi, không ghi nhận sử dụng {quantity:N0} được.");

        stock.UsedQuantity += quantity;
        stock.UpdatedAt = DateTime.UtcNow;
        stock.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return new ConsignmentStockDto
        {
            Id = stock.Id,
            SupplierId = stock.SupplierId,
            WarehouseId = stock.WarehouseId,
            BatchNumber = stock.BatchNumber,
            Quantity = stock.Quantity,
            UsedQuantity = stock.UsedQuantity,
            ConsignmentDate = stock.ConsignmentDate,
            ExpirationDate = stock.ExpirationDate,
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
        {
            // Legacy (trước fix 2026-06-13): fallback CompleteDispensing cũ flip status "đã phát"
            // mà KHÔNG tạo phiếu xuất/không trừ kho → không có gì để hoàn kho. Cho hoàn TRẠNG THÁI
            // đơn (về Đã duyệt) để phát lại đúng luồng; kho không cộng vì chưa từng bị trừ.
            var legacyRx = await _context.Prescriptions
                .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);
            if (legacyRx != null && legacyRx.IsDispensed)
            {
                legacyRx.IsDispensed = false;
                legacyRx.DispensedAt = null;
                legacyRx.DispensedBy = null;
                legacyRx.Status = 1; // Đã duyệt — phát lại được
                legacyRx.UpdatedAt = DateTime.UtcNow;
                legacyRx.UpdatedBy = userId.ToString();
                await _context.SaveChangesAsync();
                return new StockReceiptDto
                {
                    Id = Guid.Empty,
                    ReceiptCode = "(không có phiếu xuất — đơn phát trước fix, kho chưa bị trừ; đã hoàn trạng thái đơn)",
                    ReceiptType = 0,
                    Status = 1,
                    ReceiptDate = DateTime.Now,
                    CreatedAt = DateTime.Now
                };
            }
            throw new InvalidOperationException("Không tìm thấy phiếu xuất cho đơn thuốc này");
        }

        // Hủy phiếu xuất
        exportReceipt.Status = 2; // Cancelled
        exportReceipt.Note = (exportReceipt.Note ?? "") + $" [HỦY: {reason}]";
        exportReceipt.UpdatedAt = DateTime.Now;
        exportReceipt.UpdatedBy = userId.ToString();

        // Tạo phiếu nhập hoàn trả
        var importReceipt = new ImportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = CodeGenerator.Timestamp("HT"),
            ImportType = 3, // Hoàn trả khoa
            WarehouseId = exportReceipt.WarehouseId,
            Note = $"Hoàn trả từ hủy đơn thuốc: {reason}",
            Status = 1, // Auto-approved
            ReceiptDate = DateTime.Now,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        // #195: nạp 1 lần các dòng tồn của kho này thay vì 1 query/dòng phiếu. Vẫn tra đúng
        // theo MedicineId như cũ (kể cả khi null), và hai dòng cùng thuốc vẫn cộng dồn vào
        // cùng một bản ghi tồn — trước đây query lặp cũng trả về chính bản đang được theo dõi.
        var returnedMedicineIds = exportReceipt.Details.Select(d => d.MedicineId).Distinct().ToList();
        var inventoryByMedicine = (await _context.Set<InventoryItem>()
                .Where(i => i.WarehouseId == exportReceipt.WarehouseId && returnedMedicineIds.Contains(i.MedicineId))
                .ToListAsync())
            .GroupBy(i => i.MedicineId)
            .ToDictionary(g => g.Key, g => g.First());

        // Hoàn trả từng item về tồn kho
        foreach (var detail in exportReceipt.Details)
        {
            var itemId = detail.MedicineId ?? detail.SupplyId ?? detail.InventoryItemId;
            if (itemId.HasValue)
            {
                inventoryByMedicine.TryGetValue(detail.MedicineId, out var inventoryItem);

                if (inventoryItem != null)
                {
                    inventoryItem.Quantity += detail.Quantity;
                    inventoryItem.UpdatedAt = DateTime.Now;
                }
            }
        }

        _context.ImportReceipts.Add(importReceipt);

        // #187: cập nhật trạng thái đơn TRƯỚC SaveChanges → gộp 1 transaction atomic
        // (hủy phiếu xuất + nhập hoàn + trừ kho + cập nhật đơn). Tránh trạng thái nửa-vời nếu lỗi giữa chừng.
        var prescription = await _context.Prescriptions.FindAsync(prescriptionId);
        if (prescription != null)
        {
            prescription.IsDispensed = false;
            prescription.Status = 4; // Cancelled
        }

        await _context.SaveChangesAsync();

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

        // #17: idempotent — phiếu xuất đã tạo billing rồi thì KHÔNG cộng tiền thuốc lần nữa
        // (auto-call sau dispense + nút thủ công không double-bill vào InvoiceSummary).
        if (exportReceipt.IsBilled)
            return new PharmacyBillingResultDto { Success = true, Message = "Phiếu xuất đã được tạo thanh toán trước đó" };

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
                InvoiceCode = CodeGenerator.Timestamp("INV"),
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

        exportReceipt.IsBilled = true; // đánh dấu đã tạo billing — guard double-bill
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
            ReceiptCode = CodeGenerator.Timestamp("MRG"),
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

        // #195: 1 query lấy chi tiết của mọi phiếu nguồn thay vì 1 query/phiếu.
        var sourceVoucherIds = vouchers.Select(v => v.Id).ToList();
        var detailsByVoucher = (await _context.ExportReceiptDetails
                .Where(d => sourceVoucherIds.Contains(d.ExportReceiptId) && !d.IsDeleted)
                .ToListAsync())
            .GroupBy(d => d.ExportReceiptId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Copy all details from source vouchers
        decimal totalAmount = 0;
        foreach (var voucher in vouchers)
        {
            var details = detailsByVoucher.TryGetValue(voucher.Id, out var voucherDetails)
                ? voucherDetails
                : new List<ExportReceiptDetail>();

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
