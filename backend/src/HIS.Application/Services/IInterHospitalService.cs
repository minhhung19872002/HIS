using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface IInterHospitalService
{
    Task<List<InterHospitalRequestDto>> SearchRequestsAsync(InterHospitalRequestSearchDto? filter = null);
    Task<InterHospitalRequestDto?> GetByIdAsync(Guid id);
    Task<InterHospitalRequestDto> CreateRequestAsync(CreateInterHospitalRequestDto dto);
    Task<InterHospitalRequestDto> RespondToRequestAsync(Guid id, RespondInterHospitalRequestDto dto);
    Task<List<InterHospitalRequestDto>> GetActiveRequestsAsync();
    Task<InterHospitalStatsDto> GetStatsAsync();
}
