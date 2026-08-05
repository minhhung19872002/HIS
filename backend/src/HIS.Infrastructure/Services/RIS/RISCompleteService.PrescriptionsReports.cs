using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs.Radiology;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using HIS.Infrastructure.Services.Export;

namespace HIS.Infrastructure.Services;

// K3 phien 1 (2026-05-30): tach RIS Module 8 (5 region 8.1+8.2+8.3+8.4+8.5, ~1730 dong)
// khoi RISCompleteService.cs god-file (5679 dong). ZERO runtime change â€" partial class.
// Ctor + 13 DI deps + PACS config o file goc.
public partial class RISCompleteService
{
    #region 8.4 Prescriptions (Ke thuoc, vat tu)

    private const string ItemTypeMedicine = "Medicine";
    private const string ItemTypeSupply = "Supply";

    /// <summary>Danh mục thuốc/vật tư dùng chung cho định mức và phiếu kê.</summary>
    private sealed record CatalogItem(
        Guid Id, string Code, string Name, string ItemType, string? Unit,
        decimal UnitPrice, decimal InsurancePrice);

    private async Task<Dictionary<Guid, CatalogItem>> LoadCatalogAsync(IReadOnlyCollection<Guid> itemIds)
    {
        if (itemIds.Count == 0) return new Dictionary<Guid, CatalogItem>();

        var medicines = await _context.Medicines
            .Where(m => itemIds.Contains(m.Id))
            .Select(m => new CatalogItem(m.Id, m.MedicineCode, m.MedicineName, ItemTypeMedicine,
                m.Unit, m.UnitPrice, m.InsurancePrice))
            .ToListAsync();
        var supplies = await _context.MedicalSupplies
            .Where(s => itemIds.Contains(s.Id))
            .Select(s => new CatalogItem(s.Id, s.SupplyCode, s.SupplyName, ItemTypeSupply,
                s.Unit, s.UnitPrice, s.InsurancePrice))
            .ToListAsync();

        return medicines.Concat(supplies).GroupBy(i => i.Id).ToDictionary(g => g.Key, g => g.First());
    }

    private async Task<RadiologyPrescriptionDto> MapPrescriptionAsync(RadiologyPrescription prescription)
    {
        var items = prescription.Items.Where(i => !i.IsDeleted).ToList();
        var catalog = await LoadCatalogAsync(items.Select(i => i.ItemId).Distinct().ToList());

        var header = await _context.RadiologyRequests
            .Where(r => r.Id == prescription.RadiologyRequestId)
            .Select(r => new
            {
                r.RequestCode,
                r.PatientId,
                PatientName = r.Patient.FullName,
                ServiceName = r.Service.ServiceName
            })
            .FirstOrDefaultAsync();
        var warehouseName = await _context.Warehouses
            .Where(w => w.Id == prescription.WarehouseId)
            .Select(w => w.WarehouseName)
            .FirstOrDefaultAsync();
        var doctorName = prescription.PrescribedByUserId == null
            ? null
            : await _context.Users
                .Where(u => u.Id == prescription.PrescribedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

        return new RadiologyPrescriptionDto
        {
            Id = prescription.Id,
            OrderItemId = prescription.RadiologyRequestId,
            OrderCode = header?.RequestCode,
            PatientId = header?.PatientId ?? Guid.Empty,
            PatientName = header?.PatientName,
            ServiceName = header?.ServiceName,
            PrescriptionDate = prescription.PrescriptionDate,
            DoctorName = doctorName,
            Status = PrescriptionStatusName(prescription.Status),
            TotalAmount = prescription.TotalAmount,
            Items = items.Select(i =>
            {
                catalog.TryGetValue(i.ItemId, out var info);
                return new RadiologyPrescriptionItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemCode = info?.Code,
                    ItemName = info?.Name,
                    ItemType = i.ItemType,
                    Unit = info?.Unit,
                    Quantity = i.Quantity,
                    Price = i.UnitPrice,
                    InsurancePrice = i.InsurancePrice,
                    Amount = i.Amount,
                    LotNumber = i.LotNumber,
                    ExpiryDate = i.ExpiryDate,
                    WarehouseName = warehouseName,
                    Note = i.Note
                };
            }).ToList()
        };
    }

    private static string PrescriptionStatusName(int status) => status switch
    {
        0 => "Nháp",
        1 => "Đã chốt",
        2 => "Đã hủy",
        _ => "Không xác định"
    };

    public async Task<List<RadiologyPrescriptionDto>> GetRadiologyPrescriptionsAsync(Guid orderItemId)
    {
        var prescriptions = await _context.RadiologyPrescriptions
            .Include(p => p.Items)
            .Where(p => p.RadiologyRequestId == orderItemId)
            .OrderByDescending(p => p.PrescriptionDate)
            .ToListAsync();

        var result = new List<RadiologyPrescriptionDto>();
        foreach (var prescription in prescriptions)
            result.Add(await MapPrescriptionAsync(prescription));
        return result;
    }

    /// <summary>
    /// Ghi phiếu kê thuốc/vật tư thật. Giá lấy từ danh mục, số lô/hạn dùng lấy theo lô còn hạn
    /// gần hết nhất trong kho được chọn (FEFO) và bỏ qua lô đang bị khóa.
    /// </summary>
    public async Task<RadiologyPrescriptionDto> CreateRadiologyPrescriptionAsync(CreateRadiologyPrescriptionDto dto)
    {
        var request = await _context.RadiologyRequests.FirstOrDefaultAsync(r => r.Id == dto.OrderItemId);
        if (request == null) throw new KeyNotFoundException("Không tìm thấy phiếu chỉ định CĐHA");

        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId);
        if (warehouse == null) throw new KeyNotFoundException("Không tìm thấy kho");
        if (warehouse.IsLocked)
            throw new InvalidOperationException($"Kho '{warehouse.WarehouseName}' đang bị khóa: {warehouse.LockReason}");

        var lines = dto.Items?.Where(i => i.Quantity > 0).ToList() ?? new List<CreateRadiologyPrescriptionItemDto>();
        if (lines.Count == 0) throw new ArgumentException("Phiếu kê phải có ít nhất một dòng thuốc/vật tư");

        var prescription = new RadiologyPrescription
        {
            Id = Guid.NewGuid(),
            RadiologyRequestId = request.Id,
            WarehouseId = warehouse.Id,
            PrescriptionCode = await GeneratePrescriptionCodeAsync(),
            PrescriptionDate = DateTime.Now,
            PrescribedByUserId = GetCurrentUserIdOrAdmin(),
            Status = 0,
            CreatedAt = DateTime.Now
        };

        var items = await BuildPrescriptionItemsAsync(prescription, lines, warehouse.Id);
        await _context.RadiologyPrescriptions.AddAsync(prescription);
        await _context.RadiologyPrescriptionItems.AddRangeAsync(items);
        // Không tự Add vào prescription.Items: EF fixup đã gắn sẵn, thêm nữa là nhân đôi dòng.
        await _unitOfWork.SaveChangesAsync();

