using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class HospitalPharmacyService : IHospitalPharmacyService
{
    private readonly HISDbContext _context;

    public HospitalPharmacyService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<RetailSaleListDto>> SearchSalesAsync(RetailSaleSearchDto filter)
    {
        try
        {
            var query = _context.RetailSales
                .Include(s => s.Patient)
                .Include(s => s.Cashier)
                .Include(s => s.Items)
                .Where(s => !s.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s =>
                    s.SaleCode.ToLower().Contains(kw) ||
                    (s.PatientName != null && s.PatientName.ToLower().Contains(kw)) ||
                    (s.PhoneNumber != null && s.PhoneNumber.Contains(kw)) ||
                    (s.Patient != null && (s.Patient.FullName.ToLower().Contains(kw) || s.Patient.PatientCode.ToLower().Contains(kw)))
                );
            }
            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(s => s.Status == filter.Status);
            if (!string.IsNullOrEmpty(filter.PaymentMethod))
                query = query.Where(s => s.PaymentMethod == filter.PaymentMethod);
            if (filter.CashierId.HasValue)
                query = query.Where(s => s.CashierId == filter.CashierId.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(s => s.CreatedAt >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(s => s.CreatedAt <= to.AddDays(1));

            var skip = filter.PageIndex * filter.PageSize;

            return await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip(skip)
                .Take(filter.PageSize)
                .Select(s => new RetailSaleListDto
                {
                    Id = s.Id,
                    SaleCode = s.SaleCode,
                    PatientName = s.Patient != null ? s.Patient.FullName : s.PatientName,
                    PatientCode = s.Patient != null ? s.Patient.PatientCode : null,
                    PhoneNumber = s.PhoneNumber,
                    TotalAmount = s.TotalAmount,
                    DiscountAmount = s.DiscountAmount,
                    PaidAmount = s.PaidAmount,
                    PaymentMethod = s.PaymentMethod,
                    Status = s.Status,
                    CashierName = s.Cashier != null ? s.Cashier.FullName : null,
                    ItemCount = s.Items.Count(i => !i.IsDeleted),
                    CreatedAt = s.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<RetailSaleListDto>();
        }
    }

    public async Task<RetailSaleDetailDto?> GetSaleByIdAsync(Guid id)
    {
        try
        {
            var s = await _context.RetailSales
                .Include(s => s.Patient)
                .Include(s => s.Cashier)
                .Include(s => s.Items.Where(i => !i.IsDeleted))
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

            if (s == null) return null;

            return new RetailSaleDetailDto
            {
                Id = s.Id,
                SaleCode = s.SaleCode,
                PatientId = s.PatientId,
                PatientName = s.Patient?.FullName ?? s.PatientName,
                PatientCode = s.Patient?.PatientCode,
                PhoneNumber = s.PhoneNumber,
                TotalAmount = s.TotalAmount,
                DiscountAmount = s.DiscountAmount,
                PaidAmount = s.PaidAmount,
                PaymentMethod = s.PaymentMethod,
                PaymentReference = s.PaymentReference,
                Status = s.Status,
                CashierId = s.CashierId,
                CashierName = s.Cashier?.FullName,
                Notes = s.Notes,
                CancellationReason = s.CancellationReason,
                CancelledAt = s.CancelledAt?.ToString("yyyy-MM-ddTHH:mm:ss"),
                ItemCount = s.Items.Count,
                CreatedAt = s.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                Items = s.Items.Select(i => new RetailSaleItemDto
                {
                    Id = i.Id,
                    MedicineId = i.MedicineId,
                    MedicineName = i.MedicineName,
                    Unit = i.Unit,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Amount = i.Amount,
                    DiscountAmount = i.DiscountAmount,
                    BatchNumber = i.BatchNumber,
                    ExpiryDate = i.ExpiryDate?.ToString("yyyy-MM-dd"),
                }).ToList(),
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<RetailSaleDetailDto> CreateSaleAsync(CreateRetailSaleDto dto)
    {
        // Auto-generate sale code: NT-YYYYMMDD-NNNN
        var today = DateTime.UtcNow;
        var dateStr = today.ToString("yyyyMMdd");
        var todayCount = await _context.RetailSales
            .Where(s => s.SaleCode.StartsWith($"NT-{dateStr}"))
            .CountAsync();
        var saleCode = $"NT-{dateStr}-{(todayCount + 1):D4}";

        var totalAmount = dto.Items.Sum(i => i.Quantity * i.UnitPrice - i.DiscountAmount);
        var paidAmount = totalAmount - dto.DiscountAmount;

        var sale = new RetailSale
        {
            Id = Guid.NewGuid(),
            SaleCode = saleCode,
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PhoneNumber = dto.PhoneNumber,
            TotalAmount = totalAmount,
            DiscountAmount = dto.DiscountAmount,
            PaidAmount = paidAmount > 0 ? paidAmount : 0,
            PaymentMethod = dto.PaymentMethod,
            PaymentReference = dto.PaymentReference,
            Status = "Completed",
            CashierId = Guid.Empty, // Set from auth context in controller if needed
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.RetailSales.Add(sale);

        foreach (var item in dto.Items)
        {
            var saleItem = new RetailSaleItem
            {
                Id = Guid.NewGuid(),
                RetailSaleId = sale.Id,
                MedicineId = item.MedicineId,
                MedicineName = item.MedicineName,
                Unit = item.Unit,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = item.Quantity * item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                BatchNumber = item.BatchNumber,
                ExpiryDate = DateTime.TryParse(item.ExpiryDate, out var ed) ? ed : null,
                WarehouseId = item.WarehouseId,
                CreatedAt = DateTime.UtcNow,
            };
            _context.RetailSaleItems.Add(saleItem);
        }

        await _context.SaveChangesAsync();
        return (await GetSaleByIdAsync(sale.Id))!;
    }

    public async Task<bool> CancelSaleAsync(Guid id, string reason)
    {
        var sale = await _context.RetailSales.FindAsync(id);
        if (sale == null || sale.IsDeleted || sale.Status == "Cancelled") return false;

        sale.Status = "Cancelled";
        sale.CancelledAt = DateTime.UtcNow;
        sale.CancellationReason = reason;
        sale.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<RetailSaleStatsDto> GetSalesStatisticsAsync()
    {
        try
        {
            var sales = await _context.RetailSales
                .Where(s => !s.IsDeleted)
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            var todaySales = sales.Where(s => s.CreatedAt.Date == today && s.Status == "Completed").ToList();

            var paymentBreakdown = sales
                .Where(s => s.Status == "Completed")
                .GroupBy(s => s.PaymentMethod)
                .Select(g => new RetailSalePaymentBreakdownDto
                {
                    PaymentMethod = g.Key,
                    Count = g.Count(),
                    Amount = g.Sum(s => s.PaidAmount),
                })
                .ToList();

            return new RetailSaleStatsDto
            {
                TotalSales = sales.Count,
                CompletedSales = sales.Count(s => s.Status == "Completed"),
                CancelledSales = sales.Count(s => s.Status == "Cancelled"),
                TotalRevenue = sales.Where(s => s.Status == "Completed").Sum(s => s.PaidAmount),
                TotalDiscount = sales.Where(s => s.Status == "Completed").Sum(s => s.DiscountAmount),
                TodayRevenue = todaySales.Sum(s => s.PaidAmount),
                TodaySalesCount = todaySales.Count,
                PaymentBreakdown = paymentBreakdown,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new RetailSaleStatsDto();
        }
    }

    public async Task<List<MedicineForSaleDto>> SearchMedicineForSaleAsync(string? keyword)
    {
        try
        {
            var query = _context.Medicines
                .Where(m => !m.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.ToLower();
                query = query.Where(m =>
                    m.MedicineName.ToLower().Contains(kw) ||
                    m.MedicineCode.ToLower().Contains(kw) ||
                    (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(kw))
                );
            }

            // Join with inventory to get stock
            var medicines = await query
                .Take(50)
                .Select(m => new MedicineForSaleDto
                {
                    Id = m.Id,
                    MedicineCode = m.MedicineCode,
                    MedicineName = m.MedicineName,
                    ActiveIngredient = m.ActiveIngredient,
                    Unit = m.Unit,
                    RetailPrice = m.UnitPrice,
                })
                .ToListAsync();

            // Get stock for each medicine
            foreach (var med in medicines)
            {
                var stock = await _context.InventoryItems
                    .Where(i => i.MedicineId == med.Id && !i.IsDeleted && i.Quantity > 0)
                    .OrderBy(i => i.ExpiryDate)
                    .FirstOrDefaultAsync();

                if (stock != null)
                {
                    med.AvailableStock = stock.Quantity;
                    med.BatchNumber = stock.BatchNumber;
                    med.ExpiryDate = stock.ExpiryDate?.ToString("yyyy-MM-dd");
                }
            }

            return medicines;
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<MedicineForSaleDto>();
        }
    }
}
