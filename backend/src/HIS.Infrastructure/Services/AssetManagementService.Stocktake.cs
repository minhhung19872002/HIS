using System.Text;
using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs.Asset;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;
using HIS.Infrastructure.Extensions;

namespace HIS.Infrastructure.Services;

public partial class AssetManagementService
{
    // ===== STOCKTAKE =====

    public async Task<List<AssetStocktakeDto>> GetStocktakesAsync(Guid? departmentId, int? status)
    {
        var query = _context.AssetStocktakes
            .Include(s => s.Items)
            .Where(s => !s.IsDeleted)
            .AsQueryable();
        if (departmentId.HasValue) query = query.Where(s => s.DepartmentId == departmentId.Value);
        if (status.HasValue) query = query.Where(s => s.Status == status.Value);

        var list = await query.OrderByDescending(s => s.StocktakeDate).Take(100).ToListAsync();
        return list.Select(MapStocktake).ToList();
    }

    public async Task<AssetStocktakeDto?> GetStocktakeByIdAsync(Guid id)
    {
        var s = await _context.AssetStocktakes
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
        return s == null ? null : MapStocktake(s);
    }

    public async Task<AssetStocktakeDto> CreateStocktakeAsync(CreateAssetStocktakeDto dto, string userId)
    {
        var now = DateTime.Now;
        // Resolve dept name
        string? deptName = null;
        if (dto.DepartmentId.HasValue)
        {
            var dept = await _context.Departments.FindAsync(dto.DepartmentId.Value);
            deptName = dept?.DepartmentName;
        }

        var stocktake = new AssetStocktake
        {
            Id = Guid.NewGuid(),
            StocktakeCode = $"KK{now:yyyyMMddHHmmss}",
            Title = dto.Title,
            StocktakeDate = dto.StocktakeDate == default ? now : dto.StocktakeDate,
            DepartmentId = dto.DepartmentId,
            DepartmentName = deptName,
            ConductedById = userId,
            Status = 1,
            Notes = dto.Notes,
            CreatedAt = now,
            CreatedBy = userId,
        };

        // Populate items — if none provided, auto-fill from department assets
        var itemsToAdd = dto.Items.Count > 0
            ? dto.Items
            : (await _context.FixedAssets
                .Where(a => !a.IsDeleted && (!dto.DepartmentId.HasValue || a.DepartmentId == dto.DepartmentId))
                .Take(500)
                .Select(a => new CreateAssetStocktakeItemDto { FixedAssetId = a.Id, IsFound = true, ConditionStatus = 1 })
                .ToListAsync());

        // Lookup asset codes/names in batch
        var assetIds = itemsToAdd.Select(i => i.FixedAssetId).ToList();
        var assetMap = await _context.FixedAssets
            .Where(a => assetIds.Contains(a.Id))
            .Select(a => new { a.Id, a.AssetCode, a.AssetName, a.SerialNumber, a.LocationDescription })
            .ToDictionaryAsync(a => a.Id);

        foreach (var it in itemsToAdd)
        {
            assetMap.TryGetValue(it.FixedAssetId, out var asset);
            stocktake.Items.Add(new AssetStocktakeItem
            {
                Id = Guid.NewGuid(),
                AssetStocktakeId = stocktake.Id,
                FixedAssetId = it.FixedAssetId,
                AssetCode = asset?.AssetCode,
                AssetName = asset?.AssetName,
                SerialNumber = asset?.SerialNumber,
                LocationDescription = asset?.LocationDescription,
                IsFound = it.IsFound,
                ConditionStatus = it.ConditionStatus,
                Remark = it.Remark,
                CreatedAt = now,
                CreatedBy = userId,
            });
        }

        _context.AssetStocktakes.Add(stocktake);
        await _context.SaveChangesAsync();
        return MapStocktake(stocktake);
    }

    public async Task<AssetStocktakeDto> CompleteStocktakeAsync(Guid id, string userId)
    {
        var stocktake = await _context.AssetStocktakes.Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (stocktake == null) throw new KeyNotFoundException("Phiếu kiểm kê không tồn tại");
        if (stocktake.Status != 1) throw new InvalidOperationException("Phiếu không ở trạng thái Nháp");

        stocktake.Status = 3; // Completed
        stocktake.UpdatedAt = DateTime.Now;
        stocktake.UpdatedBy = userId;
        await _context.SaveChangesAsync();
        return MapStocktake(stocktake);
    }

    public async Task<AssetStocktakeDto> ApproveStocktakeAsync(Guid id, string userId)
    {
        var stocktake = await _context.AssetStocktakes.Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (stocktake == null) throw new KeyNotFoundException("Phiếu kiểm kê không tồn tại");
        if (stocktake.Status != 3) throw new InvalidOperationException("Phiếu phải ở trạng thái Đã kiểm kê");

        var now = DateTime.Now;
        stocktake.Status = 4; // Approved
        stocktake.ApprovedById = userId;
        stocktake.ApprovedAt = now;
        stocktake.UpdatedAt = now;
        stocktake.UpdatedBy = userId;
        await _context.SaveChangesAsync();
        return MapStocktake(stocktake);
    }

