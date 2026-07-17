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

    public async Task<PharmacyShiftListDto> OpenShiftAsync(OpenShiftDto dto)
    {
        var now = DateTime.UtcNow;
        var dateStr = now.ToString("yyyyMMdd");
        var todayCount = await _context.PharmacyShifts
            .Where(s => s.ShiftCode.StartsWith($"CA-{dateStr}"))
            .CountAsync();

        var shift = new PharmacyShift
        {
            Id = Guid.NewGuid(),
            ShiftCode = $"CA-{dateStr}-{(todayCount + 1)}",
            CashierId = Guid.Empty, // Set from auth context in controller
            StartTime = now,
            OpeningCash = dto.OpeningCash,
            Status = 1, // Open
            Notes = dto.Notes,
            CreatedAt = now,
        };
        _context.PharmacyShifts.Add(shift);
        await _context.SaveChangesAsync();

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

    public async Task<PharmacyShiftListDto> CloseShiftAsync(CloseShiftDto dto)
    {
        var shift = await _context.PharmacyShifts.Include(s => s.Cashier).FirstOrDefaultAsync(s => s.Id == dto.ShiftId && !s.IsDeleted)
            ?? throw new InvalidOperationException("Shift not found");

        if (shift.Status == 2)
            throw new InvalidOperationException("Shift already closed");

        // Calculate totals from sales during this shift
        var salesDuringShift = await _context.RetailSales
            .Where(s => !s.IsDeleted && s.Status == "Completed" && s.CreatedAt >= shift.StartTime && s.CreatedAt <= DateTime.UtcNow)
            .ToListAsync();

        shift.EndTime = DateTime.UtcNow;
        shift.ClosingCash = dto.ClosingCash;
        shift.TotalSales = salesDuringShift.Sum(s => s.PaidAmount);
        shift.TotalRefunds = 0;
        shift.Status = 2; // Closed
        shift.Notes = dto.Notes ?? shift.Notes;
        shift.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

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

    public async Task<PharmacyShiftListDto?> GetCurrentShiftAsync()
    {
        try
        {
            var shift = await _context.PharmacyShifts
                .Include(s => s.Cashier)
                .Where(s => !s.IsDeleted && s.Status == 1)
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
