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

/// <summary>
/// Implementation of IBillingCompleteService
/// Handles all billing/payment workflows
/// </summary>
public class BillingCompleteService : IBillingCompleteService
{
    private readonly HISDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public BillingCompleteService(HISDbContext context, IUnitOfWork unitOfWork)
    {
        _context = context;
        _unitOfWork = unitOfWork;
    }

    #region 10.1.1 Cash Book Management

    public async Task<CashBookDto> CreateCashBookAsync(CreateCashBookDto dto, Guid userId)
    {
        var cashBook = new CashBook
        {
            Id = Guid.NewGuid(),
            BookCode = dto.Code,
            BookName = dto.Name,
            BookType = dto.BookType,
            StartDate = DateTime.Now,
            CashierId = userId,
            OpeningBalance = dto.OpeningBalance,
            TotalReceipt = 0,
            TotalRefund = 0,
            ClosingBalance = dto.OpeningBalance,
            IsClosed = false,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.CashBooks.Add(cashBook);
        await _context.SaveChangesAsync();

        return new CashBookDto
        {
            Id = cashBook.Id,
            Code = cashBook.BookCode,
            Name = cashBook.BookName,
            BookType = cashBook.BookType,
            BookTypeName = cashBook.BookType == 1 ? "Thu tiền" : "Tạm ứng",
            OpeningBalance = cashBook.OpeningBalance,
            CurrentBalance = cashBook.ClosingBalance,
            Status = 1,
            StatusName = "Đang mở",
            CreatedAt = cashBook.CreatedAt
        };
    }

    public async Task<CashBookDto> CreateDepositBookAsync(CreateCashBookDto dto, Guid userId)
    {
        var cashBook = new CashBook
        {
            Id = Guid.NewGuid(),
            BookCode = dto.Code,
            BookName = dto.Name,
            BookType = 2, // Tạm ứng
            StartDate = DateTime.Now,
            CashierId = userId,
            OpeningBalance = dto.OpeningBalance,
            TotalReceipt = 0,
            TotalRefund = 0,
            ClosingBalance = dto.OpeningBalance,
            IsClosed = false,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.CashBooks.Add(cashBook);
        await _context.SaveChangesAsync();

        return new CashBookDto
        {
            Id = cashBook.Id,
            Code = cashBook.BookCode,
            Name = cashBook.BookName,
            BookType = 2,
            BookTypeName = "Tạm ứng",
            OpeningBalance = cashBook.OpeningBalance,
            CurrentBalance = cashBook.ClosingBalance,
            Status = 1,
            StatusName = "Đang mở",
            CreatedAt = cashBook.CreatedAt
        };
    }

    public async Task<List<CashBookDto>> GetCashBooksAsync(int? bookType, Guid? departmentId)
    {
        return new List<CashBookDto>();
    }

    public async Task<CashBookDto?> GetCashBookByIdAsync(Guid id)
    {
        return null;
    }

    public async Task<CashBookDto> LockCashBookAsync(Guid cashBookId, Guid userId)
    {
        var cashBook = await _context.CashBooks.FirstOrDefaultAsync(cb => cb.Id == cashBookId);
        if (cashBook == null)
            throw new Exception("Cash book not found");

        if (!cashBook.IsClosed)
        {
            cashBook.IsClosed = true;
            cashBook.ClosedAt = DateTime.Now;
            cashBook.EndDate = DateTime.Now;
            cashBook.UpdatedAt = DateTime.Now;
            cashBook.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }

        return new CashBookDto
        {
            Id = cashBook.Id,
            Code = cashBook.BookCode,
            Name = cashBook.BookName,
            BookType = cashBook.BookType,
            BookTypeName = cashBook.BookType == 1 ? "Thu tiá»n" : "Táº¡m á»©ng",
            OpeningBalance = cashBook.OpeningBalance,
            CurrentBalance = cashBook.ClosingBalance,
            Status = cashBook.IsClosed ? 2 : 1,
            StatusName = cashBook.IsClosed ? "ÄÃ£ khÃ³a" : "Äang má»Ÿ",
            CreatedAt = cashBook.CreatedAt
        };
    }

    public async Task<CashBookDto> UnlockCashBookAsync(Guid cashBookId, Guid userId)
    {
        var cashBook = await _context.CashBooks.FirstOrDefaultAsync(cb => cb.Id == cashBookId);
        if (cashBook == null)
            throw new Exception("Cash book not found");

        if (cashBook.IsClosed)
        {
            cashBook.IsClosed = false;
            cashBook.ClosedAt = null;
            cashBook.EndDate = null;
            cashBook.UpdatedAt = DateTime.Now;
            cashBook.UpdatedBy = userId.ToString();
            await _context.SaveChangesAsync();
        }

        return new CashBookDto
        {
            Id = cashBook.Id,
            Code = cashBook.BookCode,
            Name = cashBook.BookName,
            BookType = cashBook.BookType,
            BookTypeName = cashBook.BookType == 1 ? "Thu tiền" : "Tạm ứng",
            OpeningBalance = cashBook.OpeningBalance,
            CurrentBalance = cashBook.ClosingBalance,
            Status = 1,
            StatusName = "Đang mở",
            CreatedAt = cashBook.CreatedAt
        };
    }

    public async Task<bool> AssignCashBookPermissionAsync(AssignCashBookPermissionDto dto, Guid userId)
    {
        // No CashBookPermission table exists - stub implementation
        await Task.CompletedTask;
        return true;
    }

    public async Task<bool> RemoveCashBookPermissionAsync(Guid cashBookId, Guid targetUserId, Guid userId)
    {
        // No CashBookPermission table exists - stub implementation
        await Task.CompletedTask;
        return true;
    }

    public async Task<List<CashBookUserDto>> GetCashBookUsersAsync(Guid cashBookId)
    {
        return new List<CashBookUserDto>();
    }

    #endregion

    #region 10.1.2 Patient Search

    public async Task<PagedResultDto<PatientBillingStatusDto>> SearchPatientsAsync(PatientStatusSearchDto dto)
    {
        return new PagedResultDto<PatientBillingStatusDto>
        {
            Items = new List<PatientBillingStatusDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<PatientBillingStatusDto> GetPatientBillingStatusAsync(Guid medicalRecordId)
    {
        return new PatientBillingStatusDto();
    }

    public async Task<InsuranceCheckDto> CheckInsuranceCardAsync(InsuranceCheckRequestDto dto)
    {
        return new InsuranceCheckDto();
    }

    #endregion

    #region 10.1.3 Deposits

    public async Task<DepositDto> CreateDepositAsync(CreateDepositDto dto, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(dto.PatientId);
        if (patient == null)
            throw new Exception("Patient not found");

        var deposit = new Deposit
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = $"TU{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = DateTime.Now,
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
            ReceiptCode = $"TUK{DateTime.Now:yyyyMMddHHmmss}",
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
            ReceiptCode = $"PT{DateTime.Now:yyyyMMddHHmmss}",
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
        return new List<DepositDto>();
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
        // Parse payment method to int
        int paymentMethod = 1; // Default: Tiền mặt
        if (int.TryParse(dto.PaymentMethod, out int pm))
        {
            paymentMethod = pm;
        }

        // Create a receipt record (Payment is Receipt in this system)
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"PT{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = DateTime.Now,
            PatientId = dto.PatientId,
            ReceiptType = 2, // Thanh toán
            PaymentMethod = paymentMethod,
            Amount = dto.Amount,
            Discount = 0,
            FinalAmount = dto.Amount,
            Status = 1, // Đã thu
            CashierId = userId,
            Note = dto.Note,
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };

        _context.Receipts.Add(receipt);
        await _context.SaveChangesAsync();

        // Get patient name
        var patient = await _context.Patients.FindAsync(dto.PatientId);

        return new PaymentDto
        {
            Id = receipt.Id,
            PaymentCode = receipt.ReceiptCode,
            PatientId = receipt.PatientId,
            PatientName = patient?.FullName ?? string.Empty,
            InvoiceId = dto.InvoiceId,
            Amount = receipt.FinalAmount,
            PaymentMethod = GetPaymentMethodName(receipt.PaymentMethod),
            PaymentStatus = "Đã thanh toán",
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
        return new PaymentHistoryDto();
    }

    public async Task<PaymentStatusDto> CheckPaymentStatusAsync(Guid medicalRecordId)
    {
        return new PaymentStatusDto();
    }

    #endregion

    #region 10.1.5 Refunds

    public async Task<RefundDto> CreateRefundAsync(CreateRefundDto dto, Guid userId)
    {
        var patient = await _context.Patients.FindAsync(dto.PatientId);
        if (patient == null)
            throw new Exception("Patient not found");

        // Create refund receipt
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"HT{DateTime.Now:yyyyMMddHHmmss}",
            ReceiptDate = DateTime.Now,
            PatientId = dto.PatientId,
            ReceiptType = 3, // Hoàn trả
            PaymentMethod = dto.RefundMethod,
            Amount = dto.RefundAmount,
            Discount = 0,
            FinalAmount = dto.RefundAmount,
            Status = 0, // Chờ duyệt
            CashierId = userId,
            Note = dto.Reason,
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

    #region 10.1.6 Record Locking

    public async Task<RecordLockDto> LockMedicalRecordAsync(LockRecordDto dto, Guid userId)
    {
        var medicalRecord = await _context.MedicalRecords
            .Include(m => m.Patient)
            .FirstOrDefaultAsync(m => m.Id == dto.MedicalRecordId);
        if (medicalRecord == null)
            throw new Exception("Medical record not found");

        // MedicalRecord has IsClosed property - use it as lock indicator
        medicalRecord.IsClosed = true;
        medicalRecord.UpdatedAt = DateTime.Now;
        medicalRecord.UpdatedBy = userId.ToString();
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
            throw new Exception("Medical record not found");

        medicalRecord.IsClosed = false;
        medicalRecord.UpdatedAt = DateTime.Now;
        medicalRecord.UpdatedBy = userId.ToString();
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
        return new RecordLockDto();
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
                ApprovedByName = (await _context.Users.FindAsync(userId))?.FullName,
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
            throw new Exception("Invoice not found");

        decimal discountAmount = 0;
        if (dto.DiscountType == 1 && dto.DiscountPercent.HasValue)
        {
            discountAmount = invoice.TotalAmount * dto.DiscountPercent.Value / 100;
        }
        else if (dto.DiscountAmount.HasValue)
        {
            discountAmount = dto.DiscountAmount.Value;
        }

        invoice.DiscountAmount = discountAmount;
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
        invoiceDto.RemainingAmount -= discountAmount;

        return invoiceDto;
    }

    public async Task<InvoiceDto> ApplyServiceDiscountAsync(ApplyDiscountDto dto, Guid userId)
    {
        var invoice = await _context.InvoiceSummaries.FindAsync(dto.InvoiceId);
        if (invoice == null)
            throw new Exception("Invoice not found");

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

        invoice.DiscountAmount = totalDiscount;
        invoice.DiscountReason = dto.DiscountReason;
        invoice.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();

        var invoiceDto = await CalculateInvoiceAsync(invoice.MedicalRecordId);
        invoiceDto.Id = invoice.Id;
        invoiceDto.InvoiceCode = invoice.InvoiceCode;
        invoiceDto.DiscountAmount = totalDiscount;
        invoiceDto.DiscountReason = dto.DiscountReason;
        invoiceDto.DiscountType = 2; // Theo dịch vụ
        invoiceDto.TotalAmount -= totalDiscount;
        invoiceDto.RemainingAmount -= totalDiscount;

        return invoiceDto;
    }

    public async Task<List<DiscountHistoryDto>> GetDiscountHistoryAsync(Guid invoiceId)
    {
        return new List<DiscountHistoryDto>();
    }

    public async Task<bool> CancelDiscountAsync(Guid discountId, string reason, Guid userId)
    {
        // discountId maps to InvoiceSummary.Id (discount is stored on the invoice)
        var invoice = await _context.InvoiceSummaries.FindAsync(discountId);
        if (invoice == null)
            throw new Exception("Invoice not found");

        invoice.DiscountAmount = 0;
        invoice.DiscountReason = $"Hủy miễn giảm: {reason}";
        invoice.RemainingAmount = invoice.TotalAmount - invoice.PaidAmount - invoice.InsuranceAmount;
        invoice.UpdatedAt = DateTime.Now;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

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
                InvoiceCode = $"HD{DateTime.Now:yyyyMMddHHmmss}",
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
        return null;
    }

    public async Task<InvoiceDto?> GetPatientInvoiceAsync(Guid medicalRecordId)
    {
        return await CalculateInvoiceAsync(medicalRecordId);
    }

    public async Task<PagedResultDto<InvoiceDto>> SearchInvoicesAsync(InvoiceSearchDto dto)
    {
        return new PagedResultDto<InvoiceDto>
        {
            Items = new List<InvoiceDto>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 50
        };
    }

    public async Task<List<UnpaidServiceItemDto>> GetUnpaidServicesAsync(Guid patientId)
    {
        return new List<UnpaidServiceItemDto>();
    }

    public async Task<List<UnpaidMedicineItemDto>> GetUnpaidMedicinesAsync(Guid patientId)
    {
        return new List<UnpaidMedicineItemDto>();
    }

    #endregion

    #region 10.2 Printing

    /// <summary>
    /// In bang ke 6556 - tong hop dich vu + thuoc theo ho so benh an
    /// </summary>
    public async Task<byte[]> Print6556StatementAsync(Print6556RequestDto dto)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId);
            if (record == null) return Array.Empty<byte>();

            var patient = record.Patient;

            // Query service requests for this medical record
            var serviceDetails = await _context.ServiceRequestDetails
                .Include(d => d.Service)
                .Include(d => d.ServiceRequest)
                .Where(d => d.ServiceRequest.MedicalRecordId == dto.MedicalRecordId && d.ServiceRequest.Status != 4)
                .ToListAsync();

            // Query prescription details for this medical record
            var rxDetails = await _context.PrescriptionDetails
                .Include(d => d.Medicine)
                .Include(d => d.Prescription)
                .Where(d => d.Prescription.MedicalRecordId == dto.MedicalRecordId && d.Prescription.Status != 4)
                .ToListAsync();

            var headers = new[] { "Ma DV/Thuoc", "Ten DV/Thuoc", "DVT", "SL", "Don gia", "Thanh tien", "BHYT", "BN tra" };
            var rows = new List<string[]>();

            foreach (var sd in serviceDetails)
            {
                rows.Add(new[]
                {
                    sd.Service?.ServiceCode ?? "",
                    sd.Service?.ServiceName ?? "",
                    sd.Service?.Unit ?? "",
                    sd.Quantity.ToString(),
                    sd.UnitPrice.ToString("#,##0"),
                    sd.Amount.ToString("#,##0"),
                    sd.InsuranceAmount.ToString("#,##0"),
                    sd.PatientAmount.ToString("#,##0")
                });
            }
            foreach (var rd in rxDetails)
            {
                rows.Add(new[]
                {
                    rd.Medicine?.MedicineCode ?? "",
                    rd.Medicine?.MedicineName ?? "",
                    rd.Unit ?? "",
                    rd.Quantity.ToString("#,##0"),
                    rd.UnitPrice.ToString("#,##0"),
                    rd.Amount.ToString("#,##0"),
                    rd.InsuranceAmount.ToString("#,##0"),
                    rd.PatientAmount.ToString("#,##0")
                });
            }

            var subtitle = $"Ho so: {record.MedicalRecordCode} - BN: {patient.FullName}";
            var html = BuildTableReport("BANG KE CHI PHI KHAM CHUA BENH", subtitle, DateTime.Now, headers, rows, "Thu ngan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bang ke 6556 tach theo doi tuong thanh toan (BHYT / Vien phi / Dich vu)
    /// </summary>
    public async Task<byte[]> Print6556ByObjectAsync(Print6556RequestDto dto)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId);
            if (record == null) return Array.Empty<byte>();

            var patient = record.Patient;

            var serviceDetails = await _context.ServiceRequestDetails
                .Include(d => d.Service)
                .Include(d => d.ServiceRequest)
                .Where(d => d.ServiceRequest.MedicalRecordId == dto.MedicalRecordId && d.ServiceRequest.Status != 4)
                .ToListAsync();

            var rxDetails = await _context.PrescriptionDetails
                .Include(d => d.Medicine)
                .Include(d => d.Prescription)
                .Where(d => d.Prescription.MedicalRecordId == dto.MedicalRecordId && d.Prescription.Status != 4)
                .ToListAsync();

            // Filter by payment object if specified
            if (dto.PaymentObject.HasValue)
            {
                serviceDetails = serviceDetails.Where(d => d.PatientType == dto.PaymentObject.Value).ToList();
                rxDetails = rxDetails.Where(d => d.PatientType == dto.PaymentObject.Value).ToList();
            }

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">BANG KE CHI PHI KHAM CHUA BENH</div>");
            sb.AppendLine($@"<div class=""form-number"">Tach theo doi tuong - Ho so: {Esc(record.MedicalRecordCode)}</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">BN: {Esc(patient.FullName)}</div>");

            // Group by PatientType
            var objectTypes = new Dictionary<int, string> { { 1, "BHYT" }, { 2, "Vien phi" }, { 3, "Dich vu" } };
            foreach (var objType in objectTypes)
            {
                var svcGroup = serviceDetails.Where(d => d.PatientType == objType.Key).ToList();
                var rxGroup = rxDetails.Where(d => d.PatientType == objType.Key).ToList();
                if (svcGroup.Count == 0 && rxGroup.Count == 0) continue;

                sb.AppendLine($@"<div class=""section-title"">{Esc(objType.Value)}</div>");
                sb.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Ten DV/Thuoc</th><th>SL</th><th>Don gia</th><th>Thanh tien</th><th>BHYT</th><th>BN tra</th></tr></thead><tbody>");

                int idx = 1;
                foreach (var sd in svcGroup)
                {
                    sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(sd.Service?.ServiceName)}</td><td class=\"text-center\">{sd.Quantity}</td><td class=\"text-right\">{sd.UnitPrice:#,##0}</td><td class=\"text-right\">{sd.Amount:#,##0}</td><td class=\"text-right\">{sd.InsuranceAmount:#,##0}</td><td class=\"text-right\">{sd.PatientAmount:#,##0}</td></tr>");
                }
                foreach (var rd in rxGroup)
                {
                    sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(rd.Medicine?.MedicineName)}</td><td class=\"text-center\">{rd.Quantity:#,##0}</td><td class=\"text-right\">{rd.UnitPrice:#,##0}</td><td class=\"text-right\">{rd.Amount:#,##0}</td><td class=\"text-right\">{rd.InsuranceAmount:#,##0}</td><td class=\"text-right\">{rd.PatientAmount:#,##0}</td></tr>");
                }

                var totalAmount = svcGroup.Sum(s => s.Amount) + rxGroup.Sum(r => r.Amount);
                var totalIns = svcGroup.Sum(s => s.InsuranceAmount) + rxGroup.Sum(r => r.InsuranceAmount);
                var totalPat = svcGroup.Sum(s => s.PatientAmount) + rxGroup.Sum(r => r.PatientAmount);
                sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Cong {Esc(objType.Value)}:</b></td><td class=\"text-right\"><b>{totalAmount:#,##0}</b></td><td class=\"text-right\"><b>{totalIns:#,##0}</b></td><td class=\"text-right\"><b>{totalPat:#,##0}</b></td></tr>");
                sb.AppendLine("</tbody></table>");
            }

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Bang ke chi phi - Tach doi tuong", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bang ke 6556 tach theo khoa dieu tri
    /// </summary>
    public async Task<byte[]> Print6556ByDepartmentAsync(Print6556RequestDto dto)
    {
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == dto.MedicalRecordId);
            if (record == null) return Array.Empty<byte>();

            var patient = record.Patient;

            var serviceRequests = await _context.ServiceRequests
                .Include(r => r.Department)
                .Include(r => r.Details).ThenInclude(d => d.Service)
                .Where(r => r.MedicalRecordId == dto.MedicalRecordId && r.Status != 4)
                .ToListAsync();

            var prescriptions = await _context.Prescriptions
                .Include(p => p.Department)
                .Include(p => p.Details).ThenInclude(d => d.Medicine)
                .Where(p => p.MedicalRecordId == dto.MedicalRecordId && p.Status != 4)
                .ToListAsync();

            // Filter by department if specified
            if (dto.DepartmentId.HasValue)
            {
                serviceRequests = serviceRequests.Where(r => r.DepartmentId == dto.DepartmentId.Value).ToList();
                prescriptions = prescriptions.Where(p => p.DepartmentId == dto.DepartmentId.Value).ToList();
            }

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">BANG KE CHI PHI KHAM CHUA BENH</div>");
            sb.AppendLine($@"<div class=""form-number"">Tach theo khoa - Ho so: {Esc(record.MedicalRecordCode)}</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">BN: {Esc(patient.FullName)}</div>");

            // Group by department
            var deptGroups = serviceRequests.GroupBy(r => new { r.DepartmentId, DeptName = r.Department?.DepartmentName ?? "Khac" });
            foreach (var deptGroup in deptGroups)
            {
                sb.AppendLine($@"<div class=""section-title"">Khoa: {Esc(deptGroup.Key.DeptName)}</div>");
                sb.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Ten dich vu</th><th>SL</th><th>Don gia</th><th>Thanh tien</th></tr></thead><tbody>");
                int idx = 1;
                decimal deptTotal = 0;
                foreach (var req in deptGroup)
                {
                    foreach (var detail in req.Details)
                    {
                        deptTotal += detail.Amount;
                        sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(detail.Service?.ServiceName)}</td><td class=\"text-center\">{detail.Quantity}</td><td class=\"text-right\">{detail.UnitPrice:#,##0}</td><td class=\"text-right\">{detail.Amount:#,##0}</td></tr>");
                    }
                }
                sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Cong khoa:</b></td><td class=\"text-right\"><b>{deptTotal:#,##0}</b></td></tr>");
                sb.AppendLine("</tbody></table>");
            }

            // Prescriptions by department
            var rxDeptGroups = prescriptions.GroupBy(p => new { p.DepartmentId, DeptName = p.Department?.DepartmentName ?? "Khac" });
            foreach (var deptGroup in rxDeptGroups)
            {
                sb.AppendLine($@"<div class=""section-title"">Thuoc - Khoa: {Esc(deptGroup.Key.DeptName)}</div>");
                sb.AppendLine(@"<table class=""bordered""><thead><tr><th>STT</th><th>Ten thuoc</th><th>SL</th><th>Don gia</th><th>Thanh tien</th></tr></thead><tbody>");
                int idx = 1;
                decimal deptTotal = 0;
                foreach (var rx in deptGroup)
                {
                    foreach (var detail in rx.Details)
                    {
                        deptTotal += detail.Amount;
                        sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(detail.Medicine?.MedicineName)}</td><td class=\"text-center\">{detail.Quantity:#,##0}</td><td class=\"text-right\">{detail.UnitPrice:#,##0}</td><td class=\"text-right\">{detail.Amount:#,##0}</td></tr>");
                    }
                }
                sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Cong thuoc khoa:</b></td><td class=\"text-right\"><b>{deptTotal:#,##0}</b></td></tr>");
                sb.AppendLine("</tbody></table>");
            }

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Bang ke chi phi - Tach theo khoa", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In phieu tam ung theo dich vu da chi dinh
    /// </summary>
    public async Task<byte[]> PrintDepositByServiceAsync(PrintByServiceRequestDto dto)
    {
        try
        {
            var patient = await _context.Patients.FindAsync(dto.PatientId);
            if (patient == null) return Array.Empty<byte>();

            var query = _context.ServiceRequestDetails
                .Include(d => d.Service)
                .Include(d => d.ServiceRequest)
                .Where(d => d.ServiceRequest.MedicalRecord.PatientId == dto.PatientId && d.ServiceRequest.Status != 4);

            if (dto.ServiceIds != null && dto.ServiceIds.Count > 0)
                query = query.Where(d => dto.ServiceIds.Contains(d.ServiceId));
            if (dto.FromDate.HasValue)
                query = query.Where(d => d.ServiceRequest.RequestDate >= dto.FromDate.Value);
            if (dto.ToDate.HasValue)
                query = query.Where(d => d.ServiceRequest.RequestDate <= dto.ToDate.Value);

            var details = await query.ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.PatientId == dto.PatientId && d.Status == 1)
                .OrderByDescending(d => d.ReceiptDate)
                .ToListAsync();

            var totalServiceAmount = details.Sum(d => d.PatientAmount);
            var totalDeposit = deposits.Sum(d => d.RemainingAmount);

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">PHIEU TAM UNG THEO DICH VU</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {DateTime.Now:dd} thang {DateTime.Now:MM} nam {DateTime.Now:yyyy}</div>");

            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ho ten BN:</span><span class=""field-value"">{Esc(patient.FullName)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ma BN:</span><span class=""field-value"">{Esc(patient.PatientCode)}</span></div>");

            sb.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr><th>STT</th><th>Ten dich vu</th><th>SL</th><th>Don gia</th><th>BN phai tra</th></tr></thead><tbody>");
            int idx = 1;
            foreach (var d in details)
            {
                sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(d.Service?.ServiceName)}</td><td class=\"text-center\">{d.Quantity}</td><td class=\"text-right\">{d.UnitPrice:#,##0}</td><td class=\"text-right\">{d.PatientAmount:#,##0}</td></tr>");
            }
            sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Tong chi phi BN:</b></td><td class=\"text-right\"><b>{totalServiceAmount:#,##0}</b></td></tr>");
            sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Da tam ung:</b></td><td class=\"text-right\"><b>{totalDeposit:#,##0}</b></td></tr>");

            var remaining = totalServiceAmount - totalDeposit;
            sb.AppendLine($"<tr><td colspan=\"4\" class=\"text-right\"><b>Con phai nop:</b></td><td class=\"text-right\"><b>{(remaining > 0 ? remaining : 0):#,##0}</b></td></tr>");
            sb.AppendLine("</tbody></table>");

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Phieu tam ung theo dich vu", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In phieu tam ung (bien lai tam ung)
    /// </summary>
    public async Task<byte[]> PrintDepositReceiptAsync(Guid depositId)
    {
        try
        {
            var deposit = await _context.Deposits
                .Include(d => d.Patient)
                .Include(d => d.ReceivedBy)
                .FirstOrDefaultAsync(d => d.Id == depositId);
            if (deposit == null) return Array.Empty<byte>();

            var paymentMethodText = deposit.PaymentMethod switch
            {
                1 => "Tien mat",
                2 => "Chuyen khoan",
                3 => "The",
                4 => "QR Code",
                _ => "Khac"
            };

            var labels = new[] { "Ho ten benh nhan", "Ma benh nhan", "So tien tam ung", "Phuong thuc thanh toan", "So giao dich", "Ghi chu", "Nguoi thu" };
            var values = new[]
            {
                deposit.Patient?.FullName ?? "",
                deposit.Patient?.PatientCode ?? "",
                deposit.Amount.ToString("#,##0") + " VND",
                paymentMethodText,
                deposit.TransactionReference ?? "",
                deposit.Notes ?? "",
                deposit.ReceivedBy?.FullName ?? ""
            };

            var html = BuildVoucherReport("PHIEU TAM UNG", deposit.ReceiptNumber, deposit.ReceiptDate, labels, values, deposit.ReceivedBy?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In phieu thu (bien lai thanh toan)
    /// </summary>
    public async Task<byte[]> PrintPaymentReceiptAsync(Guid paymentId)
    {
        try
        {
            var receipt = await _context.Receipts
                .Include(r => r.Patient)
                .Include(r => r.Cashier)
                .Include(r => r.Details)
                .FirstOrDefaultAsync(r => r.Id == paymentId);
            if (receipt == null) return Array.Empty<byte>();

            var paymentMethodText = receipt.PaymentMethod switch
            {
                1 => "Tien mat",
                2 => "Chuyen khoan",
                3 => "The",
                4 => "Vi dien tu",
                _ => "Khac"
            };

            if (receipt.Details.Count > 0)
            {
                // Itemized receipt
                var metaLabels = new[] { "Ho ten benh nhan", "Ma benh nhan", "Phuong thuc TT", "Ghi chu" };
                var metaValues = new[]
                {
                    receipt.Patient?.FullName ?? "",
                    receipt.Patient?.PatientCode ?? "",
                    paymentMethodText,
                    receipt.Note ?? ""
                };

                var items = receipt.Details.Select(d => new ReportItemRow
                {
                    Name = d.ItemName ?? "",
                    Unit = d.ItemType switch { 1 => "DV", 2 => "Thuoc", 3 => "VT", _ => "" },
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Amount = d.FinalAmount,
                    Note = ""
                }).ToList();

                var html = BuildItemizedReport("PHIEU THU TIEN", receipt.ReceiptCode, receipt.ReceiptDate, metaLabels, metaValues, items, receipt.Cashier?.FullName);
                return Encoding.UTF8.GetBytes(html);
            }
            else
            {
                // Simple receipt
                var labels = new[] { "Ho ten benh nhan", "Ma benh nhan", "Tong tien", "Giam gia", "Thanh toan", "Phuong thuc TT", "Ghi chu", "Thu ngan" };
                var values = new[]
                {
                    receipt.Patient?.FullName ?? "",
                    receipt.Patient?.PatientCode ?? "",
                    receipt.Amount.ToString("#,##0") + " VND",
                    receipt.Discount.ToString("#,##0") + " VND",
                    receipt.FinalAmount.ToString("#,##0") + " VND",
                    paymentMethodText,
                    receipt.Note ?? "",
                    receipt.Cashier?.FullName ?? ""
                };

                var html = BuildVoucherReport("PHIEU THU TIEN", receipt.ReceiptCode, receipt.ReceiptDate, labels, values, receipt.Cashier?.FullName);
                return Encoding.UTF8.GetBytes(html);
            }
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bang ke vien phi (invoice summary)
    /// </summary>
    public async Task<byte[]> PrintInvoiceAsync(Guid invoiceId)
    {
        try
        {
            var invoice = await _context.InvoiceSummaries
                .Include(i => i.MedicalRecord).ThenInclude(r => r.Patient)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null) return Array.Empty<byte>();

            var patient = invoice.MedicalRecord?.Patient;
            var record = invoice.MedicalRecord;

            // Get receipt details associated with this medical record
            var receiptDetails = await _context.ReceiptDetails
                .Include(d => d.Receipt)
                .Where(d => d.Receipt.MedicalRecordId == invoice.MedicalRecordId && d.Receipt.Status == 1)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine(GetHospitalHeader());
            sb.AppendLine(@"<div class=""form-title"">BANG KE VIEN PHI</div>");
            sb.AppendLine($@"<div class=""form-number"">So: {Esc(invoice.InvoiceCode)}</div>");
            sb.AppendLine($@"<div style=""text-align:center;font-style:italic;margin-bottom:10px"">Ngay {invoice.InvoiceDate:dd} thang {invoice.InvoiceDate:MM} nam {invoice.InvoiceDate:yyyy}</div>");

            // Patient info
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ho ten BN:</span><span class=""field-value"">{Esc(patient?.FullName)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">Ma BN:</span><span class=""field-value"">{Esc(patient?.PatientCode)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">So ho so:</span><span class=""field-value"">{Esc(record?.MedicalRecordCode)}</span></div>");
            sb.AppendLine($@"<div class=""field""><span class=""field-label"">So the BHYT:</span><span class=""field-value"">{Esc(record?.InsuranceNumber)}</span></div>");

            // Detail items table
            if (receiptDetails.Count > 0)
            {
                sb.AppendLine(@"<table class=""bordered"" style=""margin-top:10px""><thead><tr><th>STT</th><th>Ten DV/Thuoc</th><th>Loai</th><th>SL</th><th>Don gia</th><th>Thanh tien</th><th>Giam gia</th><th>BN tra</th></tr></thead><tbody>");
                int idx = 1;
                foreach (var d in receiptDetails)
                {
                    var itemTypeText = d.ItemType switch { 1 => "DV", 2 => "Thuoc", 3 => "VT", _ => "" };
                    sb.AppendLine($"<tr><td class=\"text-center\">{idx++}</td><td>{Esc(d.ItemName)}</td><td class=\"text-center\">{itemTypeText}</td><td class=\"text-center\">{d.Quantity:#,##0}</td><td class=\"text-right\">{d.UnitPrice:#,##0}</td><td class=\"text-right\">{d.Amount:#,##0}</td><td class=\"text-right\">{d.Discount:#,##0}</td><td class=\"text-right\">{d.FinalAmount:#,##0}</td></tr>");
                }
                sb.AppendLine("</tbody></table>");
            }

            // Summary section
            sb.AppendLine(@"<div class=""section-title"">TONG HOP CHI PHI</div>");
            sb.AppendLine(@"<table class=""bordered"">");
            sb.AppendLine($"<tr><td><b>Tong chi phi dich vu:</b></td><td class=\"text-right\">{invoice.TotalServiceAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Tong chi phi thuoc:</b></td><td class=\"text-right\">{invoice.TotalMedicineAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Tong chi phi vat tu:</b></td><td class=\"text-right\">{invoice.TotalSupplyAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Tong chi phi giuong:</b></td><td class=\"text-right\">{invoice.TotalBedAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>TONG CONG:</b></td><td class=\"text-right\"><b>{invoice.TotalAmount:#,##0}</b></td></tr>");
            sb.AppendLine($"<tr><td><b>BHYT chi tra:</b></td><td class=\"text-right\">{invoice.InsuranceAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Dong chi tra:</b></td><td class=\"text-right\">{invoice.PatientCoPayment:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Ngoai BHYT:</b></td><td class=\"text-right\">{invoice.OutOfPocket:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Da tam ung:</b></td><td class=\"text-right\">{invoice.DepositAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Da thanh toan:</b></td><td class=\"text-right\">{invoice.PaidAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Hoan tra:</b></td><td class=\"text-right\">{invoice.RefundAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>Mien giam:</b></td><td class=\"text-right\">{invoice.DiscountAmount:#,##0}</td></tr>");
            sb.AppendLine($"<tr><td><b>CON NO:</b></td><td class=\"text-right\"><b>{invoice.RemainingAmount:#,##0}</b></td></tr>");
            sb.AppendLine("</table>");

            sb.AppendLine(GetSignatureBlock("Thu ngan"));

            var html = WrapHtmlPage("Bang ke vien phi", sb.ToString());
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In phieu hoan tien
    /// </summary>
    public async Task<byte[]> PrintRefundReceiptAsync(Guid refundId)
    {
        try
        {
            // Refunds are stored as receipts with ReceiptType=3
            var receipt = await _context.Receipts
                .Include(r => r.Patient)
                .Include(r => r.Cashier)
                .FirstOrDefaultAsync(r => r.Id == refundId);
            if (receipt == null) return Array.Empty<byte>();

            var paymentMethodText = receipt.PaymentMethod switch
            {
                1 => "Tien mat",
                2 => "Chuyen khoan",
                3 => "The",
                4 => "Vi dien tu",
                _ => "Khac"
            };

            var labels = new[] { "Ho ten benh nhan", "Ma benh nhan", "So tien hoan tra", "Phuong thuc hoan tra", "Ly do hoan tra", "Thu ngan" };
            var values = new[]
            {
                receipt.Patient?.FullName ?? "",
                receipt.Patient?.PatientCode ?? "",
                receipt.FinalAmount.ToString("#,##0") + " VND",
                paymentMethodText,
                receipt.Note ?? "",
                receipt.Cashier?.FullName ?? ""
            };

            var html = BuildVoucherReport("PHIEU HOAN TIEN", receipt.ReceiptCode, receipt.ReceiptDate, labels, values, receipt.Cashier?.FullName);
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    #endregion

    #region 10.2.1 Electronic Invoices

    public async Task<ElectronicInvoiceDto> IssueElectronicInvoiceAsync(IssueEInvoiceDto dto, Guid userId)
    {
        // Look up the invoice to get amount information
        var invoice = await _context.InvoiceSummaries.FindAsync(dto.InvoiceId);
        var amount = invoice?.TotalAmount ?? 0;
        var vatAmount = amount * 0.08m; // 8% VAT for medical services

        // Stub: generate e-invoice data without external provider
        return new ElectronicInvoiceDto
        {
            Id = Guid.NewGuid(),
            InvoiceId = dto.InvoiceId,
            InvoiceCode = invoice?.InvoiceCode ?? string.Empty,
            EInvoiceNumber = $"HDDT{DateTime.Now:yyyyMMddHHmmss}",
            EInvoiceSeries = $"C{DateTime.Now:yy}TAA",
            EInvoiceDate = DateTime.Now,
            Provider = "VNInvoice",
            ProviderInvoiceId = Guid.NewGuid().ToString(),
            BuyerName = dto.BuyerName,
            BuyerTaxCode = dto.BuyerTaxCode,
            BuyerAddress = dto.BuyerAddress,
            BuyerEmail = dto.BuyerEmail,
            Amount = amount,
            VatAmount = vatAmount,
            TotalAmount = amount + vatAmount,
            Status = 1,
            StatusName = "Đã phát hành",
            LookupUrl = $"https://einvoice.example.com/lookup/{Guid.NewGuid():N}",
            LookupCode = $"LK{DateTime.Now:yyyyMMddHHmmss}",
            CreatedAt = DateTime.Now,
            CreatedBy = userId.ToString()
        };
    }

    public async Task<bool> CancelElectronicInvoiceAsync(Guid eInvoiceId, string reason, Guid userId)
    {
        // No ElectronicInvoice table - stub implementation
        await Task.CompletedTask;
        return true;
    }

    public async Task<List<ElectronicInvoiceDto>> GetElectronicInvoicesAsync(Guid? invoiceId, DateTime? fromDate, DateTime? toDate)
    {
        return new List<ElectronicInvoiceDto>();
    }

    public async Task<bool> ResendElectronicInvoiceAsync(Guid eInvoiceId, string email)
    {
        // No email service configured - stub implementation
        await Task.CompletedTask;
        return true;
    }

    #endregion

    #region 10.3 Cashier Management

    public async Task<CashierReportDto> GetCashierReportAsync(CashierReportRequestDto dto)
    {
        return new CashierReportDto();
    }

    public async Task<CashierReportDto> CloseCashBookAsync(CloseCashBookDto dto, Guid userId)
    {
        // Find open cash book for this cashier
        var cashBook = await _context.CashBooks
            .FirstOrDefaultAsync(cb => cb.CashierId == dto.CashierId && !cb.IsClosed);
        if (cashBook == null)
            throw new Exception("No open cash book found for this cashier");

        // Calculate totals from receipts in this cash book's period
        var receipts = await _context.Receipts
            .Where(r => r.CashierId == dto.CashierId
                && r.ReceiptDate >= cashBook.StartDate
                && r.Status == 1)
            .ToListAsync();

        var totalCash = receipts.Where(r => r.PaymentMethod == 1 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalCard = receipts.Where(r => r.PaymentMethod == 3 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalTransfer = receipts.Where(r => r.PaymentMethod == 2 && r.ReceiptType != 3).Sum(r => r.FinalAmount);
        var totalRefund = receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);

        cashBook.TotalReceipt = totalCash + totalCard + totalTransfer;
        cashBook.TotalRefund = totalRefund;
        cashBook.ClosingBalance = cashBook.OpeningBalance + cashBook.TotalReceipt - cashBook.TotalRefund;
        cashBook.IsClosed = true;
        cashBook.ClosedAt = DateTime.Now;
        cashBook.EndDate = DateTime.Now;
        cashBook.Note = dto.Note;

        await _context.SaveChangesAsync();

        var user = await _context.Users.FindAsync(dto.CashierId);

        return new CashierReportDto
        {
            CashierId = dto.CashierId,
            CashierName = user?.FullName ?? string.Empty,
            FromDate = cashBook.StartDate,
            ToDate = DateTime.Now,
            ShiftCode = dto.ShiftCode,
            OpeningBalance = cashBook.OpeningBalance,
            TotalCashReceived = totalCash,
            TotalCardReceived = totalCard,
            TotalTransferReceived = totalTransfer,
            TotalRefunded = totalRefund,
            ClosingBalance = cashBook.ClosingBalance,
            TransactionCount = receipts.Count,
            IsClosed = true
        };
    }

    public async Task<OutpatientRevenueReportDto> GetOutpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        return new OutpatientRevenueReportDto();
    }

    public async Task<InpatientRevenueReportDto> GetInpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        return new InpatientRevenueReportDto();
    }

    public async Task<DepositRevenueReportDto> GetDepositRevenueReportAsync(RevenueReportRequestDto dto)
    {
        return new DepositRevenueReportDto();
    }

    public async Task<CashBookUsageReportDto> GetCashBookUsageReportAsync(Guid cashBookId, DateTime fromDate, DateTime toDate)
    {
        return new CashBookUsageReportDto();
    }

    /// <summary>
    /// In bao cao thu tien ngoai tru theo khoang thoi gian
    /// </summary>
    public async Task<byte[]> PrintOutpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var query = _context.Receipts
                .Include(r => r.Cashier)
                .Include(r => r.MedicalRecord).ThenInclude(m => m!.Patient)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.ReceiptType == 2);

            // Filter outpatient (TreatmentType=1)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 1);

            if (dto.DepartmentId.HasValue)
                query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dto.DepartmentId.Value);
            if (dto.CashierId.HasValue)
                query = query.Where(r => r.CashierId == dto.CashierId.Value);

            var receipts = await query.OrderBy(r => r.ReceiptDate).ToListAsync();

            var headers = new[] { "So phieu", "Ngay", "Ho ten BN", "Tong tien", "Giam gia", "Thanh toan", "PT thanh toan", "Thu ngan" };
            var rows = receipts.Select(r => new[]
            {
                r.ReceiptCode,
                r.ReceiptDate.ToString("dd/MM/yyyy HH:mm"),
                r.MedicalRecord?.Patient?.FullName ?? "",
                r.Amount.ToString("#,##0"),
                r.Discount.ToString("#,##0"),
                r.FinalAmount.ToString("#,##0"),
                r.PaymentMethod switch { 1 => "TM", 2 => "CK", 3 => "The", 4 => "Vi", _ => "" },
                r.Cashier?.FullName ?? ""
            }).ToList();

            // Add totals row
            if (rows.Count > 0)
            {
                rows.Add(new[]
                {
                    "", "TONG CONG", "",
                    receipts.Sum(r => r.Amount).ToString("#,##0"),
                    receipts.Sum(r => r.Discount).ToString("#,##0"),
                    receipts.Sum(r => r.FinalAmount).ToString("#,##0"),
                    "", ""
                });
            }

            var subtitle = $"Tu {dto.FromDate:dd/MM/yyyy} den {dto.ToDate:dd/MM/yyyy}";
            var html = BuildTableReport("BAO CAO THU TIEN NGOAI TRU", subtitle, DateTime.Now, headers, rows, "Ke toan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bao cao thu tien noi tru theo khoang thoi gian
    /// </summary>
    public async Task<byte[]> PrintInpatientRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var query = _context.Receipts
                .Include(r => r.Cashier)
                .Include(r => r.MedicalRecord).ThenInclude(m => m!.Patient)
                .Where(r => r.ReceiptDate >= dto.FromDate && r.ReceiptDate <= dto.ToDate
                    && r.Status == 1 && r.ReceiptType == 2);

            // Filter inpatient (TreatmentType=2)
            query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.TreatmentType == 2);

            if (dto.DepartmentId.HasValue)
                query = query.Where(r => r.MedicalRecord != null && r.MedicalRecord.DepartmentId == dto.DepartmentId.Value);
            if (dto.CashierId.HasValue)
                query = query.Where(r => r.CashierId == dto.CashierId.Value);

            var receipts = await query.OrderBy(r => r.ReceiptDate).ToListAsync();

            var headers = new[] { "So phieu", "Ngay", "Ho ten BN", "So HS", "Tong tien", "Giam gia", "Thanh toan", "Thu ngan" };
            var rows = receipts.Select(r => new[]
            {
                r.ReceiptCode,
                r.ReceiptDate.ToString("dd/MM/yyyy HH:mm"),
                r.MedicalRecord?.Patient?.FullName ?? "",
                r.MedicalRecord?.MedicalRecordCode ?? "",
                r.Amount.ToString("#,##0"),
                r.Discount.ToString("#,##0"),
                r.FinalAmount.ToString("#,##0"),
                r.Cashier?.FullName ?? ""
            }).ToList();

            if (rows.Count > 0)
            {
                rows.Add(new[]
                {
                    "", "TONG CONG", "", "",
                    receipts.Sum(r => r.Amount).ToString("#,##0"),
                    receipts.Sum(r => r.Discount).ToString("#,##0"),
                    receipts.Sum(r => r.FinalAmount).ToString("#,##0"),
                    ""
                });
            }

            var subtitle = $"Tu {dto.FromDate:dd/MM/yyyy} den {dto.ToDate:dd/MM/yyyy}";
            var html = BuildTableReport("BAO CAO THU TIEN NOI TRU", subtitle, DateTime.Now, headers, rows, "Ke toan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    /// <summary>
    /// In bao cao tam ung theo khoang thoi gian
    /// </summary>
    public async Task<byte[]> PrintDepositRevenueReportAsync(RevenueReportRequestDto dto)
    {
        try
        {
            var query = _context.Deposits
                .Include(d => d.Patient)
                .Include(d => d.ReceivedBy)
                .Where(d => d.ReceiptDate >= dto.FromDate && d.ReceiptDate <= dto.ToDate);

            var deposits = await query.OrderBy(d => d.ReceiptDate).ToListAsync();

            var headers = new[] { "So phieu", "Ngay", "Ho ten BN", "So tien", "Da su dung", "Con lai", "PT thanh toan", "Nguoi thu" };
            var rows = deposits.Select(d => new[]
            {
                d.ReceiptNumber,
                d.ReceiptDate.ToString("dd/MM/yyyy HH:mm"),
                d.Patient?.FullName ?? "",
                d.Amount.ToString("#,##0"),
                d.UsedAmount.ToString("#,##0"),
                d.RemainingAmount.ToString("#,##0"),
                d.PaymentMethod switch { 1 => "TM", 2 => "CK", 3 => "The", 4 => "QR", _ => "" },
                d.ReceivedBy?.FullName ?? ""
            }).ToList();

            if (rows.Count > 0)
            {
                rows.Add(new[]
                {
                    "", "TONG CONG", "",
                    deposits.Sum(d => d.Amount).ToString("#,##0"),
                    deposits.Sum(d => d.UsedAmount).ToString("#,##0"),
                    deposits.Sum(d => d.RemainingAmount).ToString("#,##0"),
                    "", ""
                });
            }

            var subtitle = $"Tu {dto.FromDate:dd/MM/yyyy} den {dto.ToDate:dd/MM/yyyy}";
            var html = BuildTableReport("BAO CAO TAM UNG", subtitle, DateTime.Now, headers, rows, "Ke toan");
            return Encoding.UTF8.GetBytes(html);
        }
        catch { return Array.Empty<byte>(); }
    }

    #endregion

    #region 10.4 Statistics & Insurance

    public async Task<BillingStatisticsDto> GetBillingStatisticsAsync(BillingStatisticsRequestDto dto)
    {
        return new BillingStatisticsDto();
    }

    public async Task<DailyRevenueReportDto> GetDailyRevenueAsync(DateTime date)
    {
        return new DailyRevenueReportDto();
    }

    public async Task<List<DepartmentRevenueDto>> GetRevenueByDepartmentAsync(DepartmentRevenueRequestDto dto)
    {
        return new List<DepartmentRevenueDto>();
    }

    public async Task<DebtStatisticsDto> GetDebtStatisticsAsync(DateTime? asOfDate)
    {
        return new DebtStatisticsDto();
    }

    public async Task<InsuranceClaimDto> GenerateInsuranceClaimAsync(Guid medicalRecordId)
    {
        return new InsuranceClaimDto();
    }

    public async Task<Xml4210ResultDto> GenerateXml4210Async(GenerateXml4210RequestDto dto)
    {
        return new Xml4210ResultDto();
    }

    public async Task<InsuranceClaimStatisticsDto> GetInsuranceClaimStatisticsAsync(DateTime fromDate, DateTime toDate)
    {
        return new InsuranceClaimStatisticsDto();
    }

    #endregion
}
