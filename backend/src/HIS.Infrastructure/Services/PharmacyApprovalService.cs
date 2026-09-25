using HIS.Application.DTOs.Pharmacy;
using HIS.Application.DTOs.Warehouse;
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
    private readonly IWarehouseCompleteService _warehouseService;

    public PharmacyApprovalService(
        HISDbContext db,
        ILogger<PharmacyApprovalService> logger,
        IWarehouseCompleteService warehouseService)
    {
        _db = db;
        _logger = logger;
        _warehouseService = warehouseService;
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
            RequestedAt = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local (same clock as RequestDate)
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
        approval.SubmittedAt = HIS.Core.Common.VnTime.NowVn;
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
        // QA-R11: office-supply requests/returns (types 4/5 of VPP) are PharmacyApprovals too and showed up here —
        // approving them on this screen flipped them to "Đã duyệt" without issuing/restocking, and the VPP screen then
        // refused them (status != 2). They are handled by OfficeSupplyService only.
        if (approval.ApprovalType is 4 or 5 && approval.Items.Any(i => i.SupplyId != null && i.MedicineId == null))
            throw new InvalidOperationException("Phiếu văn phòng phẩm / vật tư — duyệt ở màn \"Duyệt VPP\".");

        foreach (var patch in dto.Items)
        {
            var item = approval.Items.FirstOrDefault(x => x.Id == patch.ItemId);
            if (item == null) continue;
            if (!patch.IsExcluded && patch.ApprovedQuantity < 0)
                throw new InvalidOperationException("Số lượng duyệt không được âm.");
            item.ApprovedQuantity = patch.IsExcluded ? 0 : patch.ApprovedQuantity;
            item.IsExcluded = patch.IsExcluded;
            item.Amount = item.UnitPrice * item.ApprovedQuantity;
            item.UpdatedAt = DateTime.UtcNow;
        }

        // QA0915 (đo trên API): phiếu dự trù loại 1 duyệt 10 → kho nguồn bị trừ 20 (trừ tay ở vòng dưới
        // RỒI phiếu xuất chuyển kho tự sinh trừ thêm lần nữa), thu hồi chỉ cộng lại 10. Loại 1 có kho
        // nguồn nay CHỈ trừ qua phiếu xuất (một lần, cùng transaction với việc duyệt); phiếu xuất lỗi
        // (thiếu tồn…) thì việc duyệt rollback thay vì "đã duyệt" mà kho không đổi.
        var viaStockIssue = approval.ApprovalType == 1 && approval.FromWarehouseId.HasValue;
        // QA-R11: type 5 = HOÀN TRẢ — the loop below SUBTRACTED the returned quantity from the lot (and a ward return,
        // which carries no lot, moved nothing: "Đã duyệt hoàn trả" while the medicine never came back to stock).
        var isPatientReturn = approval.ApprovalType == 5;
        await using var transaction = await _db.Database.BeginTransactionAsync();
        // QA-R11: the status check above is read-then-write — a double "Duyệt" deducted stock / created the transfer twice.
        var claimed = await _db.PharmacyApprovals
            .Where(a => a.Id == approval.Id && a.Status == 2)
            .ExecuteUpdateAsync(u => u.SetProperty(a => a.Status, 3));
        if (claimed == 0)
            throw new InvalidOperationException("Phiếu vừa được duyệt bởi thao tác khác.");

        if (isPatientReturn)
            await ReturnPatientMedicinesAsync(approval, userId);

        // Khi duyệt: trừ tồn từ InventoryItem theo ApprovedQuantity
        // perf(#195): batch-load InventoryItems instead of FirstOrDefaultAsync per item (N+1).
        // Safe: entities are tracked, so repeated InventoryItemId across lines still resolve to the
        // same in-memory instance (EF identity resolution) exactly like the previous per-iteration
        // FirstOrDefaultAsync did — cumulative decrement/oversell-guard behavior is unchanged.
        var approveInvIds = viaStockIssue || isPatientReturn ? new List<Guid>() : approval.Items
            .Where(i => !i.IsExcluded && i.ApprovedQuantity > 0 && i.InventoryItemId.HasValue)
            .Select(i => i.InventoryItemId!.Value)
            .Distinct()
            .ToList();
        var approveInvMap = await _db.InventoryItems
            .Where(x => approveInvIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id);

        foreach (var item in approval.Items.Where(i => !viaStockIssue && !isPatientReturn && !i.IsExcluded && i.ApprovedQuantity > 0))
        {
            if (item.InventoryItemId.HasValue)
            {
                if (approveInvMap.TryGetValue(item.InventoryItemId.Value, out var inv))
                {
                    // QA-R11: the chosen lot was deducted with no expiry / lock / reservation check.
                    if (inv.IsLocked)
                        throw new InvalidOperationException($"Lô {inv.BatchNumber} đang bị khóa, không cấp được.");
                    if (inv.ExpiryDate.HasValue && inv.ExpiryDate.Value.Date < DateTime.Today)
                        throw new InvalidOperationException($"Lô {inv.BatchNumber} đã hết hạn ({inv.ExpiryDate:dd/MM/yyyy}), không cấp được.");
                    if (inv.Quantity - inv.ReservedQuantity < item.ApprovedQuantity)
                        throw new InvalidOperationException(
                            $"Tồn kho không đủ cho {item.MedicineId}: cần {item.ApprovedQuantity}, còn {inv.Quantity}");
                    inv.Quantity -= item.ApprovedQuantity;
                    inv.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        approval.Status = 3;
        approval.ApprovedBy = userId;
        approval.ApprovedAt = HIS.Core.Common.VnTime.NowVn;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();

        LogTransition(approval.Id, 2, 3, "Approve", userId, dto.Note);
        await _db.SaveChangesAsync();

        // ApprovalType=1: auto-generate transfer stock issue (ExportType=4)
        // from FromWarehouse to ToWarehouse for all approved items.
        if (viaStockIssue)
        {
            var issueDto = new CreateStockIssueDto
            {
                IssueDate = DateTime.Now,
                WarehouseId = approval.FromWarehouseId!.Value,
                TargetWarehouseId = approval.ToWarehouseId,
                DepartmentId = approval.FromDepartmentId,
                IssueType = approval.ToWarehouseId.HasValue ? 4 : 3, // Transfer | issue to department
                Notes = $"[DU_TRU:{approval.ApprovalCode}] {approval.Note}",
                Items = approval.Items
                    .Where(i => !i.IsExcluded && i.ApprovedQuantity > 0)
                    .Select(i => new CreateStockIssueItemDto
                    {
                        ItemId = (i.MedicineId ?? i.SupplyId) ?? Guid.Empty,
                        StockId = i.InventoryItemId,
                        Quantity = i.ApprovedQuantity,
                        PaymentSource = 0,
                    })
                    .Where(i => i.ItemId != Guid.Empty)
                    .ToList()
            };

            if (issueDto.Items.Count > 0)
            {
                // Shares this scoped DbContext → runs inside the transaction above; any failure
                // (insufficient stock, locked lot…) propagates and rolls the approval back.
                var issued = approval.ToWarehouseId.HasValue
                    ? await _warehouseService.CreateTransferIssueAsync(issueDto, userId)
                    : await _warehouseService.IssueToDepartmentAsync(issueDto, userId);
                // Store link so FE can print the transfer issue
                approval.LinkedExportReceiptId = issued.Id;
                await _db.SaveChangesAsync();
                _logger.LogInformation(
                    "Auto-created transfer issue {IssueId} for PharmacyApproval {ApprovalId}",
                    issued.Id, approval.Id);
            }
        }
        await transaction.CommitAsync();

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

        // QA0915: loại 1 có kho nguồn chỉ trừ kho qua phiếu xuất tự sinh → thu hồi = hủy đúng phiếu xuất đó
        // (hoàn kho nguồn + đảo phiếu nhập ở kho nhận), KHÔNG cộng tay thêm lần nữa.
        var viaStockIssue = approval.ApprovalType == 1 && approval.FromWarehouseId.HasValue
            && approval.LinkedExportReceiptId.HasValue;
        var isPatientReturn = approval.ApprovalType == 5;
        await using var transaction = await _db.Database.BeginTransactionAsync();
        // QA-R11: claim 3 → 4 once — a double "Thu hồi" returned the stock twice.
        var claimed = await _db.PharmacyApprovals
            .Where(a => a.Id == approval.Id && a.Status == 3)
            .ExecuteUpdateAsync(u => u.SetProperty(a => a.Status, 4));
        if (claimed == 0)
            throw new InvalidOperationException("Phiếu vừa được thu hồi bởi thao tác khác.");
        if (viaStockIssue)
            await _warehouseService.CancelStockIssueAsync(
                approval.LinkedExportReceiptId!.Value, $"Thu hồi duyệt {approval.ApprovalCode}: {dto.Reason}", userId);
        // QA-R11: a patient return put the medicines back through department-return receipts — take them out again
        // (CancelStockReceiptAsync refuses when the returned units were already issued again).
        if (isPatientReturn)
        {
            var tag = ReturnTag(approval.ApprovalCode);
            var returnReceiptIds = await _db.ImportReceipts
                .Where(r => r.Status == 1 && r.ImportType == 4 && r.Note != null && r.Note.StartsWith(tag))
                .Select(r => r.Id)
                .ToListAsync();
            foreach (var receiptId in returnReceiptIds)
                await _warehouseService.CancelStockReceiptAsync(
                    receiptId, $"Thu hồi duyệt {approval.ApprovalCode}: {dto.Reason}", userId);
        }

        // Hoàn lại tồn kho
        // perf(#195): batch-load InventoryItems instead of FirstOrDefaultAsync per item (N+1).
        // Safe for the same reason as ApproveAsync — tracked entities, identity resolution keeps
        // cumulative-across-duplicate-lines behavior identical.
        var revokeInvIds = viaStockIssue || isPatientReturn ? new List<Guid>() : approval.Items
            .Where(i => !i.IsExcluded && i.ApprovedQuantity > 0 && i.InventoryItemId.HasValue)
            .Select(i => i.InventoryItemId!.Value)
            .Distinct()
            .ToList();
        var revokeInvMap = await _db.InventoryItems
            .Where(x => revokeInvIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id);

        foreach (var item in approval.Items.Where(i => !viaStockIssue && !isPatientReturn && !i.IsExcluded && i.ApprovedQuantity > 0))
        {
            if (item.InventoryItemId.HasValue)
            {
                if (revokeInvMap.TryGetValue(item.InventoryItemId.Value, out var inv))
                {
                    inv.Quantity += item.ApprovedQuantity;
                    inv.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        approval.Status = 4;
        approval.RevokedBy = userId;
        approval.RevokedAt = HIS.Core.Common.VnTime.NowVn;
        approval.RevokeReason = dto.Reason;
        approval.UpdatedAt = DateTime.UtcNow;
        approval.UpdatedBy = userId.ToString();

        LogTransition(approval.Id, 3, 4, "Revoke", userId, dto.Reason);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
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
            // QA-R2: FromWarehouse was not included → "Kho/Khoa nguồn" of every dự trù row was blank
            // unless the same warehouse happened to be loaded as another row's ToWarehouse on that page.
            .Include(a => a.FromWarehouse)
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
            .Skip(Math.Max(0, dto.PageIndex - 1) * dto.PageSize)
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

    /// <summary>Note prefix linking a department-return receipt to the patient-return approval that booked it.</summary>
    private static string ReturnTag(string approvalCode) => $"[HOAN_TRA:{approvalCode}]";

    /// <summary>
    /// QA-R11: approving a patient return (type 5) now puts the medicines back into the lots they were dispensed
    /// from (latest dispensing first), at the lot's cost, through an approved "Nhập hoàn trả khoa" receipt per
    /// warehouse so the stock card shows the movement. Capped by what was dispensed to the patient minus what
    /// earlier approved returns already took back.
    /// </summary>
    private async Task ReturnPatientMedicinesAsync(PharmacyApproval approval, Guid userId)
    {
        var lines = approval.Items.Where(i => !i.IsExcluded && i.ApprovedQuantity > 0).ToList();
        if (lines.Count == 0) return;
        if (lines.Any(i => i.MedicineId == null))
            throw new InvalidOperationException("Phiếu hoàn trả thuốc chỉ gồm dòng thuốc.");
        if (!approval.PatientId.HasValue && !approval.MedicalRecordId.HasValue)
            throw new InvalidOperationException("Phiếu hoàn trả chưa gắn bệnh nhân — không xác định được thuốc đã phát để nhập lại.");

        var medIds = lines.Select(i => i.MedicineId!.Value).Distinct().ToList();
        var recordId = approval.MedicalRecordId;
        var patientId = approval.PatientId;
        var issued = await _db.ExportReceiptDetails
            .Where(d => !d.IsDeleted && d.MedicineId != null && medIds.Contains(d.MedicineId.Value) && d.InventoryItemId != null
                && !d.ExportReceipt.IsDeleted && d.ExportReceipt.Status == 1
                && (d.ExportReceipt.ExportType == 1 || d.ExportReceipt.ExportType == 2 || d.ExportReceipt.ExportType == 12)
                && (recordId.HasValue ? d.ExportReceipt.MedicalRecordId == recordId : d.ExportReceipt.PatientId == patientId))
            .OrderByDescending(d => d.ExportReceipt.ReceiptDate).ThenByDescending(d => d.CreatedAt)
            .Select(d => new { MedicineId = d.MedicineId!.Value, LotId = d.InventoryItemId!.Value, d.ExportReceipt.WarehouseId, d.Quantity, d.Unit })
            .ToListAsync();

        var alreadyReturned = await _db.PharmacyApprovalItems
            .Where(i => i.PharmacyApprovalId != approval.Id && !i.IsExcluded && i.MedicineId != null && medIds.Contains(i.MedicineId.Value)
                && i.PharmacyApproval.ApprovalType == 5 && i.PharmacyApproval.Status == 3 && !i.PharmacyApproval.IsDeleted
                && (recordId.HasValue ? i.PharmacyApproval.MedicalRecordId == recordId : i.PharmacyApproval.PatientId == patientId))
            .GroupBy(i => i.MedicineId!.Value)
            .Select(g => new { MedicineId = g.Key, Qty = g.Sum(x => x.ApprovedQuantity) })
            .ToDictionaryAsync(x => x.MedicineId, x => x.Qty);

        // (warehouse, lot) → quantity going back
        var credits = new List<(Guid WarehouseId, Guid LotId, decimal Qty, string? Unit)>();
        foreach (var med in lines.GroupBy(i => i.MedicineId!.Value))
        {
            var need = med.Sum(i => i.ApprovedQuantity);
            var skip = alreadyReturned.GetValueOrDefault(med.Key);
            var rows = issued.Where(r => r.MedicineId == med.Key).ToList();
            var returnable = rows.Sum(r => r.Quantity) - skip;
            if (returnable < need)
                throw new InvalidOperationException(
                    $"Hoàn trả {need:0.##} vượt số đã phát cho bệnh nhân (còn có thể trả {Math.Max(0, returnable):0.##}).");
            foreach (var r in rows)
            {
                if (need <= 0) break;
                var avail = r.Quantity;
                if (skip > 0) { var d = Math.Min(skip, avail); avail -= d; skip -= d; }
                if (avail <= 0) continue;
                var take = Math.Min(avail, need);
                credits.Add((r.WarehouseId, r.LotId, take, r.Unit));
                need -= take;
            }
        }

        var lotIds = credits.Select(c => c.LotId).Distinct().ToList();
        var lots = await _db.InventoryItems.IgnoreQueryFilters()
            .Where(i => lotIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);
        var now = DateTime.Now;
        var n = 0;
        foreach (var byWarehouse in credits.GroupBy(c => c.WarehouseId))
        {
            var receipt = new ImportReceipt
            {
                Id = Guid.NewGuid(),
                ReceiptCode = $"HK{now:yyyyMMddHHmmssfff}{(n++ > 0 ? $"-{n}" : "")}",
                ReceiptDate = now,
                WarehouseId = byWarehouse.Key,
                ImportType = 4, // Nhập hoàn trả khoa
                Status = 1,
                ApprovedBy = userId,
                ApprovedAt = now,
                Note = $"{ReturnTag(approval.ApprovalCode)} Hoàn trả thuốc bệnh nhân",
                CreatedAt = now,
                CreatedBy = userId.ToString()
            };
            foreach (var c in byWarehouse)
            {
                var lot = lots[c.LotId];
                if (lot.IsDeleted) lot.IsDeleted = false; // the returned units must land somewhere visible
                lot.Quantity += c.Qty;
                lot.UpdatedAt = now;
                var amount = c.Qty * lot.ImportPrice;
                receipt.TotalAmount += amount;
                _db.ImportReceiptDetails.Add(new ImportReceiptDetail
                {
                    Id = Guid.NewGuid(),
                    ImportReceiptId = receipt.Id,
                    MedicineId = lot.MedicineId,
                    BatchNumber = lot.BatchNumber,
                    ExpiryDate = lot.ExpiryDate,
                    ManufactureDate = lot.ManufactureDate,
                    Quantity = c.Qty,
                    Unit = c.Unit,
                    UnitPrice = lot.ImportPrice,
                    Amount = amount,
                    CreatedAt = now,
                    CreatedBy = userId.ToString()
                });
            }
            receipt.FinalAmount = receipt.TotalAmount;
            _db.ImportReceipts.Add(receipt);
        }
    }

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
            ActedAt = HIS.Core.Common.VnTime.NowVn,
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
        LinkedExportReceiptId = a.LinkedExportReceiptId,
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
