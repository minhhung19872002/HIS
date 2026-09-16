using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Infrastructure.Security;
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

// K8 phien 6 (2026-05-30): tach 10.1.1 CashBook + 10.1.2 PatientSearch (~342 dong) khoi BillingCompleteService.
public partial class BillingCompleteService {
    #region 10.1.1 Cash Book Management

    /// <summary>QA-R4: a book needs a code and a name (blank books were created by placeholder input); code unique among live books.</summary>
    private async Task EnsureCashBookInputAsync(CreateCashBookDto dto)
    {
        dto.Code = dto.Code?.Trim() ?? string.Empty;
        dto.Name = dto.Name?.Trim() ?? string.Empty;
        if (dto.Code.Length == 0) throw new ArgumentException("Mã sổ là bắt buộc.");
        if (dto.Name.Length == 0) throw new ArgumentException("Tên sổ là bắt buộc.");
        if (await _context.CashBooks.AnyAsync(b => b.BookCode == dto.Code && !b.IsDeleted))
            throw new InvalidOperationException($"Mã sổ \"{dto.Code}\" đã tồn tại.");
    }

    public async Task<CashBookDto> CreateCashBookAsync(CreateCashBookDto dto, Guid userId)
    {
        await EnsureCashBookInputAsync(dto);
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
        await EnsureCashBookInputAsync(dto);
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

        var books = await query.OrderByDescending(b => b.CreatedAt).ToBoundedListAsync("BillingCompleteService.GetCashBooksAsync");
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
            throw new KeyNotFoundException("Cash book not found");

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
            BookTypeName = cashBook.BookType == 1 ? "Thu tiền" : "Tạm ứng",
            OpeningBalance = cashBook.OpeningBalance,
            CurrentBalance = cashBook.ClosingBalance,
            Status = cashBook.IsClosed ? 2 : 1,
            StatusName = cashBook.IsClosed ? "Đã khóa" : "Đang mở",
            CreatedAt = cashBook.CreatedAt
        };
    }

    public async Task<CashBookDto> UnlockCashBookAsync(Guid cashBookId, Guid userId)
    {
        var cashBook = await _context.CashBooks.FirstOrDefaultAsync(cb => cb.Id == cashBookId);
        if (cashBook == null)
            throw new KeyNotFoundException("Cash book not found");

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
        // No CashBookPermission table exists - stub implementation.
        // QA-R4: at least refuse unknown book/user instead of answering "true" for zero ids.
        await EnsureCashBookAndUserAsync(dto.CashBookId, dto.UserId);
        return true;
    }

    public async Task<bool> RemoveCashBookPermissionAsync(Guid cashBookId, Guid targetUserId, Guid userId)
    {
        // No CashBookPermission table exists - stub implementation (see above).
        await EnsureCashBookAndUserAsync(cashBookId, targetUserId);
        return true;
    }

    private async Task EnsureCashBookAndUserAsync(Guid cashBookId, Guid targetUserId)
    {
        if (!await _context.CashBooks.AnyAsync(b => b.Id == cashBookId && !b.IsDeleted))
            throw new KeyNotFoundException("Không tìm thấy sổ thu.");
        if (!await _context.Users.AnyAsync(u => u.Id == targetUserId))
            throw new KeyNotFoundException("Không tìm thấy người dùng.");
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
        // QA0915: was a stub returning an empty page → /v2/billing/edit (cashier editor) and the
        // "Tạm ứng" tab / "Tạo tạm ứng mới" could never find a patient, so nothing could be collected.
        // Returns one row per patient with their latest medical record (the editor pays against it).
        // Amount fields are intentionally NOT computed here — use billing-status for money figures.
        var page = dto.Page > 0 ? dto.Page : 1;
        var pageSize = dto.PageSize > 0 ? Math.Min(dto.PageSize, 200) : 20;

        var query = _context.MedicalRecords
            .Include(m => m.Patient)
            .Where(m => !m.IsDeleted && m.Patient != null && !m.Patient.IsDeleted);

        if (!string.IsNullOrWhiteSpace(dto.Keyword))
        {
            var k = dto.Keyword.Trim();
            query = query.Where(m => m.Patient.PatientCode.Contains(k)
                || m.Patient.FullName.Contains(k)
                || m.MedicalRecordCode.Contains(k));
        }
        if (dto.DepartmentId.HasValue)
            query = query.Where(m => m.DepartmentId == dto.DepartmentId.Value);
        if (dto.RecordStatus.HasValue)
            query = query.Where(m => m.Status == dto.RecordStatus.Value);
        if (dto.FromDate.HasValue)
            query = query.Where(m => m.AdmissionDate >= dto.FromDate.Value);
        if (dto.ToDate.HasValue)
            query = query.Where(m => m.AdmissionDate < dto.ToDate.Value.Date.AddDays(1));

        // Latest record per patient — picked in memory from a bounded, flat projection so the SQL
        // stays a plain filtered SELECT (no GroupBy/First translation).
        var candidates = await query
            .OrderByDescending(m => m.AdmissionDate)
            .Select(m => new { m.Id, m.PatientId })
            .Take(2000)
            .ToListAsync();
        var latestIds = candidates
            .GroupBy(c => c.PatientId)
            .Select(g => g.First().Id) // already ordered newest first
            .ToList();

        var totalCount = latestIds.Count;
        var pageIds = latestIds.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        var rows = await _context.MedicalRecords
            .Include(m => m.Patient)
            .Where(m => pageIds.Contains(m.Id))
            .OrderByDescending(m => m.AdmissionDate)
            .ToListAsync();

        return new PagedResultDto<PatientBillingStatusDto>
        {
            Items = rows.Select(m => new PatientBillingStatusDto
            {
                PatientId = m.PatientId,
                PatientCode = m.Patient?.PatientCode ?? string.Empty,
                PatientName = m.Patient?.FullName ?? string.Empty,
                MedicalRecordId = m.Id,
                MedicalRecordCode = m.MedicalRecordCode,
                RecordStatus = m.Status,
                AccountingStatus = m.IsClosed ? 2 : 1,
                AccountingStatusName = m.IsClosed ? "Da duyet" : "Chua duyet",
                IsLocked = m.Status >= 4,
            }).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
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

    /// <summary>Benefit level (mức hưởng, %) from the 3rd character of a 15-char BHYT card; null if unknown.</summary>
    private static int? CoverageFromCardLevel(string? cardNumber)
    {
        var card = cardNumber?.Trim();
        if (string.IsNullOrEmpty(card) || card.Length < 3) return null;
        return card[2] switch
        {
            '1' or '2' or '5' => 100,
            '3' => 95,
            '4' => 80,
            _ => null
        };
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
                .Where(p => !p.IsDeleted)
                .FindByInsuranceNumberDecryptedAsync(dto.InsuranceCardNumber);

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
            // Use rate stored on the most recent medical record; fall back to statutory 80%
            var coveragePercent = await _context.MedicalRecords
                .Where(m => m.PatientId == patient.Id && m.InsuranceCoverageRate.HasValue)
                .OrderByDescending(m => m.AdmissionDate)
                .Select(m => m.InsuranceCoverageRate)
                .FirstOrDefaultAsync();
            // QA0915: fallback was a flat 80% for every card (TE1/CC1 showed 80%). Without a stored rate,
            // use the statutory benefit level encoded in the 3rd character of the card (QĐ 1351/QĐ-BHXH):
            // 1,2,5 → 100% · 3 → 95% · 4 → 80%. Route (đúng/trái tuyến) is NOT applied here.
            result.InsuranceRate  = (coveragePercent ?? CoverageFromCardLevel(dto.InsuranceCardNumber) ?? 80) / 100m;
            result.CoPaymentRate  = 1m - result.InsuranceRate;

            // QA-R4: the caller's date of birth was accepted silently — a card presented with the wrong DOB
            // (someone else's card) is flagged for the receptionist.
            if (dto.DateOfBirth.HasValue && patient.DateOfBirth.HasValue
                && dto.DateOfBirth.Value.Date != patient.DateOfBirth.Value.Date)
                result.Warnings.Add("Ngay sinh khong khop voi the BHYT (" + patient.DateOfBirth.Value.ToString("dd/MM/yyyy") + ")");

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
