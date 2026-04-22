using System.Security.Claims;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HIS.API.Controllers;

/// <summary>
/// VPP / TTB văn phòng — phê duyệt cấp phát văn phòng phẩm (N1.12).
/// Dùng chung PharmacyApproval infrastructure nhưng scope về MedicalSupply.IsMedical = false.
/// </summary>
[ApiController]
[Route("api/office-supply")]
[Authorize]
public class OfficeSupplyController : ControllerBase
{
    private readonly HISDbContext _db;
    public OfficeSupplyController(HISDbContext db) { _db = db; }

    private Guid GetUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Danh sách vật tư văn phòng cho picker.</summary>
    [HttpGet("catalog")]
    public async Task<IActionResult> Catalog([FromQuery] string? keyword, [FromQuery] int? supplyType)
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
        return Ok(list.Select(s => new
        {
            s.Id, s.SupplyCode, s.SupplyName, s.SupplyType, s.Unit, s.Specification,
            s.Manufacturer, s.UnitPrice,
        }));
    }

    /// <summary>Danh sách phiếu yêu cầu VPP theo trạng thái.</summary>
    [HttpGet("requests")]
    public async Task<IActionResult> Requests([FromQuery] int? status, [FromQuery] Guid? departmentId)
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
        return Ok(list.Select(a => new
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

    public class OfficeRequestItemDto
    {
        public Guid SupplyId { get; set; }
        public decimal RequestedQuantity { get; set; }
        public string? Unit { get; set; }
        public decimal UnitPrice { get; set; }
        public string? Note { get; set; }
    }

    public class CreateOfficeRequestDto
    {
        public Guid DepartmentId { get; set; }
        public Guid WarehouseId { get; set; }
        public List<OfficeRequestItemDto> Items { get; set; } = new();
        public string? Note { get; set; }
    }

    /// <summary>Tạo phiếu yêu cầu VPP (status = 2 Đã chuyển).</summary>
    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest([FromBody] CreateOfficeRequestDto dto)
    {
        if (dto.Items.Count == 0)
            return BadRequest(new { message = "Chưa chọn vật tư" });

        var supplies = await _db.MedicalSupplies
            .Where(s => dto.Items.Select(x => x.SupplyId).Contains(s.Id))
            .ToListAsync();
        if (supplies.Any(s => s.IsMedical))
            return BadRequest(new { message = "Phiếu này chỉ chứa VPP/TTB văn phòng" });

        var now = DateTime.Now;
        var uid = GetUserId();

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
        return Ok(new { approval.Id, approval.ApprovalCode });
    }

    public class ApproveOfficeDto
    {
        public Guid Id { get; set; }
        /// <summary>SupplyApprovalItemId → quantity approved; if omitted, approves RequestedQuantity</summary>
        public Dictionary<Guid, decimal>? ApprovedQuantities { get; set; }
        public string? Note { get; set; }
    }

    /// <summary>Duyệt phiếu VPP — trừ tồn + tạo ExportReceipt.</summary>
    [HttpPost("requests/approve")]
    [Authorize(Roles = "Admin,WarehouseManager,WarehouseStaff")]
    public async Task<IActionResult> Approve([FromBody] ApproveOfficeDto dto)
    {
        var approval = await _db.Set<PharmacyApproval>()
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == dto.Id);
        if (approval == null) return NotFound();
        if (approval.Status != 2)
            return BadRequest(new { message = "Phiếu không ở trạng thái chờ duyệt" });
        if (!approval.ToWarehouseId.HasValue)
            return BadRequest(new { message = "Phiếu chưa gán kho xuất" });

        var warehouseId = approval.ToWarehouseId.Value;
        var now = DateTime.Now;
        var uid = GetUserId();

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
                return BadRequest(new { message = $"Không đủ tồn cho vật tư {item.SupplyId}. Thiếu {remaining}." });

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
        return Ok(new { approval.Id, approval.Status, exportReceiptId = export.Id });
    }
}
