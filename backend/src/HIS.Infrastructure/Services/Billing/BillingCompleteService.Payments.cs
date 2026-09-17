using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HIS.Core.Constants;
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
        // N7: VND has no sub-unit — reject fractional amounts (a 0,50đ receipt surfaced on the dashboard).
        if (dto.Amount != Math.Round(dto.Amount, 0))
            throw new InvalidOperationException("Số tiền tạm ứng phải là số nguyên đồng (VND không có số lẻ)");
        // QA-R2: the record was stored as sent — a deposit could be booked on another patient's record, on a
        // cancelled record, or after discharge / billing lock (money nobody would ever settle against).
        if (dto.MedicalRecordId.HasValue && dto.MedicalRecordId.Value != Guid.Empty)
        {
            var record = await _context.MedicalRecords
                .Where(m => m.Id == dto.MedicalRecordId.Value && !m.IsDeleted)
                .Select(m => new { m.PatientId, m.Status, m.IsClosed, m.DischargeDate })
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Không tìm thấy hồ sơ bệnh án");
            if (record.PatientId != dto.PatientId)
                throw new InvalidOperationException("Hồ sơ bệnh án không thuộc bệnh nhân này");
            if (record.Status == MedicalRecordStatus.Cancelled)
                throw new InvalidOperationException("Hồ sơ bệnh án đã hủy — không thu tạm ứng được");
            if (record.IsClosed)
                throw new InvalidOperationException("Hồ sơ bệnh án đã khóa viện phí — không thu tạm ứng được");
            if (record.DischargeDate.HasValue)
                throw new InvalidOperationException("Bệnh nhân đã ra viện trên hồ sơ này — không thu tạm ứng được");
        }
        else
        {
            dto.MedicalRecordId = null; // Guid.Empty would violate the FK
        }

        // QA-R6: a double-click on "Thu tạm ứng" booked the cash twice (two deposits, same receipt number,
        // both refundable). Same 30s idempotency rule as CreatePaymentAsync, made race-safe by a per-patient
        // lock held until the deposit is committed.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, $"HIS.Billing.Collect.{dto.PatientId:N}",
            "Bệnh nhân này đang được thu tiền ở quầy khác, vui lòng thử lại.");
        var dupWindow = HIS.Core.Common.VnTime.NowVn.AddSeconds(-30);
        var duplicate = await _context.Deposits
            .Where(d => d.PatientId == dto.PatientId && d.MedicalRecordId == dto.MedicalRecordId
                && d.ReceivedByUserId == userId && d.Amount == dto.Amount && d.PaymentMethod == dto.PaymentMethod
                && d.Status != DepositStatus.Cancelled && !d.IsDeleted && d.ReceiptDate >= dupWindow)
            .OrderByDescending(d => d.ReceiptDate)
            .FirstOrDefaultAsync();
        if (duplicate != null)
            return new DepositDto
            {
                Id = duplicate.Id, ReceiptCode = duplicate.ReceiptNumber, PatientId = dto.PatientId,
                PatientCode = patient.PatientCode, PatientName = patient.FullName, Amount = duplicate.Amount,
                UsedAmount = duplicate.UsedAmount, RemainingAmount = duplicate.RemainingAmount,
                PaymentMethod = duplicate.PaymentMethod, PaymentMethodName = GetPaymentMethodName(duplicate.PaymentMethod),
                Status = duplicate.Status, StatusName = DepositStatus.Label(duplicate.Status), Notes = duplicate.Notes,
                CreatedAt = duplicate.CreatedAt, ConfirmedAt = duplicate.CreatedAt
            };

        var deposit = new Deposit
        {
            Id = Guid.NewGuid(),
            ReceiptNumber = await NextStampCodeAsync("TU", c => _context.Deposits.AnyAsync(d => d.ReceiptNumber == c)),
            ReceiptDate = HIS.Core.Common.VnTime.NowVn, // business timestamp = VN local (query via VnTime.DayRangeVn)
            PatientId = dto.PatientId,
            MedicalRecordId = dto.MedicalRecordId,
            Amount = dto.Amount,
            UsedAmount = 0,
            RemainingAmount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = dto.TransactionNumber, // bank/card ref was sent by the cashier form but dropped
            Status = 2, // Đã xác nhận
            ReceivedByUserId = userId,
            Notes = dto.Notes,
            CreatedAt = DateTime.Now
        };

        _context.Deposits.Add(deposit);
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

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

    // ════════════════════════════════════════════════════════════════════════════════════════
    // Nộp tiền tạm ứng thu tại khoa về quỹ bệnh viện — #218/T3
    //
    // Cả HAI đầu của việc bàn giao tiền này trước đây là vỏ rỗng. `CreateDepartmentDepositAsync` đọc
    // thật (tra khoa, tra các phiếu, cộng tổng tiền) rồi KHÔNG ghi gì: sinh mã biên lai
    // `TUK{yyyyMMddHHmmssfff}` và trả DTO. `ReceiveDepartmentDepositAsync` có chú thích thẳng thắn
    // `// No DepartmentDeposit table - return stub confirming receipt`, trả "đã tiếp nhận" kèm
    // `TotalAmount = 0`.
    //
    // Hệ quả: nộp lại đúng những phiếu ấy lần nữa vẫn được, và khi đối chiếu quỹ thì không tra ra ai
    // nộp cái gì lúc nào. Đây là tiền mặt đi qua tay người.
    //
    // Cố ý KHÔNG mượn `Deposits.Status` làm dấu đã-nộp — cột đó đang có lệch nghĩa ĐÃ BIẾT mà chưa
    // sửa (giá trị 3: đường ghi đặt là "đã tiêu hết", báo cáo đọc là "đã hoàn tiền"). Migration 182
    // cho việc nộp một cột riêng.
    // ════════════════════════════════════════════════════════════════════════════════════════

    private static DepartmentDepositDto ToBatchDto(
        DepartmentDepositBatch batch, Department? dept, User? submitter, User? receiver,
        List<Deposit> deposits) => new DepartmentDepositDto
    {
        Id = batch.Id,
        ReceiptCode = batch.ReceiptCode,
        DepartmentId = batch.DepartmentId,
        DepartmentCode = dept?.DepartmentCode ?? string.Empty,
        DepartmentName = dept?.DepartmentName ?? string.Empty,
        SubmittedBy = batch.SubmittedById ?? Guid.Empty,
        SubmittedByName = submitter?.FullName ?? string.Empty,
        Deposits = deposits.Select(d => new DepositDto
        {
            Id = d.Id,
            ReceiptCode = d.ReceiptNumber,
            PatientId = d.PatientId ?? Guid.Empty,
            Amount = d.Amount,
            UsedAmount = d.UsedAmount,
            RemainingAmount = d.RemainingAmount,
            Status = d.Status,
            StatusName = DepositStatus.Label(d.Status),
            CreatedAt = d.CreatedAt,
        }).ToList(),
        TotalAmount = batch.TotalAmount,
        PaymentMethod = 1,
        CashierId = batch.ReceivedById ?? Guid.Empty,
        CashierName = receiver?.FullName ?? string.Empty,
        Status = batch.ReceivedAt.HasValue ? 2 : 1, // 1 chờ tiếp nhận · 2 đã tiếp nhận
        CreatedAt = batch.CreatedAt,
        ReceivedAt = batch.ReceivedAt,
    };

    public async Task<DepartmentDepositDto> CreateDepartmentDepositAsync(Guid departmentId, List<Guid> depositIds, Guid userId)
    {
        if (depositIds == null || depositIds.Count == 0)
            throw new InvalidOperationException("Chưa chọn phiếu tạm ứng nào để nộp.");

        var department = await _context.Departments.FindAsync(departmentId)
            ?? throw new KeyNotFoundException("Không tìm thấy khoa");

        var deposits = await _context.Deposits
            .Where(d => depositIds.Contains(d.Id) && !d.IsDeleted)
            .ToListAsync();

        var thieu = depositIds.Where(id => deposits.All(d => d.Id != id)).ToList();
        if (thieu.Count > 0)
            throw new KeyNotFoundException($"Không tìm thấy {thieu.Count} phiếu tạm ứng trong danh sách nộp.");

        // Nộp trùng: trước đây không chặn được vì không có gì ghi lại lần nộp trước.
        var daNop = deposits.Where(d => d.HandoverBatchId.HasValue).ToList();
        if (daNop.Count > 0)
            throw new InvalidOperationException(
                $"Có {daNop.Count} phiếu đã nộp về quỹ trước đó: "
                + string.Join(", ", daNop.Take(5).Select(d => d.ReceiptNumber)));

        var daHuy = deposits.Where(d => d.Status == DepositStatus.Cancelled).ToList();
        if (daHuy.Count > 0)
            throw new InvalidOperationException(
                $"Có {daHuy.Count} phiếu đã hủy, không nộp về quỹ được: "
                + string.Join(", ", daHuy.Take(5).Select(d => d.ReceiptNumber)));

        var now = DateTime.Now;
        var ngay = now.ToString("yyyyMMdd");
        // Đánh số theo bộ đếm trong ngày. Bản cũ dùng `TUK{yyyyMMddHHmmssfff}` — mã biên lai gắn với
        // mốc thời gian đến mili giây thì không ai đọc ra và không tra cứu được.
        var soTrongNgay = await _context.DepartmentDepositBatches
            .CountAsync(b => b.ReceiptCode.StartsWith($"TUK{ngay}"));

        var batch = new DepartmentDepositBatch
        {
            Id = Guid.NewGuid(),
            ReceiptCode = $"TUK{ngay}-{(soTrongNgay + 1):D4}",
            DepartmentId = departmentId,
            SubmittedById = userId,
            SubmittedAt = now,
            DepositCount = deposits.Count,
            TotalAmount = deposits.Sum(d => d.Amount),
            CreatedAt = now,
            CreatedBy = userId.ToString(),
        };
        _context.DepartmentDepositBatches.Add(batch);

        foreach (var d in deposits)
        {
            d.HandoverBatchId = batch.Id;
            d.HandoverAt = now;
            d.UpdatedAt = now;
            // `Status` là của vòng đời tiền tạm ứng (còn tiêu / đã tiêu hết / đã hủy). Việc nộp về
            // quỹ là chuyện khác. Cố ý KHÔNG đụng vào.
        }

        await _context.SaveChangesAsync();

        var submitter = await _context.Users.FindAsync(userId);
        return ToBatchDto(batch, department, submitter, null, deposits);
    }

    /// <summary>
    /// Thủ quỹ tiếp nhận một đợt nộp từ khoa. #218/T3 — trước đây trả "đã tiếp nhận" kèm
    /// <c>TotalAmount = 0</c> mà không ghi gì.
    /// </summary>
    public async Task<DepartmentDepositDto> ReceiveDepartmentDepositAsync(Guid departmentDepositId, Guid userId)
    {
        var batch = await _context.DepartmentDepositBatches
            .FirstOrDefaultAsync(b => b.Id == departmentDepositId && !b.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy đợt nộp tạm ứng");

        if (batch.ReceivedAt.HasValue)
            throw new InvalidOperationException(
                $"Đợt nộp {batch.ReceiptCode} đã được tiếp nhận lúc {batch.ReceivedAt:dd/MM/yyyy HH:mm}.");

        var now = DateTime.Now;
        // QA-R6: two cashiers pressing "Tiếp nhận" together both passed the check above and both answered
        // 200 (the later one silently became the receiver). Claim the batch atomically.
        var claimed = await _context.DepartmentDepositBatches
            .Where(b => b.Id == batch.Id && b.ReceivedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(b => b.ReceivedById, userId)
                .SetProperty(b => b.ReceivedAt, now)
                .SetProperty(b => b.UpdatedAt, now)
                .SetProperty(b => b.UpdatedBy, userId.ToString()));
        if (claimed == 0)
            throw new InvalidOperationException($"Đợt nộp {batch.ReceiptCode} vừa được tiếp nhận bởi người khác.");
        batch.ReceivedById = userId;
        batch.ReceivedAt = now;
        batch.UpdatedAt = now;
        batch.UpdatedBy = userId.ToString();
        _context.Entry(batch).State = EntityState.Unchanged; // already written by the claim above

        var department = await _context.Departments.FindAsync(batch.DepartmentId);
        var submitter = batch.SubmittedById.HasValue
            ? await _context.Users.FindAsync(batch.SubmittedById.Value) : null;
        var receiver = await _context.Users.FindAsync(userId);
        var deposits = await _context.Deposits
            .Where(d => d.HandoverBatchId == batch.Id && !d.IsDeleted).ToListAsync();

        return ToBatchDto(batch, department, submitter, receiver, deposits);
    }

    public async Task<DepositBalanceDto> GetDepositBalanceAsync(Guid patientId)
    {
        var patient = await _context.Patients.FindAsync(patientId);
        var deposits = await _context.Deposits
            .Where(d => d.PatientId == patientId && d.Status != 5) // Exclude cancelled
            .ToListAsync();

        var totalDeposit = deposits.Sum(d => d.Amount);
        var usedAmount = deposits.Sum(d => d.UsedAmount);

        // Refunds raised on a deposit never touch UsedAmount/RemainingAmount, so a fully refunded
        // deposit still showed as available advance at the cashier (measured: 500.000đ refunded and
        // paid out, balance still 500.000đ). Same rule as UseDepositForPaymentAsync.
        var depositIds = deposits.Select(d => d.Id).ToList();
        var refundedByDeposit = depositIds.Count == 0 ? new Dictionary<Guid, decimal>()
            : await _context.Receipts
                .Where(r => r.ReceiptType == 3 && !r.IsDeleted && r.OriginalDepositId != null
                            && depositIds.Contains(r.OriginalDepositId.Value)
                            && r.Status != RefundStatus.Rejected
                            && r.Status != RefundStatus.Cancelled)
                .GroupBy(r => r.OriginalDepositId!.Value)
                .Select(g => new { g.Key, Sum = g.Sum(r => r.FinalAmount) })
                .ToDictionaryAsync(x => x.Key, x => x.Sum);
        decimal Refunded(Guid id) => refundedByDeposit.TryGetValue(id, out var v) ? v : 0m;
        var totalRefunded = deposits.Sum(d => Refunded(d.Id));

        return new DepositBalanceDto
        {
            PatientId = patientId,
            PatientCode = patient?.PatientCode ?? string.Empty,
            PatientName = patient?.FullName ?? string.Empty,
            TotalDeposit = totalDeposit,
            UsedAmount = usedAmount,
            RemainingBalance = Math.Max(0, totalDeposit - usedAmount - totalRefunded),
            ActiveDeposits = deposits
                .Where(d => d.RemainingAmount - Refunded(d.Id) > 0 && d.Status == 2)
                .Select(d => new DepositDto
                {
                    Id = d.Id,
                    ReceiptCode = d.ReceiptNumber,
                    PatientId = d.PatientId ?? Guid.Empty,
                    Amount = d.Amount,
                    UsedAmount = d.UsedAmount,
                    RemainingAmount = d.RemainingAmount - Refunded(d.Id),
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
        // #218/T3 (2026-09-04): hủy phiếu tạm ứng chỉ đặt `Status = 5`, KHÔNG đụng tới
        // `RemainingAmount`. Đường này trước đây chỉ so số dư nên phiếu đã hủy vẫn tiêu được bình
        // thường — đo được: hủy xong vẫn trừ được 100.000đ khỏi phiếu.
        DepositStatus.EnsureSpendable(deposit.Status, "sử dụng");
        // #189: chặn số tiền <= 0 trước khi so số dư
        if (dto.Amount <= 0)
            throw new InvalidOperationException("Số tiền sử dụng phải lớn hơn 0");
        // N7: VND has no sub-unit — reject fractional amounts (a 0,50đ receipt surfaced on the dashboard).
        if (dto.Amount != Math.Round(dto.Amount, 0))
            throw new InvalidOperationException("Số tiền sử dụng tạm ứng phải là số nguyên đồng (VND không có số lẻ)");
        // QA0915: refunds already raised on this deposit (pending/approved/paid) never touch
        // RemainingAmount, so they must be deducted here too — otherwise the same money is both spent
        // and refunded (measured: 1.000.000đ deposit fully spent while a 6.000đ refund stayed payable).
        var refundedFromDeposit = await _context.Receipts
            .Where(r => r.ReceiptType == 3
                        && r.OriginalDepositId == deposit.Id
                        && !r.IsDeleted
                        && r.Status != RefundStatus.Rejected
                        && r.Status != RefundStatus.Cancelled)
            .SumAsync(r => (decimal?)r.FinalAmount) ?? 0m;
        if (deposit.RemainingAmount - refundedFromDeposit < dto.Amount)
            throw new InvalidOperationException("Số dư tạm ứng không đủ"); // #462: 400, không phải 500

        // QA0915: the invoice passed in was ignored — deposit got consumed (990.000đ against an invoice
        // owing 4.199đ) while the invoice debt never went down. Settle it atomically with the receipt.
        InvoiceSummary? invoice = null;
        InvoiceLedger.ChargeSet? charges = null;
        if (dto.InvoiceId != Guid.Empty)
        {
            invoice = await _context.InvoiceSummaries.FirstOrDefaultAsync(i => i.Id == dto.InvoiceId && !i.IsDeleted)
                ?? throw new KeyNotFoundException("Không tìm thấy hóa đơn");
            // QA-R3: owe what the record really owes now (services + medicines + bed − money on the record).
            charges = await InvoiceLedger.RefreshAsync(_context, invoice);
            var invoiceRecordId = invoice.MedicalRecordId;
            var invoicePatientId = await _context.MedicalRecords
                .Where(m => m.Id == invoiceRecordId)
                .Select(m => m.PatientId)
                .FirstOrDefaultAsync();
            if (deposit.PatientId.HasValue && invoicePatientId != deposit.PatientId.Value)
                throw new InvalidOperationException("Phiếu tạm ứng và hóa đơn không cùng một bệnh nhân");
            if (dto.Amount > invoice.RemainingAmount)
                throw new InvalidOperationException(
                    $"Số tiền dùng tạm ứng ({dto.Amount:N0}đ) vượt quá số tiền hóa đơn còn nợ ({invoice.RemainingAmount:N0}đ)");

            invoice.PaidAmount += dto.Amount;
            invoice.RemainingAmount = Math.Max(0, invoice.TotalAmount - invoice.DiscountAmount - invoice.PaidAmount);
            if (invoice.RemainingAmount == 0)
                invoice.Status = 1;
            invoice.UpdatedAt = DateTime.Now;
            invoice.UpdatedBy = userId.ToString();
        }

        deposit.UsedAmount += dto.Amount;
        deposit.RemainingAmount -= dto.Amount;
        if (deposit.RemainingAmount == 0)
            deposit.Status = 3; // Đã sử dụng hết

        // Create payment receipt
        await using var codeTx = await SqlAppLock.BeginAsync(_context);
        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = await NextStampCodeAsync("PT", c => _context.Receipts.AnyAsync(r => r.ReceiptCode == c)),
            ReceiptDate = DateTime.Now,
            PatientId = deposit.PatientId ?? Guid.Empty,
            // QA0915: link to the medical record (per-record paid totals ignored this receipt) and to the
            // source deposit, so cancelling the receipt can give the money back to the deposit.
            MedicalRecordId = invoice?.MedicalRecordId ?? deposit.MedicalRecordId,
            OriginalDepositId = deposit.Id,
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
        if (invoice != null && charges != null)
            await InvoiceLedger.MarkCoveredAsync(_context, invoice, charges, receipt,
                dto.ServiceItemIds, dto.MedicineItemIds, dto.IncludeBedCharges, userId.ToString());
        await _context.SaveChangesAsync();
        if (codeTx != null) await codeTx.CommitAsync();

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
            // QA-R2: Status/StatusName/CreatedAt were never mapped → every deposit came back status 0 ("—"),
            // dated 01/01/0001, the v2 "Hủy phiếu" action (gated on status 1|2) never showed and cancelled
            // deposits looked live in the cashier's "Còn lại" total.
            Status = d.Status,
            StatusName = DepositStatus.Label(d.Status),
            Notes = d.Notes,
            CreatedAt = d.CreatedAt,
        }).ToList();
    }

    public async Task<bool> CancelDepositAsync(Guid depositId, string reason, Guid userId)
    {
        var deposit = await _context.Deposits.FindAsync(depositId);
        if (deposit == null)
            throw new KeyNotFoundException("Deposit not found");
        if (deposit.Status == DepositStatus.Cancelled)
            throw new InvalidOperationException("Phiếu tạm ứng đã hủy trước đó");
        if (deposit.UsedAmount > 0)
            throw new InvalidOperationException("Cannot cancel deposit that has been partially used");
        // QA0915: a deposit whose money was already refunded (or is being refunded) must not be
        // cancelled — measured: 500.000đ refunded AND the deposit cancelled, cash counted out twice.
        var hasActiveRefund = await _context.Receipts.AnyAsync(r => r.ReceiptType == 3
            && r.OriginalDepositId == depositId
            && !r.IsDeleted
            && r.Status != RefundStatus.Rejected
            && r.Status != RefundStatus.Cancelled);
        if (hasActiveRefund)
            throw new InvalidOperationException("Phiếu tạm ứng đã có phiếu hoàn tiền — hủy/từ chối phiếu hoàn trước");

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
        // N7: VND has no sub-unit — reject fractional amounts (a 0,50đ receipt surfaced on the dashboard).
        if (dto.Amount != Math.Round(dto.Amount, 0))
            throw new InvalidOperationException("Số tiền thanh toán phải là số nguyên đồng (VND không có số lẻ)");
        decimal totalOwed;
        Guid? medicalRecordId = null;
        var patientId = dto.PatientId;
        InvoiceSummary? invoice = null;
        InvoiceLedger.ChargeSet? charges = null;

        // QA-R6: the idempotency window and the "owed" check below were read-then-write — three parallel
        // clicks on the no-invoice path all saw nothing collected yet and wrote three 35.000đ receipts for a
        // 35.000đ debt (same receipt number). Serialize collections per payer until the receipt is committed.
        // (The invoice path is additionally guarded by InvoiceSummary.RowVersion.)
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context,
            $"HIS.Billing.Collect.{(dto.InvoiceId is Guid lockInvoiceId && lockInvoiceId != Guid.Empty ? lockInvoiceId : dto.PatientId):N}",
            "Bệnh nhân này đang được thu tiền ở quầy khác, vui lòng thử lại.");

        if (dto.InvoiceId.HasValue && dto.InvoiceId.Value != Guid.Empty)
        {
            invoice = await _context.InvoiceSummaries
                .FirstOrDefaultAsync(i => i.Id == dto.InvoiceId.Value);

            if (invoice == null)
                throw new InvalidOperationException("Khong tim thay hoa don (invoiceId khong ton tai)");

            // QA-R3: the invoice total used to be whatever dispensing had pushed in (medicines only) — refresh it
            // from the ledger so services, inpatient medicines and bed days are owed and collectable.
            charges = await InvoiceLedger.RefreshAsync(_context, invoice);
            totalOwed = invoice.RemainingAmount;
            medicalRecordId = invoice.MedicalRecordId;

            // FE thu theo hóa đơn KHÔNG gửi patientId (CreatePaymentDto FE không có field này)
            // → trước đây Receipt.PatientId = Guid.Empty → FK_Receipts_Patients nổ 500 (bug thu tiền prod).
            // Resolve từ HSBA của hóa đơn.
            // QA-R4: a patientId of ANOTHER patient was stored as sent — the receipt landed in that patient's
            // history (refundable by them) while paying this record's invoice. The invoice's patient is the payer.
            var invoicePatientId = await _context.MedicalRecords
                .Where(m => m.Id == invoice.MedicalRecordId)
                .Select(m => m.PatientId)
                .FirstOrDefaultAsync();
            if (patientId != Guid.Empty && patientId != invoicePatientId)
                throw new InvalidOperationException("Hóa đơn không thuộc bệnh nhân này (patientId không khớp hồ sơ của hóa đơn)");
            patientId = invoicePatientId;
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

            // QA0915: this path never marks ServiceRequests paid, so without deducting what was already
            // collected the same debt could be collected again after the 30s idempotency window
            // (measured: 200.000đ owed, two 200.000đ receipts accepted). Deduct payments on these
            // records that did NOT go to an invoice (invoice payments are tracked in PaidAmount).
            //
            // Gateway (QR/VNPay/kiosk) receipts are EXCLUDED: they either flag their service lines
            // IsPaid (already out of totalOwed), pay an invoice, or record a deposit — subtracting them
            // again blocked legit collection (QR 500k lab, then 200k X-ray → "còn nợ 0đ").
            var owedRecordIds = unpaidServiceRequests.Select(sr => sr.MedicalRecordId).Distinct().ToList();
            var gatewayReceiptIds = _context.PaymentTransactions
                .Where(t => t.ReceiptId != null)
                .Select(t => t.ReceiptId!.Value);
            var collectedOnRecords = await _context.Receipts
                .Where(r => r.ReceiptType == 2 && r.Status == 1 && !r.IsDeleted
                            && r.MedicalRecordId != null && owedRecordIds.Contains(r.MedicalRecordId.Value)
                            && !gatewayReceiptIds.Contains(r.Id))
                .SumAsync(r => (decimal?)r.FinalAmount) ?? 0m;
            var owedInvoiceIds = _context.InvoiceSummaries
                .Where(i => !i.IsDeleted && owedRecordIds.Contains(i.MedicalRecordId))
                .Select(i => i.Id);
            var paidViaInvoices = await _context.InvoiceSummaries
                .Where(i => !i.IsDeleted && owedRecordIds.Contains(i.MedicalRecordId))
                .SumAsync(i => (decimal?)i.PaidAmount) ?? 0m;
            // Invoice PaidAmount also contains gateway payments (LinkReceiptAsync) whose receipts were
            // excluded above — take them out so both sides count the same receipts.
            var paidViaInvoicesByGateway = await _context.PaymentTransactions
                .Where(t => t.ReceiptId != null && t.InvoiceSummaryId != null
                            && owedInvoiceIds.Contains(t.InvoiceSummaryId.Value))
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var paidViaInvoicesCashier = Math.Max(0, paidViaInvoices - paidViaInvoicesByGateway);
            totalOwed = Math.Max(0, totalOwed - Math.Max(0, collectedOnRecords - paidViaInvoicesCashier));
        }

        // IDEMPOTENCY chống thu trùng — PHẢI check TRƯỚC over-payment: client retry
        // (timeout/503 edge/double-click) sau khi phiếu đầu đã trừ hết nợ thì remaining=0,
        // nếu check over-payment trước sẽ trả 400 thay vì trả lại phiếu đã tạo.
        // Cửa sổ 30s, cùng HSBA + số tiền + thu ngân → trả CHÍNH phiếu cũ, không tạo mới.
        // QA-R3 review S8: same payment method too, and never a deposit-use receipt (PaymentMethod 5) — a cash
        // collection right after "trừ tạm ứng" of the same amount was returned as that deposit receipt (money lost).
        int paymentMethod = 1;
        if (int.TryParse(dto.PaymentMethod, out int pm))
        {
            paymentMethod = pm;
        }
        var dupWindow = DateTime.Now.AddSeconds(-30);
        var duplicate = await _context.Receipts
            .Where(r => r.MedicalRecordId == medicalRecordId
                && r.CashierId == userId
                && r.FinalAmount == dto.Amount
                && r.ReceiptType == 2
                && r.Status == 1
                && r.PaymentMethod == paymentMethod
                && r.OriginalDepositId == null
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

        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            ReceiptCode = await NextStampCodeAsync("PT", c => _context.Receipts.AnyAsync(r => r.ReceiptCode == c)),
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
            // QA-R3: flag the collected lines paid (ServiceRequests.IsPaid gates LIS/PACS; Prescriptions.IsPaid).
            if (charges != null)
                await InvoiceLedger.MarkCoveredAsync(_context, invoice, charges, receipt,
                    dto.ServiceItemIds, dto.MedicineItemIds, dto.IncludeBedCharges, userId.ToString());
        }

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

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

    /// <summary>
    /// QA-R6: receipt numbers are wall-clock stamps (prefix + yyyyMMddHHmmssfff) — parallel requests in the
    /// same millisecond printed the same number on different receipts/deposits. Issue them one at a time
    /// across the billing counters (lock held until the caller's transaction commits) and skip a used stamp.
    /// Call inside a transaction (see <see cref="SqlAppLock.BeginAsync"/>).
    /// </summary>
    private async Task<string> NextStampCodeAsync(string prefix, Func<string, Task<bool>> isTaken)
    {
        await SqlAppLock.AcquireAsync(_context, "HIS.Billing.ReceiptCodes",
            "Quầy thu khác đang cấp số phiếu, vui lòng thử lại.");
        var code = $"{prefix}{DateTime.Now:yyyyMMddHHmmssfff}";
        for (var i = 0; i < 50 && await isTaken(code); i++)
        {
            await Task.Delay(2);
            code = $"{prefix}{DateTime.Now:yyyyMMddHHmmssfff}";
        }
        return code;
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
        // QA0915: refund receipts have their own state machine (RefundStatus, where 2 = Rejected) —
        // cancelling one here silently turned an approved refund into "rejected".
        if (receipt.ReceiptType == 3)
            throw new InvalidOperationException("Phiếu hoàn tiền phải hủy qua chức năng hủy phiếu hoàn");
        if (receipt.Status == 2)
            throw new InvalidOperationException("Phieu thu da huy truoc do");
        // QA0915: a payment that already has a live refund cannot be voided — measured: payment voided,
        // then its 200.000đ refund still approved and paid out (money out twice).
        var hasActiveRefund = await _context.Receipts.AnyAsync(r => r.ReceiptType == 3
            && r.OriginalPaymentId == paymentId
            && !r.IsDeleted
            && r.Status != RefundStatus.Rejected
            && r.Status != RefundStatus.Cancelled);
        if (hasActiveRefund)
            throw new InvalidOperationException("Phiếu thu đã có phiếu hoàn tiền — hủy/từ chối phiếu hoàn trước");

        receipt.Status = 2; // Đã hủy

        // QA0915: a receipt paid from a deposit must give the money back to that deposit
        // (measured: receipt cancelled, deposit stayed consumed). Only receipts linked via
        // OriginalDepositId can be restored; legacy deposit-use receipts carry no link.
        if (receipt.ReceiptType == 2 && receipt.OriginalDepositId.HasValue)
        {
            var deposit = await _context.Deposits.FindAsync(receipt.OriginalDepositId.Value);
            if (deposit != null)
            {
                deposit.UsedAmount = Math.Max(0, deposit.UsedAmount - receipt.FinalAmount);
                deposit.RemainingAmount += receipt.FinalAmount;
                if (deposit.Status == DepositStatus.FullyUsed && deposit.RemainingAmount > 0)
                    deposit.Status = DepositStatus.Confirmed;
                deposit.UpdatedAt = DateTime.Now;
            }
        }
        receipt.Note = $"{receipt.Note} | Hủy: {reason}";

        // Hoàn nợ hóa đơn (2026-06-12): trước đây hủy phiếu KHÔNG trả lại PaidAmount/RemainingAmount
        // → hóa đơn vẫn "đã thu" dù phiếu hủy.
        // QA-R3: every payment receipt on the record is invoice money now (InvoiceLedger), so recompute the
        // invoice without this receipt instead of guessing, and give the lines it paid back to "unpaid".
        if (receipt.ReceiptType == 2)
        {
            await InvoiceLedger.ReverseReceiptItemsAsync(_context, receipt.Id);
            if (receipt.MedicalRecordId.HasValue)
            {
                var invoice = await _context.InvoiceSummaries
                    .Where(i => i.MedicalRecordId == receipt.MedicalRecordId.Value && !i.IsDeleted)
                    .OrderByDescending(i => i.InvoiceDate)
                    .FirstOrDefaultAsync();
                if (invoice != null)
                {
                    await InvoiceLedger.RefreshAsync(_context, invoice, excludeReceiptId: receipt.Id);
                    invoice.UpdatedBy = userId.ToString();
                }
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
                .Where(r => r.PatientId == patientId && !r.IsDeleted)
                .OrderByDescending(r => r.ReceiptDate)
                .ToListAsync();
            var totalDeposit = await _context.Deposits
                .Where(d => d.PatientId == patientId && !d.IsDeleted && d.Status != DepositStatus.Cancelled)
                .SumAsync(d => (decimal?)d.Amount) ?? 0m;

            if (!receipts.Any()) return new PaymentHistoryDto { PaymentId = patientId, PatientId = patientId, TotalDeposit = totalDeposit };

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
                Note = $"Tong {receipts.Count} phieu. So tien: {latest.FinalAmount:N0} VND. {latest.Note}",
                // QA-R3: PatientTimeline reads `payments` (one event per receipt) — it used to get a single record.
                PatientId = patientId,
                TotalPaid = receipts.Where(r => r.ReceiptType == 2 && r.Status == 1).Sum(r => r.FinalAmount),
                TotalDeposit = totalDeposit,
                TotalRefund = receipts.Where(r => r.ReceiptType == 3 && r.Status == RefundStatus.Paid).Sum(r => r.FinalAmount),
                Payments = receipts.Select(r => new PaymentHistoryItemDto
                {
                    Id = r.Id,
                    PaymentCode = r.ReceiptCode,
                    MedicalRecordId = r.MedicalRecordId,
                    MedicalRecordCode = r.MedicalRecord?.MedicalRecordCode,
                    ReceiptType = r.ReceiptType,
                    ReceiptTypeName = r.ReceiptType switch { 1 => "Tạm ứng", 2 => "Thanh toán", 3 => "Hoàn trả", _ => "Khác" },
                    Amount = r.FinalAmount,
                    PaymentMethod = r.PaymentMethod == 5 ? "Tạm ứng" : GetPaymentMethodName(r.PaymentMethod),
                    Status = r.Status,
                    StatusName = r.ReceiptType == 3
                        ? RefundStatus.GetName(r.Status)
                        : (r.Status == 1 ? "Đã thanh toán" : r.Status == 2 ? "Đã hủy" : "Khác"),
                    PaymentDate = r.ReceiptDate,
                    CashierName = r.Cashier?.FullName,
                    Note = r.Note,
                }).ToList(),
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

            // QA-R3: services only (medicines/bed days missing) → same ledger as the invoice and pre-discharge.
            // Refund receipts use RefundStatus: money has left the till only at Paid (4) — see PaidOnRecordAsync.
            var totalAmount = (await InvoiceLedger.LoadAsync(_context, medicalRecordId)).PatientTotal;
            var (collected, refunded) = await InvoiceLedger.PaidOnRecordAsync(_context, medicalRecordId);
            var paidAmount = collected - refunded;

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
