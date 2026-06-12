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

// K8 phien 5 (2026-05-30): tach 3 region (10.1.3 Deposits + 10.1.4 Payments + 10.1.5 Refunds, ~662 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.1.3 Deposits

    public async Task<DepositDto> CreateDepositAsync(CreateDepositDto dto, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(dto.PatientId);
        if (patient == null)
            throw new Exception("Patient not found");

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
            throw new Exception("Deposit not found");
        if (deposit.RemainingAmount < dto.Amount)
            throw new Exception("Insufficient deposit balance");

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

        var rows = await query.OrderByDescending(d => d.ReceiptDate).ToListAsync();
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
            throw new Exception("Deposit not found");
        if (deposit.UsedAmount > 0)
            throw new Exception("Cannot cancel deposit that has been partially used");

        deposit.Status = 5; // Đã hủy
        deposit.Notes = $"{deposit.Notes} | Hủy: {reason}";
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region 10.1.4 Payments

    public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto, Guid userId)
    {
        decimal totalOwed;
        Guid? medicalRecordId = null;
        var patientId = dto.PatientId;

        if (dto.InvoiceId.HasValue && dto.InvoiceId.Value != Guid.Empty)
        {
            var invoice = await _context.InvoiceSummaries
                .FirstOrDefaultAsync(i => i.Id == dto.InvoiceId.Value);

            if (invoice == null)
                throw new Exception("Invoice not found");

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
                throw new Exception("Benh nhan khong co hoa don hoac dich vu chua thanh toan");

            totalOwed = unpaidServiceRequests.Sum(sr => sr.PatientAmount);
            medicalRecordId = unpaidServiceRequests.Select(sr => (Guid?)sr.MedicalRecordId).FirstOrDefault();
        }

        if (dto.Amount > totalOwed)
            throw new Exception($"So tien thanh toan ({dto.Amount:N0}d) vuot qua so tien con no ({totalOwed:N0}d)");

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
        await _context.SaveChangesAsync();

        if (dto.InvoiceId.HasValue && dto.InvoiceId.Value != Guid.Empty)
        {
            var invoice = await _context.InvoiceSummaries.FirstOrDefaultAsync(i => i.Id == dto.InvoiceId.Value);
            if (invoice != null)
            {
                invoice.PaidAmount += dto.Amount;
                invoice.RemainingAmount = Math.Max(0, invoice.TotalAmount - invoice.DiscountAmount - invoice.PaidAmount);
                if (invoice.RemainingAmount == 0)
                    invoice.Status = 1;
                invoice.UpdatedAt = DateTime.Now;
                invoice.UpdatedBy = userId.ToString();
                await _context.SaveChangesAsync();
            }
        }

        var patient = await _context.Patients.FindAsync(patientId);

        return new PaymentDto
        {
            Id = receipt.Id,
            PaymentCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientName = patient?.FullName ?? string.Empty,
            InvoiceId = dto.InvoiceId,
            Amount = receipt.FinalAmount,
            PaymentMethod = GetPaymentMethodName(receipt.PaymentMethod),
            PaymentStatus = "Da thanh toan",
            PaymentDate = receipt.ReceiptDate,
            ReceivedBy = userId.ToString(),
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
            throw new Exception("Payment not found");
        if (receipt.Status == 2)
            throw new Exception("Payment already cancelled");

        receipt.Status = 2; // Đã hủy
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";
        await _context.SaveChangesAsync();
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
        catch { return new PaymentHistoryDto(); }
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
        catch { return new PaymentStatusDto(); }
    }

    #endregion

    #region 10.1.5 Refunds

    public async Task<RefundDto> CreateRefundAsync(CreateRefundDto dto, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(dto.PatientId);
        if (patient == null)
            throw new Exception("Patient not found");

        // Verify original payment/deposit exists and has sufficient amount
        if (dto.RefundType == 1 && dto.OriginalDepositId.HasValue)
        {
            var originalDeposit = await _context.Deposits.FindAsync(dto.OriginalDepositId.Value);
            if (originalDeposit == null)
                throw new Exception("Phiếu tạm ứng gốc không tồn tại");
            var availableAmount = originalDeposit.Amount - originalDeposit.UsedAmount;
            if (dto.RefundAmount > availableAmount)
                throw new Exception($"Số tiền hoàn ({dto.RefundAmount:N0}đ) vượt quá số dư tạm ứng ({availableAmount:N0}đ)");
        }
        else if (dto.RefundType == 2 && dto.OriginalPaymentId.HasValue)
        {
            var originalPayment = await _context.Receipts.FindAsync(dto.OriginalPaymentId.Value);
            if (originalPayment == null)
                throw new Exception("Phiếu thanh toán gốc không tồn tại");
            if (originalPayment.Status == 2)
                throw new Exception("Phiếu thanh toán gốc đã bị hủy");
            if (dto.RefundAmount > originalPayment.FinalAmount)
                throw new Exception($"Số tiền hoàn ({dto.RefundAmount:N0}đ) vượt quá số tiền đã thanh toán ({originalPayment.FinalAmount:N0}đ)");
        }
        else
        {
            throw new Exception("Cần chỉ định phiếu tạm ứng hoặc phiếu thanh toán gốc");
        }

        // Sprint 3 Item 2.5: partial refund validation
        if (dto.Items is { Count: > 0 })
        {
            var sumItems = dto.Items.Sum(i => i.RefundAmount);
            if (Math.Abs(sumItems - dto.RefundAmount) > 0.01m)
                throw new InvalidOperationException(
                    $"Tổng hoàn chi tiết ({sumItems:N0}đ) không khớp với tổng yêu cầu hoàn ({dto.RefundAmount:N0}đ)");

            foreach (var item in dto.Items)
            {
                if (item.ItemType == "service")
                {
                    var sr = await _context.ServiceRequestDetails
                        .Include(d => d.ServiceRequest)
                        .FirstOrDefaultAsync(d => d.Id == item.ItemId);
                    if (sr == null) throw new Exception($"Dịch vụ {item.ItemId} không tồn tại");
                    // BHYT không cho hoàn chi tiết CLS đã có kết quả
                    if (sr.PatientType == 1 && !string.IsNullOrWhiteSpace(sr.Result))
                        throw new InvalidOperationException(
                            $"BHYT: không thể hoàn chi tiết CLS đã có kết quả ({sr.ServiceRequest.RequestCode}). Phải hủy KQ trước.");
                }
                else if (item.ItemType == "medicine")
                {
                    var pd = await _context.PrescriptionDetails
                        .Include(d => d.Prescription)
                        .FirstOrDefaultAsync(d => d.Id == item.ItemId);
                    if (pd == null) throw new Exception($"Thuốc {item.ItemId} không tồn tại");
                    if (pd.PatientType == 1)
                        throw new InvalidOperationException(
                            "BHYT: không thể hoàn chi tiết thuốc. Phải hoàn trả toàn bộ toa.");
                }
            }
        }

        // Create refund receipt
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"HT{DateTime.Now:yyyyMMddHHmmssfff}",
            ReceiptDate = DateTime.Now,
            PatientId = dto.PatientId,
            ReceiptType = 3, // Hoàn trả
            PaymentMethod = dto.RefundMethod,
            Amount = dto.RefundAmount,
            Discount = 0,
            FinalAmount = dto.RefundAmount,
            Status = 0, // Chờ duyệt
            CashierId = userId,
            Note = dto.Items is { Count: > 0 }
                ? $"{dto.Reason} | Hoàn chi tiết {dto.Items.Count} mục"
                : dto.Reason,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Receipts.Add(receipt);
        await _context.SaveChangesAsync();

        return new RefundDto
        {
            Id = receipt.Id,
            RefundCode = receipt.ReceiptCode,
            PatientId = dto.PatientId,
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            RefundType = dto.RefundType,
            RefundTypeName = dto.RefundType == 1 ? "Hoàn tạm ứng" : "Hoàn thanh toán",
            OriginalDepositId = dto.OriginalDepositId,
            OriginalPaymentId = dto.OriginalPaymentId,
            RefundAmount = dto.RefundAmount,
            RefundMethod = dto.RefundMethod,
            RefundMethodName = GetPaymentMethodName(dto.RefundMethod),
            BankAccount = dto.BankAccount,
            BankName = dto.BankName,
            Reason = dto.Reason,
            CashierId = userId,
            Status = 0,
            StatusName = "Chờ duyệt",
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<RefundDto> ApproveRefundAsync(ApproveRefundDto dto, Guid userId)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.RefundId && r.ReceiptType == 3);
        if (receipt == null)
            throw new Exception("Refund not found");

        if (dto.IsApproved)
        {
            receipt.Status = 1; // Đã duyệt
        }
        else
        {
            receipt.Status = 2; // Từ chối
            receipt.Note = $"{receipt.Note} | Từ chối: {dto.RejectReason}";
        }

        await _context.SaveChangesAsync();

        return new RefundDto
        {
            Id = receipt.Id,
            RefundCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientCode = receipt.Patient?.PatientCode ?? string.Empty,
            PatientName = receipt.Patient?.FullName ?? string.Empty,
            RefundAmount = receipt.FinalAmount,
            Reason = receipt.Note ?? string.Empty,
            Status = dto.IsApproved ? 1 : 3,
            StatusName = dto.IsApproved ? "Đã duyệt" : "Từ chối",
            ApprovedBy = userId,
            ApprovedAt = DateTime.Now,
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<RefundDto> ConfirmRefundAsync(ConfirmRefundDto dto, Guid userId)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Patient)
            .FirstOrDefaultAsync(r => r.Id == dto.RefundId && r.ReceiptType == 3);
        if (receipt == null)
            throw new Exception("Refund not found");

        receipt.Status = 4; // Đã xác nhận hoàn
        receipt.Note = $"{receipt.Note} | Xác nhận: {dto.Notes} | Mã GD: {dto.TransactionNumber}";
        receipt.UpdatedAt = DateTime.Now;
        receipt.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();

        return new RefundDto
        {
            Id = receipt.Id,
            RefundCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientCode = receipt.Patient?.PatientCode ?? string.Empty,
            PatientName = receipt.Patient?.FullName ?? string.Empty,
            RefundAmount = receipt.FinalAmount,
            Reason = receipt.Note ?? string.Empty,
            CashierId = receipt.CashierId,
            Status = 4,
            StatusName = "Đã xác nhận hoàn",
            ConfirmedBy = userId,
            ConfirmedAt = DateTime.Now,
            CreatedAt = receipt.CreatedAt
        };
    }

    public async Task<PagedResultDto<RefundDto>> SearchRefundsAsync(RefundSearchDto dto)
    {
        return new PagedResultDto<RefundDto>
        {
            Items = new List<RefundDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<bool> CancelRefundAsync(Guid refundId, string reason, Guid userId)
    {
        var receipt = await _context.Receipts
            .FirstOrDefaultAsync(r => r.Id == refundId && r.ReceiptType == 3);
        if (receipt == null)
            throw new Exception("Refund not found");
        if (receipt.Status == 5)
            throw new Exception("Refund already cancelled");

        receipt.Status = 5; // Đã hủy
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";
        receipt.UpdatedAt = DateTime.Now;
        receipt.UpdatedBy = userId.ToString();
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
}
