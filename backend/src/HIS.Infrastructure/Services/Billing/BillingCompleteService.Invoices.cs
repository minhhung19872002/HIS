using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K8 phien 4 (2026-05-30): tach 10.1.9 Invoices (~333 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.1.9 Invoices

    public async Task<InvoiceDto> CalculateInvoiceAsync(Guid medicalRecordId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (medicalRecord == null)
        {
            return new InvoiceDto { TotalAmount = 0 };
        }

        // QA-R3: preview of what the record owes — services + medicines (OPD/IPD, dispensed or not) + bed days,
        // from the same ledger the payment path uses (was: medicines only, gross, every status incl. cancelled).
        var existing = await _context.InvoiceSummaries.AsNoTracking()
            .Where(i => i.MedicalRecordId == medicalRecordId && !i.IsDeleted)
            .OrderByDescending(i => i.InvoiceDate)
            .FirstOrDefaultAsync();
        var set = await InvoiceLedger.LoadAsync(_context, medicalRecordId);
        decimal paid, discount = existing?.DiscountAmount ?? 0;
        if (existing is { Status: 2 })
            paid = existing.PaidAmount;
        else
        {
            var (p, refunded) = await InvoiceLedger.PaidOnRecordAsync(_context, medicalRecordId);
            paid = Math.Max(0, p - refunded);
        }
        return BuildInvoiceDto(medicalRecord, existing, set, paid, discount);
    }

    /// <summary>InvoiceDto from ledger lines + the persisted invoice header (if any).</summary>
    private static InvoiceDto BuildInvoiceDto(MedicalRecord medicalRecord, InvoiceSummary? invoice,
        InvoiceLedger.ChargeSet set, decimal paid, decimal discount)
    {
        var total = invoice is { Status: 2 } ? invoice.TotalAmount : set.PatientTotal;
        var remaining = Math.Max(0, total - discount - paid);
        return new InvoiceDto
        {
            Id = invoice?.Id ?? Guid.Empty,
            InvoiceCode = invoice?.InvoiceCode ?? string.Empty,
            MedicalRecordId = medicalRecord.Id,
            PatientId = medicalRecord.PatientId,
            PatientCode = medicalRecord.Patient?.PatientCode ?? string.Empty,
            PatientName = medicalRecord.Patient?.FullName ?? string.Empty,
            PhoneNumber = medicalRecord.Patient?.PhoneNumber,
            Address = medicalRecord.Patient?.Address,
            InsuranceCardNumber = medicalRecord.InsuranceNumber,
            MedicalRecordCode = medicalRecord.MedicalRecordCode,
            PatientType = medicalRecord.TreatmentType == 2 ? 2 : 1,
            PatientTypeName = medicalRecord.TreatmentType == 2 ? "Nội trú" : "Ngoại trú",
            DepartmentId = medicalRecord.DepartmentId,
            DepartmentName = medicalRecord.Department?.DepartmentName,
            ServiceItems = set.Services.Select(l => new InvoiceServiceItemDto
            {
                Id = l.Id, ServiceId = l.ItemRefId, ServiceCode = l.Code, ServiceName = l.Name,
                ExecuteDepartmentId = l.ExecuteDepartmentId, ExecuteDepartmentName = l.ExecuteDepartmentName,
                Quantity = (int)l.Quantity, UnitPrice = l.UnitPrice, Amount = l.Amount,
                InsuranceRate = l.InsuranceRate, InsuranceAmount = l.InsuranceAmount, PatientAmount = l.PatientAmount,
                PaymentObject = l.PaymentObject, Status = l.IsPaid ? 2 : 1, ExecutedAt = l.ExecutedAt,
            }).ToList(),
            MedicineItems = set.Medicines.Select(l => new InvoiceMedicineItemDto
            {
                Id = l.Id, MedicineId = l.ItemRefId, MedicineCode = l.Code, MedicineName = l.Name,
                ActiveIngredient = l.ActiveIngredient, Unit = l.Unit ?? string.Empty,
                Quantity = l.Quantity, UnitPrice = l.UnitPrice, Amount = l.Amount,
                InsuranceRate = l.InsuranceRate, InsuranceAmount = l.InsuranceAmount, PatientAmount = l.PatientAmount,
                PaymentObject = l.PaymentObject, Status = l.IsPaid ? 2 : 1,
            }).ToList(),
            BedItems = set.Beds.Select(l => new InvoiceBedItemDto
            {
                Id = l.Id, BedCode = l.Code, RoomName = l.RoomName ?? string.Empty,
                FromDate = l.FromDate ?? default, ToDate = l.ToDate ?? DateTime.Now, Days = l.Days,
                DayRate = l.UnitPrice, Amount = l.Amount, InsuranceRate = l.InsuranceRate, InsuranceAmount = l.InsuranceAmount,
                PatientAmount = l.PatientAmount, PaymentObject = l.PaymentObject, Status = l.IsPaid ? 2 : 1,
            }).ToList(),
            ServiceTotal = set.ServiceGross,
            MedicineTotal = set.MedicineGross,
            BedTotal = set.BedGross,
            UnpaidBedAmount = set.UnpaidBedAmount,
            SubTotal = set.ServiceGross + set.MedicineGross + set.BedGross,
            InsuranceAmount = set.InsuranceTotal,
            DiscountAmount = discount,
            DiscountReason = invoice?.DiscountReason,
            TotalAmount = total,
            PaidAmount = paid,
            RemainingAmount = remaining,
            PaymentStatus = invoice?.Status == 2 ? 2 : (remaining == 0 && total > 0 ? 1 : 0),
            PaymentStatusName = invoice?.Status == 2 ? "Đã quyết toán" : (remaining == 0 && total > 0 ? "Đã thanh toán" : "Chưa thanh toán"),
            ApprovalStatus = invoice?.IsApprovedByAccountant == true ? 1 : 0,
            ApprovalStatusName = invoice?.IsApprovedByAccountant == true ? "Đã duyệt KT" : "Chưa duyệt",
            IsLocked = medicalRecord.IsClosed,
            CreatedAt = invoice?.CreatedAt ?? DateTime.Now,
            UpdatedAt = invoice?.UpdatedAt,
        };
    }

    public async Task<InvoiceDto> CreateOrUpdateInvoiceAsync(CreateInvoiceDto dto, Guid userId)
    {
        // QA-R3: the v2 cashier calls this before collecting, so an invoice exists for ANY record (OPD services,
        // inpatient stay) — not only for records whose medicines went through outpatient dispensing.
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Include(m => m.Department)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId && !m.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án");

        await using var tx = await SqlAppLock.BeginAsync(_context); // QA-R6: see InvoiceLedger.EnsureAsync
        var (invoice, set) = await InvoiceLedger.EnsureAsync(_context, dto.MedicalRecordId, userId.ToString());

        // Money already on the record covers the whole debt (e.g. collected at reception, legacy invoice payments)
        // but the lines were never flagged: flag them against the latest payment receipt so the cashier list is right.
        if (invoice.RemainingAmount == 0 && invoice.TotalAmount > 0 && set.All.Any(l => !l.IsPaid))
        {
            var outside = InvoiceLedger.OutOfLedgerReceiptIds(_context);
            var lastReceipt = await _context.Receipts
                .Where(r => r.MedicalRecordId == dto.MedicalRecordId && r.ReceiptType == 2 && r.Status == 1 && !r.IsDeleted
                            && !outside.Contains(r.Id))
                .OrderByDescending(r => r.ReceiptDate)
                .FirstOrDefaultAsync();
            if (lastReceipt != null)
                await InvoiceLedger.MarkCoveredAsync(_context, invoice, set, lastReceipt, null, null, true, userId.ToString());
        }
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return BuildInvoiceDto(medicalRecord, invoice, set, invoice.PaidAmount, invoice.DiscountAmount);
    }

    public async Task<InvoiceDto?> GetInvoiceByIdAsync(Guid invoiceId)
    {
        // P0 (prod-e2e 2026-06-17): mở chi tiết 1 hóa đơn từ danh sách. Trước đây stub return null →
        // mọi id trả 404 dù search liệt kê. Tra ĐÚNG id-space của search (InvoiceSummaries.Id) +
        // dùng chung mapping để list↔detail đồng nhất.
        var summary = await _context.InvoiceSummaries
            .Include(x => x.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(x => x.MedicalRecord).ThenInclude(m => m.Department)
            .FirstOrDefaultAsync(x => x.Id == invoiceId && !x.IsDeleted);
        return summary == null ? null : MapSummaryToInvoiceDto(summary);
    }

    /// <summary>Map InvoiceSummary → InvoiceDto dùng chung cho search + detail (chạy in-memory sau ToListAsync).</summary>
    private static InvoiceDto MapSummaryToInvoiceDto(InvoiceSummary i) => new InvoiceDto
    {
        Id = i.Id,
        InvoiceCode = i.InvoiceCode,
        PatientId = i.MedicalRecord?.PatientId ?? Guid.Empty,
        PatientCode = i.MedicalRecord?.Patient?.PatientCode ?? "",
        PatientName = i.MedicalRecord?.Patient?.FullName ?? "",
        PhoneNumber = i.MedicalRecord?.Patient?.PhoneNumber,
        Address = i.MedicalRecord?.Patient?.Address,
        InsuranceCardNumber = i.MedicalRecord?.Patient?.InsuranceNumber,
        MedicalRecordId = i.MedicalRecordId,
        MedicalRecordCode = i.MedicalRecord?.MedicalRecordCode ?? "",
        PatientType = i.MedicalRecord?.TreatmentType ?? 1,
        PatientTypeName = (i.MedicalRecord?.TreatmentType ?? 1) == 2 ? "Nội trú" : "Ngoại trú",
        DepartmentId = i.MedicalRecord?.DepartmentId,
        DepartmentName = i.MedicalRecord?.Department?.DepartmentName,
        ServiceItems = new List<InvoiceServiceItemDto>(),
        MedicineItems = new List<InvoiceMedicineItemDto>(),
        SupplyItems = new List<InvoiceSupplyItemDto>(),
        BedItems = new List<InvoiceBedItemDto>(),
        ServiceTotal = i.TotalServiceAmount,
        MedicineTotal = i.TotalMedicineAmount,
        SupplyTotal = i.TotalSupplyAmount,
        BedTotal = i.TotalBedAmount,
        SubTotal = i.TotalAmount,
        InsuranceAmount = i.InsuranceAmount,
        DiscountAmount = i.DiscountAmount,
        DiscountReason = i.DiscountReason,
        SurchargeAmount = 0,
        TotalAmount = i.TotalAmount,
        PaidAmount = i.PaidAmount,
        RemainingAmount = i.RemainingAmount,
        PaymentStatus = i.Status,
        PaymentStatusName = i.Status switch { 0 => "Chưa thanh toán", 1 => "Đã thanh toán", 2 => "Đã quyết toán", _ => "Khác" },
        ApprovalStatus = i.IsApprovedByAccountant ? 1 : 0,
        ApprovalStatusName = i.IsApprovedByAccountant ? "Đã duyệt KT" : "Chưa duyệt",
        ApprovedAt = i.ApprovedAt,
        ApprovedBy = i.ApprovedBy,
        IsLocked = false,
        CreatedAt = i.CreatedAt,
        UpdatedAt = i.UpdatedAt,
    };

    public async Task<InvoiceDto?> GetPatientInvoiceAsync(Guid medicalRecordId)
    {
        // QA0915: this used to return CalculateInvoiceAsync's preview, whose Id is a fresh Guid.NewGuid()
        // that exists nowhere — the v2 cashier editor then paid against that id and ALWAYS got
        // "Khong tim thay hoa don". Return the persisted invoice of the record when there is one.
        var summary = await _context.InvoiceSummaries
            .Include(x => x.MedicalRecord).ThenInclude(m => m.Patient)
            .Include(x => x.MedicalRecord).ThenInclude(m => m.Department)
            .Where(x => x.MedicalRecordId == medicalRecordId && !x.IsDeleted)
            .OrderByDescending(x => x.InvoiceDate)
            .FirstOrDefaultAsync();
        if (summary != null)
            return MapSummaryToInvoiceDto(summary);

        // No invoice yet: keep returning the preview, but without a fake identity.
        var preview = await CalculateInvoiceAsync(medicalRecordId);
        preview.Id = Guid.Empty;
        return preview;
    }

    public async Task<PagedResultDto<InvoiceDto>> SearchInvoicesAsync(InvoiceSearchDto dto)
    {
        var page = dto.Page > 0 ? dto.Page : 1;
        var pageSize = dto.PageSize > 0 ? dto.PageSize : 50;

        var query = _context.InvoiceSummaries
            .Include(i => i.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .Include(i => i.MedicalRecord)
                .ThenInclude(m => m.Department)
            .Where(i => !i.IsDeleted);

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var k = dto.Keyword.Trim();
            query = query.Where(i =>
                i.InvoiceCode.Contains(k)
                || (i.MedicalRecord != null && i.MedicalRecord.Patient != null &&
                    (i.MedicalRecord.Patient.FullName.Contains(k)
                     || i.MedicalRecord.Patient.PatientCode.Contains(k))));
        }
        if (dto.PatientId.HasValue)
            query = query.Where(i => i.MedicalRecord != null && i.MedicalRecord.PatientId == dto.PatientId.Value);
        if (dto.DepartmentId.HasValue)
            query = query.Where(i => i.MedicalRecord != null && i.MedicalRecord.DepartmentId == dto.DepartmentId.Value);
        if (dto.PaymentStatus.HasValue)
            query = query.Where(i => i.Status == dto.PaymentStatus.Value);
        if (dto.FromDate.HasValue)
            query = query.Where(i => i.InvoiceDate >= dto.FromDate.Value);
        if (dto.ToDate.HasValue)
            query = query.Where(i => i.InvoiceDate < dto.ToDate.Value.Date.AddDays(1));

        var totalCount = await query.CountAsync();
        var rows = await query
            .OrderByDescending(i => i.InvoiceDate)
            .Skip(Math.Max(0, page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = rows.Select(MapSummaryToInvoiceDto).ToList();

        return new PagedResultDto<InvoiceDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<List<UnpaidServiceItemDto>> GetUnpaidServicesAsync(Guid patientId, Guid? medicalRecordId = null)
    {
        // QA-R3: same ledger as the invoice (cancelled detail lines excluded, lines paid at the cashier excluded,
        // patient share normalised), optionally scoped to the record being collected.
        var result = new List<UnpaidServiceItemDto>();
        foreach (var mrId in await ChargeRecordIdsAsync(patientId, medicalRecordId))
        {
            var set = await InvoiceLedger.LoadAsync(_context, mrId);
            result.AddRange(set.Services.Where(l => !l.IsPaid).Select(l => new UnpaidServiceItemDto
            {
                Id = l.Id,
                ServiceId = l.ItemRefId,
                ServiceCode = l.Code,
                ServiceName = l.Name,
                OrderDepartmentId = l.OrderDepartmentId,
                OrderDepartmentName = l.OrderDepartmentName,
                ExecuteDepartmentId = l.ExecuteDepartmentId,
                ExecuteDepartmentName = l.ExecuteDepartmentName,
                Quantity = (int)l.Quantity,
                UnitPrice = l.UnitPrice,
                Amount = l.Amount,
                PaymentObject = l.PaymentObject,
                InsuranceRate = l.InsuranceRate,
                InsuranceAmount = l.InsuranceAmount,
                PatientAmount = l.PatientAmount,
                OrderedAt = l.OrderedAt,
                ExecutedAt = l.ExecutedAt,
            }));
        }
        return result.OrderByDescending(x => x.OrderedAt).ToList();
    }

    public async Task<List<UnpaidMedicineItemDto>> GetUnpaidMedicinesAsync(Guid patientId, Guid? medicalRecordId = null)
    {
        // QA-R3: was "not dispensed" — a dispensed but unpaid medicine vanished from the cashier, an inpatient
        // medicine never became collectable, and a paid one stayed listed until dispensing.
        var result = new List<UnpaidMedicineItemDto>();
        foreach (var mrId in await ChargeRecordIdsAsync(patientId, medicalRecordId))
        {
            var set = await InvoiceLedger.LoadAsync(_context, mrId);
            result.AddRange(set.Medicines.Where(l => !l.IsPaid).Select(l => new UnpaidMedicineItemDto
            {
                Id = l.Id,
                MedicineId = l.ItemRefId,
                MedicineCode = l.Code,
                MedicineName = l.Name,
                ActiveIngredient = l.ActiveIngredient,
                Unit = l.Unit ?? string.Empty,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                Amount = l.Amount,
                PaymentObject = l.PaymentObject,
                InsuranceRate = l.InsuranceRate,
                InsuranceAmount = l.InsuranceAmount,
                PatientAmount = l.PatientAmount,
                PrescribedAt = l.OrderedAt,
                DispensedAt = l.ExecutedAt,
            }));
        }
        return result.OrderByDescending(x => x.PrescribedAt).ToList();
    }

    /// <summary>Records of the patient that may still carry unpaid charges (or just the requested record, if it is the patient's).</summary>
    private async Task<List<Guid>> ChargeRecordIdsAsync(Guid patientId, Guid? medicalRecordId)
    {
        if (medicalRecordId.HasValue && medicalRecordId.Value != Guid.Empty)
        {
            var owns = await _context.MedicalRecords.AnyAsync(m => m.Id == medicalRecordId.Value && m.PatientId == patientId && !m.IsDeleted);
            return owns ? new List<Guid> { medicalRecordId.Value } : new List<Guid>();
        }
        return await _context.MedicalRecords
            .Where(m => m.PatientId == patientId && !m.IsDeleted
                        && (_context.ServiceRequests.Any(r => r.MedicalRecordId == m.Id && !r.IsDeleted && !r.IsPaid && r.Status != 4)
                            || _context.Prescriptions.Any(p => p.MedicalRecordId == m.Id && !p.IsDeleted && !p.IsPaid
                                                              && p.Status != 3 && p.Status != 4 && p.Status != 5)))
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => m.Id)
            .Take(50)
            .ToListAsync();
    }

    #endregion
}
