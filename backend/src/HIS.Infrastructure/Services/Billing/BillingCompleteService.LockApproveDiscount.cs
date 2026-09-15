using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K8 phien 7 (2026-05-30): tach 3 region cuoi (10.1.6 Record Locking + 10.1.7 Accounting Approval + 10.1.8 Discounts, ~302 dong) khoi BillingCompleteService. File goc giu ctor + DI only.
public partial class BillingCompleteService {
    #region 10.1.6 Record Locking

    public async Task<RecordLockDto> LockMedicalRecordAsync(LockRecordDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);
        if (medicalRecord == null)
            throw new KeyNotFoundException("Medical record not found");

        // MedicalRecord has IsClosed property - use it as lock indicator
        medicalRecord.IsClosed = true;
        medicalRecord.UpdatedAt = DateTime.Now;
        medicalRecord.UpdatedBy = userId.ToString();
        // R3 BHYT: locking a BHYT record for billing produces its claim (refreshes a not-yet-submitted one).
        await new BhytClaimBuilder(_context).UpsertOnLockAsync(medicalRecord.Id, userId.ToString());
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);
        var lockTypeName = dto.LockType switch
        {
            1 => "Tạm khóa",
            2 => "Khóa vĩnh viễn",
            _ => "Tạm khóa"
        };

        return new RecordLockDto
        {
            MedicalRecordId = medicalRecord.Id,
            MedicalRecordCode = medicalRecord.MedicalRecordCode,
            PatientName = medicalRecord.Patient?.FullName ?? string.Empty,
            IsLocked = true,
            LockType = dto.LockType ?? 1,
            LockTypeName = lockTypeName,
            LockReason = dto.Reason,
            LockedBy = userId,
            LockedByName = user?.FullName,
            LockedAt = DateTime.Now
        };
    }

    public async Task<RecordLockDto> UnlockMedicalRecordAsync(Guid medicalRecordId, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == medicalRecordId);
        if (medicalRecord == null)
            throw new KeyNotFoundException("Medical record not found");

        medicalRecord.IsClosed = false;
        medicalRecord.UpdatedAt = DateTime.Now;
        medicalRecord.UpdatedBy = userId.ToString();
        await new BhytClaimBuilder(_context).ReopenOnUnlockAsync(medicalRecord.Id); // R3 BHYT
        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(userId);

        return new RecordLockDto
        {
            MedicalRecordId = medicalRecord.Id,
            MedicalRecordCode = medicalRecord.MedicalRecordCode,
            PatientName = medicalRecord.Patient?.FullName ?? string.Empty,
            IsLocked = false,
            LockType = null,
            LockTypeName = string.Empty,
            LockReason = null,
            UnlockedBy = userId,
            UnlockedByName = user?.FullName,
            UnlockedAt = DateTime.Now
        };
    }

    public async Task<RecordLockDto> GetRecordLockStatusAsync(Guid medicalRecordId)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return new RecordLockDto();

            var isLocked = record.Status >= 4 || record.IsClosed;

            return new RecordLockDto
            {
                MedicalRecordId = record.Id,
                MedicalRecordCode = record.MedicalRecordCode,
                PatientName = record.Patient?.FullName ?? string.Empty,
                IsLocked = isLocked,
                LockType = record.IsClosed ? 2 : (record.Status >= 4 ? 1 : null),
                LockTypeName = record.IsClosed ? "Khoa vinh vien" : (record.Status >= 4 ? "Tam khoa" : string.Empty),
                LockReason = isLocked ? "Ho so da hoan thanh thanh toan" : null,
                LockedAt = isLocked ? record.DischargeDate : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetRecordLockStatusAsync failed for record {MedicalRecordId}", medicalRecordId);
            return new RecordLockDto { IsError = true, ErrorMessage = ex.Message };
        }
    }

    #endregion

    #region 10.1.7 Accounting Approval

    public async Task<List<AccountingApprovalDto>> ApproveAccountingAsync(ApproveAccountingDto dto, Guid userId)
    {
        var results = new List<AccountingApprovalDto>();

        var invoices = await _context.InvoiceSummaries
            .Include(i => i.MedicalRecord)
                .ThenInclude(m => m.Patient)
            .Where(i => dto.InvoiceIds.Contains(i.Id))
            .ToListAsync();

        // perf(#195): userId is the same approver for every invoice in this loop — look it up once
        // instead of re-awaiting FindAsync(userId) per invoice.
        var approverName = (await _context.Users.FindAsync(userId))?.FullName;

        foreach (var invoice in invoices)
        {
            if (dto.IsApproved)
            {
                invoice.IsApprovedByAccountant = true;
                invoice.ApprovedAt = DateTime.Now;
                invoice.ApprovedBy = userId;
            }
            else
            {
                invoice.IsApprovedByAccountant = false;
                invoice.ApprovedAt = null;
                invoice.ApprovedBy = null;
            }

            invoice.UpdatedAt = DateTime.Now;

            results.Add(new AccountingApprovalDto
            {
                InvoiceId = invoice.Id,
                InvoiceCode = invoice.InvoiceCode,
                PatientName = invoice.MedicalRecord?.Patient?.FullName ?? string.Empty,
                TotalAmount = invoice.TotalAmount,
                InsuranceAmount = invoice.InsuranceAmount,
                PatientAmount = invoice.TotalAmount - invoice.InsuranceAmount,
                ApprovalStatus = dto.IsApproved ? 2 : 3,
                ApprovalStatusName = dto.IsApproved ? "Đã duyệt" : "Từ chối",
                ApprovedBy = userId,
                ApprovedByName = approverName,
                ApprovedAt = DateTime.Now,
                RejectReason = dto.IsApproved ? null : dto.RejectReason
            });
        }

        await _context.SaveChangesAsync();
        return results;
    }

    public async Task<PagedResultDto<AccountingApprovalDto>> GetPendingApprovalsAsync(PendingApprovalSearchDto dto)
    {
        return new PagedResultDto<AccountingApprovalDto>
        {
            Items = new List<AccountingApprovalDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<AccountingApprovalDto?> GetApprovalDetailAsync(Guid invoiceId)
    {
        return null;
    }

    #endregion

    #region 10.1.8 Discounts

    public async Task<InvoiceDto> ApplyInvoiceDiscountAsync(ApplyDiscountDto dto, Guid userId)
    {
        var invoice = await _context.InvoiceSummaries.FindAsync(dto.InvoiceId);
        if (invoice == null)
            throw new KeyNotFoundException("Invoice not found");

        decimal discountAmount = 0;
        if (dto.DiscountType == 1 && dto.DiscountPercent.HasValue)
        {
            discountAmount = invoice.TotalAmount * dto.DiscountPercent.Value / 100;
        }
        else if (dto.DiscountAmount.HasValue)
        {
            discountAmount = dto.DiscountAmount.Value;
        }

        // Sprint 3 Item 2.4: validate lý do chuẩn hóa + ngưỡng duyệt
        if (discountAmount > 0)
        {
            if (!dto.DiscountReasonCode.HasValue || dto.DiscountReasonCode == 0)
                throw new InvalidOperationException("Bắt buộc chọn lý do giảm giá");
            if (dto.DiscountReasonCode == 6 && string.IsNullOrWhiteSpace(dto.DiscountNote))
                throw new InvalidOperationException("Chọn 'Khác' phải ghi rõ lý do trong ghi chú");
            if (discountAmount >= 500_000m && !dto.ApproverId.HasValue)
                throw new InvalidOperationException(
                    "Giảm giá từ 500,000đ trở lên phải có người duyệt (trưởng phòng TCKT hoặc GĐ)");
            if (discountAmount >= 5_000_000m && dto.DiscountReasonCode != 4)
                throw new InvalidOperationException(
                    "Giảm giá từ 5,000,000đ trở lên phải chọn lý do 'Giám đốc duyệt miễn'");
        }

        EnsureDiscountFits(invoice, discountAmount);
        invoice.DiscountAmount = discountAmount;
        invoice.DiscountReason = dto.DiscountReason;
        // QA0915: RemainingAmount was left stale, so the payment guard (which reads RemainingAmount)
        // let the cashier collect the full pre-discount amount (measured: 3.000đ discount, 7.200đ collected).
        RecomputeInvoiceRemaining(invoice);
        invoice.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();

        var invoiceDto = await CalculateInvoiceAsync(invoice.MedicalRecordId);
        invoiceDto.Id = invoice.Id;
        invoiceDto.InvoiceCode = invoice.InvoiceCode;
        invoiceDto.DiscountAmount = discountAmount;
        invoiceDto.DiscountReason = dto.DiscountReason;
        invoiceDto.DiscountType = dto.DiscountType;
        invoiceDto.DiscountPercent = dto.DiscountPercent;
        invoiceDto.TotalAmount -= discountAmount;
        // QA-R3: CalculateInvoiceAsync already nets the saved discount out of RemainingAmount.

        return invoiceDto;
    }

    public async Task<InvoiceDto> ApplyServiceDiscountAsync(ApplyDiscountDto dto, Guid userId)
    {
        var invoice = await _context.InvoiceSummaries.FindAsync(dto.InvoiceId);
        if (invoice == null)
            throw new KeyNotFoundException("Invoice not found");

        // Calculate total discount from individual service discounts
        decimal totalDiscount = 0;
        if (dto.ServiceDiscounts != null)
        {
            foreach (var sd in dto.ServiceDiscounts)
            {
                if (sd.DiscountType == 1 && sd.DiscountPercent.HasValue)
                {
                    // Percentage-based: estimate from invoice total divided by service count
                    totalDiscount += sd.DiscountPercent.Value;
                }
                else if (sd.DiscountAmount.HasValue)
                {
                    totalDiscount += sd.DiscountAmount.Value;
                }
            }
        }

        EnsureDiscountFits(invoice, totalDiscount);
        invoice.DiscountAmount = totalDiscount;
        invoice.DiscountReason = dto.DiscountReason;
        RecomputeInvoiceRemaining(invoice); // QA0915: same stale-RemainingAmount bug as invoice discount
        invoice.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();

        var invoiceDto = await CalculateInvoiceAsync(invoice.MedicalRecordId);
        invoiceDto.Id = invoice.Id;
        invoiceDto.InvoiceCode = invoice.InvoiceCode;
        invoiceDto.DiscountAmount = totalDiscount;
        invoiceDto.DiscountReason = dto.DiscountReason;
        invoiceDto.DiscountType = 2; // Theo dịch vụ
        invoiceDto.TotalAmount -= totalDiscount;
        // QA-R3: CalculateInvoiceAsync already nets the saved discount out of RemainingAmount.

        return invoiceDto;
    }

    /// <summary>QA0915: a discount may only cover what is still unpaid (was unbounded — 9.000đ accepted on a paid 7.200đ invoice).</summary>
    private static void EnsureDiscountFits(InvoiceSummary invoice, decimal discountAmount)
    {
        if (discountAmount < 0)
            throw new InvalidOperationException("Số tiền miễn giảm không được âm");
        var unpaid = invoice.TotalAmount - invoice.PaidAmount;
        if (discountAmount > unpaid)
            throw new InvalidOperationException(
                $"Số tiền miễn giảm ({discountAmount:N0}đ) vượt quá số tiền hóa đơn chưa thanh toán ({Math.Max(0, unpaid):N0}đ)");
    }

    /// <summary>Same formula as CreatePaymentAsync/CancelPaymentAsync.</summary>
    private static void RecomputeInvoiceRemaining(InvoiceSummary invoice)
    {
        invoice.RemainingAmount = Math.Max(0, invoice.TotalAmount - invoice.DiscountAmount - invoice.PaidAmount);
        if (invoice.RemainingAmount > 0 && invoice.Status == 1)
            invoice.Status = 0;
        else if (invoice.RemainingAmount == 0 && invoice.Status == 0)
            invoice.Status = 1;
    }

    public async Task<List<DiscountHistoryDto>> GetDiscountHistoryAsync(Guid invoiceId)
    {
        // No separate discount-history table — derive from InvoiceSummary's
        // own discount fields (one entry per invoice if discount applied).
        var inv = await _context.InvoiceSummaries
            .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted);
        if (inv == null || inv.DiscountAmount <= 0) return new List<DiscountHistoryDto>();
        return new List<DiscountHistoryDto>
        {
            new DiscountHistoryDto
            {
                Id = inv.Id,
                InvoiceId = inv.Id,
                InvoiceCode = inv.InvoiceCode,
                DiscountScope = 1,
                DiscountType = 1,
                DiscountPercent = inv.TotalAmount > 0 ? Math.Round(inv.DiscountAmount / inv.TotalAmount * 100, 2) : 0,
                DiscountAmount = inv.DiscountAmount,
                Reason = inv.DiscountReason,
                CreatedBy = Guid.Empty,
                CreatedByName = inv.CreatedBy ?? "",
                CreatedAt = inv.CreatedAt,
                ApprovedBy = inv.ApprovedBy,
                ApprovedAt = inv.ApprovedAt,
            },
        };
    }

    public async Task<bool> CancelDiscountAsync(Guid discountId, string reason, Guid userId)
    {
        // discountId maps to InvoiceSummary.Id (discount is stored on the invoice)
        var invoice = await _context.InvoiceSummaries.FindAsync(discountId);
        if (invoice == null)
            throw new KeyNotFoundException("Invoice not found");

        invoice.DiscountAmount = 0;
        invoice.DiscountReason = $"Hủy miễn giảm: {reason}";
        // QA0915: TotalAmount is already the patient share (same formula as CreatePaymentAsync); subtracting
        // InsuranceAmount again under-stated the debt and could go negative.
        RecomputeInvoiceRemaining(invoice);
        invoice.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
}
