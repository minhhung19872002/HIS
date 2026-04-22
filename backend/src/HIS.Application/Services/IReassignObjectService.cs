using HIS.Application.DTOs.Billing;

namespace HIS.Application.Services;

public interface IReassignObjectService
{
    Task<ReassignObjectResultDto> ReassignAsync(ReassignObjectRequestDto dto, Guid userId);
}