    public async Task<AssetStocktakeItemDto> UpdateStocktakeItemAsync(Guid stocktakeId, Guid itemId, UpdateAssetStocktakeItemDto dto, string userId)
    {
        var stocktake = await _context.AssetStocktakes
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == stocktakeId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Phiếu kiểm kê không tồn tại");

        if (stocktake.Status == 4)
            throw new InvalidOperationException("Phiếu đã duyệt, không thể cập nhật");

        var item = stocktake.Items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new KeyNotFoundException("Không tìm thấy dòng tài sản trong phiếu");

        item.IsFound = dto.IsFound;
        item.ConditionStatus = dto.ConditionStatus;
        item.Remark = dto.Remark;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return new AssetStocktakeItemDto
        {
            Id = item.Id,
            FixedAssetId = item.FixedAssetId,
            AssetCode = item.AssetCode,
            AssetName = item.AssetName,
            SerialNumber = item.SerialNumber,
            LocationDescription = item.LocationDescription,
            IsFound = item.IsFound,
            ConditionStatus = item.ConditionStatus,
            Remark = item.Remark,
        };
    }

    public async Task<byte[]> PrintStocktakeAsync(Guid stocktakeId)
    {
        var stocktake = await _context.AssetStocktakes
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == stocktakeId && !s.IsDeleted)
            ?? throw new KeyNotFoundException("Phiếu kiểm kê không tồn tại");

        var conditionLabel = new Dictionary<int, string> { { 1, "Tốt" }, { 2, "Xuống cấp" }, { 3, "Hỏng" } };

        var sb = new StringBuilder(ReportHeader(
            "BIÊN BẢN KIỂM KÊ TÀI SẢN CỐ ĐỊNH",
            $"Phiếu: {stocktake.StocktakeCode} · Ngày: {stocktake.StocktakeDate:dd/MM/yyyy}"));

        sb.Append($"<p><strong>Tên phiếu:</strong> {stocktake.Title}</p>");
        if (!string.IsNullOrEmpty(stocktake.DepartmentName))
            sb.Append($"<p><strong>Khoa/Phòng:</strong> {stocktake.DepartmentName}</p>");
        if (!string.IsNullOrEmpty(stocktake.Notes))
            sb.Append($"<p><strong>Ghi chú:</strong> {stocktake.Notes}</p>");

        sb.Append("<p>Hội đồng kiểm kê gồm có:</p><ul><li>Trưởng ban: .................................</li><li>Uỷ viên: .................................</li></ul>");
        sb.Append("<table><tr><th>STT</th><th>Mã TS</th><th>Tên tài sản</th><th>Số serial</th><th>Vị trí</th><th>Có mặt</th><th>Tình trạng</th><th>Ghi chú</th></tr>");

        int stt = 0;
        foreach (var it in stocktake.Items)
        {
            stt++;
            var found = it.IsFound ? "Có" : "Thiếu";
            var foundStyle = it.IsFound ? "" : "color:red;font-weight:bold;";
            var cond = conditionLabel.GetValueOrDefault(it.ConditionStatus, "");
            sb.Append($"<tr><td class='center'>{stt}</td><td>{it.AssetCode}</td><td>{it.AssetName}</td><td>{it.SerialNumber ?? ""}</td><td>{it.LocationDescription ?? ""}</td><td class='center' style='{foundStyle}'>{found}</td><td class='center'>{cond}</td><td>{it.Remark ?? ""}</td></tr>");
        }

        var foundCount = stocktake.Items.Count(i => i.IsFound);
        var missingCount = stocktake.Items.Count(i => !i.IsFound);
        sb.Append($"<tr><td colspan='4'></td><td><strong>Tổng cộng</strong></td><td class='center'><strong>{foundCount}</strong></td><td colspan='2'><strong>Thiếu: {missingCount}</strong></td></tr>");
        sb.Append("</table>");

        sb.Append(@"<div class='sign-block'>
<div><p><strong>Trưởng ban kiểm kê</strong></p><p><em>(Ký, họ tên)</em></p><br/><br/><br/></div>
<div><p><strong>Kế toán</strong></p><p><em>(Ký, họ tên)</em></p><br/><br/><br/></div>
<div><p><strong>Giám đốc</strong></p><p><em>(Ký, họ tên, đóng dấu)</em></p><br/><br/><br/></div>
</div></body></html>");

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static AssetStocktakeDto MapStocktake(AssetStocktake s) => new()
    {
        Id = s.Id,
        StocktakeCode = s.StocktakeCode,
        Title = s.Title,
        StocktakeDate = s.StocktakeDate,
        DepartmentId = s.DepartmentId,
        DepartmentName = s.DepartmentName,
        ConductedById = s.ConductedById,
        ApprovedById = s.ApprovedById,
        ApprovedAt = s.ApprovedAt,
        Status = s.Status,
        Notes = s.Notes,
        TotalItems = s.Items.Count,
        FoundCount = s.Items.Count(i => i.IsFound),
        MissingCount = s.Items.Count(i => !i.IsFound),
        Items = s.Items.Select(i => new AssetStocktakeItemDto
        {
            Id = i.Id,
            FixedAssetId = i.FixedAssetId,
            AssetCode = i.AssetCode,
            AssetName = i.AssetName,
            SerialNumber = i.SerialNumber,
            LocationDescription = i.LocationDescription,
            IsFound = i.IsFound,
            ConditionStatus = i.ConditionStatus,
            Remark = i.Remark,
        }).ToList(),
        CreatedAt = s.CreatedAt,
    };
}
