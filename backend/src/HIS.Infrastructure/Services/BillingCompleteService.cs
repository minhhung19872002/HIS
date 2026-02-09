using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Billing;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;

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
        throw new NotImplementedException("CreateCashBookAsync not implemented");
    }

    public async Task<CashBookDto> CreateDepositBookAsync(CreateCashBookDto dto, Guid userId)
    {
        throw new NotImplementedException("CreateDepositBookAsync not implemented");
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
        throw new NotImplementedException("LockCashBookAsync not implemented");
    }

    public async Task<CashBookDto> UnlockCashBookAsync(Guid cashBookId, Guid userId)
    {
        throw new NotImplementedException("UnlockCashBookAsync not implemented");
    }

    public async Task<bool> AssignCashBookPermissionAsync(AssignCashBookPermissionDto dto, Guid userId)
    {
        throw new NotImplementedException("AssignCashBookPermissionAsync not implemented");
    }

    public async Task<bool> RemoveCashBookPermissionAsync(Guid cashBookId, Guid targetUserId, Guid userId)
    {
        throw new NotImplementedException("RemoveCashBookPermissionAsync not implemented");
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
        throw new NotImplementedException("CreateDepositAsync not implemented");
    }

    public async Task<DepartmentDepositDto> CreateDepartmentDepositAsync(Guid departmentId, List<Guid> depositIds, Guid userId)
    {
        throw new NotImplementedException("CreateDepartmentDepositAsync not implemented");
    }

    public async Task<DepartmentDepositDto> ReceiveDepartmentDepositAsync(Guid departmentDepositId, Guid userId)
    {
        throw new NotImplementedException("ReceiveDepartmentDepositAsync not implemented");
    }

    public async Task<DepositBalanceDto> GetDepositBalanceAsync(Guid patientId)
    {
        return new DepositBalanceDto();
    }

    public async Task<PaymentDto> UseDepositForPaymentAsync(UseDepositForPaymentDto dto, Guid userId)
    {
        throw new NotImplementedException("UseDepositForPaymentAsync not implemented");
    }

    public async Task<List<DepositDto>> GetPatientDepositsAsync(Guid patientId, int? status)
    {
        return new List<DepositDto>();
    }

    public async Task<bool> CancelDepositAsync(Guid depositId, string reason, Guid userId)
    {
        throw new NotImplementedException("CancelDepositAsync not implemented");
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
        throw new NotImplementedException("CancelPaymentAsync not implemented");
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
        throw new NotImplementedException("CreateRefundAsync not implemented");
    }

    public async Task<RefundDto> ApproveRefundAsync(ApproveRefundDto dto, Guid userId)
    {
        throw new NotImplementedException("ApproveRefundAsync not implemented");
    }

    public async Task<RefundDto> ConfirmRefundAsync(ConfirmRefundDto dto, Guid userId)
    {
        throw new NotImplementedException("ConfirmRefundAsync not implemented");
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
        throw new NotImplementedException("CancelRefundAsync not implemented");
    }

    #endregion

    #region 10.1.6 Record Locking

    public async Task<RecordLockDto> LockMedicalRecordAsync(LockRecordDto dto, Guid userId)
    {
        throw new NotImplementedException("LockMedicalRecordAsync not implemented");
    }

    public async Task<RecordLockDto> UnlockMedicalRecordAsync(Guid medicalRecordId, Guid userId)
    {
        throw new NotImplementedException("UnlockMedicalRecordAsync not implemented");
    }

    public async Task<RecordLockDto> GetRecordLockStatusAsync(Guid medicalRecordId)
    {
        return new RecordLockDto();
    }

    #endregion

    #region 10.1.7 Accounting Approval

    public async Task<List<AccountingApprovalDto>> ApproveAccountingAsync(ApproveAccountingDto dto, Guid userId)
    {
        throw new NotImplementedException("ApproveAccountingAsync not implemented");
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
        throw new NotImplementedException("ApplyInvoiceDiscountAsync not implemented");
    }

    public async Task<InvoiceDto> ApplyServiceDiscountAsync(ApplyDiscountDto dto, Guid userId)
    {
        throw new NotImplementedException("ApplyServiceDiscountAsync not implemented");
    }

    public async Task<List<DiscountHistoryDto>> GetDiscountHistoryAsync(Guid invoiceId)
    {
        return new List<DiscountHistoryDto>();
    }

    public async Task<bool> CancelDiscountAsync(Guid discountId, string reason, Guid userId)
    {
        throw new NotImplementedException("CancelDiscountAsync not implemented");
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
        throw new NotImplementedException("CreateOrUpdateInvoiceAsync not implemented");
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

    public async Task<byte[]> Print6556StatementAsync(Print6556RequestDto dto) => Array.Empty<byte>();
    public async Task<byte[]> Print6556ByObjectAsync(Print6556RequestDto dto) => Array.Empty<byte>();
    public async Task<byte[]> Print6556ByDepartmentAsync(Print6556RequestDto dto) => Array.Empty<byte>();
    public async Task<byte[]> PrintDepositByServiceAsync(PrintByServiceRequestDto dto) => Array.Empty<byte>();
    public async Task<byte[]> PrintDepositReceiptAsync(Guid depositId) => Array.Empty<byte>();
    public async Task<byte[]> PrintPaymentReceiptAsync(Guid paymentId) => Array.Empty<byte>();
    public async Task<byte[]> PrintInvoiceAsync(Guid invoiceId) => Array.Empty<byte>();
    public async Task<byte[]> PrintRefundReceiptAsync(Guid refundId) => Array.Empty<byte>();

    #endregion

    #region 10.2.1 Electronic Invoices

    public async Task<ElectronicInvoiceDto> IssueElectronicInvoiceAsync(IssueEInvoiceDto dto, Guid userId)
    {
        throw new NotImplementedException("IssueElectronicInvoiceAsync not implemented");
    }

    public async Task<bool> CancelElectronicInvoiceAsync(Guid eInvoiceId, string reason, Guid userId)
    {
        throw new NotImplementedException("CancelElectronicInvoiceAsync not implemented");
    }

    public async Task<List<ElectronicInvoiceDto>> GetElectronicInvoicesAsync(Guid? invoiceId, DateTime? fromDate, DateTime? toDate)
    {
        return new List<ElectronicInvoiceDto>();
    }

    public async Task<bool> ResendElectronicInvoiceAsync(Guid eInvoiceId, string email)
    {
        throw new NotImplementedException("ResendElectronicInvoiceAsync not implemented");
    }

    #endregion

    #region 10.3 Cashier Management

    public async Task<CashierReportDto> GetCashierReportAsync(CashierReportRequestDto dto)
    {
        return new CashierReportDto();
    }

    public async Task<CashierReportDto> CloseCashBookAsync(CloseCashBookDto dto, Guid userId)
    {
        throw new NotImplementedException("CloseCashBookAsync not implemented");
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

    public async Task<byte[]> PrintOutpatientRevenueReportAsync(RevenueReportRequestDto dto) => Array.Empty<byte>();
    public async Task<byte[]> PrintInpatientRevenueReportAsync(RevenueReportRequestDto dto) => Array.Empty<byte>();
    public async Task<byte[]> PrintDepositRevenueReportAsync(RevenueReportRequestDto dto) => Array.Empty<byte>();

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
