using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IIvfLabService
{
    // Couples
    Task<List<IvfCoupleDto>> GetCouplesAsync(IvfCoupleSearchDto? filter = null);
    Task<IvfCoupleDetailDto?> GetCoupleByIdAsync(Guid id);
    Task<IvfCoupleDto> SaveCoupleAsync(SaveIvfCoupleDto dto);

    // Cycles
    Task<List<IvfCycleDto>> GetCyclesAsync(Guid coupleId);
    Task<IvfCycleDetailDto?> GetCycleByIdAsync(Guid id);
    Task<IvfCycleDto> SaveCycleAsync(SaveIvfCycleDto dto);
    Task<bool> UpdateCycleStatusAsync(Guid id, int status);

    // OvumPickup
    Task<IvfOvumPickupDto> SaveOvumPickupAsync(SaveIvfOvumPickupDto dto);
    Task<IvfOvumPickupDto?> GetOvumPickupAsync(Guid cycleId);

    // Embryos
    Task<List<IvfEmbryoDto>> GetEmbryosAsync(Guid cycleId);
    Task<IvfEmbryoDto> SaveEmbryoAsync(SaveIvfEmbryoDto dto);
    Task<bool> UpdateEmbryoStatusAsync(Guid id, int status);
    Task<bool> FreezeEmbryoAsync(Guid id, FreezeIvfEmbryoDto dto);
    Task<bool> ThawEmbryoAsync(Guid id, ThawIvfEmbryoDto dto);

    // Transfer
    Task<IvfTransferDto> SaveTransferAsync(SaveIvfTransferDto dto);
    Task<List<IvfTransferDto>> GetTransfersAsync(Guid cycleId);
    Task<bool> UpdateTransferResultAsync(Guid id, int resultStatus);

    // SpermBank
    Task<List<IvfSpermSampleDto>> GetSpermSamplesAsync(IvfSpermSearchDto? filter = null);
    Task<IvfSpermSampleDto> SaveSpermSampleAsync(SaveIvfSpermSampleDto dto);
    Task<bool> UpdateSpermStatusAsync(Guid id, int status);
    Task<List<IvfSpermSampleDto>> GetExpiringStorageAsync(int daysAhead = 30);

    // Biopsy
    Task<List<IvfBiopsyDto>> GetBiopsiesAsync(Guid? cycleId = null, Guid? patientId = null);
    Task<IvfBiopsyDto> SaveBiopsyAsync(SaveIvfBiopsyDto dto);

    // Dashboard & Reports
    Task<IvfDashboardDto> GetIvfDashboardAsync();
    Task<IvfDailyReportDto> GetDailyReportAsync(string? date = null);
}
