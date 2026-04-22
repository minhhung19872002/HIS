using HIS.Application.DTOs.Pharmacy;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HIS.Infrastructure.Services;

public class PharmacyApprovalService : IPharmacyApprovalService
{
    private readonly HISDbContext _db;
    private readonly ILogger<PharmacyApprovalService> _logger;

    public PharmacyApprovalService(HISDbContext db, ILogger<PharmacyApprovalService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<PharmacyApprovalDto> CreateAsync(CreatePharmacyApprovalDto dto, Guid userId)
    {
        ValidateType(dto.ApprovalType);
        var approval = new PharmacyApproval
        {
            Id = Guid.NewGuid(),
            ApprovalCode = $"DUYET{DateTime.Now:yyyyMMddHHmmssfff}",
            ApprovalType = dto.ApprovalType,
            FromDepartmentId = dto.FromDepartmentId,
            ToWarehouseId = dto.ToWarehouseId,
            FromWarehouseId = dto.FromWarehouseId,
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            LockedObject = dto.LockedObject,
            RequestDate = DateTime.Now,
            Status = 0,
            RequestedBy = userId,
            RequestedAt = DateTime.UtcNow,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId.ToString()
        };

        foreach (var it in dto.Items)
        {
            approval.Items.Add(new PharmacyApprovalItem
            {
                Id = Guid.NewGuid(),
                PharmacyApprovalId = approval.Id,
                MedicineId = it.MedicineId,
                SupplyId = it.SupplyId,
                InventoryItemId = it.InventoryItemId,
                BatchNumber = it.BatchNumber,
                ExpiryDate = it.ExpiryDate,
                RequestedQuantity = it.RequestedQuantity,
                ApprovedQuantity = it.RequestedQuantity,
                Unit = it.Unit,
                UnitPrice = it.UnitPrice,
                Amount = it.UnitPrice * it.RequestedQuantity,
                ObjectType = it.ObjectType ?? dto.LockedObject,
                UsageInstruction = it.UsageInstruction,
                Note = it.Note,
                CreatedAt = DateTime.UtcNow
            });
        }

        _db.PharmacyApprovals.Add(approval);
        LogTransition(approval.Id, -1, approval.Status, "Create", userId, dto.Note);
        await _db.SaveChangesAsync();
        return await MapAsync(approval.Id);
    }

    public async Task<PharmacyApprovalDto> UpdateAsync(Guid id, CreatePharmacyApprovalDto dto, Guid userId)
    {
        var approval = await _db.PharmacyApprovals
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Phiếu duyệt không tồn tại");
        if (approval.Status >= 3)
            throw new InvalidOperationException("Phiếu đã duyệt, không thể sửa. Thu hồi duyệt trước.");

        approval.LockedObject = dto.LockedObject ?? approval.LockedObject;
        approval.Note = dto.Note;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();

        _db.PharmacyApprovalItems.RemoveRange(approval.Items);
        foreach (var it in dto.Items)
        {
            _db.PharmacyApprovalItems.Add(new PharmacyApprovalItem
            {
                Id = Guid.NewGuid(),
                PharmacyApprovalId = approval.Id,
                MedicineId = it.MedicineId,
                SupplyId = it.SupplyId,
                InventoryItemId = it.InventoryItemId,
                BatchNumber = it.BatchNumber,
                ExpiryDate = it.ExpiryDate,
                RequestedQuantity = it.RequestedQuantity,
                ApprovedQuantity = it.RequestedQuantity,
                Unit = it.Unit,
                UnitPrice = it.UnitPrice,
                Amount = it.UnitPrice * it.RequestedQuantity,
                ObjectType = it.ObjectType ?? approval.LockedObject,
                UsageInstruction = it.UsageInstruction,
                Note = it.Note,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _db.SaveChangesAsync();
        return await MapAsync(approval.Id);
    }

    public async Task<bool> DeleteDraftAsync(Guid id, Guid userId)
    {
        var approval = await _db.PharmacyApprovals.FirstOrDefaultAsync(a => a.Id == id)
            ?? throw new KeyNotFoundException("Phiếu duyệt không tồn tại");
        if (approval.Status >= 2)
            throw new InvalidOperationException("Chỉ xóa phiếu đang nhập/chưa nhập. Phiếu đã chuyển hoặc đã duyệt không xóa được.");
        approval.IsDeleted = true;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<PharmacyApprovalDto> SubmitAsync(SubmitApprovalDto dto, Guid userId)
    {
        var approval = await _db.PharmacyApprovals
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == dto.ApprovalId)
            ?? throw new KeyNotFoundException("Phiếu duyệt không tồn tại");
        if (approval.Status != 0 && approval.Status != 1)
            throw new InvalidOperationException("Chỉ gửi phiếu đang nhập/chưa nhập");
        if (approval.Items.Count == 0)
            throw new InvalidOperationException("Phiếu rỗng — thêm ít nhất 1 dòng");

        var oldStatus = approval.Status;
        approval.Status = 2;
        approval.SubmittedBy = userId;
        approval.SubmittedAt = DateTime.UtcNow;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();

        LogTransition(approval.Id, oldStatus, 2, "Submit", userId, dto.Note);
        await _db.SaveChangesAsync();
        return await MapAsync(approval.Id);
    }

    public async Task<PharmacyApprovalDto> ApproveAsync(ApproveDto dto, Guid userId)
    {
        var approval = await _db.PharmacyApprovals
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == dto.ApprovalId)
            ?? throw new KeyNotFoundException("Phiếu duyệt không tồn tại");
        if (approval.Status != 2)
            throw new InvalidOperationException("Chỉ duyệt phiếu đã chuyển (status=2)");

        foreach (var patch in dto.Items)
        {
            var item = approval.Items.FirstOrDefault(x => x.Id == patch.ItemId);
            if (item == null) continue;
            item.ApprovedQuantity = patch.IsExcluded ? 0 : patch.ApprovedQuantity;
            item.IsExcluded = patch.IsExcluded;
            item.Amount = item.UnitPrice * item.ApprovedQuantity;
            item.UpdatedAt = DateTime.UtcNow;
        }

        // Khi duyệt: trừ tồn từ InventoryItem theo ApprovedQuantity
        foreach (var item in approval.Items.Where(i => !i.IsExcluded && i.ApprovedQuantity > 0))
        {
            if (item.InventoryItemId.HasValue)
            {
                var inv = await _db.InventoryItems.FirstOrDefaultAsync(x => x.Id == item.InventoryItemId.Value);
                if (inv != null)
                {
                    if (inv.Quantity < item.ApprovedQuantity)
                        throw new InvalidOperationException(
                            $"Tồn kho không đủ cho {item.MedicineId}: cần {item.ApprovedQuantity}, còn {inv.Quantity}");
                    inv.Quantity -= item.ApprovedQuantity;
                    inv.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        approval.Status = 3;
        approval.ApprovedBy = userId;
        approval.ApprovedAt = DateTime.UtcNow;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();

        LogTransition(approval.Id, 2, 3, "Approve", userId, dto.Note);
        await _db.SaveChangesAsync();
        _logger.LogInformation(
            "User {UserId} approved PharmacyApproval {Id} type={Type}",
            userId, approval.Id, approval.ApprovalType);
        return await MapAsync(approval.Id);
    }

    public async Task<PharmacyApprovalDto> RevokeAsync(RevokeApprovalDto dto, Guid userId)
    {
        var approval = await _db.PharmacyApprovals
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == dto.ApprovalId)
            ?? throw new KeyNotFoundException("Phiếu duyệt không tồn tại");
        if (approval.Status != 3)
            throw new InvalidOperationException("Chỉ thu hồi phiếu đã duyệt");
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Lý do thu hồi bắt buộc");

        // Hoàn lại tồn kho
        foreach (var item in approval.Items.Where(i => !i.IsExcluded && i.ApprovedQuantity > 0))
        {
            if (item.InventoryItemId.HasValue)
            {
                var inv = await _db.InventoryItems.FirstOrDefaultAsync(x => x.Id == item.InventoryItemId.Value);
                if (inv != null)
                {
                    inv.Quantity += item.ApprovedQuantity;
                    inv.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        approval.Status = 4;
        approval.RevokedBy = userId;
        approval.RevokedAt = DateTime.UtcNow;
        approval.RevokeReason = dto.Reason;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();

        LogTransition(approval.Id, 3, 4, "Revoke", userId, dto.Reason);
        await _db.SaveChangesAsync();
        _logger.LogWarning(
            "User {UserId} revoked PharmacyApproval {Id}: {Reason}",
            userId, approval.Id, dto.Reason);
        return await MapAsync(approval.Id);
    }

    public async Task<PharmacyApprovalDto?> GetByIdAsync(Guid id) => await MapAsync(id);

    public async Task<PharmacyApprovalSearchResultDto> SearchAsync(PharmacyApprovalSearchDto dto)
    {
        var q = _db.PharmacyApprovals
            .Include(a => a.Patient)
            .Include(a => a.FromDepartment)
            .Include(a => a.ToWarehouse)
            .Include(a => a.Items)
            .AsQueryable();

        if (dto.ApprovalType.HasValue) q = q.Where(a => a.ApprovalType == dto.ApprovalType.Value);
        if (dto.Status.HasValue) q = q.Where(a => a.Status == dto.Status.Value);
        if (dto.FromDepartmentId.HasValue) q = q.Where(a => a.FromDepartmentId == dto.FromDepartmentId);
        if (dto.ToWarehouseId.HasValue) q = q.Where(a => a.ToWarehouseId == dto.ToWarehouseId);
        if (dto.PatientId.HasValue) q = q.Where(a => a.PatientId == dto.PatientId);
        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var kw = dto.Keyword.Trim();
            q = q.Where(a => a.ApprovalCode.Contains(kw)
                || (a.Note != null && a.Note.Contains(kw))
                || (a.Patient != null && a.Patient.FullName!.Contains(kw)));
        }
        if (dto.FromDate.HasValue) q = q.Where(a => a.RequestDate >= dto.FromDate.Value);
        if (dto.ToDate.HasValue) q = q.Where(a => a.RequestDate <= dto.ToDate.Value.AddDays(1));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((dto.PageIndex - 1) * dto.PageSize)
            .Take(dto.PageSize)
            .ToListAsync();

        return new PharmacyApprovalSearchResultDto
        {
            Items = items.Select(MapToDtoInline).ToList(),
            TotalCount = total,
            PageIndex = dto.PageIndex,
            PageSize = dto.PageSize
        };
    }

    public async Task<List<ExpiringMedicineDto>> GetExpiringMedicinesAsync(int daysAhead)
    {
        var threshold = DateTime.Today.AddDays(daysAhead);
        var today = DateTime.Today;

        var items = await _db.InventoryItems
            .Include(i => i.Medicine)
            .Include(i => i.Warehouse)
            .Where(i => i.ExpiryDate.HasValue
                && i.ExpiryDate.Value <= threshold
                && i.Quantity > 0
                && i.MedicineId.HasValue)
            .OrderBy(i => i.ExpiryDate)
            .Take(500)
            .ToListAsync();

        return items.Select(i =>
        {
            var daysLeft = i.ExpiryDate.HasValue ? (int)(i.ExpiryDate.Value - today).TotalDays : (int?)null;
            var severity = daysLeft switch
            {
                null => "info",
                < 0 => "expired",
                <= 7 => "critical",
                <= 30 => "warning",
                _ => "info"
            };
            return new ExpiringMedicineDto
            {
                InventoryItemId = i.Id,
                MedicineId = i.MedicineId!.Value,
                MedicineCode = i.Medicine?.MedicineCode ?? "",
                MedicineName = i.Medicine?.MedicineName ?? "",
                BatchNumber = i.BatchNumber,
                ExpiryDate = i.ExpiryDate,
                DaysUntilExpiry = daysLeft,
                Quantity = i.Quantity,
                Unit = i.Medicine?.Unit,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse?.WarehouseName ?? "",
                Severity = severity
            };
        }).ToList();
    }

    #region Helpers

    private static void ValidateType(int type)
    {
        if (type < 1 || type > 5)
            throw new ArgumentException($"ApprovalType phải 1-5, nhận được {type}");
    }

    private void LogTransition(Guid approvalId, int from, int to, string action, Guid actor, string? note)
    {
        _db.PharmacyApprovalLogs.Add(new PharmacyApprovalLog
        {
            Id = Guid.NewGuid(),
            PharmacyApprovalId = approvalId,
            FromStatus = from,
            ToStatus = to,
            Action = action,
            ActorId = actor,
            ActedAt = DateTime.UtcNow,
            Note = note,
            CreatedAt = DateTime.UtcNow
        });
    }

    private async Task<PharmacyApprovalDto> MapAsync(Guid id)
    {
        var a = await _db.PharmacyApprovals
            .Include(x => x.Patient)
            .Include(x => x.FromDepartment)
            .Include(x => x.ToWarehouse)
            .Include(x => x.FromWarehouse)
            .Include(x => x.Items).ThenInclude(i => i.Medicine)
            .Include(x => x.Items).ThenInclude(i => i.Supply)
            .FirstAsync(x => x.Id == id);
        return MapToDtoInline(a);
    }

    private static PharmacyApprovalDto MapToDtoInline(PharmacyApproval a) => new()
    {
        Id = a.Id,
        ApprovalCode = a.ApprovalCode,
        ApprovalType = a.ApprovalType,
        ApprovalTypeName = MapTypeName(a.ApprovalType),
        FromDepartmentId = a.FromDepartmentId,
        FromDepartmentName = a.FromDepartment?.DepartmentName,
        ToWarehouseId = a.ToWarehouseId,
        ToWarehouseName = a.ToWarehouse?.WarehouseName,
        FromWarehouseId = a.FromWarehouseId,
        FromWarehouseName = a.FromWarehouse?.WarehouseName,
        PatientId = a.PatientId,
        PatientName = a.Patient?.FullName,
        PatientCode = a.Patient?.PatientCode,
        LockedObject = a.LockedObject,
        RequestDate = a.RequestDate,
        Status = a.Status,
        StatusText = MapStatusText(a.Status),
        SubmittedAt = a.SubmittedAt,
        ApprovedAt = a.ApprovedAt,
        RevokedAt = a.RevokedAt,
        RevokeReason = a.RevokeReason,
        Note = a.Note,
        CreatedAt = a.CreatedAt,
        Items = a.Items.Select(i => new PharmacyApprovalItemDto
        {
            Id = i.Id,
            MedicineId = i.MedicineId,
            MedicineName = i.Medicine?.MedicineName,
            SupplyId = i.SupplyId,
            SupplyName = i.Supply?.SupplyName,
            BatchNumber = i.BatchNumber,
            ExpiryDate = i.ExpiryDate,
            RequestedQuantity = i.RequestedQuantity,
            ApprovedQuantity = i.ApprovedQuantity,
            Unit = i.Unit,
            UnitPrice = i.UnitPrice,
            Amount = i.Amount,
            ObjectType = i.ObjectType,
            UsageInstruction = i.UsageInstruction,
            IsExcluded = i.IsExcluded,
        }).ToList(),
        TotalAmount = a.Items.Where(i => !i.IsExcluded).Sum(i => i.Amount)
    };

    private static string MapTypeName(int type) => type switch
    {
        1 => "Duyệt cấp theo kho dự trù",
        2 => "Duyệt cấp theo người bệnh",
        3 => "Duyệt bù cơ số tủ trực",
        4 => "Duyệt cấp hao phí khoa",
        5 => "Duyệt hoàn trả",
        _ => "Khác"
    };

    private static string MapStatusText(int status) => status switch
    {
        0 => "Đang nhập",
        1 => "Chưa nhập",
        2 => "Đã chuyển",
        3 => "Đã duyệt",
        4 => "Đã thu hồi",
        _ => "Không rõ"
    };

    #endregion
}
