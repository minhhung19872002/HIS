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

    // ====== NangCap17 Module C: Enhanced Pharmacy ======

    // --- Customers ---
    public async Task<List<PharmacyCustomerListDto>> GetCustomersAsync(PharmacyCustomerSearchDto filter)
    {
        try
        {
            var query = _context.PharmacyCustomers.Where(c => !c.IsDeleted).AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(c =>
                    c.FullName.ToLower().Contains(kw) ||
                    c.CustomerCode.ToLower().Contains(kw) ||
                    (c.Phone != null && c.Phone.Contains(kw)) ||
                    (c.CardNumber != null && c.CardNumber.Contains(kw))
                );
            }
            if (filter.CustomerType.HasValue)
                query = query.Where(c => c.CustomerType == filter.CustomerType.Value);

            return await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip(filter.PageIndex * filter.PageSize)
                .Take(filter.PageSize)
                .Select(c => new PharmacyCustomerListDto
                {
                    Id = c.Id,
                    CustomerCode = c.CustomerCode,
                    FullName = c.FullName,
                    Phone = c.Phone,
                    Email = c.Email,
                    CustomerType = c.CustomerType,
                    CardNumber = c.CardNumber,
                    TotalPoints = c.TotalPoints,
                    TotalPurchaseAmount = c.TotalPurchaseAmount,
                    TotalPurchaseCount = c.TotalPurchaseCount,
                    LastPurchaseDate = c.LastPurchaseDate.HasValue ? c.LastPurchaseDate.Value.ToString("yyyy-MM-dd") : null,
                })
                .ToListAsync();
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return new List<PharmacyCustomerListDto>();
        }
    }

    public async Task<PharmacyCustomerDetailDto?> GetCustomerByIdAsync(Guid id)
    {
        try
        {
            var c = await _context.PharmacyCustomers.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
            if (c == null) return null;

            return new PharmacyCustomerDetailDto
            {
                Id = c.Id,
                CustomerCode = c.CustomerCode,
                FullName = c.FullName,
                Phone = c.Phone,
                Email = c.Email,
                Address = c.Address,
                DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
                Gender = c.Gender,
                CustomerType = c.CustomerType,
                CardNumber = c.CardNumber,
                TotalPoints = c.TotalPoints,
                TotalPurchaseAmount = c.TotalPurchaseAmount,
                TotalPurchaseCount = c.TotalPurchaseCount,
                LastPurchaseDate = c.LastPurchaseDate?.ToString("yyyy-MM-dd"),
                Notes = c.Notes,
            };
        }
        catch (SqlException ex) when (ExtendedWorkflowSqlGuard.IsMissingColumnOrTable(ex))
        {
            return null;
        }
    }

    public async Task<PharmacyCustomerDetailDto> SaveCustomerAsync(SavePharmacyCustomerDto dto)
    {
        PharmacyCustomer customer;
        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            customer = await _context.PharmacyCustomers.FindAsync(dto.Id.Value)
                ?? throw new InvalidOperationException("Customer not found");
            customer.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var count = await _context.PharmacyCustomers.CountAsync();
            customer = new PharmacyCustomer
            {
                Id = Guid.NewGuid(),
                CustomerCode = $"KH-{(count + 1):D4}",
                CreatedAt = DateTime.UtcNow,
            };
            _context.PharmacyCustomers.Add(customer);
        }

        customer.FullName = dto.FullName;
        customer.Phone = dto.Phone;
        customer.Email = dto.Email;
        customer.Address = dto.Address;
        customer.DateOfBirth = DateTime.TryParse(dto.DateOfBirth, out var dob) ? dob : null;
        customer.Gender = dto.Gender;
        customer.CustomerType = dto.CustomerType;
        customer.CardNumber = dto.CardNumber;
        customer.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return (await GetCustomerByIdAsync(customer.Id))!;
    }

    public async Task<PharmacyPointTransactionDto> AddPointsAsync(AddPointsDto dto)
    {
        var customer = await _context.PharmacyCustomers.FindAsync(dto.CustomerId)
            ?? throw new InvalidOperationException("Customer not found");

        var tx = new PharmacyPointTransaction
        {
            Id = Guid.NewGuid(),
            CustomerId = dto.CustomerId,
            TransactionType = 1, // Earn
            Points = dto.Points,
            SaleId = dto.SaleId,
            Description = dto.Description ?? "Tich diem mua hang",
            CreatedAt = DateTime.UtcNow,
        };
        _context.PharmacyPointTransactions.Add(tx);

        customer.TotalPoints += dto.Points;
        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PharmacyPointTransactionDto
        {
            Id = tx.Id,
            CustomerId = tx.CustomerId,
            TransactionType = tx.TransactionType,
            Points = tx.Points,
            SaleId = tx.SaleId,
            Description = tx.Description,
            CreatedAt = tx.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
        };
    }

    public async Task<PharmacyPointTransactionDto> RedeemPointsAsync(RedeemPointsDto dto)
    {
        var customer = await _context.PharmacyCustomers.FindAsync(dto.CustomerId)
            ?? throw new InvalidOperationException("Customer not found");

        if (customer.TotalPoints < dto.Points)
            throw new InvalidOperationException("Insufficient points");

        var tx = new PharmacyPointTransaction
        {
            Id = Guid.NewGuid(),
            CustomerId = dto.CustomerId,
            TransactionType = 2, // Redeem
            Points = dto.Points,
            Description = dto.Description ?? "Doi diem",
            CreatedAt = DateTime.UtcNow,
        };
        _context.PharmacyPointTransactions.Add(tx);

        customer.TotalPoints -= dto.Points;
        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new PharmacyPointTransactionDto
        {
            Id = tx.Id,
            CustomerId = tx.CustomerId,
            TransactionType = tx.TransactionType,
            Points = tx.Points,
            Description = tx.Description,
            CreatedAt = tx.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
        };
    }

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
