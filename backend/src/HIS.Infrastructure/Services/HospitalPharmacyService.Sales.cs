using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public partial class HospitalPharmacyService
{
    public async Task<List<RetailSaleListDto>> SearchSalesAsync(RetailSaleSearchDto filter)
    {
        try
        {
            var query = _context.RetailSales
                .Where(s => !s.IsDeleted)
                .AsNoTracking()
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

            // Patient.FullName and RetailSale.PatientName use different SQL Server
            // collations in production. Choosing between them inside the SQL projection
            // generates a CASE expression and fails with error 468. Fetch both columns
            // independently, then apply the fallback after materialization.
            var rows = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip(skip)
                .Take(filter.PageSize)
                .Select(s => new
                {
                    s.Id,
                    s.SaleCode,
                    LinkedPatientName = s.Patient != null ? s.Patient.FullName : null,
                    FallbackPatientName = s.PatientName,
                    PatientCode = s.Patient != null ? s.Patient.PatientCode : null,
                    s.PhoneNumber,
                    s.TotalAmount,
                    s.DiscountAmount,
                    s.PaidAmount,
                    s.PaymentMethod,
                    s.Status,
                    CashierName = s.Cashier != null ? s.Cashier.FullName : null,
                    ItemCount = s.Items.Count(i => !i.IsDeleted),
                    s.CreatedAt,
                })
                .ToListAsync();

            return rows.Select(s => new RetailSaleListDto
            {
                Id = s.Id,
                SaleCode = s.SaleCode,
                PatientName = s.LinkedPatientName ?? s.FallbackPatientName,
                PatientCode = s.PatientCode,
                PhoneNumber = s.PhoneNumber,
                TotalAmount = s.TotalAmount,
                DiscountAmount = s.DiscountAmount,
                PaidAmount = s.PaidAmount,
                PaymentMethod = s.PaymentMethod,
                Status = s.Status,
                CashierName = s.CashierName,
                ItemCount = s.ItemCount,
                CreatedAt = s.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
            }).ToList();
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

        // #218/T3: bán theo đơn thì chặn bán trùng — bài học §15 (phát một đơn hai lần thì
        // trừ kho hai lần). Cột `RetailSale.PrescriptionId` vốn đã có, chỉ chưa ai dùng.
        if (dto.PrescriptionId.HasValue && dto.PrescriptionId.Value != Guid.Empty)
        {
            var daBan = await _context.RetailSales.AnyAsync(x =>
                x.PrescriptionId == dto.PrescriptionId.Value && x.Status != "Cancelled" && !x.IsDeleted);
            if (daBan)
                throw new InvalidOperationException(
                    "Đơn thuốc này đã được bán trước đó. Muốn bán lại thì phải hủy phiếu bán cũ.");

            // QA0915 (review M8): quầy cấp phát (phiếu xuất) và nhà thuốc (phiếu bán) là hai đường trừ kho
            // cho CÙNG một đơn — phát tại quầy rồi "bán theo đơn" ở POS là trừ kho hai lần. Chặn chéo:
            // đơn đã phát / còn phiếu xuất chưa hủy thì không bán theo đơn nữa.
            var rxId = dto.PrescriptionId.Value;
            var daPhat = await _context.Prescriptions.AnyAsync(p => p.Id == rxId && p.IsDispensed)
                || await _context.ExportReceipts.AnyAsync(e => e.PrescriptionId == rxId && e.Status != 2 && !e.IsDeleted);
            if (daPhat)
                throw new InvalidOperationException(
                    "Đơn thuốc này đã được cấp phát tại quầy (có phiếu xuất kho) — không bán theo đơn được. "
                    + "Muốn chuyển sang bán thì hủy phát trước.");
        }

        // QA0915: qty âm (−10) từng CỘNG tồn kho qua phiếu bán; qty 0 tạo dòng rỗng.
        if (dto.Items.Any(i => i.Quantity <= 0))
            throw new InvalidOperationException("Số lượng bán mỗi dòng phải lớn hơn 0.");
        if (dto.Items.Any(i => i.UnitPrice < 0 || i.DiscountAmount < 0) || dto.DiscountAmount < 0)
            throw new InvalidOperationException("Đơn giá / chiết khấu không được âm.");

        // QA0915: dòng không có kho thì trước đây KHÔNG trừ tồn (bán xong tồn nguyên) — mà màn POS v2 và
        // bán theo đơn (dòng đơn chưa gán kho) đều không gửi kho. Rơi về nhà thuốc bệnh viện đang hoạt động,
        // rồi tới kho thuốc; không có kho nào thì từ chối bán thay vì bán "chui" ngoài sổ kho.
        Guid? defaultWarehouseId = null;
        if (dto.Items.Any(i => !i.WarehouseId.HasValue || i.WarehouseId.Value == Guid.Empty))
        {
            defaultWarehouseId = await _context.Warehouses
                .Where(w => w.IsActive && !w.IsDeleted
                    && HIS.Core.Constants.WarehouseType.Dispensing.Contains(w.WarehouseType))
                .OrderBy(w => w.WarehouseType == HIS.Core.Constants.WarehouseType.Pharmacy ? 0 : 1)
                .ThenBy(w => w.WarehouseName)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException(
                    "Không có nhà thuốc / kho thuốc nào đang hoạt động để trừ tồn — cấu hình kho trước khi bán.");
        }

        var totalAmount = dto.Items.Sum(i => i.Quantity * i.UnitPrice - i.DiscountAmount);
        var paidAmount = totalAmount - dto.DiscountAmount;

        var sale = new RetailSale
        {
            Id = Guid.NewGuid(),
            SaleCode = saleCode,
            PrescriptionId = dto.PrescriptionId,
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PhoneNumber = dto.PhoneNumber,
            TotalAmount = totalAmount,
            DiscountAmount = dto.DiscountAmount,
            PaidAmount = paidAmount > 0 ? paidAmount : 0,
            PaymentMethod = dto.PaymentMethod,
            PaymentReference = dto.PaymentReference,
            Status = "Completed",
            CashierId = dto.CashierId ?? Guid.Empty, // #218/T3: nhận từ người gọi, xem chú thích trên DTO
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _context.RetailSales.Add(sale);

            foreach (var item in dto.Items)
            {
                // Trừ tồn kho FEFO (audit luồng nghiệp vụ 2026-06-06 #6). QA0915: bản cũ tìm MỘT lô đủ cả
                // dòng bằng điều kiện SQL trên số tồn DB → hai dòng cùng thuốc đều "đủ" theo tồn trước khi
                // trừ (đo được lô xuống −10), không lọc lô khóa/xóa, và thiếu một lô đủ thì từ chối dù tổng
                // các lô còn hạn đủ. Nay gộp nhiều lô còn hạn, tính tồn khả dụng trên giá trị trong bộ nhớ,
                // mỗi lô một dòng bán (để hủy phiếu hoàn đúng lô).
                var warehouseId = item.WarehouseId.HasValue && item.WarehouseId.Value != Guid.Empty
                    ? item.WarehouseId.Value
                    : defaultWarehouseId!.Value;
                var lots = (await _context.InventoryItems
                        .Where(i => i.WarehouseId == warehouseId
                            && i.MedicineId == item.MedicineId
                            && i.ExpiryDate >= DateTime.Today
                            && !i.IsLocked && !i.IsDeleted)
                        .ToListAsync())
                    .Where(i => i.Quantity - i.ReservedQuantity > 0)
                    .OrderBy(i => i.ExpiryDate).ThenBy(i => i.Id)
                    .ToList();
                var available = lots.Sum(l => l.Quantity - l.ReservedQuantity);
                if (available < item.Quantity)
                    throw new InvalidOperationException(
                        $"Không đủ tồn kho cho thuốc {item.MedicineName} (cần {item.Quantity:0.##}, còn {available:0.##})");

                var remaining = item.Quantity;
                var discountLeft = item.DiscountAmount;
                foreach (var stock in lots)
                {
                    if (remaining <= 0) break;
                    var take = Math.Min(stock.Quantity - stock.ReservedQuantity, remaining);
                    stock.Quantity -= take;
                    remaining -= take;
                    // Line discount stays on the first split line so the sale total is unchanged.
                    var lineDiscount = discountLeft;
                    discountLeft = 0;

                    _context.RetailSaleItems.Add(new RetailSaleItem
                    {
                        Id = Guid.NewGuid(),
                        RetailSaleId = sale.Id,
                        MedicineId = item.MedicineId,
                        MedicineName = item.MedicineName,
                        Unit = item.Unit,
                        Quantity = take,
                        UnitPrice = item.UnitPrice,
                        Amount = take * item.UnitPrice,
                        DiscountAmount = lineDiscount,
                        BatchNumber = stock.BatchNumber,
                        ExpiryDate = stock.ExpiryDate,
                        WarehouseId = warehouseId,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            // #218/T3: `GetSaleByIdAsync` có `.Include(s => s.Cashier)`; nếu phiếu không gắn được
            // người thu tiền thì nó trả null và cả hàm này trả null cho người gọi dù ĐÃ ghi
            // thành công — dấu `!` cũ chỉ tắt cảnh báo chứ không đổi sự thật. Đo được ở
            // evidence/cross/t3/t3_pharmacy_sale.json: bán thành công nhưng API trả 500.
            // Nay dựng DTO từ chính đối tượng vừa ghi khi đọc lại không ra.
            return await GetSaleByIdAsync(sale.Id) ?? new RetailSaleDetailDto
            {
                Id = sale.Id,
                SaleCode = sale.SaleCode,
                PatientId = sale.PatientId,
                PatientName = sale.PatientName,
                PhoneNumber = sale.PhoneNumber,
                TotalAmount = sale.TotalAmount,
                DiscountAmount = sale.DiscountAmount,
                PaidAmount = sale.PaidAmount,
                PaymentMethod = sale.PaymentMethod,
                Status = sale.Status,
                CashierId = sale.CashierId,
                Notes = sale.Notes,
                Items = dto.Items.Select(i => new RetailSaleItemDto
                {
                    MedicineId = i.MedicineId,
                    MedicineName = i.MedicineName,
                    Unit = i.Unit,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Amount = i.Quantity * i.UnitPrice,
                }).ToList(),
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> CancelSaleAsync(Guid id, string reason)
    {
        var sale = await _context.RetailSales.FindAsync(id);
        if (sale == null || sale.IsDeleted || sale.Status == "Cancelled") return false;

        // QA0915: hủy phiếu bán trước đây chỉ đổi trạng thái — thuốc đã trừ kho KHÔNG được hoàn (đo được
        // bán 10 → hủy → tồn vẫn 90). Hoàn về đúng lô (kho + thuốc + số lô) đã ghi trên từng dòng bán.
        var saleItems = await _context.RetailSaleItems
            .Where(i => i.RetailSaleId == id && !i.IsDeleted && i.WarehouseId != null)
            .ToListAsync();
        foreach (var line in saleItems)
        {
            // Prefer the live lot; if the lot row was soft-deleted meanwhile, revive it rather than
            // blocking the cancel (review minor) — the returned units must land somewhere visible.
            var lot = await _context.InventoryItems
                .IgnoreQueryFilters() // global soft-delete filter would hide the deleted lot
                .Where(i => i.WarehouseId == line.WarehouseId && i.MedicineId == line.MedicineId
                    && i.BatchNumber == line.BatchNumber)
                .OrderBy(i => i.IsDeleted)
                .FirstOrDefaultAsync();
            if (lot == null)
                throw new InvalidOperationException(
                    $"Không tìm thấy lô {line.BatchNumber ?? "(không số lô)"} của {line.MedicineName} để hoàn kho — không hủy được phiếu.");
            if (lot.IsDeleted) lot.IsDeleted = false;
            lot.Quantity += line.Quantity;
            lot.UpdatedAt = DateTime.UtcNow;
        }

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

            // CreatedAt lưu UTC → "doanh số hôm nay" tính theo ngày VN.
            var (todayFromUtc, todayToUtc) = HIS.Core.Common.VnTime.DayRangeUtc(HIS.Core.Common.VnTime.TodayVn);
            var todaySales = sales.Where(s => s.CreatedAt >= todayFromUtc && s.CreatedAt < todayToUtc && s.Status == "Completed").ToList();

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

            // #195: 1 query lấy tồn cho cả trang kết quả thay vì 1 query/thuốc. Vẫn chọn lô hạn
            // dùng sớm nhất (null xếp trước, giống ORDER BY của SQL Server).
            // Thuốc có NHIỀU lô cùng hạn dùng (thường là cùng lô ở 2 kho) thì "lô sớm nhất"
            // không đủ để chỉ ra một dòng: bản cũ để SQL TOP 1 tự chọn, bản gom-1-query lại
            // giữ thứ tự DB trả về, nên số tồn hiển thị đổi lô. Phá hoà tường minh — nhiều
            // hàng trước, rồi Id — để kết quả không còn phụ thuộc bên nào sắp xếp.
            var listedMedicineIds = medicines.Select(m => m.Id).Distinct().ToList();
            var stockByMedicine = listedMedicineIds.Count == 0
                ? new Dictionary<Guid?, InventoryItem>()
                : (await _context.InventoryItems
                        .Where(i => listedMedicineIds.Contains(i.MedicineId!.Value) && !i.IsDeleted && i.Quantity > 0)
                        .ToListAsync())
                    .GroupBy(i => i.MedicineId)
                    .ToDictionary(g => g.Key, g => g
                        .OrderBy(i => i.ExpiryDate)
                        .ThenByDescending(i => i.Quantity)
                        .ThenBy(i => i.Id)
                        .First());

            // Get stock for each medicine
            foreach (var med in medicines)
            {
                stockByMedicine.TryGetValue(med.Id, out var stock);

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
