using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ICultureStockService
{
    Task<List<CultureStockDto>> GetCultureStocksAsync(CultureStockSearchDto? filter = null);
    Task<CultureStockDto?> GetCultureStockByIdAsync(Guid id);
    Task<List<CultureStockLogDto>> GetStockLogsAsync(Guid stockId);
    Task<CultureStockDto> CreateCultureStockAsync(CreateCultureStockDto dto);
    Task<CultureStockDto> UpdateCultureStockAsync(Guid id, UpdateCultureStockDto dto);
    Task<CultureStockDto> RetrieveAliquotAsync(Guid id, RetrieveAliquotDto dto);
    Task<CultureStockDto> RecordViabilityCheckAsync(Guid id, ViabilityCheckDto dto);
    Task<CultureStockDto> SubcultureAsync(Guid id, SubcultureDto dto);
    Task DiscardStockAsync(Guid id, string? reason);
    Task<CultureStockStatsDto> GetStatisticsAsync();
    Task<List<string>> GetFreezerCodesAsync();
}
