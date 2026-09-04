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
    // ===== DISPOSAL =====

    public async Task<AssetPagedResult<AssetDisposalDto>> GetDisposalsAsync(DisposalSearchDto filter)
    {
        var query = _context.AssetDisposals.Where(d => !d.IsDeleted).AsQueryable();

        if (filter.Status.HasValue) query = query.Where(d => d.Status == filter.Status.Value);
        if (filter.DisposalType.HasValue) query = query.Where(d => d.DisposalType == filter.DisposalType.Value);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.ProposalDate)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Include(d => d.FixedAsset)
            .Select(d => new AssetDisposalDto
            {
                Id = d.Id, FixedAssetId = d.FixedAssetId,
                AssetCode = d.FixedAsset != null ? d.FixedAsset.AssetCode : null,
                AssetName = d.FixedAsset != null ? d.FixedAsset.AssetName : null,
                OriginalValue = d.FixedAsset != null ? d.FixedAsset.OriginalValue : 0,
                DisposalType = d.DisposalType, ProposalDate = d.ProposalDate,
                ApprovalDate = d.ApprovalDate, DisposalDate = d.DisposalDate,
                ApprovedById = d.ApprovedById, DisposalValue = d.DisposalValue,
                ResidualValue = d.ResidualValue, Reason = d.Reason, Status = d.Status, CreatedAt = d.CreatedAt,
            })
            .ToListAsync();

        return new AssetPagedResult<AssetDisposalDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    public async Task<AssetDisposalDto> ProposeDisposalAsync(ProposeDisposalDto dto, string userId)
    {
        var asset = await _context.FixedAssets.FindAsync(dto.FixedAssetId) ?? throw new KeyNotFoundException("Asset not found");

        var entity = new AssetDisposal
        {
            Id = Guid.NewGuid(),
            FixedAssetId = dto.FixedAssetId,
            DisposalType = dto.DisposalType,
            ProposalDate = DateTime.UtcNow,
            DisposalValue = dto.DisposalValue,
            ResidualValue = dto.ResidualValue,
            Reason = dto.Reason,
            Status = 1, // Proposed
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userId,
        };

        asset.Status = 4; // PendingDisposal
        asset.UpdatedAt = DateTime.UtcNow;

        _context.AssetDisposals.Add(entity);
        await _context.SaveChangesAsync();

        return new AssetDisposalDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId, AssetCode = asset.AssetCode, AssetName = asset.AssetName,
            OriginalValue = asset.OriginalValue, DisposalType = entity.DisposalType, ProposalDate = entity.ProposalDate,
            DisposalValue = entity.DisposalValue, ResidualValue = entity.ResidualValue,
            Reason = entity.Reason, Status = entity.Status, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<AssetDisposalDto> ApproveDisposalAsync(Guid disposalId, string userId)
    {
        var entity = await _context.AssetDisposals.Include(d => d.FixedAsset).FirstOrDefaultAsync(d => d.Id == disposalId)
            ?? throw new KeyNotFoundException("Disposal not found");

        entity.Status = 2; // Approved
        entity.ApprovalDate = DateTime.UtcNow;
        entity.ApprovedById = userId;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        return new AssetDisposalDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId,
            AssetCode = entity.FixedAsset?.AssetCode, AssetName = entity.FixedAsset?.AssetName,
            OriginalValue = entity.FixedAsset?.OriginalValue ?? 0,
            DisposalType = entity.DisposalType, ProposalDate = entity.ProposalDate,
            ApprovalDate = entity.ApprovalDate, ApprovedById = entity.ApprovedById,
            DisposalValue = entity.DisposalValue, ResidualValue = entity.ResidualValue,
            Reason = entity.Reason, Status = entity.Status, CreatedAt = entity.CreatedAt,
        };
    }

    public async Task<AssetDisposalDto> CompleteDisposalAsync(Guid disposalId, string userId)
    {
        var entity = await _context.AssetDisposals.Include(d => d.FixedAsset).FirstOrDefaultAsync(d => d.Id == disposalId)
            ?? throw new KeyNotFoundException("Disposal not found");

        entity.Status = 3; // Completed
        entity.DisposalDate = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userId;

        if (entity.FixedAsset != null)
        {
            entity.FixedAsset.Status = 5; // Disposed
            entity.FixedAsset.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new AssetDisposalDto
        {
            Id = entity.Id, FixedAssetId = entity.FixedAssetId,
            AssetCode = entity.FixedAsset?.AssetCode, AssetName = entity.FixedAsset?.AssetName,
            OriginalValue = entity.FixedAsset?.OriginalValue ?? 0,
            DisposalType = entity.DisposalType, ProposalDate = entity.ProposalDate,
            ApprovalDate = entity.ApprovalDate, DisposalDate = entity.DisposalDate,
            ApprovedById = entity.ApprovedById, DisposalValue = entity.DisposalValue,
            ResidualValue = entity.ResidualValue, Reason = entity.Reason, Status = entity.Status,
            CreatedAt = entity.CreatedAt,
        };
    }

    // ===== DEPRECIATION =====

    public async Task<int> CalculateMonthlyDepreciationAsync(int month, int year, string userId)
    {
        // Get all active assets that need depreciation
        var assets = await _context.FixedAssets
            .Where(a => !a.IsDeleted && a.Status == 1 && a.UsefulLifeMonths > 0 && a.CurrentValue > 0)
            .ToListAsync();

        // #195: 1 query lấy các tài sản đã tính khấu hao tháng này, thay vì 1 query/tài sản.
        var assetIds = assets.Select(a => a.Id).ToList();
        var alreadyCalculated = (await _context.AssetDepreciations
                .Where(d => assetIds.Contains(d.FixedAssetId) && d.Month == month && d.Year == year && !d.IsDeleted)
                .Select(d => d.FixedAssetId)
                .ToListAsync())
            .ToHashSet();

        var count = 0;
        foreach (var asset in assets)
        {
            // Check if already calculated for this month
            if (alreadyCalculated.Contains(asset.Id)) continue;

            decimal depAmount;
            if (asset.DepreciationMethod == 1) // Straight line
                depAmount = asset.OriginalValue / asset.UsefulLifeMonths;
            else // Declining balance
                depAmount = (asset.CurrentValue * 2) / asset.UsefulLifeMonths;

            // Cap at current value
            depAmount = Math.Min(depAmount, asset.CurrentValue);
            if (depAmount <= 0) continue;

            var depreciation = new AssetDepreciation
            {
                Id = Guid.NewGuid(),
                FixedAssetId = asset.Id,
                Month = month,
                Year = year,
                OpeningValue = asset.CurrentValue,
                DepreciationAmount = depAmount,
                ClosingValue = asset.CurrentValue - depAmount,
                CalculatedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
            };

            asset.CurrentValue -= depAmount;
            asset.AccumulatedDepreciation += depAmount;
            asset.MonthlyDepreciation = depAmount;
            asset.UpdatedAt = DateTime.UtcNow;

            _context.AssetDepreciations.Add(depreciation);
            count++;
        }

        if (count > 0)
            await _context.SaveChangesAsync();

        return count;
    }

    public async Task<AssetPagedResult<DepreciationReportDto>> GetDepreciationReportAsync(DepreciationFilterDto filter)
    {
        var query = _context.AssetDepreciations.Where(d => !d.IsDeleted).AsQueryable();

        if (filter.Month.HasValue) query = query.Where(d => d.Month == filter.Month.Value);
        if (filter.Year.HasValue) query = query.Where(d => d.Year == filter.Year.Value);
        if (filter.DepartmentId.HasValue)
            query = query.Where(d => _context.FixedAssets.Any(a => a.Id == d.FixedAssetId && a.DepartmentId == filter.DepartmentId.Value));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(d => d.Year).ThenByDescending(d => d.Month)
            .Skip(filter.PageIndex * filter.PageSize)
            .Take(filter.PageSize)
            .Join(_context.FixedAssets, d => d.FixedAssetId, a => a.Id, (d, a) => new { d, a })
            .Select(x => new DepreciationReportDto
            {
                FixedAssetId = x.d.FixedAssetId,
                AssetCode = x.a.AssetCode,
                AssetName = x.a.AssetName,
                Month = x.d.Month,
                Year = x.d.Year,
                OpeningValue = x.d.OpeningValue,
                DepreciationAmount = x.d.DepreciationAmount,
                ClosingValue = x.d.ClosingValue,
                CalculatedAt = x.d.CalculatedAt,
            })
            .ToListAsync();

        return new AssetPagedResult<DepreciationReportDto> { Items = items, TotalCount = totalCount, PageIndex = filter.PageIndex, PageSize = filter.PageSize };
    }

    // ===== DASHBOARD =====

    public async Task<AssetDashboardDto> GetAssetDashboardAsync()
    {
        var assets = await _context.FixedAssets.Where(a => !a.IsDeleted).ToListAsync();

        var dashboard = new AssetDashboardDto
        {
            TotalAssets = assets.Count,
            TotalOriginalValue = assets.Sum(a => a.OriginalValue),
            TotalCurrentValue = assets.Sum(a => a.CurrentValue),
            InUseCount = assets.Count(a => a.Status == 1),
            BrokenCount = assets.Count(a => a.Status == 2),
            UnderRepairCount = assets.Count(a => a.Status == 3),
            PendingDisposalCount = assets.Count(a => a.Status == 4),
            DisposedCount = assets.Count(a => a.Status == 5),
            TransferredCount = assets.Count(a => a.Status == 6),
            MonthlyDepreciationTotal = assets.Where(a => a.Status == 1).Sum(a => a.MonthlyDepreciation),
        };

        dashboard.PendingHandovers = await _context.AssetHandovers.CountAsync(h => !h.IsDeleted && h.Status == 1);
        dashboard.ActiveTenders = await _context.Tenders.CountAsync(t => !t.IsDeleted && t.Status >= 1 && t.Status <= 3);

        // Status breakdown
        var statusNames = new Dictionary<int, string>
        {
            { 1, "Dang su dung" }, { 2, "Hong" }, { 3, "Dang sua chua" },
            { 4, "Cho thanh ly" }, { 5, "Da thanh ly" }, { 6, "Da dieu chuyen" },
        };
        dashboard.StatusBreakdown = assets.GroupBy(a => a.Status)
            .Select(g => new AssetStatusBreakdown
            {
                Status = g.Key,
                StatusName = statusNames.GetValueOrDefault(g.Key, "Khac"),
                Count = g.Count(),
                TotalValue = g.Sum(a => a.CurrentValue),
            }).ToList();

        // Depreciation trends (last 6 months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        dashboard.DepreciationTrends = await _context.AssetDepreciations
            .Where(d => !d.IsDeleted && d.CalculatedAt >= sixMonthsAgo)
            .GroupBy(d => new { d.Month, d.Year })
            .Select(g => new DepreciationTrend
            {
                Month = g.Key.Month,
                Year = g.Key.Year,
                Amount = g.Sum(d => d.DepreciationAmount),
            })
            .OrderBy(t => t.Year).ThenBy(t => t.Month)
            .ToListAsync();

        return dashboard;
    }
}
