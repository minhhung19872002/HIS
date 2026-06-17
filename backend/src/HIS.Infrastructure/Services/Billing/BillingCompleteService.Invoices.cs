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
        // Get the medical record and related prescriptions
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);

        if (medicalRecord == null)
        {
            return new InvoiceDto { TotalAmount = 0 };
        }

        // Get prescriptions for this medical record
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details)
                .ThenInclude(d => d.Medicine)
            .Where(p => p.MedicalRecordId == medicalRecordId)
            .ToListAsync();

        decimal totalMedicineAmount = 0;
        var medicineItems = new List<InvoiceMedicineItemDto>();

        foreach (var prescription in prescriptions)
        {
            foreach (var detail in prescription.Details)
            {
                var itemTotal = detail.Quantity * detail.UnitPrice;
                totalMedicineAmount += itemTotal;
                medicineItems.Add(new InvoiceMedicineItemDto
                {
                    Id = detail.Id,
                    MedicineId = detail.MedicineId,
                    MedicineCode = detail.Medicine?.MedicineCode ?? string.Empty,
                    MedicineName = detail.Medicine?.MedicineName ?? string.Empty,
                    ActiveIngredient = detail.Medicine?.ActiveIngredient,
                    Unit = detail.Unit ?? "Viên",
                    Quantity = detail.Quantity,
                    UnitPrice = detail.UnitPrice,
                    Amount = itemTotal,
                    InsuranceRate = detail.InsurancePaymentRate,
                    InsuranceAmount = detail.InsuranceAmount,
                    PatientAmount = detail.PatientAmount,
                    PaymentObject = detail.PatientType,
                    Status = detail.Status
                });
            }
        }

        return new InvoiceDto
        {
            Id = Guid.NewGuid(),
            MedicalRecordId = medicalRecordId,
            PatientId = medicalRecord.PatientId,
            PatientCode = medicalRecord.Patient?.PatientCode ?? string.Empty,
            PatientName = medicalRecord.Patient?.FullName ?? string.Empty,
            MedicalRecordCode = medicalRecord.MedicalRecordCode,
            PatientType = 1, // Ngoại trú
            PatientTypeName = "Ngoại trú",
            MedicineItems = medicineItems,
            MedicineTotal = totalMedicineAmount,
            SubTotal = totalMedicineAmount,
            TotalAmount = totalMedicineAmount,
            InsuranceAmount = 0,
            PaidAmount = 0,
            RemainingAmount = totalMedicineAmount,
            PaymentStatus = 0, // Chưa thanh toán
            PaymentStatusName = "Chưa thanh toán",
            CreatedAt = DateTime.Now
        };
    }

    public async Task<InvoiceDto> CreateOrUpdateInvoiceAsync(CreateInvoiceDto dto, Guid userId)
    {
        // Check for existing invoice
        var existing = await _context.InvoiceSummaries
            .FirstOrDefaultAsync(i => i.MedicalRecordId == dto.MedicalRecordId);

        // Calculate invoice from medical record data
        var invoiceDto = await CalculateInvoiceAsync(dto.MedicalRecordId);

        if (existing == null)
        {
            var invoice = new InvoiceSummary
            {
                Id = Guid.NewGuid(),
                InvoiceCode = $"HD{DateTime.Now:yyyyMMddHHmmssfff}",
                InvoiceDate = DateTime.Now,
                MedicalRecordId = dto.MedicalRecordId,
                TotalMedicineAmount = invoiceDto.MedicineTotal,
                TotalAmount = invoiceDto.TotalAmount,
                InsuranceAmount = invoiceDto.InsuranceAmount,
                DiscountAmount = 0,
                PaidAmount = 0,
                RemainingAmount = invoiceDto.TotalAmount,
                Status = 0, // Chưa thanh toán
                CreatedAt = DateTime.Now,
                CreatedBy = userId.ToString()
            };
            _context.InvoiceSummaries.Add(invoice);
            await _context.SaveChangesAsync();

            invoiceDto.Id = invoice.Id;
            invoiceDto.InvoiceCode = invoice.InvoiceCode;
        }
        else
        {
            existing.TotalMedicineAmount = invoiceDto.MedicineTotal;
            existing.TotalAmount = invoiceDto.TotalAmount;
            existing.InsuranceAmount = invoiceDto.InsuranceAmount;
            existing.RemainingAmount = invoiceDto.TotalAmount - existing.PaidAmount - existing.DiscountAmount;
            existing.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            invoiceDto.Id = existing.Id;
            invoiceDto.InvoiceCode = existing.InvoiceCode;
        }

        return invoiceDto;
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
        return await CalculateInvoiceAsync(medicalRecordId);
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
            .Skip((page - 1) * pageSize)
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

    public async Task<List<UnpaidServiceItemDto>> GetUnpaidServicesAsync(Guid patientId)
    {
        // Find patient's medical records, then any unpaid service-request details
        var requests = await _context.ServiceRequests
            .Include(r => r.Department)
            .Include(r => r.ExecuteDepartment)
            .Include(r => r.Service)
            .Include(r => r.Details).ThenInclude(d => d.Service)
            .Include(r => r.MedicalRecord)
            .Where(r => !r.IsDeleted
                        && !r.IsPaid
                        && r.Status != 4 // not cancelled
                        && r.MedicalRecord.PatientId == patientId)
            .OrderByDescending(r => r.RequestDate)
            .ToListAsync();

        var result = new List<UnpaidServiceItemDto>();
        foreach (var r in requests)
        {
            // Prefer detail rows; fall back to header if no details
            if (r.Details != null && r.Details.Count > 0)
            {
                foreach (var d in r.Details)
                {
                    result.Add(new UnpaidServiceItemDto
                    {
                        Id = d.Id,
                        ServiceId = d.ServiceId,
                        ServiceCode = d.Service?.ServiceCode ?? "",
                        ServiceName = d.Service?.ServiceName ?? "",
                        ServiceGroup = "",
                        OrderDepartmentId = r.DepartmentId,
                        OrderDepartmentName = r.Department?.DepartmentName,
                        ExecuteDepartmentId = r.ExecuteDepartmentId,
                        ExecuteDepartmentName = r.ExecuteDepartment?.DepartmentName,
                        Quantity = d.Quantity,
                        UnitPrice = d.UnitPrice,
                        Amount = d.Amount,
                        PaymentObject = d.PatientType,
                        InsuranceRate = d.InsurancePaymentRate,
                        InsuranceAmount = d.InsuranceAmount,
                        PatientAmount = d.PatientAmount,
                        OrderedAt = r.RequestDate,
                        ExecutedAt = d.ResultDate,
                    });
                }
            }
            else
            {
                result.Add(new UnpaidServiceItemDto
                {
                    Id = r.Id,
                    ServiceId = r.ServiceId ?? Guid.Empty,
                    ServiceCode = r.Service?.ServiceCode ?? "",
                    ServiceName = r.Service?.ServiceName ?? "",
                    OrderDepartmentId = r.DepartmentId,
                    OrderDepartmentName = r.Department?.DepartmentName,
                    ExecuteDepartmentId = r.ExecuteDepartmentId,
                    ExecuteDepartmentName = r.ExecuteDepartment?.DepartmentName,
                    Quantity = r.Quantity,
                    UnitPrice = r.UnitPrice,
                    Amount = r.TotalAmount,
                    InsuranceAmount = r.InsuranceAmount,
                    PatientAmount = r.PatientAmount,
                    OrderedAt = r.RequestDate,
                });
            }
        }
        return result;
    }

    public async Task<List<UnpaidMedicineItemDto>> GetUnpaidMedicinesAsync(Guid patientId)
    {
        var prescriptions = await _context.Prescriptions
            .Include(p => p.Details).ThenInclude(d => d.Medicine)
            .Include(p => p.MedicalRecord)
            .Where(p => !p.IsDeleted
                        && !p.IsDispensed
                        && p.Status != 4 // not cancelled
                        && p.MedicalRecord.PatientId == patientId)
            .OrderByDescending(p => p.PrescriptionDate)
            .ToListAsync();

        var result = new List<UnpaidMedicineItemDto>();
        foreach (var p in prescriptions)
        {
            foreach (var d in p.Details ?? new List<PrescriptionDetail>())
            {
                result.Add(new UnpaidMedicineItemDto
                {
                    Id = d.Id,
                    MedicineId = d.MedicineId,
                    MedicineCode = d.Medicine?.MedicineCode ?? "",
                    MedicineName = d.Medicine?.MedicineName ?? "",
                    ActiveIngredient = d.Medicine?.ActiveIngredient,
                    Unit = d.Unit ?? d.Medicine?.Unit ?? "",
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Amount = d.Amount,
                    InsuranceAmount = d.InsuranceAmount,
                    PatientAmount = d.PatientAmount,
                    PrescribedAt = p.PrescriptionDate,
                    DispensedAt = p.DispensedAt,
                });
            }
        }
        return result;
    }

    #endregion
}
