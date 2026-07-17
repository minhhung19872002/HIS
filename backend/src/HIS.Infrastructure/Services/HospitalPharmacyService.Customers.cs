using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalPharmacyService
{
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

}
