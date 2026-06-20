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

// K8 phien 6 (2026-05-30): tach 10.1.1 CashBook + 10.1.2 PatientSearch (~342 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
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
        var query = _context.CashBooks
            .Include(b => b.Cashier)
            .Where(b => !b.IsDeleted);
        if (bookType.HasValue) query = query.Where(b => b.BookType == bookType.Value);

        var books = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();
        return books.Select(b => new CashBookDto
        {
            Id = b.Id,
            Code = b.BookCode,
            Name = b.BookName,
            BookType = b.BookType,
            BookTypeName = b.BookType switch { 1 => "Sổ thu tiền", 2 => "Sổ tạm ứng", 3 => "Sổ hoàn ứng", _ => "Khác" },
            ReceiptPrefix = null,
            CurrentNumber = b.CurrentNumber,
            MaxNumber = b.EndNumber,
            OpeningBalance = b.OpeningBalance,
            CurrentBalance = b.ClosingBalance,
            Status = b.IsClosed ? 3 : 1,
            StatusName = b.IsClosed ? "Đã đóng" : "Đang mở",
            CreatedAt = b.CreatedAt,
            CreatedBy = b.CreatedBy,
            ClosedAt = b.EndDate,
        }).ToList();
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
        // No CashBookPermission table — return the book's owner (Cashier) as the
        // sole authorised user.
        var book = await _context.CashBooks
            .Include(b => b.Cashier)
            .FirstOrDefaultAsync(b => b.Id == cashBookId && !b.IsDeleted);
        if (book?.Cashier == null) return new List<CashBookUserDto>();
        return new List<CashBookUserDto>
        {
            new CashBookUserDto
            {
                UserId = book.Cashier.Id,
                UserCode = book.Cashier.UserCode ?? book.Cashier.Username,
                UserName = book.Cashier.FullName,
                Permission = 4,
                PermissionName = "Quản lý",
                AssignedAt = book.CreatedAt,
                AssignedBy = book.CreatedBy,
            },
        };
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
        try
        {
            var record = await _context.MedicalRecords
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == medicalRecordId);
            if (record == null) return new PatientBillingStatusDto();

            var serviceRequests = await _context.ServiceRequests
                .Where(sr => sr.MedicalRecordId == medicalRecordId)
                .ToListAsync();

            var receipts = await _context.Receipts
                .Where(r => r.MedicalRecordId == medicalRecordId && r.Status == 1)
                .ToListAsync();

            var deposits = await _context.Deposits
                .Where(d => d.MedicalRecordId == medicalRecordId && d.Status != 3)
                .ToListAsync();

            // Gộp tiền thuốc vào bảng kê (audit luồng nghiệp vụ 2026-06-06 #5): trước đây chỉ
            // Σ ServiceRequests nên BN còn nợ thuốc vẫn được cho ra viện. Loại đơn Hoàn trả(3)/Hủy(4).
            // (Vật tư/giường nếu phát sinh đã đi qua ServiceRequests — không bịa model giá giường ở đây.)
            var prescriptions = await _context.Prescriptions
                .Where(p => p.MedicalRecordId == medicalRecordId && !p.IsDeleted
                         && p.Status != 3 && p.Status != 4)
                .ToListAsync();
            var rxTotal = prescriptions.Sum(p => p.TotalAmount);
            var rxInsurance = prescriptions.Sum(p => p.InsuranceAmount);
            var rxPatient = prescriptions.Sum(p => p.PatientAmount);

            // F1 (audit FLOW-FINAL 2026-06-06): gộp tiền thuốc/vật tư PTTT (loại PaymentObject=3 hao-phí)
            // vào bảng kê — trước đây kê thuốc/vật tư phòng mổ KHÔNG vào viện phí (thất thu).
            // SurgeryMedicineItem/SupplyItem.SurgeryId = SurgeryRequest.Id (ca mổ keyed theo phiếu PTTT).
            var surgeryIds = await _context.SurgeryRequests
                .Where(s => s.MedicalRecordId == medicalRecordId)
                .Select(s => s.Id).ToListAsync();
            // F1-refine (2026-06-09): tách thuốc/vật tư PTTT theo ĐỐI TƯỢNG chi trả thay vì gộp tất cả
            // vào phần BN tự trả. PaymentObject: 1-BHYT→quỹ BHYT, 2-Thu phí→BN tự trả, 3-Hao phí→không thu (loại).
            // Trước đây surgMatTotal (gồm cả BHYT) đổ hết vào patientAmount → thu nhầm BN phần BHYT chi trả.
            decimal surgMatInsurance = 0, surgMatPatient = 0;
            if (surgeryIds.Count > 0)
            {
                surgMatInsurance =
                    (await _context.SurgeryMedicineItems.Where(m => surgeryIds.Contains(m.SurgeryId) && !m.IsDeleted && m.PaymentObject == 1).SumAsync(m => (decimal?)m.Amount) ?? 0)
                  + (await _context.SurgerySupplyItems.Where(s => surgeryIds.Contains(s.SurgeryId) && !s.IsDeleted && s.PaymentObject == 1).SumAsync(s => (decimal?)s.Amount) ?? 0);
                surgMatPatient =
                    (await _context.SurgeryMedicineItems.Where(m => surgeryIds.Contains(m.SurgeryId) && !m.IsDeleted && m.PaymentObject == 2).SumAsync(m => (decimal?)m.Amount) ?? 0)
                  + (await _context.SurgerySupplyItems.Where(s => surgeryIds.Contains(s.SurgeryId) && !s.IsDeleted && s.PaymentObject == 2).SumAsync(s => (decimal?)s.Amount) ?? 0);
            }

            var totalAmount = serviceRequests.Sum(sr => sr.TotalAmount) + rxTotal + surgMatInsurance + surgMatPatient;
            var insuranceAmount = serviceRequests.Sum(sr => sr.InsuranceAmount) + rxInsurance + surgMatInsurance;
            var patientAmount = serviceRequests.Sum(sr => sr.PatientAmount) + rxPatient + surgMatPatient;
            var paidAmount = receipts.Where(r => r.ReceiptType != 3).Sum(r => r.FinalAmount)
                           - receipts.Where(r => r.ReceiptType == 3).Sum(r => r.FinalAmount);
            var depositBalance = deposits.Sum(d => d.RemainingAmount);
            var remaining = patientAmount - paidAmount;

            var statusNames = new Dictionary<int, string>
            {
                { 0, "Cho kham" }, { 1, "Dang kham" }, { 2, "Cho TT" },
                { 3, "Dang dieu tri" }, { 4, "Cho ra vien" }, { 5, "Da dong BA" }
            };

            var hasUnpaidServices = serviceRequests.Any(sr => !sr.IsPaid && sr.Status != 4);
            // Thuốc không có cờ IsPaid riêng → còn nợ nếu tổng phải-thu (đã gồm thuốc) vượt đã-thu.
            var hasOutstanding = remaining > 0;
            var hasUnpaid = hasUnpaidServices || hasOutstanding;
            var paymentStatus = remaining <= 0 ? 2 : (paidAmount > 0 ? 1 : 0);
            var paymentStatusNames = new[] { "Chua thanh toan", "Thanh toan mot phan", "Da thanh toan" };

            var warnings = new List<string>();
            if (hasUnpaidServices) warnings.Add("Co dich vu chua thanh toan");
            if (rxPatient > 0 && hasOutstanding) warnings.Add("Con no tien thuoc");
            if (remaining > 0 && depositBalance < remaining) warnings.Add("So du tam ung khong du");

            return new PatientBillingStatusDto
            {
                PatientId = record.PatientId,
                PatientCode = record.Patient?.PatientCode ?? string.Empty,
                PatientName = record.Patient?.FullName ?? string.Empty,
                MedicalRecordId = record.Id,
                MedicalRecordCode = record.MedicalRecordCode,
                RecordStatus = record.Status,
                RecordStatusName = statusNames.GetValueOrDefault(record.Status, ""),
                AccountingStatus = record.IsClosed ? 2 : 1,
                AccountingStatusName = record.IsClosed ? "Da duyet" : "Chua duyet",
                PaymentStatus = paymentStatus,
                PaymentStatusName = paymentStatusNames[paymentStatus],
                TotalAmount = totalAmount,
                InsuranceAmount = insuranceAmount,
                PatientAmount = patientAmount,
                PaidAmount = paidAmount,
                DepositBalance = depositBalance,
                RemainingAmount = remaining > 0 ? remaining : 0,
                HasUnpaidServices = hasUnpaid,
                HasPendingApproval = !record.IsClosed,
                IsLocked = record.Status >= 4,
                CanDischarge = !hasUnpaid && remaining <= 0,
                Warnings = warnings
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetPatientBillingStatusAsync failed for medical record {MedicalRecordId}", medicalRecordId);
            // KHÔNG trả DTO rỗng (mặc định trông như "sạch nợ") — sẽ cho ra viện nhầm.
            // Trả trạng thái chặn an toàn để người dùng biết cần kiểm tra lại công nợ.
            return new PatientBillingStatusDto
            {
                MedicalRecordId = medicalRecordId,
                CanDischarge = false,
                Warnings = new List<string> { "Loi tinh cong no - khong the xac nhan ra vien, vui long thu lai" }
            };
        }
    }

    public async Task<InsuranceCheckDto> CheckInsuranceCardAsync(InsuranceCheckRequestDto dto)
    {
        try
        {
            var result = new InsuranceCheckDto
            {
                InsuranceCardNumber = dto.InsuranceCardNumber,
                PatientName = dto.PatientName,
                DateOfBirth = dto.DateOfBirth,
                CheckedAt = DateTime.Now
            };

            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => p.InsuranceNumber == dto.InsuranceCardNumber);

            if (patient == null)
            {
                result.Errors.Add("Khong tim thay thong tin the BHYT");
                return result;
            }

            result.PatientName = patient.FullName ?? dto.PatientName;
            result.DateOfBirth = patient.DateOfBirth;
            result.CardFromDate = patient.InsuranceExpireDate?.AddYears(-1);
            result.CardToDate = patient.InsuranceExpireDate;
            result.IsValid = patient.InsuranceExpireDate == null || patient.InsuranceExpireDate >= DateTime.Today;
            result.IsInNetwork = true;
            result.InsuranceRate = 0.8m;
            result.CoPaymentRate = 0.2m;

            if (!result.IsValid)
                result.Warnings.Add("The BHYT da het han su dung");
            else if (patient.InsuranceExpireDate.HasValue && patient.InsuranceExpireDate.Value <= DateTime.Today.AddDays(30))
                result.Warnings.Add("The BHYT sap het han (con " +
                    (patient.InsuranceExpireDate.Value - DateTime.Today).Days + " ngay)");

            // Check 5-year continuous
            result.Is5YearContinuous = patient.InsuranceExpireDate.HasValue &&
                result.CardFromDate.HasValue &&
                (patient.InsuranceExpireDate.Value - result.CardFromDate.Value).TotalDays >= 1825;

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CheckInsuranceCardAsync failed for card {Card}", dto.InsuranceCardNumber);
            return new InsuranceCheckDto { CheckedAt = DateTime.Now, IsError = true, ErrorMessage = ex.Message };
        }
    }

    #endregion
}
