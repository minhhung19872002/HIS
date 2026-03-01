using Microsoft.EntityFrameworkCore;
using HIS.Application.DTOs;
using HIS.Application.Services;
using HIS.Core.Entities;
using HIS.Infrastructure.Data;

namespace HIS.Infrastructure.Services;

public class CultureStockService : ICultureStockService
{
    private readonly HISDbContext _context;

    public CultureStockService(HISDbContext context)
    {
        _context = context;
    }

    public async Task<List<CultureStockDto>> GetCultureStocksAsync(CultureStockSearchDto? filter = null)
    {
        var query = _context.CultureStocks
            .Where(s => !s.IsDeleted)
            .AsQueryable();

        if (filter != null)
        {
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s =>
                    s.StockCode.ToLower().Contains(kw) ||
                    s.OrganismName.ToLower().Contains(kw) ||
                    s.OrganismCode.ToLower().Contains(kw) ||
                    (s.ScientificName != null && s.ScientificName.ToLower().Contains(kw))
                );
            }
            if (!string.IsNullOrEmpty(filter.OrganismCode))
                query = query.Where(s => s.OrganismCode == filter.OrganismCode);
            if (!string.IsNullOrEmpty(filter.FreezerCode))
                query = query.Where(s => s.FreezerCode == filter.FreezerCode);
            if (!string.IsNullOrEmpty(filter.PreservationMethod))
                query = query.Where(s => s.PreservationMethod == filter.PreservationMethod);
            if (filter.Status.HasValue)
                query = query.Where(s => s.Status == filter.Status.Value);
            if (!string.IsNullOrEmpty(filter.FromDate) && DateTime.TryParse(filter.FromDate, out var from))
                query = query.Where(s => s.PreservationDate >= from);
            if (!string.IsNullOrEmpty(filter.ToDate) && DateTime.TryParse(filter.ToDate, out var to))
                query = query.Where(s => s.PreservationDate <= to.AddDays(1));
        }

        var pageSize = filter?.PageSize > 0 ? filter.PageSize : 50;
        var skip = filter?.PageIndex > 0 ? filter.PageIndex * pageSize : 0;

        return await query
            .OrderByDescending(s => s.PreservationDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(s => MapToDto(s))
            .ToListAsync();
    }

    public async Task<CultureStockDto?> GetCultureStockByIdAsync(Guid id)
    {
        var s = await _context.CultureStocks
            .Include(s => s.Logs.OrderByDescending(l => l.PerformedAt))
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        return s == null ? null : MapToDto(s);
    }

    public async Task<List<CultureStockLogDto>> GetStockLogsAsync(Guid stockId)
    {
        return await _context.CultureStockLogs
            .Where(l => l.CultureStockId == stockId && !l.IsDeleted)
            .OrderByDescending(l => l.PerformedAt)
            .Select(l => new CultureStockLogDto
            {
                Id = l.Id,
                Action = l.Action,
                AliquotsTaken = l.AliquotsTaken,
                Purpose = l.Purpose,
                Result = l.Result,
                PerformedBy = l.PerformedBy,
                PerformedAt = l.PerformedAt.ToString("yyyy-MM-ddTHH:mm:ss"),
                Notes = l.Notes,
            })
            .ToListAsync();
    }

    public async Task<CultureStockDto> CreateCultureStockAsync(CreateCultureStockDto dto)
    {
        // Generate stock code: VS-{year}-{sequence}
        var year = DateTime.UtcNow.Year;
        var lastCode = await _context.CultureStocks
            .Where(s => s.StockCode.StartsWith($"VS-{year}-"))
            .OrderByDescending(s => s.StockCode)
            .Select(s => s.StockCode)
            .FirstOrDefaultAsync();
        var seq = 1;
        if (lastCode != null)
        {
            var parts = lastCode.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var lastSeq))
                seq = lastSeq + 1;
        }

        var stock = new CultureStock
        {
            Id = Guid.NewGuid(),
            StockCode = $"VS-{year}-{seq:D4}",
            SourceCultureId = dto.SourceCultureId,
            OrganismCode = dto.OrganismCode,
            OrganismName = dto.OrganismName,
            ScientificName = dto.ScientificName,
            GramStain = dto.GramStain,
            SourceType = dto.SourceType ?? "clinical",
            SourceDescription = dto.SourceDescription,
            FreezerCode = dto.FreezerCode,
            RackCode = dto.RackCode,
            BoxCode = dto.BoxCode,
            Position = dto.Position,
            PreservationMethod = dto.PreservationMethod,
            StorageTemperature = dto.StorageTemperature,
            PassageNumber = dto.PassageNumber > 0 ? dto.PassageNumber : 1,
            AliquotCount = dto.AliquotCount > 0 ? dto.AliquotCount : 1,
            RemainingAliquots = dto.AliquotCount > 0 ? dto.AliquotCount : 1,
            PreservationDate = !string.IsNullOrEmpty(dto.PreservationDate) && DateTime.TryParse(dto.PreservationDate, out var pd) ? pd : DateTime.UtcNow,
            ExpiryDate = !string.IsNullOrEmpty(dto.ExpiryDate) && DateTime.TryParse(dto.ExpiryDate, out var ed) ? ed : (DateTime?)null,
            Status = 0, // Active
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.CultureStocks.Add(stock);

        // Log the storage action
        _context.CultureStockLogs.Add(new CultureStockLog
        {
            Id = Guid.NewGuid(),
            CultureStockId = stock.Id,
            Action = "store",
            AliquotsTaken = null,
            Purpose = "Lưu chủng mới",
            Result = $"{stock.AliquotCount} ống",
            PerformedBy = stock.CreatedBy,
            PerformedAt = DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
        return MapToDto(stock);
    }

    public async Task<CultureStockDto> UpdateCultureStockAsync(Guid id, UpdateCultureStockDto dto)
    {
        var stock = await _context.CultureStocks.FindAsync(id)
            ?? throw new InvalidOperationException("Culture stock not found");

        if (dto.FreezerCode != null) stock.FreezerCode = dto.FreezerCode;
        if (dto.RackCode != null) stock.RackCode = dto.RackCode;
        if (dto.BoxCode != null) stock.BoxCode = dto.BoxCode;
        if (dto.Position != null) stock.Position = dto.Position;
        if (dto.StorageTemperature != null) stock.StorageTemperature = dto.StorageTemperature;
        if (!string.IsNullOrEmpty(dto.ExpiryDate) && DateTime.TryParse(dto.ExpiryDate, out var ed))
            stock.ExpiryDate = ed;
        if (dto.Notes != null) stock.Notes = dto.Notes;
        stock.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(stock);
    }

    public async Task<CultureStockDto> RetrieveAliquotAsync(Guid id, RetrieveAliquotDto dto)
    {
        var stock = await _context.CultureStocks.FindAsync(id)
            ?? throw new InvalidOperationException("Culture stock not found");

        if (dto.AliquotCount <= 0) dto.AliquotCount = 1;
        if (dto.AliquotCount > stock.RemainingAliquots)
            throw new InvalidOperationException($"Chỉ còn {stock.RemainingAliquots} ống");

        stock.RemainingAliquots -= dto.AliquotCount;
        if (stock.RemainingAliquots == 0)
            stock.Status = 3; // Depleted
        else if (stock.RemainingAliquots <= 2)
            stock.Status = 1; // LowStock
        stock.UpdatedAt = DateTime.UtcNow;

        _context.CultureStockLogs.Add(new CultureStockLog
        {
            Id = Guid.NewGuid(),
            CultureStockId = id,
            Action = "retrieve",
            AliquotsTaken = dto.AliquotCount,
            Purpose = dto.Purpose,
            PerformedAt = DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
        return MapToDto(stock);
    }

    public async Task<CultureStockDto> RecordViabilityCheckAsync(Guid id, ViabilityCheckDto dto)
    {
        var stock = await _context.CultureStocks.FindAsync(id)
            ?? throw new InvalidOperationException("Culture stock not found");

        stock.LastViabilityCheck = DateTime.UtcNow;
        stock.LastViabilityResult = dto.IsViable;
        stock.UpdatedAt = DateTime.UtcNow;

        _context.CultureStockLogs.Add(new CultureStockLog
        {
            Id = Guid.NewGuid(),
            CultureStockId = id,
            Action = "viability_check",
            Result = dto.IsViable ? "Viable" : "Not viable",
            Purpose = dto.Method,
            PerformedAt = DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
        return MapToDto(stock);
    }

    public async Task<CultureStockDto> SubcultureAsync(Guid id, SubcultureDto dto)
    {
        var parent = await _context.CultureStocks.FindAsync(id)
            ?? throw new InvalidOperationException("Culture stock not found");

        // Create new stock from subculture
        var year = DateTime.UtcNow.Year;
        var lastCode = await _context.CultureStocks
            .Where(s => s.StockCode.StartsWith($"VS-{year}-"))
            .OrderByDescending(s => s.StockCode)
            .Select(s => s.StockCode)
            .FirstOrDefaultAsync();
        var seq = 1;
        if (lastCode != null)
        {
            var parts = lastCode.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var lastSeq))
                seq = lastSeq + 1;
        }

        var newStock = new CultureStock
        {
            Id = Guid.NewGuid(),
            StockCode = $"VS-{year}-{seq:D4}",
            SourceCultureId = parent.SourceCultureId,
            OrganismCode = parent.OrganismCode,
            OrganismName = parent.OrganismName,
            ScientificName = parent.ScientificName,
            GramStain = parent.GramStain,
            SourceType = parent.SourceType,
            SourceDescription = $"Subculture from {parent.StockCode} (P{parent.PassageNumber})",
            FreezerCode = dto.FreezerCode ?? parent.FreezerCode,
            RackCode = dto.RackCode ?? parent.RackCode,
            BoxCode = dto.BoxCode ?? parent.BoxCode,
            Position = dto.Position,
            PreservationMethod = parent.PreservationMethod,
            StorageTemperature = parent.StorageTemperature,
            PassageNumber = parent.PassageNumber + 1,
            AliquotCount = dto.NewAliquotCount > 0 ? dto.NewAliquotCount : 1,
            RemainingAliquots = dto.NewAliquotCount > 0 ? dto.NewAliquotCount : 1,
            PreservationDate = DateTime.UtcNow,
            ExpiryDate = parent.ExpiryDate.HasValue
                ? DateTime.UtcNow.Add(parent.ExpiryDate.Value - parent.PreservationDate)
                : null,
            Status = 0,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.CultureStocks.Add(newStock);

        // Log on parent
        _context.CultureStockLogs.Add(new CultureStockLog
        {
            Id = Guid.NewGuid(),
            CultureStockId = id,
            Action = "subculture",
            Result = $"→ {newStock.StockCode} (P{newStock.PassageNumber})",
            PerformedAt = DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        });

        // Log on new stock
        _context.CultureStockLogs.Add(new CultureStockLog
        {
            Id = Guid.NewGuid(),
            CultureStockId = newStock.Id,
            Action = "store",
            Purpose = $"Subculture from {parent.StockCode}",
            Result = $"{newStock.AliquotCount} ống",
            PerformedAt = DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
        return MapToDto(newStock);
    }

    public async Task DiscardStockAsync(Guid id, string? reason)
    {
        var stock = await _context.CultureStocks.FindAsync(id)
            ?? throw new InvalidOperationException("Culture stock not found");

        stock.Status = 4; // Discarded
        stock.RemainingAliquots = 0;
        stock.UpdatedAt = DateTime.UtcNow;

        _context.CultureStockLogs.Add(new CultureStockLog
        {
            Id = Guid.NewGuid(),
            CultureStockId = id,
            Action = "discard",
            Result = "Đã hủy",
            PerformedAt = DateTime.UtcNow,
            Notes = reason,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
    }

    public async Task<CultureStockStatsDto> GetStatisticsAsync()
    {
        var stocks = await _context.CultureStocks
            .Where(s => !s.IsDeleted)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var thirtyDaysFromNow = now.AddDays(30);
        var ninetyDaysAgo = now.AddDays(-90);

        return new CultureStockStatsDto
        {
            TotalStocks = stocks.Count,
            ActiveCount = stocks.Count(s => s.Status == 0),
            LowStockCount = stocks.Count(s => s.Status == 1),
            ExpiredCount = stocks.Count(s => s.Status == 2 || (s.ExpiryDate.HasValue && s.ExpiryDate.Value < now)),
            DepletedCount = stocks.Count(s => s.Status == 3),
            ExpiringIn30Days = stocks.Count(s => s.Status == 0 && s.ExpiryDate.HasValue && s.ExpiryDate.Value <= thirtyDaysFromNow && s.ExpiryDate.Value > now),
            NeedViabilityCheck = stocks.Count(s => s.Status == 0 && (!s.LastViabilityCheck.HasValue || s.LastViabilityCheck.Value < ninetyDaysAgo)),
            TopOrganisms = stocks
                .Where(s => s.Status <= 1)
                .GroupBy(s => s.OrganismName)
                .Select(g => new OrganismStockSummary
                {
                    OrganismName = g.Key,
                    StockCount = g.Count(),
                    TotalAliquots = g.Sum(s => s.RemainingAliquots),
                })
                .OrderByDescending(o => o.StockCount)
                .Take(10)
                .ToList(),
        };
    }

    public async Task<List<string>> GetFreezerCodesAsync()
    {
        return await _context.CultureStocks
            .Where(s => !s.IsDeleted && s.FreezerCode != null)
            .Select(s => s.FreezerCode!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    private static CultureStockDto MapToDto(CultureStock s) => new()
    {
        Id = s.Id,
        StockCode = s.StockCode,
        SourceCultureId = s.SourceCultureId,
        OrganismCode = s.OrganismCode,
        OrganismName = s.OrganismName,
        ScientificName = s.ScientificName,
        GramStain = s.GramStain,
        SourceType = s.SourceType,
        SourceDescription = s.SourceDescription,
        FreezerCode = s.FreezerCode,
        RackCode = s.RackCode,
        BoxCode = s.BoxCode,
        Position = s.Position,
        LocationDisplay = string.Join(" / ", new[] { s.FreezerCode, s.RackCode, s.BoxCode, s.Position }.Where(x => !string.IsNullOrEmpty(x))),
        PreservationMethod = s.PreservationMethod,
        StorageTemperature = s.StorageTemperature,
        PassageNumber = s.PassageNumber,
        AliquotCount = s.AliquotCount,
        RemainingAliquots = s.RemainingAliquots,
        PreservationDate = s.PreservationDate.ToString("yyyy-MM-dd"),
        ExpiryDate = s.ExpiryDate?.ToString("yyyy-MM-dd"),
        LastViabilityCheck = s.LastViabilityCheck?.ToString("yyyy-MM-ddTHH:mm:ss"),
        LastViabilityResult = s.LastViabilityResult,
        Status = s.Status,
        PreservedBy = s.PreservedBy,
        Notes = s.Notes,
        LogCount = s.Logs?.Count ?? 0,
    };
}
