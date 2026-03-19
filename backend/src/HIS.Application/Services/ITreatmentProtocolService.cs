using HIS.Application.DTOs;

namespace HIS.Application.Services;

public interface ITreatmentProtocolService
{
    Task<TreatmentProtocolPagedResult> SearchProtocolsAsync(TreatmentProtocolSearchDto dto);
    Task<TreatmentProtocolDto?> GetProtocolByIdAsync(Guid id);
    Task<TreatmentProtocolDto> SaveProtocolAsync(SaveTreatmentProtocolDto dto);
    Task<bool> DeleteProtocolAsync(Guid id);
    Task<TreatmentProtocolDto> ApproveProtocolAsync(Guid id, string approvedBy);
    Task<TreatmentProtocolDto> NewVersionAsync(Guid id);
    Task<List<TreatmentProtocolDto>> GetProtocolsByIcdAsync(string icdCode);
    Task<ProtocolEvaluationDto> EvaluatePatientAsync(Guid protocolId, Guid examinationId);
    Task<List<string>> GetDiseaseGroupsAsync();
}
