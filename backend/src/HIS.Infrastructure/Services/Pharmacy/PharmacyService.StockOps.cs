using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HIS.Application.Services;
using HIS.Core.Entities;

namespace HIS.Infrastructure.Services;

// Issue #202: alerts + inventory + reports/ADR/drug-label + transfers của PharmacyController.
public partial class PharmacyService
{
    // ==================== 4. Alerts ====================

    public async Task<object> GetAlertsAsync(bool? acknowledged)
    {
        var alerts = new List<object>();

        // Expiry alerts
        var expiryQuery = _context.ExpiryAlerts
            .AsNoTracking()
            .Include(a => a.Medicine)
            .Where(a => !a.IsDeleted);

        if (acknowledged.HasValue)
            expiryQuery = acknowledged.Value
                ? expiryQuery.Where(a => a.Status >= 1)
                : expiryQuery.Where(a => a.Status == 0);

        var expiryAlerts = await expiryQuery
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync();

        foreach (var ea in expiryAlerts)
        {
            string severity = ea.AlertLevel switch { 1 => "high", 2 => "medium", _ => "low" };
            alerts.Add(new
            {
                id = ea.Id.ToString(),
                type = "expiry",
                severity,
                medicationName = ea.Medicine?.MedicineName ?? "",
                message = $"Thuốc sắp hết hạn ngày {ea.ExpiryDate:dd/MM/yyyy}, lô {ea.BatchNumber}, SL: {ea.Quantity}",
                createdDate = ea.CreatedAt,
                acknowledged = ea.Status >= 1,
            });
        }

        // Low stock alerts
        var lowStockQuery = _context.LowStockAlerts
            .AsNoTracking()
            .Include(a => a.Medicine)
            .Where(a => !a.IsDeleted);

        if (acknowledged.HasValue)
            lowStockQuery = acknowledged.Value
                ? lowStockQuery.Where(a => a.Status >= 1)
                : lowStockQuery.Where(a => a.Status == 0);

        var lowStockAlerts = await lowStockQuery
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync();

        foreach (var la in lowStockAlerts)
        {
            string severity = la.AlertLevel switch { 1 => "high", 2 => "medium", _ => "low" };
            alerts.Add(new
            {
                id = la.Id.ToString(),
                type = la.CurrentQuantity <= 0 ? "out_of_stock" : "low_stock",
                severity,
                medicationName = la.Medicine?.MedicineName ?? "",
                message = $"Tồn kho: {la.CurrentQuantity}, Tồn tối thiểu: {la.MinimumQuantity}",
                createdDate = la.CreatedAt,
                acknowledged = la.Status >= 1,
            });
        }

        return alerts.OrderByDescending(a => ((dynamic)a).createdDate).ToList();
    }

