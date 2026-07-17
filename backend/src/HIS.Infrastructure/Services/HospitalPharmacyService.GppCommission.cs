using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalPharmacyService
{
    // --- GPP Records ---
    public async Task<List<PharmacyGppRecordListDto>> GetGppRecordsAsync(PharmacyGppRecordSearchDto filter)
    {
        try
        {
            var query = _context.PharmacyGppRecords.Include(r => r.RecordedBy).Where(r => !r.IsDeleted).AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(r =>
                    (r.Description != null && r.Description.ToLower().Contains(kw)) ||
                    (r.MedicineName != null && r.MedicineName.ToLower().Contains(kw))
                );
            }
            if (filter.RecordType.HasValue)
                query = query.Where(r => r.RecordType == filter.RecordType.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(r => r.RecordDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(r => r.RecordDate <= to.AddDays(1));

            return await query
                .OrderByDescending(r => r.RecordDate)
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize)
                .Select(r => new PharmacyGppRecordListDto
                {
                    Id = r.Id,
                    RecordType = r.RecordType,
                    RecordDate = r.RecordDate.ToString("yyyy-MM-ddTHH:mm:ss"),
                    Description = r.Description,
                    MedicineName = r.MedicineName,
                    BatchNumber = r.BatchNumber,
                    Temperature = r.Temperature,
                    Humidity = r.Humidity,
                    ActionTaken = r.ActionTaken,
                    RecordedByName = r.RecordedBy != null ? r.RecordedBy.FullName : null,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PharmacyGppRecordListDto>();
        }
    }

    public async Task<PharmacyGppRecordListDto> SaveGppRecordAsync(SavePharmacyGppRecordDto dto)
    {
        PharmacyGppRecord record;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            record = await _context.PharmacyGppRecords.FindAsync(dto.Id.Value)
                ?? throw new InvalidOperationException("GPP record not found");
            record.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            record = new PharmacyGppRecord
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
            };
            _context.PharmacyGppRecords.Add(record);
        }

        record.RecordType = dto.RecordType;
        record.RecordDate = DateTime.TryParse(dto.RecordDate, out var rd) ? rd : DateTime.UtcNow;
        record.Description = dto.Description;
        record.MedicineName = dto.MedicineName;
        record.BatchNumber = dto.BatchNumber;
        record.Temperature = dto.Temperature;
        record.Humidity = dto.Humidity;
        record.ActionTaken = dto.ActionTaken;

        await _context.SaveChangesAsync();

        return new PharmacyGppRecordListDto
        {
            Id = record.Id,
            RecordType = record.RecordType,
            RecordDate = record.RecordDate.ToString("yyyy-MM-ddTHH:mm:ss"),
            Description = record.Description,
            MedicineName = record.MedicineName,
            BatchNumber = record.BatchNumber,
            Temperature = record.Temperature,
            Humidity = record.Humidity,
            ActionTaken = record.ActionTaken,
        };
    }

    // --- Commissions ---
    public async Task<List<PharmacyCommissionListDto>> GetCommissionsAsync(PharmacyCommissionSearchDto filter)
    {
        try
        {
            var query = _context.PharmacyCommissions.Where(c => !c.IsDeleted).AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(c =>
                    (c.DoctorName != null && c.DoctorName.ToLower().Contains(kw)) ||
                    (c.MedicineName != null && c.MedicineName.ToLower().Contains(kw))
                );
            }
            if (filter.Status.HasValue)
                query = query.Where(c => c.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(c => c.SaleDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(c => c.SaleDate <= to.AddDays(1));

            return await query
                .OrderByDescending(c => c.SaleDate)
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize)
                .Select(c => new PharmacyCommissionListDto
                {
                    Id = c.Id,
                    DoctorName = c.DoctorName,
                    SaleDate = c.SaleDate.ToString("yyyy-MM-dd"),
                    MedicineName = c.MedicineName,
                    Quantity = c.Quantity,
                    SaleAmount = c.SaleAmount,
                    CommissionRate = c.CommissionRate,
                    CommissionAmount = c.CommissionAmount,
                    Status = c.Status,
                    PaidDate = c.PaidDate.HasValue ? c.PaidDate.Value.ToString("yyyy-MM-dd") : null,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PharmacyCommissionListDto>();
        }
    }

    public async Task<PharmacyCommissionListDto> SaveCommissionAsync(SavePharmacyCommissionDto dto)
    {
        PharmacyCommission commission;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            commission = await _context.PharmacyCommissions.FindAsync(dto.Id.Value)
                ?? throw new InvalidOperationException("Commission not found");
            commission.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            commission = new PharmacyCommission
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
            };
            _context.PharmacyCommissions.Add(commission);
        }

        commission.DoctorId = dto.DoctorId;
        commission.DoctorName = dto.DoctorName;
        commission.SaleId = dto.SaleId;
        commission.SaleDate = DateTime.TryParse(dto.SaleDate, out var sd) ? sd : DateTime.UtcNow;
        commission.MedicineName = dto.MedicineName;
        commission.Quantity = dto.Quantity;
        commission.SaleAmount = dto.SaleAmount;
        commission.CommissionRate = dto.CommissionRate;
        commission.CommissionAmount = dto.SaleAmount * dto.CommissionRate / 100;

        await _context.SaveChangesAsync();

        return new PharmacyCommissionListDto
        {
            Id = commission.Id,
            DoctorName = commission.DoctorName,
            SaleDate = commission.SaleDate.ToString("yyyy-MM-dd"),
            MedicineName = commission.MedicineName,
            Quantity = commission.Quantity,
            SaleAmount = commission.SaleAmount,
            CommissionRate = commission.CommissionRate,
            CommissionAmount = commission.CommissionAmount,
            Status = commission.Status,
        };
    }

    public async Task<bool> PayCommissionsAsync(PayCommissionDto dto)
    {
        var commissions = await _context.PharmacyCommissions
            .Where(c => dto.CommissionIds.Contains(c.Id) && !c.IsDeleted && c.Status == 1)
            .ToListAsync();

        if (!commissions.Any()) return false;

        foreach (var c in commissions)
        {
            c.Status = 2; // Paid
            c.PaidDate = DateTime.UtcNow;
            c.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    // --- Enhanced Dashboard ---
    public async Task<PharmacyEnhancedDashboardDto> GetEnhancedDashboardAsync()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var todaySales = await _context.RetailSales
                .Where(s => !s.IsDeleted && s.Status == "Completed" && s.CreatedAt >= today)
                .ToListAsync();

            var lowStock = await _context.InventoryItems
                .Where(i => !i.IsDeleted && i.Quantity > 0 && i.Quantity <= 10)
                .CountAsync();

            int totalCustomers = 0, vipCustomers = 0, openShifts = 0, todayGpp = 0;
            decimal pendingCommission = 0;

            try
            {
                totalCustomers = await _context.PharmacyCustomers.CountAsync(c => !c.IsDeleted);
                vipCustomers = await _context.PharmacyCustomers.CountAsync(c => !c.IsDeleted && c.CustomerType == 2);
            }
            catch (SqlException) { /* table may not exist yet */ }

            try
            {
                openShifts = await _context.PharmacyShifts.CountAsync(s => !s.IsDeleted && s.Status == 1);
            }
            catch (SqlException) { /* table may not exist yet */ }

            try
            {
                todayGpp = await _context.PharmacyGppRecords.CountAsync(r => !r.IsDeleted && r.RecordDate >= today);
            }
            catch (SqlException) { /* table may not exist yet */ }

            try
            {
                pendingCommission = await _context.PharmacyCommissions
                    .Where(c => !c.IsDeleted && c.Status == 1)
                    .SumAsync(c => c.CommissionAmount);
            }
            catch (SqlException) { /* table may not exist yet */ }

            return new PharmacyEnhancedDashboardDto
            {
                TodayRevenue = todaySales.Sum(s => s.PaidAmount),
                TodaySaleCount = todaySales.Count,
                LowStockCount = lowStock,
                TotalCustomers = totalCustomers,
                VipCustomers = vipCustomers,
                OpenShiftCount = openShifts,
                TodayGppRecords = todayGpp,
                PendingCommission = pendingCommission,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new PharmacyEnhancedDashboardDto();
        }
    }

}