        return await MapPrescriptionAsync(prescription);
    }

    private async Task<string> GeneratePrescriptionCodeAsync()
    {
        var prefix = $"VTC{DateTime.Now:yyyyMMdd}";
        var todayCount = await _context.RadiologyPrescriptions
            .CountAsync(p => p.PrescriptionCode.StartsWith(prefix));
        return $"{prefix}{todayCount + 1:D4}";
    }

    /// <summary>
    /// Dựng các dòng phiếu kê từ danh mục + tồn kho thật (FEFO, bỏ lô khóa/hết hạn).
    /// Trả về danh sách dòng và cập nhật tổng tiền; caller tự quyết định thêm vào DbSet
    /// (KHÔNG thêm qua collection đã tracked — EF sẽ sinh UPDATE thay vì INSERT).
    /// </summary>
    private async Task<List<RadiologyPrescriptionItem>> BuildPrescriptionItemsAsync(
        RadiologyPrescription prescription,
        List<CreateRadiologyPrescriptionItemDto> lines,
        Guid warehouseId)
    {
        var catalog = await LoadCatalogAsync(lines.Select(l => l.ItemId).Distinct().ToList());
        var missing = lines.Where(l => !catalog.ContainsKey(l.ItemId)).Select(l => l.ItemId).ToList();
        if (missing.Count > 0)
            throw new KeyNotFoundException(
                $"Không tìm thấy trong danh mục thuốc/vật tư: {string.Join(", ", missing)}");

        var itemIds = catalog.Keys.ToList();
        var lots = await _context.InventoryItems
            .Where(s => s.WarehouseId == warehouseId && !s.IsLocked && s.Quantity > 0 &&
                        s.ItemId != null && itemIds.Contains(s.ItemId.Value))
            .Select(s => new { ItemId = s.ItemId!.Value, s.BatchNumber, s.ExpiryDate, s.Quantity })
            .ToListAsync();

        var items = new List<RadiologyPrescriptionItem>();
        decimal total = 0;
        foreach (var line in lines)
        {
            var info = catalog[line.ItemId];
            // FEFO: ưu tiên lô hết hạn sớm nhất còn hiệu lực.
            var lot = lots
                .Where(l => l.ItemId == line.ItemId &&
                            (l.ExpiryDate == null || l.ExpiryDate > DateTime.Today))
                .OrderBy(l => l.ExpiryDate ?? DateTime.MaxValue)
                .FirstOrDefault();

            var amount = Math.Round(line.Quantity * info.UnitPrice, 2);
            total += amount;
            items.Add(new RadiologyPrescriptionItem
            {
                Id = Guid.NewGuid(),
                RadiologyPrescriptionId = prescription.Id,
                ItemId = info.Id,
                ItemType = info.ItemType,
                Quantity = line.Quantity,
                UnitPrice = info.UnitPrice,
                InsurancePrice = info.InsurancePrice,
                Amount = amount,
                LotNumber = lot?.BatchNumber,
                ExpiryDate = lot?.ExpiryDate,
                Note = line.Note,
                CreatedAt = DateTime.Now
            });
        }
        prescription.TotalAmount = total;
        return items;
    }

    public async Task<RadiologyPrescriptionDto> UpdateRadiologyPrescriptionAsync(
        Guid prescriptionId,
        UpdateRadiologyPrescriptionDto dto)
    {
        // KHÔNG Include Items: xoá dòng cũ bằng ExecuteDelete rồi thêm dòng mới. Nếu load Items
        // vào change-tracker rồi Clear() thì EF coi là "severed required relationship" và ném lỗi.
        var prescription = await _context.RadiologyPrescriptions
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);
        if (prescription == null) throw new KeyNotFoundException("Không tìm thấy phiếu kê");
        if (prescription.Status != 0)
            throw new InvalidOperationException("Chỉ sửa được phiếu kê đang ở trạng thái nháp");

        var lines = dto.Items?.Where(i => i.Quantity > 0).ToList() ?? new List<CreateRadiologyPrescriptionItemDto>();
        if (lines.Count == 0) throw new ArgumentException("Phiếu kê phải có ít nhất một dòng thuốc/vật tư");

        await _context.RadiologyPrescriptionItems
            .Where(i => i.RadiologyPrescriptionId == prescription.Id)
            .ExecuteDeleteAsync();

        var items = await BuildPrescriptionItemsAsync(prescription, lines, prescription.WarehouseId);
        await _context.RadiologyPrescriptionItems.AddRangeAsync(items);
        prescription.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();

        return await MapPrescriptionAsync(prescription);
    }

    public async Task<bool> DeleteRadiologyPrescriptionAsync(Guid prescriptionId)
    {
        var prescription = await _context.RadiologyPrescriptions
            .FirstOrDefaultAsync(p => p.Id == prescriptionId);
        if (prescription == null) return false;
        if (prescription.Status == 1)
            throw new InvalidOperationException("Phiếu kê đã chốt, không xóa được");

        // Xoá mềm cả dòng con, nếu không sẽ để lại dòng mồ côi không truy cập được
        // nhưng vẫn lọt vào báo cáo tiêu hao.
        await _context.RadiologyPrescriptionItems
            .Where(i => i.RadiologyPrescriptionId == prescription.Id && !i.IsDeleted)
            .ExecuteUpdateAsync(s => s
                .SetProperty(i => i.IsDeleted, true)
                .SetProperty(i => i.UpdatedAt, DateTime.Now));

        prescription.IsDeleted = true;
        prescription.UpdatedAt = DateTime.Now;
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    /// <summary>Sinh phiếu kê từ định mức đã khai báo cho dịch vụ của phiếu chỉ định.</summary>
    public async Task<RadiologyPrescriptionDto> CreatePrescriptionFromNormAsync(Guid orderItemId, Guid warehouseId)
    {
        var request = await _context.RadiologyRequests.FirstOrDefaultAsync(r => r.Id == orderItemId);
        if (request == null) throw new KeyNotFoundException("Không tìm thấy phiếu chỉ định CĐHA");

        var normItems = await _context.RadiologyServiceNorms
            .Where(n => n.ServiceId == request.ServiceId && n.IsActive)
            .SelectMany(n => n.Items.Where(i => !i.IsDeleted))
            .Select(i => new CreateRadiologyPrescriptionItemDto
            {
                ItemId = i.ItemId,
                Quantity = i.Quantity,
                Note = i.IsRequired ? "Theo định mức (bắt buộc)" : "Theo định mức"
            })
            .ToListAsync();

        if (normItems.Count == 0)
            throw new InvalidOperationException(
                "Dịch vụ này chưa khai báo định mức tiêu hao — khai báo trước khi sinh phiếu kê");

        return await CreateRadiologyPrescriptionAsync(new CreateRadiologyPrescriptionDto
        {
            OrderItemId = orderItemId,
            WarehouseId = warehouseId,
            Items = normItems
        });
    }

    public async Task<RadiologyServiceNormDto> GetServiceNormAsync(Guid serviceId)
    {
        var service = await _context.Services
            .Where(s => s.Id == serviceId)
            .Select(s => new { s.ServiceCode, s.ServiceName })
            .FirstOrDefaultAsync();
        if (service == null) throw new KeyNotFoundException("Không tìm thấy dịch vụ");

        var norm = await _context.RadiologyServiceNorms
            .Include(n => n.Items)
            .FirstOrDefaultAsync(n => n.ServiceId == serviceId);

        var items = norm?.Items.Where(i => !i.IsDeleted).ToList() ?? new List<RadiologyServiceNormItem>();
        var catalog = await LoadCatalogAsync(items.Select(i => i.ItemId).Distinct().ToList());

        return new RadiologyServiceNormDto
        {
            Id = norm?.Id ?? Guid.Empty,
            ServiceId = serviceId,
            ServiceCode = service.ServiceCode,
            ServiceName = service.ServiceName,
            Items = items.Select(i =>
            {
                catalog.TryGetValue(i.ItemId, out var info);
                return new RadiologyNormItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemCode = info?.Code,
                    ItemName = info?.Name,
                    ItemType = i.ItemType,
                    Quantity = i.Quantity,
                    Unit = i.Unit ?? info?.Unit,
                    IsRequired = i.IsRequired
                };
            }).ToList()
        };
    }

    public async Task<bool> UpdateServiceNormAsync(Guid serviceId, List<UpdateNormItemDto> items)
    {
        var serviceExists = await _context.Services.AnyAsync(s => s.Id == serviceId);
        if (!serviceExists) throw new KeyNotFoundException("Không tìm thấy dịch vụ");

        var lines = items?.Where(i => i.Quantity > 0).ToList() ?? new List<UpdateNormItemDto>();
        var catalog = await LoadCatalogAsync(lines.Select(l => l.ItemId).Distinct().ToList());
        var missing = lines.Where(l => !catalog.ContainsKey(l.ItemId)).Select(l => l.ItemId).ToList();
        if (missing.Count > 0)
            throw new KeyNotFoundException(
                $"Không tìm thấy trong danh mục thuốc/vật tư: {string.Join(", ", missing)}");

        var norm = await _context.RadiologyServiceNorms
            .FirstOrDefaultAsync(n => n.ServiceId == serviceId);
        if (norm == null)
        {
            norm = new RadiologyServiceNorm
            {
                Id = Guid.NewGuid(),
                ServiceId = serviceId,
                IsActive = true,
                CreatedAt = DateTime.Now
            };
            await _context.RadiologyServiceNorms.AddAsync(norm);
            await _unitOfWork.SaveChangesAsync();
        }
        else
        {
            // Xoá set-based: thêm/bớt dòng qua collection đã tracked khiến EF sinh UPDATE
            // thay vì INSERT cho dòng mới → "0 rows affected" và mất dữ liệu người dùng nhập.
            await _context.RadiologyServiceNormItems
                .Where(i => i.RadiologyServiceNormId == norm.Id)
                .ExecuteDeleteAsync();
            norm.UpdatedAt = DateTime.Now;
        }

        var normItems = lines.Select(line =>
        {
            var info = catalog[line.ItemId];
            return new RadiologyServiceNormItem
            {
                Id = Guid.NewGuid(),
                RadiologyServiceNormId = norm.Id,
                ItemId = info.Id,
                ItemType = info.ItemType,
                Quantity = line.Quantity,
                Unit = string.IsNullOrWhiteSpace(line.Unit) ? info.Unit : line.Unit,
                IsRequired = line.IsRequired,
                CreatedAt = DateTime.Now
            };
        }).ToList();
        if (normItems.Count > 0) await _context.RadiologyServiceNormItems.AddRangeAsync(normItems);

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    /// <summary>Tìm thuốc/vật tư kèm tồn thật của kho được chọn (chỉ lô còn hạn, không bị khóa).</summary>
    public async Task<List<ItemSearchResultDto>> SearchItemsAsync(
        string keyword,
        Guid warehouseId,
        string itemType = null)
    {
        const int maxResults = 50;
        var needle = (keyword ?? string.Empty).Trim();
        var wantMedicine = string.IsNullOrWhiteSpace(itemType) ||
                           itemType.Equals(ItemTypeMedicine, StringComparison.OrdinalIgnoreCase);
        var wantSupply = string.IsNullOrWhiteSpace(itemType) ||
                         itemType.Equals(ItemTypeSupply, StringComparison.OrdinalIgnoreCase);

        var candidates = new List<CatalogItem>();
        if (wantMedicine)
        {
            candidates.AddRange(await _context.Medicines
                .Where(m => m.IsActive &&
                            (needle == "" || m.MedicineName.Contains(needle) || m.MedicineCode.Contains(needle)))
                .OrderBy(m => m.MedicineName)
                .Take(maxResults)
                .Select(m => new CatalogItem(m.Id, m.MedicineCode, m.MedicineName, ItemTypeMedicine,
                    m.Unit, m.UnitPrice, m.InsurancePrice))
                .ToListAsync());
        }
        if (wantSupply)
        {
            candidates.AddRange(await _context.MedicalSupplies
                .Where(s => s.IsActive &&
                            (needle == "" || s.SupplyName.Contains(needle) || s.SupplyCode.Contains(needle)))
                .OrderBy(s => s.SupplyName)
                .Take(maxResults)
                .Select(s => new CatalogItem(s.Id, s.SupplyCode, s.SupplyName, ItemTypeSupply,
                    s.Unit, s.UnitPrice, s.InsurancePrice))
                .ToListAsync());
        }

        var ids = candidates.Select(c => c.Id).ToList();
        var lots = await _context.InventoryItems
            .Where(s => s.WarehouseId == warehouseId && !s.IsLocked && s.Quantity > 0 &&
                        s.ItemId != null && ids.Contains(s.ItemId.Value))
            .Select(s => new { ItemId = s.ItemId!.Value, s.BatchNumber, s.ExpiryDate, s.Quantity })
            .ToListAsync();

        return candidates
            .Select(c =>
            {
                var itemLots = lots
                    .Where(l => l.ItemId == c.Id && (l.ExpiryDate == null || l.ExpiryDate > DateTime.Today))
                    .ToList();
                var nearest = itemLots.OrderBy(l => l.ExpiryDate ?? DateTime.MaxValue).FirstOrDefault();
                return new ItemSearchResultDto
                {
                    Id = c.Id,
                    Code = c.Code,
                    Name = c.Name,
                    ItemType = c.ItemType,
                    Unit = c.Unit,
                    Price = c.UnitPrice,
                    InsurancePrice = c.InsurancePrice,
                    StockQuantity = itemLots.Sum(l => l.Quantity),
                    LotNumber = nearest?.BatchNumber,
                    ExpiryDate = nearest?.ExpiryDate
                };
            })
            .OrderByDescending(x => x.StockQuantity)
            .ThenBy(x => x.Name)
            .Take(maxResults)
            .ToList();
    }

    public async Task<ItemStockDto> CheckItemStockAsync(Guid itemId, Guid warehouseId)
    {
        var catalog = await LoadCatalogAsync(new[] { itemId });
        catalog.TryGetValue(itemId, out var info);

        var lots = await _context.InventoryItems
            .Where(s => s.WarehouseId == warehouseId && s.ItemId == itemId)
            .Select(s => new { s.BatchNumber, s.ExpiryDate, s.Quantity, s.ReservedQuantity, s.IsLocked })
            .ToListAsync();

        // Dùng được = lô không khóa, còn hạn, trừ phần đã giữ chỗ.
        var usable = lots
            .Where(l => !l.IsLocked && (l.ExpiryDate == null || l.ExpiryDate > DateTime.Today))
            .ToList();

        return new ItemStockDto
        {
            ItemId = itemId,
            ItemCode = info?.Code,
            ItemName = info?.Name,
            TotalStock = lots.Sum(l => l.Quantity),
            AvailableStock = usable.Sum(l => l.Quantity - l.ReservedQuantity),
            ByLot = usable
                .OrderBy(l => l.ExpiryDate ?? DateTime.MaxValue)
                .Select(l => new ItemStockByLotDto
                {
                    LotNumber = l.BatchNumber,
                    ExpiryDate = l.ExpiryDate,
                    Quantity = l.Quantity - l.ReservedQuantity
                })
                .ToList()
        };
    }

    #endregion

    #region 8.5 Reports

    // Loại dịch vụ theo Service.ServiceType: 3 = Chẩn đoán hình ảnh, 4 = Thăm dò chức năng.
    private const int ServiceTypeRadiology = 3;
    private const int ServiceTypeFunctionalTest = 4;

    // RadiologyModality.ModalityType: 4 = siêu âm.
    private const int ModalityTypeUltrasound = 4;

    /// <summary>
    /// Một dòng sổ đăng ký: mỗi phiếu CĐHA đã thực hiện xong, kèm ca chụp và kết quả đọc nếu có.
    /// </summary>
    private sealed record RegisterRow(
        Guid RequestId,
        DateTime PerformedAt,
        string PatientCode,
        string PatientName,
        DateTime? BirthDate,
        int Gender,
        string? Address,
        Guid ServiceId,
        string ServiceCode,
        string ServiceName,
        int ServiceType,
        string? BodyPart,
        string? ClinicalInfo,
        string? Findings,
        string? Impression,
        string? TechnicianName,
        string? RadiologistName,
        string RequestingDoctorName,
        string? ModalityName,
        string? ModalityCode,
        int? ModalityType,
        decimal TotalAmount,
        decimal InsuranceAmount,
        decimal PatientAmount,
        Guid RequestingDoctorId);

    /// <summary>
    /// Nguồn chung cho mọi sổ/báo cáo: các phiếu đã thực hiện (Hoàn thành/Đã đọc/Đã duyệt).
    /// Ngày ghi sổ là ngày thực hiện ca chụp; phiếu chưa có ca chụp thì lấy ngày chỉ định.
    /// </summary>
    private IQueryable<RegisterRow> BuildPerformedQuery(DateTime fromDate, DateTime toDate, Guid? departmentId = null)
    {
        var from = fromDate.Date;
        var to = toDate.Date.AddDays(1).AddTicks(-1);

        var query = _context.RadiologyRequests
            .Where(r => r.Status >= 3 && r.Status <= 5);

        if (departmentId.HasValue)
        {
            query = query.Where(r => r.Exams.Any(e =>
                e.Room != null && e.Room.DepartmentId == departmentId.Value));
        }

        // Lọc ngày ngay trên nguồn (không lọc sau khi project — EF không dịch được biểu thức đó).
        query = query.Where(r =>
            (r.Exams.OrderBy(e => e.ExamDate).Select(e => (DateTime?)e.ExamDate).FirstOrDefault()
                ?? r.RequestDate) >= from &&
            (r.Exams.OrderBy(e => e.ExamDate).Select(e => (DateTime?)e.ExamDate).FirstOrDefault()
                ?? r.RequestDate) <= to);

        return query
            .Select(r => new RegisterRow(
                r.Id,
                r.Exams.OrderBy(e => e.ExamDate).Select(e => (DateTime?)e.ExamDate).FirstOrDefault() ?? r.RequestDate,
                r.Patient.PatientCode,
                r.Patient.FullName,
                r.Patient.DateOfBirth,
                r.Patient.Gender,
                r.Patient.Address,
                r.ServiceId,
                r.Service.ServiceCode,
                r.Service.ServiceName,
                r.Service.ServiceType,
                r.BodyPart,
                r.ClinicalInfo,
                r.Exams.OrderBy(e => e.ExamDate).Select(e => e.Report!.Findings).FirstOrDefault(),
                r.Exams.OrderBy(e => e.ExamDate).Select(e => e.Report!.Impression).FirstOrDefault(),
                r.Exams.OrderBy(e => e.ExamDate).Select(e => e.Technician!.FullName).FirstOrDefault(),
                r.Exams.OrderBy(e => e.ExamDate).Select(e => e.Report!.Radiologist.FullName).FirstOrDefault(),
                r.RequestingDoctor.FullName,
                // Tra máy qua sub-query: ca chụp thiếu/hỏng liên kết máy vẫn được ghi sổ,
                // không bị INNER JOIN loại bỏ âm thầm.
                r.Exams.OrderBy(e => e.ExamDate)
                    .Select(e => _context.RadiologyModalities
                        .Where(m => m.Id == e.ModalityId).Select(m => m.ModalityName).FirstOrDefault())
                    .FirstOrDefault(),
                r.Exams.OrderBy(e => e.ExamDate)
                    .Select(e => _context.RadiologyModalities
                        .Where(m => m.Id == e.ModalityId).Select(m => m.ModalityCode).FirstOrDefault())
                    .FirstOrDefault(),
                r.Exams.OrderBy(e => e.ExamDate)
                    .Select(e => _context.RadiologyModalities
                        .Where(m => m.Id == e.ModalityId).Select(m => (int?)m.ModalityType).FirstOrDefault())
                    .FirstOrDefault(),
                r.TotalAmount,
                r.InsuranceAmount,
                r.PatientAmount,
                r.RequestingDoctorId));
    }

    private static int? AgeAt(DateTime? birthDate, DateTime reference)
    {
        if (birthDate == null) return null;
        var age = reference.Year - birthDate.Value.Year;
        if (reference < birthDate.Value.AddYears(age)) age--;
        return age < 0 ? null : age;
    }

    private static string GenderLabel(int gender) => gender switch
    {
        1 => "Nam",
        2 => "Nữ",
        _ => "Khác"
    };

    private static string ServiceTypeName(int serviceType) => serviceType switch
    {
        ServiceTypeRadiology => "Chẩn đoán hình ảnh",
        ServiceTypeFunctionalTest => "Thăm dò chức năng",
        1 => "Khám bệnh",
        2 => "Xét nghiệm",
        5 => "Phẫu thuật - thủ thuật",
        _ => "Khác"
    };

    public async Task<RadiologyRevenueReportDto> GetRevenueReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null,
        string serviceType = null)
    {
        var rows = await BuildPerformedQuery(fromDate, toDate, departmentId).ToListAsync();
        if (!string.IsNullOrWhiteSpace(serviceType))
        {
            rows = rows.Where(r => MatchesServiceTypeFilter(r, serviceType)).ToList();
        }

        return new RadiologyRevenueReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalRevenue = rows.Sum(r => r.TotalAmount),
            InsuranceRevenue = rows.Sum(r => r.InsuranceAmount),
            PatientRevenue = rows.Sum(r => r.PatientAmount),
            TotalExams = rows.Count,
            ByServiceType = rows
                .GroupBy(r => r.ServiceType)
                .Select(g => new RevenueByServiceTypeDto
                {
                    ServiceType = g.Key.ToString(),
                    ServiceTypeName = ServiceTypeName(g.Key),
                    ExamCount = g.Count(),
                    Revenue = g.Sum(r => r.TotalAmount),
                    InsuranceRevenue = g.Sum(r => r.InsuranceAmount),
                    PatientRevenue = g.Sum(r => r.PatientAmount)
                })
                .OrderByDescending(x => x.Revenue)
                .ToList(),
            ByDay = rows
                .GroupBy(r => r.PerformedAt.Date)
                .Select(g => new RevenueByDayDto
                {
                    Date = g.Key,
                    ExamCount = g.Count(),
                    Revenue = g.Sum(r => r.TotalAmount)
                })
                .OrderBy(x => x.Date)
                .ToList(),
            ByDoctor = rows
                .GroupBy(r => new { r.RequestingDoctorId, r.RequestingDoctorName })
                .Select(g => new RevenueByDoctorDto
                {
                    DoctorId = g.Key.RequestingDoctorId,
                    DoctorName = g.Key.RequestingDoctorName,
                    ExamCount = g.Count(),
                    Revenue = g.Sum(r => r.TotalAmount)
                })
                .OrderByDescending(x => x.Revenue)
                .ToList()
        };
    }

    /// <summary>
    /// Lọc theo "loại" do người dùng chọn: khớp mã máy (CT/MR/CR/DX/US...) hoặc tên dịch vụ.
    /// </summary>
    private static bool MatchesServiceTypeFilter(RegisterRow row, string serviceType)
    {
        var needle = serviceType.Trim();
        return string.Equals(row.ModalityCode, needle, StringComparison.OrdinalIgnoreCase) ||
               row.ServiceName.Contains(needle, StringComparison.OrdinalIgnoreCase) ||
               row.ServiceCode.Contains(needle, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsUltrasound(RegisterRow row) =>
        row.ModalityType == ModalityTypeUltrasound ||
        row.ServiceName.Contains("siêu âm", StringComparison.OrdinalIgnoreCase) ||
        row.ServiceName.Contains("sieu am", StringComparison.OrdinalIgnoreCase);

    public async Task<UltrasoundRegisterDto> GetUltrasoundRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        var rows = (await BuildPerformedQuery(fromDate, toDate).ToListAsync())
            .Where(IsUltrasound)
            .OrderBy(r => r.PerformedAt)
            .ToList();

        return new UltrasoundRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = rows.Count,
            Items = rows.Select((r, index) => new UltrasoundRegisterItemDto
            {
                RowNumber = index + 1,
                ExamDate = r.PerformedAt,
                PatientCode = r.PatientCode,
                PatientName = r.PatientName,
                Age = AgeAt(r.BirthDate, r.PerformedAt),
                Gender = GenderLabel(r.Gender),
                Address = r.Address,
                ExamType = r.ServiceName,
                Diagnosis = r.ClinicalInfo,
                Conclusion = r.Impression,
                DoctorName = r.RadiologistName ?? r.RequestingDoctorName,
                Note = r.Findings
            }).ToList()
        };
    }

    public async Task<RadiologyRegisterDto> GetRadiologyRegisterByTypeAsync(
        DateTime fromDate,
        DateTime toDate,
        string serviceType)
    {
        var rows = (await BuildPerformedQuery(fromDate, toDate).ToListAsync())
            .Where(r => r.ServiceType == ServiceTypeRadiology)
            .Where(r => string.IsNullOrWhiteSpace(serviceType) || MatchesServiceTypeFilter(r, serviceType))
            .OrderBy(r => r.PerformedAt)
            .ToList();

        return BuildRadiologyRegister(fromDate, toDate, serviceType, rows);
    }

    public async Task<RadiologyRegisterDto> GetRadiologyRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        var rows = (await BuildPerformedQuery(fromDate, toDate).ToListAsync())
            .Where(r => r.ServiceType == ServiceTypeRadiology)
            .OrderBy(r => r.PerformedAt)
            .ToList();

        return BuildRadiologyRegister(fromDate, toDate, null, rows);
    }

    private static RadiologyRegisterDto BuildRadiologyRegister(
        DateTime fromDate,
        DateTime toDate,
        string? serviceType,
        List<RegisterRow> rows) => new()
        {
            FromDate = fromDate,
            ToDate = toDate,
            ServiceType = serviceType,
            TotalExams = rows.Count,
            Items = rows.Select((r, index) => new RadiologyRegisterItemDto
            {
                RowNumber = index + 1,
                ExamDate = r.PerformedAt,
                PatientCode = r.PatientCode,
                PatientName = r.PatientName,
                Age = AgeAt(r.BirthDate, r.PerformedAt),
                Gender = GenderLabel(r.Gender),
                Address = r.Address,
                ServiceName = r.ServiceName,
                BodyPart = r.BodyPart,
                Technique = r.ModalityName,
                Description = r.Findings,
                Conclusion = r.Impression,
                TechnicianName = r.TechnicianName,
                DoctorName = r.RadiologistName ?? r.RequestingDoctorName
            }).ToList()
        };

    public async Task<FunctionalTestRegisterDto> GetFunctionalTestRegisterAsync(DateTime fromDate, DateTime toDate)
    {
        var rows = (await BuildPerformedQuery(fromDate, toDate).ToListAsync())
            .Where(r => r.ServiceType == ServiceTypeFunctionalTest)
            .OrderBy(r => r.PerformedAt)
            .ToList();

        return new FunctionalTestRegisterDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalExams = rows.Count,
            Items = rows.Select((r, index) => new FunctionalTestRegisterItemDto
            {
                RowNumber = index + 1,
                ExamDate = r.PerformedAt,
                PatientCode = r.PatientCode,
                PatientName = r.PatientName,
                Age = AgeAt(r.BirthDate, r.PerformedAt),
                Gender = GenderLabel(r.Gender),
                TestType = r.ServiceName,
                Description = r.Findings,
                Conclusion = r.Impression,
                TechnicianName = r.TechnicianName,
                DoctorName = r.RadiologistName ?? r.RequestingDoctorName
            }).ToList()
        };
    }

    /// <summary>
    /// Đối chiếu định mức khai báo với lượng thực kê theo từng dịch vụ trong kỳ.
    /// Variance = thực dùng − định mức×số ca; dương là vượt định mức.
    /// </summary>
    public async Task<ConsumptionNormReportDto> GetConsumptionNormReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? serviceId = null)
    {
        var from = fromDate.Date;
        var to = toDate.Date.AddDays(1).AddTicks(-1);

        var actualQuery = _context.RadiologyPrescriptions
            .Where(p => p.Status != 2 && p.PrescriptionDate >= from && p.PrescriptionDate <= to);
        if (serviceId.HasValue)
            actualQuery = actualQuery.Where(p => p.RadiologyRequest.ServiceId == serviceId.Value);

        var actualLines = await actualQuery
            .SelectMany(p => p.Items.Where(i => !i.IsDeleted).Select(i => new
            {
                p.RadiologyRequest.ServiceId,
                ServiceCode = p.RadiologyRequest.Service.ServiceCode,
                ServiceName = p.RadiologyRequest.Service.ServiceName,
                PrescriptionId = p.Id,
                i.ItemId,
                i.Quantity
            }))
            .ToListAsync();

        var normQuery = _context.RadiologyServiceNorms.Where(n => n.IsActive);
        if (serviceId.HasValue) normQuery = normQuery.Where(n => n.ServiceId == serviceId.Value);
        var normLines = await normQuery
            .SelectMany(n => n.Items.Where(i => !i.IsDeleted).Select(i => new
            {
                n.ServiceId,
                ServiceCode = n.Service.ServiceCode,
                ServiceName = n.Service.ServiceName,
                i.ItemId,
                i.Quantity,
                i.Unit
            }))
            .ToListAsync();

        var services = actualLines
            .Select(a => new { a.ServiceId, a.ServiceCode, a.ServiceName })
            .Concat(normLines.Select(n => new { n.ServiceId, n.ServiceCode, n.ServiceName }))
            .GroupBy(x => x.ServiceId)
            .Select(g => g.First())
            .ToList();

        var catalog = await LoadCatalogAsync(
            actualLines.Select(a => a.ItemId).Concat(normLines.Select(n => n.ItemId)).Distinct().ToList());

        var byService = new List<ConsumptionByServiceDto>();
        foreach (var service in services)
        {
            var serviceActual = actualLines.Where(a => a.ServiceId == service.ServiceId).ToList();
            var serviceNorm = normLines.Where(n => n.ServiceId == service.ServiceId).ToList();
            var examCount = serviceActual.Select(a => a.PrescriptionId).Distinct().Count();

            var itemIds = serviceActual.Select(a => a.ItemId)
                .Concat(serviceNorm.Select(n => n.ItemId)).Distinct().ToList();

            byService.Add(new ConsumptionByServiceDto
            {
                ServiceId = service.ServiceId,
                ServiceCode = service.ServiceCode,
                ServiceName = service.ServiceName,
                ExamCount = examCount,
                Items = itemIds.Select(itemId =>
                {
                    catalog.TryGetValue(itemId, out var info);
                    var normPerExam = serviceNorm.Where(n => n.ItemId == itemId).Sum(n => n.Quantity);
                    var normTotal = normPerExam * examCount;
                    var actual = serviceActual.Where(a => a.ItemId == itemId).Sum(a => a.Quantity);
                    return new ConsumptionItemDto
                    {
                        ItemId = itemId,
                        ItemCode = info?.Code,
                        ItemName = info?.Name,
                        NormQuantity = normTotal,
                        ActualQuantity = actual,
                        Variance = actual - normTotal,
                        Unit = serviceNorm.FirstOrDefault(n => n.ItemId == itemId)?.Unit ?? info?.Unit
                    };
                })
                .OrderByDescending(x => Math.Abs(x.Variance))
                .ToList()
            });
        }

        return new ConsumptionNormReportDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            ByService = byService.OrderByDescending(s => s.ExamCount).ToList()
        };
    }

    public async Task<RadiologyRevenueReportDto> GetRevenueByBaseCostReportAsync(
        DateTime fromDate,
        DateTime toDate,
        Guid? departmentId = null)
    {
        return await GetRevenueReportAsync(fromDate, toDate, departmentId);
    }

    /// <summary>
    /// Đẩy kết quả đã đọc lên Sở Y tế qua kênh tích hợp HL7/CDA đã khai báo.
    /// Chỉ báo "Success" khi hệ nhận thật sự ACK; mọi trường hợp khác trả lỗi thật.
    /// </summary>
    public async Task<SyncResultToDoHDto> SyncResultToDoHAsync(Guid resultId)
    {
        var reportExists = await _context.RadiologyReports.AnyAsync(r => r.Id == resultId);
        if (!reportExists)
        {
            return new SyncResultToDoHDto
            {
                ResultId = resultId,
                SyncStatus = "Failed",
                SyncTime = DateTime.Now,
                ErrorMessage = "Không tìm thấy kết quả đọc"
            };
        }

        var sent = await SendHL7ResultAsync(resultId, withSignature: true);
        return new SyncResultToDoHDto
        {
            ResultId = resultId,
            SyncStatus = sent.Success ? "Success" : "Failed",
            SyncTime = sent.SentAt,
            ErrorMessage = sent.ErrorMessage,
            DoHTransactionId = sent.Success ? sent.MessageControlId : null
        };
    }

    public async Task<RadiologyStatisticsDto> GetStatisticsAsync(
        DateTime fromDate,
        DateTime toDate,
        string serviceType = null)
    {
        var from = fromDate.Date;
        var to = toDate.Date.AddDays(1).AddTicks(-1);

        var orders = await _context.RadiologyRequests
            .Where(r => r.RequestDate >= from && r.RequestDate <= to && r.Status != 6)
            .Select(r => new
            {
                r.Id,
                r.RequestDate,
                r.Status,
                r.Service.ServiceType,
                ServiceTypeFilterName = r.Service.ServiceName,
                ServiceCode = r.Service.ServiceCode,
                ModalityCode = r.Exams.OrderBy(e => e.ExamDate)
                    .Select(e => _context.RadiologyModalities
                        .Where(m => m.Id == e.ModalityId).Select(m => m.ModalityCode).FirstOrDefault())
                    .FirstOrDefault()
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(serviceType))
        {
            var needle = serviceType.Trim();
            orders = orders.Where(o =>
                string.Equals(o.ModalityCode, needle, StringComparison.OrdinalIgnoreCase) ||
                o.ServiceTypeFilterName.Contains(needle, StringComparison.OrdinalIgnoreCase) ||
                o.ServiceCode.Contains(needle, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var orderIds = orders.Select(o => o.Id).ToList();

        // TAT thật = từ lúc chỉ định tới lúc kết thúc ca chụp. Ca chưa kết thúc không tính.
        var exams = await _context.RadiologyExams
            .Where(e => orderIds.Contains(e.RadiologyRequestId))
            .Select(e => new
            {
                e.RadiologyRequestId,
                e.ExamDate,
                e.Status,
                e.EndTime,
                RequestDate = e.RadiologyRequest.RequestDate,
                e.ModalityId,
                // Sub-query thay vì nav bắt buộc: ca chụp chưa gán máy vẫn được đếm.
                ModalityName = _context.RadiologyModalities
                    .Where(m => m.Id == e.ModalityId).Select(m => m.ModalityName).FirstOrDefault(),
                ModalityType = _context.RadiologyModalities
                    .Where(m => m.Id == e.ModalityId).Select(m => (int?)m.ModalityType).FirstOrDefault()
            })
            .ToListAsync();

        var turnarounds = exams
            .Where(e => e.EndTime.HasValue && e.EndTime.Value > e.RequestDate)
            .Select(e => (decimal)(e.EndTime!.Value - e.RequestDate).TotalMinutes)
            .ToList();

        var completedByDay = exams
            .Where(e => e.Status == 2)
            .GroupBy(e => e.ExamDate.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        var totalOrders = orders.Count;

        return new RadiologyStatisticsDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalOrders = totalOrders,
            TotalExams = exams.Count,
            CompletedExams = orders.Count(o => o.Status >= 3 && o.Status <= 5),
            PendingExams = orders.Count(o => o.Status < 3),
            AverageTATMinutes = turnarounds.Count == 0 ? 0 : Math.Round(turnarounds.Average(), 1),
            ByServiceType = orders
                .GroupBy(o => o.ServiceType)
                .Select(g => new StatisticsByServiceTypeDto
                {
                    ServiceType = g.Key.ToString(),
                    ServiceTypeName = ServiceTypeName(g.Key),
                    ExamCount = g.Count(),
                    CompletedCount = g.Count(o => o.Status >= 3 && o.Status <= 5),
                    Percentage = totalOrders == 0 ? 0 : Math.Round(g.Count() * 100m / totalOrders, 1)
                })
                .OrderByDescending(x => x.ExamCount)
                .ToList(),
            ByDay = orders
                .GroupBy(o => o.RequestDate.Date)
                .Select(g => new StatisticsByDayDto
                {
                    Date = g.Key,
                    ExamCount = g.Count(),
                    CompletedCount = completedByDay.GetValueOrDefault(g.Key)
                })
                .OrderBy(x => x.Date)
                .ToList(),
            ByModality = exams
                .GroupBy(e => new { e.ModalityId, e.ModalityName, e.ModalityType })
                .Select(g => new StatisticsByModalityDto
                {
                    ModalityId = g.Key.ModalityId,
                    ModalityName = g.Key.ModalityName ?? "(chưa gán máy)",
                    ModalityType = g.Key.ModalityType?.ToString() ?? string.Empty,
                    ExamCount = g.Count(),
                    UtilizationPercent = exams.Count == 0
                        ? 0
                        : Math.Round(g.Count() * 100m / exams.Count, 1)
                })
                .OrderByDescending(x => x.ExamCount)
                .ToList()
        };
    }

    /// <summary>
    /// Xuất báo cáo ra file .xlsx thật (OOXML). Loại báo cáo không hỗ trợ thì báo lỗi rõ ràng
    /// thay vì trả file rỗng khiến Excel không mở được.
    /// </summary>
    public async Task<byte[]> ExportReportToExcelAsync(
        string reportType,
        DateTime fromDate,
        DateTime toDate,
        object parameters = null)
    {
        var kind = (reportType ?? string.Empty).Trim().ToLowerInvariant();
        var sheets = kind switch
        {
            "statistics" or "thong-ke" => await BuildStatisticsSheetsAsync(fromDate, toDate),
            "revenue" or "doanh-thu" => await BuildRevenueSheetsAsync(fromDate, toDate),
            "radiology-register" or "so-cdha" => BuildRegisterSheets(
                "Sổ CĐHA", await GetRadiologyRegisterAsync(fromDate, toDate)),
            "ultrasound-register" or "so-sieu-am" => BuildUltrasoundSheets(
                await GetUltrasoundRegisterAsync(fromDate, toDate)),
            "functional-test-register" or "so-tdcn" => BuildFunctionalSheets(
                await GetFunctionalTestRegisterAsync(fromDate, toDate)),
            "consumption-norm" or "dinh-muc" => BuildConsumptionSheets(
                await GetConsumptionNormReportAsync(fromDate, toDate)),
            _ => throw new NotSupportedException(
                $"Chưa hỗ trợ xuất Excel cho loại báo cáo '{reportType}'. " +
                "Loại hợp lệ: statistics, revenue, radiology-register, ultrasound-register, " +
                "functional-test-register, consumption-norm")
        };

        return SimpleXlsxWriter.Build(sheets);
    }

    private async Task<List<XlsxSheet>> BuildStatisticsSheetsAsync(DateTime fromDate, DateTime toDate)
    {
        var stats = await GetStatisticsAsync(fromDate, toDate);
        return new List<XlsxSheet>
        {
            new("Tổng hợp",
                new[] { "Chỉ tiêu", "Giá trị" },
                new List<IReadOnlyList<object?>>
                {
                    new object?[] { "Từ ngày", stats.FromDate },
                    new object?[] { "Đến ngày", stats.ToDate },
                    new object?[] { "Tổng phiếu chỉ định", stats.TotalOrders },
                    new object?[] { "Tổng ca chụp", stats.TotalExams },
                    new object?[] { "Đã hoàn thành", stats.CompletedExams },
                    new object?[] { "Chờ thực hiện", stats.PendingExams },
                    new object?[] { "TAT trung bình (phút)", stats.AverageTATMinutes }
                }),
            new("Theo loại DV",
                new[] { "Mã loại", "Tên loại", "Số phiếu", "Hoàn thành", "Tỷ lệ %" },
                stats.ByServiceType.Select(x => (IReadOnlyList<object?>)new object?[]
                    { x.ServiceType, x.ServiceTypeName, x.ExamCount, x.CompletedCount, x.Percentage }).ToList()),
            new("Theo ngày",
                new[] { "Ngày", "Số phiếu", "Hoàn thành" },
                stats.ByDay.Select(x => (IReadOnlyList<object?>)new object?[]
                    { x.Date, x.ExamCount, x.CompletedCount }).ToList()),
            new("Theo máy",
                new[] { "Tên máy", "Loại máy", "Số ca", "Tỷ trọng %" },
                stats.ByModality.Select(x => (IReadOnlyList<object?>)new object?[]
                    { x.ModalityName, x.ModalityType, x.ExamCount, x.UtilizationPercent }).ToList())
        };
    }

    private async Task<List<XlsxSheet>> BuildRevenueSheetsAsync(DateTime fromDate, DateTime toDate)
    {
        var revenue = await GetRevenueReportAsync(fromDate, toDate);
        return new List<XlsxSheet>
        {
            new("Tổng hợp",
                new[] { "Chỉ tiêu", "Giá trị" },
                new List<IReadOnlyList<object?>>
                {
                    new object?[] { "Từ ngày", revenue.FromDate },
                    new object?[] { "Đến ngày", revenue.ToDate },
                    new object?[] { "Tổng doanh thu", revenue.TotalRevenue },
                    new object?[] { "BHYT chi trả", revenue.InsuranceRevenue },
                    new object?[] { "Người bệnh chi trả", revenue.PatientRevenue },
                    new object?[] { "Số ca", revenue.TotalExams }
                }),
            new("Theo loại DV",
                new[] { "Mã loại", "Tên loại", "Số ca", "Doanh thu", "BHYT", "Người bệnh" },
                revenue.ByServiceType.Select(x => (IReadOnlyList<object?>)new object?[]
                    { x.ServiceType, x.ServiceTypeName, x.ExamCount, x.Revenue, x.InsuranceRevenue, x.PatientRevenue }).ToList()),
            new("Theo ngày",
                new[] { "Ngày", "Số ca", "Doanh thu" },
                revenue.ByDay.Select(x => (IReadOnlyList<object?>)new object?[]
                    { x.Date, x.ExamCount, x.Revenue }).ToList()),
            new("Theo bác sĩ",
                new[] { "Bác sĩ chỉ định", "Số ca", "Doanh thu" },
                revenue.ByDoctor.Select(x => (IReadOnlyList<object?>)new object?[]
                    { x.DoctorName, x.ExamCount, x.Revenue }).ToList())
        };
    }

    private static List<XlsxSheet> BuildRegisterSheets(string sheetName, RadiologyRegisterDto register) =>
        new()
        {
            new(sheetName,
                new[] { "STT", "Ngày thực hiện", "Mã BN", "Họ tên", "Tuổi", "Giới", "Địa chỉ",
                        "Dịch vụ", "Vùng chụp", "Máy", "Mô tả", "Kết luận", "KTV", "Bác sĩ" },
                register.Items.Select(x => (IReadOnlyList<object?>)new object?[]
                {
                    x.RowNumber, x.ExamDate, x.PatientCode, x.PatientName, x.Age, x.Gender, x.Address,
                    x.ServiceName, x.BodyPart, x.Technique, x.Description, x.Conclusion,
                    x.TechnicianName, x.DoctorName
                }).ToList())
        };

    private static List<XlsxSheet> BuildUltrasoundSheets(UltrasoundRegisterDto register) =>
        new()
        {
            new("Sổ siêu âm",
                new[] { "STT", "Ngày thực hiện", "Mã BN", "Họ tên", "Tuổi", "Giới", "Địa chỉ",
                        "Loại siêu âm", "Chẩn đoán", "Kết luận", "Bác sĩ", "Ghi chú" },
                register.Items.Select(x => (IReadOnlyList<object?>)new object?[]
                {
                    x.RowNumber, x.ExamDate, x.PatientCode, x.PatientName, x.Age, x.Gender, x.Address,
                    x.ExamType, x.Diagnosis, x.Conclusion, x.DoctorName, x.Note
                }).ToList())
        };

    private static List<XlsxSheet> BuildFunctionalSheets(FunctionalTestRegisterDto register) =>
        new()
        {
            new("Sổ TDCN",
                new[] { "STT", "Ngày thực hiện", "Mã BN", "Họ tên", "Tuổi", "Giới",
                        "Loại thăm dò", "Mô tả", "Kết luận", "KTV", "Bác sĩ" },
                register.Items.Select(x => (IReadOnlyList<object?>)new object?[]
                {
                    x.RowNumber, x.ExamDate, x.PatientCode, x.PatientName, x.Age, x.Gender,
                    x.TestType, x.Description, x.Conclusion, x.TechnicianName, x.DoctorName
                }).ToList())
        };

    private static List<XlsxSheet> BuildConsumptionSheets(ConsumptionNormReportDto report) =>
        new()
        {
            new("Định mức tiêu hao",
                new[] { "Mã DV", "Tên DV", "Số ca", "Mã VT", "Tên VT", "ĐVT",
                        "Định mức", "Thực dùng", "Chênh lệch" },
                report.ByService.SelectMany(s => s.Items.Select(i => (IReadOnlyList<object?>)new object?[]
                {
                    s.ServiceCode, s.ServiceName, s.ExamCount, i.ItemCode, i.ItemName, i.Unit,
                    i.NormQuantity, i.ActualQuantity, i.Variance
                })).ToList())
        };

    #endregion

    #region F2.8 Favorite — Ca chup yeu thich

    public async Task<FavoriteToggleResultDto> ToggleFavoriteAsync(Guid requestId, Guid userId)
    {
        var existing = await _context.RadiologyStudyFavorites
            .FirstOrDefaultAsync(f => f.RequestId == requestId && f.UserId == userId);

        if (existing != null)
        {
            _context.RadiologyStudyFavorites.Remove(existing);
            await _context.SaveChangesAsync();
            return new FavoriteToggleResultDto { IsFavorited = false, RequestId = requestId };
        }

        var favorite = new RadiologyStudyFavorite
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RequestId = requestId,
            CreatedAt = DateTime.UtcNow,
        };
        _context.RadiologyStudyFavorites.Add(favorite);
        await _context.SaveChangesAsync();
        return new FavoriteToggleResultDto { IsFavorited = true, RequestId = requestId };
    }

    public async Task<List<RadiologyFavoriteDto>> GetFavoritesAsync(Guid userId)
    {
        var favorites = await _context.RadiologyStudyFavorites
            .Where(f => f.UserId == userId)
            .Join(_context.RadiologyRequests,
                f => f.RequestId,
                r => r.Id,
                (f, r) => new { f, r })
            .Join(_context.Patients,
                x => x.r.PatientId,
                p => p.Id,
                (x, p) => new { x.f, x.r, p })
            .Join(_context.Services,
                x => x.r.ServiceId,
                s => s.Id,
                (x, s) => new RadiologyFavoriteDto
                {
                    Id = x.f.Id,
                    UserId = x.f.UserId,
                    RequestId = x.f.RequestId,
                    RequestCode = x.r.RequestCode,
                    PatientName = x.p.FullName,
                    PatientCode = x.p.PatientCode,
                    ServiceName = s.ServiceName,
                    RequestDate = x.r.RequestDate,
                    Status = x.r.Status,
                    CreatedAt = x.f.CreatedAt,
                })
            .OrderByDescending(dto => dto.CreatedAt)
            .ToBoundedListAsync("RIS.GetFavorites");

        return favorites;
    }

    public async Task<bool> IsFavoritedAsync(Guid requestId, Guid userId)
    {
        return await _context.RadiologyStudyFavorites
            .AnyAsync(f => f.RequestId == requestId && f.UserId == userId);
    }

    #endregion
}