    public async Task<bool> AcknowledgeAlertAsync(Guid alertId)
    {
        // Try expiry alert first
        var expiryAlert = await _context.ExpiryAlerts
            .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

        if (expiryAlert != null)
        {
            expiryAlert.Status = 1;
            expiryAlert.AcknowledgedAt = DateTime.UtcNow;
            expiryAlert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        // Try low stock alert
        var lowStockAlert = await _context.LowStockAlerts
            .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

        if (lowStockAlert != null)
        {
            lowStockAlert.Status = 1;
            lowStockAlert.AcknowledgedAt = DateTime.UtcNow;
            lowStockAlert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        return false;
    }

    public async Task<bool> ResolveAlertAsync(Guid alertId)
    {
        var expiryAlert = await _context.ExpiryAlerts
            .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

        if (expiryAlert != null)
        {
            expiryAlert.Status = 2;
            expiryAlert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        var lowStockAlert = await _context.LowStockAlerts
            .FirstOrDefaultAsync(a => a.Id == alertId && !a.IsDeleted);

        if (lowStockAlert != null)
        {
            lowStockAlert.Status = 3;
            lowStockAlert.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        return false;
    }

    // ==================== 2. Inventory ====================

    public async Task<object> GetInventoryItemsAsync(string? warehouseId)
    {
        var query = _context.InventoryItems
            .AsNoTracking()
            .Include(i => i.Medicine)
            .Include(i => i.Warehouse)
            .Where(i => !i.IsDeleted && i.Quantity > 0 && i.MedicineId != null);

        if (!string.IsNullOrEmpty(warehouseId) && Guid.TryParse(warehouseId, out var wId))
            query = query.Where(i => i.WarehouseId == wId);

        var items = await query.Take(500).ToListAsync();

        if (!items.Any())
            return Array.Empty<object>();

        // Get stock thresholds
        var medicineIds = items.Where(i => i.MedicineId.HasValue)
            .Select(i => i.MedicineId!.Value).Distinct().ToList();

        var thresholds = await _context.StockThresholds
            .AsNoTracking()
            .Where(t => medicineIds.Contains(t.MedicineId) && t.IsActive)
            .ToListAsync();

        var thresholdMap = thresholds
            .GroupBy(t => t.MedicineId)
            .ToDictionary(g => g.Key, g => g.First());

        // Group by medicine + warehouse
        var grouped = items.GroupBy(i => new { i.MedicineId, i.WarehouseId });

        return grouped.Select(g =>
        {
            var first = g.First();
            var medicine = first.Medicine;
            var threshold = first.MedicineId.HasValue
                ? thresholdMap.GetValueOrDefault(first.MedicineId.Value) : null;
            var totalStock = g.Sum(i => i.Quantity);
            var nearestExpiry = g
                .Where(i => i.ExpiryDate.HasValue)
                .OrderBy(i => i.ExpiryDate)
                .FirstOrDefault()?.ExpiryDate;
            var avgPrice = g.Average(i => i.UnitPrice);
            var minStock = threshold?.MinimumQuantity ?? 0;

            string status = "normal";
            if (totalStock <= 0) status = "out";
            else if (minStock > 0 && totalStock <= minStock) status = "low";
            else if (nearestExpiry.HasValue && nearestExpiry.Value <= DateTime.Now.AddMonths(3)) status = "expiring";

            return new
            {
                id = first.Id.ToString(),
                medicineId = first.MedicineId?.ToString() ?? "",
                medicationCode = medicine?.MedicineCode ?? "",
                medicationName = medicine?.MedicineName ?? "",
                category = medicine?.MedicineGroupCode ?? "",
                unit = medicine?.Unit ?? "",
                totalStock = (int)totalStock,
                minStock = (int)minStock,
                maxStock = (int)(threshold?.MaximumQuantity ?? 0),
                warehouse = first.Warehouse?.WarehouseName ?? "",
                nearestExpiry = nearestExpiry?.ToString("o") ?? "",
                averagePrice = Math.Round(avgPrice, 0),
                status,
            };
        }).ToList();
    }

    public async Task<object> GetInventoryHistoryAsync(Guid medicationId)
    {
        var movements = await _context.StockMovements
            .AsNoTracking()
            .Where(m => !m.IsDeleted && m.MedicineId == medicationId)
            .OrderByDescending(m => m.MovementDate)
            .Take(50)
            .ToListAsync();

        return movements.Select(m => new
        {
            id = m.Id.ToString(),
            medicationCode = "",
            medicationName = "",
            transactionType = m.MovementType switch
            {
                1 => "import",
                2 => "export",
                3 => "transfer",
                4 => "adjust",
                _ => "import",
            },
            quantity = (int)m.Quantity,
            batchNumber = m.BatchNumber,
            referenceCode = m.ReferenceCode,
            note = m.Notes ?? "",
            createdDate = m.MovementDate,
            createdBy = m.CreatedBy ?? "",
        }).ToList();
    }

    // ==================== ADR reports ====================

    public async Task<object> GetAdrReportsAsync()
    {
        return await _context.PharmacyGppRecords
            .AsNoTracking()
            .Include(r => r.RecordedBy)
            .Where(r => !r.IsDeleted && r.RecordType == 1)
            .OrderByDescending(r => r.RecordDate)
            .Take(200)
            .Select(r => new
            {
                id = r.Id.ToString(),
                patientName = "",
                patientCode = "",
                medicationName = r.MedicineName ?? "",
                reactionType = r.Description ?? "",
                severity = "moderate",
                onsetDate = r.RecordDate,
                reportedBy = r.RecordedBy != null ? r.RecordedBy.FullName : "",
                description = r.Description ?? "",
                outcome = r.ActionTaken ?? "",
                status = "reported",
            })
            .ToListAsync();
    }

    public async Task<PharmacyGppRecord> CreateAdrReportAsync(
        string? onsetDate, string? description, string? reactionType, string? medicationName, string? outcome, Guid? userId)
    {
        var record = new PharmacyGppRecord
        {
            Id = Guid.NewGuid(),
            RecordType = 1,
            RecordDate = DateTime.TryParse(onsetDate, out var parsedOnset) ? parsedOnset : DateTime.UtcNow,
            Description = description ?? reactionType,
            MedicineName = medicationName,
            ActionTaken = outcome,
            RecordedById = userId,
            CreatedAt = DateTime.UtcNow,
        };

        _context.PharmacyGppRecords.Add(record);
        await _context.SaveChangesAsync();
        return record;
    }

    public async Task<object> CancelDispensedPrescriptionAsync(Guid prescriptionId, string reason, Guid userId)
        => await _warehouseService.CancelDispensedPrescriptionAsync(prescriptionId, reason, userId);

    public async Task<object> CreateBillingAfterDispensingAsync(Guid issueId, Guid userId)
        => await _warehouseService.CreateBillingAfterDispensingAsync(issueId, userId);

    // ==================== Drug Label Print ====================

    public async Task<string?> PrintDrugLabelAsync(Guid prescriptionId)
    {
        var prescription = await _context.Prescriptions
            .AsNoTracking()
            .Include(p => p.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(p => p.Doctor)
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .FirstOrDefaultAsync(p => p.Id == prescriptionId && !p.IsDeleted);

        if (prescription == null) return null;

        var patient = prescription.MedicalRecord?.Patient;
        var html = new System.Text.StringBuilder();
        html.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'/>");
        html.AppendLine("<style>");
        html.AppendLine("body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:4px;}");
        html.AppendLine(".label{border:1px solid #000;padding:4px 6px;margin-bottom:4px;page-break-inside:avoid;width:60mm;}");
        html.AppendLine(".label-title{font-weight:bold;font-size:12px;text-align:center;border-bottom:1px dashed #333;padding-bottom:2px;margin-bottom:2px;}");
        html.AppendLine(".label-row{margin:1px 0;}");
        html.AppendLine(".label-drug{font-weight:bold;font-size:11px;}");
        html.AppendLine("@media print{body{margin:0;} .no-print{display:none;}}");
        html.AppendLine("</style></head><body>");

        var patientName = patient?.FullName ?? "";
        var patientCode = patient?.PatientCode ?? "";
        var dob = patient?.DateOfBirth?.ToString("dd/MM/yyyy") ?? "";
        var doctorName = prescription.Doctor?.FullName ?? "";
        var rxCode = prescription.PrescriptionCode;
        var rxDate = prescription.PrescriptionDate.ToString("dd/MM/yyyy");
        var diagnosis = prescription.DiagnosisName ?? prescription.Diagnosis ?? "";

        foreach (var detail in prescription.Details.Where(d => !d.IsDeleted))
        {
            var medicineName = detail.Medicine?.MedicineName ?? detail.Medicine?.MedicineCode ?? "(thuốc)";
            var dosage = detail.Dosage ?? "";
            var frequency = detail.Frequency ?? "";
            var route = detail.Route ?? "";
            var days = detail.Days;
            var qty = detail.Quantity;
            var unit = detail.Unit ?? "";
            var usage = detail.UsageInstructions ?? detail.Usage ?? "";

            html.AppendLine("<div class='label'>");
            html.AppendLine("<div class='label-title'>NHÃN THUỐC</div>");
            html.AppendLine($"<div class='label-row'>BN: <b>{System.Web.HttpUtility.HtmlEncode(patientName)}</b> ({System.Web.HttpUtility.HtmlEncode(patientCode)})</div>");
            if (!string.IsNullOrEmpty(dob))
                html.AppendLine($"<div class='label-row'>Ngày sinh: {dob}</div>");
            html.AppendLine($"<div class='label-row label-drug'>{System.Web.HttpUtility.HtmlEncode(medicineName)}</div>");
            html.AppendLine($"<div class='label-row'>SL: {qty} {System.Web.HttpUtility.HtmlEncode(unit)} | {days} ngày</div>");
            if (!string.IsNullOrEmpty(dosage))
                html.AppendLine($"<div class='label-row'>Liều: {System.Web.HttpUtility.HtmlEncode(dosage)}</div>");
            if (!string.IsNullOrEmpty(frequency))
                html.AppendLine($"<div class='label-row'>Tần suất: {System.Web.HttpUtility.HtmlEncode(frequency)}</div>");
            if (!string.IsNullOrEmpty(route))
                html.AppendLine($"<div class='label-row'>Đường dùng: {System.Web.HttpUtility.HtmlEncode(route)}</div>");
            if (!string.IsNullOrEmpty(usage))
                html.AppendLine($"<div class='label-row'>Cách dùng: {System.Web.HttpUtility.HtmlEncode(usage)}</div>");
            html.AppendLine($"<div class='label-row'>Đơn: {rxCode} | {rxDate} | BS: {System.Web.HttpUtility.HtmlEncode(doctorName)}</div>");
            if (!string.IsNullOrEmpty(diagnosis))
                html.AppendLine($"<div class='label-row'>CĐ: {System.Web.HttpUtility.HtmlEncode(diagnosis)}</div>");
            html.AppendLine("</div>");
        }

        html.AppendLine("<script>window.onload=function(){window.print();}</script>");
        html.AppendLine("</body></html>");

        return html.ToString();
    }

    // ==================== 3. Transfers ====================

    public async Task<object> GetTransferRequestsAsync(string? status)
    {
        var query = _context.WarehouseTransfers
            .AsNoTracking()
            .Include(t => t.FromWarehouse)
            .Include(t => t.ToWarehouse)
            .Include(t => t.Items)
                .ThenInclude(i => i.Medicine)
            .Where(t => !t.IsDeleted);

        if (!string.IsNullOrEmpty(status))
        {
            int? statusInt = status switch
            {
                "pending" => 0,
                "approved" => 1,
                "rejected" => 4,
                "received" => 3,
                _ => null,
            };
            if (statusInt.HasValue)
                query = query.Where(t => t.Status == statusInt.Value);
        }

        var transfers = await query
            .OrderByDescending(t => t.TransferDate)
            .Take(100)
            .ToListAsync();

        if (!transfers.Any())
            return Array.Empty<object>();

        // Resolve RequestedBy user names
        var userIds = transfers
            .Where(t => Guid.TryParse(t.RequestedBy, out _))
            .Select(t => Guid.Parse(t.RequestedBy!))
            .Distinct()
            .ToList();

        var users = userIds.Any()
            ? await _context.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName)
            : new Dictionary<Guid, string>();

        return transfers.Select(t =>
        {
            string statusStr = t.Status switch
            {
                0 => "pending",
                1 => "approved",
                2 => "approved",
                3 => "received",
                4 => "rejected",
                _ => "pending",
            };

            string requestedBy = t.RequestedBy ?? "";
            if (Guid.TryParse(requestedBy, out var uid) && users.TryGetValue(uid, out var name))
                requestedBy = name;

            var lineItems = t.Items.Where(i => !i.IsDeleted).ToList();

            return new
            {
                id = t.Id.ToString(),
                transferCode = t.TransferCode,
                fromWarehouse = t.FromWarehouse?.WarehouseName ?? "",
                toWarehouse = t.ToWarehouse?.WarehouseName ?? "",
                requestedBy,
                requestedDate = t.TransferDate,
                itemsCount = lineItems.Count,
                status = statusStr,
                note = t.Notes ?? "",
                items = lineItems.Select(i => new
                {
                    medicineId = i.MedicineId.ToString(),
                    medicationCode = i.Medicine?.MedicineCode ?? "",
                    medicationName = i.Medicine?.MedicineName ?? "",
                    unit = i.Medicine?.Unit ?? "",
                    quantity = i.RequestedQuantity,
                    batchNumber = i.BatchNumber ?? "",
                    note = i.Notes ?? "",
                }).ToList(),
            };
        }).ToList();
    }

    public async Task<(Guid Id, string TransferCode)> CreateTransferAsync(
        Guid fromWarehouseId, Guid toWarehouseId, string? note, string? requestedBy,
        IReadOnlyList<TransferItemInput>? items = null)
    {
        if (fromWarehouseId == toWarehouseId)
            throw new InvalidOperationException("Kho gửi và kho nhận phải khác nhau");

        var transfer = new WarehouseTransfer
        {
            Id = Guid.NewGuid(),
            TransferCode = $"DC-{DateTime.Now:yyyyMMdd}-{DateTime.Now:HHmmss}",
            FromWarehouseId = fromWarehouseId,
            ToWarehouseId = toWarehouseId,
            TransferDate = DateTime.UtcNow,
            Status = 0,
            RequestedBy = requestedBy,
            Notes = note,
            CreatedAt = DateTime.UtcNow,
        };

        if (items is { Count: > 0 })
        {
            if (items.Any(i => i.Quantity <= 0))
                throw new InvalidOperationException("Số lượng mỗi dòng thuốc phải lớn hơn 0");

            // Resolve v1-legacy MedicationCode → MedicineId
            var codes = items.Where(i => !i.MedicineId.HasValue && !string.IsNullOrWhiteSpace(i.MedicationCode))
                .Select(i => i.MedicationCode!.Trim()).Distinct().ToList();
            var idByCode = codes.Any()
                ? await _context.Medicines.AsNoTracking()
                    .Where(m => !m.IsDeleted && codes.Contains(m.MedicineCode))
                    .ToDictionaryAsync(m => m.MedicineCode, m => m.Id)
                : new Dictionary<string, Guid>();

            var resolved = new List<(Guid MedicineId, TransferItemInput Item)>();
            foreach (var item in items)
            {
                Guid medicineId;
                if (item.MedicineId.HasValue)
                    medicineId = item.MedicineId.Value;
                else if (!string.IsNullOrWhiteSpace(item.MedicationCode) && idByCode.TryGetValue(item.MedicationCode.Trim(), out var byCode))
                    medicineId = byCode;
                else
                    throw new InvalidOperationException($"Mã thuốc '{item.MedicationCode ?? "(trống)"}' không tồn tại");
                resolved.Add((medicineId, item));
            }

            var medicineIds = resolved.Select(r => r.MedicineId).Distinct().ToList();

            var stockByMedicine = await _context.InventoryItems.AsNoTracking()
                .Where(i => !i.IsDeleted && i.WarehouseId == fromWarehouseId
                    && i.MedicineId != null && medicineIds.Contains(i.MedicineId.Value))
                .GroupBy(i => i.MedicineId!.Value)
                .Select(g => new { MedicineId = g.Key, Available = g.Sum(x => x.Quantity), AvgPrice = g.Average(x => x.UnitPrice) })
                .ToDictionaryAsync(x => x.MedicineId);

            var nameById = await _context.Medicines.AsNoTracking()
                .Where(m => medicineIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id, m => m.MedicineName);

            foreach (var group in resolved.GroupBy(r => r.MedicineId))
            {
                var displayName = nameById.GetValueOrDefault(group.Key, group.Key.ToString());
                if (!nameById.ContainsKey(group.Key))
                    throw new InvalidOperationException($"Thuốc '{displayName}' không tồn tại trong danh mục");
                if (!stockByMedicine.TryGetValue(group.Key, out var stock))
                    throw new InvalidOperationException($"Thuốc '{displayName}' không có tồn trong kho gửi");
                var requested = group.Sum(r => r.Item.Quantity);
                if (requested > stock.Available)
                    throw new InvalidOperationException($"Thuốc '{displayName}' vượt tồn khả dụng ({requested:0.##} > {stock.Available:0.##})");
            }

            decimal total = 0;
            foreach (var (medicineId, item) in resolved)
            {
                var price = Math.Round(stockByMedicine[medicineId].AvgPrice, 0);
                var amount = Math.Round(price * item.Quantity, 0);
                total += amount;
                transfer.Items.Add(new WarehouseTransferItem
                {
                    Id = Guid.NewGuid(),
                    WarehouseTransferId = transfer.Id,
                    MedicineId = medicineId,
                    BatchNumber = item.BatchNumber,
                    RequestedQuantity = item.Quantity,
                    UnitPrice = price,
                    Amount = amount,
                    Notes = item.Note,
                    CreatedAt = DateTime.UtcNow,
                });
            }
            transfer.TotalAmount = total;
        }

        _context.WarehouseTransfers.Add(transfer);
        await _context.SaveChangesAsync();
        return (transfer.Id, transfer.TransferCode);
    }

    public async Task<bool> ApproveTransferAsync(Guid transferId)
    {
        var transfer = await _context.WarehouseTransfers
            .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);
        if (transfer == null) return false;

        transfer.Status = 1;
        transfer.ApprovedAt = DateTime.UtcNow;
        transfer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectTransferAsync(Guid transferId, string? reason)
    {
        var transfer = await _context.WarehouseTransfers
            .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);
        if (transfer == null) return false;

        transfer.Status = 4;
        transfer.CancellationReason = reason;
        transfer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReceiveTransferAsync(Guid transferId)
    {
        var transfer = await _context.WarehouseTransfers
            .FirstOrDefaultAsync(t => t.Id == transferId && !t.IsDeleted);
        if (transfer == null) return false;

        transfer.Status = 3;
        transfer.ReceivedAt = DateTime.UtcNow;
        transfer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }
}
