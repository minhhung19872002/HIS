using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.DTOs.Warehouse;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Core.Interfaces;
using HIS.Infrastructure.Data;
using static HIS.Infrastructure.Services.PdfTemplateHelper;

namespace HIS.Infrastructure.Services;

/// <summary>
/// Implementation of IWarehouseCompleteService — handles all warehouse/pharmacy workflows.
///
/// K10 phien (2026-05-30): converted to partial class. ZERO runtime change — partial class.
/// </summary>
public partial class WarehouseCompleteService : IWarehouseCompleteService
{
    private readonly HISDbContext _context;
    private readonly IRepository<Warehouse> _warehouseRepo;
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly IRepository<Prescription> _prescriptionRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHospitalPharmacyService _hospitalPharmacy;

    public WarehouseCompleteService(
        HISDbContext context,
        IRepository<Warehouse> warehouseRepo,
        IRepository<InventoryItem> inventoryRepo,
        IRepository<Prescription> prescriptionRepo,
        IUnitOfWork unitOfWork,
        // #218/T3: hai cửa bán thuốc của service này ủy thác cho bản đúng ở đây thay vì
        // viết bản thứ ba. HospitalPharmacyService chỉ phụ thuộc HISDbContext nên không có vòng.
        IHospitalPharmacyService hospitalPharmacy)
    {
        _hospitalPharmacy = hospitalPharmacy;
        _context = context;
        _warehouseRepo = warehouseRepo;
        _inventoryRepo = inventoryRepo;
        _prescriptionRepo = prescriptionRepo;
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// QA-R7: voucher numbers were second stamps (prefix + yyyyMMddHHmmss) — two slips created in the same
    /// second printed the same number. Same scheme as BillingCompleteService.NextStampCodeAsync: millisecond
    /// stamp, numbers issued one at a time (the lock lives until the caller's transaction commits — open one
    /// with <see cref="SqlAppLock.BeginAsync"/>), and a stamp already used is skipped.
    /// </summary>
    private async Task<string> NextVoucherCodeAsync(string prefix, Func<string, Task<bool>> isTaken)
    {
        await SqlAppLock.AcquireAsync(_context, "HIS.Warehouse.VoucherCodes",
            "Kho khác đang cấp số phiếu, vui lòng thử lại.");
        var code = $"{prefix}{DateTime.Now:yyyyMMddHHmmssfff}";
        for (var i = 0; i < 50 && await isTaken(code); i++)
        {
            await Task.Delay(2);
            code = $"{prefix}{DateTime.Now:yyyyMMddHHmmssfff}";
        }
        return code;
    }

    private Task<string> NextExportCodeAsync(string prefix)
        => NextVoucherCodeAsync(prefix, c => _context.ExportReceipts.IgnoreQueryFilters().AnyAsync(r => r.ReceiptCode == c));

    private Task<string> NextImportCodeAsync(string prefix)
        => NextVoucherCodeAsync(prefix, c => _context.ImportReceipts.IgnoreQueryFilters().AnyAsync(r => r.ReceiptCode == c));

    private Task<string> NextProcurementCodeAsync()
        => NextVoucherCodeAsync("DT", c => _context.ProcurementRequests.IgnoreQueryFilters().AnyAsync(r => r.RequestCode == c));




}
