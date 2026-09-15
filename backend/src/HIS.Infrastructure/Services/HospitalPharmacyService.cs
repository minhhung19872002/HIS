using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalPharmacyService : IHospitalPharmacyService
{
    private readonly HISDbContext _context;

    public HospitalPharmacyService(HISDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Default warehouse a POS sale deducts from when a line carries no WarehouseId: the active
    /// hospital pharmacy first, then the medicine store. Must stay in step with CreateSaleAsync so the
    /// stock shown at the POS is the stock the sale will actually take from.
    /// </summary>
    private Task<Guid?> ResolveDefaultSaleWarehouseIdAsync() =>
        _context.Warehouses
            .Where(w => w.IsActive && !w.IsDeleted
                && HIS.Core.Constants.WarehouseType.Dispensing.Contains(w.WarehouseType))
            .OrderBy(w => w.WarehouseType == HIS.Core.Constants.WarehouseType.Pharmacy ? 0 : 1)
            .ThenBy(w => w.WarehouseName)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync();



}
