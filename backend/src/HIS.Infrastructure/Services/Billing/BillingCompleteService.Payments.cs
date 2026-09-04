using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

// K8 phien 5 (2026-05-30): tach 3 region (10.1.3 Deposits + 10.1.4 Payments + 10.1.5 Refunds, ~662 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.1.3 Deposits

    public async Task<DepositDto> CreateDepositAsync(CreateDepositDto dto, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(dto.PatientId);
        if (patient == null)
            throw new KeyNotFoundException("Patient not found");
        // #189: chặn số tiền <= 0 (chống bản ghi tài chính rác/âm)
        if (dto.Amount <= 0)
            throw new InvalidOperationException("Số tiền tạm ứng phải lớn hơn 0");

        var deposit = new Deposit
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = $"TU{DateTime.Now:yyyyMMddHHmmssfff}",
            ReceiptDate = DateTime.UtcNow, // dot16: chuẩn UTC — Deposits bị query DayRangeUtc (Reception:298)
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            Amount = dto.Amount,
            UsedAmount = 0,
            RemainingAmount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            Status = 2, // Đã xác nhận
            ReceivedByUserId = userId,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now
        };

        _context.Deposits.Add(deposit);
        await _context.SaveChangesAsync();

        return new DepositDto
        {
            Id = deposit.Id,
            ReceiptCode = deposit.ReceiptNumber,
            PatientId = deposit.PatientId ?? Guid.Empty,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            Amount = deposit.Amount,
            UsedAmount = 0,
            RemainingAmount = deposit.Amount,
            PaymentMethod = deposit.PaymentMethod,
            PaymentMethodName = GetPaymentMethodName(deposit.PaymentMethod),
            Status = deposit.Status,
            StatusName = "Đã xác nhận",
            Notes = deposit.Notes,
            CreatedAt = deposit.CreatedAt,
            ConfirmedAt = DateTime.Now
        };
    }

    public async Task<DepartmentDepositDto> CreateDepartmentDepositAsync(Guid departmentId, List<Guid> depositIds, Guid userId)
    {
        var department = await _context.Departments.FindAsync(departmentId);
        var deposits = await _context.Deposits
            .Where(d => depositIds.Contains(d.Id))
            .ToListAsync();

        var user = await _context.Users.FindAsync(userId);
        var totalAmount = deposits.Sum(d => d.Amount);

        return new DepartmentDepositDto
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"TUK{DateTime.Now:yyyyMMddHHmmssfff}",
            DepartmentId = departmentId,
            DepartmentCode = department?.DepartmentCode ?? string.Empty,
            DepartmentName = department?.DepartmentName ?? string.Empty,
            SubmittedBy = userId,
            SubmittedByName = user?.FullName ?? string.Empty,
            Deposits = deposits.Select(d => new DepositDto
            {
                Id = d.Id,
                ReceiptCode = d.ReceiptNumber,
                PatientId = d.PatientId ?? Guid.Empty,
                Amount = d.Amount,
                UsedAmount = d.UsedAmount,
                RemainingAmount = d.RemainingAmount,
                Status = d.Status,
                StatusName = "Đã xác nhận",
                CreatedAt = d.CreatedAt
            }).ToList(),
            TotalAmount = totalAmount,
            PaymentMethod = 1,
            CashierId = userId,
            CashierName = user?.FullName ?? string.Empty,
            Status = 1, // Chờ tiếp nhận
            CreatedAt = DateTime.Now
        };
    }

    public async Task<DepartmentDepositDto> ReceiveDepartmentDepositAsync(Guid departmentDepositId, Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);

        // No DepartmentDeposit table - return stub confirming receipt
        return new DepartmentDepositDto
        {
            Id = departmentDepositId,
            ReceiptCode = $"TUK{departmentDepositId.ToString()[..8]}",
            DepartmentId = Guid.Empty,
            DepartmentCode = string.Empty,
            DepartmentName = string.Empty,
            SubmittedBy = Guid.Empty,
            SubmittedByName = string.Empty,
            Deposits = new List<DepositDto>(),
            TotalAmount = 0,
            PaymentMethod = 1,
            CashierId = userId,
            CashierName = user?.FullName ?? string.Empty,
            Status = 2, // Đã tiếp nhận
            CreatedAt = DateTime.Now,
            ReceivedAt = DateTime.Now
        };
    }

    public async Task<DepositBalanceDto> GetDepositBalanceAsync(Guid patientId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        var deposits = await _context.Deposits
            .Where(d => d.PatientId == patientId && d.Status != 5) // Exclude cancelled
            .ToListAsync();

        var totalDeposit = deposits.Sum(d => d.Amount);
        var usedAmount = deposits.Sum(d => d.UsedAmount);

        return new DepositBalanceDto
        {
            PatientId = patientId,
            PatientCode = patient?.PatientCode ?? string.Empty,
            PatientName = patient?.FullName ?? string.Empty,
            TotalDeposit = totalDeposit,
            UsedAmount = usedAmount,
            RemainingBalance = totalDeposit - usedAmount,
            ActiveDeposits = deposits
                .Where(d => d.RemainingAmount > 0 && d.Status == 2)
                .Select(d => new DepositDto
                {
                    Id = d.Id,
                    ReceiptCode = d.ReceiptNumber,
                    PatientId = d.PatientId ?? Guid.Empty,
                    Amount = d.Amount,
                    UsedAmount = d.UsedAmount,
                    RemainingAmount = d.RemainingAmount,
                    Status = d.Status,
                    StatusName = "Đã xác nhận",
                    CreatedAt = d.CreatedAt
                }).ToList()
        };
    }

    public async Task<PaymentDto> UseDepositForPaymentAsync(UseDepositForPaymentDto dto, Guid userId)
    {
        var deposit = await _context.Deposits.FindAsync(dto.DepositId);
        if (deposit == null)
            throw new KeyNotFoundException("Không tìm thấy phiếu tạm ứng"); // #462: 404, không phải 500
        // #189: chặn số tiền <= 0 trước khi so số dư
        if (dto.Amount <= 0)
            throw new InvalidOperationException("Số tiền sử dụng phải lớn hơn 0");
        if (deposit.RemainingAmount < dto.Amount)
            throw new InvalidOperationException("Số dư tạm ứng không đủ"); // #462: 400, không phải 500

        deposit.UsedAmount += dto.Amount;
        deposit.RemainingAmount -= dto.Amount;
        if (deposit.RemainingAmount == 0)
            deposit.Status = 3; // Đã sử dụng hết

        // Create payment receipt
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"PT{DateTime.Now:yyyyMMddHHmmssfff}",
            ReceiptDate = DateTime.Now,
            PatientId = deposit.PatientId ?? Guid.Empty,
            ReceiptType = 2,
            PaymentMethod = 5, // Tạm ứng
            Amount = dto.Amount,
            Discount = 0,
            FinalAmount = dto.Amount,
            Status = 1,
            CashierId = userId,
            Note = $"Thanh toán từ tạm ứng {deposit.ReceiptNumber}",
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Receipts.Add(receipt);
        await _context.SaveChangesAsync();

        var patient = await _context.Patients.FindAsync(deposit.PatientId);

        return new PaymentDto
        {
            Id = receipt.Id,
            PaymentCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientName = patient?.FullName ?? string.Empty,
            InvoiceId = dto.InvoiceId,
            Amount = receipt.FinalAmount,
            PaymentMethod = "Tạm ứng",
            PaymentStatus = "Đã thanh toán",
            PaymentDate = receipt.ReceiptDate,
            ReceivedBy = userId.ToString(),
            Note = receipt.Note ?? string.Empty,
            CreatedDate = receipt.CreatedAt
        };
    }

    public async Task<List<DepositDto>> GetPatientDepositsAsync(Guid patientId, int? status)
    {
        var query = _context.Deposits
            .Include(d => d.Patient)
            .Include(d => d.MedicalRecord)
            .Include(d => d.ReceivedBy)
            .Where(d => d.PatientId == patientId && !d.IsDeleted);
        if (status.HasValue) query = query.Where(d => d.Status == status.Value);

        var rows = await query.OrderByDescending(d => d.ReceiptDate).ToBoundedListAsync("BillingCompleteService.GetPatientDepositsAsync");
        return rows.Select(d => new DepositDto
        {
            Id = d.Id,
            ReceiptCode = d.ReceiptNumber,
            PatientId = d.PatientId ?? patientId,
            PatientCode = d.Patient?.PatientCode ?? "",
            PatientName = d.Patient?.FullName ?? "",
            MedicalRecordId = d.MedicalRecordId,
            MedicalRecordCode = d.MedicalRecord?.MedicalRecordCode,
            DepositType = 1,
            DepositTypeName = "Tạm ứng",
            DepositSource = 1,
            DepositSourceName = "Thu ngân",
            Amount = d.Amount,
            UsedAmount = d.UsedAmount,
            RemainingAmount = d.RemainingAmount,
            PaymentMethod = d.PaymentMethod,
            PaymentMethodName = d.PaymentMethod switch { 1 => "Tiền mặt", 2 => "Chuyển khoản", 3 => "Thẻ", 4 => "QR", _ => "Khác" },
            TransactionNumber = d.TransactionReference,
            CashierId = d.ReceivedByUserId,
            CashierName = d.ReceivedBy?.FullName ?? "",
        }).ToList();
    }

    public async Task<bool> CancelDepositAsync(Guid depositId, string reason, Guid userId)
    {
        var deposit = await _context.Deposits.FindAsync(depositId);
        if (deposit == null)
            throw new KeyNotFoundException("Deposit not found");
        if (deposit.UsedAmount > 0)
            throw new InvalidOperationException("Cannot cancel deposit that has been partially used");

        deposit.Status = 5; // Đã hủy
        deposit.Notes = $"{deposit.Notes} | Hủy: {reason}";
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region 10.1.4 Payments

    public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto, Guid userId)
    {
        // Lỗi nghiệp vụ = InvalidOperationException → DomainExceptionFilter trả 400 + message rõ
        // (trước là Exception thường → unhandled tới Kestrel → Cloud Run 503 trần không CORS
        //  → FE tưởng mạng lỗi và retry → THU TRÙNG. Bug tài chính prod 2026-06-12).
        // #189: chặn số tiền <= 0 (chống phiếu thu rác/âm làm hỏng PaidAmount hóa đơn)
        if (dto.Amount <= 0)
            throw new InvalidOperationException("Số tiền thanh toán phải lớn hơn 0");
        decimal totalOwed;
        Guid? medicalRecordId = null;
        var patientId = dto.PatientId;
        InvoiceSummary? invoice = null;

        if (dto.InvoiceId.HasValue && dto.InvoiceId.Value != Guid.Empty)
        {
            invoice = await _context.InvoiceSummaries
                .FirstOrDefaultAsync(i => i.Id == dto.InvoiceId.Value);

            if (invoice == null)
                throw new InvalidOperationException("Khong tim thay hoa don (invoiceId khong ton tai)");

            totalOwed = invoice.RemainingAmount;
            medicalRecordId = invoice.MedicalRecordId;

            // FE thu theo hóa đơn KHÔNG gửi patientId (CreatePaymentDto FE không có field này)
            // → trước đây Receipt.PatientId = Guid.Empty → FK_Receipts_Patients nổ 500 (bug thu tiền prod).
            // Resolve từ HSBA của hóa đơn.
            if (patientId == Guid.Empty)
                patientId = await _context.MedicalRecords
                    .Where(m => m.Id == invoice.MedicalRecordId)
                    .Select(m => m.PatientId)
                    .FirstOrDefaultAsync();
        }
        else
        {
            var patientMedicalRecordIds = await _context.MedicalRecords
                .Where(m => m.PatientId == dto.PatientId && m.Status != 4)
                .Select(m => m.Id)
                .ToListAsync();

            var unpaidServiceRequests = await _context.ServiceRequests
                .Where(sr => patientMedicalRecordIds.Contains(sr.MedicalRecordId) && !sr.IsPaid && sr.Status != 4)
                .ToListAsync();

            if (!unpaidServiceRequests.Any())
                throw new InvalidOperationException("Benh nhan khong co hoa don hoac dich vu chua thanh toan");

            totalOwed = unpaidServiceRequests.Sum(sr => sr.PatientAmount);
            medicalRecordId = unpaidServiceRequests.Select(sr => (Guid?)sr.MedicalRecordId).FirstOrDefault();
        }

        // IDEMPOTENCY chống thu trùng — PHẢI check TRƯỚC over-payment: client retry
        // (timeout/503 edge/double-click) sau khi phiếu đầu đã trừ hết nợ thì remaining=0,
        // nếu check over-payment trước sẽ trả 400 thay vì trả lại phiếu đã tạo.
        // Cửa sổ 30s, cùng HSBA + số tiền + thu ngân → trả CHÍNH phiếu cũ, không tạo mới.
        var dupWindow = DateTime.Now.AddSeconds(-30);
        var duplicate = await _context.Receipts
            .Where(r => r.MedicalRecordId == medicalRecordId
                && r.CashierId == userId
                && r.FinalAmount == dto.Amount
                && r.ReceiptType == 2
                && r.Status == 1
                && r.ReceiptDate >= dupWindow)
            .OrderByDescending(r => r.ReceiptDate)
            .FirstOrDefaultAsync();
        if (duplicate != null)
            return await BuildPaymentDtoAsync(duplicate, dto.InvoiceId, patientId == Guid.Empty ? duplicate.PatientId : patientId);

        // Chặn over-payment (thu vượt nợ thật sự → 400 rõ ràng)
        if (dto.Amount > totalOwed)
            throw new InvalidOperationException($"So tien thanh toan ({dto.Amount:N0}d) vuot qua so tien con no ({totalOwed:N0}d)");

        if (patientId == Guid.Empty)
            throw new InvalidOperationException("Thieu thong tin benh nhan (patientId) — khong the tao phieu thu");

        int paymentMethod = 1;
        if (int.TryParse(dto.PaymentMethod, out int pm))
        {
            paymentMethod = pm;
        }

        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"PT{DateTime.Now:yyyyMMddHHmmssfff}",
            ReceiptDate = DateTime.Now,
            PatientId = patientId,
            MedicalRecordId = medicalRecordId,
            ReceiptType = 2,
            PaymentMethod = paymentMethod,
            Amount = dto.Amount,
            Discount = 0,
            FinalAmount = dto.Amount,
            Status = 1,
            CashierId = userId,
            Note = dto.Note,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };
        _context.Receipts.Add(receipt);

        // ATOMIC: cập nhật hóa đơn trong CÙNG SaveChanges với phiếu thu (1 transaction) —
        // không còn trạng thái "phiếu đã commit nhưng invoice chưa trừ nợ" khi lỗi giữa chừng.
        if (invoice != null)
        {
            invoice.PaidAmount += dto.Amount;
            invoice.RemainingAmount = Math.Max(0, invoice.TotalAmount - invoice.DiscountAmount - invoice.PaidAmount);
            if (invoice.RemainingAmount == 0)
                invoice.Status = 1;
            invoice.UpdatedAt = DateTime.Now;
            invoice.UpdatedBy = userId.ToString();
        }

        await _context.SaveChangesAsync();

        return await BuildPaymentDtoAsync(receipt, dto.InvoiceId, patientId);
    }

    // Mapping Receipt → PaymentDto (dùng chung cho phiếu mới + phiếu trả lại từ dedup idempotency)
    private async Task<PaymentDto> BuildPaymentDtoAsync(Receipt receipt, Guid? invoiceId, Guid patientId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        return new PaymentDto
        {
            Id = receipt.Id,
            PaymentCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientName = patient?.FullName ?? string.Empty,
            InvoiceId = invoiceId,
            Amount = receipt.FinalAmount,
            PaymentMethod = GetPaymentMethodName(receipt.PaymentMethod),
            PaymentStatus = "Da thanh toan",
            PaymentDate = receipt.ReceiptDate,
            ReceivedBy = receipt.CashierId.ToString(),
            Note = receipt.Note ?? string.Empty,
            CreatedDate = receipt.CreatedAt
        };
    }

    private string GetPaymentMethodName(int method)
    {
        return method switch
        {
            1 => "Tiền mặt",
            2 => "Chuyển khoản",
            3 => "Thẻ",
            4 => "Ví điện tử",
            _ => "Khác"
        };
    }

    public async Task<bool> CancelPaymentAsync(Guid paymentId, string reason, Guid userId)
    {
        var receipt = await _context.Receipts.FindAsync(paymentId);
        if (receipt == null)
            // Không tìm thấy là 404, không phải lỗi quy tắc nghiệp vụ (400).
            throw new KeyNotFoundException("Khong tim thay phieu thu");
        if (receipt.Status == 2)
            throw new InvalidOperationException("Phieu thu da huy truoc do");

        receipt.Status = 2; // Đã hủy
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";

        // Hoàn nợ hóa đơn (2026-06-12): trước đây hủy phiếu KHÔNG trả lại PaidAmount/RemainingAmount
        // → hóa đơn vẫn "đã thu" dù phiếu hủy. Receipt không có link InvoiceId → tìm theo HSBA (best-effort).
        if (receipt.ReceiptType == 2 && receipt.MedicalRecordId.HasValue)
        {
            var invoice = await _context.InvoiceSummaries
                .FirstOrDefaultAsync(i => i.MedicalRecordId == receipt.MedicalRecordId.Value);
            if (invoice != null)
            {
                invoice.PaidAmount = Math.Max(0, invoice.PaidAmount - receipt.FinalAmount);
                invoice.RemainingAmount = Math.Max(0, invoice.TotalAmount - invoice.DiscountAmount - invoice.PaidAmount);
                if (invoice.RemainingAmount > 0 && invoice.Status == 1)
                    invoice.Status = 0; // còn nợ → bỏ cờ "đã thanh toán đủ"
                invoice.UpdatedAt = DateTime.Now;
                invoice.UpdatedBy = userId.ToString();
            }
        }

        await _context.SaveChangesAsync(); // atomic: hủy phiếu + hoàn nợ cùng transaction
        return true;
    }

    public async Task<PaymentHistoryDto> GetPaymentHistoryAsync(Guid patientId)
    {
        try
        {
            var receipts = await _context.Receipts
                .Include(r => r.Cashier)
                .Include(r => r.MedicalRecord)
                .Where(r => r.PatientId == patientId)
                .OrderByDescending(r => r.ReceiptDate)
                .ToListAsync();

            if (!receipts.Any()) return new PaymentHistoryDto { PaymentId = patientId };

            var latest = receipts.First();
            return new PaymentHistoryDto
            {
                Id = latest.Id,
                PaymentId = latest.Id,
                Action = latest.ReceiptType switch
                {
                    1 => "Tam ung",
                    2 => "Thanh toan",
                    3 => "Hoan tra",
                    _ => "Khac"
                },
                OldStatus = "Chua TT",
                NewStatus = latest.Status == 1 ? "Da thu" : "Da huy",
                ActionDate = latest.ReceiptDate,
                ActionBy = latest.Cashier?.FullName ?? string.Empty,
                Note = $"Tong {receipts.Count} phieu. So tien: {latest.FinalAmount:N0} VND. {latest.Note}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetPaymentHistoryAsync failed for patient {PatientId}", patientId);
            return new PaymentHistoryDto { IsError = true, ErrorMessage = ex.Message };
        }
    }

    public async Task<PaymentStatusDto> CheckPaymentStatusAsync(Guid medicalRecordId)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return new PaymentStatusDto();

            var totalAmount = await _context.ServiceRequests
                .Where(sr => sr.MedicalRecordId == medicalRecordId && sr.Status != 4)
                .SumAsync(sr => sr.PatientAmount);

            var paidAmount = await _context.Receipts
                .Where(r => r.MedicalRecordId == medicalRecordId && r.Status == 1)
                .SumAsync(r => r.ReceiptType == 3 ? -r.FinalAmount : r.FinalAmount);

            var remaining = totalAmount - paidAmount;
            var status = remaining <= 0 ? "Paid" : (paidAmount > 0 ? "Partial" : "Unpaid");

            return new PaymentStatusDto
            {
                PatientId = record.PatientId,
                PatientName = record.Patient?.FullName ?? string.Empty,
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                RemainingAmount = remaining > 0 ? remaining : 0,
                Status = status
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CheckPaymentStatusAsync failed for record {MedicalRecordId}", medicalRecordId);
            return new PaymentStatusDto { IsError = true, ErrorMessage = ex.Message };
        }
    }

    #endregion
}
