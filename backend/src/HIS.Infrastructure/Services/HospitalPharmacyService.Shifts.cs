using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalPharmacyService
{
    // --- Shifts ---
    public async Task<List<PharmacyShiftListDto>> GetShiftsAsync(PharmacyShiftSearchDto filter)
    {
        try
        {
            var query = _context.PharmacyShifts.Include(s => s.Cashier).Where(s => !s.IsDeleted).AsQueryable();

            if (filter.CashierId.HasValue)
                query = query.Where(s => s.CashierId == filter.CashierId.Value);
            if (filter.Status.HasValue)
                query = query.Where(s => s.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(s => s.StartTime >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(s => s.StartTime <= to.AddDays(1));

            return await query
                .OrderByDescending(s => s.StartTime)
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize)
                .Select(s => new PharmacyShiftListDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    CashierId = s.CashierId,
                    CashierName = s.Cashier != null ? s.Cashier.FullName : null,
                    StartTime = s.StartTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                    EndTime = s.EndTime.HasValue ? s.EndTime.Value.ToString("yyyy-MM-ddTHH:mm:ss") : null,
                    OpeningCash = s.OpeningCash,
                    ClosingCash = s.ClosingCash,
                    TotalSales = s.TotalSales,
                    TotalRefunds = s.TotalRefunds,
                    Status = s.Status,
                    Notes = s.Notes,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PharmacyShiftListDto>();
        }
    }

    public async Task<PharmacyShiftListDto> OpenShiftAsync(OpenShiftDto dto, Guid cashierId)
    {
        if (dto.OpeningCash < 0)
            throw new InvalidOperationException("Tiền đầu ca không được âm.");
        // QA-R6: the open-shift check and the daily count were read-then-write — three parallel "Mở ca" clicks
        // opened three shifts for one cashier, all numbered CA-yyyyMMdd-1. Serialize shift opening.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        await SqlAppLock.AcquireAsync(_context, "HIS.Pharmacy.ShiftOpen",
            "Đang có thao tác mở ca khác, vui lòng thử lại.");
        // QA-R4: one open shift per cashier — a second "Mở ca" while the first is still open would make
        // CloseShift's sales window (StartTime → now) overlap and the cash reconcile meaningless.
        var stillOpen = await _context.PharmacyShifts
            .Where(s => !s.IsDeleted && s.CashierId == cashierId && s.Status == 1)
            .Select(s => s.ShiftCode)
            .FirstOrDefaultAsync();
        if (stillOpen != null)
            throw new InvalidOperationException($"Ca {stillOpen} của bạn đang mở — đóng ca trước khi mở ca mới.");

        // QA-R4 time: StartTime/EndTime are business timestamps → VN wall clock (VnTime.NowVn); the v2
        // page renders them as local, so the old UtcNow showed "Mở ca 02:05" for a shift opened 09:05.
        var now = HIS.Core.Common.VnTime.NowVn;
        var dateStr = now.ToString("yyyyMMdd");
        var todayCount = await _context.PharmacyShifts
            .Where(s => s.ShiftCode.StartsWith($"CA-{dateStr}"))
            .CountAsync();

        var shift = new PharmacyShift
        {
            Id = Guid.NewGuid(),
            ShiftCode = $"CA-{dateStr}-{(todayCount + 1)}",
            CashierId = cashierId, // the signed-in cashier (controller reads the token)
            StartTime = now,
            OpeningCash = dto.OpeningCash,
            Status = 1, // Open
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        _context.PharmacyShifts.Add(shift);
        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return new PharmacyShiftListDto
        {
            Id = shift.Id,
            ShiftCode = shift.ShiftCode,
            CashierId = shift.CashierId,
            StartTime = shift.StartTime.ToString("yyyy-MM-ddTHH:mm:ss"),
            OpeningCash = shift.OpeningCash,
            Status = shift.Status,
            Notes = shift.Notes,
        };
    }

    public async Task<PharmacyShiftListDto> CloseShiftAsync(CloseShiftDto dto, Guid? callerId = null, bool callerIsAdmin = true)
    {
        var shift = await _context.PharmacyShifts.Include(s => s.Cashier).FirstOrDefaultAsync(s => s.Id == dto.ShiftId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Không tìm thấy ca làm việc.");
        // QA-R11: any signed-in user could close another cashier's shift (and "current shift" showed it to them) —
        // the till reconcile of cashier A then carried cashier B's counted cash.
        if (!callerIsAdmin && callerId.HasValue && shift.CashierId != callerId.Value)
            throw new UnauthorizedAccessException("Chỉ thu ngân của ca (hoặc quản trị) được đóng ca này.");

        if (shift.Status == 2)
            throw new InvalidOperationException("Shift already closed");
        if (dto.ClosingCash < 0)
            throw new InvalidOperationException("Tiền cuối ca không được âm.");

        // QA-R6: a double "Đóng ca" passed the check above twice; claim the close atomically.
        await using var tx = await SqlAppLock.BeginAsync(_context);
        var claimed = await _context.PharmacyShifts
            .Where(s => s.Id == shift.Id && s.Status != 2)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, 2));
        if (claimed == 0)
            throw new InvalidOperationException("Shift already closed");

        // Calculate totals from sales during this shift.
        // QA-R4: was every cashier's sales (the reconcile of one till included the other counters) and
        // TotalRefunds was hard-coded 0 — a sale cancelled during the shift still counted as revenue.
        // QA-R4 time: RetailSales.CreatedAt/CancelledAt are UTC, shift.StartTime is VN local → UTC bounds.
        var closeAt = DateTime.UtcNow;
        var startUtc = ReportPeriod.ToUtc(shift.StartTime);
        var salesDuringShift = await _context.RetailSales
            .Where(s => !s.IsDeleted && s.CashierId == shift.CashierId
                && s.CreatedAt >= startUtc && s.CreatedAt <= closeAt)
            .ToListAsync();
        var refundsDuringShift = await _context.RetailSales
            .Where(s => !s.IsDeleted && s.CashierId == shift.CashierId && s.Status == "Cancelled"
                && s.CancelledAt != null && s.CancelledAt >= startUtc && s.CancelledAt <= closeAt)
            .SumAsync(s => (decimal?)s.PaidAmount) ?? 0;

        shift.EndTime = HIS.Core.Common.VnTime.NowVn;
        shift.ClosingCash = dto.ClosingCash;
        shift.TotalSales = salesDuringShift.Where(s => s.Status == "Completed").Sum(s => s.PaidAmount);
        shift.TotalRefunds = refundsDuringShift;
        shift.Status = 2; // Closed
        shift.Notes = dto.Notes ?? shift.Notes;
        shift.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        return new PharmacyShiftListDto
        {
            Id = shift.Id,
            ShiftCode = shift.ShiftCode,
            CashierId = shift.CashierId,
            CashierName = shift.Cashier?.FullName,
            StartTime = shift.StartTime.ToString("yyyy-MM-ddTHH:mm:ss"),
            EndTime = shift.EndTime?.ToString("yyyy-MM-ddTHH:mm:ss"),
            OpeningCash = shift.OpeningCash,
            ClosingCash = shift.ClosingCash,
            TotalSales = shift.TotalSales,
            TotalRefunds = shift.TotalRefunds,
            Status = shift.Status,
            Notes = shift.Notes,
        };
    }

    public async Task<PharmacyShiftListDto?> GetCurrentShiftAsync(Guid? cashierId = null)
    {
        try
        {
            // QA-R11: returned the newest open shift of ANY cashier — the POS showed a colleague's shift as "Ca hiện tại"
            // and its "Đóng ca" closed that colleague's till. Scope to the signed-in cashier (one open shift per cashier).
            var shift = await _context.PharmacyShifts
                .Include(s => s.Cashier)
                .Where(s => !s.IsDeleted && s.Status == 1 && (cashierId == null || s.CashierId == cashierId.Value))
                .OrderByDescending(s => s.StartTime)
                .FirstOrDefaultAsync();

            if (shift == null) return null;

            return new PharmacyShiftListDto
            {
                Id = shift.Id,
                ShiftCode = shift.ShiftCode,
                CashierId = shift.CashierId,
                CashierName = shift.Cashier?.FullName,
                StartTime = shift.StartTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                OpeningCash = shift.OpeningCash,
                TotalSales = shift.TotalSales,
                TotalRefunds = shift.TotalRefunds,
                Status = shift.Status,
                Notes = shift.Notes,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

}
