using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ISigningWorkflowService
{
    Task<List<SigningRequestDto>> GetPendingRequestsAsync(Guid assignedToId, SigningRequestSearchDto? filter = null);
    Task<List<SigningRequestDto>> GetSubmittedRequestsAsync(Guid submittedById, SigningRequestSearchDto? filter = null);
    Task<List<SigningRequestDto>> GetHistoryAsync(Guid userId, SigningRequestSearchDto? filter = null);
    Task<SigningRequestDto> SubmitRequestAsync(SubmitSigningRequestDto dto, Guid submittedById, string submittedByName);
    Task<SigningRequestDto> ApproveRequestAsync(Guid id, Guid userId, ApproveSigningRequestDto? dto = null);
    Task<SigningRequestDto> RejectRequestAsync(Guid id, Guid userId, RejectSigningRequestDto dto);
    Task CancelRequestAsync(Guid id, Guid userId);
    Task<SigningWorkflowStatsDto> GetStatsAsync(Guid userId);
}
