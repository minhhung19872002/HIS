using HIS.Application.DTOs.ObstetricRegister;

namespace HIS.Application.Interfaces;

public interface IObstetricRegisterService
{
    // Sổ sinh đẻ
    Task<List<BirthRegisterDto>> GetBirthRegistersAsync(DateTime? from, DateTime? to, string? keyword);
    Task<BirthRegisterDto> SaveBirthRegisterAsync(BirthRegisterDto dto, string? userId);
    Task<bool> DeleteBirthRegisterAsync(Guid id, string? userId);

    // Sổ theo dõi nạo phá thai
    Task<List<AbortionRegisterDto>> GetAbortionRegistersAsync(DateTime? from, DateTime? to, string? keyword);
    Task<AbortionRegisterDto> SaveAbortionRegisterAsync(AbortionRegisterDto dto, string? userId);
    Task<bool> DeleteAbortionRegisterAsync(Guid id, string? userId);

    // Báo cáo BYT
    Task<ObstetricReportDto> GetReportAsync(DateTime from, DateTime to);
}
