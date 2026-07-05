using HIS.Application.Common;
using HIS.Application.DTOs.OfficeSupply;
using HIS.Application.Interfaces;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Logic VPP / TTB văn phòng — phê duyệt cấp phát văn phòng phẩm (N1.12), tách khỏi
/// OfficeSupplyController (#202 thin-controller). Behavior-preserving: mọi query/projection/
/// business math/response shape/status code/message giữ NGUYÊN; userId truyền từ controller
/// (thay cho GetUserId() cũ đọc claim). Return map về ServiceOutcome (controller → IActionResult).
/// Dùng chung PharmacyApproval infrastructure nhưng scope về MedicalSupply.IsMedical = false.
/// </summary>
public class OfficeSupplyService : IOfficeSupplyService
{
    private readonly HISDbContext _db;
    public OfficeSupplyService(HISDbContext db) { _db = db; }

    /// <summary>Danh sách vật tư văn phòng cho picker.</summary>
    public async Task<ServiceOutcome> CatalogAsync(string? keyword, int? supplyType)
    {
        var q = _db.MedicalSupplies.Where(s => !s.IsMedical && s.IsActive);
        if (supplyType.HasValue) q = q.Where(s => s.SupplyType == supplyType.Value);
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim();
            q = q.Where(s => s.SupplyCode.Contains(kw) || s.SupplyName.Contains(kw)
                || (s.Manufacturer != null && s.Manufacturer.Contains(kw)));
        }
        var list = await q.OrderBy(s => s.SupplyName).Take(200).ToListAsync();
        return ServiceOutcome.Ok(list.Select(s => new
        {
            s.Id, s.SupplyCode, s.SupplyName, s.SupplyType, s.Unit, s.Specification,
            s.Manufacturer, s.UnitPrice,
        }));
    }

    /// <summary>Danh sách phiếu yêu cầu VPP theo trạng thái.</summary>
    public async Task<ServiceOutcome> RequestsAsync(int? status, Guid? departmentId)
    {
        var q = _db.Set<PharmacyApproval>()
            .Include(a => a.FromDepartment)
            .Include(a => a.ToWarehouse)
            .Include(a => a.Items).ThenInclude(i => i.Supply)
            .Where(a => a.ApprovalType == 4 // Duyệt cấp hao phí theo khoa (reuse for office supplies)
                && a.Items.Any(i => i.Supply != null && !i.Supply.IsMedical));
        if (status.HasValue) q = q.Where(a => a.Status == status.Value);
        if (departmentId.HasValue) q = q.Where(a => a.FromDepartmentId == departmentId.Value);

        var list = await q.OrderByDescending(a => a.RequestDate).Take(200).ToListAsync();
        return ServiceOutcome.Ok(list.Select(a => new
        {
            a.Id, a.ApprovalCode, a.RequestDate,
            DepartmentName = a.FromDepartment != null ? a.FromDepartment.DepartmentName : null,
            WarehouseName = a.ToWarehouse != null ? a.ToWarehouse.WarehouseName : null,
            a.Status, a.Note,
            totalItems = a.Items.Count,
            totalAmount = a.Items.Sum(i => i.RequestedQuantity * i.UnitPrice),
            items = a.Items.Select(i => new
            {
                i.Id, i.SupplyId,
                SupplyCode = i.Supply != null ? i.Supply.SupplyCode : null,
                SupplyName = i.Supply != null ? i.Supply.SupplyName : null,
                i.RequestedQuantity, i.ApprovedQuantity, i.Unit, i.UnitPrice,
                Amount = i.RequestedQuantity * i.UnitPrice,
                i.Note,
            }),
        }));
    }



    /// <summary>Tạo phiếu yêu cầu VPP (status = 2 Đã chuyển).</summary>
    public async Task<ServiceOutcome> CreateRequestAsync(CreateOfficeRequestDto dto, Guid userId)
    {
        if (dto.Items.Count == 0)
            return ServiceOutcome.Bad("Chưa chọn vật tư");

        var supplies = await _db.MedicalSupplies
            .Where(s => dto.Items.Select(x => x.SupplyId).Contains(s.Id))
            .ToListAsync();
        if (supplies.Any(s => s.IsMedical))
            return ServiceOutcome.Bad("Phiếu này chỉ chứa VPP/TTB văn phòng");

        var now = DateTime.Now;
        var uid = userId;

        var approval = new PharmacyApproval
        {
            Id = Guid.NewGuid(),
            ApprovalCode = $"VPP{now:yyyyMMddHHmmss}",
            ApprovalType = 4,
            FromDepartmentId = dto.DepartmentId,
            ToWarehouseId = dto.WarehouseId,
            RequestDate = now,
            Status = 2, // Đã chuyển -> chờ duyệt
            RequestedBy = uid,
            RequestedAt = now,
            SubmittedBy = uid,
            SubmittedAt = now,
            Note = dto.Note,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        };
        _db.Set<PharmacyApproval>().Add(approval);

        foreach (var it in dto.Items)
        {
            _db.Set<PharmacyApprovalItem>().Add(new PharmacyApprovalItem
            {
                Id = Guid.NewGuid(),
                PharmacyApprovalId = approval.Id,
                SupplyId = it.SupplyId,
                RequestedQuantity = it.RequestedQuantity,
                ApprovedQuantity = 0,
                Unit = it.Unit,
                UnitPrice = it.UnitPrice,
                Amount = it.RequestedQuantity * it.UnitPrice,
                Note = it.Note,
                ObjectType = "HaoPhi",
                CreatedAt = now,
                CreatedBy = uid.ToString(),
            });
        }

        _db.Set<PharmacyApprovalLog>().Add(new PharmacyApprovalLog
        {
            Id = Guid.NewGuid(),
            PharmacyApprovalId = approval.Id,
            FromStatus = 1, ToStatus = 2,
            Action = "Submit",
            ActorId = uid,
            ActedAt = now,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        });

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { approval.Id, approval.ApprovalCode });
    }

    /// <summary>Thu hồi phiếu yêu cầu VPP — đưa về trạng thái Nháp (1) để chỉnh sửa lại.</summary>
    public async Task<ServiceOutcome> RecallAsync(Guid id, string? note, Guid userId)
    {
        var approval = await _db.Set<PharmacyApproval>().FirstOrDefaultAsync(a => a.Id == id);
        if (approval == null) return ServiceOutcome.NotFound();
        if (approval.Status != 2)
            return ServiceOutcome.Bad("Chỉ thu hồi được phiếu đang ở trạng thái Chờ duyệt");

        var uid = userId;
        var now = DateTime.Now;
        approval.Status = 1; // Nháp — cho phép chỉnh sửa và gửi lại
        approval.UpdatedAt = now;
        approval.UpdatedBy = uid.ToString();

        _db.Set<PharmacyApprovalLog>().Add(new PharmacyApprovalLog
        {
            Id = Guid.NewGuid(),
            PharmacyApprovalId = approval.Id,
            FromStatus = 2, ToStatus = 1,
            Action = "Recall",
            ActorId = uid,
            ActedAt = now,
            Note = note,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        });

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { id, status = 1 });
    }


    /// <summary>Duyệt phiếu VPP — trừ tồn + tạo ExportReceipt.</summary>
    public async Task<ServiceOutcome> ApproveAsync(ApproveOfficeDto dto, Guid userId)
    {
        var approval = await _db.Set<PharmacyApproval>()
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == dto.Id);
        if (approval == null) return ServiceOutcome.NotFound();
        if (approval.Status != 2)
            return ServiceOutcome.Bad("Phiếu không ở trạng thái chờ duyệt");
        if (!approval.ToWarehouseId.HasValue)
            return ServiceOutcome.Bad("Phiếu chưa gán kho xuất");

        var warehouseId = approval.ToWarehouseId.Value;
        var now = DateTime.Now;
        var uid = userId;

        var export = new ExportReceipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"XVPP{now:yyyyMMddHHmmss}",
            ReceiptDate = now,
            WarehouseId = warehouseId,
            ExportType = 1, // Generic out; dept-specific code
            ToDepartmentId = approval.FromDepartmentId,
            Status = 1,
            Note = $"VPP/TTB VP - phiếu {approval.ApprovalCode}",
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        };

        decimal total = 0;
        foreach (var item in approval.Items)
        {
            var qty = dto.ApprovedQuantities != null && dto.ApprovedQuantities.TryGetValue(item.Id, out var q)
                ? q
                : item.RequestedQuantity;
            if (qty <= 0) continue;

            var stocks = await _db.InventoryItems
                .Where(i => i.WarehouseId == warehouseId && i.SupplyId == item.SupplyId
                    && (i.Quantity - i.ReservedQuantity) > 0)
                .OrderBy(i => i.ExpiryDate)
                .ToListAsync();
            var remaining = qty;
            foreach (var stock in stocks)
            {
                if (remaining <= 0) break;
                var take = Math.Min(remaining, stock.Quantity - stock.ReservedQuantity);
                if (take <= 0) continue;
                stock.Quantity -= take;
                remaining -= take;
                var amount = take * item.UnitPrice;
                total += amount;

                _db.ExportReceiptDetails.Add(new ExportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ExportReceiptId = export.Id,
                    SupplyId = item.SupplyId,
                    InventoryItemId = stock.Id,
                    BatchNumber = stock.BatchNumber,
                    ExpiryDate = stock.ExpiryDate,
                    Quantity = take,
                    Unit = item.Unit,
                    UnitPrice = item.UnitPrice,
                    Amount = amount,
                    CreatedAt = now,
                    CreatedBy = uid.ToString(),
                });
            }
            if (remaining > 0)
                return ServiceOutcome.Bad($"Không đủ tồn cho vật tư {item.SupplyId}. Thiếu {remaining}.");

            item.ApprovedQuantity = qty;
            item.UpdatedAt = now;
            item.UpdatedBy = uid.ToString();
        }

        export.TotalAmount = total;
        _db.ExportReceipts.Add(export);

        approval.Status = 3;
        approval.ApprovedBy = uid;
        approval.ApprovedAt = now;
        approval.UpdatedAt = now;
        approval.UpdatedBy = uid.ToString();

        _db.Set<PharmacyApprovalLog>().Add(new PharmacyApprovalLog
        {
            Id = Guid.NewGuid(),
            PharmacyApprovalId = approval.Id,
            FromStatus = 2, ToStatus = 3,
            Action = "Approve",
            ActorId = uid,
            ActedAt = now,
            Note = dto.Note,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        });

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { approval.Id, approval.Status, exportReceiptId = export.Id });
    }

    // ===== HOÀN TRẢ VPP =====

    /// <summary>Danh sách phiếu hoàn trả VPP.</summary>
    public async Task<ServiceOutcome> ReturnsAsync(int? status, Guid? departmentId)
    {
        var q = _db.Set<PharmacyApproval>()
            .Include(a => a.FromDepartment)
            .Include(a => a.ToWarehouse)
            .Include(a => a.Items).ThenInclude(i => i.Supply)
            .Where(a => a.ApprovalType == 5 // Hoàn trả VPP
                && a.Items.Any(i => i.Supply != null && !i.Supply.IsMedical));
        if (status.HasValue) q = q.Where(a => a.Status == status.Value);
        if (departmentId.HasValue) q = q.Where(a => a.FromDepartmentId == departmentId.Value);

        var list = await q.OrderByDescending(a => a.RequestDate).Take(200).ToListAsync();
        return ServiceOutcome.Ok(list.Select(a => new
        {
            a.Id, a.ApprovalCode, a.RequestDate,
            DepartmentName = a.FromDepartment != null ? a.FromDepartment.DepartmentName : null,
            WarehouseName = a.ToWarehouse != null ? a.ToWarehouse.WarehouseName : null,
            a.Status, a.Note,
            totalItems = a.Items.Count,
            totalAmount = a.Items.Sum(i => i.RequestedQuantity * i.UnitPrice),
            items = a.Items.Select(i => new
            {
                i.Id, i.SupplyId,
                SupplyCode = i.Supply != null ? i.Supply.SupplyCode : null,
                SupplyName = i.Supply != null ? i.Supply.SupplyName : null,
                i.RequestedQuantity, i.ApprovedQuantity, i.Unit, i.UnitPrice,
                Amount = i.RequestedQuantity * i.UnitPrice, i.Note,
            }),
        }));
    }


    /// <summary>Tạo phiếu yêu cầu hoàn trả VPP.</summary>
    public async Task<ServiceOutcome> CreateReturnAsync(CreateReturnDto dto, Guid userId)
    {
        if (dto.Items.Count == 0)
            return ServiceOutcome.Bad("Chưa chọn vật tư hoàn trả");

        var now = DateTime.Now;
        var uid = userId;

        var approval = new PharmacyApproval
        {
            Id = Guid.NewGuid(),
            ApprovalCode = $"HTV{now:yyyyMMddHHmmss}",
            ApprovalType = 5, // Hoàn trả VPP
            FromDepartmentId = dto.DepartmentId,
            ToWarehouseId = dto.WarehouseId,
            RequestDate = now,
            Status = 2, // Chờ duyệt
            RequestedBy = uid,
            RequestedAt = now,
            SubmittedBy = uid,
            SubmittedAt = now,
            Note = dto.Note,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        };
        _db.Set<PharmacyApproval>().Add(approval);

        foreach (var it in dto.Items)
        {
            _db.Set<PharmacyApprovalItem>().Add(new PharmacyApprovalItem
            {
                Id = Guid.NewGuid(),
                PharmacyApprovalId = approval.Id,
                SupplyId = it.SupplyId,
                RequestedQuantity = it.RequestedQuantity,
                ApprovedQuantity = 0,
                Unit = it.Unit,
                UnitPrice = it.UnitPrice,
                Amount = it.RequestedQuantity * it.UnitPrice,
                Note = it.Note,
                ObjectType = "HoanTra",
                CreatedAt = now,
                CreatedBy = uid.ToString(),
            });
        }

        _db.Set<PharmacyApprovalLog>().Add(new PharmacyApprovalLog
        {
            Id = Guid.NewGuid(),
            PharmacyApprovalId = approval.Id,
            FromStatus = 1, ToStatus = 2,
            Action = "SubmitReturn",
            ActorId = uid,
            ActedAt = now,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        });

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { approval.Id, approval.ApprovalCode });
    }


    /// <summary>Duyệt phiếu hoàn trả — nhập lại tồn kho.</summary>
    public async Task<ServiceOutcome> ApproveReturnAsync(ApproveReturnDto dto, Guid userId)
    {
        var approval = await _db.Set<PharmacyApproval>()
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == dto.Id && a.ApprovalType == 5);
        if (approval == null) return ServiceOutcome.NotFound();
        if (approval.Status != 2)
            return ServiceOutcome.Bad("Phiếu không ở trạng thái chờ duyệt");
        if (!approval.ToWarehouseId.HasValue)
            return ServiceOutcome.Bad("Phiếu chưa gán kho nhập");

        var warehouseId = approval.ToWarehouseId.Value;
        var now = DateTime.Now;
        var uid = userId;

        // Nhập lại tồn kho: tìm batch phù hợp hoặc tạo mới
        foreach (var item in approval.Items)
        {
            var qty = dto.ApprovedQuantities != null && dto.ApprovedQuantities.TryGetValue(item.Id, out var q)
                ? q
                : item.RequestedQuantity;
            if (qty <= 0) continue;

            // Cộng lại vào tồn hiện tại (batch mới không có hạn dùng)
            var existing = await _db.InventoryItems
                .Where(i => i.WarehouseId == warehouseId && i.SupplyId == item.SupplyId)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                existing.Quantity += qty;
                existing.UpdatedAt = now;
            }
            else
            {
                _db.InventoryItems.Add(new InventoryItem
                {
                    Id = Guid.NewGuid(),
                    WarehouseId = warehouseId,
                    SupplyId = item.SupplyId,
                    ItemType = "Supply",
                    Quantity = qty,
                    ReservedQuantity = 0,
                    UnitPrice = item.UnitPrice,
                    BatchNumber = $"HTV-{now:yyyyMMdd}",
                    CreatedAt = now,
                    CreatedBy = uid.ToString(),
                });
            }

            item.ApprovedQuantity = qty;
            item.UpdatedAt = now;
            item.UpdatedBy = uid.ToString();
        }

        approval.Status = 3; // Đã duyệt
        approval.ApprovedBy = uid;
        approval.ApprovedAt = now;
        approval.UpdatedAt = now;
        approval.UpdatedBy = uid.ToString();

        _db.Set<PharmacyApprovalLog>().Add(new PharmacyApprovalLog
        {
            Id = Guid.NewGuid(),
            PharmacyApprovalId = approval.Id,
            FromStatus = 2, ToStatus = 3,
            Action = "ApproveReturn",
            ActorId = uid,
            ActedAt = now,
            Note = dto.Note,
            CreatedAt = now,
            CreatedBy = uid.ToString(),
        });

        await _db.SaveChangesAsync();
        return ServiceOutcome.Ok(new { approval.Id, approval.Status });
    }
}
